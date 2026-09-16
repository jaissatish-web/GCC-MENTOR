import type { ResumeDocument } from '@/lib/resumeDocument'
import type { CareerProfileFull, TargetCountry } from '@/types/careerProfile'
import type {
  MockInterviewDifficulty,
  MockInterviewMode,
  MockInterviewQuestion,
  MockInterviewRun,
} from '@/types/package'

export interface MockInterviewTarget {
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

export interface MockInterviewConfig {
  mode: MockInterviewMode
  difficulty: MockInterviewDifficulty
  questionCount: number
}

const PERSONA =
  'You are a senior Gulf-region interviewer and interview coach running a realistic text mock interview for a job seeker.'

function line(label: string, value: string | null | undefined): string | null {
  return value && value.trim() ? `${label}: ${value}` : null
}

function renderProfile(profile: CareerProfileFull): string {
  const exp = (profile.work_experience ?? [])
    .slice()
    .sort((a, b) => a.sort_order - b.sort_order)
    .slice(0, 5)
    .map((e) => {
      const bullets = (e.highlights ?? []).slice(0, 3).map((h) => `  - ${h}`).join('\n')
      return [`- ${e.role} at ${e.company}${e.location ? `, ${e.location}` : ''}`, e.description ? `  ${e.description}` : '', bullets]
        .filter(Boolean)
        .join('\n')
    })
    .join('\n\n')

  const skills = (profile.skills ?? [])
    .slice()
    .sort((a, b) => a.sort_order - b.sort_order)
    .slice(0, 16)
    .map((s) => s.name)
    .join(', ')

  return [
    line('Full name', profile.full_name),
    line('Nationality', profile.nationality),
    line('Current location', profile.current_location),
    line('Visa status', profile.visa_status),
    profile.visa_transferable == null ? null : `Visa transferable: ${profile.visa_transferable ? 'yes' : 'no'}`,
    line('Notice period', profile.notice_period),
    profile.professional_summary ? `Summary: ${profile.professional_summary}` : null,
    `Skills: ${skills || 'None'}`,
    `Experience:\n${exp || 'None'}`,
  ]
    .filter(Boolean)
    .join('\n')
}

function renderResume(resume: ResumeDocument): string {
  return [
    line('CV name', resume.header.displayName),
    line('CV target title', resume.header.targetJobTitle),
    line('Gulf details', resume.header.identityGulf),
    resume.summary ? `Optimized summary: ${resume.summary}` : null,
    'Optimized experience:\n' +
      resume.experience
        .slice(0, 5)
        .map((e) => [`- ${e.entry.role} at ${e.companyLine} (${e.range})`, ...e.bullets.slice(0, 3).map((b) => `  - ${b}`)].join('\n'))
        .join('\n\n'),
    'Optimized skills: ' + resume.skills.slice(0, 16).map((s) => s.name).join(', '),
  ]
    .filter(Boolean)
    .join('\n\n')
}

function renderTarget(target: MockInterviewTarget): string {
  return [
    `Job title: ${target.target_job_title}`,
    target.target_company ? `Company: ${target.target_company}` : null,
    target.target_country ? `Country: ${target.target_country}` : null,
    target.target_industry ? `Industry: ${target.target_industry}` : null,
  ]
    .filter(Boolean)
    .join('\n')
}

function modeInstruction(mode: MockInterviewMode): string {
  const map: Record<MockInterviewMode, string> = {
    hr: 'Prioritize introduction, motivation, career movement, strengths, salary/notice/visa practicality and culture fit.',
    technical: 'Prioritize tools, standards, engineering/domain decisions, troubleshooting, project delivery and technical depth.',
    gulf_readiness: 'Prioritize Gulf-site readiness, client expectations, visa/location practicality, safety, standards and cross-cultural work.',
    manager: 'Prioritize leadership, ownership, stakeholder handling, project pressure, conflict, reporting and decision making.',
    mixed: 'Mix HR, technical, project, behavioral, Gulf readiness and manager-style questions.',
  }
  return map[mode]
}

export function buildMockInterviewStartPrompt(
  profile: CareerProfileFull,
  resume: ResumeDocument,
  target: MockInterviewTarget,
  jobDescription: string | null | undefined,
  config: MockInterviewConfig,
): BuiltPrompt {
  return {
    persona: PERSONA,
    instructions: [
      `Create a text mock interview plan with exactly ${config.questionCount} questions.`,
      modeInstruction(config.mode),
      `Difficulty: ${config.difficulty}. Make the questions realistic for a Gulf interview and specific to the optimized resume.`,
      'Do not invent facts. Ask from the supplied profile, optimized resume and job description.',
      'Keep every question one sentence. ideal_answer_points must be short bullet fragments, not full paragraphs.',
    ].join('\n'),
    input: [
      '## CAREER PROFILE',
      renderProfile(profile),
      '## OPTIMIZED RESUME',
      renderResume(resume),
      '## TARGET JOB',
      renderTarget(target),
      '## JOB DESCRIPTION',
      jobDescription?.trim() || 'No job description was provided.',
      '## OUTPUT FORMAT',
      `Return ONLY JSON:
{
  "opening_note": "one short sentence",
  "questions": [
    {
      "category": "hr | technical | project | behavioral | gulf_readiness | company_role",
      "focus": "short focus label",
      "question": "one interview question",
      "ideal_answer_points": ["1-4 short points"]
    }
  ]
}`,
    ].join('\n\n'),
  }
}

export function buildMockInterviewFeedbackPrompt(
  run: MockInterviewRun,
  question: MockInterviewQuestion,
  answer: string,
): BuiltPrompt {
  return {
    persona: PERSONA,
    instructions: [
      'Evaluate one mock interview answer.',
      'Be direct, useful and fair. Do not score speaking/audio because this is text-only.',
      'Feedback must be short enough to read during the interview.',
      // Review finding X01 (2026-09-15): this answer is written in the
      // candidate's voice to be repeated to an employer, and the model sees no
      // profile here — only what the candidate typed.
      "The better_answer rewrites the candidate's own answer. Use only facts the candidate stated in their answer or that appear in the expected points.",
      'Where a stronger answer needs a detail the candidate did not give (a number, a project, a tool), write a bracketed placeholder such as [project name] or [number] instead of inventing it.',
    ].join('\n'),
    input: [
      '## INTERVIEW CONTEXT',
      `Role: ${run.target_job_title}`,
      `Mode: ${run.mode}`,
      `Difficulty: ${run.difficulty}`,
      '## QUESTION',
      question.question,
      '## EXPECTED POINTS',
      question.ideal_answer_points.map((p) => `- ${p}`).join('\n'),
      '## CANDIDATE ANSWER',
      answer,
      '## OUTPUT FORMAT',
      `Return ONLY JSON:
{
  "score": 0,
  "feedback": "2-4 concise sentences",
  "better_answer": "first-person improved answer, 55-90 words",
  "follow_up": "one short follow-up question or null"
}`,
    ].join('\n\n'),
  }
}

export function buildMockInterviewReportPrompt(run: MockInterviewRun): BuiltPrompt {
  const answered = run.questions
    .filter((q) => q.answer)
    .map((q, i) =>
      [
        `Q${i + 1}: ${q.question}`,
        `Answer: ${q.answer}`,
        q.feedback ? `Feedback: ${q.feedback}` : null,
        q.score == null ? null : `Score: ${q.score}`,
      ]
        .filter(Boolean)
        .join('\n'),
    )
    .join('\n\n')

  const answeredCount = run.questions.filter((q) => q.answer).length
  return {
    persona: PERSONA,
    instructions: [
      'Create the final mock interview report from the saved text answers.',
      // Early finish is allowed (audit M05): say which questions were evaluated.
      `The candidate answered ${answeredCount} of ${run.questions.length} questions. Evaluate only the answered ones; do not guess how unanswered questions would have gone.`,
      'This is preparation feedback on written answers, not a prediction of whether the candidate will be hired.',
      'Do not claim to evaluate voice, accent, pace, pronunciation or audio confidence.',
      'Scores must be integers from 0 to 100.',
      'Give practical improvements the candidate can use before a real Gulf interview.',
    ].join('\n'),
    input: [
      '## INTERVIEW CONTEXT',
      `Role: ${run.target_job_title}`,
      `Company: ${run.target_company || 'Not specified'}`,
      `Country: ${run.target_country || 'Not specified'}`,
      `Mode: ${run.mode}`,
      `Difficulty: ${run.difficulty}`,
      '## ANSWERS',
      answered || 'No answers were submitted.',
      '## OUTPUT FORMAT',
      `Return ONLY JSON:
{
  "overall_score": 0,
  "technical_score": 0,
  "role_fit_score": 0,
  "gulf_readiness_score": 0,
  "answer_structure_score": 0,
  "strengths": ["3-5 short items"],
  "weak_points": ["3-5 short items"],
  "risky_answers": ["0-5 short items"],
  "improvement_plan": ["3-5 practical actions"],
  "next_practice_questions": ["3-5 questions"]
}`,
    ].join('\n\n'),
  }
}
