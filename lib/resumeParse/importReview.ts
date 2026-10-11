import type { CareerProfileDraft } from '@/types/careerProfile'
import type { ParseWarning } from './check'

export type ImportChangeKind = 'spelling' | 'wording' | 'format' | 'duplicate' | 'privacy' | 'check'
export interface ImportChange {
  id: string
  field: string
  label: string
  kind: ImportChangeKind
  before: string
  after: string
  reason: string
  /** Suggestions are never silently applied. */
  suggested?: boolean
  restorable?: boolean
  job?: { company: string; role: string; start_date: string }
}
export interface ImportReview {
  version: 1
  id: string
  createdAt: string
  sourceText: string
  changes: ImportChange[]
  imported: { roles: number; skills: number; qualifications: number; certificates: number }
  wordingStatus: 'checked' | 'unavailable' | 'not_needed'
  wordingCoverage?: { checked: number; total: number }
}

/** Never persist/re-display identity numbers, including lower-case document prefixes. */
export function redactImportText(text: string): string {
  let pendingLabel = false
  return text.split('\n').map(line => {
    const labelled = /\b(passport|iqama|emirates id|national id|civil id|aadhaar|pan card)\b/i.test(line)
    const inspect = labelled || pendingLabel
    pendingLabel = labelled && !/\d/.test(line)
    if (!inspect) return line
    return line
      .replace(/\b[a-z]{5}\d{4}[a-z]\b/gi, '[number removed]')
      .replace(/\b(?=[a-z0-9]*\d)[a-z]{0,4}\d{5,12}[a-z]?\b/gi, '[number removed]')
      .replace(/\b\d{4}[ -]\d{4}[ -]\d{4}\b/g, '[number removed]')
  }).join('\n')
}

const SPELLINGS: Record<string, string> = {
  responsibilites: 'responsibilities', responsiblities: 'responsibilities', responsibile: 'responsible',
  experiance: 'experience', experince: 'experience', commisioning: 'commissioning',
  maintanance: 'maintenance', maintainance: 'maintenance', managment: 'management',
  acheivement: 'achievement', acheivements: 'achievements', sucessfully: 'successfully',
  coordiantion: 'coordination', supervsion: 'supervision', equipement: 'equipment',
}
export function correctSpelling(text: string): string {
  return text.replace(/\b[a-z]+\b/gi, word => {
    const replacement = SPELLINGS[word.toLowerCase()]
    // Preserve technical ALL-CAPS and acronyms rather than interpreting them.
    if (!replacement || word === word.toUpperCase()) return word
    return /^[A-Z]/.test(word) ? replacement[0].toUpperCase() + replacement.slice(1) : replacement
  })
}

export function proseFields(draft: CareerProfileDraft): Array<{ field: string; text: string; label: string; job?: ImportChange['job'] }> {
  const fields: ReturnType<typeof proseFields> = []
  // The profile summary is also the optimizer's source text: keep it verbatim;
  // changes here are suggestions until the user explicitly accepts them.
  if (draft.professional_summary) fields.push({ field: 'professional_summary', text: draft.professional_summary, label: 'Professional summary' })
  draft.work_experience.forEach((job, i) => {
    const anchor = { company: job.company ?? '', role: job.role ?? '', start_date: job.start_date ?? '' }
    const label = `${job.role || 'Role'} · ${job.company || 'Employer'}`
    if (job.description) fields.push({ field: `work_experience.${i}.description`, text: job.description, label, job: anchor })
    job.highlights?.forEach((text, b) => { if (text) fields.push({ field: `work_experience.${i}.highlights.${b}`, text, label, job: anchor }) })
  })
  return fields
}

/** Tight token-preserving gate, not a claim that arbitrary AI rewrites are factual. */
export function safeWording(before: string, after: string): boolean {
  if (!after.trim() || after.length > before.length * 1.3 + 20 || after === before) return false
  const protectedTokens = (s: string) => s.match(/\b\d[\w.,%/+\-]*|\b[A-Z][A-Z0-9_/-]+\b/g) ?? []
  if (JSON.stringify(protectedTokens(before)) !== JSON.stringify(protectedTokens(after))) return false
  const grammar = new Set('a an the and or of for to in on at with by from as is are was were be been being'.split(' '))
  const forms: Record<string, string> = { commission: 'commissioning', commissioning: 'commissioning', test: 'testing', testing: 'testing', maintain: 'maintaining', maintaining: 'maintaining', coordinate: 'coordinating', coordinating: 'coordinating', responsible: 'responsible', responsibilities: 'responsibilities' }
  const signature = (s: string) => (correctSpelling(s).toLowerCase().match(/[a-z0-9]+/g) ?? [])
    .filter(w => !grammar.has(w)).map(w => forms[w] ?? w).sort().join('|')
  // No new content words, changed quantities, upgraded verbs, or omitted qualifiers.
  return signature(before) === signature(after)
}

export function buildImportReview(raw: CareerProfileDraft, draft: CareerProfileDraft, text: string, warnings: ParseWarning[]): ImportReview {
  const review: ImportReview = {
    version: 1, id: crypto.randomUUID(), createdAt: new Date().toISOString(),
    sourceText: redactImportText(text), changes: [],
    imported: { roles: draft.work_experience.length, skills: draft.skills.length, qualifications: draft.education.length, certificates: draft.certifications.length },
    wordingStatus: 'not_needed',
  }
  const add = (change: Omit<ImportChange, 'id'>) => review.changes.push({ ...change, id: `${review.id}-${review.changes.length}` })
  for (const field of proseFields(draft)) {
    const after = correctSpelling(field.text)
    if (after === field.text) continue
    const suggested = field.field === 'professional_summary'
    add({ field: field.field, label: field.label, job: field.job, kind: 'spelling', before: redactImportText(field.text), after: redactImportText(after), reason: 'Corrected a common spelling error; the career details and meaning are preserved.', suggested, restorable: true })
    if (!suggested) setDraftProse(draft, field.field, after)
  }
  const seen = new Set<string>()
  raw.skills.forEach(skill => {
    const key = (skill.name ?? '').toLowerCase().replace(/[^a-z0-9]/g, '')
    if (key && seen.has(key) && draft.skills.some(s => (s.name ?? '').toLowerCase().replace(/[^a-z0-9]/g, '') === key)) {
      add({ field: 'skills', label: 'Skills', kind: 'duplicate', before: skill.name ?? '', after: skill.name ?? '', reason: 'Consolidated a repeated entry from the first reading into one skill. Your skill is still included.', restorable: true })
    }
    seen.add(key)
  })
  const recorded = new Set<string>()
  raw.skills.forEach(skill => {
    if (!skill.name || draft.skills.some(s => s.name === skill.name) || recorded.has(skill.name)) return
    recorded.add(skill.name)
    add({ field: 'skills', label: 'Unverified first-reading entry', kind: 'check', before: skill.name, after: 'Not added to your profile', reason: 'The AI reading returned this skill, but it could not be matched to your resume text. It was excluded to avoid adding unsupported information. Add it yourself only if it is accurate.' })
  })
  raw.work_experience.forEach((job, i) => {
    const checked = draft.work_experience[i]
    if (!checked) return
    for (const key of ['start_date', 'end_date'] as const) {
      const before = job[key], after = checked[key]
      if (before && after && before !== after) add({ field: `work_experience.${i}.${key}`, label: `${job.company || 'Role'} · ${key === 'start_date' ? 'Start' : 'End'} date`, kind: 'format', before, after, reason: 'Standardized the date format for your profile. This does not mean your original date was wrong.' })
    }
  })
  for (const key of ['date_of_birth', 'passport_validity_date', 'email', 'phone', 'linkedin_url', 'nationality', 'visa_status', 'notice_period', 'current_location'] as const) {
    const before = raw[key], after = draft[key]
    if (after && after !== before) add({ field: key, label: key.replace(/_/g, ' '), kind: 'format', before: before ? redactImportText(String(before)) : 'Missed in the first reading', after: redactImportText(String(after)), reason: before ? 'Standardized or verified this value against your resume text.' : 'Recovered this detail from the resume text after the first reading missed it.' })
  }
  raw.certifications.forEach((cert, i) => {
    const checked = draft.certifications[i]
    if (!checked) return
    for (const key of ['issue_date', 'expiry_date'] as const) {
      if (cert[key] && checked[key] && cert[key] !== checked[key]) add({ field: `certifications.${i}.${key}`, label: cert.name || 'Certification date', kind: 'format', before: String(cert[key]), after: String(checked[key]), reason: 'Standardized the written certificate date for your profile.' })
    }
  })
  raw.education.forEach((edu, i) => {
    const checked = draft.education[i]
    if (checked && edu.start_year && !edu.end_year && checked.end_year === edu.start_year && !checked.start_year) add({ field: `education.${i}.end_year`, label: edu.degree || 'Education year', kind: 'format', before: `${edu.start_year} filed as start year in first reading`, after: `${checked.end_year} filed as year of passing`, reason: 'Placed the single qualification year in the year-of-passing field; the year itself is unchanged.' })
  })
  const sensitive = text.split('\n').filter(line => redactImportText(line) !== line)
  if (sensitive.length) add({ field: 'additional_information', label: 'Identity document numbers', kind: 'privacy', before: 'Document number present in the uploaded text', after: 'Number excluded from your Career Profile', reason: 'Masked identity document numbers in this comparison. The importer also excludes them from additional information; useful status and validity details are retained.' })
  warnings.forEach(w => add({ field: w.field, label: 'Please verify', kind: 'check', before: '', after: '', reason: w.message }))
  return review
}

export function setDraftProse(draft: CareerProfileDraft, field: string, value: string): void {
  if (field === 'professional_summary') { draft.professional_summary = value; return }
  const m = field.match(/^work_experience\.(\d+)\.(description|highlights)(?:\.(\d+))?$/)
  if (!m) return
  const job = draft.work_experience[Number(m[1])]
  if (!job) return
  if (m[2] === 'description') job.description = value
  else if (job.highlights && m[3] !== undefined) job.highlights[Number(m[3])] = value
}

export function addWordingSuggestions(review: ImportReview, draft: CareerProfileDraft, raw: unknown): void {
  if (!raw || typeof raw !== 'object' || !('changes' in raw) || !Array.isArray(raw.changes)) return
  const fields = proseFields(draft)
  const used = new Set(review.changes.filter(c => c.kind === 'spelling' || c.kind === 'wording').map(c => c.field))
  for (const candidate of raw.changes.slice(0, 12)) {
    if (!candidate || typeof candidate.field !== 'string' || typeof candidate.after !== 'string') continue
    const source = fields.find(f => f.field === candidate.field)
    if (!source || used.has(source.field) || !safeWording(source.text, candidate.after)) continue
    used.add(source.field)
    review.changes.push({ id: `${review.id}-${review.changes.length}`, field: source.field, label: source.label, job: source.job,
      kind: 'wording', before: redactImportText(source.text), after: redactImportText(candidate.after.trim()),
      reason: 'Suggested a grammar or readability correction using the same career details. Check the meaning before applying.', suggested: true, restorable: true })
  }
}
