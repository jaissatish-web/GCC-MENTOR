/**
 * Employment gap detection (docs/GCC_READINESS_JOB_MATCH.md §5 "Career" /
 * §7 "employment gaps" among things checkable even without a JD).
 *
 * DELIBERATELY INFORMATIONAL ONLY, NOT SCORED. The founder's own spec §38
 * asks for "exact employment-gap rules" to be supplied separately and says
 * not to let scoring get invented — this file computes real gaps from real
 * dates (pure math, nothing to guess), but does NOT decide how much a gap
 * should cost, whether short gaps matter, or how it should factor into
 * GCC Readiness. That wiring is a follow-up once the founder supplies the
 * actual rule. Until then this is display-only: "here are your gaps," not
 * "here is how many points they cost you."
 *
 * Pure function — no database access, no side effects, same standard as
 * lib/readiness.ts and lib/reuseDetection.ts.
 */

export interface EmploymentGap {
  /** ISO date — the day after the prior covered period ends. */
  gapStartDate: string
  /** ISO date — the day before the next covered period starts. */
  gapEndDate: string
  /** Whole months, rounded down. */
  gapMonths: number
  /** The employer whose end date borders the start of this gap, if any. */
  precedingCompany: string | null
  /** The employer whose start date borders the end of this gap, if any. */
  followingCompany: string | null
}

export interface WorkExperienceForGapCheck {
  start_date: string
  end_date: string | null
  company: string
}

/** Interim default. Not a scoring weight — see the file header. */
export const DEFAULT_MIN_GAP_MONTHS = 3

const MS_PER_DAY = 1000 * 60 * 60 * 24
const AVG_DAYS_PER_MONTH = 30.44

interface WorkInterval {
  start: Date
  end: Date // "today" for an ongoing role (end_date === null)
  company: string
}

function toIsoDate(d: Date): string {
  return d.toISOString().slice(0, 10)
}

/**
 * Detects true calendar gaps in a candidate's work history. Concurrent or
 * back-to-back roles are merged first so overlapping employment (e.g. two
 * part-time roles at once) never registers as a false gap — this is why the
 * whole history is processed together rather than checked pair-by-pair in
 * whatever order the profile happens to store entries.
 */
export function detectEmploymentGaps(
  workExperience: WorkExperienceForGapCheck[],
  minGapMonths: number = DEFAULT_MIN_GAP_MONTHS,
): EmploymentGap[] {
  const intervals: WorkInterval[] = workExperience
    .map((e): WorkInterval | null => {
      const start = new Date(e.start_date)
      const end = e.end_date ? new Date(e.end_date) : new Date()
      if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return null
      return { start, end, company: e.company }
    })
    .filter((iv): iv is WorkInterval => iv !== null)
    .sort((a, b) => a.start.getTime() - b.start.getTime())

  if (intervals.length < 2) return []

  // Merge overlapping/adjacent intervals into continuous covered spans.
  const merged: WorkInterval[] = []
  for (const iv of intervals) {
    const last = merged[merged.length - 1]
    if (last && iv.start.getTime() <= last.end.getTime()) {
      if (iv.end.getTime() > last.end.getTime()) {
        last.end = iv.end
        last.company = iv.company // whichever role actually extends the span furthest
      }
    } else {
      merged.push({ ...iv })
    }
  }

  const gaps: EmploymentGap[] = []
  for (let i = 1; i < merged.length; i++) {
    const prev = merged[i - 1]
    const curr = merged[i]
    const gapDays = (curr.start.getTime() - prev.end.getTime()) / MS_PER_DAY
    const gapMonths = Math.floor(gapDays / AVG_DAYS_PER_MONTH)
    if (gapMonths < minGapMonths) continue

    const gapStart = new Date(prev.end)
    gapStart.setDate(gapStart.getDate() + 1)
    const gapEnd = new Date(curr.start)
    gapEnd.setDate(gapEnd.getDate() - 1)

    gaps.push({
      gapStartDate: toIsoDate(gapStart),
      gapEndDate: toIsoDate(gapEnd),
      gapMonths,
      precedingCompany: prev.company,
      followingCompany: curr.company,
    })
  }
  return gaps
}
