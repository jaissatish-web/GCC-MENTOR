import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { buildResumeDocument, type ResumeDocument } from '@/lib/resumeDocument'
import { buildMockInterviewStartPrompt } from '@/lib/ai/buildMockInterviewPrompt'
import { runAiTask, AiTaskError } from '@/lib/ai/runTask'
import { normalizeMockInterviewQuestions, validateMockInterviewStart } from '@/lib/ai/validateMockInterview'
import { appendPackageEvent } from '@/lib/packageEvents'
import type {
  CareerProfile,
  CareerProfileFull,
  ProfileAdditionalInformation,
  ProfileCertification,
  ProfileEducation,
  ProfileSkill,
  ProfileWorkExperience,
} from '@/types/careerProfile'
import type {
  MockInterviewDifficulty,
  MockInterviewMode,
  MockInterviewRun,
  OptimizedContent,
} from '@/types/package'

export const maxDuration = 120

const MODES: MockInterviewMode[] = ['hr', 'technical', 'gulf_readiness', 'manager', 'mixed']
const DIFFICULTIES: MockInterviewDifficulty[] = ['standard', 'strong', 'challenging']
const COUNTS = [5, 10, 15]
const CHILD_TABLES = [
  'profile_work_experience',
  'profile_skills',
  'profile_certifications',
  'profile_education',
  'profile_additional_information',
] as const

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v)
}

function safeDetail(error: unknown): string {
  if (error instanceof AiTaskError) return `${error.kind}: ${error.detail ?? error.message}`
  return error instanceof Error ? error.message : String(error)
}

export async function POST(request: Request, { params }: { params: { id: string } }): Promise<NextResponse> {
  const supabase = await createClient()
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()
  if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const rawBody = await request.json().catch(() => ({}))
  const body = isRecord(rawBody) ? rawBody : {}
  const mode: MockInterviewMode = MODES.includes(body.mode as MockInterviewMode) ? (body.mode as MockInterviewMode) : 'mixed'
  const difficulty: MockInterviewDifficulty = DIFFICULTIES.includes(body.difficulty as MockInterviewDifficulty)
    ? (body.difficulty as MockInterviewDifficulty)
    : 'standard'
  const questionCount = COUNTS.includes(Number(body.questionCount)) ? Number(body.questionCount) : 10

  const packageId = params.id
  const { data: pkgRow, error: pkgError } = await supabase
    .from('packages')
    .select(
      'id, profile_id, target_job_title, target_country, target_company, target_industry, job_description, optimized_content, skills_order, field_visibility_snapshot, document_snapshot, mock_interview_runs, service_events',
    )
    .eq('id', packageId)
    .eq('user_id', user.id)
    .maybeSingle()

  if (pkgError) {
    console.error('mock-interview start: package lookup error user=' + user.id + ' pkg=' + packageId, pkgError.message)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
  if (!pkgRow) return NextResponse.json({ error: 'Package not found' }, { status: 404 })
  const optimizedContent = pkgRow.optimized_content as OptimizedContent | null
  if (!optimizedContent) {
    return NextResponse.json({ error: 'Build the optimized resume before starting a mock interview.' }, { status: 400 })
  }

  const { data: profileRow, error: profileError } = await supabase
    .from('career_profiles')
    .select('*')
    .eq('id', pkgRow.profile_id)
    .eq('user_id', user.id)
    .maybeSingle()
  if (profileError) {
    console.error('mock-interview start: profile lookup error user=' + user.id + ' pkg=' + packageId, profileError.message)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
  if (!profileRow) return NextResponse.json({ error: 'Profile not found' }, { status: 404 })

  const fetchChildren = async (table: (typeof CHILD_TABLES)[number]): Promise<unknown[]> => {
    const { data } = await supabase.from(table).select('*').eq('profile_id', pkgRow.profile_id)
    return (data as unknown[] | null) ?? []
  }
  const [work_experience, skills, certifications, education, additional_information] = await Promise.all([
    fetchChildren('profile_work_experience'),
    fetchChildren('profile_skills'),
    fetchChildren('profile_certifications'),
    fetchChildren('profile_education'),
    fetchChildren('profile_additional_information'),
  ])

  const profile: CareerProfileFull = {
    ...(profileRow as CareerProfile),
    work_experience: work_experience as ProfileWorkExperience[],
    skills: skills as ProfileSkill[],
    certifications: certifications as ProfileCertification[],
    education: education as ProfileEducation[],
    additional_information: additional_information as ProfileAdditionalInformation[],
  }

  const snapshot = pkgRow.document_snapshot
  const resume: ResumeDocument =
    isRecord(snapshot) && isRecord(snapshot.header)
      ? (snapshot as unknown as ResumeDocument)
      : buildResumeDocument({
          profile,
          optimizedContent,
          skillsOrder: (pkgRow.skills_order as string[] | null) ?? [],
          fieldVisibility: pkgRow.field_visibility_snapshot ?? null,
        })

  const prompt = buildMockInterviewStartPrompt(
    profile,
    resume,
    {
      target_job_title: pkgRow.target_job_title,
      target_country: pkgRow.target_country,
      target_company: pkgRow.target_company,
      target_industry: pkgRow.target_industry,
    },
    pkgRow.job_description,
    { mode, difficulty, questionCount },
  )

  let normalized
  let openingNote = ''
  try {
    const result = await runAiTask({
      service: 'mock_interview',
      route: '/api/packages/[id]/mock-interview/start',
      userId: user.id,
      persona: prompt.persona,
      instructions: prompt.instructions,
      input: prompt.input,
      grounding: {
        mode: 'enforced',
        profile,
        check: (_profile, output) => {
          const failures = validateMockInterviewStart(output, questionCount)
          return { valid: failures.length === 0, failures: failures.map((detail) => ({ detail })) }
        },
      },
      validateShape: (output) => {
        const failures = validateMockInterviewStart(output, questionCount)
        return failures.length ? failures.slice(0, 5).join('; ') : null
      },
      maxTokens: 3500,
      temperature: 0.2,
      repairAttempts: 1,
    })
    openingNote = String((result.value as { opening_note?: unknown }).opening_note ?? '').trim()
    normalized = normalizeMockInterviewQuestions(result.value)
  } catch (error) {
    console.error('mock-interview start: AI call failed user=' + user.id + ' pkg=' + packageId, safeDetail(error))
    return NextResponse.json({ error: 'Could not start the mock interview. Please try again.' }, { status: 502 })
  }

  const run: MockInterviewRun = {
    id: crypto.randomUUID(),
    generated_at: new Date().toISOString(),
    completed_at: null,
    target_job_title: pkgRow.target_job_title,
    target_company: pkgRow.target_company,
    target_country: pkgRow.target_country,
    mode,
    difficulty,
    question_count: questionCount,
    current_index: 0,
    status: 'in_progress',
    opening_note: openingNote || 'Your mock interview is ready.',
    questions: normalized.map((q) => ({
      id: crypto.randomUUID(),
      ...q,
      answer: null,
      feedback: null,
      better_answer: null,
      follow_up: null,
      score: null,
      answered_at: null,
    })),
    final_report: null,
  }

  const existing = Array.isArray(pkgRow.mock_interview_runs) ? (pkgRow.mock_interview_runs as MockInterviewRun[]) : []
  const { error: updateError } = await supabase
    .from('packages')
    .update({
      mock_interview_runs: [...existing, run],
      service_events: appendPackageEvent(pkgRow.service_events, 'mock_interview_started', 'Mock interview started', {
        mode,
        difficulty,
        question_count: questionCount,
      }),
    })
    .eq('id', packageId)
    .eq('user_id', user.id)

  if (updateError) {
    console.error('mock-interview start: save failed user=' + user.id + ' pkg=' + packageId, updateError.message)
    return NextResponse.json({ error: 'The interview was created but could not be saved. Please try again.' }, { status: 500 })
  }

  return NextResponse.json({ success: true, run })
}
