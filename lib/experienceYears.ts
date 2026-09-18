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
