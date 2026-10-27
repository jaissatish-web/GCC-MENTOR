/**
 * Server quota policy: founder-authorized personal allowance, 2026-10-27.
 * The Auth account ID was verified directly; editable profile/contact fields
 * must never grant this exception. This grants no admin or paid ownership access.
 * Keep the integer contract used by the existing Postgres reservation RPC.
 */
const UNLIMITED_ACCOUNT_ID = 'd878fc6b-d9b9-4086-b9fd-422eb8c95e79'
export const UNLIMITED_PERSONAL_ALLOWANCE = 2_147_483_647

export function hasUnlimitedPersonalUsage(userId: string): boolean {
  return userId === UNLIMITED_ACCOUNT_ID
}
