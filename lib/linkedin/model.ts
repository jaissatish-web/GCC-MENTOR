import type {
  CareerProfileDraft,
  CareerProfileFull,
} from '@/types/careerProfile'
import {
  FIELD_LIMITS,
  type LinkedInConflict,
  type LinkedInImport,
  type LinkedInOutput,
  type LinkedInSetup,
} from './types'

export const normalize = (value: string) =>
  value
    .normalize('NFKC')
    .toLocaleLowerCase()
    .replace(/[^\p{L}\p{N}]/gu, '')
const clean = (value: unknown) =>
  typeof value === 'string' ? value.trim() : ''
const record = (value: unknown): value is Record<string, unknown> =>
  !!value && typeof value === 'object' && !Array.isArray(value)

export function parseSetup(
  value: unknown,
  profile: CareerProfileFull,
): LinkedInSetup | null {
  if (!record(value)) return null
  const source = value.source
  const mode = value.mode
  const goal = value.goal
  const language = value.language
  const tone = value.tone
  if (
    !['career', 'paste', 'upload'].includes(String(source)) ||
    !['existing', 'new'].includes(String(mode)) ||
    !['job', 'promotion', 'change', 'presence'].includes(String(goal)) ||
    !['English', 'Arabic'].includes(String(language)) ||
    !['professional', 'approachable', 'technical'].includes(String(tone))
  )
    return null
  const limits = {
    targetRoles: 240,
    industries: 240,
    countries: 240,
    jobDescriptions: 12000,
    instructions: 1500,
  }
  for (const [key, limit] of Object.entries(limits))
    if (typeof value[key] !== 'string' || (value[key] as string).length > limit)
      return null
  if (!clean(value.targetRoles)) return null
  const ids = value.experienceIds
  if (
    !Array.isArray(ids) ||
    ids.length > 12 ||
    new Set(ids).size !== ids.length ||
    ids.some(
      (id) =>
        typeof id !== 'string' ||
        !profile.work_experience.some((entry) => entry.id === id),
    )
  )
    return null
  if (
    !Array.isArray(value.omitTerms) ||
    value.omitTerms.length > 20 ||
    value.omitTerms.some((term) => typeof term !== 'string' || term.length > 80)
  )
    return null
  return {
    source,
    mode,
    goal,
    language,
    tone,
    targetRoles: clean(value.targetRoles),
    industries: clean(value.industries),
    countries: clean(value.countries),
    jobDescriptions: clean(value.jobDescriptions),
    instructions: clean(value.instructions),
    experienceIds: ids,
    omitTerms: value.omitTerms.map(clean).filter(Boolean),
  } as LinkedInSetup
}

/** Exact privacy terms are removed before AI calls AND from rendered fixed fields. */
export function publicText(
  text: string | null | undefined,
  terms: string[],
): string {
  let value = text ?? ''
  for (const term of terms) {
    if (!term.trim()) continue
    const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    value = value.replace(new RegExp(escaped, 'giu'), '[private]')
  }
  return value
}

export function candidateFacts(
  profile: CareerProfileFull,
  setup: LinkedInSetup,
) {
  const mask = (text: string | null | undefined) =>
    publicText(
      text,
      [...setup.omitTerms, profile.phone, profile.email].filter(Boolean),
    ).replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, '[private]')
  return {
    fullName: mask(profile.full_name),
    summary: mask(profile.professional_summary),
    experience: profile.work_experience
      .filter((entry) => setup.experienceIds.includes(entry.id))
      .map((entry) => ({
        id: entry.id,
        role: mask(entry.role),
        company: mask(entry.company),
        start: entry.start_date,
        end: entry.end_date,
        location: mask(entry.location),
        description: mask(entry.description),
        highlights: (entry.highlights ?? []).map(mask),
      })),
    skills: profile.skills.map((entry) => mask(entry.name)),
    education: profile.education.map((entry) => ({
      degree: mask(entry.degree),
      institution: mask(entry.institution),
      subject: mask(entry.field_of_study),
    })),
    certifications: profile.certifications.map((entry) => ({
      qualification: mask(entry.name),
      issuer: mask(entry.issuer),
    })),
  }
}

/** Import is comparison material, never an automatic update to saved career facts. */
export function summarizeImport(
  draft: CareerProfileDraft,
  id: string,
  warnings: string[],
): LinkedInImport {
  return {
    id,
    fullName: clean(draft.full_name),
    summary: clean(draft.professional_summary),
    warnings,
    experience: draft.work_experience.map((entry) => ({
      company: clean(entry.company),
      role: clean(entry.role),
      start: entry.start_date ?? null,
      end: entry.end_date ?? null,
      description: clean(entry.description),
    })),
  }
}
const date = (value: string | null) => value?.slice(0, 7) ?? 'Present'
export function importConflicts(
  profile: CareerProfileFull,
  imported: LinkedInImport | null,
): LinkedInConflict[] {
  if (!imported) return []
  const conflicts: LinkedInConflict[] = []
  if (
    imported.fullName &&
    normalize(imported.fullName) !== normalize(profile.full_name ?? '')
  ) {
    conflicts.push({
      id: 'identity',
      label: 'Profile name — confirm this is your own profile',
      profileValue: profile.full_name ?? '',
      importedValue: imported.fullName,
    })
  }
  imported.experience.forEach((entry, index) => {
    const company = profile.work_experience.filter(
      (saved) => normalize(saved.company) === normalize(entry.company),
    )
    const exact = company.find(
      (saved) => normalize(saved.role) === normalize(entry.role),
    )
    const saved = exact ?? (company.length === 1 ? company[0] : null)
    if (!saved) {
      conflicts.push({
        id: `import-${index}-unmatched`,
        label: 'Role not matched to Career Profile',
        profileValue: 'No matching saved role',
        importedValue: `${entry.role} · ${entry.company}`,
      })
      return
    }
    if (!exact)
      conflicts.push({
        id: `import-${index}-role`,
        label: 'Job title differs',
        profileValue: saved.role,
        importedValue: entry.role,
      })
    if (entry.start && date(entry.start) !== date(saved.start_date))
      conflicts.push({
        id: `import-${index}-start`,
        label: 'Start date differs',
        profileValue: date(saved.start_date),
        importedValue: date(entry.start),
      })
    if (date(entry.end) !== date(saved.end_date))
      conflicts.push({
        id: `import-${index}-end`,
        label: 'End date differs',
        profileValue: date(saved.end_date),
        importedValue: date(entry.end),
      })
  })
  return conflicts
}

export function outputShape(
  value: unknown,
  profile: CareerProfileFull,
  ids: string[],
): string | null {
  if (!record(value)) return 'Expected a structured LinkedIn content package.'
  const bounded = (text: unknown, max: number) =>
    typeof text === 'string' &&
    text.trim().length > 0 &&
    Array.from(text).length <= max
  if (
    !Array.isArray(value.headlines) ||
    value.headlines.length !== 3 ||
    !value.headlines.every((text) => bounded(text, FIELD_LIMITS.headline))
  )
    return 'Return three headlines within the headline length budget.'
  if (!bounded(value.about, FIELD_LIMITS.about))
    return 'About must be non-empty and within the length budget.'
  if (
    !Array.isArray(value.experience) ||
    value.experience.length !== ids.length
  )
    return 'Return exactly the selected experience entries.'
  const found = new Set<string>()
  for (const entry of value.experience) {
    if (
      !record(entry) ||
      Object.keys(entry).some((key) => !['id', 'description'].includes(key)) ||
      typeof entry.id !== 'string' ||
      !ids.includes(entry.id) ||
      found.has(entry.id) ||
      !bounded(entry.description, FIELD_LIMITS.experience)
    )
      return 'Experience must have unique saved IDs and descriptions within the length budget.'
    found.add(entry.id)
  }
  if (
    !Array.isArray(value.skills) ||
    value.skills.length > 15 ||
    new Set(value.skills).size !== value.skills.length ||
    value.skills.some(
      (skill) =>
        typeof skill !== 'string' ||
        !profile.skills.some((saved) => saved.name === skill),
    )
  )
    return 'Skills must be selected verbatim from saved Career Profile skills.'
  if (
    !Array.isArray(value.advice) ||
    value.advice.length !== 3 ||
    !value.advice.every((tip) => bounded(tip, 500))
  )
    return 'Return three specific, concise recommendations.'
  const allowed = ['headlines', 'about', 'experience', 'skills', 'advice']
  if (Object.keys(value).some((key) => !allowed.includes(key)))
    return 'Unexpected output fields.'
  return null
}

export function checklistKeys(
  output: LinkedInOutput,
  profile: CareerProfileFull,
): string[] {
  return [
    'headline',
    'about',
    ...output.experience.map((entry) => `experience:${entry.id}`),
    ...(output.skills.length ? ['skills'] : []),
    ...(profile.education.length ? ['education'] : []),
    ...(profile.certifications.length ? ['certifications'] : []),
    'presentation',
  ]
}
export function completion(
  keys: string[],
  completed: string[],
  skipped: string[],
): number {
  const applicable = keys.filter((key) => !skipped.includes(key))
  return applicable.length
    ? Math.round(
        (100 * applicable.filter((key) => completed.includes(key)).length) /
          applicable.length,
      )
    : 0
}
