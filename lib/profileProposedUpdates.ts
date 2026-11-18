import type { CareerProfileDraft, CareerProfileFull } from '@/types/careerProfile'
import { inferDatePrecision, type DatePrecision } from '@/lib/profileDatePrecision'
import {
  CHILD_TABLES,
  compareWorkTenures,
  mergeDraftIntoProfile,
  profileMergeRowKey,
  type ChildTable,
  type MergeResult,
  type ProfileMergeRow,
} from '@/lib/profileMerge'

/** Choices exist only in the unsaved import review; they never write a profile. */
export interface ProposedProfileUpdate {
  id: string
  label: string
  table?: ChildTable
  rowId?: string
  fields: string[]
  before: Record<string, unknown>
  after: Record<string, unknown>
}

const SCALAR_FIELDS = [
  'full_name', 'nationality', 'date_of_birth', 'passport_type', 'passport_validity_date',
  'visa_status', 'visa_transferable', 'notice_period', 'current_location', 'phone',
  'whatsapp', 'email', 'linkedin_url', 'professional_summary',
] as const
const CHILD_FIELDS: Record<ChildTable, string[]> = {
  work_experience: ['company', 'role', 'location', 'description', 'highlights', 'gcc_country'],
  education: ['degree', 'institution', 'field_of_study', 'start_year', 'end_year'],
  certifications: ['name', 'issuer'],
  skills: ['name'],
  additional_information: ['label', 'value', 'level'],
}
const DATE_FIELDS: Partial<Record<ChildTable, string[]>> = {
  work_experience: ['start_date', 'end_date'],
  certifications: ['issue_date', 'expiry_date'],
}

function blank(value: unknown): boolean {
  return value == null || typeof value === 'string' && !value.trim()
}
function equal(a: unknown, b: unknown): boolean {
  const normal = (v: unknown) => typeof v === 'string' ? v.trim().replace(/\s+/g, ' ') : v
  return JSON.stringify(normal(a)) === JSON.stringify(normal(b))
}
function label(field: string): string {
  return field.replace(/_/g, ' ').replace(/^./, c => c.toUpperCase())
}

function inferredFact(row: ProfileMergeRow, field: string): Record<string, unknown> {
  const value = row[field]
  const precision = row[`${field}_precision`] as DatePrecision | null | undefined
  return { [field]: value, [`${field}_precision`]: precision === undefined ? inferDatePrecision(value) : precision }
}

/**
 * Add is always the baseline. Existing scalars, child IDs, visibility and
 * categories remain saved-first. Only facts actually supplied by the new
 * reading can become an explicit proposed update; absent facts never mean
 * deletion and no choice grants blanket overwrite permission.
 */
export function buildProposedProfileUpdates(existing: CareerProfileFull, draft: CareerProfileDraft): {
  additions: MergeResult
  updates: ProposedProfileUpdate[]
} {
  const additions = mergeDraftIntoProfile(existing, draft)
  const updates: ProposedProfileUpdate[] = []
  const saved = existing as unknown as ProfileMergeRow
  const incoming = draft as unknown as ProfileMergeRow
  for (const field of SCALAR_FIELDS) {
    if (blank(saved[field]) || blank(incoming[field]) || equal(saved[field], incoming[field])) continue
    updates.push({ id: `profile:${field}`, label: label(field), fields: [field],
      before: { [field]: saved[field] }, after: { [field]: incoming[field] } })
  }
  for (const table of CHILD_TABLES) {
    const current = (existing[table] ?? []) as unknown as ProfileMergeRow[]
    const rows = (draft[table] ?? []) as unknown as ProfileMergeRow[]
    // Each saved row needs one unambiguous source row. Repeated source matches
    // must not result in last-write-wins choices against the same saved fact.
    for (const row of current) {
      if (!row.id) continue
      const matches = rows.filter(next => profileMergeRowKey(table, next) === profileMergeRowKey(table, row)
        && (table !== 'work_experience' || compareWorkTenures(row, next) === 'same'))
      const competingSaved = current.filter(candidate => candidate.id !== row.id
        && matches.some(next => profileMergeRowKey(table, candidate) === profileMergeRowKey(table, next)
          && (table !== 'work_experience' || compareWorkTenures(candidate, next) === 'same')))
      if (matches.length !== 1 || competingSaved.length) continue
      const next = matches[0]
      const name = String(row.role ?? row.name ?? row.degree ?? row.label ?? table)
      const add = (fields: string[], before: Record<string, unknown>, after: Record<string, unknown>) => {
        if (fields.every(field => equal(before[field], after[field]))) return
        updates.push({ id: `${table}:${row.id}:${fields[0]}`, label: `${name} — ${label(fields[0])}`,
          table, rowId: row.id, fields, before, after })
      }
      for (const field of CHILD_FIELDS[table]) {
        if (!Object.prototype.hasOwnProperty.call(next, field) || blank(next[field])) continue
        add([field], { [field]: row[field] }, { [field]: next[field] })
      }
      for (const field of DATE_FIELDS[table] ?? []) {
        // An omitted date is not consent to erase a saved date/current status.
        if (blank(next[field]) || !inferDatePrecision(next[field])) continue
        const fields = [field, `${field}_precision`]
        const before = inferredFact(row, field), after = inferredFact(next, field)
        if (field === 'end_date') {
          fields.push('end_date_unconfirmed')
          before.end_date_unconfirmed = row.end_date_unconfirmed === true
          after.end_date_unconfirmed = false // a supplied end date establishes ended status
        }
        add(fields, before, after)
      }
    }
  }
  return { additions, updates }
}

/** Rebuilding from saved+source ensures returning to Add removes every staged overwrite. */
export function stageProposedProfileUpdates(
  existing: CareerProfileFull,
  draft: CareerProfileDraft,
  selectedIds: readonly string[],
  mode: 'add' | 'updates',
  ambiguousWorkChoices: Readonly<Record<number, 'keep' | 'add'>> = {},
): CareerProfileFull {
  const { additions, updates } = buildProposedProfileUpdates(existing, draft)
  let profile = additions.profile
  for (const ambiguity of additions.ambiguousWork) {
    if (ambiguousWorkChoices[ambiguity.incomingIndex] !== 'add') continue
    const { id: _id, profile_id: _profileId, created_at: _createdAt, ...facts } = ambiguity.incoming
    void _id; void _profileId; void _createdAt
    profile = { ...profile, work_experience: [...profile.work_experience, {
      ...facts, sort_order: profile.work_experience.length,
    } as unknown as CareerProfileFull['work_experience'][number]] }
  }
  if (mode === 'add') return profile
  const selected = new Set(selectedIds)
  for (const update of updates) {
    if (!selected.has(update.id)) continue
    if (!update.table) {
      profile = { ...profile, ...update.after }
    } else {
      const table = update.table
      profile = { ...profile, [table]: profile[table].map(row => row.id === update.rowId ? { ...row, ...update.after } : row) }
    }
  }
  return profile
}
