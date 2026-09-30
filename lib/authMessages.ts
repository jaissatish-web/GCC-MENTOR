/**
 * Supabase auth errors, in words a job seeker understands (2026-09-30).
 *
 * Supabase returns developer messages — "Invalid login credentials", "Email not
 * confirmed", "User already registered". Shown raw they read as a broken site.
 * Each known message maps to what happened and what to do next; anything
 * unknown gets a calm generic line (the raw text is logged, never shown).
 *
 * `kind` lets a form offer the right next action (resend a confirmation email,
 * go to sign-in) without string-matching the message again.
 */
export type AuthErrorKind = 'credentials' | 'unconfirmed' | 'exists' | 'rate_limit' | 'weak_password' | 'expired' | 'unknown'

export function friendlyAuthError(raw: { message?: string; status?: number; code?: string } | null | undefined): {
  kind: AuthErrorKind
  message: string
} {
  const msg = (raw?.message ?? '').toLowerCase()
  const code = (raw?.code ?? '').toLowerCase()
  if (raw?.status === 429 || /rate limit|too many/.test(msg) || code.includes('rate_limit')) {
    return { kind: 'rate_limit', message: 'Too many attempts. Please wait a minute, then try again.' }
  }
  if (/invalid login credentials|invalid_credentials/.test(msg) || code === 'invalid_credentials') {
    return { kind: 'credentials', message: 'That email and password don’t match. Check them, or reset your password.' }
  }
  if (/email not confirmed/.test(msg) || code === 'email_not_confirmed') {
    return { kind: 'unconfirmed', message: 'Please confirm your email first. We sent you a link when you signed up.' }
  }
  if (/already registered|already exists|user_already_exists/.test(msg) || code === 'user_already_exists') {
    return { kind: 'exists', message: 'An account with this email already exists. Sign in instead.' }
  }
  if (/password/.test(msg) && /(weak|short|at least|characters|pwned|leaked)/.test(msg)) {
    return { kind: 'weak_password', message: 'Choose a stronger password — longer, mixing letters and numbers.' }
  }
  if (/expired|invalid.*(token|otp|link)|otp_expired/.test(msg) || code === 'otp_expired') {
    return { kind: 'expired', message: 'That link has expired or was already used. Ask for a new one.' }
  }
  return { kind: 'unknown', message: 'Something went wrong on our side. Please try again in a moment.' }
}
