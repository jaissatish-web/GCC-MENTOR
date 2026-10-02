/**
 * Newest first — the order every CV is built in (founder, 2026-10-02):
 * "latest on the top… and after that date wise it will go".
 *
 * Applied when a CV is BUILT (buildResumeDocument). The user can still move
 * any entry up or down in the CV editor; that order is saved with the CV and
 * never re-sorted. The Career Profile itself keeps the user's own order.
 *
 * Entries without a date go to the end, in the user's own order (sort_order),
 * and equal dates keep the user's order too — a sort never shuffles ties.
 */
import type { ProfileCertification, ProfileEducation, ProfileWorkExperience } from '@/types/careerProfile'

/** "2024-08-01" / "2024-08" / "2024" → a comparable "YYYY-MM-DD", or null. */
function day(d: string | null | undefined): string | null {
  const m = /^(\d{4})(?:-(\d{1,2}))?(?:-(\d{1,2}))?/.exec((d ?? '').trim())
  if (!m) return null
  return `${m[1]}-${(m[2] ?? '01').padStart(2, '0')}-${(m[3] ?? '01').padStart(2, '0')}`
}

/** Descending by key; missing keys last; ties by sort_order. */
function newestFirst<T extends { sort_order: number }>(items: readonly T[], key: (x: T) => string | null): T[] {
  return items.slice().sort((a, b) => {
    const ka = key(a)
    const kb = key(b)
    if (ka && kb && ka !== kb) return ka < kb ? 1 : -1
    if (ka && !kb) return -1
    if (!ka && kb) return 1
    return a.sort_order - b.sort_order
  })
}

/** Current roles first (latest start first), then by end date, then start date. */
export function sortExperienceNewestFirst<T extends Pick<ProfileWorkExperience, 'start_date' | 'end_date' | 'sort_order'>>(items: readonly T[]): T[] {
  // A current role ends "today": '9999' sorts above every real end date.
  return newestFirst(items, (e) => {
    const start = day(e.start_date)
    const end = day(e.end_date)
    if (!start && !end) return null // no dates at all: end of the list, user's order
    return `${end ?? (e.end_date ? '0000-00-00' : '9999-12-31')}|${start ?? '0000-00-00'}`
  })
}

/** Latest issue date first. */
export function sortCertificationsNewestFirst<T extends Pick<ProfileCertification, 'issue_date' | 'sort_order'>>(items: readonly T[]): T[] {
  return newestFirst(items, (c) => day(c.issue_date))
}

/** Latest completion year first (start year when there is no end year). */
export function sortEducationNewestFirst<T extends Pick<ProfileEducation, 'start_year' | 'end_year' | 'sort_order'>>(items: readonly T[]): T[] {
  return newestFirst(items, (e) => {
    const y = e.end_year ?? e.start_year
    // Same year: the one that started later is the later study.
    return y ? `${String(y).padStart(4, '0')}|${String(e.start_year ?? 0).padStart(4, '0')}` : null
  })
}
