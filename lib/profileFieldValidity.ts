/** Shared basic checks only: never infer whether a career claim is true. */
export function profileTextPresent(value: unknown): value is string {
  return typeof value === 'string' && !!value.trim() && !/^(n\/?a|unknown|not found|null|undefined|[-?]+)$/i.test(value.trim()) && !value.includes('\uFFFD')
}
export function validProfileEmail(value: unknown): boolean {
  return profileTextPresent(value) && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim())
}
export function validProfilePhone(value: unknown): boolean {
  if (!profileTextPresent(value)) return false
  const digits = value.replace(/\D/g, '')
  return /^[+\d\s().-]+$/.test(value.trim()) && digits.length >= 7 && digits.length <= 15
}
