import type { ReadinessCategory } from '@/types/careerProfile'

/**
 * Readiness Score — pure functions (TASK-014).
 *
 * Implements docs/CAREER_PROFILE.md §5 exactly. No database access, no side
 * effects. Completeness only — never ATS scores or resume counts.
 *
 * DESIGN NOTE (flagged for CTO): §5 specifies weights at the FIELD-GROUP
 * level. The `missing` array must drive a UI that jumps to the incomplete
 * FIELD, so each group's weight is distributed across its own fields (equal
 * split). Groups made of a single child-table presence check (Education,
 * Certifications, Skills, Work experience detail) yield one item whose points
 * equal the whole group weight. Multi-field groups (Contact & target,
 * Visa-readiness) split their weight equally across the constituent fields.
 */

// ---- Category detection (docs/CAREER_PROFILE.md §5, order matters) ---------

/**
 * First match wins, evaluated in this exact order:
 *   1. currently_in_gulf === true          -> 'currently_in_gulf'
 *   2. 0 work entries OR < ~1yr experience -> 'fresher'
 *   3. ≥12 month gap between the most recent job's end_date and today
 *                                          -> 'returner'
 *   4. otherwise                           -> 'experienced_not_in_gulf'
 */
export function deriveCategory(profile: ReadinessInput): ReadinessCategory {
  if (profile.currently_in_gulf === true) return 'currently_in_gulf'

  const entries = profile.work_experience ?? []
  if (entries.length === 0) return 'fresher'

  const totalExperienceMs = entries.reduce((sum, e) => {
    const start = parseDay(e.start_date)
    const end = e.end_date ? parseDay(e.end_date) : Date.now()
    const ms = Math.max(0, end - start)
    return sum + ms
  }, 0)
  const totalYears = totalExperienceMs / (365 * 24 * 60 * 60 * 1000)
  if (totalYears < 1) return 'fresher'

  // Most recent job = the one with the latest end_date.
  const latestEnd = entries.reduce<number | null>((latest, e) => {
    const end = e.end_date ? parseDay(e.end_date) : Date.now()
    return latest === null ? end : Math.max(latest, end)
  }, null)
  if (latestEnd !== null) {
    const gapMs = Date.now() - latestEnd
    const gapMonths = gapMs / (30 * 24 * 60 * 60 * 1000)
    if (gapMonths >= 12) return 'returner'
  }

  return 'experienced_not_in_gulf'
}

// ---- Weighting table (docs/CAREER_PROFILE.md §5) ---------------------------

type CategoryKey = 'fresher' | 'experienced' | 'returner' | 'currently_in_gulf'

const CATEGORY_TO_KEY: Record<ReadinessCategory, CategoryKey> = {
  fresher: 'fresher',
  experienced_not_in_gulf: 'experienced',
  returner: 'returner',
  currently_in_gulf: 'currently_in_gulf',
}

/** [Contact&target, Education, Certifications, Skills, WorkExpDetail, Visa] */
const WEIGHTS: Record<CategoryKey, readonly number[]> = {
  fresher: [25, 30, 20, 20, 5, 0],
  experienced: [15, 10, 20, 10, 30, 15],
  returner: [20, 10, 20, 20, 25, 5],
  currently_in_gulf: [15, 5, 10, 10, 20, 40],
}

// Assert every category's weights sum to 100 (docs §5).
for (const [k, w] of Object.entries(WEIGHTS)) {
  const sum = w.reduce((a, b) => a + b, 0)
  if (sum !== 100) {
    throw new Error(`Readiness weights for '${k}' sum to ${sum}, expected 100`)
  }
}

// ---- Field groups ----------------------------------------------------------

type FilledCheck = (p: ReadinessInput) => boolean

interface FieldItem {
  /** The actual profile field name — used by the UI to jump to it. */
  field: string
  label: string
  points: number
  filled: FilledCheck
}

interface FieldGroup {
  items: FieldItem[]
}

function scalarFilled(field: keyof ReadinessInput): FilledCheck {
  return (p) => {
    const v = p[field]
    return typeof v === 'string' ? v.trim() !== '' : v !== null && v !== undefined
  }
}

function listFilled(field: keyof ReadinessInput): FilledCheck {
  return (p) => {
    const v = p[field]
    return Array.isArray(v) && v.length > 0
  }
}

/** Split a group's weight equally across N items, remainder added to first. */
function splitWeight(total: number, n: number): number[] {
  const base = Math.floor(total / n)
  const remainder = total - base * n
  const parts = new Array(n).fill(base)
  for (let i = 0; i < remainder; i++) parts[i] += 1
  return parts
}

function buildGroup(
  weight: number,
  spec: Array<[field: string, label: string, filled: FilledCheck]>,
): FieldGroup {
  const parts = splitWeight(weight, spec.length)
  return {
    items: spec.map(([field, label, filled], i) => ({
      field,
      label,
      points: parts[i],
      filled,
    })),
  }
}

function groupsFor(profile: ReadinessInput, key: CategoryKey): FieldGroup[] {
  const w = WEIGHTS[key]
  const contactTargetFields: Array<[string, string, FilledCheck]> = [
    ['full_name', 'Full name', scalarFilled('full_name')],
    ['phone', 'Phone', scalarFilled('phone')],
    ['email', 'Email', scalarFilled('email')],
    ['current_location', 'Current location', scalarFilled('current_location')],
    ['target_job_title', 'Target job title', scalarFilled('target_job_title')],
    ['target_country', 'Target country', scalarFilled('target_country')],
    ['target_industry', 'Target industry', scalarFilled('target_industry')],
    ['target_company', 'Target company', scalarFilled('target_company')],
  ]
  const visaFields: Array<[string, string, FilledCheck]> = [
    ['visa_status', 'Visa status', scalarFilled('visa_status')],
    ['visa_transferable', 'Visa transferable', scalarFilled('visa_transferable')],
    ['notice_period', 'Notice period', scalarFilled('notice_period')],
    ['passport_validity_date', 'Passport validity', scalarFilled('passport_validity_date')],
  ]

  return [
    buildGroup(w[0], contactTargetFields),
    buildGroup(w[1], [['education', 'Education', listFilled('education')]]),
    buildGroup(w[2], [['certifications', 'Certifications', listFilled('certifications')]]),
    buildGroup(w[3], [['skills', 'Skills', listFilled('skills')]]),
    buildGroup(w[4], [['work_experience', 'Work experience detail', listFilled('work_experience')]]),
    buildGroup(w[5], visaFields),
  ]
}

// ---- Public API ------------------------------------------------------------

export interface MissingItem {
  field: string
  label: string
  points: number
}

export interface ReadinessResult {
  score: number
  category: ReadinessCategory
  missing: MissingItem[]
}

export function calculateReadiness(profile: ReadinessInput): ReadinessResult {
  const category = deriveCategory(profile)
  const key = CATEGORY_TO_KEY[category]

  const missing: MissingItem[] = []
  let score = 0

  for (const group of groupsFor(profile, key)) {
    for (const item of group.items) {
      if (item.filled(profile)) {
        score += item.points
      } else {
        missing.push({ field: item.field, label: item.label, points: item.points })
      }
    }
  }

  return { score, category, missing }
}

// ---- Types -----------------------------------------------------------------

function parseDay(iso: string): number {
  const t = Date.parse(iso)
  return Number.isNaN(t) ? 0 : t
}

/** Structural input type — the subset of CareerProfileFull that readiness uses. */
export interface ReadinessInput {
  currently_in_gulf: boolean
  full_name?: unknown
  phone?: unknown
  email?: unknown
  current_location?: unknown
  target_job_title?: unknown
  target_country?: unknown
  target_industry?: unknown
  target_company?: unknown
  visa_status?: unknown
  visa_transferable?: unknown
  notice_period?: unknown
  passport_validity_date?: unknown
  work_experience?: Array<{ start_date: string; end_date?: string | null }>
  education?: unknown[]
  certifications?: unknown[]
  skills?: unknown[]
}
