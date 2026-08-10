/**
 * Cover letter prompt builder (TASK-065).
 *
 * docs/PROMPTS.md §8: "Identical mechanism, different persona ... Same
 * Career Profile, same grounding rule, same validator. No new data or
 * mechanism required." This file is the "different persona" half of that —
 * a self-contained sibling to lib/ai/buildOptimizationPrompt.ts, not an
 * import from it, so this Phase 3 addition can never accidentally touch the
 * already-approved, safety-critical resume optimization prompt.
 *
 * Structural difference from the resume optimizer: nothing here is tagged
 * REWRITABLE. A cover letter is not a rewrite of one experience entry at a
 * time — every part of the profile is read-only reference material the
 * letter draws from, all at once, exactly like the ATS scanner (TASK-049)
 * and extraction (TASK-020) already treat their own inputs.
 */

import { GROUNDING_INSTRUCTION } from './grounding'
import type { CareerProfileFull, ProfileWorkExperience, TargetCountry } from '@/types/careerProfile'

// Byte-for-byte from docs/PROMPTS.md §8 — the one persona line the spec
// gives for this feature. Not a per-industry persona (lib/ai/personas.ts is
// resume-reviewer personas, a different concept — a hiring manager
// evaluating a CV, not a recruiter writing a letter). Do not swap this for
// getPersona(); the spec deliberately gives ONE line for cover letters.
const COVER_LETTER_PERSONA =
  "You are a senior recruiter writing a persuasive letter on the candidate's behalf to a Gulf employer."

// Analogous to buildOptimizationPrompt.ts's GULF_FORMAT_NOTE — same
// "one well-grounded, country-agnostic convention, never a fabricated
// per-country ruleset" decision, logged there as Unplanned #8, for the
// same reason: no document anywhere defines per-country letter conventions.
const LETTER_FORMAT_NOTE = `COVER LETTER CONVENTIONS:
Write a single-page, professional cover letter: a greeting, an opening that
states the target role and why the candidate is a strong fit, 1-2 body
paragraphs connecting real experience from the profile to the target role
(and to the job description, if one is provided), a closing paragraph
requesting next steps, and a sign-off. No named recipient is known, so use a
generic, respectful greeting ("Dear Hiring Manager" or equivalent) rather
than inventing a name. Confident and specific, never generic filler — every
claim of skill or experience must be something the profile actually
supports. Avoid restating the resume verbatim; this is a persuasive
narrative, not a bullet list.`

const FIXED_FIELD_INSTRUCTION =
  'Everything in the CAREER PROFILE section below is read-only reference material. ' +
  'You may draw on it freely to write the letter, but you must never invent ' +
  'facts beyond it — see the grounding rule above.'

export interface CoverLetterTarget {
  target_job_title: string
  target_industry: string
  target_country: TargetCountry
  target_company: string | null
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
  if (profile.current_location) lines.push(`Current location: ${profile.current_location}`)
  if (profile.currently_in_gulf) {
    lines.push('Currently based in the Gulf: yes')
    if (profile.current_employer) lines.push(`Current employer: ${profile.current_employer}`)
  }
  return lines.join('\n')
}

function renderWorkExperienceEntry(e: ProfileWorkExperience): string {
  const header =
    `- ${e.role} at ${e.company} (${formatDate(e.start_date)} - ${formatDate(e.end_date)})` +
    (e.location ? `, ${e.location}` : '')
  const bullets = (e.highlights ?? []).map((h) => `  - ${h}`).join('\n')
  const desc = e.description ? `  ${e.description}\n` : ''
  return `${header}\n${desc}${bullets}`
}

function renderCareerProfile(profile: CareerProfileFull): string {
  const sections: string[] = []

  sections.push('## IDENTITY\n' + renderFixedIdentity(profile))

  if (profile.professional_summary) {
    sections.push('## PROFESSIONAL SUMMARY\n' + profile.professional_summary)
  }

  const experienceEntries = (profile.work_experience ?? [])
    .slice()
    .sort((a, b) => a.sort_order - b.sort_order)
    .map(renderWorkExperienceEntry)
    .join('\n\n')
  sections.push('## WORK EXPERIENCE\n' + (experienceEntries || 'None.'))

  const skills = (profile.skills ?? [])
    .slice()
    .sort((a, b) => a.sort_order - b.sort_order)
    .map((s) => `- ${s.name}`)
    .join('\n')
  sections.push('## SKILLS\n' + (skills || 'None.'))

  const certifications = (profile.certifications ?? [])
    .slice()
    .sort((a, b) => a.sort_order - b.sort_order)
    .map((c) => `- ${c.name}` + (c.issuer ? `, ${c.issuer}` : ''))
    .join('\n')
  if (certifications) sections.push('## CERTIFICATIONS\n' + certifications)

  const education = (profile.education ?? [])
    .slice()
    .sort((a, b) => a.sort_order - b.sort_order)
    .map((ed) => `- ${ed.degree}, ${ed.institution}` + (ed.field_of_study ? ` (${ed.field_of_study})` : ''))
    .join('\n')
  if (education) sections.push('## EDUCATION\n' + education)

  sections.push('## RULE\n' + FIXED_FIELD_INSTRUCTION)

  return sections.join('\n\n')
}

function renderTarget(target: CoverLetterTarget): string {
  const lines = [
    `Job title: ${target.target_job_title}`,
    `Industry: ${target.target_industry}`,
    `Country: ${target.target_country}`,
  ]
  if (target.target_company) lines.push(`Company: ${target.target_company}`)
  return lines.join('\n')
}

/** Same fallback text style as buildOptimizationPrompt.ts's renderJobDescription. */
function renderJobDescription(jobDescription: string | undefined | null): string {
  if (jobDescription && jobDescription.trim() !== '') return jobDescription
  return 'No job description was provided. Write the letter against the target job title, industry and company alone.'
}

/**
 * Deliberately narrow, matching buildOptimizationPrompt.ts's own reasoning:
 * the model returns only the parts it generates. `full_text` is NOT
 * requested here — the caller composes it server-side from these validated
 * parts, so storage can never diverge from what was actually validated.
 */
function renderOutputFormat(): string {
  return `Return ONLY valid JSON, matching this schema exactly. No prose, no markdown fences.

{
  "greeting": "string — e.g. 'Dear Hiring Manager,'",
  "opening_paragraph": "string",
  "body_paragraphs": ["string", "..."],
  "closing_paragraph": "string",
  "sign_off": "string — e.g. 'Sincerely,'"
}

body_paragraphs must contain 1 to 3 paragraphs.`
}

export function buildCoverLetterPrompt(
  profile: CareerProfileFull,
  target: CoverLetterTarget,
  jobDescription?: string | null,
): BuiltPrompt {
  const system = [COVER_LETTER_PERSONA, GROUNDING_INSTRUCTION, LETTER_FORMAT_NOTE].join('\n\n')

  const user = [
    renderCareerProfile(profile),
    '## TARGET\n' + renderTarget(target),
    '## JOB DESCRIPTION\n' + renderJobDescription(jobDescription),
    '## OUTPUT FORMAT\n' + renderOutputFormat(),
  ].join('\n\n')

  return { system, user }
}
