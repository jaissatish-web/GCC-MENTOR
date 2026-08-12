import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { generate } from '@/lib/ai/provider'
import { extractJsonObject } from '@/lib/ai/extractionPrompt'
import {
  buildJobDescriptionUserPrompt,
  JOB_DESCRIPTION_SYSTEM_PROMPT,
  validateStructuredJobProfile,
} from '@/lib/ai/jobDescriptionPrompt'
import {
  buildJobMatchExplanationSystemPrompt,
  buildJobMatchExplanationUserPrompt,
  validateJobMatchExplanation,
} from '@/lib/ai/jobMatchExplanation'
import {
  computeDeterministicCategories,
  combineJobMatchScore,
} from '@/lib/jobMatch/requirementMapping'
import { buildJobMatchProfileInputFromFullProfile } from '@/lib/jobMatch/profileAdapters'
import {
  DETERMINISTIC_CATEGORIES,
  SEMANTIC_CATEGORIES,
  JOB_MATCH_SCORING_VERSION,
} from '@/types/jobMatch'
import type { JobMatchCategoryKey, JobMatchCategoryResult, JobMatchResult } from '@/types/jobMatch'
import type { CareerProfile, CareerProfileFull } from '@/types/careerProfile'

/**
 * Job Match — new authenticated route (TASK-092, PAGE_SPECS §C).
 *
 * This is a THIN, authenticated wrapper that reuses the EXACT same
 * computation `/api/ats-scan` already uses — the difference is the resume
 * source. `/ats-scan` builds its `JobMatchProfileInput` from a freshly
 * parsed resume (`buildJobMatchProfileInputFromDraft`); this route builds it
 * from the caller's SAVED Career Profile via the TASK-073 adapter
 * `buildJobMatchProfileInputFromFullProfile`. Every downstream step —
 * `computeDeterministicCategories`, `buildJobMatchExplanation*`,
 * `validateJobMatchExplanation`, `combineJobMatchScore`, and the category
 * assembly — is identical, so a JD pasted here produces the SAME
 * `JobMatchResult` shape `/ats-scan` and `/optimize` consume (the ticket's
 * functional-parity requirement). NOTHING under `lib/jobMatch/` or
 * `lib/ai/jobMatchExplanation.ts` is modified.
 *
 * Grounding: the explanation prompt receives the profile's OWN stored
 * professional summary as the standing candidate self-description (an
 * authenticated profile has no raw pasted resume). No field VALUES are
 * logged — only the user id + a generic engine-failure note.
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  const supabase = await createClient()
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }
  const jobDescription =
    body && typeof body === 'object' && 'job_description' in body
      ? (body as { job_description?: unknown }).job_description
      : undefined
  if (typeof jobDescription !== 'string' || jobDescription.trim().length === 0) {
    return NextResponse.json({ error: 'Missing job description' }, { status: 400 })
  }

  // Load the caller's profile + children (same fetch shape as GET /api/profile).
  const { data: profile, error: profileError } = await supabase
    .from('career_profiles')
    .select('*')
    .eq('user_id', user.id)
    .maybeSingle()

  if (profileError) {
    console.error('job-match GET profile error: id=' + user.id, profileError?.message ?? '')
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
  if (!profile) {
    return NextResponse.json({ error: 'Career Profile not found' }, { status: 404 })
  }
  const profileId = profile.id as string

  const childTables = [
    'profile_work_experience',
    'profile_skills',
    'profile_certifications',
    'profile_education',
    'profile_additional_information',
  ] as const
  const fetchChildren = async (table: (typeof childTables)[number]): Promise<unknown[]> => {
    const { data } = await supabase.from(table).select('*').eq('profile_id', profileId)
    return (data as unknown[] | null) ?? []
  }
  const [work_experience, skills, certifications, education, additional_information] = await Promise.all([
    fetchChildren('profile_work_experience'),
    fetchChildren('profile_skills'),
    fetchChildren('profile_certifications'),
    fetchChildren('profile_education'),
    fetchChildren('profile_additional_information'),
  ])

  const full: CareerProfileFull = {
    ...(profile as CareerProfile),
    work_experience: work_experience as CareerProfileFull['work_experience'],
    skills: skills as CareerProfileFull['skills'],
    certifications: certifications as CareerProfileFull['certifications'],
    education: education as CareerProfileFull['education'],
    additional_information: additional_information as CareerProfileFull['additional_information'],
  }

  let jobMatch: JobMatchResult | null = null
  try {
    const jdResult = await generate({
      system: JOB_DESCRIPTION_SYSTEM_PROMPT,
      user: buildJobDescriptionUserPrompt(jobDescription),
      maxTokens: 1536,
      temperature: 0.1,
      route: '/api/job-match',
      configKey: 'job_description',
    })
    const structuredJob = validateStructuredJobProfile(extractJsonObject(jdResult.text))

    if (structuredJob) {
      const profileInput = buildJobMatchProfileInputFromFullProfile(full)
      const deterministic = computeDeterministicCategories(profileInput, structuredJob)

      // Grounding source for the explanation: the profile's own stored summary
      // (an authenticated profile has no raw pasted resume).
      const summary = full.professional_summary ?? ''
      const explanationResult = await generate({
        system: buildJobMatchExplanationSystemPrompt(),
        user: buildJobMatchExplanationUserPrompt({
          resumeText: summary,
          professionalSummary: summary,
          job: structuredJob,
          jobDescriptionText: jobDescription,
          deterministicCategories: deterministic,
        }),
        maxTokens: 2048,
        temperature: 0.3,
        route: '/api/job-match',
        configKey: 'job_match_explanation',
      })
      const explanation = validateJobMatchExplanation(extractJsonObject(explanationResult.text))

      if (explanation) {
        const categories = {} as Record<JobMatchCategoryKey, JobMatchCategoryResult>
        for (const key of DETERMINISTIC_CATEGORIES) {
          const c = deterministic[key]
          if (c) categories[key] = { ...c, explanation: explanation.deterministicExplanations[key] ?? '' }
        }
        for (const key of SEMANTIC_CATEGORIES) {
          const s = explanation.semanticScores[key]
          categories[key] = { score: s.score, applicable: true, evidence: [], explanation: s.explanation }
        }
        jobMatch = {
          overall_score: combineJobMatchScore(categories),
          categories,
          diagnosis: explanation.diagnosis,
          scoring_version: JOB_MATCH_SCORING_VERSION,
        }
      }
    }
  } catch (e) {
    console.error('job-match: engine failed (non-fatal)', e instanceof Error ? e.message : String(e))
  }

  return NextResponse.json({ jobMatch })
}