import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { buildResumeDocument, type ResumeDocument } from '@/lib/resumeDocument'
import { buildInterviewQaPrompt } from '@/lib/ai/buildInterviewQaPrompt'
import { runAiTask, AiTaskError } from '@/lib/ai/runTask'
import { normalizeInterviewQa, validateInterviewQa } from '@/lib/ai/validateInterviewQa'
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
import type { InterviewQuestionSet, OptimizedContent } from '@/types/package'

// Generates 25 grounded answers in one response. In live smoke tests the route
// is correct but can take 2+ minutes on slower OpenRouter backends, so this
// route needs a longer ceiling than resume optimization.
export const maxDuration = 300

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

export async function POST(
  _request: Request,
  { params }: { params: { id: string } },
): Promise<NextResponse> {
  const supabase = await createClient()
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const packageId = params.id
  if (typeof packageId !== 'string' || packageId.trim() === '') {
    return NextResponse.json({ error: 'Invalid package id' }, { status: 400 })
  }

  const { data: pkgRow, error: pkgError } = await supabase
    .from('packages')
    .select(
      'id, profile_id, target_job_title, target_country, target_company, target_industry, job_description, optimized_content, skills_order, field_visibility_snapshot, document_snapshot, service_events',
    )
    .eq('id', packageId)
    .eq('user_id', user.id)
    .maybeSingle()

  if (pkgError) {
    console.error('interview-qa: package lookup error user=' + user.id + ' pkg=' + packageId, pkgError.message)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
  if (!pkgRow) return NextResponse.json({ error: 'Package not found' }, { status: 404 })

  const optimizedContent = pkgRow.optimized_content as OptimizedContent | null
  if (!optimizedContent) {
    return NextResponse.json(
      { error: 'Build the optimized resume for this job before generating interview Q&A.' },
      { status: 400 },
    )
  }

  const { data: profileRow, error: profileError } = await supabase
    .from('career_profiles')
    .select('*')
    .eq('id', pkgRow.profile_id as string)
    .eq('user_id', user.id)
    .maybeSingle()

  if (profileError) {
    console.error('interview-qa: profile lookup error user=' + user.id + ' pkg=' + packageId, profileError.message)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
  if (!profileRow) return NextResponse.json({ error: 'Profile not found' }, { status: 404 })

  const fetchChildren = async (table: (typeof CHILD_TABLES)[number]): Promise<unknown[]> => {
    const { data } = await supabase.from(table).select('*').eq('profile_id', pkgRow.profile_id as string)
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
          fieldVisibility: (pkgRow.field_visibility_snapshot as Record<string, boolean> | null) ?? null,
        })

  const prompt = buildInterviewQaPrompt(
    profile,
    resume,
    {
      target_job_title: String(pkgRow.target_job_title),
      target_country: (pkgRow.target_country as InterviewQuestionSet['target_country']) ?? null,
      target_company: (pkgRow.target_company as string | null) ?? null,
      target_industry: (pkgRow.target_industry as string | null) ?? null,
    },
    (pkgRow.job_description as string | null) ?? null,
  )

  let parsed
  try {
    const result = await runAiTask({
      service: 'qa_generation',
      route: '/api/packages/[id]/interview-qa',
      userId: user.id,
      persona: prompt.persona,
      instructions: prompt.instructions,
      input: prompt.input,
      grounding: {
        mode: 'enforced',
        profile,
        check: (_profile, output) => {
          const validation = validateInterviewQa(output)
          return {
            valid: validation.valid,
            failures: validation.failures.map((detail) => ({ detail })),
          }
        },
      },
      validateShape: (output) => {
        const validation = validateInterviewQa(output)
        return validation.valid ? null : validation.failures.slice(0, 5).join('; ')
      },
      maxTokens: 6000,
      temperature: 0.1,
      repairAttempts: 1,
    })
    parsed = normalizeInterviewQa(result.value)
  } catch (error) {
    console.error('interview-qa: AI call failed user=' + user.id + ' pkg=' + packageId, safeDetail(error))
    return NextResponse.json({ error: 'Could not generate interview Q&A. Please try again.' }, { status: 502 })
  }

  const interviewQuestions: InterviewQuestionSet = {
    id: crypto.randomUUID(),
    generated_at: new Date().toISOString(),
    target_job_title: String(pkgRow.target_job_title),
    target_company: (pkgRow.target_company as string | null) ?? null,
    target_country: (pkgRow.target_country as InterviewQuestionSet['target_country']) ?? null,
    question_count: parsed.questions.length,
    source: 'optimized_resume',
    questions: parsed.questions.map((question) => ({
      id: crypto.randomUUID(),
      ...question,
    })),
  }

  const { data: updated, error: updateError } = await supabase
    .from('packages')
    .update({
      interview_questions: interviewQuestions,
      service_events: appendPackageEvent(pkgRow.service_events, 'qa_generated', 'Interview Q&A generated', {
        question_count: parsed.questions.length,
      }),
    })
    .eq('id', packageId)
    .eq('user_id', user.id)
    .select('id')
    .maybeSingle()

  if (updateError) {
    console.error('interview-qa: save failed user=' + user.id + ' pkg=' + packageId, updateError.message)
    return NextResponse.json({ error: 'Your Q&A was generated but could not be saved. Please contact support.' }, { status: 500 })
  }
  if (!updated) return NextResponse.json({ error: 'Package not found' }, { status: 404 })

  console.info(`interview Q&A generated: pkg=${packageId} user=${user.id} set=${interviewQuestions.id}`)
  return NextResponse.json({ success: true, interview_questions: interviewQuestions })
}
