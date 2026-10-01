'use client'

import type { ParseWarning } from '@/lib/resumeParse/check'

/**
 * "Please check these" — the few fields the CV reader was unsure of
 * (lib/resumeParse/check.ts, 2026-10-01).
 *
 * The reader verifies every fact it can against the CV text; what it could not
 * confirm (a start date it could not read, a company name not found as written)
 * arrives here as a field path. Each row opens that field or section, so the
 * user fixes one or two things instead of re-reading the whole profile.
 * Dismissible, never blocking — the editor is fully usable underneath.
 */

const TOP: Record<string, string> = {
  full_name: 'Full name',
  email: 'Email',
  phone: 'Phone',
  date_of_birth: 'Date of birth',
  nationality: 'Nationality',
  visa_status: 'Visa status',
  notice_period: 'Notice period',
  current_location: 'Current location',
  skills: 'Skills',
}
const LEAF: Record<string, string> = {
  start_date: 'start date',
  end_date: 'end date',
  company: 'company name',
  role: 'job title',
  institution: 'institution',
}
const LIST: Record<string, { noun: string; section: string }> = {
  work_experience: { noun: 'Job', section: 'sec_work_experience' },
  education: { noun: 'Qualification', section: 'sec_education' },
  certifications: { noun: 'Certification', section: 'sec_certifications' },
}

export interface ParseNoteTarget { field?: string; sectionId?: string }

function describe(w: ParseWarning, jobNames: string[]): { label: string; target: ParseNoteTarget } {
  const [head, index, leaf] = w.field.split('.')
  const list = LIST[head]
  if (list && index !== undefined) {
    const i = Number(index)
    const name = head === 'work_experience' && jobNames[i] ? ` (${jobNames[i]})` : ''
    return { label: `${list.noun} ${i + 1}${name} — ${LEAF[leaf] ?? leaf}`, target: { sectionId: list.section } }
  }
  if (head === 'skills') return { label: TOP.skills, target: { sectionId: 'sec_skills' } }
  return { label: TOP[head] ?? head.replace(/_/g, ' '), target: { field: head } }
}

export function ParseNotes({
  notes,
  jobNames,
  onGo,
  onDismiss,
}: {
  notes: ParseWarning[]
  /** Company names in editor order, to name the job a note is about. */
  jobNames: string[]
  onGo: (target: ParseNoteTarget) => void
  onDismiss: () => void
}) {
  if (!notes.length) return null
  return (
    <div className="mx-5 mt-4 rounded-ctl border border-gold-line bg-gold-bg px-4 py-3" role="status">
      <div className="flex items-start justify-between gap-3">
        <div className="flex flex-col gap-1">
          <p className="text-[13px] font-semibold text-ink">
            We read your CV. Please check {notes.length === 1 ? 'this one thing' : `these ${notes.length} things`}:
          </p>
          <p className="text-[12px] text-ink-soft">Everything else was found in your CV as written.</p>
        </div>
        <button
          type="button"
          onClick={onDismiss}
          aria-label="Dismiss the list of things to check"
          className="min-h-11 shrink-0 px-1 text-ink-muted transition-colors hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal"
        >
          ✕
        </button>
      </div>
      <ul className="mt-2 flex flex-col gap-1.5">
        {notes.map((w, i) => {
          const { label, target } = describe(w, jobNames)
          return (
            <li key={`${w.field}-${i}`} className="flex flex-col gap-0.5 sm:flex-row sm:items-baseline sm:gap-2">
              <button
                type="button"
                onClick={() => onGo(target)}
                className="text-left text-[13px] font-medium text-gold-text underline underline-offset-2 hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal"
              >
                {label}
              </button>
              <span className="text-[12px] text-ink-soft">{w.message}</span>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
