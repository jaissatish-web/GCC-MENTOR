import { hasUnknownEmploymentEnd } from '@/lib/employmentStatus'
import { dateBounds, type DatePrecision } from '@/lib/profileDatePrecision'
import type { CareerProfileFull } from '@/types/careerProfile'

export interface WorkForDuration {
  start_date?: string | null
  end_date?: string | null
  start_date_precision?: DatePrecision | null
  end_date_precision?: DatePrecision | null
  end_date_unconfirmed?: boolean
}

export interface DurationAssessment {
  status: 'known' | 'bounded' | 'unknown'
  minimumYears: number | null
  maximumYears: number | null
  /** A definitive whole-year count only when both conservative bounds agree. */
  years: number | null
}

/** Existing inclusive whole-month arithmetic, with overlaps counted once. */
function mergedMonths(spans: Array<[number, number]>): number {
  if (spans.length === 0) return 0
  const sorted = [...spans].sort((a, b) => a[0] - b[0])
  let months = 0
  let [cs, ce] = sorted[0]
  for (const [s, e] of sorted.slice(1)) {
    if (s <= ce + 1) ce = Math.max(ce, e)
    else { months += ce - cs + 1; [cs, ce] = [s, e] }
  }
  return months + (ce - cs + 1)
}

const monthIndex = (date: string) => Number(date.slice(0, 4)) * 12 + Number(date.slice(5, 7)) - 1

/**
 * Union guaranteed covered months for a lower bound and possibly covered months for an upper bound.
 * Bounds are evaluated with the same inclusive-month formula used for confirmed dates; no midpoint is used.
 * A missing boundary leaves the total unknown, even if some other roles have confirmed dates.
 */
export function workDurationAssessment(work: ReadonlyArray<WorkForDuration>, now: Date = new Date()): DurationAssessment {
  const today = `${String(now.getFullYear()).padStart(4, '0')}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
  const lower: Array<[number, number]> = [], upper: Array<[number, number]> = []
  let bounded = false, unknown = false
  for (const role of work) {
    const start = dateBounds(role.start_date, role.start_date_precision)
    const end = hasUnknownEmploymentEnd(role) || !role.end_date && role.end_date_precision != null ? null : role.end_date ? dateBounds(role.end_date, role.end_date_precision) : dateBounds(today, 'day')
    if (!start || !end || start.min > end.max) { unknown = true; continue }
    bounded ||= start.precision === null || start.precision === 'year' || end.precision === null || end.precision === 'year'
    const minStart = monthIndex(start.min), maxStart = monthIndex(start.max), minEnd = monthIndex(end.min), maxEnd = monthIndex(end.max)
    upper.push([minStart, maxEnd])
    if (maxStart <= minEnd) lower.push([maxStart, minEnd])
  }
  const minimumYears = Math.floor(mergedMonths(lower) / 12)
  if (unknown) return { status: 'unknown', minimumYears, maximumYears: null, years: null }
  const maximumYears = Math.floor(mergedMonths(upper) / 12)
  return { status: bounded ? 'bounded' : 'known', minimumYears, maximumYears, years: minimumYears === maximumYears ? minimumYears : null }
}

/** Whole years are stated only when the conservative bounds establish that count. */
export function totalExperienceYears(profile: Pick<CareerProfileFull, 'work_experience'>, now: Date = new Date()): number | null {
  return profile.work_experience?.length ? workDurationAssessment(profile.work_experience, now).years : null
}

export interface GccExperience {
  durationUnconfirmed?: boolean
  /** Null means the duration is not established, never zero years. */
  years: number | null
  countries: string[]
  roles: number
  duration: DurationAssessment
}

/** GCC identity comes only from an explicit country or the role's stated location. */
export function gccExperience(
  work: ReadonlyArray<WorkForDuration & { location?: string | null; gcc_country?: string | null }>,
  resolve: (location: string | null | undefined) => string | null,
  now: Date = new Date(),
): GccExperience {
  const countries: string[] = []
  const gccWork = work.filter(w => {
    const country = w.gcc_country?.trim() || resolve(w.location ?? null)
    if (!country) return false
    if (!countries.includes(country)) countries.push(country)
    return true
  })
  const duration = workDurationAssessment(gccWork, now)
  const durationUnconfirmed = duration.status !== 'known'
  return { years: duration.years, countries, roles: gccWork.length, duration, ...(durationUnconfirmed ? { durationUnconfirmed: true } : {}) }
}
