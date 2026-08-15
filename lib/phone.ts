/**
 * Phone number splitting for the profile form.
 *
 * STORAGE IS UNCHANGED. `career_profiles.phone` and `.whatsapp` are single
 * `text` columns, and three separate consumers read them as one whole string —
 * `lib/resumeDocument.ts` (prints it on the CV), `lib/ai/buildOptimizationPrompt.ts`
 * (feeds it to the model) and `lib/ai/extractionPrompt.ts` (returns it from a
 * parsed resume). Splitting the column would be a data-model change that breaks
 * all three, so the split lives purely in the UI: two controls in, one canonical
 * "+<code> <number>" string out.
 *
 * Dial codes are the GCC markets the product supports plus the countries its
 * users actually come from, ordered with India and the Gulf first because that
 * is who fills this form. `OTHER_CODES` covers the rest without pretending to
 * be an exhaustive ITU list.
 */

export interface DialCode {
  /** ISO 3166-1 alpha-2, used only as a stable React key. */
  iso: string
  country: string
  dial: string
}

/** Primary markets — shown at the top of the picker. */
export const PRIMARY_DIAL_CODES: readonly DialCode[] = [
  { iso: 'IN', country: 'India', dial: '+91' },
  { iso: 'SA', country: 'Saudi Arabia', dial: '+966' },
  { iso: 'AE', country: 'United Arab Emirates', dial: '+971' },
  { iso: 'QA', country: 'Qatar', dial: '+974' },
  { iso: 'OM', country: 'Oman', dial: '+968' },
  { iso: 'KW', country: 'Kuwait', dial: '+965' },
  { iso: 'BH', country: 'Bahrain', dial: '+973' },
]

export const OTHER_DIAL_CODES: readonly DialCode[] = [
  { iso: 'BD', country: 'Bangladesh', dial: '+880' },
  { iso: 'EG', country: 'Egypt', dial: '+20' },
  { iso: 'JO', country: 'Jordan', dial: '+962' },
  { iso: 'LB', country: 'Lebanon', dial: '+961' },
  { iso: 'MY', country: 'Malaysia', dial: '+60' },
  { iso: 'NP', country: 'Nepal', dial: '+977' },
  { iso: 'NG', country: 'Nigeria', dial: '+234' },
  { iso: 'PK', country: 'Pakistan', dial: '+92' },
  { iso: 'PH', country: 'Philippines', dial: '+63' },
  { iso: 'LK', country: 'Sri Lanka', dial: '+94' },
  { iso: 'ZA', country: 'South Africa', dial: '+27' },
  { iso: 'TR', country: 'Turkey', dial: '+90' },
  { iso: 'GB', country: 'United Kingdom', dial: '+44' },
  { iso: 'US', country: 'United States', dial: '+1' },
  { iso: 'VN', country: 'Vietnam', dial: '+84' },
]

export const ALL_DIAL_CODES: readonly DialCode[] = [...PRIMARY_DIAL_CODES, ...OTHER_DIAL_CODES]

/** Longest dial code first, so +971 is matched before +97 would be. */
const CODES_BY_LENGTH = [...ALL_DIAL_CODES].sort((a, b) => b.dial.length - a.dial.length)

export interface SplitPhone {
  dial: string
  number: string
}

/**
 * Split a stored value into picker + number.
 *
 * A stored value that does not start with a known code is returned with an
 * empty `dial` and the whole string kept in `number` — never silently
 * reinterpreted. That matters for profiles saved before this UI existed: their
 * number stays exactly as the user typed it until they choose to edit it.
 */
export function splitPhone(stored: unknown): SplitPhone {
  if (typeof stored !== 'string') return { dial: '', number: '' }
  const v = stored.trim()
  if (v === '') return { dial: '', number: '' }
  if (v.startsWith('+')) {
    const match = CODES_BY_LENGTH.find((c) => v.startsWith(c.dial))
    if (match) {
      return { dial: match.dial, number: v.slice(match.dial.length).trim() }
    }
  }
  return { dial: '', number: v }
}

/**
 * Join picker + number back into the single stored string.
 *
 * Returns '' when there is no number, so an untouched pair never writes a bare
 * dial code (which would look like a phone number to the CV renderer and to
 * grounding validation).
 */
export function joinPhone(dial: string, number: string): string {
  const n = number.trim()
  if (n === '') return ''
  const d = dial.trim()
  return d === '' ? n : `${d} ${n}`
}
