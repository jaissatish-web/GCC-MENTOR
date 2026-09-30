import type { AuthErrorKind } from '@/lib/authMessages'

/**
 * Shared state type for the auth server actions (TASK-005).
 *
 * The login method is an open decision (docs/RULES.md §5). These pages ship
 * email + password only. Separating the state type keeps the form
 * provider-neutral so an OAuth or OTP action can be added without
 * restructuring the form: it just has to return this same shape.
 *
 * 2026-09-30: `kind` says what went wrong (so the form can offer "resend the
 * confirmation email" or "sign in instead"), and `email` carries the address
 * into the "check your inbox" screen.
 */
export type AuthState = {
  error?: string | null
  success?: string | null
  kind?: AuthErrorKind | 'check_email' | null
  email?: string | null
}
