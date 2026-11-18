import { dateBounds } from '@/lib/profileDatePrecision'
import { hasUnknownEmploymentEnd } from '@/lib/employmentStatus'
import type { CareerProfileFull } from '@/types/careerProfile'

/**
 * A SUMMARY THAT CAN NEVER BE EMPTY (founder report 2026-09-17).
 *
 * When the AI summary cannot be proven and the Career Profile has no summary of
 * its own, the CV used to ship with no summary at all. This writes one in code,
 * from profile facts only: the most recent job title and employer, the span of
 * the work history, and the skills in job-relevance order. No model call, and
 * nothing that is not already in the profile.
 *
 * Returns '' only when the profile has no roles and no skills.
 */
export function factSummary(
  profile: CareerProfileFull,
  skillsOrder: readonly string[] = [],
  /**
   * Job requirements the profile PROVES (evidence map: placeable in the summary),
   * most important first. Only pass these in job-description mode: estimated
   * title-mode requirements are never written.
   */
  provenTerms: readonly string[] = [],
): string {
  const roles = [...(profile.work_experience ?? [])]
    .filter((r) => (r.role ?? '').trim() !== '')
    .sort((a, b) => {
      const ae = a.end_date ?? (hasUnknownEmploymentEnd(a) ? a.start_date ?? '' : '9999-12-31')
      const be = b.end_date ?? (hasUnknownEmploymentEnd(b) ? b.start_date ?? '' : '9999-12-31')
      return be.localeCompare(ae) || (b.start_date ?? '').localeCompare(a.start_date ?? '')
    })
  const skillNames = (profile.skills ?? []).map((s) => (s.name ?? '').trim()).filter(Boolean)
  const ordered = [
    ...skillsOrder.filter((n) => skillNames.some((s) => s.toLowerCase() === n.toLowerCase())),
    ...skillNames,
  ].filter((n, i, all) => all.findIndex((x) => x.toLowerCase() === n.toLowerCase()) === i)

  const sentences: string[] = []
  const latest = roles[0]
  if (latest) {
    const years = experienceYears(roles)
    const lead = `${capitalise(latest.role.trim())}${years !== null && years >= 2 ? ` with ${years}+ years of experience` : ''}`
    const company = (latest.company ?? '').trim()
    sentences.push(
      company ? `${lead}${hasUnknownEmploymentEnd(latest) ? ', with a recorded role at' : latest.end_date ? ', most recently at' : ', currently at'} ${company}.` : `${lead}.`,
    )
    const earlier = roles
      .slice(1)
      .map((r) => (r.company ?? '').trim())
      .filter((c, i, all) => c && c !== company && all.indexOf(c) === i)
      .slice(0, 3)
    if (earlier.length > 0) sentences.push(`${roles.slice(1).some(hasUnknownEmploymentEnd) ? 'Additional recorded roles' : 'Previous roles'} at ${joinList(earlier)}.`)
  }
  const terms = provenTerms.filter((t, i, all) => t.trim() && all.findIndex((x) => x.toLowerCase() === t.toLowerCase()) === i).slice(0, 8)
  if (terms.length > 0) sentences.push(`Experience relevant to this role includes ${joinList(terms)}.`)
  const lowerTerms = new Set(terms.map((t) => t.toLowerCase()))
  const skills = ordered.filter((n) => !lowerTerms.has(n.toLowerCase()))
  if (skills.length > 0) sentences.push(`Skills include ${joinList(skills.slice(0, terms.length > 0 ? 5 : 8))}.`)
  return sentences.join(' ')
}

function experienceYears(roles: CareerProfileFull['work_experience']): number | null {
  if (roles.some(role => hasUnknownEmploymentEnd(role) || role.end_date && (!dateBounds(role.end_date,role.end_date_precision) || ['year',null].includes(dateBounds(role.end_date,role.end_date_precision)!.precision)))) return null
  const now = Date.now()
  let earliestMin = Infinity, earliestMax = Infinity
  for (const role of roles) {
    const bounds = dateBounds(role.start_date, role.start_date_precision)
    if (!bounds) return null
    // Keep the pre-existing span arithmetic for sufficiently precise facts.
    const min = Date.parse(bounds.min)
    const max = bounds.precision === 'day' || bounds.precision === 'month' ? min : Date.parse(bounds.max)
    earliestMin = Math.min(earliestMin, min); earliestMax = Math.min(earliestMax, max)
  }
  if (!Number.isFinite(earliestMin) || earliestMin > now) return null
  const minimum = Math.max(0, Math.floor((now - earliestMax) / (365.25 * 24 * 3600 * 1000)))
  const maximum = Math.floor((now - earliestMin) / (365.25 * 24 * 3600 * 1000))
  return minimum === maximum ? minimum : null
}

function capitalise(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1)
}

function joinList(items: readonly string[]): string {
  if (items.length <= 1) return items.join('')
  return `${items.slice(0, -1).join(', ')} and ${items[items.length - 1]}`
}
