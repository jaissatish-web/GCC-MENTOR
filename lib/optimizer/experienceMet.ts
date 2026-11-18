import type { CareerProfileFull } from '@/types/careerProfile'
import { workDurationAssessment } from '@/lib/experienceYears'
import { gccCountryFromLocation } from '@/lib/jobMatch/gccLocation'
import { entrySourceText } from './evidence'
import { containsTermRaw, coversContentStems } from './text'

// The words of an experience requirement that are not WHAT experience it asks for.
const EXPERIENCE_FILLER =
  /\b(\d+\s*\+?|minimum|min|at least|over|more than|plus|years?|yrs?|of|in|within|experience|experienced|relevant|proven|post|qualification|work|working|hands|on|similar|role|roles|field|the|a|an|and|or|with)\b/gi

/**
 * Is an experience requirement met? (2026-10-03, live audit.) The analysis
 * used to compare only TOTAL years with the number in the term, so a term with
 * no number — "ICU experience", "Gulf experience" — was always "missing", for an
 * ICU nurse working in Bahrain too. That wrong gap reached the job check, the
 * CV writer, the cover letter, Q&A and the mock interview's "not in your CV".
 *
 * Now the kind of experience is read from the term ("ICU", "Gulf", "UAE",
 * "hospital"), the roles that show it are found — Gulf and country terms by the
 * role's own location, others by the role's own words or employer — and only
 * THOSE roles' years are counted. No kind named ("5+ years") = the whole career.
 */
export function experienceRequirementMet(
  profile: Pick<CareerProfileFull, 'work_experience'>,
  term: string,
  now: Date = new Date(),
): { ok: boolean | null; status: 'met' | 'unmet' | 'unknown'; years: number | null; need: number | null; core: string; minimumYears: number | null; maximumYears: number | null } {
  const n = Number(term.match(/\d+/)?.[0] ?? NaN)
  const need = Number.isFinite(n) ? n : null
  const core = term.replace(EXPERIENCE_FILLER, ' ').replace(/[^\p{L}\p{N}&/ -]/gu, ' ').replace(/\s+/g, ' ').trim()
  const jobs = profile.work_experience ?? []
  let matching = jobs
  if (core) {
    const country = gccCountryFromLocation(core)?.country ?? null
    if (country || /\b(gulf|gcc|middle east|mena|arabian)\b/i.test(core)) {
      matching = jobs.filter((j) => {
        const c = j.gcc_country?.trim() || gccCountryFromLocation(j.location)?.country
        return Boolean(c) && (!country || country === 'generic_gulf' || c === country)
      })
    } else {
      matching = jobs.filter((j) => {
        const text = `${entrySourceText(j)}\n${j.company}`
        return containsTermRaw(text, core) || coversContentStems(core, text)
      })
    }
  }
  const duration = workDurationAssessment(matching, now)
  const status = matching.length === 0 ? 'unmet' : need === null ? 'met'
    : duration.minimumYears !== null && duration.minimumYears >= need ? 'met'
    : duration.maximumYears !== null && duration.maximumYears < need ? 'unmet' : 'unknown'
  return { ok: status === 'unknown' ? null : status === 'met', status, years: matching.length ? duration.years : 0, need, core, minimumYears: duration.minimumYears, maximumYears: duration.maximumYears }
}
