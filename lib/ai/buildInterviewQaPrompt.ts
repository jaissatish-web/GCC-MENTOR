import type { CareerProfileFull, TargetCountry } from '@/types/careerProfile'
import type { ResumeDocument } from '@/lib/resumeDocument'
import { gccExperience } from '@/lib/experienceYears'
import { gccCountryFromLocation } from '@/lib/jobMatch/gccLocation'

const INTERVIEW_QA_PERSONA =
  'You are a senior Gulf hiring manager and interview coach preparing a candidate for a real role-specific GCC interview.'

/**
 * ONE SET, FIVE PARTS (2026-10-03). The set used to be one call for all 25
 * questions with the model's thinking on: 35–164s on the lab CVs, and 3 of 7
 * calls failed outright (a stalled host, thinking that used the whole token
 * budget, an answer cut off at 9,000 tokens) — each failure a repair, so a real
 * user could wait minutes. Five themed parts run in parallel with thinking off
 * on the fast hosts. Each part is told exactly what it may ask, so the parts do
 * not repeat each other.
 */
const INTERVIEW_QA_INSTRUCTIONS = `You write ONE PART of a 25-question interview preparation set for this candidate. The other parts are written separately, so ask ONLY the kind of question your part names (see THIS PART at the end).

Questions must be specific to this candidate and this job: name their real employers, projects, tools and results, and the advert's real requirements. No generic textbook questions.

Answers are first person, as the candidate would say them aloud: confident, concise, realistic, 45-75 words. Use only facts in the profile or CV. Never add a fact, number, employer, project, certification, licence, tool, standard, site, country, date or achievement that is not there.

THREE THINGS THAT MUST NEVER HAPPEN
1. An invented incident. A story answer starts from a real duty or result on the CV. The specific moment (the conflict, the mistake, the breakdown, the difficult customer) is not on the CV, so write it as a placeholder the candidate fills in.
   WRONG: "During testing I found a faulty valve, replaced it and re-tested."
   RIGHT: "On [project or role from the CV] I was responsible for [real duty]. [your example: one test that failed and how you traced the cause]. I fixed it by ..."
2. A "yes" the facts do not show. If the advert asks for a licence, certificate, visa, language, tool or system the candidate's facts do not show, the answer never claims it: it gives the closest real experience and adds "[if you hold it, say so and add it to your profile]".
   WRONG: "Yes, I hold a valid UAE driving licence."
   RIGHT: "My CV does not list a UAE driving licence. [if you hold one, say so and add it to your profile] In my current role I travel to sites across the city every week."
3. A wrong figure. State years exactly as FACTS gives them. Only the Gulf years in FACTS are Gulf experience — never call the whole career "GCC experience".

JSON fields:
- question: one sentence.
- why_asked: maximum 18 words — what the interviewer is checking.
- resume_basis: maximum 18 words naming the profile/CV facts used.
- follow_up: one short likely follow-up question, or null.
- tags: 1 to 3 short labels.
- difficulty: a mix of standard, strong and challenging.`

/** The five parts of a set. The counts add up to 25; each part's scope excludes the others'. */
export const QA_PARTS = [
  {
    key: 'intro',
    count: 5,
    categories: ['hr'],
    scope:
      'introduction and motivation only — tell me about yourself, why this role and company, why leave the current job, strengths and one development area, notice period / availability / salary expectations. No technical or project questions.',
  },
  {
    key: 'technical',
    count: 6,
    categories: ['technical'],
    scope:
      'technical knowledge and method — how the candidate does the tools, standards, methods and duties THE ADVERT asks for ("how do you...", "what is your approach to..."), answered from their real skills. Do not ask about one named project (another part does), and do not ask about requirements the candidate lacks (another part does).',
  },
  {
    key: 'projects',
    count: 5,
    categories: ['project'],
    scope:
      "the candidate's own projects and roles — each question about a DIFFERENT employer, project or role from the CV: scope, their own part, results. If the CV has fewer than five, ask about different duties within them.",
  },
  {
    key: 'behavioural',
    count: 4,
    categories: ['behavioral'],
    scope:
      'behavioural (STAR), one each: pressure or a tight deadline; a disagreement or conflict; a mistake and what was learned; teamwork or leading others. The situation comes from a real role on the CV; the specific moment is a placeholder (rule 1), so EVERY answer in this part contains one "[your example: ...]".',
  },
  {
    key: 'gulf_fit',
    count: 5,
    categories: ['gulf_readiness', 'company_role'],
    scope:
      'two gulf_readiness questions (Gulf work exposure or, with none, how they will adapt; working with Gulf clients, authorities or multicultural teams) and three company_role questions: up to two on requirements the candidate does NOT meet (rule 2: honest, closest real experience, how they would close the gap) and one "why should we hire you".',
  },
] as const

export type QaPart = (typeof QA_PARTS)[number]

export interface InterviewQaTarget {
  target_job_title: string
  target_country: TargetCountry | null
  target_company: string | null
  target_industry: string | null
}

export interface BuiltPrompt {
  persona: string
  instructions: string
  input: string
}

function line(label: string, value: string | null | undefined): string | null {
  return value && value.trim() ? `${label}: ${value}` : null
}

function formatDate(d: string | null | undefined): string {
  return d || 'present'
}

function renderProfile(profile: CareerProfileFull): string {
  const sections: string[] = []
  sections.push(
    [
      line('Full name', profile.full_name),
      line('Nationality', profile.nationality),
      line('Current location', profile.current_location),
      line('Current employer', profile.current_employer),
      line('Current project', profile.current_project),
      line('Visa status', profile.visa_status),
      profile.visa_transferable == null ? null : `Visa transferable: ${profile.visa_transferable ? 'yes' : 'no'}`,
      line('Notice period', profile.notice_period),
      profile.has_driving_license == null
        ? null
        : `Driving licence: ${profile.has_driving_license ? 'yes' : 'no'}`,
      line('Driving licence country', profile.driving_license_country),
    ]
      .filter(Boolean)
      .join('\n'),
  )

  if (profile.professional_summary) {
    sections.push('Professional summary:\n' + profile.professional_summary)
  }

  const experience = (profile.work_experience ?? [])
    .slice()
    .sort((a, b) => a.sort_order - b.sort_order)
    .slice(0, 5)
    .map((e) => {
      const bullets = (e.highlights ?? []).slice(0, 4).map((h) => `  - ${h}`).join('\n')
      return [
        `- ${e.role} at ${e.company} (${formatDate(e.start_date)} - ${formatDate(e.end_date)})${e.location ? `, ${e.location}` : ''}`,
        e.description ? `  ${e.description}` : '',
        bullets,
      ]
        .filter(Boolean)
        .join('\n')
    })
    .join('\n\n')
  sections.push('Work experience:\n' + (experience || 'None.'))

  const skills = (profile.skills ?? [])
    .slice()
    .sort((a, b) => a.sort_order - b.sort_order)
    .slice(0, 18)
    .map((s) => `- ${s.name}`)
    .join('\n')
  sections.push('Skills:\n' + (skills || 'None.'))

  const certifications = (profile.certifications ?? [])
    .slice()
    .sort((a, b) => a.sort_order - b.sort_order)
    .slice(0, 8)
    .map((c) => `- ${c.name}${c.issuer ? `, ${c.issuer}` : ''}`)
    .join('\n')
  if (certifications) sections.push('Certifications:\n' + certifications)

  const education = (profile.education ?? [])
    .slice()
    .sort((a, b) => a.sort_order - b.sort_order)
    .map((ed) => `- ${ed.degree}, ${ed.institution}${ed.field_of_study ? ` (${ed.field_of_study})` : ''}`)
    .join('\n')
  if (education) sections.push('Education:\n' + education)

  const additional = (profile.additional_information ?? [])
    .slice()
    .sort((a, b) => a.sort_order - b.sort_order)
    .map((i) => `- ${i.label}: ${i.value}`)
    .join('\n')
  if (additional) sections.push('Additional information:\n' + additional)

  return sections.join('\n\n')
}

function renderResumeDocument(doc: ResumeDocument): string {
  const sections: string[] = []
  sections.push(
    [
      line('Name', doc.header.displayName),
      line('Target title shown on CV', doc.header.targetJobTitle),
      line('Identity', doc.header.identityPrimary),
      line('Contact', doc.header.identityContact),
      line('Gulf details', doc.header.identityGulf),
    ]
      .filter(Boolean)
      .join('\n'),
  )
  if (doc.summary) sections.push('Optimized summary:\n' + doc.summary)
  sections.push(
    'Optimized experience:\n' +
      doc.experience
        .slice(0, 5)
        .map((item) =>
          [
            `- ${item.entry.role} at ${item.companyLine} (${item.range})`,
            ...item.bullets.slice(0, 4).map((b) => `  - ${b}`),
          ].join('\n'),
        )
        .join('\n\n'),
  )
  sections.push('Optimized skills:\n' + doc.skills.slice(0, 18).map((s) => `- ${s.name}`).join('\n'))
  if (doc.certifications.length > 0) {
    sections.push('Certifications on CV:\n' + doc.certifications.map((c) => `- ${c.display}`).join('\n'))
  }
  if (doc.education.length > 0) {
    sections.push('Education on CV:\n' + doc.education.map((e) => `- ${e.line}${e.years ? ` (${e.years})` : ''}`).join('\n'))
  }
  if (doc.additional.length > 0) {
    sections.push('Additional on CV:\n' + doc.additional.map((a) => `- ${a.display}`).join('\n'))
  }
  return sections.join('\n\n')
}

function renderTarget(target: InterviewQaTarget): string {
  return [
    `Job title: ${target.target_job_title}`,
    target.target_company ? `Company: ${target.target_company}` : null,
    target.target_country ? `Country: ${target.target_country}` : null,
    target.target_industry ? `Industry: ${target.target_industry}` : null,
  ]
    .filter(Boolean)
    .join('\n')
}

function renderJobDescription(jobDescription: string | null | undefined): string {
  return jobDescription?.trim() || 'No job description was provided. Use the target role and optimized resume.'
}

function outputSchema(part: QaPart): string {
  return `Return ONLY valid JSON. No markdown fences. Match this schema exactly:

{
  "questions": [
    {
      "category": "${part.categories.join(' or ')}",
      "difficulty": "standard | strong | challenging",
      "question": "string",
      "answer": "string, first-person answer the candidate can practice, 45-75 words",
      "why_asked": "string, max 18 words",
      "resume_basis": "string, max 18 words naming the resume/profile facts used",
      "follow_up": "string or null",
      "tags": ["short skill/topic labels"]
    }
  ]
}

Rules:
- questions must contain exactly ${part.count} items.
- Every question, answer, why_asked and resume_basis must be non-empty.
- tags must contain 1 to 3 strings.
- Do not include ids; the server will add them.`
}

const COUNTRY_NAMES: Record<string, string> = { uae: 'UAE', generic_gulf: 'the Gulf' }
function countryName(c: string): string {
  return COUNTRY_NAMES[c] ?? c.split('_').map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')
}

/** Gulf years from the candidate's own dated, Gulf-located roles — never the model's arithmetic. */
export function gulfFactLine(profile: CareerProfileFull, now: Date = new Date()): string {
  const gcc = gccExperience(profile.work_experience ?? [], (l) => gccCountryFromLocation(l)?.country ?? null, now)
  if (gcc.roles === 0) return 'Gulf (GCC) experience: none on the CV. Do not claim any.'
  const where = gcc.countries.map(countryName).join(', ')
  return gcc.years > 0
    ? `Gulf (GCC) experience: ${gcc.years}+ years, in ${where}. Every other year was outside the Gulf.`
    : `Gulf (GCC) experience: under one year, in ${where}. Do not state a number of Gulf years.`
}

export interface BuiltPartPrompt extends BuiltPrompt {
  part: QaPart
}

/**
 * One prompt per part. The system prompt and the facts are identical across the
 * five; only the closing THIS PART block and the schema differ.
 */
export function buildInterviewQaParts(
  profile: CareerProfileFull,
  resume: ResumeDocument,
  target: InterviewQaTarget,
  jobDescription?: string | null,
  /** Computed facts + gap list (lib/ai/proseClaims.ts renderAnswerFacts). */
  factsBlock?: string,
): BuiltPartPrompt[] {
  const shared = [
    '## CAREER PROFILE',
    renderProfile(profile),
    '## OPTIMIZED RESUME',
    renderResumeDocument(resume),
    '## TARGET JOB',
    renderTarget(target),
    '## JOB DESCRIPTION',
    renderJobDescription(jobDescription),
    [factsBlock ?? '## FACTS YOU MUST KEEP TO', gulfFactLine(profile)].join('\n'),
  ].join('\n\n')
  return QA_PARTS.map((part) => ({
    part,
    persona: INTERVIEW_QA_PERSONA,
    instructions: INTERVIEW_QA_INSTRUCTIONS,
    input: [
      shared,
      `## THIS PART\nWrite exactly ${part.count} questions: ${part.scope}`,
      '## OUTPUT FORMAT',
      outputSchema(part),
    ].join('\n\n'),
  }))
}
