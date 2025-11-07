/**
 * PHI Redaction Utility
 * Automatically redacts sensitive fields from logs and API responses
 */

const REDACTION_PATTERNS = {
  ssn: /\b\d{3}-\d{2}-\d{4}\b/g,
  mrn: /\bTEST-\d{4}\b/g,
  phone: /\+1-\d{3}-\d{3}-\d{4}/g,
  email: /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g,
  dob: /\b\d{4}-\d{2}-\d{2}\b/g, // ISO date format
};

const SENSITIVE_FIELDS = [
  'password',
  'ssn',
  'sin',
  'mrn',
  'fakeMrn',
  'dob',
  'dateOfBirth',
  'email',
  'smsNumber',
  'phone',
  'phoneNumber',
  'address',
  'postalCode',
];

export interface RedactionOptions {
  enabled?: boolean;
  preserveStructure?: boolean;
  customFields?: string[];
}

/**
 * Redact sensitive information from a string
 */
export function redactString(input: string, options: RedactionOptions = {}): string {
  if (options.enabled === false) {
    return input;
  }

  let redacted = input;

  // Apply regex patterns
  Object.entries(REDACTION_PATTERNS).forEach(([type, pattern]) => {
    redacted = redacted.replace(pattern, `[REDACTED_${type.toUpperCase()}]`);
  });

  return redacted;
}

/**
 * Redact sensitive fields from an object
 */
export function redactObject<T = any>(obj: T, options: RedactionOptions = {}): T {
  if (options.enabled === false) {
    return obj;
  }

  if (obj === null || obj === undefined) {
    return obj;
  }

  if (typeof obj !== 'object') {
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map((item) => redactObject(item, options)) as T;
  }

  const fieldsToRedact = [...SENSITIVE_FIELDS, ...(options.customFields || [])];
  const redacted: any = {};

  for (const [key, value] of Object.entries(obj)) {
    if (fieldsToRedact.includes(key)) {
      redacted[key] = options.preserveStructure
        ? `[REDACTED_${key.toUpperCase()}]`
        : '[REDACTED]';
    } else if (typeof value === 'object' && value !== null) {
      redacted[key] = redactObject(value, options);
    } else if (typeof value === 'string') {
      redacted[key] = redactString(value, options);
    } else {
      redacted[key] = value;
    }
  }

  return redacted as T;
}

/**
 * Mask email address (show first 2 chars and domain)
 */
export function maskEmail(email: string): string {
  const parts = email.split('@');
  if (parts.length !== 2) return '[INVALID_EMAIL]';

  const localPart = parts[0];
  const maskedLocal = localPart.length > 2
    ? `${localPart.substring(0, 2)}***`
    : '***';

  return `${maskedLocal}@${parts[1]}`;
}

/**
 * Mask phone number (show last 4 digits only)
 */
export function maskPhone(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  if (digits.length < 4) return '[REDACTED_PHONE]';

  return `***-***-${digits.slice(-4)}`;
}

/**
 * Create a safe log object with PHI redacted
 */
export function createSafeLogObject(obj: any): any {
  const enabled = process.env.LOG_REDACTION_ENABLED !== 'false';
  return redactObject(obj, {
    enabled,
    preserveStructure: true,
  });
}
