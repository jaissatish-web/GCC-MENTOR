import type { CategoryMetadata } from '@/lib/profileCategories'

/** A dedicated header fact, persisted in the existing extensible profile rows.
 * No migration or target-role overwrite is required. Never render as a section.
 */
export const HEADLINE_CATEGORY = 'Resume headline'
export const HEADLINE_LABEL = 'Professional headline'
type HeadlineRow = { label: string; value: string } & CategoryMetadata

export function isHeadlineEntry(row: { label?: unknown; category_name?: unknown }): boolean {
  return row.category_name === HEADLINE_CATEGORY && row.label === HEADLINE_LABEL
}

export function profileHeadline<T extends { label?: string; value?: string } & CategoryMetadata>(rows: readonly T[] = []): T | undefined {
  return rows.find(isHeadlineEntry)
}

export function setProfileHeadline<T extends HeadlineRow>(rows: T[], value: string, shown: boolean, makeId: () => string): T[] {
  const existing = profileHeadline(rows)
  const header = {
    ...existing,
    label: HEADLINE_LABEL,
    value,
    category_id: existing?.category_id || makeId(),
    category_name: HEADLINE_CATEGORY,
    category_order: existing?.category_order ?? rows.length,
    category_position: 'end' as const,
    show_on_resume: shown,
    level: '',
  } as T
  return [...rows.filter(row => !isHeadlineEntry(row)), header]
}

/** The source headline is not a promise that the candidate holds a target role. */
export function resolveProfileHeadline(profile: { additional_information?: HeadlineRow[]; target_job_title?: string | null }): string {
  const own = profileHeadline(profile.additional_information)
  // An explicit blank or hidden choice stays blank; no guessed replacement.
  if (own) return own.show_on_resume === false ? '' : own.value.trim()
  return profile.target_job_title?.trim() || '' // legacy profiles keep their existing title
}
