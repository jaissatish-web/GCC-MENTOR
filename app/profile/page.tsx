'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import { Button, buttonVariants } from '@/components/ui/Button'
import { AppShell } from '@/components/layout/AppShell'
import { Input } from '@/components/ui/Input'
import { Card } from '@/components/ui/Card'
import ReadinessRing from '@/components/ui/ReadinessRing'
import { Toggle } from '@/components/ui/Toggle'
import { PhotoUpload } from '@/components/profile/PhotoUpload'
import { cn } from '@/lib/utils'
import { GULF_COUNTRIES } from '@/lib/utils'
import { CAREER_PROFILE_DRAFT_KEY, CLAIMED_SCAN_RESULT_KEY } from '@/lib/onboardingDraft'
import { mergeDraftIntoProfile, describeReplaceLosses } from '@/lib/profileMerge'
import { DEFAULT_FIELD_VISIBILITY } from '@/lib/fieldVisibility'
import { calculateReadiness, fieldPointsFor, type ReadinessResult } from '@/lib/readiness'
import { toDateInputValue, toMonthInputValue } from '@/lib/partialDates'
import { splitPhone, joinPhone } from '@/lib/phone'
import { TextField, TextAreaField, SelectField, DateField, PhoneField } from '@/components/ui/FormField'
import type { ReadinessCategory, PassportType } from '@/types/careerProfile'
import type { CareerProfileDraft, CareerProfileFull, FieldVisibility } from '@/types/careerProfile'
import type { AtsScoreResult } from '@/lib/ai/atsScorePrompt'

/**
 * Career Profile review screen — screen 04 (TASK-024), route /profile.
 *
 * One editor UI serving all three onboarding paths (docs/CAREER_PROFILE.md §4).
 * Converged with a single full-object PUT — there is no separate "confirmed"
 * flag in the schema; "Save & exit" and "Confirm profile" both write the same
 * full CareerProfile and differ only in where they navigate afterwards.
 *
 * READINESS HEADER: the ring is the header, not a widget (docs/USER_FLOW.md
 * Step 4). "Finish these to reach 100" items come straight from
 * calculateReadiness().missing (TASK-014, approved) — each taps to and focuses
 * its field INLINE on this same screen, never a route to another page.
 *
 * DATA FLOW (per founder/CTO resolved contract):
 *   1. On mount, if sessionStorage[CAREER_PROFILE_DRAFT_KEY] (TASK-023 handoff)
 *      is present, pre-fill the editor from it and clear the key.
 *   2. Otherwise (no draft) we still load any previously-saved profile via
 *      GET /api/profile so "edit existing" works — a returning user must not
 *      see an empty editor, or their next full-object PUT would silently wipe
 *      their saved data. A 404 (start-from-scratch, never saved) → empty editor.
 *   3. NOTHING is written on page load. Only the two footer buttons PUT, and
 *      they always PUT the FULL profile object (Unplanned #7 contract): both
 *      call the same save; "Save & exit" → /dashboard, "Confirm profile" →
 *      /optimize/target.
 *
 * PHOTO STUB (contract point 5): screen 04 shows "Upload photo" / "Take one
 * now", but NO code in this repo creates a Supabase Storage object (confirmed
 * in TASK-037) and there is no POST /api/profile/photo route yet. The card is
 * built per the mockup, but the two buttons are a DISABLED "coming soon" stub —
 * they must never fire a network call. Whoever builds photo upload later must
 * wire the real upload + Supabase Storage object here, and must thread cleanup
 * into components/settings/DeleteDataSection.tsx (the same gap TASK-037
 * flagged): photo_url lives on career_profiles but the binary object it points
 * to lives in Storage.
 */

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

interface EditableAdditional {
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
  visa_transferable: boolean
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
  field_visibility: FieldVisibility
  work_experience: EditableWork[]
  skills: EditableSkill[]
  certifications: EditableCert[]
  education: EditableEdu[]
  additional_information: EditableAdditional[]
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
    visa_transferable: false,
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
    // Month precision — see lib/partialDates.ts. A <input type="date"> silently
    // blanked anything without a day, which is most of what resumes contain.
    start_date: toMonthInputValue(w.start_date),
    end_date: toMonthInputValue(w.end_date),
    location: str(w.location),
    description: str(w.description),
    highlights: Array.isArray(w.highlights) ? (w.highlights as unknown[]).map(str).join('\n') : '',
    gcc_country: str(w.gcc_country),
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
    issue_date: toMonthInputValue(c.issue_date),
    expiry_date: toMonthInputValue(c.expiry_date),
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
  }
}

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
    visa_transferable: d.visa_transferable ?? false,
    notice_period: str(d.notice_period),
    current_location: str(d.current_location),
    phone: str(d.phone),
    whatsapp: str(d.whatsapp),
    email: str(d.email),
    linkedin_url: str(d.linkedin_url),
    professional_summary: str(d.professional_summary),
    work_experience: (d.work_experience ?? []).map(ws),
    skills: (d.skills ?? []).map(sk),
    certifications: (d.certifications ?? []).map(ce),
    education: (d.education ?? []).map(ed),
    additional_information: (d.additional_information ?? []).map(ai),
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
    visa_transferable: p.visa_transferable === true,
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
    field_visibility: { ...DEFAULT_FIELD_VISIBILITY, ...(p.field_visibility ?? {}) },
    work_experience: (p.work_experience ?? []).map(ws),
    skills: (p.skills ?? []).map(sk),
    certifications: (p.certifications ?? []).map(ce),
    education: (p.education ?? []).map(ed),
    additional_information: (p.additional_information ?? []).map(ai),
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

function buildPutBody(e: EditorData): Record<string, unknown> {
  const parent: Record<string, unknown> = {
    currently_in_gulf: e.currently_in_gulf,
    current_employer: optNull(e.current_employer),
    current_project: optNull(e.current_project),
    target_job_title: e.target_job_title,
    target_industry: e.target_industry,
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
    field_visibility: e.field_visibility,
  }

  const work_experience: Array<Record<string, unknown>> = e.work_experience.map((w, i) => {
    const row: Record<string, unknown> = {
      company: w.company,
      role: w.role,
      start_date: w.start_date,
      end_date: optNull(w.end_date),
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
      issue_date: optNull(c.issue_date),
      expiry_date: optNull(c.expiry_date),
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

  const additional_information = e.additional_information.map((a, i) => {
    const row: Record<string, unknown> = { label: a.label, value: a.value, sort_order: i }
    if (typeof a.id === 'string' && a.id !== '') row.id = a.id
    return row
  })

  return { ...parent, work_experience, skills, certifications, education, additional_information }
}

// ---------------------------------------------------------------------------
// Required-field validation (PUT 400s without these — validate client-side too
// so the user gets a readable error instead of a bare server 400).
// ---------------------------------------------------------------------------

// target_country deliberately absent (migration 030, founder decision
// 2026-08-10) — it never actually changed CV format or generation
// behavior, so requiring it was misleading. It's still an editable field
// below and still contributes to the readiness score if filled
// (lib/readiness.ts), same standing as target_company and current_location.
const REQUIRED_LABELS: Array<[keyof EditorData, string]> = [
  ['full_name', 'Full name'],
  ['phone', 'Phone'],
  ['email', 'Email'],
  ['target_job_title', 'Target job title'],
  ['target_industry', 'Target industry'],
]

function requiredMissing(e: EditorData): Array<{ key: keyof EditorData; label: string }> {
  const missing: Array<{ key: keyof EditorData; label: string }> = []
  for (const [k, label] of REQUIRED_LABELS) {
    if (typeof e[k] === 'string' && String(e[k]).trim() === '') missing.push({ key: k, label })
  }
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
    rest: 'get shortlisted more often when visa details are complete.',
  },
  fresher: {
    highlight: 'just starting out',
    rest: 'stand out more when your skills and education are complete.',
  },
  returner: {
    highlight: 'returning to the Gulf',
    rest: 'get shortlisted more often when your work history is complete.',
  },
  experienced_not_in_gulf: {
    highlight: 'experienced outside the Gulf',
    rest: 'get noticed more when your work experience is complete.',
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
 * body colour (the whole file used `text-ink-900/55` and similar, which
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
      className="flex min-h-11 w-full items-center justify-center gap-1.5 rounded-radius-md border border-dashed border-line-light-strong px-4 py-3 text-[13px] font-semibold text-forest transition-colors hover:border-forest hover:bg-forest-tint focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-forest focus-visible:ring-offset-2 focus-visible:ring-offset-surface-light"
    >
      <span aria-hidden="true" className="text-[15px] leading-none">
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
      <span className="shrink-0 whitespace-nowrap rounded-full border border-line-light-strong px-2.5 py-1 text-[10.5px] font-semibold text-ink-400">
        Optional
      </span>
    )
  }
  const complete = earned >= total
  return (
    <span
      className={cn(
        'shrink-0 whitespace-nowrap rounded-full px-2.5 py-1 text-[10.5px] font-bold tabular-nums',
        complete
          ? 'bg-forest-tint text-forest'
          : 'bg-redesign-gold-tint text-gold-text'
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
  open: boolean
  onToggle: () => void
  children: React.ReactNode
}) {
  const panelId = `${id ?? `step-${step}`}-panel`
  const done = typeof total === 'number' && total > 0 && (earned ?? 0) >= total
  return (
    <Card
      id={id}
      tone="light"
      className={cn(
        'flex scroll-mt-24 flex-col overflow-hidden p-0 transition-colors',
        open && 'border-redesign-gold/40'
      )}
    >
      <h2>
        <button
          type="button"
          onClick={onToggle}
          aria-expanded={open}
          aria-controls={panelId}
          className="flex w-full items-center gap-3 p-4 text-left transition-colors hover:bg-surface-2-light focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-redesign-gold sm:p-5"
        >
          {/* Step marker — a tick once the block is complete, so progress is
              readable from the numbers column alone without reading any text. */}
          <span
            className={cn(
              'flex size-8 shrink-0 items-center justify-center rounded-full text-[13px] font-bold tabular-nums',
              done
                ? 'bg-forest text-forest-deep'
                : open
                  ? 'bg-redesign-gold text-forest-deep'
                  : 'bg-surface-2-light text-ink-400'
            )}
            aria-hidden="true"
          >
            {done ? '✓' : step}
          </span>

          <span className="flex min-w-0 flex-1 flex-col gap-0.5">
            <span className="flex flex-wrap items-center gap-2">
              <span className="text-[15px] font-bold leading-snug text-ink-900">{title}</span>
              {badge ? (
                <span className="rounded-[5px] bg-surface-2-light px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-ink-700">
                  {badge}
                </span>
              ) : null}
            </span>
            {helper ? (
              <span
                className={cn(
                  'text-[12px] leading-relaxed text-ink-400',
                  !open && 'line-clamp-1'
                )}
              >
                {helper}
              </span>
            ) : null}
          </span>

          <span className="flex shrink-0 items-center gap-2">
            {typeof total === 'number' ? <PointsChip earned={earned ?? 0} total={total} /> : null}
            <span
              aria-hidden="true"
              className={cn(
                'text-[12px] text-ink-400 transition-transform',
                open && 'rotate-180'
              )}
            >
              ▾
            </span>
          </span>
        </button>
      </h2>

      {open ? (
        <div id={panelId} className="border-t border-line-light p-4 sm:p-5">
          {action ? <div className="mb-4 flex flex-wrap gap-2">{action}</div> : null}
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
  ],
  sec_work_experience: ['work_experience'],
  sec_education: ['education'],
  sec_skills: ['skills'],
  sec_certifications: ['certifications'],
}

const FORM_SECTIONS: ReadonlyArray<{ id: string; label: string }> = [
  { id: 'sec_status', label: 'Status & target' },
  { id: 'sec_identity', label: 'Identity & contact' },
  { id: 'sec_license', label: 'Driving license' },
  { id: 'sec_summary', label: 'Professional summary' },
  { id: 'sec_work_experience', label: 'Work experience' },
  { id: 'sec_education', label: 'Education' },
  { id: 'sec_skills', label: 'Skills' },
  { id: 'sec_certifications', label: 'Certifications' },
  { id: 'sec_additional', label: 'Additional information' },
]

const selectClass =
  'min-h-11 w-full rounded-radius-md border border-line-light-strong bg-surface-light px-[15px] py-[13px] text-sm font-medium text-ink-900 outline-none transition-colors focus:border-redesign-gold focus:ring-2 focus:ring-redesign-gold/20'

const textareaClass =
  'min-h-11 w-full resize-none rounded-radius-md border border-line-light-strong bg-surface-light px-[15px] py-[13px] text-sm font-medium text-ink-900 outline-none transition-colors placeholder:text-ink-400 focus:border-redesign-gold focus:ring-2 focus:ring-redesign-gold/20'

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
  return (
    <div id={id} className="flex items-start justify-between gap-3 py-1">
      <div className="flex flex-col gap-0.5">
        <span className="text-sm font-medium text-ink-900">{label}</span>
        {hint ? <span className="text-[12px] text-ink-400">{hint}</span> : null}
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
  const [editor, setEditor] = useState<EditorData | null>(null)
  const [loaded, setLoaded] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  // Computed employment gaps from GET /api/profile (TASK-067). Read-only,
  // display-only, never scored — see lib/employmentGaps.ts's header.
  const [employmentGaps, setEmploymentGaps] = useState<EmploymentGap[]>([])
  // Claimed anonymous scan result (TASK-070) — one-time "welcome back" banner.
  // null = never claimed / already dismissed.
  const [claimedScan, setClaimedScan] = useState<AtsScoreResult | null>(null)
  /**
   * An uploaded resume waiting for the user's decision (TASK-133). Non-null
   * only when a draft arrived AND a real saved profile already exists —
   * nothing is written to the editor until they choose add or replace.
   */
  const [pendingDraft, setPendingDraft] = useState<{
    draft: CareerProfileDraft
    existing: CareerProfileFull
  } | null>(null)
  const didInit = useRef(false)

  // ---- Initial load: draft handoff, else GET existing, else empty ----------
  useEffect(() => {
    if (didInit.current) return
    didInit.current = true

    // CLAIMED_SCAN_RESULT_KEY — one-time "welcome back" handoff (TASK-070).
    // Reads and clears it here regardless of the draft branch below, so the
    // banner can show even if the companion profile-draft half of the handoff
    // is somehow absent. Same one-time contract as CAREER_PROFILE_DRAFT_KEY:
    // the key is always cleared once read, never left to re-show on reload.
    const claimedRaw = window.sessionStorage.getItem(CLAIMED_SCAN_RESULT_KEY)
    if (claimedRaw) {
      try {
        const parsed = JSON.parse(claimedRaw) as { atsScore?: unknown }
        const s = parsed?.atsScore
        if (s && typeof s === 'object' && !Array.isArray(s) && 'overall_score' in s) {
          setClaimedScan(s as AtsScoreResult)
        }
      } catch {
        /* corrupt payload — just show nothing, key is still cleared below */
      }
      window.sessionStorage.removeItem(CLAIMED_SCAN_RESULT_KEY)
    }

    const raw = window.sessionStorage.getItem(CAREER_PROFILE_DRAFT_KEY)
    if (raw) {
      let draft: CareerProfileDraft | null = null
      try {
        draft = JSON.parse(raw) as CareerProfileDraft
      } catch {
        /* corrupt JSON — fall through to the plain GET below */
      }

      if (draft) {
        // TASK-024 contract: read AND clear the handoff key on success.
        window.sessionStorage.removeItem(CAREER_PROFILE_DRAFT_KEY)

        // ASK BEFORE WRITING (TASK-133). This used to load the draft alone and
        // return — so a returning user who uploaded a newer CV had their saved
        // profile silently replaced on the next save, losing everything a
        // resume cannot state (visa status, notice period, driving licence,
        // target role) plus anything they had typed by hand. Now: if there is
        // an existing profile, the user chooses. If there isn't, nothing has
        // changed — first-time upload goes straight into the editor.
        const capturedDraft = draft
        fetch('/api/profile', { cache: 'no-store' })
          .then((res) => (res.status === 200 ? res.json() : null))
          .then((data) => {
            const saved = data as CareerProfileFull | null
            const hasSavedContent =
              !!saved &&
              (!!saved.full_name?.trim() ||
                (saved.work_experience?.length ?? 0) > 0 ||
                (saved.education?.length ?? 0) > 0)

            if (!hasSavedContent) {
              setEditor(fromDraft(capturedDraft))
              setLoaded(true)
              return
            }
            setPendingDraft({ draft: capturedDraft, existing: saved as CareerProfileFull })
            setLoaded(true)
          })
          .catch(() => {
            // Could not check for an existing profile. Do NOT assume there is
            // none — that assumption is exactly what causes the silent wipe.
            // Offering only the draft would be the dangerous default, so fail
            // toward the choice screen with replace unavailable.
            setEditor(fromDraft(capturedDraft))
            setLoaded(true)
          })
        return
      }
    }

    // No draft → load any previously-saved profile (returning user). A 404
    // means start-from-scratch with nothing saved → empty editor.
    fetch('/api/profile', { cache: 'no-store' })
      .then((res) => {
        if (res.status === 200) return res.json()
        if (res.status === 404) return null
        throw new Error(String(res.status))
      })
      .then((data) => {
        setEditor(data ? fromFull(data as CareerProfileFull) : emptyEditor())
        // Read-only employment gaps (TASK-067); absent on the draft/empty paths.
        const gaps = (data as { employment_gaps?: unknown } | null)?.employment_gaps
        setEmploymentGaps(Array.isArray(gaps) ? (gaps as EmploymentGap[]) : [])
        setLoaded(true)
      })
      .catch(() => {
        // Non-fatal: fall back to an empty editor but surface a notice so the
        // founder/CTO can see pre-Supabase (no .env.local) behaviour distinctly.
        setEditor(emptyEditor())
        setLoadError('Could not load your saved profile. You can still edit below.')
        setLoaded(true)
      })
  }, [])

  // ---- Live readiness from the current editor state ------------------------
  const readiness: ReadinessResult = useMemo(() => {
    if (!editor) return { score: 0, category: 'fresher', missing: [] }
    return calculateReadiness({
      currently_in_gulf: editor.currently_in_gulf,
      full_name: editor.full_name,
      phone: editor.phone,
      email: editor.email,
      current_location: editor.current_location,
      target_job_title: editor.target_job_title,
      target_country: editor.target_country || undefined,
      target_industry: editor.target_industry,
      target_company: editor.target_company,
      visa_status: editor.visa_status,
      visa_transferable: editor.visa_transferable,
      notice_period: editor.notice_period,
      passport_validity_date: editor.passport_validity_date,
      work_experience: editor.work_experience.map((w) => ({
        start_date: w.start_date,
        end_date: w.end_date || null,
      })),
      education: editor.education,
      certifications: editor.certifications,
      skills: editor.skills,
    })
  }, [editor])

  // ---- Per-section point totals --------------------------------------------
  // `fieldPointsFor` gives what each scored field is worth for THIS user's
  // category; `readiness.missing` says which are still empty. Earned = total
  // minus whatever in that section is still outstanding, so the chips always
  // reconcile with the ring above them instead of being a second, drifting
  // source of truth.
  const sectionPoints = useMemo(() => {
    const perField = fieldPointsFor(readiness.category)
    const missingFields = new Set(readiness.missing.map((m) => m.field))
    const out: Record<string, { earned: number; total: number }> = {}
    for (const [sectionId, fields] of Object.entries(SECTION_FIELDS)) {
      let total = 0
      let earned = 0
      for (const f of fields) {
        const pts = perField[f] ?? 0
        total += pts
        if (!missingFields.has(f)) earned += pts
      }
      out[sectionId] = { earned, total }
    }
    return out
  }, [readiness.category, readiness.missing])

  const pointsFor = useCallback(
    (sectionId: string) => sectionPoints[sectionId] ?? { earned: 0, total: 0 },
    [sectionPoints]
  )

  // ---- Which step is open ---------------------------------------------------
  // Independent toggles rather than a strict one-at-a-time accordion: forcing a
  // section shut when another opens loses the user's place, and someone
  // cross-checking dates between two jobs has a legitimate reason to keep two
  // open at once.
  // Populated only after the user actually tries to save — a field is never
  // shown as an error before they have had a chance to fill it.
  const [invalidFields, setInvalidFields] = useState<Set<string>>(new Set())
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({})
  const didAutoOpen = useRef(false)

  // On first load, open the first step that still has points available — the
  // answer to "what do I actually have to do?" without the user hunting for it.
  // Runs once (didAutoOpen) so it never yanks a section shut or re-opens one
  // while the user is typing and their score changes underneath them.
  useEffect(() => {
    if (didAutoOpen.current || !editor) return
    didAutoOpen.current = true
    const firstIncomplete = FORM_SECTIONS.find((s) => {
      const p = sectionPoints[s.id]
      return p && p.total > 0 && p.earned < p.total
    })
    setOpenSections({ [(firstIncomplete ?? FORM_SECTIONS[0]).id]: true })
  }, [editor, sectionPoints])

  const toggleSection = useCallback((sectionId: string) => {
    setOpenSections((prev) => ({ ...prev, [sectionId]: !prev[sectionId] }))
  }, [])

  /** Everything a CardSection needs, so each call site stays one line of props. */
  const sectionProps = useCallback(
    (sectionId: string) => {
      const idx = FORM_SECTIONS.findIndex((s) => s.id === sectionId)
      return {
        id: sectionId,
        step: idx + 1,
        ...pointsFor(sectionId),
        open: Boolean(openSections[sectionId]),
        onToggle: () => toggleSection(sectionId),
      }
    },
    [pointsFor, openSections, toggleSection]
  )

  const doneCount = FORM_SECTIONS.filter((s) => {
    const p = sectionPoints[s.id]
    return p && p.total > 0 && p.earned >= p.total
  }).length
  const scoredCount = FORM_SECTIONS.filter((s) => (sectionPoints[s.id]?.total ?? 0) > 0).length

  // ---- Phone / WhatsApp: split for editing, joined for storage --------------
  // The DB columns stay single strings (lib/phone.ts explains why), so the
  // split is derived from the stored value rather than held as extra state —
  // that keeps one source of truth and means an extracted or previously-saved
  // number round-trips without a migration.
  const phoneParts = useMemo(() => splitPhone(editor?.phone), [editor?.phone])
  const whatsappParts = useMemo(() => splitPhone(editor?.whatsapp), [editor?.whatsapp])

  const firstName = editor ? (editor.full_name.trim().split(/\s+/)[0] || 'there') : 'there'
  const categoryCopy = CATEGORY_COPY[readiness.category]
  const itemsLeft = readiness.missing.length

  // "Finish these to reach 100" → scroll/focus the inline field (never a route).
  const setField = useCallback((patch: Partial<EditorData>) => {
    setEditor((e) => (e ? { ...e, ...patch } : e))
  }, [])

  // ---- Row adders -----------------------------------------------------------
  // Named rather than inline so the same handler backs both the header button
  // and the "Add another" button under each list. Senior candidates routinely
  // have five or more roles and several qualifications, so adding the next one
  // has to be obvious from where the user actually is — the bottom of the list
  // they just finished — not only from a control in the section header.
  const addWork = useCallback(() => {
    setEditor((e) =>
      e
        ? {
            ...e,
            work_experience: [
              ...e.work_experience,
              { key: uid(), company: '', role: '', start_date: '', end_date: '', location: '', description: '', highlights: '', gcc_country: '' },
            ],
          }
        : e
    )
  }, [])

  const addEducation = useCallback(() => {
    setEditor((e) =>
      e
        ? {
            ...e,
            education: [
              ...e.education,
              { key: uid(), degree: '', institution: '', field_of_study: '', start_year: '', end_year: '' },
            ],
          }
        : e
    )
  }, [])

  const addSkill = useCallback(() => {
    setEditor((e) => (e ? { ...e, skills: [...e.skills, { key: uid(), name: '' }] } : e))
  }, [])

  const addCertification = useCallback(() => {
    setEditor((e) =>
      e
        ? {
            ...e,
            certifications: [
              ...e.certifications,
              { key: uid(), name: '', issuer: '', issue_date: '', expiry_date: '' },
            ],
          }
        : e
    )
  }, [])

  const addAdditional = useCallback(() => {
    setEditor((e) =>
      e
        ? { ...e, additional_information: [...e.additional_information, { key: uid(), label: '', value: '' }] }
        : e
    )
  }, [])

  // Phone/WhatsApp write back as one joined string — see the phoneParts note above.
  const setPhone = useCallback(
    (dial: string, number: string) => setField({ phone: joinPhone(dial, number) }),
    [setField]
  )
  const setWhatsapp = useCallback(
    (dial: string, number: string) => setField({ whatsapp: joinPhone(dial, number) }),
    [setField]
  )

  const updateList = useCallback(
    <T extends { key: string }>(list: T[], key: string, patch: Partial<T>): T[] =>
      list.map((item) => (item.key === key ? { ...item, ...patch } : item)),
    []
  )

  const onSubmit = useCallback(
    async (destination: 'exit' | 'confirm') => {
      if (!editor) return
      setSaveError(null)

      const missing = requiredMissing(editor)
      if (missing.length > 0) {
        // Mark the fields, open the sections holding them, and scroll to the
        // first one. Naming them in a sentence is not enough on a nine-section
        // form — the user still has to hunt.
        setInvalidFields(new Set(missing.map((m) => String(m.key))))
        setSaveError(
          missing.length === 1
            ? `${missing[0].label} is required.`
            : `${missing.length} required fields are still empty: ${missing.map((m) => m.label).join(', ')}.`
        )
        const owning = new Set<string>()
        for (const m of missing) {
          for (const [sectionId, fields] of Object.entries(SECTION_FIELDS)) {
            if ((fields as readonly string[]).includes(String(m.key))) owning.add(sectionId)
          }
        }
        // target_industry/target_job_title live in Status & target; contact
        // fields in Identity. Fall back to opening both if a key is unmapped.
        if (owning.size === 0) { owning.add('sec_status'); owning.add('sec_identity') }
        setOpenSections((prev) => {
          const next = { ...prev }
          owning.forEach((id) => { next[id] = true })
          return next
        })
        window.requestAnimationFrame(() => {
          const el = document.getElementById(`f_${String(missing[0].key)}`)
          if (el) {
            el.scrollIntoView({ behavior: 'smooth', block: 'center' })
            ;(el as HTMLElement).focus?.()
          }
        })
        return
      }
      setInvalidFields(new Set())

      setSubmitting(true)
      try {
        const res = await fetch('/api/profile', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(buildPutBody(editor)),
        })
        if (!res.ok) {
          let msg = 'Saving failed. Please try again.'
          try {
            const body = await res.json()
            if (body?.error) msg = String(body.error)
          } catch {
            /* keep default */
          }
          setSaveError(msg)
          setSubmitting(false)
          return
        }
        router.push(destination === 'confirm' ? '/optimize/target' : '/dashboard')
      } catch {
        setSaveError('Network error. Please check your connection and try again.')
        setSubmitting(false)
      }
    },
    [editor, router]
  )

  // The upload decision comes BEFORE the editor exists, so nothing can be
  // saved — accidentally or otherwise — until the user has chosen.
  if (pendingDraft) {
    const merged = mergeDraftIntoProfile(pendingDraft.existing, pendingDraft.draft)
    const losses = describeReplaceLosses(pendingDraft.existing, pendingDraft.draft)
    const addedTotal = Object.values(merged.added).reduce((n, c) => n + c, 0)
    const lostEntries = Object.values(losses.entries).reduce((n, c) => n + c, 0)

    return (
      <main className="mx-auto flex min-h-dvh w-full max-w-[640px] flex-col justify-center bg-bg px-5 py-10">
        <h1 className="font-serif text-[28px] leading-tight text-ink-900">
          You already have a profile
        </h1>
        <p className="mt-3 text-[14px] leading-relaxed text-ink-700">
          We read your uploaded CV. What would you like to do with it?
        </p>

        <button
          type="button"
          onClick={() => {
            setEditor(fromFull(merged.profile))
            setPendingDraft(null)
          }}
          className="mt-6 rounded-radius-lg border-2 border-forest bg-surface-light p-5 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-forest"
        >
          <span className="flex items-center gap-2">
            <span className="text-[15px] font-bold text-ink-900">Add it to my profile</span>
            <span className="rounded-[5px] bg-forest-tint px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-forest">
              Recommended
            </span>
          </span>
          <span className="mt-1.5 block text-[13px] leading-relaxed text-ink-700">
            Keeps everything you already have. Adds{' '}
            <strong className="text-ink-900">
              {addedTotal} new {addedTotal === 1 ? 'entry' : 'entries'}
            </strong>{' '}
            from the CV
            {merged.filledFields.length > 0
              ? `, and fills ${merged.filledFields.length} empty ${merged.filledFields.length === 1 ? 'field' : 'fields'}`
              : ''}
            . Nothing is deleted.
          </span>
        </button>

        <button
          type="button"
          onClick={() => {
            setEditor(fromDraft(pendingDraft.draft))
            setPendingDraft(null)
          }}
          className="mt-3 rounded-radius-lg border border-line-light bg-surface-light p-5 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-terra"
        >
          <span className="text-[15px] font-bold text-ink-900">Replace my profile</span>
          <span className="mt-1.5 block text-[13px] leading-relaxed text-ink-700">
            Starts fresh from this CV only.
          </span>
          {lostEntries > 0 || losses.fields.length > 0 ? (
            <span className="mt-3 block rounded-radius-md border border-terra/40 bg-terra-tint px-3 py-2.5 text-[12px] leading-relaxed text-terra">
              This removes{' '}
              {lostEntries > 0 ? (
                <strong>
                  {lostEntries} saved {lostEntries === 1 ? 'entry' : 'entries'}
                </strong>
              ) : null}
              {lostEntries > 0 && losses.fields.length > 0 ? ', and clears ' : null}
              {losses.fields.length > 0 ? <strong>{losses.fields.join(', ')}</strong> : null} — a CV
              does not contain {losses.fields.length > 0 ? 'those' : 'them'}.
            </span>
          ) : null}
        </button>

        <p className="mt-6 text-center text-[12px] text-ink-400">
          Nothing is saved either way until you press Save on the next screen.
        </p>
      </main>
    )
  }

  if (!loaded || !editor) {
    return (
      <main className="mx-auto flex min-h-dvh w-full max-w-[900px] items-center justify-center bg-bg">
        <p className="font-mono text-sm text-ink-400">Loading…</p>
      </main>
    )
  }

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-[900px] flex-col bg-bg">
      {/* Readiness header — the ring IS the header, on dark navy */}
      <header className="flex flex-col gap-4 bg-surface-light px-5 pb-6 pt-4">
        <div className="flex items-center gap-4">
          {/* Photo first: it is what a Gulf recruiter looks at first, and it
              used to sit buried between form sections. */}
          <PhotoUpload
            compact
            photoUrl={editor.photo_url || null}
            onChange={(next) => setField({ photo_url: next ?? '' })}
          />
          {/* The score is the headline of this page, so it stays visible on a
              phone rather than being hidden to make room — just smaller. */}
          <div className="shrink-0">
            <ReadinessRing score={readiness.score} size={68} />
          </div>
          <div className="flex min-w-0 flex-col gap-1.5">
            <h1 className="font-serif text-[20px] leading-tight text-ink-900">
              Almost there, {firstName}
            </h1>
            <p className="text-[12px] leading-relaxed text-ink-700">
              <span className="font-semibold text-ink-900">{itemsLeft} item{itemsLeft === 1 ? '' : 's'} left.</span>{' '}
              Profiles like yours — <span className="font-semibold text-gold-text">{categoryCopy.highlight}</span> —{' '}
              {categoryCopy.rest}
            </p>
          </div>

          {/* SAVE AT THE TOP RIGHT (TASK-161, founder's call).
              It was only at the very bottom of a nine-section form, which meant
              saving required scrolling past everything still unfilled. It stays
              at the bottom too — reaching the end of the form is also a natural
              moment to save — and both call the identical onSubmit('exit'), so
              there is one save path and not two behaviours to keep in step. */}
          <div className="ml-auto shrink-0 self-start">
            <Button
              variant="primary"
              size="sm"
              busy={submitting}
              busyLabel="Saving…"
              onClick={() => onSubmit('exit')}
            >
              Save
            </Button>
          </div>
        </div>
      </header>

      {loadError ? (
        <div className="mx-5 mt-4 rounded-radius-md border border-terra/30 bg-terra-tint px-3.5 py-3 text-[12px] text-terra">
          {loadError}
        </div>
      ) : null}

      {/* WELCOME BACK — one-time claimed anonymous scan result (TASK-070).
          Dismissible and non-blocking; the editor is fully usable underneath.
          Renders only when CLAIMED_SCAN_RESULT_KEY was actually present — and
          that key was already read+cleared in the mount pass, so this can never
          reappear after a reload. */}
      {claimedScan ? (
        <div className="mx-5 mt-4 flex items-start justify-between gap-3 rounded-radius-md border border-redesign-gold/40 bg-surface-light px-4 py-3">
          <div className="flex flex-col gap-1">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-gold-text">
              Welcome back
            </p>
            <p className="text-[13px] font-medium text-ink-900">
              Here&rsquo;s what we found in your last scan &mdash; it carries over into your Career Profile.
            </p>
            <div className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1">
              <span className="font-mono text-2xl font-bold text-forest">
                {claimedScan.overall_score}
                <span className="text-sm">/100</span>
              </span>
              <span className="font-mono text-[12px] text-ink-700">Structure {claimedScan.category_scores.structure}</span>
              <span className="font-mono text-[12px] text-ink-700">Clarity {claimedScan.category_scores.clarity_and_impact}</span>
              <span className="font-mono text-[12px] text-ink-700">Gulf-readiness {claimedScan.category_scores.gulf_readiness}</span>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setClaimedScan(null)}
            aria-label="Dismiss welcome back banner"
            className="min-h-11 shrink-0 px-1 text-ink-400 transition-colors hover:text-ink-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-redesign-gold"
          >
            ✕
          </button>
        </div>
      ) : null}

      {/* The old "Finish these to reach 100" checklist stood here. Removed:
          every one of its rows named a field that appears immediately below,
          and each section now carries its own earned/total points chip, so the
          list was a second copy of the same information sitting between the
          user and the form they actually came to fill in. The ring above still
          shows the score; the chips show where the remaining points are. */}

      {/* Editor body */}
      <div className="flex flex-col gap-2.5 px-5 py-4">
        {/* One plain sentence naming the whole job before the first step, so
            the user knows how long this is and where they are inside it. The
            old page opened straight into nine expanded blocks with no such
            framing, which is what made it feel endless. */}
        <p className="px-1 pb-1 text-[12.5px] leading-relaxed text-ink-400">
          {doneCount === scoredCount ? (
            <>All {scoredCount} scored sections are complete — review anything below, then confirm.</>
          ) : (
            <>
              <span className="font-semibold text-ink-900">
                {doneCount} of {scoredCount} sections done.
              </span>{' '}
              Open a step to fill it in. Your work is kept as you move between them.
            </>
          )}
        </p>

        {/* STATUS & TARGET */}
        <CardSection
          {...sectionProps('sec_status')}
          title="Status & target"
          helper="Where you are now and the role you are aiming for. This steers how every generated resume is framed, so it is worth getting right first."
        >
          <ConfirmToggle
            id="f_currently_in_gulf"
            label="Currently in the Gulf"
            hint="Drives which readiness category applies to your profile."
            checked={editor.currently_in_gulf}
            onChange={(v) => setField({ currently_in_gulf: v })}
          />
          <div className="grid gap-3">
            <Input tone="light"
              id="f_current_employer"
              label="Current employer"
              value={editor.current_employer}
              onChange={(e) => setField({ current_employer: e.target.value })}
            />
            <Input tone="light"
              id="f_current_project"
              label="Current project"
              value={editor.current_project}
              onChange={(e) => setField({ current_project: e.target.value })}
            />
            <div className="flex flex-col gap-1">
              <Input tone="light"
                id="f_target_job_title"
                label="Target job title"
                value={editor.target_job_title}
                onChange={(e) => setField({ target_job_title: e.target.value })}
                className={invalidFields.has('target_job_title') ? 'border-terra focus:border-terra focus:ring-terra/25' : undefined}
              />
              {invalidFields.has('target_job_title') ? (
                <p role="alert" className="text-[12px] font-medium text-terra">Target job title is required.</p>
              ) : null}
            </div>
            <div className="flex flex-col gap-1">
              <Input tone="light"
                id="f_target_industry"
                label="Target industry"
                value={editor.target_industry}
                onChange={(e) => setField({ target_industry: e.target.value })}
                className={invalidFields.has('target_industry') ? 'border-terra focus:border-terra focus:ring-terra/25' : undefined}
              />
              {invalidFields.has('target_industry') ? (
                <p role="alert" className="text-[12px] font-medium text-terra">Target industry is required.</p>
              ) : null}
            </div>
            <div className="flex flex-col gap-1.5">
              <label htmlFor="f_target_country" className="text-sm font-medium text-ink-900">
                Target country <span className="font-normal text-ink-400">(optional)</span>
              </label>
              <select
                id="f_target_country"
                className={selectClass}
                value={editor.target_country}
                onChange={(e) => setField({ target_country: e.target.value })}
              >
                <option value="" disabled>
                  Select a country
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
              label="Target company (optional)"
              value={editor.target_company}
              onChange={(e) => setField({ target_company: e.target.value })}
            />
          </div>
        </CardSection>

        {/* IDENTITY & CONTACT — the card header links to /profile/visibility
            (TASK-025 screen 04b), the per-field "what appears on your CV" view. */}
        <CardSection
          {...sectionProps('sec_identity')}
          title="Identity & contact"
          helper="Your name, contact details and documents. Passport, visa and contact fields are encrypted, and you control what appears on a generated CV."
          action={
            <Link
              href="/profile/visibility"
              className="text-[11px] font-semibold text-forest focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-forest"
            >
              What appears on your CV →
            </Link>
          }
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <TextField
              id="f_full_name"
              label="Full name"
              required
              placeholder="e.g. Satish Kumar Jaiswal"
              helper="Exactly as it appears on your passport — Gulf employers check this against your documents."
              value={editor.full_name}
              onChange={(e) => setField({ full_name: e.target.value })}
              error={invalidFields.has('full_name') ? 'Full name is required.' : undefined}
              className="sm:col-span-2"
            />
            <PhoneField
              id="f_phone"
              label="Phone"
              required
              error={invalidFields.has('phone') ? 'Phone number is required.' : undefined}
              helper="Pick your country code, then the number without it."
              dial={phoneParts.dial}
              number={phoneParts.number}
              onDialChange={(v) => setPhone(v, phoneParts.number)}
              onNumberChange={(v) => setPhone(phoneParts.dial, v)}
            />
            <PhoneField
              id="f_whatsapp"
              label="WhatsApp"
              helper="Leave blank if it is the same as your phone number."
              dial={whatsappParts.dial}
              number={whatsappParts.number}
              onDialChange={(v) => setWhatsapp(v, whatsappParts.number)}
              onNumberChange={(v) => setWhatsapp(whatsappParts.dial, v)}
            />
            <TextField
              id="f_email"
              label="Email"
              required
              type="email"
              inputMode="email"
              autoComplete="email"
              placeholder="you@example.com"
              error={invalidFields.has('email') ? 'Email is required.' : undefined}
              helper="Where recruiters will reply. Use one you check daily."
              value={editor.email}
              onChange={(e) => setField({ email: e.target.value })}
            />
            <Input tone="light"
              id="f_current_location"
              label="Current location"
              value={editor.current_location}
              onChange={(e) => setField({ current_location: e.target.value })}
            />
            <Input tone="light"
              id="f_nationality"
              label="Nationality"
              value={editor.nationality}
              onChange={(e) => setField({ nationality: e.target.value })}
            />
            <Input tone="light"
              id="f_linkedin_url"
              label="LinkedIn URL"
              type="url"
              value={editor.linkedin_url}
              onChange={(e) => setField({ linkedin_url: e.target.value })}
            />
            <DateField
              id="f_date_of_birth"
              label="Date of birth"
              precision="day"
              helper="Many Gulf employers require this on the CV itself."
              value={editor.date_of_birth}
              onChange={(e) => setField({ date_of_birth: e.target.value })}
            />
            <div className="flex flex-col gap-1.5">
              <label htmlFor="f_passport_type" className="text-sm font-medium text-ink-900">
                Passport type
              </label>
              <select
                id="f_passport_type"
                className={selectClass}
                value={editor.passport_type}
                onChange={(e) => setField({ passport_type: e.target.value })}
              >
                <option value="">—</option>
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
              value={editor.visa_status}
              onChange={(e) => setField({ visa_status: e.target.value })}
            />
            <ConfirmToggle
              id="f_visa_transferable"
              label="Visa transferable"
              hint="Iqama/visa transferability."
              checked={editor.visa_transferable}
              onChange={(v) => setField({ visa_transferable: v })}
            />
            <Input tone="light"
              id="f_notice_period"
              label="Notice period"
              value={editor.notice_period}
              onChange={(e) => setField({ notice_period: e.target.value })}
            />
          </div>
        </CardSection>

        {/* DRIVING LICENSE — TASK-068. Grouped with the Passport/Visa fields
            (the same identity-and-relocation grouping). has_driving_license is
            a genuine tri-state: null = not answered, true = yes, false = explicit
            no. The select must NOT default the unanswered state to a coerced
            "no" (docs/GCC_READINESS_JOB_MATCH.md §5). Readiness/Match input only
            — deliberately no field_visibility toggle (TASK-067 scope decision). */}
        <CardSection
          {...sectionProps('sec_license')}
          title="Driving license"
          helper="Not scored, but Gulf employers ask for it outright on site and field roles — and its absence is often what filters a CV out. Skip it only if you genuinely do not hold one."
        >
          <div className="flex flex-col gap-1.5">
            <label htmlFor="f_has_driving_license" className="text-sm font-medium text-ink-900">
              Do you have a driving license?
            </label>
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
                value={editor.driving_license_country}
                onChange={(e) => setField({ driving_license_country: e.target.value })}
              />
              <Input tone="light"
                id="f_driving_license_category"
                label="Category / type"
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
          {...sectionProps('sec_summary')}
          title="Professional summary"
          helper="Not scored, but it is the first thing a recruiter reads. Describe your experience, strongest skills, industry background and the role you are targeting — two or three sentences. The optimizer rewrites the framing for each job; it never changes the facts."
        >
          <textarea
            id="f_professional_summary"
            className={cn(textareaClass, 'min-h-[110px]')}
            rows={5}
            value={editor.professional_summary}
            onChange={(e) => setField({ professional_summary: e.target.value })}
            placeholder="A short summary of who you are and what you bring."
          />
          <p className="text-[11px] leading-snug text-ink-400">
            This is your own summary — the AI never writes back into it. It is the &ldquo;before&rdquo; the
            optimizer diffs against.
          </p>
        </CardSection>

        {/* WORK EXPERIENCE */}
        <CardSection
          {...sectionProps('sec_work_experience')}
          title="Work experience"
          helper="Add your most recent role first. Focus on responsibilities, measurable achievements, and the systems or standards you worked to."
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
            {editor.work_experience.map((w, i) => (
              <div key={w.key} className="flex flex-col gap-2.5 border border-line-light-strong rounded-radius-md p-3">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-[11px] text-ink-400">#{i + 1}</span>
                  <button
                    type="button"
                    onClick={() =>
                      setEditor((e) =>
                        e
                          ? {
                              ...e,
                              work_experience: e.work_experience.filter((x) => x.key !== w.key),
                            }
                          : e
                      )
                    }
                    className={buttonVariants({ variant: 'ghost', size: 'sm' }) + ' text-terra hover:bg-terra-tint'}
                  >
                    Remove
                  </button>
                </div>
                <Input tone="light" label="Role" placeholder="e.g. Senior Instrument Engineer" value={w.role} onChange={(e) => setEditor((s) => s && ({ ...s, work_experience: updateList(s.work_experience, w.key, { role: e.target.value }) }))} />
                <Input tone="light" label="Company" placeholder="e.g. Bechtel" value={w.company} onChange={(e) => setEditor((s) => s && ({ ...s, work_experience: updateList(s.work_experience, w.key, { company: e.target.value }) }))} />
                <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                  <DateField id={`f_work_start_${w.key}`} label="Start" value={w.start_date} onChange={(e) => setEditor((s) => s && ({ ...s, work_experience: updateList(s.work_experience, w.key, { start_date: e.target.value }) }))} />
                  <DateField id={`f_work_end_${w.key}`} label="End" helper="Leave blank if this is your current role." value={w.end_date} onChange={(e) => setEditor((s) => s && ({ ...s, work_experience: updateList(s.work_experience, w.key, { end_date: e.target.value }) }))} />
                </div>
                <Input tone="light" label="Location" placeholder="e.g. Abu Dhabi, UAE" value={w.location} onChange={(e) => setEditor((s) => s && ({ ...s, work_experience: updateList(s.work_experience, w.key, { location: e.target.value }) }))} />
                <div className="flex flex-col gap-1.5">
                  <label htmlFor={`f_work_gcc_${w.key}`} className="text-sm font-medium text-ink-900">
                    Gulf experience
                  </label>
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
                <label className="flex flex-col gap-1.5 text-sm font-medium text-ink-900">
                  Description
                  <textarea
                    rows={3}
                    className={textareaClass}
                    value={w.description}
                    onChange={(e) => setEditor((s) => s && ({ ...s, work_experience: updateList(s.work_experience, w.key, { description: e.target.value }) }))}
                  />
                </label>
                <label className="flex flex-col gap-1.5 text-sm font-medium text-ink-900">
                  Highlights <span className="text-[11px] font-normal text-ink-400">one per line</span>
                  <textarea
                    rows={3}
                    className={textareaClass}
                    value={w.highlights}
                    onChange={(e) => setEditor((s) => s && ({ ...s, work_experience: updateList(s.work_experience, w.key, { highlights: e.target.value }) }))}
                  />
                </label>
              </div>
            ))}
            <AddRowButton label="Add another role" onClick={addWork} />
          </div>
        </CardSection>

        {/* EMPLOYMENT GAPS — read-only display from GET /api/profile's
            `employment_gaps` (TASK-067). Informational only — no score, no
            penalty, no red/green indicator; see lib/employmentGaps.ts's header.
            An empty array renders nothing (silence is correct here, not a
            manufactured "no gaps!"). */}
        {employmentGaps.length > 0 ? (
          <div className="flex flex-col gap-2 rounded-radius-md border border-line-light/70 bg-surface-light px-3.5 py-3">
            <span className="text-[12px] font-semibold text-ink-700">
              Employment gaps &mdash; just for your awareness
            </span>
            {employmentGaps.map((g, i) => (
              <p key={i} className="text-[11px] leading-snug text-ink-400">
                We noticed a {g.gapMonths}-month gap between {g.precedingCompany || 'a previous role'} and{' '}
                {g.followingCompany || 'your next role'}. This isn&rsquo;t scored &mdash; just something to be aware of.
              </p>
            ))}
          </div>
        ) : null}

        {/* EDUCATION */}
        <CardSection
          {...sectionProps('sec_education')}
          title="Education"
          helper="Degrees and formal qualifications. Include the awarding institution — Gulf employers frequently verify it."
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
              <div key={x.key} className="flex flex-col gap-2.5 border border-line-light-strong rounded-radius-md p-3">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-[11px] text-ink-400">#{i + 1}</span>
                  <button
                    type="button"
                    onClick={() =>
                      setEditor((e) => (e ? { ...e, education: e.education.filter((y) => y.key !== x.key) } : e))
                    }
                    className={buttonVariants({ variant: 'ghost', size: 'sm' }) + ' text-terra hover:bg-terra-tint'}
                  >
                    Remove
                  </button>
                </div>
                <Input tone="light" label="Degree" placeholder="e.g. B.Tech" value={x.degree} onChange={(e) => setEditor((s) => s && ({ ...s, education: updateList(s.education, x.key, { degree: e.target.value }) }))} />
                <Input tone="light" label="Institution" placeholder="e.g. UPTU" value={x.institution} onChange={(e) => setEditor((s) => s && ({ ...s, education: updateList(s.education, x.key, { institution: e.target.value }) }))} />
                <Input tone="light" label="Field of study" placeholder="e.g. Electronics & Communication" value={x.field_of_study} onChange={(e) => setEditor((s) => s && ({ ...s, education: updateList(s.education, x.key, { field_of_study: e.target.value }) }))} />
                <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                  <Input tone="light" label="Start year" inputMode="numeric" placeholder="2005" value={x.start_year} onChange={(e) => setEditor((s) => s && ({ ...s, education: updateList(s.education, x.key, { start_year: e.target.value }) }))} />
                  <Input tone="light" label="End year" inputMode="numeric" placeholder="2009" value={x.end_year} onChange={(e) => setEditor((s) => s && ({ ...s, education: updateList(s.education, x.key, { end_year: e.target.value }) }))} />
                </div>
              </div>
            ))}
            <AddRowButton label="Add another qualification" onClick={addEducation} />
          </div>
        </CardSection>

        {/* SKILLS */}
        <CardSection
          {...sectionProps('sec_skills')}
          title="Skills"
          helper="List the technical skills and systems you actually worked with. The optimizer reorders these for each job; it never adds a skill you did not enter."
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
              <div key={s.key} className="flex items-center gap-2">
                <span className="font-mono text-[11px] text-ink-400">{i + 1}</span>
                <Input tone="light"
                  value={s.name}
                  aria-label={`Skill ${i + 1}`}
                  onChange={(e) => setEditor((st) => st && ({ ...st, skills: updateList(st.skills, s.key, { name: e.target.value }) }))}
                />
                <button
                  type="button"
                  onClick={() =>
                    setEditor((e) => (e ? { ...e, skills: e.skills.filter((x) => x.key !== s.key) } : e))
                  }
                  aria-label={`Remove skill ${i + 1}`}
                  className={buttonVariants({ variant: 'ghost', size: 'sm' }) + ' text-terra hover:bg-terra-tint'}
                >
                  ✕
                </button>
              </div>
            ))}
            <AddRowButton label="Add another skill" onClick={addSkill} />
          </div>
        </CardSection>

        {/* CERTIFICATIONS */}
        <CardSection
          {...sectionProps('sec_certifications')}
          title="Certifications"
          helper="Safety, technical and vendor certifications. These carry real weight in Gulf hiring, so add expiry dates where they apply."
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
              <div key={c.key} className="flex flex-col gap-2.5 border border-line-light-strong rounded-radius-md p-3">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-[11px] text-ink-400">#{i + 1}</span>
                  <button
                    type="button"
                    onClick={() =>
                      setEditor((e) => (e ? { ...e, certifications: e.certifications.filter((x) => x.key !== c.key) } : e))
                    }
                    className={buttonVariants({ variant: 'ghost', size: 'sm' }) + ' text-terra hover:bg-terra-tint'}
                  >
                    Remove
                  </button>
                </div>
                <Input tone="light" label="Name" placeholder="e.g. Functional Safety (IEC 61511)" value={c.name} onChange={(e) => setEditor((s) => s && ({ ...s, certifications: updateList(s.certifications, c.key, { name: e.target.value }) }))} />
                <Input tone="light" label="Issuer" placeholder="e.g. TÜV Rheinland" value={c.issuer} onChange={(e) => setEditor((s) => s && ({ ...s, certifications: updateList(s.certifications, c.key, { issuer: e.target.value }) }))} />
                <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                  <DateField id={`f_cert_issue_${c.key}`} label="Issued" value={c.issue_date} onChange={(e) => setEditor((s) => s && ({ ...s, certifications: updateList(s.certifications, c.key, { issue_date: e.target.value }) }))} />
                  <DateField id={`f_cert_expiry_${c.key}`} label="Expires" helper="Blank if it does not expire." value={c.expiry_date} onChange={(e) => setEditor((s) => s && ({ ...s, certifications: updateList(s.certifications, c.key, { expiry_date: e.target.value }) }))} />
                </div>
              </div>
            ))}
            <AddRowButton label="Add another certification" onClick={addCertification} />
          </div>
        </CardSection>

        {/* ADDITIONAL INFORMATION — one block, AI-suggested labels the user can rename.
            MVP: a single section; not individually toggleable per field (Phase 2). */}
        <CardSection
          {...sectionProps('sec_additional')}
          title="Additional information"
          helper="Not scored, but it is where you answer the questions a Gulf recruiter asks next — languages, availability, references."
          action={
              <button
                type="button"
                onClick={addAdditional}
                className={buttonVariants({ variant: 'ghost', size: 'sm' })}
              >
                <span aria-hidden="true">+</span> Add
              </button>
            }
        >
          <p className="text-[11px] leading-snug text-ink-400">
            AI-labelled · you can rename the label on each item.
          </p>
          <div className="flex flex-col gap-3">
            {editor.additional_information.map((a) => (
              <div key={a.key} className="flex flex-col gap-2.5 border border-line-light-strong rounded-radius-md p-3">
                <div className="flex gap-2">
                  <Input tone="light"
                    label="Label"
                    value={a.label}
                    onChange={(e) => setEditor((s) => s && ({ ...s, additional_information: updateList(s.additional_information, a.key, { label: e.target.value }) }))}
                  />
                  <div className="flex items-end pb-1">
                    <button
                      type="button"
                      onClick={() =>
                        setEditor((e) => (e ? { ...e, additional_information: e.additional_information.filter((x) => x.key !== a.key) } : e))
                      }
                      aria-label="Remove item"
                      className={buttonVariants({ variant: 'ghost', size: 'sm' }) + ' text-terra hover:bg-terra-tint'}
                    >
                      ✕
                    </button>
                  </div>
                </div>
                <label className="flex flex-col gap-1.5 text-sm font-medium text-ink-900">
                  Value
                  <textarea
                    rows={2}
                    className={textareaClass}
                    value={a.value}
                    onChange={(e) => setEditor((s) => s && ({ ...s, additional_information: updateList(s.additional_information, a.key, { value: e.target.value }) }))}
                  />
                </label>
              </div>
            ))}
            <AddRowButton label="Add another item" onClick={addAdditional} />
          </div>
        </CardSection>
      </div>

      {/* Save & exit / Confirm profile — same full-object PUT, differ in navigation */}
      {saveError ? (
        <div className="mx-5 mb-3 rounded-radius-md border border-terra/30 bg-terra-tint px-3.5 py-3 text-[12px] text-terra">
          {saveError}
        </div>
      ) : null}
      {/*
        ONE action, not two.
        "Save & exit" and "Confirm profile" wrote the identical full-object PUT
        and differed only in where they navigated afterwards — a distinction the
        product understood and the user did not, presented as the last decision
        on a long form. There is now a single way out.
      */}
      <div className="sticky bottom-0 flex flex-col gap-2 bg-gradient-to-t from-bg via-bg/95 to-transparent px-5 pb-5 pt-4">
        <Button
          variant="primary"
          className="w-full"
          busy={submitting}
          busyLabel="Saving…"
          onClick={() => onSubmit('exit')}
        >
          Save &amp; exit
        </Button>
        {/* The free CV download that used to sit here was removed at the
            founder's request (TASK-161): this page is for entering data, and a
            download belongs where documents live. GET /api/resume/pdf still
            exists and still works — it is simply not linked from here. See
            Unplanned #27 before deleting it. */}
      </div>
    </main>
  )
}

// No useSearchParams here, but keep a Suspense boundary out of habit so future
// query-param usage (e.g. highlight hints from onboarding) can't trip the
// next.js CSR-bailout during static generation.
export default function ProfilePage() {
  return (
    <AppShell>
      <Suspense>
        <ProfileScreen />
      </Suspense>
    </AppShell>
  )
}
