#!/usr/bin/env node

/**
 * run-patient-care-group-flow.cjs
 *
 * End-to-end API flow script for the v2 care-package subscription model.
 *
 * Flow:
 *  1.  Patient onboarding (OTP → register → initial profile)
 *  2.  Staff approves facility link request
 *  3.  Staff creates patient health profile and assigns it to the patient
 *  4.  Patient creates own health profile (or uses the linked one)
 *  5.  Patient views public care packages for a facility
 *  6.  Patient creates a care subscription order (linked to health profile)
 *  7.  Patient creates payment session
 *  8.  Webhook marks session as PAID → backend auto-creates CareGroup + Subscription
 *  9.  Admin assigns doctor monitor to the auto-created care group
 * 10.  Patient submits risk factor assessment (linked to health profile + care group code)
 * 11.  Doctor reviews and verifies the assessment
 * 12.  Doctor creates examination, treatment plan, diagnosis, treatment targets, prescription
 */

const fs = require('fs');
const path = require('path');
const { createHmac } = require('crypto');
const dotenv = require('dotenv');

dotenv.config();

const DEFAULT_BASE_URL = 'http://localhost:3005';
const DEFAULT_OTP = process.env.TEST_PATIENT_OTP || '111111';
const DEFAULT_PATIENT_PASSWORD = 'Patient1234';
const DEFAULT_STAFF_EMAIL = 'facility.admin@navi.local';
const DEFAULT_STAFF_PASSWORD = 'NaviDemo123!';
const DEFAULT_DOCTOR_EMAIL = 'doctor.monitor@navi.local';
const DEFAULT_DOCTOR_PASSWORD = 'NaviDemo123!';
const DEFAULT_DOCTOR_CODE = 'DRTEST01';
const DEFAULT_OUTPUT_FILE = path.join(
  __dirname,
  'patient-care-group-flow-runs.json',
);

/**
 * Parses simple `--key=value` CLI arguments.
 *
 * @returns {Record<string, string>} CLI argument map.
 */
function parseArgs() {
  return process.argv.slice(2).reduce((acc, arg) => {
    if (!arg.startsWith('--')) {
      return acc;
    }

    const separatorIndex = arg.indexOf('=');
    if (separatorIndex === -1) {
      acc[arg.slice(2)] = 'true';
      return acc;
    }

    acc[arg.slice(2, separatorIndex)] = arg.slice(separatorIndex + 1);
    return acc;
  }, {});
}

/**
 * Builds an API URL from the configured BE domain.
 *
 * @param {string} baseUrl Base API domain.
 * @param {string} apiPath API path starting with `/`.
 * @returns {string} Absolute API URL.
 */
function buildUrl(baseUrl, apiPath) {
  return `${baseUrl.replace(/\/+$/, '')}${apiPath}`;
}

/**
 * Generates a random phone number that matches backend validation.
 *
 * @returns {string} E.164-like phone number.
 */
function generateRandomPhoneNumber() {
  const randomDigits = String(Math.floor(Math.random() * 100000000)).padStart(
    8,
    '0',
  );
  return `+849${randomDigits}`;
}

/**
 * Generates a pseudo-random citizen id number.
 *
 * @returns {string} Twelve-digit citizen id number.
 */
function generateCitizenIdNumber() {
  const randomDigits = String(Math.floor(Math.random() * 1000000000)).padStart(
    9,
    '0',
  );
  return `079${randomDigits}`;
}

/**
 * Parses JSON while preserving raw text when the payload is not JSON.
 *
 * @param {string} text Response body text.
 * @returns {unknown} Parsed JSON or raw wrapper.
 */
function safeParseJson(text) {
  try {
    return JSON.parse(text);
  } catch {
    return { raw: text };
  }
}

/**
 * Sends an HTTP request and returns parsed JSON payload.
 *
 * @param {string} url Absolute request URL.
 * @param {RequestInit & { headers?: Record<string, string> }} [options] Fetch options.
 * @returns {Promise<unknown>} Parsed response payload.
 */
async function requestJson(url, options = {}) {
  const headers = {
    ...(options.body ? { 'content-type': 'application/json' } : {}),
    ...(options.headers || {}),
  };

  const response = await fetch(url, {
    ...options,
    headers,
  });

  const text = await response.text();
  const payload = text ? safeParseJson(text) : null;

  if (!response.ok) {
    throw new Error(
      `${options.method || 'GET'} ${url} failed ${response.status}: ${text}`,
    );
  }

  return payload;
}

/**
 * Returns common bearer authorization headers.
 *
 * @param {string} token Session token.
 * @returns {Record<string, string>} Authorization header object.
 */
function createAuthHeaders(token) {
  return { authorization: `Bearer ${token}` };
}

/**
 * Extracts a bearer token from common auth payload shapes.
 *
 * @param {unknown} payload Response payload.
 * @returns {string} Session token.
 */
function extractSessionToken(payload) {
  if (payload && typeof payload === 'object') {
    if ('token' in payload && typeof payload.token === 'string') {
      return payload.token;
    }

    if (
      'session' in payload &&
      payload.session &&
      typeof payload.session === 'object' &&
      'token' in payload.session &&
      typeof payload.session.token === 'string'
    ) {
      return payload.session.token;
    }

    if (
      'sessionToken' in payload &&
      typeof payload.sessionToken === 'string'
    ) {
      return payload.sessionToken;
    }
  }

  throw new Error('Response is missing session token');
}

/**
 * Extracts the refreshed session user payload.
 *
 * @param {unknown} payload Response payload.
 * @returns {Record<string, unknown>} User object from the refreshed session.
 */
function extractSessionUser(payload) {
  if (
    payload &&
    typeof payload === 'object' &&
    'user' in payload &&
    payload.user &&
    typeof payload.user === 'object'
  ) {
    return payload.user;
  }

  throw new Error('Response is missing refreshed session user');
}

/**
 * Returns a required object field from a JSON payload.
 *
 * @template T
 * @param {unknown} payload Response payload.
 * @param {string} field Field name.
 * @returns {T} Field value.
 */
function getRequiredField(payload, field) {
  if (
    payload &&
    typeof payload === 'object' &&
    field in payload &&
    payload[field] !== undefined &&
    payload[field] !== null
  ) {
    return payload[field];
  }

  throw new Error(`Response is missing field "${field}"`);
}

/**
 * Returns the `data` array from paginated responses.
 *
 * @param {unknown} payload Response payload.
 * @returns {unknown[]} Paginated response rows.
 */
function getResponseDataArray(payload) {
  if (
    payload &&
    typeof payload === 'object' &&
    'data' in payload &&
    Array.isArray(payload.data)
  ) {
    return payload.data;
  }

  throw new Error('Response is missing data array');
}

/**
 * Signs in by email and extracts the bearer token.
 *
 * @param {string} baseUrl Base API URL.
 * @param {string} email Account email.
 * @param {string} password Account password.
 * @returns {Promise<string>} Bearer token.
 */
async function signInEmail(baseUrl, email, password) {
  const response = await requestJson(
    buildUrl(baseUrl, '/api/auth/sign-in/email'),
    {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    },
  );

  return extractSessionToken(response);
}

/**
 * Refreshes the current auth session after scope changes.
 *
 * @param {string} baseUrl Base API URL.
 * @param {string} token Current bearer token.
 * @returns {Promise<string>} Refreshed bearer token.
 */
async function refreshSession(baseUrl, token) {
  const response = await requestJson(
    buildUrl(baseUrl, '/api/auth-session/refresh'),
    {
      method: 'POST',
      headers: createAuthHeaders(token),
    },
  );

  return extractSessionToken(response);
}

/**
 * Refreshes the current auth session and returns the full payload.
 *
 * @param {string} baseUrl Base API URL.
 * @param {string} token Current bearer token.
 * @returns {Promise<Record<string, unknown>>} Refreshed session response.
 */
async function refreshSessionDetails(baseUrl, token) {
  const response = await requestJson(
    buildUrl(baseUrl, '/api/auth-session/refresh'),
    {
      method: 'POST',
      headers: createAuthHeaders(token),
    },
  );

  if (!response || typeof response !== 'object') {
    throw new Error('Refresh session response must be an object');
  }

  return response;
}

/**
 * Writes one record to the local run history file.
 *
 * @param {string} outputFile Target JSON file path.
 * @param {Record<string, unknown>} record Run summary.
 * @returns {string} Resolved output path.
 */
function appendRunRecord(outputFile, record) {
  const resolvedPath = path.resolve(outputFile);
  const existingRecords = readExistingRecords(resolvedPath);
  const nextRecords = [record, ...existingRecords];

  fs.mkdirSync(path.dirname(resolvedPath), { recursive: true });
  fs.writeFileSync(
    resolvedPath,
    `${JSON.stringify(nextRecords, null, 2)}\n`,
    'utf8',
  );

  return resolvedPath;
}

/**
 * Reads the existing run history.
 *
 * @param {string} outputFile JSON file path.
 * @returns {Array<Record<string, unknown>>} Existing records.
 */
function readExistingRecords(outputFile) {
  if (!fs.existsSync(outputFile)) {
    return [];
  }

  const raw = fs.readFileSync(outputFile, 'utf8').trim();
  if (!raw) {
    return [];
  }

  const parsed = JSON.parse(raw);
  if (!Array.isArray(parsed)) {
    throw new Error(`${outputFile} must contain a JSON array`);
  }

  return parsed;
}

/**
 * Creates the provider-agnostic webhook signature expected by the backend.
 *
 * @param {Record<string, unknown>} payload Webhook payload.
 * @param {string} secret Webhook secret.
 * @returns {string} Signature header value.
 */
function signPaymentWebhook(payload, secret) {
  const signaturePayload = [
    payload.provider,
    payload.providerEventId,
    payload.sessionCode || '',
    payload.providerPaymentId || '',
    payload.status,
  ].join('.');

  return `sha256=${createHmac('sha256', secret)
    .update(signaturePayload)
    .digest('hex')}`;
}

/**
 * Returns a plain step logger with monotonically increasing sequence.
 *
 * @returns {(message: string) => void} Logging function.
 */
function createStepLogger() {
  let step = 0;
  return (message) => {
    step += 1;
    process.stdout.write(`${String(step).padStart(2, '0')}. ${message}\n`);
  };
}

/**
 * Runs the full patient onboarding and care-group clinical flow (v2 model).
 */
async function main() {
  const args = parseArgs();
  const logStep = createStepLogger();

  const baseUrl = args['base-url'] || process.env.BASE_URL || DEFAULT_BASE_URL;
  const otp = args.otp || process.env.TEST_PATIENT_OTP || DEFAULT_OTP;
  const patientPassword =
    args['patient-password'] ||
    process.env.PATIENT_PASSWORD ||
    DEFAULT_PATIENT_PASSWORD;
  const staffEmail =
    args['staff-email'] || process.env.STAFF_EMAIL || DEFAULT_STAFF_EMAIL;
  const staffPassword =
    args['staff-password'] ||
    process.env.STAFF_PASSWORD ||
    DEFAULT_STAFF_PASSWORD;
  const doctorEmail =
    args['doctor-email'] || process.env.DOCTOR_EMAIL || DEFAULT_DOCTOR_EMAIL;
  const doctorPassword =
    args['doctor-password'] ||
    process.env.DOCTOR_PASSWORD ||
    DEFAULT_DOCTOR_PASSWORD;
  const doctorCode =
    args['doctor-code'] || process.env.DOCTOR_CODE || DEFAULT_DOCTOR_CODE;
  const outputFile =
    args.output || process.env.OUTPUT_FILE || DEFAULT_OUTPUT_FILE;
  const webhookSecret =
    args['webhook-secret'] || process.env.PAYMENT_WEBHOOK_SECRET;
  const phoneNumber =
    args.phone || process.env.PHONE_NUMBER || generateRandomPhoneNumber();
  const citizenIdNumber =
    args['citizen-id'] || process.env.CITIZEN_ID_NUMBER || generateCitizenIdNumber();
  const patientName =
    args['patient-name'] ||
    process.env.PATIENT_NAME ||
    `Test Patient ${phoneNumber.slice(-4)}`;

  if (!webhookSecret) {
    throw new Error(
      'PAYMENT_WEBHOOK_SECRET is required for the payment webhook step.',
    );
  }

  const initialProfileData = {
    fullName: patientName,
    citizenIdNumber,
    dateOfBirth: '1990-01-01',
    gender: 'MALE',
    provinceCode: '79',
    provinceName: 'TP. Ho Chi Minh',
    districtCode: '26734',
    districtName: 'Phuong Ben Nghe',
    streetAddress: '12 Nguyen Hue',
    heightCm: 170,
    weightKg: 65,
    medicalHistory: [
      {
        name: 'Tang huyet ap',
      },
    ],
  };

  process.stdout.write(`Base URL:      ${baseUrl}\n`);
  process.stdout.write(`Patient phone: ${phoneNumber}\n`);
  process.stdout.write(`Doctor code:   ${doctorCode}\n`);
  process.stdout.write(`Staff email:   ${staffEmail}\n`);

  // ─── Patient onboarding ───────────────────────────────────────────────────

  logStep('Send onboarding OTP');
  await requestJson(buildUrl(baseUrl, '/api/onboarding/patient/otp/send'), {
    method: 'POST',
    body: JSON.stringify({ phoneNumber }),
  });

  logStep('Verify onboarding OTP');
  await requestJson(buildUrl(baseUrl, '/api/onboarding/patient/otp/verify'), {
    method: 'POST',
    body: JSON.stringify({ phoneNumber, otp }),
  });

  logStep('Complete patient account registration');
  const registration = await requestJson(
    buildUrl(baseUrl, '/api/onboarding/patient/register/complete'),
    {
      method: 'POST',
      body: JSON.stringify({
        phoneNumber,
        password: patientPassword,
        confirmPassword: patientPassword,
      }),
    },
  );
  let patientToken = extractSessionToken(registration);

  logStep('Complete initial patient profile onboarding');
  const onboardingProfile = await requestJson(
    buildUrl(baseUrl, '/api/onboarding/patient/initial-profile'),
    {
      method: 'POST',
      headers: createAuthHeaders(patientToken),
      body: JSON.stringify(initialProfileData),
    },
  );
  const patientId = getRequiredField(onboardingProfile, 'patientId');

  logStep('Refresh patient session after onboarding');
  patientToken = await refreshSession(baseUrl, patientToken);

  // ─── Facility link ────────────────────────────────────────────────────────

  logStep('Create facility link request by doctor code');
  const linkRequest = await requestJson(
    buildUrl(baseUrl, '/api/patient/facility-link-requests'),
    {
      method: 'POST',
      headers: createAuthHeaders(patientToken),
      body: JSON.stringify({ doctorCode }),
    },
  );
  const linkRequestId = getRequiredField(linkRequest, 'id');

  logStep('Sign in facility staff');
  const staffToken = await signInEmail(baseUrl, staffEmail, staffPassword);

  logStep('Approve facility link request');
  const approvedLink = await requestJson(
    buildUrl(baseUrl, `/api/staff/facility-link-requests/${linkRequestId}/approve`),
    {
      method: 'PATCH',
      headers: createAuthHeaders(staffToken),
    },
  );
  const facilityId = getRequiredField(approvedLink, 'facilityId');

  logStep('Refresh patient session after facility approval');
  patientToken = await refreshSession(baseUrl, patientToken);

  // ─── Facility visit (optional clinical context) ───────────────────────────

  logStep('Create facility medical profile');
  const medicalProfile = await requestJson(
    buildUrl(baseUrl, '/api/facility/patient-medical-profiles'),
    {
      method: 'POST',
      headers: createAuthHeaders(staffToken),
      body: JSON.stringify({
        patientId,
        fullName: patientName,
        dateOfBirth: initialProfileData.dateOfBirth,
        gender: 'MALE',
        address: '12 Nguyen Hue, Phuong Ben Nghe, Quan 1, TP. Ho Chi Minh',
        phoneNumber,
        citizenIdNumber,
        healthInsuranceNumber: `BHYT${phoneNumber.slice(-8)}`,
        healthInsuranceValidFrom: '2026-01-01',
        healthInsuranceValidTo: '2026-12-31',
        note: 'Created by API flow script',
      }),
    },
  );
  const medicalProfileId = getRequiredField(medicalProfile, 'id');

  logStep('Create facility visit registration');
  const visitRegistration = await requestJson(
    buildUrl(
      baseUrl,
      `/api/facility/patient-medical-profiles/${medicalProfileId}/visit-registrations`,
    ),
    {
      method: 'POST',
      headers: createAuthHeaders(staffToken),
      body: JSON.stringify({
        patientId,
        chiefComplaint: 'Headache and elevated blood pressure',
        note: 'Generated by automated API flow script',
      }),
    },
  );
  const visitRegistrationId = getRequiredField(visitRegistration, 'id');

  // ─── Patient health profile ───────────────────────────────────────────────

  logStep('Patient creates own health profile');
  const healthProfile = await requestJson(
    buildUrl(baseUrl, '/api/patient/health-profiles'),
    {
      method: 'POST',
      headers: createAuthHeaders(patientToken),
      body: JSON.stringify({
        fullName: patientName,
        dateOfBirth: '1990-01-01',
        gender: 'MALE',
        citizenIdNumber,
        phoneNumber,
        address: '12 Nguyen Hue, TP. Ho Chi Minh',
      }),
    },
  );
  const patientHealthProfileId = getRequiredField(healthProfile, 'id');

  // ─── Care package selection ───────────────────────────────────────────────

  logStep('Load public care packages for facility');
  const carePackages = await requestJson(
    buildUrl(baseUrl, `/api/patient/care-subscriptions/packages?facilityId=${facilityId}`),
    {
      method: 'GET',
      headers: createAuthHeaders(patientToken),
    },
  );
  if (!Array.isArray(carePackages) || carePackages.length === 0) {
    throw new Error(
      'No public care packages found for the facility. ' +
      'Run seed data first, e.g. `npm run seed:dev`.',
    );
  }
  const selectedPackage = carePackages[0];
  const carePackageId = getRequiredField(selectedPackage, 'id');
  const carePackageName = selectedPackage.name ?? carePackageId;

  process.stdout.write(`   → Selected package: ${carePackageName}\n`);

  // ─── Subscription order + payment ────────────────────────────────────────

  logStep('Create care subscription order (linked to health profile)');
  const careOrder = await requestJson(
    buildUrl(baseUrl, '/api/patient/care-subscription-orders'),
    {
      method: 'POST',
      headers: createAuthHeaders(patientToken),
      body: JSON.stringify({
        patientHealthProfileId,
        carePackageId,
      }),
    },
  );
  const careOrderId = getRequiredField(careOrder, 'id');
  const careOrderCode = careOrder.orderCode ?? careOrderId;

  process.stdout.write(`   → Order code: ${careOrderCode}\n`);

  logStep('Create payment session');
  const paymentSession = await requestJson(
    buildUrl(
      baseUrl,
      `/api/patient/care-subscription-orders/${careOrderId}/payment-sessions`,
    ),
    {
      method: 'POST',
      headers: createAuthHeaders(patientToken),
      body: JSON.stringify({ provider: 'payment_gateway' }),
    },
  );
  const sessionCode = getRequiredField(paymentSession, 'sessionCode');

  logStep('Mark payment as PAID through provider-agnostic webhook');
  const webhookPayload = {
    provider: 'payment_gateway',
    providerEventId: `evt_${Date.now()}`,
    sessionCode,
    providerPaymentId: `pay_${Date.now()}`,
    status: 'PAID',
    payload: {
      source: 'run-patient-care-group-flow.cjs',
    },
  };
  await requestJson(
    buildUrl(baseUrl, '/api/webhooks/payments/provider-agnostic'),
    {
      method: 'POST',
      headers: {
        'x-payment-signature': signPaymentWebhook(
          webhookPayload,
          webhookSecret,
        ),
      },
      body: JSON.stringify(webhookPayload),
    },
  );

  // ─── Resolve active subscription + auto-created care group ───────────────

  logStep('Reload active care subscriptions to find auto-created group');
  const activeSubscriptions = getResponseDataArray(
    await requestJson(
      buildUrl(baseUrl, '/api/patient/care-subscriptions?page=1&limit=20&status=ACTIVE'),
      {
        method: 'GET',
        headers: createAuthHeaders(patientToken),
      },
    ),
  );
  const activeSubscription = activeSubscriptions.find(
    (subscription) =>
      subscription &&
      typeof subscription === 'object' &&
      subscription.patientHealthProfileId === patientHealthProfileId,
  );
  if (!activeSubscription) {
    throw new Error(
      'Active subscription was not created after payment. ' +
      'Check webhook delivery and PAYMENT_WEBHOOK_SECRET.',
    );
  }
  const subscriptionId = getRequiredField(activeSubscription, 'id');
  const careGroupId = getRequiredField(activeSubscription, 'careGroupId');

  process.stdout.write(`   → Subscription id:  ${subscriptionId}\n`);
  process.stdout.write(`   → Care group id:    ${careGroupId}\n`);

  // ─── Admin assigns doctor to the auto-created care group ─────────────────

  logStep('Sign in doctor account');
  let doctorToken = await signInEmail(baseUrl, doctorEmail, doctorPassword);

  logStep('Refresh doctor session to resolve doctor user id');
  const doctorSession = await refreshSessionDetails(baseUrl, doctorToken);
  doctorToken = extractSessionToken(doctorSession);
  const doctorUser = extractSessionUser(doctorSession);
  const doctorUserId = getRequiredField(doctorUser, 'id');

  logStep('Admin adds doctor monitor to auto-created care group');
  await requestJson(
    buildUrl(baseUrl, `/api/staff/care-groups/${careGroupId}/members`),
    {
      method: 'POST',
      headers: createAuthHeaders(staffToken),
      body: JSON.stringify({
        userId: doctorUserId,
        role: 'MONITOR',
      }),
    },
  );

  // ─── Assign facility visit doctor ─────────────────────────────────────────

  logStep('Assign visit registration to doctor');
  await requestJson(
    buildUrl(
      baseUrl,
      `/api/facility/visit-registrations/${visitRegistrationId}/assign-doctor`,
    ),
    {
      method: 'PATCH',
      headers: createAuthHeaders(staffToken),
      body: JSON.stringify({ doctorUserId }),
    },
  );

  // ─── Risk factor assessment ───────────────────────────────────────────────

  logStep('Resolve care group code from subscription');
  const careGroupDetail = await requestJson(
    buildUrl(baseUrl, `/api/staff/care-groups/${careGroupId}`),
    {
      method: 'GET',
      headers: createAuthHeaders(staffToken),
    },
  );
  const careGroupCode = getRequiredField(careGroupDetail, 'code');

  logStep('Load active risk factor assessment form');
  const assessmentForm = await requestJson(
    buildUrl(baseUrl, '/api/patient/assessment-forms/risk-factor-stratification'),
    {
      method: 'GET',
      headers: createAuthHeaders(patientToken),
    },
  );
  const assessmentFormCode = getRequiredField(assessmentForm, 'code');

  logStep('Submit risk factor assessment (linked to health profile + care group)');
  const assessment = await requestJson(
    buildUrl(baseUrl, '/api/patient/risk-factor-assessments'),
    {
      method: 'POST',
      headers: createAuthHeaders(patientToken),
      body: JSON.stringify({
        patientHealthProfileId,
        careGroupCode,
        inputSnapshot: {
          systolic: 152,
          diastolic: 96,
          bmi: 24,
          heartRate: 88,
          hasDyslipidemia: true,
          exerciseMinutesGroup: '<30',
          isSmoking: false,
          hasLeftVentricularHypertrophy: true,
          hasAlbuminuriaOrMicroalbuminuria: false,
          hasCarotidWallDamage: false,
          chronicKidneyDiseaseStage3Or4: false,
          diabetes: true,
          stroke: false,
          heartFailure: false,
          atrialFibrillation: false,
        },
      }),
    },
  );
  const assessmentId = getRequiredField(assessment, 'id');

  logStep('Doctor loads care-group assessment queue');
  await requestJson(
    buildUrl(
      baseUrl,
      `/api/doctor/care-groups/${careGroupId}/risk-factor-assessments?page=1&limit=20`,
    ),
    {
      method: 'GET',
      headers: createAuthHeaders(doctorToken),
    },
  );

  logStep('Doctor reviews and verifies the assessment');
  const reviewedAssessment = await requestJson(
    buildUrl(
      baseUrl,
      `/api/doctor/risk-factor-assessments/${assessmentId}/review`,
    ),
    {
      method: 'PATCH',
      headers: createAuthHeaders(doctorToken),
      body: JSON.stringify({
        doctorRiskLevel: 'HIGH',
        doctorReviewNote:
          'System review is consistent. Continue close follow-up and treatment.',
        action: 'VERIFY',
      }),
    },
  );

  // ─── Examination and treatment ────────────────────────────────────────────

  logStep('Doctor creates examination from reviewed assessment');
  const examination = await requestJson(
    buildUrl(
      baseUrl,
      `/api/doctor/risk-factor-assessments/${assessmentId}/examination`,
    ),
    {
      method: 'POST',
      headers: createAuthHeaders(doctorToken),
      body: JSON.stringify({
        patientCareSubscriptionId: subscriptionId,
      }),
    },
  );
  const examinationId = getRequiredField(examination, 'id');

  logStep('Doctor completes examination details');
  const updatedExamination = await requestJson(
    buildUrl(baseUrl, `/api/doctor/examinations/${examinationId}`),
    {
      method: 'PATCH',
      headers: createAuthHeaders(doctorToken),
      body: JSON.stringify({
        status: 'COMPLETED',
        diagnosis: 'Stage 1 hypertension with diabetes risk factors',
        conclusion:
          'Needs blood pressure control, lifestyle adjustment, and home monitoring.',
        treatmentPlan:
          'Daily blood pressure checks, low-salt diet, medication adherence, and follow-up in 2 weeks.',
        patientNoteText:
          'Patient reports intermittent headache in the morning.',
        doctorAdviceText:
          'Escalate sooner if systolic blood pressure remains above 160.',
        treatmentGoalSnapshot: {
          primaryGoal: 'Blood pressure under 130/85 mmHg',
          followUpDays: 14,
        },
      }),
    },
  );

  logStep('Doctor creates treatment plan');
  const treatmentPlan = await requestJson(
    buildUrl(baseUrl, `/api/doctor/examinations/${examinationId}/treatment-plan`),
    {
      method: 'POST',
      headers: createAuthHeaders(doctorToken),
      body: JSON.stringify({
        title: 'Hypertension follow-up treatment plan',
        note: 'This plan was created by the automated API flow script.',
      }),
    },
  );
  const treatmentPlanId = getRequiredField(treatmentPlan, 'id');

  logStep('Doctor activates treatment plan');
  const updatedTreatmentPlan = await requestJson(
    buildUrl(baseUrl, `/api/doctor/treatment-plans/${treatmentPlanId}`),
    {
      method: 'PATCH',
      headers: createAuthHeaders(doctorToken),
      body: JSON.stringify({
        status: 'ACTIVE',
        note: 'Activated immediately after examination review.',
      }),
    },
  );

  logStep('Doctor creates patient diagnosis');
  const diagnosis = await requestJson(
    buildUrl(baseUrl, `/api/staff/patients/${patientId}/diagnoses`),
    {
      method: 'POST',
      headers: createAuthHeaders(doctorToken),
      body: JSON.stringify({
        name: 'Primary hypertension',
        diagnosis: 'Stage 1 hypertension',
        remarks: 'Created during automated end-to-end API flow test.',
        diagnosedAt: new Date().toISOString(),
      }),
    },
  );
  const diagnosisId = getRequiredField(diagnosis, 'id');

  logStep('Doctor creates treatment targets');
  const treatmentTarget = await requestJson(
    buildUrl(baseUrl, `/api/staff/patients/${patientId}/treatment-targets`),
    {
      method: 'POST',
      headers: createAuthHeaders(doctorToken),
      body: JSON.stringify({
        treatmentPlanId,
        note: 'Track blood pressure and fasting glucose for 14 days.',
        targetRate: 80,
        items: [
          {
            metricCode: 'BLOOD_PRESSURE',
            summary: 'Blood pressure target',
            operator: '<',
            targetValue: 130,
            targetSecondaryValue: 85,
            unit: 'mmHg',
            effectiveFrom: new Date().toISOString(),
          },
          {
            metricCode: 'BLOOD_GLUCOSE',
            summary: 'Fasting glucose target',
            operator: '<',
            targetValue: 7,
            unit: 'mmol/L',
            effectiveFrom: new Date().toISOString(),
          },
        ],
      }),
    },
  );
  const treatmentTargetId = getRequiredField(treatmentTarget, 'id');

  logStep('Doctor loads medications');
  const medicationList = getResponseDataArray(
    await requestJson(buildUrl(baseUrl, '/api/admin/medications?page=1&limit=10'), {
      method: 'GET',
      headers: createAuthHeaders(doctorToken),
    }),
  );
  if (medicationList.length === 0) {
    throw new Error(
      'No medications available. Seed medication catalog before running this script.',
    );
  }

  const medicationIds = medicationList
    .slice(0, Math.min(2, medicationList.length))
    .map((item) => getRequiredField(item, 'id'));

  logStep('Doctor creates prescription');
  const prescription = await requestJson(
    buildUrl(baseUrl, `/api/patients/${patientId}/prescriptions`),
    {
      method: 'POST',
      headers: createAuthHeaders(doctorToken),
      body: JSON.stringify({
        treatmentPlanId,
        note: 'Use as prescribed and report adverse effects if any.',
        duration: 30,
        items: medicationIds.map((medicationId, index) => ({
          medicationId,
          quantityPerDose: 1,
          frequency: 'Daily',
          timeSchedule: index === 0 ? ['08:00'] : ['20:00'],
          instruction: 'Take after meals with water.',
          notes:
            index === 0
              ? 'Morning dose'
              : 'Evening dose',
        })),
      }),
    },
  );
  const prescriptionId = getRequiredField(prescription, 'id');

  // ─── Summary ──────────────────────────────────────────────────────────────

  const runSummary = {
    createdAt: new Date().toISOString(),
    baseUrl,
    onboarding: {
      phoneNumber,
      patientPassword,
      patientId,
      onboardingCompleted: getRequiredField(
        onboardingProfile,
        'onboardingCompleted',
      ),
    },
    facilityLinkRequest: {
      id: linkRequestId,
      doctorCode,
      facilityId,
    },
    facilityVisit: {
      medicalProfileId,
      visitRegistrationId,
      doctorUserId,
    },
    healthProfile: {
      patientHealthProfileId,
    },
    careSubscription: {
      carePackageId,
      carePackageName,
      orderId: careOrderId,
      orderCode: careOrderCode,
      paymentSessionCode: sessionCode,
      subscriptionId,
      careGroupId,
      careGroupCode,
    },
    assessment: {
      formCode: assessmentFormCode,
      assessmentId,
      reviewedAssessment,
    },
    examination: {
      examinationId,
      updatedExamination,
    },
    treatment: {
      treatmentPlanId,
      updatedTreatmentPlan,
      treatmentTargetId,
      diagnosisId,
      prescriptionId,
    },
  };

  const savedPath = appendRunRecord(outputFile, runSummary);
  process.stdout.write(
    `${JSON.stringify(
      {
        ...runSummary,
        onboarding: {
          ...runSummary.onboarding,
          patientPassword: '[redacted]',
        },
      },
      null,
      2,
    )}\n`,
  );
  process.stdout.write(`Saved run summary to ${savedPath}\n`);
}

module.exports = {
  main,
};

if (require.main === module) {
  main().catch((error) => {
    process.stderr.write(
      `${error instanceof Error ? error.stack || error.message : String(error)}\n`,
    );
    process.exitCode = 1;
  });
}
