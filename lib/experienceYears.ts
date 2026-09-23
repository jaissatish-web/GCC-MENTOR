import type { CareerProfileFull } from '@/types/careerProfile'

/**
 * Whole years of experience across the dated roles, overlaps counted once
 * (2026-09-18). Computed in code so no model does date arithmetic: a cover
 * letter once said "nearly 13 years" for a career that runs Aug 2011 – present.
 * Shared by the prose claim checks, the summary validator and the quality gate.
 */
export function totalExperienceYears(profile: Pick<CareerProfileFull, 'work_experience'>, now: Date = new Date()): number | null {
  const nowIndex = now.getFullYear() * 12 + now.getMonth()
  const monthIndex = (d: string | null | undefined): number | null => {
    if (!d || /present|current|now/i.test(d)) return nowIndex
    const m = /^(\d{4})(?:-(\d{1,2}))?/.exec(d.trim())
    return m ? Number(m[1]) * 12 + (m[2] ? Number(m[2]) - 1 : 0) : null
  }
  const spans: Array<[number, number]> = []
  for (const e of profile.work_experience ?? []) {
    if (!e.start_date) continue
    const s = monthIndex(e.start_date)
    const end = monthIndex(e.end_date)
    if (s === null || end === null || end < s) continue
    spans.push([s, end])
  }
  if (spans.length === 0) return null
  spans.sort((a, b) => a[0] - b[0])
  let months = 0
  let [cs, ce] = spans[0]
  for (const [s, e] of spans.slice(1)) {
    if (s <= ce + 1) ce = Math.max(ce, e)
    else {
      months += ce - cs + 1
      ;[cs, ce] = [s, e]
    }
  }
  months += ce - cs + 1
  return Math.floor(months / 12)
}

/** Merged whole-month count of a set of [startMonth, endMonth] spans, overlaps counted once. */
function mergedMonths(spans: Array<[number, number]>): number {
  if (spans.length === 0) return 0
  const sorted = [...spans].sort((a, b) => a[0] - b[0])
  let months = 0
  let [cs, ce] = sorted[0]
  for (const [s, e] of sorted.slice(1)) {
    if (s <= ce + 1) ce = Math.max(ce, e)
    else {
      months += ce - cs + 1
      ;[cs, ce] = [s, e]
    }
  }
  return months + (ce - cs + 1)
}

export interface GccExperience {
  /** Whole years in GCC-based roles, overlaps counted once. 0 when none. */
  years: number
  /** Countries, in the order they first appear in the work history. */
  countries: string[]
  /** How many roles were GCC-based. */
  roles: number
}

/**
 * Years and countries of the roles that were based in the GCC (2026-09-23).
 *
 * A role counts when its own `gcc_country` is set, or when its written location
 * names a GCC country or city (lib/jobMatch/gccLocation.ts — the same reader Job
 * Match uses). Nothing is inferred from an employer's name. `countryLabel` turns
 * the stored value into what the user reads.
 */
export function gccExperience(
  work: ReadonlyArray<{ start_date?: string | null; end_date?: string | null; location?: string | null; gcc_country?: string | null }>,
  resolve: (location: string | null | undefined) => string | null,
  now: Date = new Date(),
): GccExperience {
  const nowIndex = now.getFullYear() * 12 + now.getMonth()
  const monthIndex = (d: string | null | undefined): number | null => {
    if (!d || /present|current|now/i.test(d)) return nowIndex
    const m = /^(\d{4})(?:-(\d{1,2}))?/.exec(d.trim())
    return m ? Number(m[1]) * 12 + (m[2] ? Number(m[2]) - 1 : 0) : null
  }
  const spans: Array<[number, number]> = []
  const countries: string[] = []
  let roles = 0
  for (const w of work) {
    const country = (w.gcc_country && w.gcc_country.trim()) || resolve(w.location ?? null)
    if (!country) continue
    roles++
    if (!countries.includes(country)) countries.push(country)
    if (!w.start_date) continue
    const s = monthIndex(w.start_date)
    const e = monthIndex(w.end_date)
    if (s === null || e === null || e < s) continue
    spans.push([s, e])
  }
  return { years: Math.floor(mergedMonths(spans) / 12), countries, roles }
}
