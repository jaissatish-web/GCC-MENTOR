import { hasUnknownEmploymentEnd } from '@/lib/employmentStatus'
import { profileTextPresent, validProfileEmail, validProfilePhone } from './profileFieldValidity'
import type { ReadinessCategory } from '@/types/careerProfile'

/** Applicable career-data completeness. Immigration preparation, optional
 * credentials and application targeting are assessed separately. */

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
  if (entries.length === 0) return profile.career_stage==='experienced' ? 'experienced_not_in_gulf' : 'fresher'

  const totalExperienceMs = entries.reduce((sum, e) => {
    if (!e.start_date || hasUnknownEmploymentEnd(e)) return sum // Unknown dates do not imply years of experience.
    const start = parseDay(e.start_date ?? '')
    const end = e.end_date ? parseDay(e.end_date) : Date.now()
    const ms = Math.max(0, end - start)
    return sum + ms
  }, 0)
  const totalYears = totalExperienceMs / (365 * 24 * 60 * 60 * 1000)
  if (totalYears < 1 && entries.every(e => !e.company && !e.role)) return 'fresher'

  // Most recent job = the one with the latest end_date.
  const latestEnd = entries.reduce<number | null>((latest, e) => {
    if (hasUnknownEmploymentEnd(e)) return latest
    const end = e.end_date ? parseDay(e.end_date) : Date.now()
    return latest === null ? end : Math.max(latest, end)
  }, null)
  if (latestEnd !== null) {
    const gapMs = Date.now() - latestEnd
    const gapMonths = gapMs / (30 * 24 * 60 * 60 * 1000)
    if (gapMonths >= 12 && profile.has_gulf_experience === true) return 'returner'
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
    if (field === 'email') return validProfileEmail(v)
    if (field === 'phone') return validProfilePhone(v)
    return typeof v === 'string' ? profileTextPresent(v) : v !== null && v !== undefined
  }
}

function listFilled(field: keyof ReadinessInput): FilledCheck {
  return (p) => {
    const v = p[field]
    if (!Array.isArray(v) || !v.length) return false
    if (field === 'work_experience') return v.every(entry => {
      if (!entry || typeof entry !== 'object') return false
      const row = entry as Record<string, unknown>
      if (hasUnknownEmploymentEnd(row)) return false
      if (typeof row.start_date !== 'string' || !Number.isFinite(Date.parse(row.start_date))) return false
      if (row.end_date && (typeof row.end_date !== 'string' || !Number.isFinite(Date.parse(row.end_date)) || Date.parse(row.end_date) < Date.parse(row.start_date))) return false
      if ('company' in row && (!profileTextPresent(row.company) || !profileTextPresent(row.role))) return false
      if ('description' in row || 'highlights' in row) return profileTextPresent(row.description) || (Array.isArray(row.highlights) ? row.highlights.some(profileTextPresent) : profileTextPresent(row.highlights))
      return true
    })
    const nameField = field === 'education' ? 'degree' : 'name'
    return v.some(entry => typeof entry === 'string' ? profileTextPresent(entry) : entry && typeof entry === 'object' && profileTextPresent((entry as Record<string, unknown>)[nameField]))
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
  // Profile completeness is independent of immigration status, target employer,
  // certificate ownership and paid-service usage. Existing category is retained
  // for presentation; it no longer changes the value of career information.
  const hasHistory = (profile.work_experience?.length ?? 0) > 0 || profile.career_stage==='experienced'
  const contact: Array<[string, string, FilledCheck]> = [
    ['full_name', 'Full name', scalarFilled('full_name')],
    ['email', 'Contact email', scalarFilled('email')],
    ['phone', 'Contact phone', scalarFilled('phone')],
    ['current_location', 'Current location', scalarFilled('current_location')],
  ]
  return [
    buildGroup(25, contact),
    buildGroup(hasHistory ? 20 : 35, [['education', 'Education or training details', p=>p.no_formal_qualification===true||listFilled('education')(p)]]),
    buildGroup(hasHistory ? 20 : 30, [['skills', 'Skills you have used or learned', listFilled('skills')]]),
    buildGroup(hasHistory ? 35 : 10, [[hasHistory ? 'work_experience' : 'professional_summary', hasHistory ? 'Employment details and responsibilities' : 'Your background or practical experience', hasHistory ? listFilled('work_experience') : scalarFilled('professional_summary')]]),
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

/** Expose the same field weights used by calculateReadiness for section chips.
 * Pass the profile because career stage and employment history select the weights.
 * A category-only fallback supports legacy callers.
 */
export function fieldPointsFor(category: ReadinessCategory, profile?: ReadinessInput): Record<string, number> {
  const key = CATEGORY_TO_KEY[category]
  const stub: ReadinessInput = profile ?? { currently_in_gulf: category === 'currently_in_gulf', work_experience: category === 'fresher' ? [] : [{ start_date: '2000-01-01' }] }
  const out: Record<string, number> = {}
  for (const group of groupsFor(stub, key)) {
    for (const item of group.items) out[item.field] = item.points
  }
  return out
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
  professional_summary?: unknown
  career_stage?: 'experienced' | 'fresher' | ''
  no_formal_qualification?: boolean
  has_gulf_experience?: boolean | null
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
  work_experience?: Array<{ start_date: string | null; end_date?: string | null; end_date_unconfirmed?: boolean; company?: string; role?: string; description?: string | null; highlights?: string | string[] | null }>
  education?: unknown[]
  certifications?: unknown[]
  skills?: unknown[]
}
