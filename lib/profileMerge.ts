import type { CareerProfileDraft, CareerProfileFull } from '@/types/careerProfile'

/**
 * Merging a newly-uploaded resume into an EXISTING Career Profile (TASK-133).
 *
 * WHY THIS EXISTS. Uploading a resume used to be treated as first-time
 * onboarding no matter who did it: /profile loaded the extraction draft and
 * never fetched what the user already had, and saving then deleted every child
 * row missing from the payload. A returning user who uploaded a newer CV
 * silently lost everything a resume cannot express — driving licence, visa
 * status, notice period, passport validity, target role — plus any job, skill
 * or qualification they had typed in by hand. See docs/TASKS.md Unplanned #13,
 * which predicted this the moment a re-upload entry point existed. TASK-103
 * added one.
 *
 * THE RULE, and it is deliberately conservative: MERGING NEVER DELETES AND
 * NEVER OVERWRITES. A value the user already has always wins over the same
 * value read out of a PDF, because a human typed one and a parser guessed the
 * other. The new resume can only ADD — fill a field that was empty, or append
 * an entry that is genuinely not there yet.
 *
 * Replacing is still available, but it is now a separate, explicit choice with
 * the losses named up front — never the silent default.
 */

/** Loose row shape: every child table here has an optional id and free text fields. */
type Row = Record<string, unknown> & { id?: string }

function norm(v: unknown): string {
  return typeof v === 'string' ? v.trim().toLowerCase().replace(/\s+/g, ' ') : ''
}

/** Blank means null, undefined, or a string that is only whitespace. */
function isBlank(v: unknown): boolean {
  if (v === null || v === undefined) return true
  if (typeof v === 'string') return v.trim() === ''
  return false
}

/**
 * Identity of a child row for duplicate detection.
 *
 * Deliberately coarse — "same job title at the same employer" counts as the
 * same job even if the dates differ slightly, because the alternative (a
 * stricter key) shows the user the same job twice and makes merging feel
 * broken. A false merge loses nothing: the existing row is kept intact.
 */
function rowKey(table: ChildTable, row: Row): string {
  switch (table) {
    case 'work_experience':
      return norm(row.job_title) + '|' + norm(row.company_name)
    case 'education':
      return norm(row.degree) + '|' + norm(row.institution)
    case 'certifications':
      return norm(row.certification_name)
    case 'skills':
      return norm(row.skill_name)
    case 'additional_information':
      return norm(row.label) + '|' + norm(row.value)
  }
}

export type ChildTable =
  | 'work_experience'
  | 'education'
  | 'certifications'
  | 'skills'
  | 'additional_information'

export const CHILD_TABLES: ChildTable[] = [
  'work_experience',
  'education',
  'certifications',
  'skills',
  'additional_information',
]

export interface MergeResult {
  /** The merged profile, ready to load into the editor. */
  profile: CareerProfileFull
  /** Per-table count of entries the resume contributed that were not already there. */
  added: Record<ChildTable, number>
  /** Scalar fields that were empty and have now been filled from the resume. */
  filledFields: string[]
}

/**
 * Merge a freshly extracted draft into the profile the user already has.
 *
 * Existing rows keep their ids, which is what stops the save from deleting
 * them: app/api/profile's PUT removes child rows whose id is absent from the
 * payload, so an id-preserving merge is the difference between adding and
 * wiping.
 */
export function mergeDraftIntoProfile(
  existing: CareerProfileFull,
  draft: CareerProfileDraft
): MergeResult {
  const merged = { ...existing } as unknown as Record<string, unknown>
  const draftObj = draft as unknown as Record<string, unknown>
  const filledFields: string[] = []

  // Scalars: fill only what is empty. Never overwrite something the user has
  // already answered — this is "add", not "replace".
  for (const [key, value] of Object.entries(draftObj)) {
    if (CHILD_TABLES.includes(key as ChildTable)) continue
    if (isBlank(value)) continue
    if (!isBlank(merged[key])) continue
    merged[key] = value
    filledFields.push(key)
  }

  const added = {} as Record<ChildTable, number>

  for (const table of CHILD_TABLES) {
    const current = Array.isArray(merged[table]) ? ([...(merged[table] as Row[])]) : []
    const incoming = Array.isArray(draftObj[table]) ? (draftObj[table] as Row[]) : []

    const seen = new Set(current.map((r) => rowKey(table, r)))
    let count = 0

    for (const row of incoming) {
      const key = rowKey(table, row)
      // An entry with no identifying text at all is noise from extraction, not
      // an entry — skip rather than append a blank row to someone's CV.
      if (!key.replace(/\|/g, '').trim()) continue
      if (seen.has(key)) continue
      seen.add(key)
      // No id: the API treats an id-less row as new and inserts it. Existing
      // rows keep theirs and are therefore never deleted.
      const { id: _ignored, ...rest } = row
      void _ignored
      current.push(rest as Row)
      count++
    }

    merged[table] = current
    added[table] = count
  }

  return { profile: merged as unknown as CareerProfileFull, added, filledFields }
}

/**
 * What a REPLACE would destroy — so the warning can name it rather than saying
 * "this cannot be undone" and leaving the user to guess.
 */
export interface ReplaceLosses {
  /** Per-table count of existing entries the new resume does not contain. */
  entries: Record<ChildTable, number>
  /** Human-readable labels of answered fields the resume cannot supply. */
  fields: string[]
}

/** Fields a resume essentially never states, but that the profile depends on. */
const RESUME_CANNOT_SUPPLY: Array<[string, string]> = [
  ['visa_status', 'Visa status'],
  ['visa_transferable', 'Visa transferable'],
  ['notice_period', 'Notice period'],
  ['passport_validity_date', 'Passport validity'],
  ['f_has_driving_license', 'Driving licence'],
  ['driving_license_country', 'Driving licence country'],
  ['target_job_title', 'Target job title'],
  ['target_country', 'Target country'],
  ['target_industry', 'Target industry'],
  ['target_company', 'Target company'],
  ['date_of_birth', 'Date of birth'],
  ['marital_status', 'Marital status'],
  ['photo_url', 'Profile photo'],
]

export function describeReplaceLosses(
  existing: CareerProfileFull,
  draft: CareerProfileDraft
): ReplaceLosses {
  const ex = existing as unknown as Record<string, unknown>
  const dr = draft as unknown as Record<string, unknown>

  const entries = {} as Record<ChildTable, number>
  for (const table of CHILD_TABLES) {
    const current = Array.isArray(ex[table]) ? (ex[table] as Row[]) : []
    const incoming = Array.isArray(dr[table]) ? (dr[table] as Row[]) : []
    const incomingKeys = new Set(incoming.map((r) => rowKey(table, r)))
    entries[table] = current.filter((r) => !incomingKeys.has(rowKey(table, r))).length
  }

  const fields = RESUME_CANNOT_SUPPLY.filter(([key]) => !isBlank(ex[key]) && isBlank(dr[key])).map(
    ([, label]) => label
  )

  return { entries, fields }
}
