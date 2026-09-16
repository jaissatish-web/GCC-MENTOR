/**
 * Optimization prompt builder — universal, profession-neutral (TASK-018,
 * rebuilt 2026-09-16).
 *
 * WHY THIS WAS REBUILT. The previous build assembled one prompt for one kind of
 * user. Three things in it did not survive contact with a general product:
 *
 *   1. The profile, the target, the job description and the job-match findings
 *      were four peer `##` headings in one user message. Nothing told the model
 *      which of them was evidence about the candidate and which was an
 *      employer's wish list, so "the JD asks for PMP" and "the candidate holds
 *      PMP" arrived at the same level of authority.
 *   2. There was no mode. With no job description the model was handed a single
 *      fallback sentence, which left it free to imagine the vacancy it was
 *      optimising against.
 *   3. `claims` was requested from the model on every run, cost output tokens
 *      on every bullet, and was never read by anything.
 *
 * THE FIX IS LABELLING, NOT MORE RULES. Five blocks, each stating its own trust
 * level in its own header:
 *
 *   BLOCK 1  CANDIDATE FACTS       the only source of truth
 *   BLOCK 2  TARGET CONTEXT        application metadata, not evidence
 *   BLOCK 3  EMPLOYER REQUIREMENTS relevance guidance only (carries the MODE)
 *   BLOCK 4  ANALYSIS FINDINGS     derived guidance only (omitted when absent)
 *   BLOCK 5  OUTPUT INSTRUCTIONS   the schema
 *
 * System = how to behave. User = what to work on. Unchanged, and still how
 * lib/ai/provider.ts calls the model.
 *
 * ============================================================================
 * GULF FORMAT CONVENTIONS — the original decision still stands.
 *
 * docs/PROMPTS.md called for "Gulf CV format conventions from target_country",
 * but no document in this repo defines what those per-country conventions are.
 * Rather than fabricate seven national conventions with no source — inventing
 * authoritative-sounding claims at the instruction level, which is the same
 * failure this product exists to prevent, one layer up — this carries ONE
 * grounded, country-agnostic convention and states the country as context.
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
import { DETERMINISTIC_CATEGORIES } from '@/types/jobMatch'
import type { JobMatchCategoryKey, JobMatchCategoryResult } from '@/types/jobMatch'

/**
 * Derived from the presence of a job description, never stored. A column would
 * be a second source of truth for something `packages.job_description` already
 * answers exactly, and could drift from it.
 */
export type OptimizationMode = 'job_description' | 'target_title_only'

export function resolveOptimizationMode(
  jobDescription: string | null | undefined,
): OptimizationMode {
  return jobDescription && jobDescription.trim() !== ''
    ? 'job_description'
    : 'target_title_only'
}

// ---- Gulf format conventions (system) --------------------------------------
const GULF_FORMAT_NOTE = `GULF CV FORMAT CONVENTIONS:
Gulf employers and their ATS systems screen a high volume of CVs before a
human reads one. Write for that: concise, achievement-led, quantified where
the profile supports it, and easy for both a parser and a hiring manager to
scan quickly. Avoid first-person narrative ("I believe", "I feel"). Lead each
rewritten bullet with the outcome or responsibility, not the task description.
This applies uniformly across the Gulf region; it does not vary by the
specific target country.`

// ---- What the model produces, and what it must never touch (system) --------
const SCOPE_NOTE = `WHAT YOU PRODUCE:
Only three things — the professional summary, rewritten bullets for the work
experience entries marked REWRITABLE, and a relevance ordering of the skills
the candidate already has.

Everything else is fixed, owned by the application, and rendered outside your
output: name, contact details, employers, historical job titles, employment
dates, locations, education, certifications. Never emit those fields. The
target job title is the resume headline and is applied by the application — it
never replaces a historical job title in the work history.`

// ---- Fixed fields (user) ---------------------------------------------------
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
  // Optional (migration 043) — every value resolves to one neutral perspective.
  target_industry: string | null
  // Optional (migration 030) — see types/careerProfile.ts's note.
  target_country: TargetCountry | null
  target_company?: string | null
}

export interface BuiltPrompt {
  system: string
  user: string
  /** Derived, returned so the caller can record and assert it without re-deriving. */
  mode: OptimizationMode
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
      (experienceEntries || 'None.') +
      '\n\nEach REWRITABLE entry may be rewritten only from ITS OWN description and ' +
      'bullets. Never move an employer, client, project, location, number, tool, ' +
      'system, standard or achievement from one entry into another.',
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

  // Loaded by loadCareerProfileFull and rendered on the CV, but never sent to
  // the model before 2026-09-16 — so languages, memberships and awards the user
  // had entered could not inform the summary, and the model had no way to know
  // they existed. Read-only like every other profile section.
  const additional = (profile.additional_information ?? [])
    .slice()
    .sort((a, b) => a.sort_order - b.sort_order)
    .map((a) => `- ${a.label}: ${a.value}`)
    .join('\n')
  sections.push(
    '## ADDITIONAL INFORMATION (fixed, read-only)\n' + (additional || 'None.'),
  )

  sections.push('## FIXED-FIELD RULE\n' + FIXED_FIELD_INSTRUCTION)

  return sections.join('\n\n')
}

function renderTarget(target: OptimizationTarget): string {
  const lines = [`Target job title: ${target.target_job_title}`]
  // Optional (migration 043 for industry, 030 for country/company) — only add
  // a line when actually set; omitting it entirely (not "Industry: none")
  // avoids implying it was ever a required input the model should expect.
  if (target.target_industry) lines.push(`Industry: ${target.target_industry}`)
  if (target.target_country) lines.push(`Country: ${target.target_country}`)
  if (target.target_company) lines.push(`Company: ${target.target_company}`)
  return (
    lines.join('\n') +
    '\n\nThis is where the candidate is applying. It says nothing about what ' +
    'they have done. It becomes the resume headline; it never replaces a ' +
    'historical job title.'
  )
}

/**
 * Mode A carries the advert. Mode B carries the absence of one, explicitly —
 * the old build passed a single sentence here, which left the model free to
 * imagine the vacancy it was optimising against and, in the worst case, to
 * report a match against it.
 */
function renderEmployerRequirements(
  mode: OptimizationMode,
  jobDescription: string | null | undefined,
): string {
  if (mode === 'job_description') {
    return (
      'MODE: job_description\n\n' +
      (jobDescription ?? '').trim() +
      '\n\nUse this to decide what to emphasise, how to order, and which ' +
      'vocabulary to prefer — but only where CANDIDATE FACTS already supports ' +
      'it. It is not evidence about the candidate. If it asks for something ' +
      'the profile does not contain, omit that thing entirely rather than ' +
      'implying it.'
    )
  }
  return `MODE: target_title_only

No job description was provided.

Use the target job title ONLY to rank and emphasise facts that are already in
CANDIDATE FACTS:
- Prioritise profile facts clearly relevant to the target role.
- Write a role-aligned professional summary from supported facts only.
- Improve and reorder supported experience bullets.
- Order existing skills by likely relevance to the target role.

You must NOT:
- Introduce requirements, tools, systems, standards, qualifications or
  certifications that are typical of this role but absent from the profile.
- Imply this resume was matched against a specific vacancy.
- State or estimate any match, fit or ATS percentage.

Your general knowledge of this role may rank and emphasise existing facts. It
must never become resume content.`
}

/**
 * Deterministic categories only (lib/jobMatch/requirementMapping.ts) — real,
 * reproducible overlap, not the LLM semantic layer's own scores. Evidence for
 * what to EMPHASIZE from content that already exists, never a licence to add.
 * Omitted entirely when absent, so Mode B never shows an empty analysis block.
 */
function renderJobMatchFindings(
  categories: Partial<Record<JobMatchCategoryKey, JobMatchCategoryResult>> | null | undefined,
): string {
  if (!categories) return ''
  const applicable = DETERMINISTIC_CATEGORIES
    .map((key) => ({ key, result: categories[key] }))
    .filter((x): x is { key: JobMatchCategoryKey; result: JobMatchCategoryResult } => !!x.result?.applicable)
  if (applicable.length === 0) return ''

  const lines = applicable.map(
    ({ key, result }) => `- ${key}: ${result.evidence.join('; ') || 'no detail recorded'}`,
  )

  return (
    lines.join('\n') +
    '\n\nUse this analysis only to decide what to EMPHASIZE from the ' +
    "candidate's real, existing profile — for example, if a required skill is " +
    'present but underrepresented, foreground it. This is guidance for ' +
    'emphasis only, and cannot authorise any addition.'
  )
}

/**
 * Compact on purpose. `claims` was requested here until 2026-09-16: free text,
 * one entry per factual assertion per bullet, never read by any consumer and
 * never validated. It cost output tokens on the slowest call in the product.
 * Removed. Existing stored rows keep theirs (types/package.ts `claims?`), and a
 * real provenance mechanism is Phase 2 work, deliberately deferred — a
 * quotation proves a substring exists, not that the sentence built on it means
 * the same thing.
 */
function renderOutputFormat(mode: OptimizationMode): string {
  return `Return ONLY valid JSON, matching this schema exactly. No prose, no markdown fences.

{
  "mode": "${mode}",
  "summary": {
    "generated": "string — the rewritten professional summary"
  },
  "experience_blocks": [
    {
      "profile_experience_id": "string — the [id: ...] value from a REWRITABLE entry above, verbatim",
      "was_optimized": true,
      "generated_bullets": ["string", "..."]
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
  jobMatchCategories?: Partial<Record<JobMatchCategoryKey, JobMatchCategoryResult>> | null,
): BuiltPrompt {
  const persona = getPersona(target.target_industry ?? '')
  const levelInstruction = LEVEL_INSTRUCTIONS[level]
  const mode = resolveOptimizationMode(jobDescription)

  const system = [
    persona,
    GROUNDING_INSTRUCTION,
    SCOPE_NOTE,
    GULF_FORMAT_NOTE,
    levelInstruction,
  ].join('\n\n')

  const jobMatchSection = renderJobMatchFindings(jobMatchCategories)

  const user = [
    '=========================================================\n' +
      'BLOCK 1 — CANDIDATE FACTS   [the only source of truth]\n' +
      '=========================================================\n' +
      renderCareerProfile(profile, selectedBlocks),

    '=========================================================\n' +
      'BLOCK 2 — TARGET CONTEXT   [application metadata, NOT candidate evidence]\n' +
      '=========================================================\n' +
      renderTarget(target),

    '=========================================================\n' +
      'BLOCK 3 — EMPLOYER REQUIREMENTS   [relevance guidance ONLY]\n' +
      '=========================================================\n' +
      renderEmployerRequirements(mode, jobDescription),

    ...(jobMatchSection
      ? [
          '=========================================================\n' +
            'BLOCK 4 — ANALYSIS FINDINGS   [derived guidance ONLY, not evidence]\n' +
            '=========================================================\n' +
            jobMatchSection,
        ]
      : []),

    '=========================================================\n' +
      'BLOCK 5 — OUTPUT INSTRUCTIONS\n' +
      '=========================================================\n' +
      renderOutputFormat(mode),
  ].join('\n\n')

  return { system, user, mode }
}

/**
 * docs/PROMPTS.md §4. Each fragment is inserted VERBATIM and is byte-checked by
 * scripts/verify-optimization-grounding.ts. Levels change how much rewriting
 * happens. They never change the grounding standard — the sentence added to
 * each in 2026-09-16 says so in the same breath as the instruction, because
 * "maximum reframing" read alone had been the strongest licence in the prompt.
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

const GROUNDING_IS_CONSTANT =
  'This level controls how much you rewrite. It does not change what you are ' +
  'allowed to say: the grounding rules above apply identically at every level.'

const LEVEL_INSTRUCTIONS: Record<OptimizationLevel, string> = {
  easy: `LEVEL: EASY.\n${LEVEL_INSTRUCTION_TEXT.easy}\n${GROUNDING_IS_CONSTANT}`,
  moderate: `LEVEL: MODERATE.\n${LEVEL_INSTRUCTION_TEXT.moderate}\n${GROUNDING_IS_CONSTANT}`,
  high: `LEVEL: HIGH.\n${LEVEL_INSTRUCTION_TEXT.high}\n${GROUNDING_IS_CONSTANT}`,
}

/** Exported for the offline suite's byte check against docs/PROMPTS.md §4. */
export { LEVEL_INSTRUCTION_TEXT }
