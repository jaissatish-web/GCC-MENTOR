import { parseCvDate } from './dates'

/**
 * The facts plain code reads better than a model (2026-10-01).
 *
 * Email, phone, LinkedIn, date of birth and passport type follow fixed shapes,
 * so a pattern finds them instantly and exactly — and gives a second opinion
 * the model's answer is checked against. Nothing here guesses: a value is only
 * returned when the pattern is unambiguous.
 */

export interface Prepass {
  emails: string[]
  phones: string[]
  linkedin: string | null
  dateOfBirth: string | null
  passportType: 'ECR' | 'Non-ECR' | null
  /** "Label: value" personal details, as written. */
  nationality: string | null
  visaStatus: string | null
  noticePeriod: string | null
  location: string | null
}

const EMAIL = /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g
const LINKEDIN = /(?:https?:\/\/)?(?:[a-z]{2,3}\.)?linkedin\.com\/in\/[A-Za-z0-9\-_%]+\/?/i

/**
 * Phone numbers: 8–15 digits, optionally with +, spaces, dashes, dots or
 * brackets. Date ranges ("2019 - 2021"), years and ID-like runs are excluded by
 * requiring either a leading + / 0 or a contact label on the same line.
 */
function findPhones(text: string): string[] {
  const out: string[] = []
  for (const line of text.split('\n')) {
    const labelled = /(mob|mobile|phone|tel|cell|contact|whats\s*app|☎|📱|📞|✆)/i.test(line)
    for (const m of line.matchAll(/(\+?\(?\d[\d\s().\-]{6,18}\d)/g)) {
      const raw = m[1].trim()
      const digits = raw.replace(/\D/g, '')
      if (digits.length < 8 || digits.length > 15) continue
      if (/^(19|20)\d{2}\s*[-–]\s*(19|20)\d{2}$/.test(raw)) continue
      if (!labelled && !raw.startsWith('+') && !raw.startsWith('0') && !raw.startsWith('(')) continue
      if (!out.some((p) => p.replace(/\D/g, '') === digits)) out.push(raw.replace(/\s+/g, ' '))
    }
  }
  return out
}

function findDob(text: string): string | null {
  const m = text.match(/(?:date\s*of\s*birth|d\.?\s*o\.?\s*b\.?|birth\s*date|born(?:\s*on)?)\s*[:\-|]?\s*([^\n|;]{6,24})/i)
  if (!m) return null
  // Trim trailing words after the date ("14/06/1988 Nationality ...").
  const candidate = m[1].trim().split(/\s{2,}|\s\|\s/)[0]
  for (const len of [candidate.length, ...[18, 14, 12, 11, 10].filter((n) => n < candidate.length)]) {
    const d = parseCvDate(candidate.slice(0, len).trim())
    if (d.kind === 'date' && /^\d{4}-\d{2}-\d{2}$/.test(d.value)) return d.value
  }
  return null
}

/**
 * A labelled value: "Nationality: Indian", "Nationality | Indian", "Notice
 * Period - 30 days", or Europass's run-on "… | Nationality Sri Lankan". The
 * value stops at the next cell, semicolon or line end. With thinking off the
 * model sometimes skips a Personal Details block at the END of a CV; these are
 * the fields that live there, and they are almost always labelled.
 */
function labelled(text: string, label: string, requireSeparator = false): string | null {
  const sep = requireSeparator ? String.raw`\s*[:|\-–]\s*` : String.raw`\s*[:|\-–]?\s*`
  const re = new RegExp(String.raw`(?:^|[\n|;•])\s*(?:${label})${sep}([^\n|;]{2,60})`, 'i')
  const m = text.match(re)
  if (!m) return null
  const v = m[1].split(/\s{2,}|\s+\|\s+/)[0].trim().replace(/[.,]$/, '')
  return v.length >= 2 ? v : null
}

export function prepass(text: string): Prepass {
  const emails = [...new Set((text.match(EMAIL) ?? []).map((e) => e.replace(/[.,;]+$/, '')))]
  const li = text.match(LINKEDIN)?.[0] ?? null
  const passportType = /\bnon[\s-]*e\.?c\.?r\b/i.test(text) ? 'Non-ECR' : /\bE\.?C\.?R\b/.test(text) && /passport/i.test(text) ? 'ECR' : null
  return {
    emails, phones: findPhones(text), linkedin: li, dateOfBirth: findDob(text), passportType,
    nationality: labelled(text, 'nationality|citizenship'),
    // A bare "Visa" label needs a separator, or "Visa Golden…" prose would match.
    visaStatus: labelled(text, String.raw`visa\s*status|visa\s*type|current\s*visa`) ?? labelled(text, 'visa', true),
    noticePeriod: labelled(text, String.raw`notice\s*period|notice|availability\s*to\s*join|availability`),
    location: labelled(text, String.raw`current\s*location|location|address|based\s*in`, true),
  }
}
