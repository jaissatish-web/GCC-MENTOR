import type { CareerProfileDraft, CareerProfileFull } from '@/types/careerProfile'
import { isHeadlineEntry } from '@/lib/resumeHeadline'
import { dateBounds, readPrecisionDate, type DatePrecision } from '@/lib/profileDatePrecision'

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
export type ProfileMergeRow = Record<string, unknown> & { id?: string }
type Row = ProfileMergeRow

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
 * Text identifies a possible match, not a work tenure. Work entries also need
 * the date-aware comparison below so a later stint at the same employer is
 * not silently discarded.
 */
export function profileMergeRowKey(table: ChildTable, row: Row): string {
  // THE REAL COLUMN NAMES (fixed 2026-09-11). This read `job_title` and
  // `company_name`, `certification_name` and `skill_name` — names that exist
  // nowhere in the schema, the draft or the editor (they are `role`,
  // `company` and `name`). Every job, certification and skill therefore keyed
  // as blank, and the "no identifying text" rule below skipped every one: "Add
  // it to my profile" silently dropped all new jobs, skills and certifications
  // and kept only education and additional information. Found by a live test
  // of the pending-reading change; see scripts/verify-profile-merge.ts.
  switch (table) {
    case 'work_experience':
      return norm(row.role) + '|' + norm(row.company)
    case 'education':
      return norm(row.degree) + '|' + norm(row.institution)
    case 'certifications':
      return norm(row.name)
    case 'skills':
      return norm(row.name)
    case 'additional_information':
      if (isHeadlineEntry({ label: row.label, category_name: row.category_name })) return '__professional_headline'
      return norm(row.label) + '|' + norm(row.value)
  }
}

/** Only used for matching. It does not certify or rewrite either date fact. */
function matchDate(row: Row, field: string): string {
  try { return readPrecisionDate(row[field], row[`${field}_precision`] as DatePrecision | null | undefined) ?? '' } catch { return '' }
}

export type WorkTenureRelation = 'same' | 'distinct' | 'ambiguous'

/**
 * Equal or compatible month/day starts identify a candidate for explicit
 * updates. Bare years and legacy-unknown dates do not prove the same tenure.
 * Disjoint conservative intervals establish a genuinely separate tenure.
 */
export function compareWorkTenures(saved: Row, incoming: Row): WorkTenureRelation {
  const start = matchDate(saved, 'start_date'), nextStart = matchDate(incoming, 'start_date')
  const savedPrecision = saved.start_date_precision
  const nextPrecision = incoming.start_date_precision
  const aStart = dateBounds(saved.start_date, savedPrecision as DatePrecision | null | undefined)
  const bStart = dateBounds(incoming.start_date, nextPrecision as DatePrecision | null | undefined)
  const aEnd = dateBounds(saved.end_date, saved.end_date_precision as DatePrecision | null | undefined)
  const bEnd = dateBounds(incoming.end_date, incoming.end_date_precision as DatePrecision | null | undefined)
  if (aStart && aEnd && aStart.min > aEnd.max || bStart && bEnd && bStart.min > bEnd.max) return 'ambiguous'
  if (aStart && bStart && ((aEnd && aEnd.max < bStart.min) || (bEnd && bEnd.max < aStart.min))) return 'distinct'
  if (start && nextStart && savedPrecision !== null && nextPrecision !== null) {
    const sameSuppliedStart = start === nextStart && start.length >= 7
    const sameFullDay = start.length === 10 && nextStart.length === 10 && start === nextStart
    const sameSuppliedEnd = matchDate(saved,'end_date') === matchDate(incoming,'end_date') && Boolean(saved.end_date_unconfirmed) === Boolean(incoming.end_date_unconfirmed)
    if (sameFullDay || sameSuppliedStart && sameSuppliedEnd) return 'same'
  }
  return 'ambiguous'
}

export interface AmbiguousWorkMerge {
  incomingIndex: number
  incoming: ProfileMergeRow
  savedIds: string[]
  reason: 'overlapping_dates' | 'insufficient_dates' | 'multiple_matches'
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
  /** The incoming facts are retained for a visible, explicit tenure decision. */
  ambiguousWork: AmbiguousWorkMerge[]
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
  const ambiguousWork: AmbiguousWorkMerge[] = []

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

    const seen = new Set(current.map((r) => profileMergeRowKey(table, r)))
    const seenIncoming = new Set<string>()
    let count = 0

    for (const [incomingIndex, row] of incoming.entries()) {
      const key = profileMergeRowKey(table, row)
      // An entry with no identifying text at all is noise from extraction, not
      // an entry — skip rather than append a blank row to someone's CV.
      if (!key.replace(/\|/g, '').trim()) continue
      const signature = JSON.stringify(Object.fromEntries(Object.entries(row)
        .filter(([field]) => !['id', 'profile_id', 'created_at', 'sort_order'].includes(field))
        .sort(([a], [b]) => a.localeCompare(b))))
      if (seenIncoming.has(signature)) continue
      seenIncoming.add(signature)
      if (seen.has(key)) {
        if (table !== 'work_experience') continue
        const candidates = current.filter(candidate => profileMergeRowKey(table, candidate) === key)
        const same = candidates.filter(candidate => compareWorkTenures(candidate, row) === 'same')
        // A unique matching start can safely retain the existing row. Its
        // differences are offered separately in Review proposed updates.
        if (same.length === 1) continue
        const uncertain = candidates.filter(candidate => compareWorkTenures(candidate, row) === 'ambiguous')
        if (same.length > 1 || uncertain.length) {
          const ids = candidates.flatMap(candidate => candidate.id ? [candidate.id] : [])
          const missingDates = !dateBounds(row.start_date, row.start_date_precision as DatePrecision | null | undefined)
            || !dateBounds(row.end_date, row.end_date_precision as DatePrecision | null | undefined)
            || uncertain.some(candidate => !dateBounds(candidate.start_date, candidate.start_date_precision as DatePrecision | null | undefined)
              || !dateBounds(candidate.end_date, candidate.end_date_precision as DatePrecision | null | undefined))
          ambiguousWork.push({ incomingIndex, incoming: { ...row }, savedIds: ids,
            reason: same.length > 1 ? 'multiple_matches' : missingDates ? 'insufficient_dates' : 'overlapping_dates' })
          continue
        }
        // Every existing possible match has a disjoint timeline: this is a
        // new tenure, even when the employer and title have not changed.
      }
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

  return { profile: merged as unknown as CareerProfileFull, added, filledFields, ambiguousWork }
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
  // Was 'f_has_driving_license' — the editor's DOM id, not the column — so this
  // warning could never fire (fixed 2026-09-11).
  ['has_driving_license', 'Driving licence'],
  ['driving_license_country', 'Driving licence country'],
  ['target_job_title', 'Job Title You’re Applying For'],
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
    const incomingKeys = new Set(incoming.map((r) => profileMergeRowKey(table, r)))
    entries[table] = current.filter((r) => table === 'work_experience'
      ? !incoming.some(next => profileMergeRowKey(table, next) === profileMergeRowKey(table, r) && compareWorkTenures(r, next) === 'same')
      : !incomingKeys.has(profileMergeRowKey(table, r))).length
  }

  const fields = RESUME_CANNOT_SUPPLY.filter(([key]) => !isBlank(ex[key]) && isBlank(dr[key])).map(
    ([, label]) => label
  )

  return { entries, fields }
}
