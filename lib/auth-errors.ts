// Shared helpers for parsing Supabase auth error responses without leaking
// them verbatim to clients. The login route uses these to differentiate
// "user already exists" from other failures for UX purposes (auto-switching
// signup → login) while keeping the user-visible error text generic.

export type SupabaseAuthError = {
  msg?: string;
  message?: string;
  error_description?: string;
  error?: string;
  code?: string;
};

// Matches Supabase variants:
//   "A user with this email address has already been registered"
//   "User already exists"
//   "user_already_exists" (code field)
const ALREADY_EXISTS_PATTERN = /already\b[\s\S]{0,40}\b(registered|exists)|user_already_exists/i;

export function isAlreadyExistsError(err: SupabaseAuthError | null | undefined): boolean {
  if (!err) return false;
  if (err.code === 'user_already_exists') return true;
  const fields = [err.error_description, err.message, err.msg, err.error];
  return fields.some((v) => typeof v === 'string' && ALREADY_EXISTS_PATTERN.test(v));
}
