import type { CareerProfileFull, TargetCountry } from '@/types/careerProfile'
import type { ResumeDocument } from '@/lib/resumeDocument'

const INTERVIEW_QA_PERSONA =
  'You are a senior Gulf hiring manager and interview coach preparing a candidate for a real role-specific GCC interview.'

const INTERVIEW_QA_INSTRUCTIONS = `Create exactly 25 interview questions and strong sample answers.

The questions must feel specific to this candidate, their optimized resume, their past projects, and the target role. Avoid generic textbook questions unless they are adapted to the candidate's own background.

Cover this mix:
- HR and introduction questions
- technical and industry-standard questions
- project and site-experience questions
- Gulf readiness questions about GCC exposure, visa/location/client expectations where supported
- role/company fit questions from the target job and job description

Answers must be first-person, interview-ready, confident, concise, and realistic. Each answer must be 45-75 words. They should help the candidate speak from their real experience. Do not add any fact, number, employer, project, certification, tool, standard, site, country, date, or achievement that is not present in the supplied profile or optimized resume.

Keep the JSON compact:
- question: one sentence.
- why_asked: maximum 18 words.
- resume_basis: maximum 18 words.
- follow_up: one short question or null.
- tags: 1 to 3 short labels.

If a question is about a requirement that appears in the job description but the candidate's facts do not support it, the answer must handle that honestly without pretending experience.`

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

function outputSchema(): string {
  return `Return ONLY valid JSON. No markdown fences. Match this schema exactly:

{
  "questions": [
    {
      "category": "hr | technical | project | behavioral | gulf_readiness | company_role",
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
- questions must contain exactly 25 items.
- Every question, answer, why_asked and resume_basis must be non-empty.
- tags must contain 1 to 3 strings.
- Do not include ids; the server will add them.`
}

export function buildInterviewQaPrompt(
  profile: CareerProfileFull,
  resume: ResumeDocument,
  target: InterviewQaTarget,
  jobDescription?: string | null,
): BuiltPrompt {
  return {
    persona: INTERVIEW_QA_PERSONA,
    instructions: INTERVIEW_QA_INSTRUCTIONS,
    input: [
      '## CAREER PROFILE',
      renderProfile(profile),
      '## OPTIMIZED RESUME',
      renderResumeDocument(resume),
      '## TARGET JOB',
      renderTarget(target),
      '## JOB DESCRIPTION',
      renderJobDescription(jobDescription),
      '## OUTPUT FORMAT',
      outputSchema(),
    ].join('\n\n'),
  }
}
