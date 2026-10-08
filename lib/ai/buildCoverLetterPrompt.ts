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

import { PROFILE_ONLY_SERVICE_RULE } from '@/lib/careerProfileServiceContext'
import { GROUNDING_INSTRUCTION } from './grounding'
import type { CareerProfileFull, ProfileWorkExperience, TargetCountry } from '@/types/careerProfile'
import type { CoverLetterTone } from '@/types/package'
import type { ResumeDocument } from '@/lib/resumeDocument'

// ONE persona line for cover letters (not a per-industry persona from
// lib/ai/personas.ts). Changed 2026-10-03: the original spec line (docs/archive/
// PROMPTS.md §8) was "a senior recruiter writing a persuasive letter on the
// candidate's behalf", and the model took it literally — a live letter opened
// "I am writing to recommend Rania Haddad ... she brings". The applicant sends
// this letter, so it is written as the applicant. The route also rejects a
// letter written about the candidate (lib/ai/naturalLetter.ts).
const COVER_LETTER_PERSONA =
  "You write a job applicant's OWN cover letter to a Gulf employer, in the applicant's voice: first person (I, my, me), as if they wrote and signed it themselves. You are an experienced Gulf career writer, but the letter never mentions you, a recruiter or an agency, and never refers to the applicant by name or as he or she."

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

/**
 * Natural voice (founder, 2026-10-02: "very natural, not like AI tone"). The
 * phrases below are the ones recruiters now read as machine-written; the
 * letter must sound like a capable person writing their own letter.
 */
const NATURAL_VOICE = `VOICE — sound like the candidate wrote it, not like AI:
- Plain, direct sentences in the first person. Mix short and longer sentences.
- Open with something specific: the role and the candidate's most relevant real result or experience in the first two sentences. No warm-up sentence.
- Every body paragraph links one or two facts from the SAVED CV to something the JOB DESCRIPTION asks for, in the job description's own words.
- Name at most one short group of tools; never a long run of skills or keywords.
- Never use these phrases or anything like them: "I am writing to express my (strong) interest", "I am confident in my ability", "I am excited about the opportunity", "aligns (well/closely/perfectly) with", "well-versed", "eager to", "keen to leverage", "leverage", "passionate", "dynamic", "proven track record", "esteemed", "valuable asset", "add immediate value", "I believe I would be a great fit", "furthermore", "moreover", "in today's".
- No em dashes or en dashes; use commas or full stops.
- Never claim experience while saying it is not listed or not explicit ("though not explicitly listed", "a natural extension of"). Either the CV shows it, or say plainly that the candidate has not done it yet.`

/**
 * The four styles offered on /cover-letter (2026-08-18, founder decision).
 * Each is an ADDITION on top of LETTER_FORMAT_NOTE above, not a replacement
 * of it — the base conventions (greeting, grounding, no invented recipient)
 * always apply; a tone only shifts word choice, emphasis and length within
 * those conventions. `professional` restates the base tone explicitly so
 * every tone is an equally real, equally instructed choice — not three
 * special cases plus one implicit default.
 */
const TONE_INSTRUCTIONS: Record<CoverLetterTone, string> = {
  professional: `TONE: PROFESSIONAL (standard).
Polished, formal and courteous — the standard register expected in a Gulf
corporate application. Confident without being casual.`,
  short: `TONE: SHORT.
Keep the whole letter brief: exactly ONE body paragraph, and the entire
letter (opening through sign-off) under 120 words. Cut every
sentence that does not directly support why the candidate fits the role — no
throat-clearing, no restating the job posting back at the reader.`,
  technical: `TONE: TECHNICAL.
Lead with concrete technical substance: specific tools, systems, standards,
methodologies and certifications drawn from the profile, and quantified
technical outcomes wherever the profile supports them. Written for a
technical hiring manager or engineering lead who judges competence by
specificity, not warmth — but still a courteous letter, never a list of
fragments.`,
  explanatory: `TONE: EXPLANATORY.
Take the space to make the REASONING visible: connect specific past
experience to specific expectations of the target role, so the logic of the
career move is shown, not just asserted. Slightly longer and more narrative
than the standard letter — up to 3 body paragraphs — while staying strictly
grounded in the profile throughout.`,
}

const FIXED_FIELD_INSTRUCTION =
  'Everything in the CAREER PROFILE section below is read-only reference material. ' +
  'You may draw on it freely to write the letter, but you must never invent ' +
  'facts beyond it — see the grounding rule above.'

export interface CoverLetterTarget {
  target_job_title: string
  // Optional (migration 043) — see lib/ai/personas.ts's fallback note. Not
  // used for a per-industry persona here (this file's persona is fixed —
  // see COVER_LETTER_PERSONA above), only carried through as context.
  target_industry: string | null
  // Optional (migration 030) — see types/careerProfile.ts's note.
  target_country: TargetCountry | null
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
  // What Gulf adverts ask applicants to state (2026-09-23): a real KSA advert
  // asked for current location AND notice period, and the letter could only
  // say the location because these two never reached it.
  if (profile.visa_status) lines.push(`Visa status: ${profile.visa_status}`)
  if (profile.notice_period) lines.push(`Notice period: ${profile.notice_period}`)
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
  const lines = [`Job title: ${target.target_job_title}`]
  // Optional (migration 043 for industry, 030 for country/company) — only
  // add a line when actually set.
  if (target.target_industry) lines.push(`Industry: ${target.target_industry}`)
  if (target.target_country) lines.push(`Country: ${target.target_country}`)
  if (target.target_company) lines.push(`Company: ${target.target_company}`)
  return lines.join('\n')
}

/** Same fallback text style as buildOptimizationPrompt.ts's renderJobDescription. */
function renderJobDescription(jobDescription: string | undefined | null): string {
  if (jobDescription && jobDescription.trim() !== '') return jobDescription
  return 'No job description was provided. Write the letter against the target job title, industry and company alone.'
}

/**
 * The saved CV for this job (audit M04, 2026-09-15). The letter goes out WITH
 * this document, so it is the primary source: same wording of roles, the same
 * achievements, nothing the CV does not say. The Career Profile below it stays
 * as supporting reference.
 */
function renderSavedResume(doc: ResumeDocument): string {
  const lines: string[] = []
  if (doc.header?.targetJobTitle) lines.push(`Title on the CV: ${doc.header.targetJobTitle}`)
  if (doc.summary) lines.push('Summary:\n' + doc.summary)
  const experience = (doc.experience ?? [])
    .map((e) => [`- ${e.entry.role} at ${e.companyLine} (${e.range})`, ...(e.bullets ?? []).map((b) => `  - ${b}`)].join('\n'))
    .join('\n\n')
  if (experience) lines.push('Experience:\n' + experience)
  if ((doc.skills ?? []).length > 0) lines.push('Skills: ' + doc.skills.map((s) => s.name).join(', '))
  if ((doc.certifications ?? []).length > 0) lines.push('Certifications: ' + doc.certifications.map((c) => c.display).join('; '))
  return lines.join('\n\n')
}

const SAVED_RESUME_RULE =
  'The SAVED CV above is the document the employer will read with this letter. Write from it first, ' +
  'using its wording for roles and achievements. You may add a fact from the Career Profile only where the ' +
  'CV does not contradict it, and you must never add anything that appears in neither.'

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
  "sign_off": "string — only the closing word, e.g. 'Sincerely,' (the applicant's name and contact details are added after it automatically)"
}

body_paragraphs must contain 1 to 3 paragraphs. Every paragraph is written by the applicant in the first person.`
}

/**
 * Facts computed in code and handed to the model (2026-09-18). A letter once
 * said "nearly 13 years" for a 15-year career and claimed three requirements
 * the job analysis had marked missing. The model is told the number and the
 * gaps; lib/ai/proseClaims.ts then checks it kept to them.
 */
export interface CoverLetterFacts {
  totalYears: number | null
  /** Job requirements the analysis found NO evidence for. */
  gaps: string[]
}

function renderFacts(facts: CoverLetterFacts): string {
  const lines: string[] = []
  if (facts.totalYears !== null) {
    lines.push(
      `Total professional experience: ${facts.totalYears}+ years. If you state years of experience, write exactly "${facts.totalYears}+ years". Never compute your own figure.`,
    )
  }
  if (facts.gaps.length > 0) {
    lines.push(
      'REQUIREMENTS THE CANDIDATE DOES NOT MEET: the job asks for these and the profile shows no evidence of them:',
      ...facts.gaps.map((g) => `- ${g}`),
      'Never claim, imply or paraphrase experience of these (no "familiar with", no "supported", no "a blend of" that includes them). You may connect honest adjacent experience the profile DOES show, for example reviewing, verifying or commissioning what others designed, and say the candidate is keen to grow into the requirement. One honest bridge sentence is worth more than any claim.',
    )
  }
  return lines.join('\n')
}

export function buildCoverLetterPrompt(
  profile: CareerProfileFull,
  target: CoverLetterTarget,
  jobDescription?: string | null,
  tone: CoverLetterTone = 'professional',
  savedResume?: ResumeDocument | null,
  facts?: CoverLetterFacts,
  source: 'optimized_resume' | 'career_profile' = 'optimized_resume',
): BuiltPrompt {
  const isRaw = source === 'career_profile'
  const system = [
    COVER_LETTER_PERSONA,
    GROUNDING_INSTRUCTION,
    LETTER_FORMAT_NOTE,
    isRaw ? NATURAL_VOICE.replace('Every body paragraph links one or two facts from the SAVED CV to something the JOB DESCRIPTION asks for, in the job description\'s own words.', 'Every body paragraph highlights one or two relevant facts from the saved Career Profile Resume. There is no job description to match.') : NATURAL_VOICE,
    TONE_INSTRUCTIONS[tone],
    ...(isRaw ? [PROFILE_ONLY_SERVICE_RULE, 'Write a general professional introduction letter for opportunities in the candidate’s evidenced field, not an application to a specific advertised vacancy.'] : []),
  ].join('\n\n')

  const user = [
    ...(savedResume ? [(isRaw ? '## CAREER PROFILE RESUME — PRIMARY SOURCE\n' : '## SAVED CV FOR THIS JOB — PRIMARY SOURCE\n') + renderSavedResume(savedResume), '## RULE\n' + SAVED_RESUME_RULE] : []),
    renderCareerProfile(profile),
    isRaw ? '## PROFESSIONAL FIELD\n' + renderTarget(target) : '## TARGET\n' + renderTarget(target),
    ...(!isRaw ? ['## JOB DESCRIPTION\n' + renderJobDescription(jobDescription)] : []),
    ...(facts && (facts.totalYears !== null || facts.gaps.length > 0) ? ['## FACTS YOU MUST KEEP TO\n' + renderFacts(facts)] : []),
    '## OUTPUT FORMAT\n' + renderOutputFormat(),
  ].join('\n\n')

  return { system, user }
}
