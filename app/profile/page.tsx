'use client'

import { useRouter } from 'next/navigation'
import {
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Card } from '@/components/ui/Card'
import ReadinessRing from '@/components/ui/ReadinessRing'
import { Toggle } from '@/components/ui/Toggle'
import { cn } from '@/lib/utils'
import { GULF_COUNTRIES } from '@/lib/utils'
import { CAREER_PROFILE_DRAFT_KEY } from '@/lib/onboardingDraft'
import { calculateReadiness, type ReadinessResult } from '@/lib/readiness'
import type { ReadinessCategory, PassportType } from '@/types/careerProfile'
import type { CareerProfileDraft, CareerProfileFull, FieldVisibility } from '@/types/careerProfile'

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
  field_visibility: FieldVisibility
  work_experience: EditableWork[]
  skills: EditableSkill[]
  certifications: EditableCert[]
  education: EditableEdu[]
  additional_information: EditableAdditional[]
}

// Field-visibility default per docs/CAREER_PROFILE.md §2: true everywhere
// except date_of_birth and passport_type, which default to false.
const DEFAULT_FIELD_VISIBILITY: FieldVisibility = {
  full_name: true,
  photo: true,
  nationality: true,
  date_of_birth: false,
  passport_type: false,
  passport_validity: true,
  visa_status: true,
  visa_transferable: true,
  notice_period: true,
  current_location: true,
  phone: true,
  whatsapp: true,
  email: true,
  linkedin_url: true,
  additional_information: true,
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
    start_date: str(w.start_date),
    end_date: str(w.end_date),
    location: str(w.location),
    description: str(w.description),
    highlights: Array.isArray(w.highlights) ? (w.highlights as unknown[]).map(str).join('\n') : '',
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
    issue_date: str(c.issue_date),
    expiry_date: str(c.expiry_date),
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
    date_of_birth: str(d.date_of_birth),
    passport_type: str(d.passport_type),
    passport_validity_date: str(d.passport_validity_date),
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
    date_of_birth: str(p.date_of_birth),
    passport_type: str(p.passport_type),
    passport_validity_date: str(p.passport_validity_date),
    visa_status: str(p.visa_status),
    visa_transferable: p.visa_transferable === true,
    notice_period: str(p.notice_period),
    current_location: str(p.current_location),
    phone: str(p.phone),
    whatsapp: str(p.whatsapp),
    email: str(p.email),
    linkedin_url: str(p.linkedin_url),
    professional_summary: str(p.professional_summary),
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
    target_country: e.target_country,
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

const REQUIRED_LABELS: Array<[keyof EditorData, string]> = [
  ['full_name', 'Full name'],
  ['phone', 'Phone'],
  ['email', 'Email'],
  ['target_job_title', 'Target job title'],
  ['target_industry', 'Target industry'],
  ['target_country', 'Target country'],
]

function requiredMissing(e: EditorData): string[] {
  const missing: string[] = []
  for (const [k, label] of REQUIRED_LABELS) {
    if (typeof e[k] === 'string' && String(e[k]).trim() === '') missing.push(label)
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

function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-ink-warm">
      {children}
    </div>
  )
}

function CardSection({
  id,
  title,
  badge,
  action,
  children,
}: {
  id?: string
  title: string
  badge?: string
  action?: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <Card id={id} className="flex flex-col gap-3.5 p-4">
      <div className="flex items-center justify-between gap-3">
        <div className="text-[15px] font-bold text-midnight">{title}</div>
        {badge ? (
          <span className="rounded-[5px] bg-state-gold-bg px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-state-gold-text">
            {badge}
          </span>
        ) : action ? (
          action
        ) : null}
      </div>
      {children}
    </Card>
  )
}

const selectClass =
  'min-h-11 w-full rounded-lg border border-line bg-white px-[15px] py-[13px] text-sm font-medium text-midnight outline-none transition-colors focus:border-midnight focus:ring-2 focus:ring-midnight/20'

const textareaClass =
  'min-h-11 w-full resize-none rounded-lg border border-line bg-white px-[15px] py-[13px] text-sm font-medium text-midnight outline-none transition-colors placeholder:text-ink-faint focus:border-midnight focus:ring-2 focus:ring-midnight/20'

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
        <span className="text-sm font-medium text-midnight">{label}</span>
        {hint ? <span className="text-[12px] text-ink-muted">{hint}</span> : null}
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
  const didInit = useRef(false)

  // ---- Initial load: draft handoff, else GET existing, else empty ----------
  useEffect(() => {
    if (didInit.current) return
    didInit.current = true

    const raw = window.sessionStorage.getItem(CAREER_PROFILE_DRAFT_KEY)
    if (raw) {
      try {
        const draft = JSON.parse(raw) as CareerProfileDraft
        setEditor(fromDraft(draft))
        setLoaded(true)
        // TASK-024 contract: read AND clear the handoff key on success.
        window.sessionStorage.removeItem(CAREER_PROFILE_DRAFT_KEY)
        return
      } catch {
        /* fall through to GET below if the stored JSON is corrupt */
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

  const firstName = editor ? (editor.full_name.trim().split(/\s+/)[0] || 'there') : 'there'
  const categoryCopy = CATEGORY_COPY[readiness.category]
  const itemsLeft = readiness.missing.length

  // "Finish these to reach 100" → scroll/focus the inline field (never a route).
  const focusField = useCallback((field: string) => {
    const el =
      document.getElementById(`f_${field}`) ??
      document.getElementById(`sec_${field}`) ??
      document.getElementById('sec_identity')
    if (!el) return
    el.scrollIntoView({ behavior: 'smooth', block: 'center' })
    const tag = el.tagName
    if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') (el as HTMLElement).focus()
  }, [])

  const setField = useCallback((patch: Partial<EditorData>) => {
    setEditor((e) => (e ? { ...e, ...patch } : e))
  }, [])

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
        setSaveError(`Please complete the required fields first: ${missing.join(', ')}.`)
        return
      }

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

  if (!loaded || !editor) {
    return (
      <main className="flex min-h-dvh items-center justify-center bg-marble">
        <p className="font-mono text-sm text-ink-muted">Loading…</p>
      </main>
    )
  }

  return (
    <main className="flex min-h-dvh flex-col bg-marble">
      {/* Readiness header — the ring IS the header, on dark navy */}
      <header className="flex flex-col gap-4 bg-midnight px-5 pb-6 pt-4">
        <div className="flex h-11 items-center justify-between text-[12px] font-semibold text-marble/80">
          <span>9:41</span>
          <span className="tracking-[0.14em]">▮▮▮</span>
        </div>
        <div className="flex items-center gap-4">
          <div className="shrink-0">
            {/* Reuses the approved TASK-026 ReadinessRing component. */}
            <ReadinessRing score={readiness.score} size={86} />
          </div>
          <div className="flex flex-col gap-1.5">
            <h1 className="font-serif text-[20px] leading-tight text-marble">
              Almost there, {firstName}
            </h1>
            <p className="text-[12px] leading-relaxed text-marble/70">
              <span className="font-semibold text-marble">{itemsLeft} item{itemsLeft === 1 ? '' : 's'} left.</span>{' '}
              Profiles like yours — <span className="font-semibold text-gold-light">{categoryCopy.highlight}</span> —{' '}
              {categoryCopy.rest}
            </p>
          </div>
        </div>
      </header>

      {loadError ? (
        <div className="mx-5 mt-4 rounded-xl border border-terracotta/30 bg-state-terra-bg px-3.5 py-3 text-[12px] text-state-terra-text">
          {loadError}
        </div>
      ) : null}

      {/* "Finish these to reach 100" — inline taps to the field */}
      {readiness.missing.length > 0 ? (
        <div className="flex flex-col gap-2.5 px-5 pt-4">
          <SectionHeading>Finish these to reach 100</SectionHeading>
          <div className="flex flex-col gap-2">
            {readiness.missing.map((m) => (
              <button
                key={m.field}
                type="button"
                onClick={() => focusField(m.field)}
                className="flex min-h-11 items-center justify-between gap-3 rounded-xl border border-line-strong bg-white px-3.5 py-3 text-left transition-colors hover:bg-fill-subtle focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-midnight focus-visible:ring-offset-2"
              >
                <span className="text-[13px] font-medium text-midnight">
                  {m.label} <span className="font-normal text-ink-warm">· +{m.points} points</span>
                </span>
                <span className="shrink-0 text-[11px] font-semibold text-emerald">Add →</span>
              </button>
            ))}
          </div>
        </div>
      ) : null}

      {/* Editor body */}
      <div className="flex flex-col gap-4 px-5 py-4">
        {/* STATUS & TARGET */}
        <CardSection title="Status & target">
          <ConfirmToggle
            id="f_currently_in_gulf"
            label="Currently in the Gulf"
            hint="Drives which readiness category applies to your profile."
            checked={editor.currently_in_gulf}
            onChange={(v) => setField({ currently_in_gulf: v })}
          />
          <div className="grid gap-3">
            <Input
              id="f_current_employer"
              label="Current employer"
              value={editor.current_employer}
              onChange={(e) => setField({ current_employer: e.target.value })}
            />
            <Input
              id="f_current_project"
              label="Current project"
              value={editor.current_project}
              onChange={(e) => setField({ current_project: e.target.value })}
            />
            <Input
              id="f_target_job_title"
              label="Target job title (required)"
              value={editor.target_job_title}
              onChange={(e) => setField({ target_job_title: e.target.value })}
            />
            <Input
              id="f_target_industry"
              label="Target industry (required)"
              value={editor.target_industry}
              onChange={(e) => setField({ target_industry: e.target.value })}
            />
            <div className="flex flex-col gap-1.5">
              <label htmlFor="f_target_country" className="text-sm font-medium text-midnight">
                Target country (required)
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
            <Input
              id="f_target_company"
              label="Target company (optional)"
              value={editor.target_company}
              onChange={(e) => setField({ target_company: e.target.value })}
            />
          </div>
        </CardSection>

        {/* IDENTITY & CONTACT */}
        <CardSection id="sec_identity" title="Identity & contact">
          <div className="grid gap-3">
            <Input
              id="f_full_name"
              label="Full name (required)"
              value={editor.full_name}
              onChange={(e) => setField({ full_name: e.target.value })}
            />
            <Input
              id="f_phone"
              label="Phone (required)"
              type="tel"
              value={editor.phone}
              onChange={(e) => setField({ phone: e.target.value })}
            />
            <Input
              id="f_whatsapp"
              label="WhatsApp"
              type="tel"
              value={editor.whatsapp}
              onChange={(e) => setField({ whatsapp: e.target.value })}
            />
            <Input
              id="f_email"
              label="Email (required)"
              type="email"
              value={editor.email}
              onChange={(e) => setField({ email: e.target.value })}
            />
            <Input
              id="f_current_location"
              label="Current location"
              value={editor.current_location}
              onChange={(e) => setField({ current_location: e.target.value })}
            />
            <Input
              id="f_nationality"
              label="Nationality"
              value={editor.nationality}
              onChange={(e) => setField({ nationality: e.target.value })}
            />
            <Input
              id="f_linkedin_url"
              label="LinkedIn URL"
              type="url"
              value={editor.linkedin_url}
              onChange={(e) => setField({ linkedin_url: e.target.value })}
            />
            <Input
              id="f_date_of_birth"
              label="Date of birth"
              type="date"
              value={editor.date_of_birth}
              onChange={(e) => setField({ date_of_birth: e.target.value })}
            />
            <div className="flex flex-col gap-1.5">
              <label htmlFor="f_passport_type" className="text-sm font-medium text-midnight">
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
            <Input
              id="f_passport_validity_date"
              label="Passport validity date"
              type="date"
              value={editor.passport_validity_date}
              onChange={(e) => setField({ passport_validity_date: e.target.value })}
            />
            <Input
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
            <Input
              id="f_notice_period"
              label="Notice period"
              value={editor.notice_period}
              onChange={(e) => setField({ notice_period: e.target.value })}
            />
          </div>
        </CardSection>

        {/* PROFESSIONAL SUMMARY — the user's OWN summary, source of the diff */}
        <CardSection title="Professional summary">
          <textarea
            id="f_professional_summary"
            className={cn(textareaClass, 'min-h-[110px]')}
            rows={5}
            value={editor.professional_summary}
            onChange={(e) => setField({ professional_summary: e.target.value })}
            placeholder="A short summary of who you are and what you bring."
          />
          <p className="text-[11px] leading-snug text-ink-muted">
            This is your own summary — the AI never writes back into it. It is the &ldquo;before&rdquo; the
            optimizer diffs against.
          </p>
        </CardSection>

        {/* PHOTO — STUB. No Storage/upload API exists yet (see header note). */}
        <Card id="sec_photo" className="flex gap-3.5 border-[1.5px] border-gold p-4">
          <div className="flex h-[70px] w-[58px] shrink-0 flex-col items-center justify-center gap-1 rounded-[7px] border border-dashed border-gold bg-sand">
            <span className="text-base text-state-gold-text">◔</span>
            <span className="text-[8px] font-semibold uppercase tracking-wider text-state-gold-text">Add</span>
          </div>
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center gap-2">
              <span className="text-[13px] font-bold text-midnight">Photo</span>
              <span className="rounded-[5px] bg-state-gold-bg px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-state-gold-text">
                Expected in Gulf CVs
              </span>
            </div>
            <p className="text-[11px] leading-snug text-ink-muted">
              Passport-style, plain background. Counts toward your readiness score.
            </p>
            <div className="mt-1 flex gap-2">
              {/* PHOTO UPLOAD STUB (TASK-024 contract #5): no Supabase Storage
                  object / no POST /api/profile/photo exists anywhere in this repo
                  (same gap TASK-037 flags). These two buttons are built visually
                  per the mockup but DISABLED — they must not fire a network call.
                  When photo upload is built for real, wire the upload + Storage
                  object here and add its cleanup to
                  components/settings/DeleteDataSection.tsx. */}
              <button
                type="button"
                disabled
                title="Photo upload coming soon"
                className="min-h-11 cursor-not-allowed rounded-lg bg-midnight px-3 py-3 text-[11px] font-semibold text-marble opacity-50"
              >
                Upload photo
              </button>
              <button
                type="button"
                disabled
                title="Photo upload coming soon"
                className="min-h-11 cursor-not-allowed rounded-lg border border-line-strong bg-white px-3 py-3 text-[11px] font-semibold text-midnight opacity-50"
              >
                Take one now
              </button>
            </div>
            <p className="text-[10px] text-ink-faint">Photo upload is coming soon.</p>
          </div>
        </Card>

        {/* WORK EXPERIENCE */}
        <CardSection
          id="sec_work_experience"
          title="Work experience"
          badge={editor.work_experience.length ? `${editor.work_experience.length} found` : undefined}
          action={
            <button
              type="button"
              onClick={() =>
                setEditor((e) =>
                  e
                    ? {
                        ...e,
                        work_experience: [
                          ...e.work_experience,
                          {
                            key: uid(),
                            company: '',
                            role: '',
                            start_date: '',
                            end_date: '',
                            location: '',
                            description: '',
                            highlights: '',
                          },
                        ],
                      }
                    : e
                )
              }
              className="text-[11px] font-semibold text-emerald focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald"
            >
              + Add
            </button>
          }
        >
          <div className="flex flex-col gap-4">
            {editor.work_experience.map((w, i) => (
              <div key={w.key} className="flex flex-col gap-2.5 border border-line rounded-xl p-3">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-[11px] text-ink-muted">#{i + 1}</span>
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
                    className="min-h-11 px-1 text-[11px] font-semibold text-terracotta focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-terracotta"
                  >
                    Remove
                  </button>
                </div>
                <Input label="Role" value={w.role} onChange={(e) => setEditor((s) => s && ({ ...s, work_experience: updateList(s.work_experience, w.key, { role: e.target.value }) }))} />
                <Input label="Company" value={w.company} onChange={(e) => setEditor((s) => s && ({ ...s, work_experience: updateList(s.work_experience, w.key, { company: e.target.value }) }))} />
                <div className="grid grid-cols-2 gap-2.5">
                  <Input label="Start" type="date" value={w.start_date} onChange={(e) => setEditor((s) => s && ({ ...s, work_experience: updateList(s.work_experience, w.key, { start_date: e.target.value }) }))} />
                  <Input label="End (blank = current)" type="date" value={w.end_date} onChange={(e) => setEditor((s) => s && ({ ...s, work_experience: updateList(s.work_experience, w.key, { end_date: e.target.value }) }))} />
                </div>
                <Input label="Location" value={w.location} onChange={(e) => setEditor((s) => s && ({ ...s, work_experience: updateList(s.work_experience, w.key, { location: e.target.value }) }))} />
                <label className="flex flex-col gap-1.5 text-sm font-medium text-midnight">
                  Description
                  <textarea
                    rows={3}
                    className={textareaClass}
                    value={w.description}
                    onChange={(e) => setEditor((s) => s && ({ ...s, work_experience: updateList(s.work_experience, w.key, { description: e.target.value }) }))}
                  />
                </label>
                <label className="flex flex-col gap-1.5 text-sm font-medium text-midnight">
                  Highlights <span className="text-[11px] font-normal text-ink-muted">one per line</span>
                  <textarea
                    rows={3}
                    className={textareaClass}
                    value={w.highlights}
                    onChange={(e) => setEditor((s) => s && ({ ...s, work_experience: updateList(s.work_experience, w.key, { highlights: e.target.value }) }))}
                  />
                </label>
              </div>
            ))}
          </div>
        </CardSection>

        {/* EDUCATION */}
        <CardSection
          id="sec_education"
          title="Education"
          badge={editor.education.length ? `${editor.education.length} found` : undefined}
          action={
            <button
              type="button"
              onClick={() =>
                setEditor((e) =>
                  e
                    ? {
                        ...e,
                        education: [
                          ...e.education,
                          {
                            key: uid(),
                            degree: '',
                            institution: '',
                            field_of_study: '',
                            start_year: '',
                            end_year: '',
                          },
                        ],
                      }
                    : e
                )
              }
              className="text-[11px] font-semibold text-emerald focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald"
            >
              + Add
            </button>
          }
        >
          <div className="flex flex-col gap-3">
            {editor.education.map((x, i) => (
              <div key={x.key} className="flex flex-col gap-2.5 border border-line rounded-xl p-3">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-[11px] text-ink-muted">#{i + 1}</span>
                  <button
                    type="button"
                    onClick={() =>
                      setEditor((e) => (e ? { ...e, education: e.education.filter((y) => y.key !== x.key) } : e))
                    }
                    className="min-h-11 px-1 text-[11px] font-semibold text-terracotta focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-terracotta"
                  >
                    Remove
                  </button>
                </div>
                <Input label="Degree" value={x.degree} onChange={(e) => setEditor((s) => s && ({ ...s, education: updateList(s.education, x.key, { degree: e.target.value }) }))} />
                <Input label="Institution" value={x.institution} onChange={(e) => setEditor((s) => s && ({ ...s, education: updateList(s.education, x.key, { institution: e.target.value }) }))} />
                <Input label="Field of study" value={x.field_of_study} onChange={(e) => setEditor((s) => s && ({ ...s, education: updateList(s.education, x.key, { field_of_study: e.target.value }) }))} />
                <div className="grid grid-cols-2 gap-2.5">
                  <Input label="Start year" inputMode="numeric" value={x.start_year} onChange={(e) => setEditor((s) => s && ({ ...s, education: updateList(s.education, x.key, { start_year: e.target.value }) }))} />
                  <Input label="End year" inputMode="numeric" value={x.end_year} onChange={(e) => setEditor((s) => s && ({ ...s, education: updateList(s.education, x.key, { end_year: e.target.value }) }))} />
                </div>
              </div>
            ))}
          </div>
        </CardSection>

        {/* SKILLS */}
        <CardSection
          id="sec_skills"
          title="Skills"
          badge={editor.skills.length ? `${editor.skills.length} found` : undefined}
          action={
            <button
              type="button"
              onClick={() =>
                setEditor((e) => (e ? { ...e, skills: [...e.skills, { key: uid(), name: '' }] } : e))
              }
              className="text-[11px] font-semibold text-emerald focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald"
            >
              + Add
            </button>
          }
        >
          <div className="flex flex-col gap-2">
            {editor.skills.map((s, i) => (
              <div key={s.key} className="flex items-center gap-2">
                <span className="font-mono text-[11px] text-ink-muted">{i + 1}</span>
                <Input
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
                  className="min-h-11 px-2 text-[13px] text-terracotta focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-terracotta"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        </CardSection>

        {/* CERTIFICATIONS */}
        <CardSection
          id="sec_certifications"
          title="Certifications"
          badge={editor.certifications.length ? `${editor.certifications.length} found` : undefined}
          action={
            <button
              type="button"
              onClick={() =>
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
              }
              className="text-[11px] font-semibold text-emerald focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald"
            >
              + Add
            </button>
          }
        >
          <div className="flex flex-col gap-3">
            {editor.certifications.map((c, i) => (
              <div key={c.key} className="flex flex-col gap-2.5 border border-line rounded-xl p-3">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-[11px] text-ink-muted">#{i + 1}</span>
                  <button
                    type="button"
                    onClick={() =>
                      setEditor((e) => (e ? { ...e, certifications: e.certifications.filter((x) => x.key !== c.key) } : e))
                    }
                    className="min-h-11 px-1 text-[11px] font-semibold text-terracotta focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-terracotta"
                  >
                    Remove
                  </button>
                </div>
                <Input label="Name" value={c.name} onChange={(e) => setEditor((s) => s && ({ ...s, certifications: updateList(s.certifications, c.key, { name: e.target.value }) }))} />
                <Input label="Issuer" value={c.issuer} onChange={(e) => setEditor((s) => s && ({ ...s, certifications: updateList(s.certifications, c.key, { issuer: e.target.value }) }))} />
                <div className="grid grid-cols-2 gap-2.5">
                  <Input label="Issue date" type="date" value={c.issue_date} onChange={(e) => setEditor((s) => s && ({ ...s, certifications: updateList(s.certifications, c.key, { issue_date: e.target.value }) }))} />
                  <Input label="Expiry date" type="date" value={c.expiry_date} onChange={(e) => setEditor((s) => s && ({ ...s, certifications: updateList(s.certifications, c.key, { expiry_date: e.target.value }) }))} />
                </div>
              </div>
            ))}
          </div>
        </CardSection>

        {/* ADDITIONAL INFORMATION — one block, AI-suggested labels the user can rename.
            MVP: a single section; not individually toggleable per field (Phase 2). */}
        <CardSection
          id="sec_additional"
          title="Additional information"
          action={
            <button
              type="button"
              onClick={() =>
                setEditor((e) => (e ? { ...e, additional_information: [...e.additional_information, { key: uid(), label: '', value: '' }] } : e))
              }
              className="text-[11px] font-semibold text-emerald focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald"
            >
              + Add
            </button>
          }
        >
          <p className="text-[11px] leading-snug text-ink-muted">
            AI-labelled · you can rename the label on each item.
          </p>
          <div className="flex flex-col gap-3">
            {editor.additional_information.map((a) => (
              <div key={a.key} className="flex flex-col gap-2.5 border border-line rounded-xl p-3">
                <div className="flex gap-2">
                  <Input
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
                      className="min-h-11 px-2 text-[13px] text-terracotta focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-terracotta"
                    >
                      ✕
                    </button>
                  </div>
                </div>
                <label className="flex flex-col gap-1.5 text-sm font-medium text-midnight">
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
          </div>
        </CardSection>
      </div>

      {/* Save & exit / Confirm profile — same full-object PUT, differ in navigation */}
      {saveError ? (
        <div className="mx-5 mb-3 rounded-xl border border-terracotta/30 bg-state-terra-bg px-3.5 py-3 text-[12px] text-state-terra-text">
          {saveError}
        </div>
      ) : null}
      <div className="sticky bottom-0 flex gap-2.5 bg-gradient-to-t from-marble via-marble/95 to-transparent px-5 pb-5 pt-4">
        <Button
          variant="secondary"
          className="flex-1"
          disabled={submitting}
          onClick={() => onSubmit('exit')}
        >
          Save &amp; exit
        </Button>
        <Button
          variant="progress"
          className="flex-[1.4]"
          disabled={submitting}
          onClick={() => onSubmit('confirm')}
        >
          {submitting ? 'Saving…' : 'Confirm profile'}
        </Button>
      </div>
    </main>
  )
}

// No useSearchParams here, but keep a Suspense boundary out of habit so future
// query-param usage (e.g. highlight hints from onboarding) can't trip the
// next.js CSR-bailout during static generation.
export default function ProfilePage() {
  return (
    <Suspense>
      <ProfileScreen />
    </Suspense>
  )
}
