Warning: truncated output (original token count: 48110)
Total output lines: 3355

'use client'


import { REVIEW_RECOVERY_KEY, reviewSource, reviewStorage, readReviewRecovery, writeReviewRecovery, clearReviewRecovery } from '@/lib/resumeReviewRecovery'

import { validProfileEmail, validProfilePhone, validProfileLinkedIn } from '@/lib/profileFieldValidity'
import { rebaseImportField } from '@/lib/resumeParse/reviewPlan'
import { INTAKE_KEY, contextFromProfile } from '@/lib/careerIntake/shared'
import { ProfileReviewWorkspace, ReviewSavedSuccess } from '@/components/profile/review/ProfileReviewWorkspace'
import { PrecisionDateField } from '@/components/profile/review/PrecisionDateField'
import { RowActions } from '@/components/profile/review/RowActions'
import { editorDateFact, editorDatePayload, editorDateInvalid } from '@/lib/profileEditorDates'
import { type DatePrecision } from '@/lib/profileDatePrecision'
import { digestSource, identifyReattachedSource, type ReviewSourceIdentity } from '@/lib/profileReviewSource'
import { ProfilePhotoDraft } from '@/components/profile/ProfilePhotoDraft'
import { ProfilePhotoPicker } from '@/components/profile/ProfilePhotoPicker'
import { resumeReviewChecks } from '@/lib/resumeParse/reviewChecks'
import { confirmationDigest } from '@/lib/resumeParse/reviewConfirmations'
import { importReviewPlan } from '@/lib/resumeParse/reviewPlan'
import { currentImportValue, applyImportChange } from '@/lib/resumeParse/reviewEditor'
import { WorkExperienceItem } from '@/components/profile/WorkExperienceItem'
import { sortedWorkRoles } from '@/lib/profileWorkNavigation'
import { currentRoleFingerprint, type ImportReview } from '@/lib/resumeParse/importReview'
import { organizeCategoryEntries, type CategoryMetadata } from '@/lib/profileCategories'
import { ProfileBlockCategories, focusProfileBlockCategory } from '@/components/profile/ProfileBlockCategories'
import { PROFILE_BLOCKS, profileBlockForCategory } from '@/lib/careerProfileBlocks'
import { GulfContext } from '@/components/layout/GulfContext'
import { CareerProfileResumeButton } from '@/components/resume/CareerProfileResumeButton'
import { PageSkeleton } from '@/components/ui/Skeleton'

import Link from 'next/link'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import {
  Suspense,
  useCallback,
  useDeferredValue,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import { Button, buttonVariants } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Card } from '@/components/ui/Card'
import ReadinessRing from '@/components/ui/ReadinessRing'
import { Toggle } from '@/components/ui/Toggle'
import { ResumeImport } from '@/components/profile/ResumeImport'
import { TypicalDuties } from '@/components/profile/TypicalDuties'
import {
  StatusChip,
  ViewHeader,
  type SectionStatus,
  type SectionSummary,
} from '@/components/profile/ProfileOverview'
import { CompletenessView, type SectionBlock } from '@/components/profile/CompletenessView'
import { GulfReadinessView } from '@/components/profile/GulfReadinessView'
import { CvVisibilitySettings } from '@/components/profile/CvVisibilitySettings'
import { totalExperienceYears } from '@/lib/experienceYears'
import { gccCountryFromLocation } from '@/lib/jobMatch/gccLocation'
import { cn } from '@/lib/utils'
import { GULF_COUNTRIES } from '@/lib/utils'
import { CAREER_PROFILE_DRAFT_KEY, CAREER_PROFILE_PARSE_NOTES_KEY, CLAIMED_SCAN_RESULT_KEY } from '@/lib/onboardingDraft'
import { buildProposedProfileUpdates, type ProposedProfileUpdate } from '@/lib/profileProposedUpdates'
import { mergeDraftIntoProfile, describeReplaceLosses } from '@/lib/profileMerge'
import { DEFAULT_FIELD_VISIBILITY } from '@/lib/fieldVisibility'
import { isHeadlineEntry, profileHeadline, setProfileHeadline } from '@/lib/resumeHeadline'
import { calculateReadiness, fieldPointsFor, type ReadinessResult } from '@/lib/readiness'
import { scoreCareerPreparation as scoreProfileReadiness, answersFromReadinessCategory } from '@/lib/gulfReadiness/fromProfile'
import { toDateInputValue } from '@/lib/partialDates'
import { splitPhone, joinPhone } from '@/lib/phone'
import { TextField, TextAreaField, SelectField, DateField, PhoneField } from '@/components/ui/FormField'
import { FieldLabel } from '@/components/ui/FieldLabel'
import type { ReadinessCategory, PassportType } from '@/types/careerProfile'
import type { ArabicLevel, CareerProfileDraft, CareerProfileFull, FieldVisibility, PaperworkStatus } from '@/types/careerProfile'
import type { AtsScoreResult } from '@/lib/ai/atsScorePrompt'
import type { ParseWarning } from '@/lib/resumeParse/check'
import { ParseNotes } from '@/components/profile/ParseNotes'
import { PHOTO_CHECKLIST } from '@/lib/gulfReadiness/config'

/**
 * Does the saved profile hold real content worth protecting? Used to decide
 * whether an incoming draft (from the sessionStorage handoff at mount, or from
 * the inline ResumeImport panel) loads straight into the editor or must go
 * through the add-or-replace choice. Module scope so both call sites share the
 * one heuristic and it cannot drift between them.
 */
/** The stored `updated_at` a save is checked against (audit H08, migration 051). */
function versionOf(saved: CareerProfileFull | null): string | null {
  return (saved as { updated_at?: string | null } | null)?.updated_at ?? null
}

function hasSavedProfileContent(saved: CareerProfileFull | null): boolean {
  // A deliberately incomplete saved profile is still an existing profile.
  return !!saved?.id
}

/** Career Profile summary/reports are read-only. All edit links open details.
 * Legacy overview/settings URLs resolve to that same canonical editor. */
type ProfileView = 'summary' | 'details' | 'completeness' | 'readiness'
const PROFILE_VIEWS: readonly ProfileView[] = ['summary', 'details', 'completeness', 'readiness']
const MAIN_CLASS = 'ui-page-default mx-auto flex min-h-dvh w-full flex-col bg-canvas'

function viewFromParams(params: { get: (key: string) => string | null }): ProfileView {
  const v = params.get('view')
  if (v === 'overview' || v === 'settings') return 'details'
  if (v && (PROFILE_VIEWS as readonly string[]).includes(v)) return v as ProfileView
  const improve = params.get('improve')
  if (improve === 'gulf') return 'readiness'
  if (improve === 'strength') return 'completeness'
  if (params.get('open')) return 'details'
  // The summary is the default; import links retain explicit review/replace.
  return params.get('import') ? 'details' : 'summary'
}

// ---------------------------------------------------------------------------
// Editable row shapes (client-side editor state). Each row carries a client
// `key` for React list identity plus an optional `id` preserved from a loaded
// profile so the PUT's upsert-by-id reconciliation keeps row identity.
// ---------------------------------------------------------------------------

let seq = 0
function uid(): string {
  seq += 1
  return `row-${Date.now()}-${seq}`
}

/** Employment gap (GET /api/profile's computed `employment_gaps`, TASK-067). */
interface EmploymentGap {
  gapStartDate: string
  gapEndDate: string
  gapMonths: number
  precedingCompany: string | null
  followingCompany: string | null
}

interface EditableWork {
  key: string
  id?: string
  company: string
  role: string
  start_date: string
  end_date: string
  end_date_unconfirmed?: boolean
  start_date_precision?: DatePrecision | null
  end_date_precision?: DatePrecision | null
  location: string
  description: string
  highlights: string
  /** GCC-tagged country, or '' = not GCC-based (TASK-067 `gcc_country`). */
  gcc_country: string
}

interface EditableSkill {
  key: string
  id?: string
  name: string
}

interface EditableCert {
  key: string
  id?: string
  name: string
  issuer: string
  issue_date: string
  expiry_date: string
  issue_date_precision?: DatePrecision | null
  expiry_date_precision?: DatePrecision | null
}

interface EditableEdu {
  key: string
  id?: string
  degree: string
  institution: string
  field_of_study: string
  start_year: string
  end_year: string
}

interface EditableAdditional extends CategoryMetadata {
  key: string
  id?: string
  label: string
  value: string
}

interface EditorData {
  currently_in_gulf: boolean
  current_employer: string
  current_project: string
  target_job_title: string
  target_industry: string
  target_country: string
  target_company: string
  full_name: string
  photo_url: string
  nationality: string
  date_of_birth: string
  passport_type: string
  passport_validity_date: string
  visa_status: string
  /** null = not answered: nothing is printed on the CV (launch audit 2026-10-02 — a default "No" printed "Visa not transferable"). */
  visa_transferable: boolean | null
  notice_period: string
  current_location: string
  phone: string
  whatsapp: string
  email: string
  linkedin_url: string
  professional_summary: string
  // Driving license (TASK-067, docs/GCC_READINESS_JOB_MATCH.md §5). Nullable:
  // null = not yet answered; the UI must NOT collapse it to a coerced false.
  has_driving_license: boolean | null
  driving_license_country: string
  driving_license_category: string
  driving_license_validity_date: string
  // Gulf paperwork & presentation (migration 060, Gulf Readiness v2). Selects
  // hold '' for "not answered", sent as null.
  photo_checklist_confirmed: boolean
  degree_attestation: string
  professional_licence: string
  saudi_verification: string
  arabic_level: string
  field_visibility: FieldVisibility
  work_experience: EditableWork[]
  skills: EditableSkill[]
  certifications: EditableCert[]
  education: EditableEdu[]
  additional_information: EditableAdditional[]
}

/** Validate tab checkpoint structure before giving it back to the canonical editor. */
function isReviewEditor(value: unknown): value is EditorData {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false
  const candidate = value as Record<string, unknown>
  const base = emptyEditor()
  for (const [key, sample] of Object.entries(base)) {
    const entry = candidate[key]
    if (Array.isArray(sample)) {
      if (!Array.isArray(entry) || entry.some(row => !row || typeof row !== 'object' || Array.isArray(row))) return false
    } else if (key === 'field_visibility') {
      if (!entry || typeof entry !== 'object' || Array.isArray(entry) || Object.values(entry).some(v => typeof v !== 'boolean')) return false
    } else if (sample === null) {
      if (entry !== null && typeof entry !== 'boolean') return false
    } else if (typeof entry !== typeof sample) return false
  }
  const rows: Record<string, string[]> = { work_experience: ['key','company','role','start_date','end_date','location','description','highlights','gcc_country'], skills:['key','name'], certifications:['key','name','issuer','issue_date','expiry_date'], education:['key','degree','institution','field_of_study','start_year','end_year'], additional_information:['key','label','value'] }
  return Object.entries(rows).every(([key, fields]) => (candidate[key] as Record<string, unknown>[]).every(row => {
    if (!fields.every(field => typeof row[field] === 'string')) return false
    if (row.id !== undefined && typeof row.id !== 'string') return false
    for (const field of ['start_date_precision','end_date_precision','issue_date_precision','expiry_date_precision']) if (row[field] != null && !['year','month','day'].includes(String(row[field]))) return false
    if (key === 'work_experience' && row.end_date_unconfirmed !== undefined && typeof row.end_date_unconfirmed !== 'boolean') return false
    if (key !== 'additional_information') return true
    for (const field of ['category_id','category_name','level']) if (row[field] != null && typeof row[field] !== 'string') return false
    if (row.category_order != null && (typeof row.category_order !== 'number' || !Number.isFinite(row.category_order))) return false
    if (row.category_position != null && !['after_summary','after_experience','after_education','after_skills','after_certifications','end'].includes(String(row.category_position))) return false
    return row.show_on_resume == null || typeof row.show_on_resume === 'boolean'
  }))
}

// ---------------------------------------------------------------------------
// Normalisation helpers
// ---------------------------------------------------------------------------

function emptyEditor(): EditorData {
  return {
    currently_in_gulf: false,
    current_employer: '',
    current_project: '',
    target_job_title: '',
    target_industry: '',
    target_country: '',
    target_company: '',
    full_name: '',
    photo_url: '',
    nationality: '',
    date_of_birth: '',
    passport_type: '',
    passport_validity_date: '',
    visa_status: '',
    visa_transferable: null,
    notice_period: '',
    current_location: '',
    phone: '',
    whatsapp: '',
    email: '',
    linkedin_url: '',
    professional_summary: '',
    has_driving_license: null,
    driving_license_country: '',
    driving_license_category: '',
    driving_license_validity_date: '',
    photo_checklist_confirmed: false,
    degree_attestation: '',
    professional_licence: '',
    saudi_verification: '',
    arabic_level: '',
    field_visibility: { ...DEFAULT_FIELD_VISIBILITY },
    work_experience: [],
    skills: [],
    certifications: [],
    education: [],
    additional_information: [],
  }
}

function str(v: unknown): string {
  return typeof v === 'string' ? v : ''
}

function bool(v: unknown): boolean {
  return typeof v === 'boolean' ? v : false
}

function ws(o: unknown): EditableWork {
  const w = (o ?? {}) as Record<string, unknown>
  return {
    key: uid(),
    id: typeof w.id === 'string' ? w.id : undefined,
    company: str(w.company),
    role: str(w.role),
    // Keep canonical supplied precision; legacy values retain their raw date for unchanged saves.
    start_date: editorDateFact(w.start_date, w.start_date_precision as DatePrecision | null | undefined).value,
    end_date: editorDateFact(w.end_date, w.end_date_precision as DatePrecision | null | undefined).value,
    start_date_precision: editorDateFact(w.start_date, w.start_date_precision as DatePrecision | null | undefined).precision,
    end_date_precision: editorDateFact(w.end_date, w.end_date_precision as DatePrecision | null | undefined).precision,
    end_date_unconfirmed: w.end_date_unconfirmed === true,
    location: str(w.location),
    description: str(w.description),
    highlights: Array.isArray(w.highlights) ? (w.highlights as unknown[]).map(str).join('\n') : '',
    // Pre-filled from the role's own written location when not set (2026-09-23):
    // extraction never set it, so "Abu Dhabi, UAE" roles showed no GCC country.
    // The user sees it and can change it; nothing is inferred from an employer.
    gcc_country: str(w.gcc_country) || (gccCountryFromLocation(str(w.location))?.country ?? ''),
  }
}

function sk(o: unknown): EditableSkill {
  const s = (o ?? {}) as Record<string, unknown>
  return { key: uid(), id: typeof s.id === 'string' ? s.id : undefined, name: str(s.name) }
}

function ce(o: unknown): EditableCert {
  const c = (o ?? {}) as Record<string, unknown>
  return {
    key: uid(),
    id: typeof c.id === 'string' ? c.id : undefined,
    name: str(c.name),
    issuer: str(c.issuer),
    issue_date: editorDateFact(c.issue_date, c.issue_date_precision as DatePrecision | null | undefined).value,
    expiry_date: editorDateFact(c.expiry_date, c.expiry_date_precision as DatePrecision | null | undefined).value,
    issue_date_precision: editorDateFact(c.issue_date, c.issue_date_precision as DatePrecision | null | undefined).precision,
    expiry_date_precision: editorDateFact(c.expiry_date, c.expiry_date_precision as DatePrecision | null | undefined).precision,
  }
}

function ed(o: unknown): EditableEdu {
  const e = (o ?? {}) as Record<string, unknown>
  return {
    key: uid(),
    id: typeof e.id === 'string' ? e.id : undefined,
    degree: str(e.degree),
    institution: str(e.institution),
    field_of_study: str(e.field_of_study),
    start_year: typeof e.start_year === 'number' ? String(e.start_year) : str(e.start_year),
    end_year: typeof e.end_year === 'number' ? String(e.end_year) : str(e.end_year),
  }
}

function ai(o: unknown): EditableAdditional {
  const a = (o ?? {}) as Record<string, unknown>
  return {
    key: uid(),
    id: typeof a.id === 'string' ? a.id : undefined,
    label: str(a.label),
    value: str(a.value),
    category_id: typeof a.category_id === 'string' ? a.category_id : null,
    category_name: typeof a.category_name === 'string' ? a.category_name : null,
    category_order: typeof a.category_order === 'number' ? a.category_order : null,
    category_position: a.category_position as CategoryMetadata['category_position'],
    level: typeof a.level === 'string' ? a.level : '',
    show_on_resume: a.show_on_resume !== false,
  }
}

const GCC_LOCATION =
  /\b(saudi|ksa|riyadh|jeddah|dammam|jubail|khobar|dhahran|yanbu|tabuk|neom|uae|united arab emirates|dubai|abu dhabi|sharjah|ajman|ras al khaimah|fujairah|al ain|qatar|doha|oman|muscat|sohar|salalah|kuwait|bahrain|manama)\b/i

/** Normalise a CareerProfileDraft (extraction handoff) into editor state. */
function fromDraft(d: CareerProfileDraft): EditorData {
  return {
    ...emptyEditor(),
    full_name: str(d.full_name),
    photo_url: str(d.photo_url),
    nationality: str(d.nationality),
    date_of_birth: toDateInputValue(d.date_of_birth),
    passport_type: str(d.passport_type),
    passport_validity_date: toDateInputValue(d.passport_validity_date),
    visa_status: str(d.visa_status),
    visa_transferable: typeof d.visa_transferable === 'boolean' ? d.visa_transferable : null,
    notice_period: str(d.notice_period),
    current_location: str(d.current_location),
    // Pre-set on the review form when the CV places the candidate in the GCC.
    // Extraction itself stays silent on status (see types/careerProfile.ts);
    // the user sees this toggle and can switch it off before saving.
    currently_in_gulf: GCC_LOCATION.test(str(d.current_location)),
    phone: str(d.phone),
    whatsapp: str(d.whatsapp),
    email: str(d.email),
    linkedin_url: str(d.linkedin_url),
    professional_summary: str(d.professional_summary),
    work_experience: (d.work_experience ?? []).map(row => { const job = ws(row); return { ...job, end_date_unconfirmed: !job.end_date && !/\b(present|current|ongoing|to date)\b/i.test(String(row.end_date ?? '')) } }),
    skills: (d.skills ?? []).map(sk),
    certifications: (d.certifications ?? []).map(ce),
    education: (d.education ?? []).map(ed),
    additional_information: organizeCategoryEntries((d.additional_information ?? []).map(ai), () => crypto.randomUUID()),
  }
}

/** Normalise a saved CareerProfileFull (GET) into editor state, preserving ids + visibility. */
function fromFull(p: CareerProfileFull): EditorData {
  return {
    currently_in_gulf: p.currently_in_gulf,
    current_employer: str(p.current_employer),
    current_project: str(p.current_project),
    target_job_title: str(p.target_job_title),
    target_industry: str(p.target_industry),
    target_country: str(p.target_country),
    target_company: str(p.target_company),
    full_name: str(p.full_name),
    photo_url: str(p.photo_url),
    nationality: str(p.nationality),
    date_of_birth: toDateInputValue(p.date_of_birth),
    passport_type: str(p.passport_type),
    passport_validity_date: toDateInputValue(p.passport_validity_date),
    visa_status: str(p.visa_status),
    visa_transferable: typeof p.visa_transferable === 'boolean' ? p.visa_transferable : null,
    notice_period: str(p.notice_period),
    current_location: str(p.current_location),
    phone: str(p.phone),
    whatsapp: str(p.whatsapp),
    email: str(p.email),
    linkedin_url: str(p.linkedin_url),
    professional_summary: str(p.professional_summary),
    has_driving_license: p.has_driving_license ?? null,
    driving_license_country: str(p.driving_license_country),
    driving_license_category: str(p.driving_license_category),
    driving_license_validity_date: str(p.driving_license_validity_date),
    photo_checklist_confirmed: p.photo_checklist_confirmed === true,
    degree_attestation: str(p.degree_attestation),
    professional_licence: str(p.professional_licence),
    saudi_verification: str(p.saudi_verification),
    arabic_level: str(p.arabic_level),
    field_visibility: { ...DEFAULT_FIELD_VISIBILITY, ...(p.field_visibility ?? {}) },
    work_experience: (p.work_experience ?? []).map(ws),
    skills: (p.skills ?? []).map(sk),
    certifications: (p.certifications ?? []).map(ce),
    education: (p.education ?? []).map(ed),
    additional_information: organizeCategoryEntries((p.additional_information ?? []).map(ai), () => crypto.randomUUID()),
  }
}

// ---------------------------------------------------------------------------
// PUT body construction — always the FULL profile object (Unplanned #7).
// Optional nullable parent/child text fields are "" → null; required fields
// must be non-empty or the server 400s. sort_order = list index.
// ---------------------------------------------------------------------------

function optNull(v: string): string | null {
  return v.trim() === '' ? null : v
}

function applyProposedEditorUpdate(editor: EditorData, update: ProposedProfileUpdate, accept: boolean): EditorData {
  const values = accept ? update.after : update.before
  if (!update.table) return {...editor, ...values} as EditorData
  const table = update.table
  const rows = editor[table].map(row => {
    if (row.id !== update.rowId) return row
    const patch: Record<string, unknown> = {}
    for (const [field, value] of Object.entries(values)) {
      patch[field] = field.endsWith('_precision') ? value : field === 'end_date_unconfirmed' ? value : field === 'highlights' ? (Array.isArray(value) ? value.join('\n') : str(value)) : value == null ? '' : typeof value === 'number' ? String(value) : value
    }
    for (const field of ['start_date','end_date','issue_date','expiry_date']) if (field in values) {
      const fact = editorDateFact(values[field], values[`${field}_precision`] as DatePrecision | null | undefined)
      patch[field] = fact.value; patch[`${field}_precision`] = fact.precision
    }
    return {...row,...patch}
  })
  return {...editor,[table]:rows} as EditorData
}

function invalidEditorDates(e: EditorData): Array<{field: string; sectionId: string}> {
  return [
    ...e.work_experience.flatMap(row => (['start_date','end_date'] as const).filter(field => editorDateInvalid(row[field], row[`${field}_precision`])).map(field => ({field: `work_${field === 'start_date' ? 'start' : 'end'}_${row.key}`, sectionId: 'sec_work_experience'}))),
    ...e.certifications.flatMap(row => (['issue_date','expiry_date'] as const).filter(field => editorDateInvalid(row[field], row[`${field}_precision`])).map(field => ({field: `cert_${field === 'issue_date' ? 'issue' : 'expiry'}_${row.key}`, sectionId: 'sec_certifications'}))),
  ]
}

function buildPutBody(e: EditorData): Record<string, unknown> {
  const parent: Record<string, unknown> = {
    currently_in_gulf: e.currently_in_gulf,
    current_employer: optNull(e.current_employer),
    current_project: optNull(e.current_project),
    // Optional since migration 042 — empty becomes null, like target_country.
    target_job_title: optNull(e.target_job_title),
    target_industry: optNull(e.target_industry),
    // optNull, not the raw value — same treatment as target_company. Without
    // this, leaving the field unselected sends '' (fails enum validation
    // server-side) instead of null (now valid, migration 030).
    target_country: optNull(e.target_country),
    target_company: optNull(e.target_company),
    full_name: e.full_name,
    photo_url: optNull(e.photo_url),
    nationality: optNull(e.nationality),
    date_of_birth: optNull(e.date_of_birth),
    passport_type: (e.passport_type as PassportType) || null,
    passport_validity_date: optNull(e.passport_validity_date),
    visa_status: optNull(e.visa_status),
    visa_transferable: e.visa_transferable,
    notice_period: optNull(e.notice_period),
    current_location: optNull(e.current_location),
    phone: e.phone,
    whatsapp: optNull(e.whatsapp),
    email: e.email,
    linkedin_url: optNull(e.linkedin_url),
    professional_summary: optNull(e.professional_summary),
    has_driving_license: e.has_driving_license,
    driving_license_country: optNull(e.driving_license_country),
    driving_license_category: optNull(e.driving_license_category),
    driving_license_validity_date: optNull(e.driving_license_validity_date),
    photo_checklist_confirmed: e.photo_url ? e.photo_checklist_confirmed : null,
    degree_attestation: optNull(e.degree_attestation),
    professional_licence: optNull(e.professional_licence),
    saudi_verification: optNull(e.saudi_verification),
    arabic_level: optNull(e.arabic_level),
    field_visibility: e.field_visibility,
  }

  const work_experience: Array<Record<string, unknown>> = e.work_experience.map((w, i) => {
    const row: Record<string, unknown> = {
      company: w.company,
      role: w.role,
      ...editorDatePayload('start_date', w.start_date, w.start_date_precision),
      ...editorDatePayload('end_date', w.end_date, w.end_date_precision),
      end_date_unconfirmed: !w.end_date && w.end_date_unconfirmed === true,
      location: optNull(w.location),
      description: optNull(w.description),
      highlights:
        w.highlights
          .split('\n')
          .map((h) => h.trim())
          .filter((h) => h !== '').length > 0
          ? w.highlights.split('\n').map((h) => h.trim()).filter((h) => h !== '')
          : null,
      gcc_country: optNull(w.gcc_country),
      sort_order: i,
    }
    if (typeof w.id === 'string' && w.id !== '') row.id = w.id
    return row
  })

  const skills = e.skills.map((s, i) => {
    const row: Record<string, unknown> = { name: s.name, sort_order: i }
    if (typeof s.id === 'string' && s.id !== '') row.id = s.id
    return row
  })

  const certifications = e.certifications.map((c, i) => {
    const row: Record<string, unknown> = {
      name: c.name,
      issuer: optNull(c.issuer),
      ...editorDatePayload('issue_date', c.issue_date, c.issue_date_precision),
      ...editorDatePayload('expiry_date', c.expiry_date, c.expiry_date_precision),
      sort_order: i,
    }
    if (typeof c.id === 'string' && c.id !== '') row.id = c.id
    return row
  })

  const education = e.education.map((x, i) => {
    const row: Record<string, unknown> = {
      degree: x.degree,
      institution: x.institution,
      field_of_study: optNull(x.field_of_study),
      start_year: x.start_year.trim() === '' ? null : Number(x.start_year),
      end_year: x.end_year.trim() === '' ? null : Number(x.end_year),
      sort_order: i,
    }
    if (typeof x.id === 'string' && x.id !== '') row.id = x.id
    return row
  })

  const additional_information = organizeCategoryEntries(e.additional_information, () => crypto.randomUUID()).map((a, i) => {
    const row: Record<string, unknown> = { label: a.label, value: a.value, sort_order: i, category_id: a.category_id ?? null, category_name: a.category_name ?? null, category_order: a.category_order ?? 0, category_position: a.category_position ?? 'end', level: a.level || null, show_on_resume: a.show_on_resume !== false }
    if (typeof a.id === 'string' && a.id !== '') row.id = a.id
    return row
  })

  return { ...parent, work_experience, skills, certifications, education, additional_information }
}

// ---------------------------------------------------------------------------
// Supplied contact format validation (blank details can be added later; validate
// so the user gets a readable error instead of a bare server 400).
// ---------------------------------------------------------------------------

// target_country deliberately absent (migration 030, founder decision
// 2026-08-10) — it never actually changed CV format or generation
// behavior, so requiring it was misleading. It's still an editable field
// below and still contributes to the readiness score if filled
// (lib/readiness.ts), same standing as target_company and current_location.
// target_job_title / target_industry are optional since migration 042 — a resume
// does not state the job you are aiming for, so the profile can save (and
// auto-save after extraction) without them. They are set later, per optimization.

function requiredMissing(e: EditorData): Array<{ key: keyof EditorData; label: string }> {
  const missing: Array<{ key: keyof EditorData; label: string }> = []
  if (e.email.trim() && !validProfileEmail(e.email)) missing.push({ key: 'email', label: 'Valid email address' })
  if (e.phone.trim() && !validProfilePhone(e.phone)) missing.push({ key: 'phone', label: 'Valid phone number' })
  return missing
}

// ---------------------------------------------------------------------------
// Category-aware nudge copy (docs/USER_FLOW.md Step 4). The mockup shows the
// "currently in the Gulf" variant verbatim; the other categories get analogous
// copy grounded in what that category's readiness rewards.
// ---------------------------------------------------------------------------

const CATEGORY_COPY: Record<ReadinessCategory, { highlight: string; rest: string }> = {
  currently_in_gulf: {
    highlight: 'currently in the Gulf',
    rest: 'give employers a clearer picture when visa and notice details are complete.',
  },
  fresher: {
    highlight: 'just starting out',
    rest: 'read more clearly when skills and education are complete.',
  },
  returner: {
    highlight: 'returning to the Gulf',
    rest: 'read more clearly when earlier Gulf work history is complete.',
  },
  experienced_not_in_gulf: {
    highlight: 'experienced outside the Gulf',
    rest: 'read more clearly when work experience is complete.',
  },
}

// ---------------------------------------------------------------------------
// Small presentational helpers
// ---------------------------------------------------------------------------

/**
 * A section of the Career Profile form.
 *
 * `helper` is the guided remark shown under the title — one short line saying
 * what to put in this block and what makes it useful to a Gulf recruiter. It
 * renders on `ink-400-dark`, a real token, rather than an opacity wash of the
 * body colour (the whole file used `text-ink/55` and similar, which
 * is what made the guidance hard to read against the card).
 *
 * `optional` marks blocks a user can legitimately skip, so required vs
 * optional is visible at section level instead of guessed field by field.
 */
/**
 * The primary way to add another row to a list section.
 *
 * Full width, dashed, and sitting directly under the last row — the place the
 * user's eye already is when they finish one entry. The previous control was an
 * 11px text link in the section header with no minimum touch target, which is
 * why adding a second job or degree was easy to miss entirely.
 */
function AddRowButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex min-h-11 w-full items-center justify-center gap-1.5 rounded-ctl border border-dashed border-line-strong px-4 py-3 type-helper font-semibold text-teal transition-colors hover:border-teal hover:bg-teal-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal focus-visible:ring-offset-2 focus-visible:ring-offset-white"
    >
      <span aria-hidden="true" className="type-label leading-none">
        +
      </span>
      {label}
    </button>
  )
}

/**
 * The points chip shown at the right of a section heading.
 *
 * `earned`/`total` are computed live from lib/readiness.ts for THIS user's
 * category — never hard-coded. That is not pedantry: the weights genuinely
 * differ per category (Education is 30 points to a fresher and 5 to someone
 * already in the Gulf; Visa readiness is 0 to a fresher and 40 in-Gulf), so a
 * fixed "+30 points" label would be wrong for most people looking at it.
 *
 * A section worth nothing shows "Not scored" rather than "+0 points", because
 * "0" reads as a bug or as "worthless" — several unscored sections (summary,
 * licence) still materially affect the CV the user gets out.
 */
function PointsChip({ earned, total }: { earned: number; total: number }) {
  if (total === 0) {
    return (
      <span className="shrink-0 whitespace-nowrap rounded-full border border-line-strong px-2.5 py-1 type-caption font-semibold text-ink-muted">
        Optional
      </span>
    )
  }
  const complete = earned >= total
  // Two states, two colours. Both used to be teal, so "Done" and "+12 pts"
  // looked like the same kind of label. Points still on offer are gold — the
  // colour of doing something; finished is the status green.
  //   gold-ink on gold-soft 4.83 · ok on ok-soft 5.18
  return (
    <span
      className={cn(
        'shrink-0 whitespace-nowrap rounded-full px-2.5 py-1 type-caption font-semibold tabular-nums',
        complete ? 'bg-ok-soft text-ok' : 'bg-gold-soft text-gold-ink'
      )}
    >
      {complete ? 'Done' : `+${total - earned} pts`}
    </span>
  )
}

/**
 * One step of the Career Profile form — a collapsible block.
 *
 * WHY THIS COLLAPSES NOW. Earlier revisions kept all nine sections expanded,
 * on the reasoning that collapsing hides fields the user still has to fill and
 * buries validation errors. That reasoning was wrong for this form: expanded,
 * the page renders roughly 750 lines of inputs at once, and the founder's
 * feedback — twice — was that it reads as complicated regardless of how good
 * the per-field guidance is. The volume itself was the problem.
 *
 * The compromise that keeps the original concern honest: collapsing hides the
 * INPUTS but never the STATE. Every closed row still shows its number, name,
 * one-line purpose, how many rows it contains, and exactly how many points are
 * still available in it. So the user can always see what is left to do across
 * the whole form — which is the thing that was actually at risk — while only
 * ever facing one block's fields at a time.
 *
 * Closed, the nine rows fit roughly a screen and a half: the entire job, legible
 * at a glance. That is the difference between "this is a wall of inputs" and
 * "there are nine things and I am on number three."
 */
function CardSection({
  id,
  step,
  title,
  helper,
  badge,
  action,
  earned,
  total,
  open,
  onToggle,
  accent,
  status,
  validationState,
  validationMessage,
  sourceState,
  children,
}: {
  id?: string
  step: number
  title: string
  helper?: string
  badge?: string
  action?: React.ReactNode
  earned?: number
  total?: number
  /** Complete / Needs attention / Missing / Optional — see sectionStatuses. */
  status?: SectionStatus
  validationState?: 'attention' | 'resolved'
  validationMessage?: string
  sourceState?: string
  open: boolean
  onToggle: () => void
  /** This block's identity colour. See SECTION_ACCENT. */
  accent?: { text: string; chip: string; rule: string }
  children: React.ReactNode
}) {
  const panelId = `${id ?? `step-${step}`}-panel`
  const done = status ? status === 'complete' : typeof total === 'number' && total > 0 && (earned ?? 0) >= total
  return (
    <Card
      id={id}
      data-guided-validation={validationState}
      tone="light"
      className={cn(
        'flex scroll-mt-24 flex-col overflow-hidden border-l-[3px] p-0 transition-colors',
        accent?.rule ?? 'border-l-line',
        open && 'border-teal/40',
      )}
    >
      <h2>
        <button
          type="button"
          onClick={onToggle}
          aria-expanded={open}
          aria-controls={panelId}
          className="ui-panel-padding flex w-full items-center gap-3 p-4 text-left transition-colors hover:bg-canvas focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-teal sm:p-5"
        >
          {/* Step marker — a tick once the block is complete, so progress is
              readable from the numbers column alone without reading any text. */}
          <span
            className={cn(
              'flex size-8 shrink-0 items-center justify-center rounded-full type-helper font-semibold tabular-nums',
              done || open
                // Open or finished, the marker is `signal`: the one colour that
                // means "this is where you are acting".
                ? 'bg-teal text-white'
                // Closed, it carries the block's own hue, so the numbers column
                // alone tells you which block is which.
                : (accent?.chip ?? 'bg-canvas text-ink-muted')
            )}
            aria-hidden="true"
          >
            {done ? '✓' : step}
          </span>

          <span className="flex min-w-0 flex-1 flex-col gap-0.5">
            <span className="flex flex-wrap items-center gap-2">
              <span
                className={cn(
                  'type-card',
                  // Open, the title is plain graphite — you are reading the
                  // block, not looking for it. Closed, it is its own colour so
                  // you can find it again.
                  open ? 'text-ink' : (accent?.text ?? 'text-ink'),
                )}
              >
                {title}
              </span>
              {sourceState ? <span className="rounded-full border border-line bg-white px-2 py-1 type-caption font-normal text-ink-soft">{sourceState}</span> : null}
              {badge ? (
                <span className="rounded-[5px] bg-canvas px-1.5 py-0.5 type-caption font-semibold uppercase tracking-wider text-ink-soft">
                  {badge}
                </span>
              ) : null}
              {/* Phones: the status sits beside the title, so the helper
                  below gets the card's full width instead of a narrow column
                  (2026-09-29 — helpers were wrapping to five short lines). */}
              {status ? (
                <span className="sm:hidden">
                  <StatusChip status={status} />
                </span>
              ) : null}
            </span>
            {helper ? (
              <span
                className={cn(
                  // Never clipped. At one line every helper ended "Passport,
                  // visa and contact..."; at two, a measured 8 of 9 still did.
                  // A sentence that stops mid-word reads as unfinished, and
                  // these are each one sentence — the card can afford it.
                  'type-caption leading-relaxed text-ink-muted'
                )}
              >
                {helper}
              </span>
            ) : null}
          </span>

          <span className="flex shrink-0 items-center gap-2">
            {status ? (
              <span className="hidden sm:inline-flex">
                <StatusChip status={status} />
              </span>
            ) : typeof total === 'number' ? (
              <PointsChip earned={earned ?? 0} total={total} />
            ) : null}
            <span
              aria-hidden="true"
              className={cn(
                'type-caption text-ink-muted transition-transform',
                open && 'rotate-180'
              )}
            >
              ▾
            </span>
          </span>
        </button>
      </h2>
      {validationState ? <p role="status" className={cn('px-4 pb-3 type-helper', validationState === 'attention' ? 'text-alert' : 'text-ok')}>{validationState === 'resolved' ? 'The highlighted checks are resolved.' : validationMessage}</p> : null}

      {open ? (
        <div id={panelId} className="ui-panel-padding border-t border-line p-4 sm:p-5">
          {action ? <div className="ui-action-group mb-4">{action}</div> : null}
          {children}
        </div>
      ) : null}
    </Card>
  )
}

/**
 * Which scored readiness fields each form section is responsible for.
 *
 * This mapping is needed because the readiness groups and the form's blocks are
 * not 1:1 — the "Contact & target" group is split across two sections (targets
 * live in Status & target, contact details in Identity), and the whole Visa
 * readiness group sits inside Identity & contact. Sections with no entry here
 * are genuinely unscored and render "Optional".
 */
const SECTION_FIELDS: Record<string, readonly string[]> = {
  sec_status: ['target_job_title', 'target_country', 'target_industry', 'target_company'],
  sec_identity: [
    'full_name',
    'phone',
    'email',
    'current_location',
    'visa_status',
    'visa_transferable',
    'notice_period',
    'passport_validity_date',
    'nationality',
    'whatsapp',
    'photo_checklist_confirmed',
    'degree_attestation',
    'professional_licence',
    'saudi_verification',
    'arabic_level',
  ],
  sec_license: ['has_driving_license'],
  sec_work_experience: ['work_experience'],
  sec_education: ['education'],
  sec_skills: ['skills'],
  sec_certifications: ['certifications'],
}

/**
 * SECTION IDENTITY — one colour per block of this form.
 *
 * Founder request 2026-09-09: nine identical black headings made a long form
 * hard to navigate. A colour per block means you can tell where you are
 * without reading, and find your way back to a block you half-filled.
 *
 * A DELIBERATE EXCEPTION to Blueprint's one-accent rule, and it holds only
 * because these mean exactly one thing: WHICH BLOCK THIS IS. Never an action,
 * never a status, never a value. `signal` stays the only colour that means
 * "do this" — which is why the title turns to `signal` when a block is open,
 * and to its own hue when it is not.
 *
 * WHAT IS NOT COLOURED, on purpose: every field label, every value, every
 * helper line. Colouring what a person reads and types works against the
 * reading this is meant to help.
 *
 * Written as whole class strings rather than composed at runtime — Tailwind
 * only emits classes it can see literally in the source, and a template
 * literal here would compile to nothing at all.
 */
const SECTION_ACCENT: Record<string, { text: string; chip: string; rule: string }> = {
  sec_status: { text: 'text-ink', chip: 'bg-teal-soft text-teal', rule: 'border-l-teal/20' },
  sec_identity: { text: 'text-ink', chip: 'bg-teal-soft text-teal', rule: 'border-l-teal/20' },
  sec_license: { text: 'text-ink', chip: 'bg-teal-soft text-teal', rule: 'border-l-teal/20' },
  sec_summary: { text: 'text-ink', chip: 'bg-teal-soft text-teal', rule: 'border-l-teal/20' },
  sec_work_experience: { text: 'text-ink', chip: 'bg-teal-soft text-teal', rule: 'border-l-teal/20' },
  sec_education: { text: 'text-ink', chip: 'bg-teal-soft text-teal', rule: 'border-l-teal/20' },
  sec_skills: { text: 'text-ink', chip: 'bg-teal-soft text-teal', rule: 'border-l-teal/20' },
  sec_certifications: { text: 'text-ink', chip: 'bg-teal-soft text-teal', rule: 'border-l-teal/20' },
  sec_additional: { text: 'text-ink', chip: 'bg-teal-soft text-teal', rule: 'border-l-teal/20' },
}

const FORM_SECTIONS: ReadonlyArray<{ id: string; label: string }> = [
  { id: 'sec_status', label: 'Gulf Preferences & Availability' },
  { id: 'sec_identity', label: 'Personal & Contact Details' },
  { id: 'sec_license', label: 'Professional Licences & Approvals' },
  { id: 'sec_summary', label: 'Professional Summary / Career Objective' },
  { id: 'sec_work_experience', label: 'Work experience' },
  { id: 'sec_education', label: 'Education & Qualifications' },
  { id: 'sec_skills', label: 'Skills & Tools' },
  { id: 'sec_certifications', label: 'Certifications & Training' },
  { id: 'sec_additional', label: 'Specialist blocks & custom sections' },
]

// Both are the shared `.field` control (globals.css). They were hand-written
// copies with a 1.64:1 edge — the "all boxes black and white" the founder saw.
const selectClass = 'field'
const textareaClass = 'field'

function ConfirmToggle({
  id,
  label,
  hint,
  checked,
  onChange,
}: {
  id: string
  label: string
  hint?: string
  checked: boolean
  onChange: (v: boolean) => void
}) {
  // Sits in its own tinted row. Bare on the card, a yes/no switch read as one
  // more line of text between two boxes, easy to scroll past unanswered.
  return (
    <div id={id} className="flex items-center justify-between gap-3 rounded-ctl border border-line bg-canvas px-3.5 py-2.5">
      <div className="flex flex-col gap-0.5">
        <span className="field-label">{label}</span>
        {hint ? <span className="field-hint">{hint}</span> : null}
      </div>
      <Toggle checked={checked} onCheckedChange={onChange} aria-label={label} />
    </div>
  )
}

// ---------------------------------------------------------------------------
// Main screen
// ---------------------------------------------------------------------------

function ProfileScreen() {
  const router = useRouter()
  const pathname = usePathname()
  const isReviewRoute = pathname === '/profile/review'
  const isImportRoute = pathname === '/profile/import'
  const [reviewEditing, setReviewEditing] = useState(false)
  const searchParams = useSearchParams()
  // Deep-link intent from the dashboard nudge / CTA (?import=upload|paste) so the
  // matching panel opens on arrival. Absent → the import row shows just its buttons.
  const importParam = searchParams.get('import')
  const initialImportMode = importParam === 'upload' ? 'upload' : importParam === 'paste' ? 'paste' : 'idle'
  const requestedView = viewFromParams(searchParams)
  const [manualEntry, setManualEntry] = useState(searchParams.get('manual') === '1')
  const [importProcessing, setImportProcessing] = useState(false)

  // ---- Moving between the screens (see PROFILE_VIEWS) -----------------------
  // pushState, not router.push: Next syncs useSearchParams with the native
  // history API without a server round trip, and the editor stays mounted.
  const showView = useCallback(
    (next: ProfileView) => {
      if (importProcessing) return
      if (next !== requestedView) window.history.pushState(null, '', `${isReviewRoute ? '/profile/review' : '/profile'}?view=${next}`)
    },
    [requestedView, isReviewRoute, importProcessing],
  )

  const [editor, setEditor] = useState<EditorData | null>(null)
  const [reviewSaved, setReviewSaved] = useState(false)
  const [activeReviewSection, setActiveReviewSection] = useState('sec_identity')
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({})
  const [reviewSourceFile, setReviewSourceFile] = useState<File | string | null>(null)
  const [reviewSourceIdentity, setReviewSourceIdentity] = useState<ReviewSourceIdentity | null>(null)
  const [reviewSourceKind, setReviewSourceKind] = useState<'original' | 'reference' | 'extracted'>('extracted')
  const [reviewSourceUrl, setReviewSourceUrl] = useState<string | null>(null)
  const [mergeOrigin, setMergeOrigin] = useState<{existing: CareerProfileFull; draft: CareerProfileDraft} | null>(null)
  const [mergeMode, setMergeMode] = useState<'add' | 'updates'>('add')
  const [mergeChoices, setMergeChoices] = useState<string[]>([])
  const [ambiguousChoices, setAmbiguousChoices] = useState<Record<number, 'keep' | 'add'>>({})
  const [rowNotice, setRowNotice] = useState('')
  const removedRowRef = useRef<{table:'work_experience'|'education'|'skills'|'certifications';row:EditableWork|EditableEdu|EditableSkill|EditableCert;index:number}|null>(null)
  const reattachSourceRef = useRef<HTMLInputElement>(null)
  const retainReviewSource = useCallback(async (source: File | string) => {
    setReviewSourceFile(source)
    setReviewSourceKind('original')
    try {
      const bytes = typeof source === 'string' ? new TextEncoder().encode(source) : new Uint8Array(await source.arrayBuffer())
      setReviewSourceIdentity({digest: await digestSource(bytes), size: bytes.byteLength})
    } catch { setReviewSourceIdentity(null) }
  }, [])
  useEffect(() => {
    if (!(reviewSourceFile instanceof File)) { setReviewSourceUrl(null); return }
    const url = URL.createObjectURL(reviewSourceFile)
    setReviewSourceUrl(url)
    return () => URL.revokeObjectURL(url)
  }, [reviewSourceFile])

  // Jobs that just received ticked typical duties keep the card for its "press Save" note.
  const [dutiesAdded, setDutiesAdded] = useState<ReadonlySet<string>>(() => new Set())
  const [loaded, setLoaded] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)
  // Imported facts use this same editor and require explicit review acknowledgement.
  const [reviewingImport, setReviewingImport] = useState(false)
  // Intake is a presentation of the same editing session, not a switch to
  // the read-only summary. Keep unsaved facts and staged photos in memory.
  const view = reviewingImport || isImportRoute || importProcessing || Boolean(importParam) ? 'details' : requestedView
  const [acknowledgedReview, setAcknowledgedReview] = useState<string | null>(null)
  const [showImportIssues, setShowImportIssues] = useState(false)
  const importIssueRef = useRef<HTMLElement>(null)
  const [photoChange, setPhotoChange] = useState<File | null | undefined>(undefined)
  const [photoPreview, setPhotoPreview] = useState<string | null>(null)
  const savedSnapshotRef = useRef<EditorData | null>(null)
  useEffect(() => {
    if (!(photoChange instanceof File)) { setPhotoPreview(null); return }
    const url = URL.createObjectURL(photoChange)
    setPhotoPreview(url)
    return () => URL.revokeObjectURL(url)
  }, [photoChange])
  const [submitting, setSubmitting] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  // Computed employment gaps from GET /api/profile (TASK-067). Read-only,
  // display-only, never scored — see lib/employmentGaps.ts's…23110 tokens truncated…neCount === keyCount ? (
            <>All {keyCount} key sections are complete — review anything below.</>
          ) : (
            <>
              <span className="font-semibold text-ink">
                {doneCount} of {keyCount} key sections done.
              </span>{' '}
              Open a step to fill it in. Your work is kept as you move between them.
            </>
          )}
        </p>

        <details className="rounded-card border border-line bg-white p-4"><summary className="min-h-11 cursor-pointer type-label font-semibold text-ink">Find a profile section</summary><nav aria-label="Career Profile blocks" className="mt-3 space-y-3">
          <p className="field-hint">Jump to any section below. Add specialist details only when they apply to you.</p>
          <div className="grid gap-2 sm:grid-cols-2">
            {PROFILE_BLOCKS.map((block, index) => {
              const sections: Record<string, string> = { contact: 'sec_identity', summary: 'sec_summary', experience: 'sec_work_experience', education: 'sec_education', skills: 'sec_skills', training: 'sec_certifications', licences: 'sec_license', gulf: 'sec_status' }
              return <button key={block.id} type="button" className="min-h-11 rounded-ctl border border-line px-3 py-2 text-left type-helper font-semibold text-ink hover:border-teal focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal" onClick={() => goToProfilePart({ sectionId: sections[block.id] ?? 'sec_additional', categoryBlock: sections[block.id] ? undefined : block.id })}>{index + 1}. {block.title}</button>
            })}
          </div>
        </nav></details>

        </> : null}
        {!reviewingImport ? <details open={!reviewingImport || undefined} className="rounded-card border border-line bg-white p-3"><summary className="min-h-11 cursor-pointer type-label">Profile photo — optional</summary><ProfilePhotoDraft photoUrl={photoChange === null ? null : photoPreview ?? (editor.photo_url || null)} busy={submitting} onSelect={setPhotoChange} /></details> : null}

        {/* IDENTITY & CONTACT — the card header opens Profile settings, the
            per-field "what appears on your CV" screen (was /profile/visibility). */}
        <CardSection
          {...sectionProps('sec_identity')} validationState={guidedState('sec_identity')} validationMessage={guidedMessage('sec_identity')}
          title="Personal & Contact Details"
          helper={reviewingImport ? "Name, contact details and personal facts. Edit only what you know." : "Passport, visa and contact details are private to your account, and our team’s access is logged. You choose what appears on your resume."}
          action={
            <button
              type="button"
              onClick={() => { const panel = document.getElementById('profile-visibility') as HTMLDetailsElement | null; if (panel) { panel.open = true; panel.scrollIntoView({ behavior: 'smooth', block: 'start' }) } }}
              className="-mx-1 inline-flex min-h-11 items-center px-1 type-helper font-semibold text-teal underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal"
            >
              What appears on your resume →
            </button>
          }
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <TextField
              id="f_full_name"
              label="Full name"
              required
              placeholder="e.g. Satish Kumar Jaiswal"
              helper="Use your name as it appears on your passport."
              value={editor.full_name}
              onChange={(e) => setField({ full_name: e.target.value })}
              error={invalidFields.has('full_name') && requiredMissing(editor).some(item => item.key === 'full_name') ? 'Full name is required.' : undefined}
              className="sm:col-span-2"
            />
            <PhoneField
              id="f_phone"
              label="Phone"
              required
              error={invalidFields.has('phone') && requiredMissing(editor).some(item => item.key === 'phone') ? 'Enter a valid phone number.' : undefined}
              helper="Pick your country code, then the number without it."
              dial={phoneParts.dial}
              number={phoneParts.number}
              onDialChange={(v) => { setPhoneDraftDial(v); setPhone(v, phoneParts.number) }}
              onNumberChange={(v) => setPhone(phoneParts.dial, v)}
            />
            <div className="space-y-2">
              <p id="whatsapp-choice-label" className="field-label">WhatsApp · optional</p>
              <p className="field-hint">{editor.whatsapp ? editor.whatsapp.replace(/\D/g, '') === editor.phone.replace(/\D/g, '') ? 'Same as your phone number' : editor.whatsapp : 'No WhatsApp number recorded'}</p>
              <div className="ui-choice-group" role="group" aria-labelledby="whatsapp-choice-label">
                <button type="button" className={`${buttonVariants({ variant: 'secondary', size: 'sm' })} ui-choice-button`} aria-pressed={!editWhatsapp && Boolean(editor.whatsapp) && editor.whatsapp.replace(/\D/g, '') === editor.phone.replace(/\D/g, '')} disabled={!editor.phone.trim()} onClick={() => { setField({ whatsapp: editor.phone }); setEditWhatsapp(false); setWhatsappCleared(false) }}>Same as phone</button>
                <button type="button" className={`${buttonVariants({ variant: 'secondary', size: 'sm' })} ui-choice-button`} aria-pressed={editWhatsapp || Boolean(editor.whatsapp) && editor.whatsapp.replace(/\D/g, '') !== editor.phone.replace(/\D/g, '')} onClick={() => { setEditWhatsapp(true); setWhatsappCleared(false) }}>Different number</button>
                <button type="button" className={`${buttonVariants({ variant: 'secondary', size: 'sm' })} ui-choice-button`} aria-pressed={whatsappCleared && !editWhatsapp && !editor.whatsapp} onClick={() => { setField({ whatsapp: '' }); setEditWhatsapp(false); setWhatsappCleared(true) }}>I don’t use WhatsApp</button>
              </div>
              {editWhatsapp ? <>
                <PhoneField
                  id="f_whatsapp"
                  label="Different WhatsApp number"
                  helper="Enter your WhatsApp number with its country code."
                  dial={whatsappParts.dial}
                  number={whatsappParts.number}
                  onDialChange={(v) => { setWhatsappDraftDial(v); setWhatsapp(v, whatsappParts.number) }}
                  onNumberChange={(v) => setWhatsapp(whatsappParts.dial, v)}
                />
                <button type="button" className={buttonVariants({ variant: 'secondary', size: 'sm' })} onClick={() => setEditWhatsapp(false)}>Done</button>
              </> : null}
            </div>
            <TextField
              id="f_email"
              label="Email"
              required
              type="email"
              inputMode="email"
              autoComplete="email"
              placeholder="you@example.com"
              error={invalidFields.has('email') && requiredMissing(editor).some(item => item.key === 'email') ? 'Enter a valid email address.' : undefined}
              helper="Use one you check daily."
              value={editor.email}
              onChange={(e) => setField({ email: e.target.value })}
            />
            <Input tone="light"
              id="f_current_location"
              label="Current location"
              placeholder="e.g. Dammam, Saudi Arabia"
              hint="City and country. Recruiters filter on it."
              value={editor.current_location}
              onChange={(e) => setField({ current_location: e.target.value })}
            />
            <details className="studio-contact-extras sm:col-span-2">
              <summary>Personal & Gulf details</summary><div className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <TextField
                id="f_professional_headline"
                label="Professional headline"
                placeholder="e.g. Senior Mechanical Engineer · Project Delivery"
                maxLength={200}
                helper="Appears beneath your name. Use your own professional title; your application target and employment titles stay separate."
                value={headlineValue}
                onChange={e => updateHeadline(e.target.value)}
              />
              <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
                <label className="flex min-h-11 items-center gap-2 type-helper text-ink-soft">
                  <input type="checkbox" checked={headlineShown} onChange={e => updateHeadline(headlineValue, e.target.checked)} className="size-4 accent-teal" />
                  Show headline beneath my name
                </label>
                {!headlineValue.trim() && editor.work_experience.some(w => w.role.trim()) ? (
                  <button type="button" className="min-h-11 type-helper font-semibold text-teal" onClick={() => updateHeadline(editor.work_experience.find(w => w.role.trim())!.role)}>
                    Use a title from my experience
                  </button>
                ) : null}
              </div>
            </div>
            <Input tone="light"
              id="f_nationality"
              label="Nationality"
              placeholder="e.g. Indian"
              value={editor.nationality}
              onChange={(e) => setField({ nationality: e.target.value })}
            />
            <Input tone="light"
              id="f_linkedin_url"
              label="LinkedIn URL"
              optional
              type="text"
              inputMode="url"
              aria-invalid={editor.linkedin_url.trim() && !validProfileLinkedIn(editor.linkedin_url) ? true : undefined}
              aria-describedby={editor.linkedin_url.trim() && !validProfileLinkedIn(editor.linkedin_url) ? 'linkedin-format-warning' : undefined}
              className={editor.linkedin_url.trim() && !validProfileLinkedIn(editor.linkedin_url) ? 'border-alert' : undefined}
              placeholder="linkedin.com/in/your-name"
              value={editor.linkedin_url}
              onChange={(e) => { setGuidedSections(previous => [...new Set([...previous, 'sec_identity'])]); setField({ linkedin_url: e.target.value }) }}
            />
            {editor.linkedin_url.trim() && !validProfileLinkedIn(editor.linkedin_url) ? <p id="linkedin-format-warning" data-linkedin-warning role="status" className="type-helper text-alert">This does not look like a LinkedIn address. You can keep it and still save your profile.</p> : null}
            <DateField
              id="f_date_of_birth"
              label="Date of birth"
              precision="day"
              helper="Many Gulf employers require this on the resume itself."
              value={editor.date_of_birth}
              onChange={(e) => setField({ date_of_birth: e.target.value })}
            />
            <div className="flex flex-col gap-1.5">
              <FieldLabel htmlFor="f_passport_type">Passport type</FieldLabel>
              <select
                id="f_passport_type"
                className={selectClass}
                value={editor.passport_type}
                onChange={(e) => setField({ passport_type: e.target.value })}
              >
                <option value="">Choose ECR or Non-ECR</option>
                <option value="ECR">ECR</option>
                <option value="Non-ECR">Non-ECR</option>
              </select>
            </div>
            <DateField
              id="f_passport_validity_date"
              label="Passport valid until"
              precision="day"
              helper="Employers check you have enough validity left to process a work visa."
              value={editor.passport_validity_date}
              onChange={(e) => setField({ passport_validity_date: e.target.value })}
            />
            <Input tone="light"
              id="f_visa_status"
              label="Visa status"
              placeholder="e.g. Iqama holder, Visit visa, None"
              value={editor.visa_status}
              onChange={(e) => setField({ visa_status: e.target.value })}
            />
            <Input tone="light"
              id="f_notice_period"
              label="Notice period"
              placeholder="e.g. 30 days, Immediate"
              value={editor.notice_period}
              onChange={(e) => setField({ notice_period: e.target.value })}
            />
            <div className="sm:col-span-2">
              {/* Three answers, not an on/off switch: "not answered" stays empty and
                  prints nothing on the CV (launch audit 2026-10-02). */}
              <FieldLabel htmlFor="f_visa_transferable">Can your visa be transferred to a new employer?</FieldLabel>
              <select
                id="f_visa_transferable"
                className={selectClass}
                value={editor.visa_transferable === null ? '' : editor.visa_transferable ? 'yes' : 'no'}
                onChange={(e) => setField({ visa_transferable: e.target.value === '' ? null : e.target.value === 'yes' })}
              >
                <option value="">Not answered — not shown on my resume</option>
                <option value="yes">Yes, it can be transferred</option>
                <option value="no">No</option>
              </select>
              <p className="mt-1 type-helper leading-snug text-ink-soft">Your Iqama or work visa moving to a new employer without you leaving the country. Shown on your resume only if you answer.</p>
            </div>
            {/* GULF PAPERWORK (Gulf Readiness v2, 2026-10-01, migration 060).
                Optional and private: they drive the readiness verdict and the
                paperwork steps, and never appear on a CV. "Not answered" is
                "not checked" in the verdict, never a failure. */}
            <div className="mt-2 flex flex-col gap-0.5 sm:col-span-2">
              <p className="type-helper font-semibold text-ink">Gulf paperwork</p>
              <p className="type-helper leading-snug text-ink-soft">
                Optional and private — never shown on your resume. Your Gulf Readiness uses it to tell you what is left before an employer can hire you.
              </p>
            </div>
            <div className="flex flex-col gap-1.5">
              <FieldLabel htmlFor="f_degree_attestation">Degree attestation</FieldLabel>
              <select
                id="f_degree_attestation"
                className={selectClass}
                value={editor.degree_attestation}
                onChange={(e) => setField({ degree_attestation: e.target.value })}
              >
                <option value="">Not answered yet</option>
                <option value="done">Attested</option>
                <option value="in_progress">In progress</option>
                <option value="not_started">Not started</option>
                <option value="not_needed">Not needed for my job</option>
              </select>
              <p className="type-helper leading-snug text-ink-muted">Skilled Gulf work permits need your degree attested (home country, then the embassy).</p>
            </div>
            <div className="flex flex-col gap-1.5">
              <FieldLabel htmlFor="f_professional_licence">Professional licence</FieldLabel>
              <select
                id="f_professional_licence"
                className={selectClass}
                value={editor.professional_licence}
                onChange={(e) => setField({ professional_licence: e.target.value })}
              >
                <option value="">Not answered yet</option>
                <option value="done">Licensed or eligible</option>
                <option value="in_progress">Exam or application in progress</option>
                <option value="not_started">Not started</option>
                <option value="not_needed">Not needed for my job</option>
              </select>
              <p className="type-helper leading-snug text-ink-muted">For regulated jobs — nurses, doctors, pharmacists (DHA, DOH, SCFHS…), engineers in Saudi (SCE).</p>
            </div>
            <div className="flex flex-col gap-1.5">
              <FieldLabel htmlFor="f_saudi_verification">Saudi professional verification</FieldLabel>
              <select
                id="f_saudi_verification"
                className={selectClass}
                value={editor.saudi_verification}
                onChange={(e) => setField({ saudi_verification: e.target.value })}
              >
                <option value="">Not answered yet</option>
                <option value="done">Verified / test passed</option>
                <option value="in_progress">In progress</option>
                <option value="not_started">Not started</option>
                <option value="not_needed">Not applying to Saudi</option>
              </select>
              <p className="type-helper leading-snug text-ink-muted">Needed for most Saudi work visas: QVP for qualifications, SVP skills test for trades.</p>
            </div>
            <div className="flex flex-col gap-1.5">
              <FieldLabel htmlFor="f_arabic_level">Arabic</FieldLabel>
              <select
                id="f_arabic_level"
                className={selectClass}
                value={editor.arabic_level}
                onChange={(e) => setField({ arabic_level: e.target.value })}
              >
                <option value="">Not answered yet</option>
                <option value="none">None yet</option>
                <option value="basic">Basic</option>
                <option value="conversational">Conversational</option>
                <option value="fluent">Fluent</option>
                <option value="native">Native</option>
              </select>
              <p className="type-helper leading-snug text-ink-muted">A plus for many Gulf roles — basic counts too.</p>
            </div>
            {editor.photo_url ? (
              <div className="sm:col-span-2">
                <ConfirmToggle
                  id="f_photo_checklist_confirmed"
                  label="My photo is professional"
                  hint={`${PHOTO_CHECKLIST.join(' · ')}. Most Gulf employers expect a professional photo on the resume.`}
                  checked={editor.photo_checklist_confirmed}
                  onChange={(v) => setField({ photo_checklist_confirmed: v })}
                />
              </div>
            ) : null}
              </div>
            </details>
          </div>
        </CardSection>

        {/* DRIVING LICENSE — TASK-068. Grouped with the Passport/Visa fields
            (the same identity-and-relocation grouping). has_driving_license is
            a genuine tri-state: null = not answered, true = yes, false = explicit
            no. The select must NOT default the unanswered state to a coerced
            "no" (docs/GCC_READINESS_JOB_MATCH.md §5). Readiness/Match input only
            — deliberately no field_visibility toggle (TASK-067 scope decision). */}
        <CardSection
          {...sectionProps('sec_license')} validationState={guidedState('sec_license')} validationMessage={guidedMessage('sec_license')}
          title="Professional Licences & Approvals"
          helper="Record relevant licences and approvals only. Add professional registrations and client approvals in the specialist blocks below."
        >
          <button type="button" className={buttonVariants({ variant: 'secondary', size: 'sm' })} onClick={() => goToProfilePart({ sectionId: 'sec_additional', categoryBlock: 'licences' })}>Add or review professional registrations & approvals</button>
          <div className="mt-4 flex flex-col gap-1.5">
            <FieldLabel htmlFor="f_has_driving_license">Do you have a driving license?</FieldLabel>
            <select
              id="f_has_driving_license"
              className={selectClass}
              value={editor.has_driving_license === null ? '' : editor.has_driving_license ? 'yes' : 'no'}
              onChange={(e) =>
                setField({
                  has_driving_license: e.target.value === '' ? null : e.target.value === 'yes',
                })
              }
            >
              <option value="">Not answered yet</option>
              <option value="yes">Yes</option>
              <option value="no">No</option>
            </select>
          </div>
          {editor.has_driving_license === true ? (
            <div className="grid gap-3">
              <Input tone="light"
                id="f_driving_license_country"
                label="Country issued"
                placeholder="e.g. Saudi Arabia, India"
                value={editor.driving_license_country}
                onChange={(e) => setField({ driving_license_country: e.target.value })}
              />
              <Input tone="light"
                id="f_driving_license_category"
                label="Category / type"
                placeholder="e.g. Light vehicle"
                value={editor.driving_license_category}
                onChange={(e) => setField({ driving_license_category: e.target.value })}
              />
              <DateField
                id="f_driving_license_validity_date"
                label="Valid until"
                precision="day"
                value={editor.driving_license_validity_date}
                onChange={(e) => setField({ driving_license_validity_date: e.target.value })}
              />
            </div>
          ) : null}
        </CardSection>

        {/* PROFESSIONAL SUMMARY — the user's OWN summary, source of the diff */}
        <CardSection
          {...sectionProps('sec_summary')} validationState={guidedState('sec_summary')} validationMessage={guidedMessage('sec_summary')}
          title="Professional Summary / Career Objective"
          helper="The first thing a recruiter reads. Two or three sentences — the optimizer reframes it per job, never changing your facts."
        >
          <textarea
            id="f_professional_summary"
            className={cn(textareaClass, 'min-h-[110px]')}
            rows={5}
            value={editor.professional_summary}
            onChange={(e) => setField({ professional_summary: e.target.value })}
            placeholder="A short summary of who you are and what you bring."
          />
          <p className="field-hint">
            This stays yours — the AI never writes into it. When you build a resume for a job, you see
            your words and the new ones side by side.
          </p>
        </CardSection>

        {/* WORK EXPERIENCE */}
        <CardSection
          {...sectionProps('sec_work_experience')} validationState={guidedState('sec_work_experience')} validationMessage={guidedMessage('sec_work_experience')}
          title="Work experience"
          helper="Jobs, internships, apprenticeships, freelance and self-employment. Keep the actual employer separate from the client or project in your description."
          badge={editor.work_experience.length ? `${editor.work_experience.length} found` : undefined}
          action={
              <button
                type="button"
                onClick={addWork}
                className={buttonVariants({ variant: 'ghost', size: 'sm' })}
              >
                <span aria-hidden="true">+</span> Add
              </button>
            }
        >
          <div className="flex flex-col gap-4">
            {(reviewingImport ? editor.work_experience : sortedWorkRoles(editor.work_experience)).map((w, i) => (
              <WorkExperienceItem key={w.key} role={w} number={i + 1} open={expandedWorkKey === w.key} onToggle={() => setExpandedWorkKey(key => key === w.key ? null : w.key)}>
                <div className="flex items-center justify-between">
                  <span className="type-helper font-semibold text-sec-experience">
                    {w.role.trim() || `Role ${i + 1}`}
                  </span>
                  {rowActions('work_experience', w.key, w.role || w.company || `Role ${i + 1}`, i)}
                </div>
                <Input id={`f_work_role_${w.key}`} tone="light" label="Role" placeholder="e.g. Senior Instrument Engineer" value={w.role} onChange={(e) => setEditor((s) => s && ({ ...s, work_experience: updateList(s.work_experience, w.key, { role: e.target.value }) }))} />
                <Input id={`f_work_experience_${w.key}_company`} tone="light" label="Employer / your business" placeholder="e.g. Bechtel · use Self-employed if applicable" value={w.company} onChange={(e) => setEditor((s) => s && ({ ...s, work_experience: updateList(s.work_experience, w.key, { company: e.target.value }) }))} />
                <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                  <PrecisionDateField id={`f_work_start_${w.key}`} label="Start" value={w.start_date} precision={w.start_date_precision} onChange={(value, precision) => setEditor((s) => s && ({ ...s, work_experience: updateList(s.work_experience, w.key, { start_date: value, start_date_precision: precision }) }))} />
                  <PrecisionDateField id={`f_work_end_${w.key}`} label="End" helper="If the end date is unknown, keep it blank. Confirm a current role separately." value={w.end_date} precision={w.end_date_precision} onChange={(value, precision) => setEditor((s) => s && ({ ...s, work_experience: updateList(s.work_experience, w.key, { end_date: value, end_date_precision: precision, end_date_unconfirmed: !value }) }))} />
                </div>
                {w.end_date_unconfirmed && !w.end_date && <div className="rounded-ctl border border-alert bg-alert-soft p-3 text-alert"><p className="type-helper">Current or ended status needs an update. Add the end date above, or confirm this is your current role.</p><button type="button" className={buttonVariants({variant:'secondary',size:'sm'})} onClick={() => setEditor(s => s && ({...s,work_experience:updateList(s.work_experience,w.key,{end_date_unconfirmed:false})}))}>This is my current role</button></div>}
                <Input tone="light" label="Location" placeholder="e.g. Abu Dhabi, UAE" value={w.location} onChange={(e) => setEditor((s) => s && ({ ...s, work_experience: updateList(s.work_experience, w.key, { location: e.target.value }) }))} />
                <div className="flex flex-col gap-1.5">
                  <FieldLabel htmlFor={`f_work_gcc_${w.key}`}>Was this role in the Gulf?</FieldLabel>
                  <select
                    id={`f_work_gcc_${w.key}`}
                    className={selectClass}
                    value={w.gcc_country}
                    onChange={(e) =>
                      setEditor((s) => s && ({ ...s, work_experience: updateList(s.work_experience, w.key, { gcc_country: e.target.value }) }))
                    }
                  >
                    <option value="">Not GCC-based</option>
                    {GULF_COUNTRIES.map((c) => (
                      <option key={c.value} value={c.value}>
                        {c.label}
                      </option>
                    ))}
                  </select>
                </div>
                {w.role.trim() && !w.description.trim() && (!w.highlights.trim() || dutiesAdded.has(w.key)) ? (
                  <TypicalDuties
                    role={w.role.trim()}
                    onAdd={(lines) => {
                      setDutiesAdded((set) => new Set(set).add(w.key))
                      setEditor((s) => s && ({ ...s, work_experience: updateList(s.work_experience, w.key, { highlights: lines.join('\n') }) }))
                    }}
                  />
                ) : null}
                <label className="flex flex-col gap-1.5">
                  <span className="field-label">Work context & responsibilities</span>
                  <textarea
                    rows={3}
                    className={textareaClass}
                    id={`f_work_experience_${w.key}_description`}
                    placeholder="Include employment type (e.g. internship or freelance), client/project where relevant, and what you actually did."
                    value={w.description}
                    onChange={(e) => setEditor((s) => s && ({ ...s, work_experience: updateList(s.work_experience, w.key, { description: e.target.value }) }))}
                  />
                </label>
                <label className="flex flex-col gap-1.5">
                  <span className="field-label">Key results</span>
                  <textarea
                    rows={3}
                    className={textareaClass}
                    placeholder={'One per line, e.g.\nCut rework by 18% with a new isometric check\nZero LTI across 1.2M man-hours'}
                    id={`f_work_experience_${w.key}_highlights`}
                    value={w.highlights}
                    onChange={(e) => setEditor((s) => s && ({ ...s, work_experience: updateList(s.work_experience, w.key, { highlights: e.target.value }) }))}
                  />
                  <span className="field-hint">One result per line. Numbers get noticed.</span>
                </label>
              </WorkExperienceItem>
            ))}
            <AddRowButton label="Add another role" onClick={addWork} />
          </div>
        </CardSection>

        {/* EMPLOYMENT GAPS — read-only display from GET /api/profile's
            `employment_gaps` (TASK-067). Informational only — no score, no
            penalty, no red/green indicator; see lib/employmentGaps.ts's header.
            An empty array renders nothing (silence is correct here, not a
            manufactured "no gaps!"). */}
        {employmentGapsStatus === 'insufficient_precision' ? <p className="rounded-lg border border-line bg-white p-3 type-helper text-ink-soft">Employment-gap dates cannot be established from the available date precision. This does not mean there are no gaps, and it is not scored.</p> : null}
        {employmentGaps.length > 0 ? (
          <div className="flex flex-col gap-2 rounded-ctl border border-line/70 bg-white px-3.5 py-3">
            <span className="type-caption font-semibold text-ink-soft">
              Employment gaps &mdash; just for your awareness
            </span>
            {employmentGaps.map((g, i) => (
              <p key={i} className="type-helper leading-snug text-ink-muted">
                We noticed a {g.gapMonths}-month gap between {g.precedingCompany || 'a previous role'} and{' '}
                {g.followingCompany || 'your next role'}. This isn&rsquo;t scored &mdash; just something to be aware of.
              </p>
            ))}
          </div>
        ) : null}

        {/* EDUCATION */}
        <CardSection
          {...sectionProps('sec_education')} validationState={guidedState('sec_education')} validationMessage={guidedMessage('sec_education')}
          title="Education & Qualifications"
          helper="Include the awarding institution — employers often verify it."
          badge={editor.education.length ? `${editor.education.length} found` : undefined}
          action={
              <button
                type="button"
                onClick={addEducation}
                className={buttonVariants({ variant: 'ghost', size: 'sm' })}
              >
                <span aria-hidden="true">+</span> Add
              </button>
            }
        >
          <div className="flex flex-col gap-3">
            {editor.education.map((x, i) => (
              <div key={x.key} className="ui-mobile-flat flex flex-col gap-3 rounded-ctl border border-line bg-white p-3.5 shadow-m-1">
                <div className="flex items-center justify-between">
                  <span className="type-helper font-semibold text-sec-education">
                    {x.degree.trim() || `Qualification ${i + 1}`}
                  </span>
                  {rowActions('education', x.key, x.degree || `Qualification ${i + 1}`, i)}
                </div>
                <Input id={`f_education_${x.key}_degree`} tone="light" label="Degree" placeholder="e.g. B.Tech" value={x.degree} onChange={(e) => setEditor((s) => s && ({ ...s, education: updateList(s.education, x.key, { degree: e.target.value }) }))} />
                <Input id={`f_education_${x.key}_institution`} tone="light" label="Institution" placeholder="e.g. UPTU" value={x.institution} onChange={(e) => setEditor((s) => s && ({ ...s, education: updateList(s.education, x.key, { institution: e.target.value }) }))} />
                <Input tone="light" label="Field of study / study status" placeholder="e.g. Electronics · Ongoing, expected 2027" value={x.field_of_study} onChange={(e) => setEditor((s) => s && ({ ...s, education: updateList(s.education, x.key, { field_of_study: e.target.value }) }))} />
                <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                  <Input id={`f_education_${x.key}_start_year`} tone="light" label="Start year" inputMode="numeric" placeholder="2005" value={x.start_year} onChange={(e) => setEditor((s) => s && ({ ...s, education: updateList(s.education, x.key, { start_year: e.target.value }) }))} />
                  <Input id={`f_education_${x.key}_end_year`} tone="light" label="End year" inputMode="numeric" placeholder="2009" value={x.end_year} onChange={(e) => setEditor((s) => s && ({ ...s, education: updateList(s.education, x.key, { end_year: e.target.value }) }))} />
                </div>
              </div>
            ))}
            <AddRowButton label="Add another qualification" onClick={addEducation} />
          </div>
          <button type="button" className={buttonVariants({ variant: 'ghost', size: 'sm' })} onClick={() => goToProfilePart({ sectionId: 'sec_additional', categoryBlock: 'education' })}>Add or review additional education or study-status details</button>
        </CardSection>

        {/* SKILLS */}
        <CardSection
          {...sectionProps('sec_skills')} validationState={guidedState('sec_skills')} validationMessage={guidedMessage('sec_skills')}
          title="Skills & Tools"
          helper="Only what you actually worked with. The optimizer reorders these per job, never adds to them."
          badge={editor.skills.length ? `${editor.skills.length} found` : undefined}
          action={
              <button
                type="button"
                onClick={addSkill}
                className={buttonVariants({ variant: 'ghost', size: 'sm' })}
              >
                <span aria-hidden="true">+</span> Add
              </button>
            }
        >
          <div className="flex flex-col gap-2">
            {editor.skills.map((s, i) => (
              <div key={s.key} className="flex flex-wrap items-center gap-2">
                <span className="w-5 shrink-0 text-right type-caption font-semibold text-sec-skills">{i + 1}</span>
                <Input tone="light" id={`f_skills_${s.key}_name`}
                  value={s.name}
                  placeholder="e.g. Piping stress analysis (CAESAR II)"
                  aria-label={`Skill ${i + 1}`}
                  onChange={(e) => setEditor((st) => st && ({ ...st, skills: updateList(st.skills, s.key, { name: e.target.value }) }))}
                />
                {rowActions('skills', s.key, s.name || `Skill ${i + 1}`, i)}
              </div>
            ))}
            <AddRowButton label="Add another skill" onClick={addSkill} />
          </div>
          <button type="button" className={buttonVariants({ variant: 'ghost', size: 'sm' })} onClick={() => goToProfilePart({ sectionId: 'sec_additional', categoryBlock: 'skills' })}>Add or review software and system details</button>
        </CardSection>

        {/* CERTIFICATIONS */}
        <CardSection
          {...sectionProps('sec_certifications')} validationState={guidedState('sec_certifications')} validationMessage={guidedMessage('sec_certifications')}
          title="Certifications & Training"
          helper="Certificates, short courses and vocational training. Add the provider and dates when known; never invent an expiry."
          badge={editor.certifications.length ? `${editor.certifications.length} found` : undefined}
          action={
              <button
                type="button"
                onClick={addCertification}
                className={buttonVariants({ variant: 'ghost', size: 'sm' })}
              >
                <span aria-hidden="true">+</span> Add
              </button>
            }
        >
          <div className="flex flex-col gap-3">
            {editor.certifications.map((c, i) => (
              <div key={c.key} className="ui-mobile-flat flex flex-col gap-3 rounded-ctl border border-line bg-white p-3.5 shadow-m-1">
                <div className="flex items-center justify-between">
                  <span className="type-helper font-semibold text-sec-certifications">
                    {c.name.trim() || `Certification ${i + 1}`}
                  </span>
                  {rowActions('certifications', c.key, c.name || `Certificate ${i + 1}`, i)}
                </div>
                <Input id={`f_certifications_${c.key}_name`} tone="light" label="Name" placeholder="e.g. Functional Safety (IEC 61511)" value={c.name} onChange={(e) => setEditor((s) => s && ({ ...s, certifications: updateList(s.certifications, c.key, { name: e.target.value }) }))} />
                <Input tone="light" label="Issuer" placeholder="e.g. TÜV Rheinland" value={c.issuer} onChange={(e) => setEditor((s) => s && ({ ...s, certifications: updateList(s.certifications, c.key, { issuer: e.target.value }) }))} />
                <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                  <PrecisionDateField id={`f_cert_issue_${c.key}`} label="Issued" value={c.issue_date} precision={c.issue_date_precision} onChange={(value, precision) => setEditor((s) => s && ({ ...s, certifications: updateList(s.certifications, c.key, { issue_date: value, issue_date_precision: precision }) }))} />
                  <PrecisionDateField id={`f_cert_expiry_${c.key}`} label="Expires" value={c.expiry_date} precision={c.expiry_date_precision} onChange={(value, precision) => setEditor((s) => s && ({ ...s, certifications: updateList(s.certifications, c.key, { expiry_date: value, expiry_date_precision: precision }) }))} />
                </div>
              </div>
            ))}
            <AddRowButton label="Add another certificate or training course" onClick={addCertification} />
          </div>
          <button type="button" className={buttonVariants({ variant: 'ghost', size: 'sm' })} onClick={() => goToProfilePart({ sectionId: 'sec_additional', categoryBlock: 'training' })}>Add or review additional training details</button>
        </CardSection>

        {/* STATUS & TARGET */}
        <CardSection
          {...sectionProps('sec_status')} validationState={guidedState('sec_status')} validationMessage={guidedMessage('sec_status')}
          title="Gulf Preferences & Availability"
          helper="Your target roles, countries and current situation. Availability, passport and visa details are recorded in Personal & Contact Details below."
        >
          <button type="button" className={buttonVariants({ variant: 'ghost', size: 'sm' })} onClick={() => goToProfilePart({ sectionId: 'sec_additional', categoryBlock: 'gulf' })}>Add or review availability and preference details</button>
          <ConfirmToggle
            id="f_currently_in_gulf"
            label="I live and work in the Gulf now"
            hint="Turn on if you are in a GCC country today. It changes what your score rewards."
            checked={editor.currently_in_gulf}
            onChange={(v) => setField({ currently_in_gulf: v })}
          />
          <div className="grid gap-4">
            <Input tone="light"
              id="f_target_job_title"
              label="Job Title You’re Applying For"
              placeholder="e.g. Senior Piping Engineer"
              hint="The role you want next. Every resume you build is aimed at it."
              value={editor.target_job_title}
              onChange={(e) => setField({ target_job_title: e.target.value })}
              error={invalidFields.has('target_job_title') && requiredMissing(editor).some(item => item.key === 'target_job_title') ? 'Job Title You’re Applying For is required.' : undefined}
            />
            <Input tone="light"
              id="f_target_industry"
              label="Target industry"
              placeholder="e.g. Oil & Gas, Power, Construction"
              value={editor.target_industry}
              onChange={(e) => setField({ target_industry: e.target.value })}
              error={invalidFields.has('target_industry') && requiredMissing(editor).some(item => item.key === 'target_industry') ? 'Target industry is required.' : undefined}
            />
            <div className="flex flex-col gap-1.5">
              <FieldLabel htmlFor="f_target_country" optional>
                Target country
              </FieldLabel>
              <select
                id="f_target_country"
                className={selectClass}
                value={editor.target_country}
                onChange={(e) => setField({ target_country: e.target.value })}
              >
                <option value="" disabled>
                  Choose a country
                </option>
                {GULF_COUNTRIES.map((c) => (
                  <option key={c.value} value={c.value}>
                    {c.label}
                  </option>
                ))}
              </select>
            </div>
            <Input tone="light"
              id="f_target_company"
              label="Target company"
              optional
              placeholder="e.g. Saudi Aramco"
              value={editor.target_company}
              onChange={(e) => setField({ target_company: e.target.value })}
            />
            <Input tone="light"
              id="f_current_employer"
              label="Current employer"
              optional
              placeholder="e.g. Larsen & Toubro"
              value={editor.current_employer}
              onChange={(e) => setField({ current_employer: e.target.value })}
            />
            <Input tone="light"
              id="f_current_project"
              label="Current project"
              optional
              placeholder="e.g. Jafurah Gas Plant, Phase 2"
              value={editor.current_project}
              onChange={(e) => setField({ current_project: e.target.value })}
            />
          </div>
        </CardSection>

        <CardSection {...sectionProps('sec_additional')} validationState={guidedState('sec_additional')} validationMessage={guidedMessage('sec_additional')} title="Specialist blocks & custom sections" helper="Projects, languages, awards, activities, research and professional links. Your original headings stay intact.">
          <ProfileBlockCategories reservedEntries={editor.additional_information.filter(row => isHeadlineEntry(row) || row.category_name === 'Preparation details (private)')} value={editor.additional_information.filter(row => !isHeadlineEntry(row) && row.category_name !== 'Preparation details (private)')} onChange={(rows) => setEditor(e => e && ({ ...e, additional_information: [...rows, ...e.additional_information.filter(row => isHeadlineEntry(row) || row.category_name === 'Preparation details (private)')] }))} />
        </CardSection>
      </div>

      {reviewingImport ? <details open={!reviewingImport || undefined} className="rounded-card border border-line bg-white p-3"><summary className="min-h-11 cursor-pointer type-label">Profile photo — optional</summary><ProfilePhotoDraft photoUrl={photoChange === null ? null : photoPreview ?? (editor.photo_url || null)} busy={submitting} onSelect={setPhotoChange} /></details> : null}
      <details id="profile-visibility" className="mx-3 my-4 rounded-card border border-line bg-white sm:mx-5" open={searchParams.get('view') === 'settings'}><summary className="min-h-11 cursor-pointer p-4 type-label font-semibold text-ink">Resume visibility</summary>{visibilityFilled ? <CvVisibilitySettings value={editor.field_visibility} filled={visibilityFilled} onChange={setVisibility} /> : null}</details>
      </fieldset>
      {!reviewingImport ? saveBar : null}
      <div className="pb-8" />
    </EditorContainer></>
  )
  if (!reviewingImport) return editorContent
  const dateErrors = invalidEditorDates(editor)
  const invalidCount = reviewPlan.invalid.length + dateErrors.length
  const unresolved = reviewChecks.filter(check => check.status === 'attention').length + editor.work_experience.filter(row => row.start_date && row.start_date_precision === null || row.end_date && row.end_date_precision === null).length
  const source = typeof reviewSourceFile === 'string' ? <pre>{reviewSourceFile}</pre> : reviewSourceFile && reviewSourceUrl ? <div><p>{reviewSourceFile.name}</p><a href={reviewSourceUrl} target="_blank" rel="noreferrer">Open attached source</a>{reviewSourceFile.type === 'application/pdf' ? <iframe title="Attached resume source" src={reviewSourceUrl} className="mt-3 h-[65vh] w-full" /> : null}</div> : <pre>{JSON.stringify(mergeOrigin ? buildPutBody(fromDraft(mergeOrigin.draft)) : originalReviewRef.current ? buildPutBody(originalReviewRef.current) : {}, null, 2)}</pre>
  const focusInvalid = () => {
    const date = dateErrors[0]
    if (date) goToProfilePart({sectionId: date.sectionId, field: date.field})
    else if (reviewPlan.invalid[0]) goToReviewField(reviewPlan.invalid[0].field)
    else guideToFirstIssue()
  }
  const reviewOrder = ['sec_identity','sec_summary','sec_work_experience','sec_education','sec_certifications','sec_skills','sec_additional','sec_status']
  const reviewSections = reviewOrder.map(id=>FORM_SECTIONS.find(section=>section.id===id)!).map(section => ({id: section.id, title: section.label, summary: section.id === 'sec_work_experience' ? `${editor.work_experience.length} roles` : section.id === 'sec_certifications' ? `${editor.certifications.length} certificates` : undefined, status: statusOf(section.id) === 'attention' || statusOf(section.id) === 'missing' ? 'attention' as const : statusOf(section.id) === 'optional' ? 'optional' as const : 'complete' as const}))
  return <ProfileReviewWorkspace candidateName={editor.full_name} sections={reviewSections} activeSectionId={activeReviewSection} manualEntry={manualEntry && !importReview} onSectionChange={id => goToProfilePart({sectionId: id})} unresolvedCount={unresolved} onUnresolved={focusInvalid} confirmed={importConfirmed} onConfirm={setImportConfirmed} busy={submitting} error={saveError ?? loadError} saveDisabled={Boolean(loadError) || invalidCount > 0 || unresolvedAmbiguities.length > 0} onSave={() => saveChanges(true)} onCancel={cancelEditing} recoveryNotice={recoveryNotice} changesSummary={<>{unresolvedAmbiguities.length ? <button type="button" className="min-h-11 underline" onClick={()=>document.getElementById('v4-proposed-updates')?.focus()}>Resolve {unresolvedAmbiguities.length} possible repeated roles</button> : null}<p>Only the details shown in this workspace will be saved. Missing and uncertain facts stay unconfirmed.</p>{invalidCount ? <button type="button" className="min-h-11 underline" onClick={focusInvalid}>Correct {invalidCount} invalid {invalidCount === 1 ? 'value' : 'values'}</button> : null}{rowNotice ? <p role="status">{rowNotice}</p> : null}{removedRowRef.current ? <button type="button" className="min-h-11 underline" onClick={() => {const removed=removedRowRef.current; if(removed)setEditor(previous=>{if(!previous)return previous;const rows=[...previous[removed.table]];if(!rows.some(row=>row.key===removed.row.key))rows.splice(Math.min(removed.index,rows.length),0,removed.row);return {...previous,[removed.table]:rows}}); removedRowRef.current=null; setRowNotice('Removal undone.')}}>Undo last removal</button> : null}<button type="button" className="min-h-11 underline" onClick={() => {if (originalReviewRef.current && window.confirm('Undo your review edits and restore the original extracted draft?')) setEditor(originalReviewRef.current)}}>Undo review edits</button></>} source={source} sourceLabel={reviewSourceFile ? reviewSourceKind === 'reference' ? 'Reference file' : 'Original resume' : manualEntry && !importReview ? 'Your starting draft' : 'Originally extracted details'} sourceNotice={reviewSourceKind === 'reference' ? 'This file could not be matched to the original source. Use it as a reference only.' : !reviewSourceFile && manualEntry && !importReview ? 'This is your starting manual draft. No resume file was used.' : !reviewSourceFile ? 'These are the originally extracted fields, not the original PDF. Reattach the original file to compare.' : 'This source is separate from your edits. It does not automatically confirm any fact.'} onSourceReattach={() => reattachSourceRef.current?.click()}>
    <input hidden ref={reattachSourceRef} type="file" accept=".pdf,.docx,.txt" onChange={async event => {const file=event.target.files?.[0]; if(!file)return; setReviewSourceFile(file); try {const bytes=new Uint8Array(await file.arrayBuffer()); const identity={digest:await digestSource(bytes),size:bytes.byteLength}; setReviewSourceKind(identifyReattachedSource(reviewSourceIdentity,identity))} catch {setReviewSourceKind('reference')} event.target.value=''}} />
    {mergePanel}
    {editorContent}
  </ProfileReviewWorkspace>
}

// No useSearchParams here, but keep a Suspense boundary out of habit so future
// query-param usage (e.g. highlight hints from onboarding) can't trip the
// next.js CSR-bailout during static generation.
export default function ProfilePage() {
  return (
    <>
      <Suspense>
        <ProfileScreen />
      </Suspense>
    </>
  )
}
