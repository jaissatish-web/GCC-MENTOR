/**
 * Optimization prompt builder (TASK-018).
 *
 * Assembles the system+user prompt in the exact order specified in
 * docs/PROMPTS.md §6:
 *   1. Persona                     -> system
 *   2. Grounding block (verbatim)  -> system
 *   3. Gulf CV format conventions  -> system
 *   4. Level instruction           -> system
 *   5. CAREER PROFILE              -> user
 *   6. TARGET                      -> user
 *   7. JOB DESCRIPTION             -> user
 *   8. OUTPUT FORMAT               -> user
 *
 * System = how to behave. User = what to work on. This matches how
 * lib/ai/provider.ts already calls the model (a single system string, a
 * single user string) and is the standard split for this kind of task.
 *
 * ============================================================================
 * OPEN GAP, DECIDED HERE — read before changing step 3 or the "Gulf format"
 * text below:
 *
 * docs/PROMPTS.md §6 step 3 calls for "Gulf CV format conventions — from
 * target_country". No document anywhere in this repo defines what those
 * per-country conventions actually ARE. Searched: CAREER_PROFILE.md,
 * PRODUCT.md, USER_FLOW.md, DASHBOARD_LIBRARY.md, FOUNDING_BRIEF.md,
 * DESIGN.md. PRODUCT.md §2 and USER_FLOW.md both reference "Gulf-CV format
 * conventions" as a concept target_country drives, but never define content
 * for Saudi vs UAE vs Qatar vs Oman vs Kuwait vs Bahrain individually.
 *
 * The one thing that IS documented (design-reference/Landing Page.dc.html,
 * the "Why a Gulf CV is a different document" section) is a single
 * Gulf-vs-Western distinction: Gulf CVs are expected to include the
 * identity/visa fields a Western CV omits (photo, nationality, DOB, visa
 * status, notice period, passport validity), be concise, achievement-led,
 * and ATS-parseable. But this is a FIELD-INCLUSION concern, not a text-
 * generation concern — those fields are all FIXED and rendered by the
 * template (TASK-031), never written by the AI at all. The AI only ever
 * touches the summary and work-description bullets.
 *
 * DECISION: rather than fabricate seven distinct national conventions with no
 * source (which would be inventing authoritative-sounding claims the product
 * explicitly exists to avoid, just at the instruction level instead of the
 * fact level), this step carries ONE well-grounded, country-agnostic Gulf
 * writing convention, and states the specific target_country as context so
 * the model can flex tone/spelling (e.g. British vs regional English)
 * without inventing rules nobody wrote down. If real per-country content
 * gets written later, it plugs into GULF_FORMAT_NOTE below without touching
 * the rest of this file.
 *
 * Logged as docs/TASKS.md Unplanned #8.
 * ============================================================================
 */

import { getPersona } from './personas'
import { GROUNDING_INSTRUCTION } from './grounding'
import type {
  CareerProfileFull,
  ProfileWorkExperience,
  TargetCountry,
} from '@/types/careerProfile'
import type { OptimizationLevel } from '@/types/package'

// ---- Step 3: Gulf format conventions ---------------------------------------
// See the DECISION note above. Grounded in design-reference/Landing Page.dc.html
// ("Why a Gulf CV is a different document") and the persona texts in
// docs/PROMPTS.md §3, which already encode this expectation.
const GULF_FORMAT_NOTE = `GULF CV FORMAT CONVENTIONS:
Gulf employers and their ATS systems screen a high volume of CVs before a
human reads one. Write for that: concise, achievement-led, quantified where
the profile supports it, and easy for both a parser and a hiring manager to
scan quickly. Avoid first-person narrative ("I believe", "I feel"). Lead each
rewritten bullet with the outcome or responsibility, not the task description.
This applies uniformly across the Gulf region; it does not vary by the
specific target country.`

// ---- Fixed fields ------------------------------------------------------
// docs/CAREER_PROFILE.md §6: changed only by the user, only in the Career
// Profile. Never rewritten by the AI. Injected as read-only context so the
// model can reference them accurately (e.g. tailor tone to a named target
// company) without ever being asked, or allowed, to alter them.
const FIXED_FIELD_INSTRUCTION =
  'The fields above are FIXED. They are read-only context. You may reference ' +
  'them (for example, the target company name) but you must NEVER invent, ' +
  'change, or add to them. If you echo any fixed value in your output, ' +
  'reproduce it character-for-character.'

export interface SelectedBlocks {
  /** Optimize the professional summary this run. */
  summary: boolean
  /** profile_work_experience ids to rewrite this run. Everything else in the
   *  profile's work history is included as read-only context only — it is
   *  not sent to the model as something to rewrite, and the model is not
   *  asked to return it. */
  experienceIds: string[]
}

export interface OptimizationTarget {
  target_job_title: string
  target_industry: string
  target_country: TargetCountry
  target_company?: string | null
}

export interface BuiltPrompt {
  system: string
  user: string
}

function formatDate(d: string | null | undefined): string {
  if (!d) return 'present'
  return d
}

function renderFixedIdentity(profile: CareerProfileFull): string {
  const lines: string[] = []
  lines.push(`Full name: ${profile.full_name}`)
  if (profile.nationality) lines.push(`Nationality: ${profile.nationality}`)
  if (profile.date_of_birth) lines.push(`Date of birth: ${profile.date_of_birth}`)
  if (profile.passport_type) lines.push(`Passport type: ${profile.passport_type}`)
  if (profile.passport_validity_date)
    lines.push(`Passport validity: ${profile.passport_validity_date}`)
  if (profile.visa_status) lines.push(`Visa status: ${profile.visa_status}`)
  if (profile.visa_transferable !== null && profile.visa_transferable !== undefined)
    lines.push(`Visa transferable: ${profile.visa_transferable}`)
  if (profile.notice_period) lines.push(`Notice period: ${profile.notice_period}`)
  if (profile.current_location) lines.push(`Current location: ${profile.current_location}`)
  lines.push(`Phone: ${profile.phone}`)
  if (profile.whatsapp) lines.push(`WhatsApp: ${profile.whatsapp}`)
  lines.push(`Email: ${profile.email}`)
  if (profile.linkedin_url) lines.push(`LinkedIn: ${profile.linkedin_url}`)
  if (profile.currently_in_gulf) {
    lines.push('Currently based in the Gulf: yes')
    if (profile.current_employer) lines.push(`Current employer: ${profile.current_employer}`)
    if (profile.current_project) lines.push(`Current project: ${profile.current_project}`)
  }
  return lines.join('\n')
}

function renderWorkExperienceEntry(
  e: ProfileWorkExperience,
  rewritable: boolean,
): string {
  const header =
    `- [id: ${e.id}] ${e.role} at ${e.company} ` +
    `(${formatDate(e.start_date)} – ${formatDate(e.end_date)})` +
    (e.location ? `, ${e.location}` : '')
  const bullets = (e.highlights ?? []).map((h) => `  - ${h}`).join('\n')
  const desc = e.description ? `  Description: ${e.description}\n` : ''
  const tag = rewritable
    ? '  [REWRITABLE — this entry was selected for optimization]'
    : '  [FIXED — read-only context, do not rewrite, do not include in output]'
  return `${header}\n${desc}${bullets}\n${tag}`
}

function renderCareerProfile(
  profile: CareerProfileFull,
  selectedBlocks: SelectedBlocks,
): string {
  const sections: string[] = []

  sections.push('## IDENTITY (fixed, read-only)\n' + renderFixedIdentity(profile))

  const summarySection = profile.professional_summary
    ? `## EXISTING PROFESSIONAL SUMMARY (source, for reference)\n${profile.professional_summary}`
    : '## EXISTING PROFESSIONAL SUMMARY\nNone provided. This is new content, not a rewrite of existing text.'
  sections.push(summarySection)

  const experienceEntries = (profile.work_experience ?? [])
    .slice()
    .sort((a, b) => a.sort_order - b.sort_order)
    .map((e) =>
      renderWorkExperienceEntry(e, selectedBlocks.experienceIds.includes(e.id)),
    )
    .join('\n\n')
  sections.push(
    '## WORK EXPERIENCE (fixed facts; only entries tagged REWRITABLE may be reframed)\n' +
      (experienceEntries || 'None.'),
  )

  const skills = (profile.skills ?? [])
    .slice()
    .sort((a, b) => a.sort_order - b.sort_order)
    .map((s) => `- [id: ${s.id}] ${s.name}`)
    .join('\n')
  sections.push(
    '## SKILLS (fixed set — reorder by relevance only, never add/remove/reword)\n' +
      (skills || 'None.'),
  )

  const certifications = (profile.certifications ?? [])
    .slice()
    .sort((a, b) => a.sort_order - b.sort_order)
    .map(
      (c) =>
        `- ${c.name}` +
        (c.issuer ? `, ${c.issuer}` : '') +
        (c.issue_date ? ` (${c.issue_date})` : ''),
    )
    .join('\n')
  sections.push('## CERTIFICATIONS (fixed, read-only)\n' + (certifications || 'None.'))

  const education = (profile.education ?? [])
    .slice()
    .sort((a, b) => a.sort_order - b.sort_order)
    .map(
      (ed) =>
        `- ${ed.degree}, ${ed.institution}` +
        (ed.field_of_study ? ` (${ed.field_of_study})` : '') +
        (ed.start_year ? `, ${ed.start_year}–${ed.end_year ?? 'present'}` : ''),
    )
    .join('\n')
  sections.push('## EDUCATION (fixed, read-only)\n' + (education || 'None.'))

  sections.push('## FIXED-FIELD RULE\n' + FIXED_FIELD_INSTRUCTION)

  return sections.join('\n\n')
}

function renderTarget(target: OptimizationTarget): string {
  const lines = [
    `Job title: ${target.target_job_title}`,
    `Industry: ${target.target_industry}`,
    `Country: ${target.target_country}`,
  ]
  if (target.target_company) lines.push(`Company: ${target.target_company}`)
  return lines.join('\n')
}

/** docs/PROMPTS.md §6 step 7 — exact fallback text when no JD is given. */
function renderJobDescription(jobDescription: string | undefined | null): string {
  if (jobDescription && jobDescription.trim() !== '') return jobDescription
  return 'No job description was provided. Optimize against the target job title, industry and country conventions.'
}

/**
 * The output schema, per docs/DASHBOARD_LIBRARY.md §4 and
 * lib/ai/validateGrounding.ts. Deliberately narrow: the model returns only
 * what it actually generates. `source_bullets` / `source_profile_summary`
 * are NOT requested here — the caller (TASK-021) attaches those from the
 * real profile data it already has, rather than trusting the model to
 * transcribe long text back byte-for-byte. Only entries selected as
 * REWRITABLE should appear in experience_blocks; untouched entries are
 * filled in by the caller directly from the profile, not round-tripped
 * through the model.
 */
function renderOutputFormat(): string {
  return `Return ONLY valid JSON, matching this schema exactly. No prose, no markdown fences.

{
  "summary": {
    "generated": "string — the rewritten professional summary"
  },
  "experience_blocks": [
    {
      "profile_experience_id": "string — the [id: ...] value from a REWRITABLE entry above, verbatim",
      "was_optimized": true,
      "generated_bullets": ["string", "..."],
      "claims": ["string — every discrete factual claim in generated_bullets, e.g. a number, standard, system or scope of responsibility, extracted verbatim from the bullet it appears in"]
    }
  ],
  "skills_order": ["string — every skill id from the SKILLS section above, in relevance order for this target. Must contain every id exactly once. Never add, remove, or rename a skill."]
}

Include one entry in experience_blocks for every REWRITABLE work experience entry, and no others. If no entry was marked REWRITABLE, return an empty array. If the summary was not requested, return summary.generated as an empty string.`
}

export function buildOptimizationPrompt(
  profile: CareerProfileFull,
  target: OptimizationTarget,
  level: OptimizationLevel,
  selectedBlocks: SelectedBlocks,
  jobDescription?: string | null,
): BuiltPrompt {
  const persona = getPersona(target.target_industry)
  const levelInstruction = LEVEL_INSTRUCTIONS[level]

  const system = [persona, GROUNDING_INSTRUCTION, GULF_FORMAT_NOTE, levelInstruction].join(
    '\n\n',
  )

  const user = [
    renderCareerProfile(profile, selectedBlocks),
    '## TARGET\n' + renderTarget(target),
    '## JOB DESCRIPTION\n' + renderJobDescription(jobDescription),
    '## OUTPUT FORMAT\n' + renderOutputFormat(),
  ].join('\n\n')

  return { system, user }
}

/**
 * docs/PROMPTS.md §4. The instruction fragment for each level is inserted
 * VERBATIM (LEVEL_INSTRUCTION_TEXT, byte-checked against the doc in
 * scripts — see the commit message). The "LEVEL: X." line is a label added
 * around it for clarity; it is not part of the verbatim fragment itself.
 */
const LEVEL_INSTRUCTION_TEXT: Record<OptimizationLevel, string> = {
  easy:
    "Apply light rewording. Preserve the user's own voice and sentence " +
    'structure. Introduce target-role terminology only where it fits ' +
    'naturally over the existing phrasing.',
  moderate:
    'Apply fuller reframing. Restructure sentences to lead with the outcomes ' +
    "and responsibilities most relevant to the target role. Adopt the target's " +
    "terminology wherever the user's real experience genuinely supports it.",
  high:
    'Apply maximum reframing and terminology alignment. Aggressively ' +
    'restructure emphasis so the most target-relevant aspects of the ' +
    "user's real experience lead every bullet. Adopt the job description's " +
    "exact vocabulary wherever the user's real experience supports that " +
    'vocabulary.',
}

const LEVEL_INSTRUCTIONS: Record<OptimizationLevel, string> = {
  easy: `LEVEL: EASY.\n${LEVEL_INSTRUCTION_TEXT.easy}`,
  moderate: `LEVEL: MODERATE.\n${LEVEL_INSTRUCTION_TEXT.moderate}`,
  high: `LEVEL: HIGH.\n${LEVEL_INSTRUCTION_TEXT.high}`,
}
