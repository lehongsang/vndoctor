#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const DEFAULT_BASE_URL = 'http://localhost:3005';
const DEFAULT_DOCTOR_CODE = 'DREXTRA01';
const DEFAULT_OTP = '111111';
const DEFAULT_PASSWORD = 'Patient1234';
const DEFAULT_OUTPUT_FILE = path.join(
  __dirname,
  'onboarding-link-request-accounts.json',
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
 * @param {string} baseUrl BE domain, with or without trailing slash.
 * @param {string} apiPath API path starting with `/`.
 * @returns {string} Absolute API URL.
 */
function buildUrl(baseUrl, apiPath) {
  return `${baseUrl.replace(/\/+$/, '')}${apiPath}`;
}

/**
 * Generates a random Vietnamese-looking phone number that passes BE validation.
 *
 * @returns {string} Phone number in international format.
 */
function generateRandomPhoneNumber() {
  const randomDigits = String(Math.floor(Math.random() * 100000000)).padStart(
    8,
    '0',
  );
  return `+849${randomDigits}`;
}

/**
 * Sends a JSON request and throws with response detail on failure.
 *
 * @param {string} url Absolute request URL.
 * @param {object} options Fetch options.
 * @returns {Promise<unknown>} Parsed response payload.
 */
async function requestJson(url, options = {}) {
  const response = await fetch(url, {
    ...options,
    headers: {
      'content-type': 'application/json',
      ...(options.headers || {}),
    },
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
 * Parses JSON without hiding the original raw response.
 *
 * @param {string} text Response body text.
 * @returns {unknown} Parsed JSON or raw text wrapper.
 */
function safeParseJson(text) {
  try {
    return JSON.parse(text);
  } catch {
    return { raw: text };
  }
}

/**
 * Returns a required string field from an unknown JSON object.
 *
 * @param {unknown} payload Response payload.
 * @param {string} field Field name.
 * @returns {string} Field value.
 */
function getRequiredString(payload, field) {
  if (
    payload &&
    typeof payload === 'object' &&
    field in payload &&
    typeof payload[field] === 'string'
  ) {
    return payload[field];
  }

  throw new Error(`Response is missing string field "${field}"`);
}

/**
 * Appends an account record to a JSON file for later manual login/testing.
 *
 * @param {string} outputFile Target JSON file path.
 * @param {Record<string, unknown>} record Account record to append.
 * @returns {string} Resolved output path.
 */
function appendAccountRecord(outputFile, record) {
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
 * Reads an existing account record JSON array.
 *
 * @param {string} outputFile Target JSON file path.
 * @returns {Array<Record<string, unknown>>} Existing records or an empty array.
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
 * Extracts a bearer token from common Better Auth response shapes.
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
 * Runs the full onboarding flow and creates one doctor link request.
 */
async function main() {
  const args = parseArgs();
  const baseUrl = args['base-url'] || process.env.BASE_URL || DEFAULT_BASE_URL;
  const doctorCode =
    args['doctor-code'] || process.env.DOCTOR_CODE || DEFAULT_DOCTOR_CODE;
  const phoneNumber =
    args.phone || process.env.PHONE_NUMBER || generateRandomPhoneNumber();
  const password = args.password || process.env.PASSWORD || DEFAULT_PASSWORD;
  const outputFile =
    args.output || process.env.OUTPUT_FILE || DEFAULT_OUTPUT_FILE;

  const initialProfile = {
    fullName: 'Nguyen Van Test',
    citizenIdNumber: generateCitizenIdNumber(),
    dateOfBirth: '1990-01-01',
    gender: 'MALE',
    provinceCode: '79',
    provinceName: 'TP. Ho Chi Minh',
    districtCode: '760',
    districtName: 'Quan 1',
    streetAddress: '12 Nguyen Hue',
    heightCm: 170,
    weightKg: 65,
    medicalHistory: [
      {
        name: 'Tang huyet ap',
        diseaseGroup: 'CARDIOVASCULAR',
      },
    ],
  };

  console.log('Creating onboarding link request...');
  console.log(`Base URL: ${baseUrl}`);
  console.log(`Phone: ${phoneNumber}`);
  console.log(`Doctor code: ${doctorCode}`);

  await requestJson(buildUrl(baseUrl, '/api/onboarding/patient/otp/send'), {
    method: 'POST',
    body: JSON.stringify({ phoneNumber }),
  });
  console.log('1. OTP sent');

  await requestJson(buildUrl(baseUrl, '/api/onboarding/patient/otp/verify'), {
    method: 'POST',
    body: JSON.stringify({ phoneNumber, otp: DEFAULT_OTP }),
  });
  console.log('2. OTP verified');

  const registration = await requestJson(
    buildUrl(baseUrl, '/api/onboarding/patient/register/complete'),
    {
      method: 'POST',
      body: JSON.stringify({
        phoneNumber,
        password,
        confirmPassword: password,
      }),
    },
  );
  const registrationToken = getRequiredString(registration, 'sessionToken');
  console.log('3. Patient account created');

  let authHeaders = { authorization: `Bearer ${registrationToken}` };

  const profile = await requestJson(
    buildUrl(baseUrl, '/api/onboarding/patient/initial-profile'),
    {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify(initialProfile),
    },
  );
  console.log('4. Initial profile completed');

  const refreshedSession = await requestJson(
    buildUrl(baseUrl, '/api/auth-session/refresh'),
    {
      method: 'POST',
      headers: authHeaders,
    },
  );
  const patientSessionToken = extractSessionToken(refreshedSession);
  authHeaders = { authorization: `Bearer ${patientSessionToken}` };
  console.log('5. Patient session refreshed');

  const doctor = await requestJson(
    buildUrl(
      baseUrl,
      `/api/patient/doctors/by-code/${encodeURIComponent(doctorCode)}`,
    ),
    {
      method: 'GET',
      headers: authHeaders,
    },
  );
  console.log('6. Doctor code resolved');

  const linkRequest = await requestJson(
    buildUrl(baseUrl, '/api/patient/facility-link-requests'),
    {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({ doctorCode }),
    },
  );
  console.log('7. Link request created');

  const record = {
    createdAt: new Date().toISOString(),
    baseUrl,
    phoneNumber,
    password,
    sessionToken: patientSessionToken,
    patientId:
      profile && typeof profile === 'object' && 'patientId' in profile
        ? profile.patientId
        : null,
    doctorCode,
    doctor,
    linkRequest,
  };

  const savedPath = appendAccountRecord(outputFile, record);
  console.log(
    JSON.stringify(
      {
        ...record,
        password: '[redacted]',
        sessionToken: '[redacted]',
      },
      null,
      2,
    ),
  );
  console.log(`Saved account record to ${savedPath}`);
}

/**
 * Generates a 12-digit citizen id for repeatable one-run test data.
 *
 * @returns {string} Citizen identity number.
 */
function generateCitizenIdNumber() {
  const randomDigits = String(Math.floor(Math.random() * 1000000000)).padStart(
    9,
    '0',
  );
  return `079${randomDigits}`;
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
