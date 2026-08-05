/**
 * Shared state type for the auth server actions (TASK-005).
 *
 * The login method is an open decision (docs/RULES.md §5). These pages ship
 * email + password only. Separating the state type keeps the form
 * provider-neutral so an OAuth or OTP action can be added without
 * restructuring the form: it just has to return this same shape.
 */
export type AuthState = {
  error?: string | null
  success?: string | null
}
