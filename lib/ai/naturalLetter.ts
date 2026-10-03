/**
 * Cover letter voice, enforced in code (founder, 2026-10-02: "very natural,
 * not like AI tone"). The prompt bans these phrases, but the model still uses
 * some; each is swapped for the plain wording a person would write. Only
 * wording changes, never a fact. Instant, so it costs no waiting time.
 */
const SWAPS: Array<[RegExp, string]> = [
  [/\bI am writing to express my (?:strong |keen |sincere )?interest in\b/gi, 'I would like to apply for'],
  [/\bI am confident (?:in my ability to|that I can)\b/gi, 'I can'],
  [/\bI am (?:excited|thrilled) (?:about|by) the opportunity to\b/gi, 'I would like to'],
  [/\baligns (?:well |closely |perfectly |directly )?with\b/gi, 'matches'],
  [/\balign (?:well |closely |perfectly |directly )?with\b/gi, 'match'],
  [/\bwell-versed in\b/gi, 'experienced in'],
  [/\bI am (?:eager|keen) to (?:leverage|apply)\b/gi, 'I would like to use'],
  [/\b(?:eager|keen) to\b/gi, 'ready to'],
  [/\bleverag(?:e|ing)\b/gi, 'use'],
  [/\bproven track record (?:of|in)\b/gi, 'experience in'],
  [/\ba blend of\b/gi, 'a mix of'],
  [/\b(?:Furthermore|Moreover|Additionally),\s*/g, ''],
  [/\s*[—–]\s*/g, ', '],
]

export function naturalVoice(text: string): string {
  let out = text
  for (const [re, to] of SWAPS) out = out.replace(re, to)
  // A sentence that now starts lower case after a removed connector.
  return out.replace(/(^|[.!?]\s+)([a-z])/g, (_, p, c) => p + c.toUpperCase()).replace(/\s{2,}/g, ' ').replace(/ ,/g, ',').trim()
}

const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

/**
 * A letter written ABOUT the applicant instead of BY them (2026-10-03, live):
 * "I am writing to recommend Rania Haddad ... she brings clinical competence".
 * Two he/she-type pronouns, or the applicant's own name in the prose beside a
 * pronoun or a "recommend", is a letter the applicant cannot send.
 */
export function writtenAboutApplicant(prose: string, fullName: string | null | undefined): boolean {
  const pronouns = (prose.match(/\b(she|he|her|hers|him|his|herself|himself)\b/gi) ?? []).length
  if (pronouns >= 2) return true
  const names = (fullName ?? '').split(/\s+/).filter((n) => n.length >= 3).map(escapeRe)
  if (names.length === 0) return false
  const named = new RegExp(`\\b(${names.join('|')})\\b`, 'i')
  if (!named.test(prose)) return false
  return pronouns >= 1 || new RegExp(`\\b(recommend|introduce|present)\\b[^.]{0,60}\\b(${names.join('|')})\\b`, 'i').test(prose)
}

/** "JOSEPH THOMAS VARGHESE" as uploaded in capitals reads as shouting under a letter. */
function displayName(name: string): string {
  return name === name.toUpperCase() ? name.toLowerCase().replace(/\b\p{L}/gu, (c) => c.toUpperCase()) : name
}

/**
 * The applicant's name and contact line under the sign-off (2026-10-03; the
 * launch audit found letters ending "Sincerely," with nothing after it). Added
 * in code from the saved CV's own header, so it follows what the CV shows.
 */
export function signOffBlock(signOff: string, name: string | null | undefined, contact: string | null | undefined): string {
  return [signOff.trim() || 'Sincerely,', name?.trim() ? displayName(name.trim()) : null, contact?.trim() || null].filter(Boolean).join('\n')
}

const words = (t: string) => t.split(/\s+/).filter(Boolean).length

/**
 * The Short tone stays short: body sentences are dropped from the end until
 * the letter is within `max` words. Opening and closing are kept whole.
 */
export function capWords(opening: string, body: string[], closing: string, max: number): string[] {
  const out = [...body]
  const total = () => words(opening) + out.reduce((n, p) => n + words(p), 0) + words(closing)
  while (total() > max && out.length) {
    const last = out[out.length - 1]
    const sentences = last.split(/(?<=[.!?])\s+/)
    if (sentences.length > 1) out[out.length - 1] = sentences.slice(0, -1).join(' ')
    else if (out.length > 1) out.pop()
    else break
  }
  return out
}
