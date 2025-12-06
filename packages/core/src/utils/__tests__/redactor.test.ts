import {
  redactString,
  redactObject,
  maskEmail,
  maskPhone,
} from '../redactor';

describe('Redactor', () => {
  describe('redactString', () => {
    it('should redact SSN patterns', () => {
      const input = 'SSN: 123-45-6789';
      const result = redactString(input);
      expect(result).toContain('[REDACTED_SSN]');
      expect(result).not.toContain('123-45-6789');
    });

    it('should redact phone numbers', () => {
      const input = 'Call me at +1-519-555-1234';
      const result = redactString(input);
      expect(result).toContain('[REDACTED_PHONE]');
      expect(result).not.toContain('555-1234');
    });

    it('should redact email addresses', () => {
      const input = 'Email: patient@example.com';
      const result = redactString(input);
      expect(result).toContain('[REDACTED_EMAIL]');
      expect(result).not.toContain('patient@example.com');
    });

    it('should not redact when disabled', () => {
      const input = 'SSN: 123-45-6789';
      const result = redactString(input, { enabled: false });
      expect(result).toBe(input);
    });
  });

  describe('redactObject', () => {
    it('should redact sensitive fields', () => {
      const obj = {
        name: 'John Doe',
        email: 'john@example.com',
        phone: '+1-519-555-0001',
        ssn: '123-45-6789',
      };

      const result = redactObject(obj);

      expect(result.name).toBe('John Doe'); // Not sensitive
      expect(result.email).toBe('[REDACTED]');
      expect(result.phone).toBe('[REDACTED]');
      expect(result.ssn).toBe('[REDACTED]');
    });

    it('should handle nested objects', () => {
      const obj = {
        patient: {
          name: 'John Doe',
          email: 'john@example.com',
        },
      };

      const result = redactObject(obj);

      expect(result.patient.name).toBe('John Doe');
      expect(result.patient.email).toBe('[REDACTED]');
    });

    it('should handle arrays', () => {
      const obj = {
        patients: [
          { name: 'John', email: 'john@example.com' },
          { name: 'Jane', email: 'jane@example.com' },
        ],
      };

      const result = redactObject(obj);

      expect(result.patients).toHaveLength(2);
      expect(result.patients[0].email).toBe('[REDACTED]');
      expect(result.patients[1].email).toBe('[REDACTED]');
    });

    it('should preserve structure when requested', () => {
      const obj = {
        email: 'test@example.com',
        fakeMrn: 'TEST-1234',
      };

      const result = redactObject(obj, { preserveStructure: true });

      expect(result.email).toBe('[REDACTED_EMAIL]');
      expect(result.fakeMrn).toBe('[REDACTED_FAKEMRN]');
    });
  });

  describe('maskEmail', () => {
    it('should mask email address', () => {
      const result = maskEmail('patient@example.com');
      expect(result).toBe('pa***@example.com');
    });

    it('should handle short emails', () => {
      const result = maskEmail('a@example.com');
      expect(result).toBe('***@example.com');
    });

    it('should handle invalid emails', () => {
      const result = maskEmail('invalid-email');
      expect(result).toBe('[INVALID_EMAIL]');
    });
  });

  describe('maskPhone', () => {
    it('should mask phone number', () => {
      const result = maskPhone('+1-519-555-1234');
      expect(result).toBe('***-***-1234');
    });

    it('should handle phone without formatting', () => {
      const result = maskPhone('5195551234');
      expect(result).toBe('***-***-1234');
    });

    it('should handle short numbers', () => {
      const result = maskPhone('123');
      expect(result).toBe('[REDACTED_PHONE]');
    });
  });
});
