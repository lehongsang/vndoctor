import { SetMetadata } from '@nestjs/common';

export const PATIENT_READABLE = 'patient-readable';

export interface PatientReadableOptions {
  /**
   * Route param carrying the target patient id. Defaults to `patientId`.
   */
  paramName?: string;
}

/**
 * Marks patient-scoped read endpoints that accept self or accepted connections.
 */
export const PatientReadable = (options: PatientReadableOptions = {}) =>
  SetMetadata(PATIENT_READABLE, options);
