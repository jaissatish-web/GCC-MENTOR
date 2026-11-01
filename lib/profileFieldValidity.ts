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

/** A display warning only. Do not rewrite a supplied optional profile address. */
export function validProfileLinkedIn(value: unknown): boolean {
  if (!profileTextPresent(value)) return false
  // A copied browser address commonly omits https://. Check a temporary value;
  // retaining the candidate's exact text is the save contract.
  const text = value.trim()
  const candidate = /^(?:[a-z]{2,3}\.|www\.)?linkedin\.com\//i.test(text) ? `https://${text}` : text
  try {
    const url = new URL(candidate)
    return ['https:', 'http:'].includes(url.protocol) && !url.username && !url.password && /(^|\.)linkedin\.com$/i.test(url.hostname)
  } catch {
    return false
  }
}
