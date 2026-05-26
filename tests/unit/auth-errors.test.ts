import { describe, expect, it } from 'vitest';
import { isAlreadyExistsError } from '../../lib/auth-errors';

describe('isAlreadyExistsError', () => {
  it('returns false for null / undefined', () => {
    expect(isAlreadyExistsError(null)).toBe(false);
    expect(isAlreadyExistsError(undefined)).toBe(false);
  });

  it('returns false for an empty error object', () => {
    expect(isAlreadyExistsError({})).toBe(false);
  });

  it('detects via the structured code field', () => {
    expect(isAlreadyExistsError({ code: 'user_already_exists' })).toBe(true);
  });

  it('detects via Supabase error_description', () => {
    expect(isAlreadyExistsError({
      error_description: 'A user with this email address has already been registered',
    })).toBe(true);
  });

  it('detects via message field', () => {
    expect(isAlreadyExistsError({ message: 'User already exists' })).toBe(true);
  });

  it('detects via msg field', () => {
    expect(isAlreadyExistsError({ msg: 'User already registered' })).toBe(true);
  });

  it('detects via error field', () => {
    expect(isAlreadyExistsError({ error: 'user_already_exists' })).toBe(true);
  });

  it('is case-insensitive', () => {
    expect(isAlreadyExistsError({ message: 'ALREADY REGISTERED' })).toBe(true);
  });

  it('returns false for unrelated Supabase errors (no enumeration on those)', () => {
    expect(isAlreadyExistsError({ message: 'Invalid login credentials' })).toBe(false);
    expect(isAlreadyExistsError({ message: 'Email not confirmed' })).toBe(false);
    expect(isAlreadyExistsError({ message: 'Password should be at least 8 characters' })).toBe(false);
    expect(isAlreadyExistsError({ code: 'invalid_credentials' })).toBe(false);
  });

  it('returns false when only non-string values are present', () => {
    expect(isAlreadyExistsError({ message: undefined, error: undefined })).toBe(false);
  });
});
