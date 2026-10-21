import { ESSENTIAL_POINTS } from '@/lib/gulfReadiness/config'
import { normalise } from '@/lib/gulfReadiness/evidence'
import type { GulfFacts } from '@/lib/gulfReadiness/types'

/**
 * Gulf CV Essentials — the 20 points (Gulf Readiness v2, 2026-10-01).
 *
 * What a Gulf recruiter checks in the first seconds, beyond the CV's content:
 * a professional photo, how soon you can join, your visa (or passport) position,
 * a WhatsApp number, Arabic, a driving licence, and that nationality and location
 * are stated. Structured facts win when the engine has them (a Career Profile);
 * the CV text is the fallback (the anonymous scan).
 *
 * FAIRNESS RULE. Nationality and location earn points only for being STATED.
 * Which nationality, age, gender, marital status or religion is never scored.
 */

export type EssentialKey = keyof typeof ESSENTIAL_POINTS

export interface EssentialItem {
  key: EssentialKey
  earned: number
  max: number
  /** False when we cannot tell (a photo on pasted text): left out of the score. */
  applicable: boolean
  /** What to do to earn the rest, when something is left. */
  gap?: { title: string; why: string }
}

/** Days of notice from what the person wrote; null when nothing readable. */
export function noticeDays(raw: string | null | undefined): number | null {
  if (!raw) return null
  const s = raw.toLowerCase()
  if (/\b(immediate|immediately|available now|no notice|nil)\b/.test(s)) return 0
  const words: Record<string, number> = { one: 1, two: 2, three: 3, four: 4, six: 6, a: 1 }
  const m = s.match(/(\d+|one|two|three|four|six|a)\s*(day|week|month)/)
  if (!m) return null
  const n = /^\d+$/.test(m[1]) ? Number(m[1]) : words[m[1]]
  return m[2] === 'day' ? n : m[2] === 'week' ? n * 7 : n * 30
}

const GCC_LICENCE = /\b(gcc|uae|emirates|saudi|ksa|qatar|qatari|kuwait|oman|omani|bahrain|dubai|abu dhabi|sharjah)\b/i

export function detectGulfEssentials(raw: string, facts: GulfFacts, inGulf: boolean): EssentialItem[] {
  const text = normalise(raw)
  const P = ESSENTIAL_POINTS
  const items: EssentialItem[] = []

  // Optional presentation and role-specific extras do not lower a universal score.
  items.push({ key: 'photo', earned: 0, max: P.photo, applicable: false })

  // Notice period — sooner is better.
  const noticeRaw =
    facts.noticePeriod?.trim() ||
    text.match(/notice period[^\n]{0,30}|available immediately|immediate(?:ly)? (?:available|joining|joiner)|can join[^\n]{0,20}/)?.[0] ||
    null
  const days = noticeDays(noticeRaw)
  const noticeEarned = noticeRaw ? P.notice : 0
  items.push({
    key: 'notice',
    earned: noticeEarned,
    max: P.notice,
    applicable: true,
    gap: !noticeRaw
      ? { title: 'State your notice period', why: 'State your actual availability so an employer can plan. A longer notice period does not lower your score.' }
      : noticeEarned < P.notice
        ? { title: 'Shorten or negotiate your notice period', why: `A ${days ? `${days}-day` : 'long'} notice period loses ground to candidates who can join within 30 days — say if you can negotiate or buy it out.` }
        : undefined,
  })

  // Visa (in the Gulf) or passport (outside it).
  if (inGulf) {
    const visa = (facts.visaStatus?.trim() || text.match(/\b(visa|iqama)[^\n]{0,40}/)?.[0] || '').toLowerCase()
    const strong =
      facts.visaTransferable === true ||
      /transferable|residen|golden|iqama|employment visa|work visa|green visa|family|husband|spouse|cancel/.test(visa)
    const earned = visa ? P.visa_or_passport : 0
    items.push({
      key: 'visa_or_passport',
      earned,
      max: P.visa_or_passport,
      applicable: true,
      gap: !visa
        ? { title: 'State your visa status', why: 'State your current status so the employer can check the appropriate hiring route. A visa label alone does not confirm work permission.' }
        : earned < P.visa_or_passport
          ? { title: 'Explain your visa position', why: 'On a visit visa the employer must sponsor a new work visa — say you are ready to convert and can join quickly.' }
          : undefined,
    })
  } else {
    const hasPassport = !!facts.passportValidityDate || !!facts.passportType || /\bpassport\b/.test(text)
    items.push({
      key: 'visa_or_passport',
      earned: hasPassport ? P.visa_or_passport : 0,
      max: P.visa_or_passport,
      applicable: true,
      gap: hasPassport
        ? undefined
        : { title: 'Add your passport details', why: 'Recruiters hiring from abroad check you hold a valid passport — its type and expiry, never the number.' },
    })
  }

  // WhatsApp — how Gulf recruiters actually reach candidates.
  const hasWhatsApp = !!facts.whatsapp?.trim() || /whats\s?app|[\w.+-]+@[\w.-]+\.[a-z]{2,}|\+\d[\d ()-]{7,}/.test(text)
  items.push({
    key: 'whatsapp',
    earned: hasWhatsApp ? P.whatsapp : 0,
    max: P.whatsapp,
    applicable: true,
    gap: hasWhatsApp ? undefined : { title: 'Confirm a way to contact you', why: 'Provide a valid email address or a phone number with country code. WhatsApp is optional.' },
  })

  // Arabic.
  const level = facts.arabicLevel
  const arabicEarned = level
    ? ({ native: 2, fluent: 2, conversational: 1.5, basic: 1, none: 0 } as const)[level]
    : // A bare mention scores as "basic": answering the question must never
      // LOWER a score (found 2026-10-01 — mention 1.5 vs "basic" 1).
      /\barabic\b/.test(text)
      ? 1
      : 0
  items.push({
    key: 'arabic',
    earned: arabicEarned,
    max: P.arabic,
    applicable: false,
    gap:
      arabicEarned >= P.arabic
        ? undefined
        : level === 'none'
          ? { title: 'Pick up basic Arabic', why: 'Even basic Arabic helps in Gulf interviews and customer-facing roles. Update your level once you have it.' }
          : arabicEarned === 0
            ? { title: 'Add your Arabic level', why: 'Arabic is a plus for many Gulf roles — say your level, even if it is basic.' }
            : undefined,
  })

  // Driving licence.
  const licenceText = text.match(/driving licen[cs]e[^\n]{0,40}/)?.[0] ?? ''
  const gccLicence = (facts.hasDrivingLicence === true && GCC_LICENCE.test(facts.drivingLicenceCountry ?? '')) || GCC_LICENCE.test(licenceText)
  const anyLicence = facts.hasDrivingLicence === true || !!licenceText
  const licenceEarned = gccLicence ? P.driving_licence : anyLicence ? 1 : 0
  items.push({
    key: 'driving_licence',
    earned: licenceEarned,
    max: P.driving_licence,
    applicable: false,
    gap:
      licenceEarned === P.driving_licence || facts.hasDrivingLicence === false
        ? undefined
        : anyLicence
          ? { title: 'Mention a Gulf driving licence if you have one', why: 'A UAE or other GCC licence is valued for field, sales and supervisory roles — a home licence counts for less.' }
          : { title: 'Add your driving licence', why: 'Many Gulf roles ask for a driving licence outright — say if you have one, GCC or home country.' },
  })

  // Nationality and location — stated, never judged.
  const nat = /\bnationality\b/.test(text)
  const loc = /\b(location|based in|currently (in|at|based)|address)\b/.test(text)
  const nlEarned = loc ? P.nationality_location : 0
  items.push({
    key: 'nationality_location',
    earned: nlEarned,
    max: P.nationality_location,
    applicable: true,
    gap:
      nlEarned === P.nationality_location
        ? undefined
        : { title: 'Confirm your current location', why: 'Your location helps plan interviews and relocation. Nationality is not scored.' },
  })
  return items
}

/** The dimension ratio: earned over what we could judge. */
export function essentialsRatio(items: EssentialItem[]): number {
  const judged = items.filter((i) => i.applicable)
  const max = judged.reduce((n, i) => n + i.max, 0)
  return max ? judged.reduce((n, i) => n + i.earned, 0) / max : 0
}
