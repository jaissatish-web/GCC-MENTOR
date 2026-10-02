/**
 * Optimizer v3 prompts — founder-approved 2026-10-02 (TEST LAB, not yet wired
 * into /api/optimize).
 *
 * Two calls: ANALYSIS (requirements, field match, groups A/B/C) and WRITING
 * (summary + bullets per level). Only work data is sent — never name, contact,
 * nationality, date of birth, passport, visa or target country.
 */
import type { CareerProfileFull } from '@/types/careerProfile'
import type { OptimizationLevel } from '@/types/package'
import { totalExperienceYears } from '@/lib/experienceYears'
import { sortExperienceNewestFirst } from '@/lib/resumeOrder'

export const ANALYSIS_SYSTEM = `You compare ONE job with ONE candidate's work experience, for a Gulf CV tool.

PART 1 — THE JOB'S REQUIREMENTS
List what the job asks for.
- With a job description: only what it states or clearly implies. Never add "typical" extras it does not mention.
- With only a job title: the requirements most Gulf job adverts for that exact title and level ask for.
Write each requirement as a short ATS KEYWORD: 1–3 words, in the job's own words and spelling — the exact words a recruiter would search a CV for ("shop drawing review", "chillers", "IFRS", "patient assessment", "stakeholder management"). Never a sentence.
Split combined requirements: "analytical, problem-solving and communication skills" is three keywords.
For each give importance ("must" or "nice") and kind:
  skill · responsibility · domain · soft_skill · equipment (types of equipment, systems or methods of the field: chillers, VRF, BMS, ventilators, IV therapy, month-end close) · tool (named software or brands: Revit, SAP, Tally) · standard (named codes, standards, regulators: ASHRAE, IFRS, DEWA) · certification · licence · education · experience_years.
At most 30, most important first. No company names, salaries, locations or benefits.

PART 2 — THE FIELD
- job_field: the job's field in 2–4 words (e.g. "MEP engineering", "critical-care nursing", "corporate finance").
- candidate_field: the candidate's field, from their job titles and experience.
- field_match:
    "same"      — the candidate already works in this field and type of role.
    "related"   — a neighbouring field that shares part of the work (electrical <-> mechanical engineering, ward nurse <-> ICU nurse).
    "different" — little or no shared work (electrical engineer -> finance manager).

PART 3 — SORT EVERY REQUIREMENT INTO ONE GROUP
A "shown":      the candidate's experience already shows it, in the same or different words. Give the job id (or "summary" for summary/skills/certifications/education) and a short EXACT quote from that place.
B "same_field": not written, but someone doing the candidate's real job in that field almost certainly does it, because a closely related duty IS shown. Give the job id where it fits and the EXACT quote of that related duty. Allowed kinds: skill, responsibility, domain, soft_skill, equipment.
C "not_shown":  everything else. ALWAYS group C: certifications, licences, education, years of experience, named software or brands (tool), named codes/standards/regulators (standard) the candidate never mentions, and anything from another field.
Examples of B (same field, related duty shown):
- MEP engineer who supervised HVAC installation and chilled water systems -> chillers, VRF, BMS interface, O&M manuals, handover documentation.
- ICU nurse who managed ventilated patients -> arterial blood gas monitoring, infection control, patient handover.
- Accountant who ran month-end close -> journal entries, accruals, balance sheet reconciliation.
- Warehouse coordinator who managed stock -> cycle counts, FIFO, goods receipt.
Examples of C: Revit for someone who never mentions software; SAP for someone who used Tally; PMP; a driving licence; any skill from another field.
When it is a real stretch, choose C.

Answer with ONLY this JSON, no prose:
{
  "job_field": "", "candidate_field": "", "field_match": "same" | "related" | "different",
  "requirements": [
    { "term": "", "importance": "must" | "nice", "kind": "", "group": "A" | "B" | "C", "job": "job-1 | summary | null", "quote": "exact text or null" }
  ]
}`

const LEVEL_TEXT: Record<OptimizationLevel, string> = {
  easy: 'EASY: Light rewording of the candidate\'s own bullets. No new points.',
  moderate: 'MODERATE: Restructure every bullet to lead with what this job needs, using its terms. Add a new point for each requirement in list B.',
  high: 'HIGH: Rewrite every bullet in the job description\'s vocabulary. Do not keep the original wording. Add a new point for EVERY requirement in list B.',
}

/** New points allowed per job: High may add one more than Moderate (2026-10-02 — High must never come out below Moderate). */
export const maxNewPoints = (level: OptimizationLevel) => (level === 'high' ? 4 : 3)

export function writerSystem(targetTitle: string, level: OptimizationLevel): string {
  const t = targetTitle.trim()
  const newPoints =
    level === 'easy'
      ? ''
      : `
NEW POINTS
- "new": true ONLY for a point written for a list-B requirement. Everything built from the candidate's own facts is "new": false, however much you reword it.
- A list-B requirement that naturally belongs to one of the candidate's own bullets may be added to that bullet instead ("Led testing and commissioning of AHUs and pumps, including troubleshooting") — that bullet stays "new": false.
- Put each one in the job given in list B. At most ${maxNewPoints(level)} new points per job.${level === 'high' ? "\n- HIGH: every requirement in list B must appear in the CV, as a new point or inside one of the candidate's own bullets." : ''}
- Write it as a responsibility or skill in the job description's words.
- Never put a number, percentage or amount in a new point.
- Points marked "-> summary" (soft skills) go into the summary as a short phrase. The summary may also name up to 2 other list-B strengths.`
  return `ROLE
You are a senior recruiter and CV specialist for ${t} roles in the Gulf job market. You know what hiring managers and ATS systems in this field look for — the skills, terms and results that get a ${t} shortlisted.

YOUR TASK
Rewrite the candidate's professional summary and the bullets of each job so a recruiter hiring a ${t} immediately sees why this person fits.

NEVER CHANGE OR ADD — at any level
Certificates, licences, education, company names, job titles, dates, years of experience, or any personal detail. You only write the summary and the job bullets.

TRUTH RULES
1. Rewritten bullets use only facts from CANDIDATE EXPERIENCE.
2. The job description is the employer's wish list, NOT evidence about the candidate.
3. Each job uses only its own facts. Never move a number, client, project or tool from one job to another.
4. Copy every number exactly. Never invent a number, percentage or amount.
5. Never write anything from list C, and never hint at it.
6. No first person ("I", "my").

HOW A SPECIALIST WRITES
- Lead each bullet with the result or responsibility that matters most for this job.
- Every keyword in list A MUST appear at least once, written exactly as listed (the job's own spelling — "Civil Defense", not "Civil Defence"), in the summary or in a job where it is shown. The ATS only counts exact words. Soft skills go naturally into the summary or the bullet that shows them.
- Keep every fact of every job. Each original bullet's facts — team sizes, numbers, systems, results — must still be in your bullets. Reword and reorder freely; never drop a fact.
- Most relevant bullets first in each job. Current job in present tense, past jobs in past tense.
- One line per bullet where possible. No filler: never end a bullet with "ensuring…", "facilitating…", "contributing to…" or "to the highest standards". End on the work, the system or the result.
- Write like a person, not a keyword list: a job term must be part of what the sentence says. Broad terms (stakeholder management, project management, problem-solving) belong in the summary, not tacked onto a bullet.
- Put the job's term INSIDE the action, never as a tail at the end:
  WRONG: "Coordinated with consultants for shop drawing approvals, facilitating stakeholder management."
  RIGHT: "Coordinated shop drawing and material submittal approvals with consultants and the client."
  WRONG: "Handled accounts payable and receivable for multiple projects, ensuring accurate AP/AR processing."
  RIGHT: "Handled AP/AR processing for multiple projects."
  WRONG: "Supervised HVAC and fire-fighting works for a metro station, ensuring commissioning and handover."
  RIGHT: "Supervised HVAC and fire-fighting works for a metro station through commissioning and handover."
- Summary, 3–4 lines: open with the candidate's OWN current title or field + years of experience (never call them the target job title — they have not held it), then their strongest proven strengths for this job, then their best real numbers.

LEVEL
${LEVEL_TEXT[level]}${newPoints}`
}

// ---------------------------------------------------------------------------
// The work data — the only part of the profile the model sees
// ---------------------------------------------------------------------------

export interface JobKey { key: string; id: string }

export function jobKeys(profile: CareerProfileFull): JobKey[] {
  // Newest first, like the CV: job-1 is the current (or latest) job.
  return sortExperienceNewestFirst(profile.work_experience ?? [])
    .map((e, i) => ({ key: `job-${i + 1}`, id: e.id }))
}

const month = (d: string | null | undefined) => (d ? d.slice(0, 7) : 'present')

export function renderExperience(profile: CareerProfileFull): string {
  const keys = jobKeys(profile)
  const lines: string[] = []
  lines.push(`Current summary: ${profile.professional_summary?.trim() || '(none)'}`)
  for (const { key, id } of keys) {
    const e = profile.work_experience.find((x) => x.id === id)!
    lines.push(`[${key}] ${e.role} — ${e.company}${e.location ? ` — ${e.location}` : ''} — ${month(e.start_date)} to ${month(e.end_date)}`)
    if (e.description) lines.push(`  ${e.description}`)
    for (const h of e.highlights ?? []) lines.push(`  - ${h}`)
  }
  const skills = [...(profile.skills ?? [])].sort((a, b) => a.sort_order - b.sort_order).map((s) => s.name)
  lines.push(`Skills: ${skills.join(', ') || '(none)'}`)
  lines.push(`Certifications: ${(profile.certifications ?? []).map((c) => c.name + (c.issuer ? ` (${c.issuer})` : '')).join('; ') || '(none)'}`)
  lines.push(`Education: ${(profile.education ?? []).map((e) => [e.degree, e.field_of_study, e.institution, e.end_year].filter(Boolean).join(', ')).join('; ') || '(none)'}`)
  return lines.join('\n')
}

/** The one years figure the summary may state (validator: years_of_experience_altered). */
function yearsLine(profile: CareerProfileFull): string {
  // The candidate's own stated figure wins (the validator holds the summary to
  // it); the date total is used only when they never stated one.
  const stated = profile.professional_summary?.match(/(\d{1,2})\+?\s*(?:years?|yrs)/i)?.[1]
  if (stated) return `${stated}+ (as the candidate states). Use only this figure; never calculate other year counts (per country, per role, per skill).`
  const y = totalExperienceYears(profile)
  return y
    ? `${y} (from the job dates). Use only this figure; never calculate other year counts (per country, per role, per skill).`
    : 'not stated — do not write a number of years.'
}

export function currentTitle(profile: CareerProfileFull): string {
  const e = sortExperienceNewestFirst(profile.work_experience ?? [])[0]
  return e?.role ?? '(none — first job)'
}

export function analysisUser(profile: CareerProfileFull, targetTitle: string, jd: string | null): string {
  return [
    `TARGET JOB TITLE: ${targetTitle}`,
    jd?.trim() ? `JOB DESCRIPTION:\n${jd.trim()}` : 'JOB DESCRIPTION: none given — use the job title.',
    `CANDIDATE EXPERIENCE:\n${renderExperience(profile)}`,
  ].join('\n\n')
}

export interface WriterLists {
  fieldLine: string
  a: Array<{ term: string; where: string[] }>
  b: Array<{ term: string; job: string; quote: string }>
  c: string[]
}

export function writerUser(profile: CareerProfileFull, targetTitle: string, jd: string | null, lists: WriterLists): string {
  const a = lists.a.length ? lists.a.map((x) => `   - ${x.term} (${x.where.join(', ')})`).join('\n') : '   (none)'
  const b = lists.b.length ? lists.b.map((x) => `   - ${x.term} -> ${x.job}${x.quote ? `  (related: "${x.quote}")` : ''}`).join('\n') : '   (none at this level)'
  const c = lists.c.length ? `   - ${lists.c.join(' · ')}` : '   (none)'
  return `TARGET JOB
Applying for: ${targetTitle}
Current title: ${currentTitle(profile)}
Years of experience: ${yearsLine(profile)}
Field: ${lists.fieldLine}

JOB DESCRIPTION — employer's wish list, NOT candidate evidence
${jd?.trim() || `None given: use your knowledge of ${targetTitle} roles only to decide which real facts to put first.`}

REQUIREMENTS — checked by our system
A. ALREADY SHOWN — each keyword must appear, exactly as written
${a}
B. ADD AS NEW POINTS
${b}
C. NOT SHOWN — never write, never hint
${c}

CANDIDATE EXPERIENCE — the only source of truth
${renderExperience(profile)}

ANSWER — JSON only
{
  "summary": "…",
  "jobs": [ { "id": "job-1", "bullets": [ { "text": "…", "new": false } ] } ],
  "skills_order": [ "…every skill name exactly as listed, most relevant first…" ]
}
Include every job, each with all its bullets.`
}
