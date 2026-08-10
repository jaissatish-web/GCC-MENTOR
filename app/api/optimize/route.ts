import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { generate } from '@/lib/ai/provider'
import { buildOptimizationPrompt } from '@/lib/ai/buildOptimizationPrompt'
import type { SelectedBlocks, OptimizationTarget } from '@/lib/ai/buildOptimizationPrompt'
import { validateGrounding } from '@/lib/ai/validateGrounding'
import type { ValidationFailure } from '@/lib/ai/validateGrounding'
import { extractJsonObject } from '@/lib/ai/extractionPrompt'
import {
  buildJobDescriptionUserPrompt,
  JOB_DESCRIPTION_SYSTEM_PROMPT,
  validateStructuredJobProfile,
} from '@/lib/ai/jobDescriptionPrompt'
import { computeDeterministicCategories } from '@/lib/jobMatch/requirementMapping'
import { buildJobMatchProfileInputFromFullProfile } from '@/lib/jobMatch/profileAdapters'
import type { JobMatchCategoryKey, JobMatchCategoryResult } from '@/types/jobMatch'
import {
  getRateLimitStatus,
  incrementRateLimit,
  LIMIT_ACTION_OPTIMIZATION,
} from '@/lib/rateLimit'
import { consumeOptimizationCredit } from '@/lib/admin/credits'
import type {
  CareerProfile,
  CareerProfileFull,
  ProfileAdditionalInformation,
  ProfileCertification,
  ProfileEducation,
  ProfileSkill,
  ProfileWorkExperience,
  TargetCountry,
} from '@/types/careerProfile'
import type { OptimizationLevel, OptimizedContent, ExperienceBlock } from '@/types/package'

/**
 * Optimization route (TASK-021).
 *
 * Loads the caller's profile, builds the prompt (TASK-018), calls the model,
 * validates the response (TASK-019), retries once on a hard failure with a
 * corrective instruction, and on success creates an unpaid `packages` row.
 * Never returns unvalidated output. Nothing about validity is trusted from
 * the client — everything the model returns is re-derived from real profile
 * data or the validator before it touches the database.
 *
 * RATE LIMITED, deliberately beyond the ticket's literal text — see the
 * comment on LIMIT_ACTION_OPTIMIZATION in lib/rateLimit.ts. Optimization is
 * NOT payment-gated (packages get created and the full diff is shown at
 * screen 08, before payment at screen 09), so "paid actions are
 * self-limiting" (docs/ADMIN.md §5) does not hold for this specific action.
 *
 * CLOSES docs/TASKS.md Unplanned #5: `packages.profile_id` ownership was
 * never verified server-side anywhere. Here, the profile is loaded scoped
 * to `user_id = caller` AND `id = profileId` in the same query — if
 * `profileId` belongs to another user, the query returns no row and this
 * 404s. `profileId` is never trusted alone.
 */

const TARGET_COUNTRIES: TargetCountry[] = [
  'saudi_arabia', 'uae', 'qatar', 'oman', 'kuwait', 'bahrain', 'generic_gulf',
]
const OPTIMIZATION_LEVELS: OptimizationLevel[] = ['easy', 'moderate', 'high']

const CHILD_TABLES = [
  'profile_work_experience',
  'profile_skills',
  'profile_certifications',
  'profile_education',
  'profile_additional_information',
] as const

function isObject(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v)
}

interface ParsedBody {
  profileId: string
  targetFields: OptimizationTarget
  jobDescription: string | null
  selectedBlocks: SelectedBlocks
  level: OptimizationLevel
}

/** Validate the request body. Returns the offending field name only (never a value) or the parsed body. */
function validateBody(body: unknown): { error: string } | { body: ParsedBody } {
  if (!isObject(body)) return { error: 'body' }

  if (typeof body.profileId !== 'string' || body.profileId.trim() === '') return { error: 'profileId' }

  const tf = body.targetFields
  if (!isObject(tf)) return { error: 'targetFields' }
  if (typeof tf.target_job_title !== 'string' || tf.target_job_title.trim() === '') {
    return { error: 'targetFields.target_job_title' }
  }
  if (typeof tf.target_industry !== 'string' || tf.target_industry.trim() === '') {
    return { error: 'targetFields.target_industry' }
  }
  // Optional (migration 030) — see types/careerProfile.ts's note. null/absent
  // is valid; if present it must be a real enum member.
  if (tf.target_country !== undefined && tf.target_country !== null) {
    if (typeof tf.target_country !== 'string' || !TARGET_COUNTRIES.includes(tf.target_country as TargetCountry)) {
      return { error: 'targetFields.target_country' }
    }
  }
  if (tf.target_company !== undefined && tf.target_company !== null && typeof tf.target_company !== 'string') {
    return { error: 'targetFields.target_company' }
  }

  if (body.jobDescription !== undefined && body.jobDescription !== null && typeof body.jobDescription !== 'string') {
    return { error: 'jobDescription' }
  }

  const sb = body.selectedBlocks
  if (!isObject(sb)) return { error: 'selectedBlocks' }
  if (typeof sb.summary !== 'boolean') return { error: 'selectedBlocks.summary' }
  if (!Array.isArray(sb.experienceIds) || sb.experienceIds.some((x) => typeof x !== 'string')) {
    return { error: 'selectedBlocks.experienceIds' }
  }

  if (typeof body.level !== 'string' || !OPTIMIZATION_LEVELS.includes(body.level as OptimizationLevel)) {
    return { error: 'level' }
  }

  return {
    body: {
      profileId: body.profileId,
      targetFields: {
        target_job_title: tf.target_job_title,
        target_industry: tf.target_industry,
        target_country: (tf.target_country as TargetCountry | null | undefined) ?? null,
        target_company: (tf.target_company as string | null | undefined) ?? null,
      },
      jobDescription: (body.jobDescription as string | null | undefined) ?? null,
      selectedBlocks: {
        summary: sb.summary,
        experienceIds: sb.experienceIds as string[],
      },
      level: body.level as OptimizationLevel,
    },
  }
}

/**
 * Only hard failures block validity (docs/PROMPTS.md §7 — unsourced numerics
 * are "flagged", not rejected). The corrective prompt names only what
 * actually needs fixing.
 */
function buildCorrectiveAddendum(failures: ValidationFailure[]): string {
  const hard = failures.filter((f) => f.severity === 'hard')
  const lines = hard.map(
    (f) => `- ${f.path}: ${f.detail}` + (f.offendingValue ? ` (found: "${f.offendingValue}")` : ''),
  )
  return (
    '\n\n## CORRECTION REQUIRED\n' +
    'Your previous response violated the grounding rule in these ways:\n' +
    lines.join('\n') +
    '\n\nRegenerate the FULL response from scratch, fixing every issue above. ' +
    'Do not repeat these mistakes. Return ONLY the corrected JSON, matching the exact schema.'
  )
}

/** Skills the model omitted from its ordering are appended in the profile's
 *  own order — a skill can never silently vanish. Same principle already
 *  used in components/templates/GulfPremium.tsx. Accepts ids or names,
 *  matching validateGrounding's lenient permutation check. */
function resolveSkillsOrder(profile: CareerProfileFull, parsedSkillsOrder: unknown): string[] {
  const raw = Array.isArray(parsedSkillsOrder) ? parsedSkillsOrder : []
  const byId = new Map(profile.skills.map((s) => [s.id, s.id]))
  const byName = new Map(profile.skills.map((s) => [s.name, s.id]))

  const resolved: string[] = []
  const seen = new Set<string>()
  for (const item of raw) {
    if (typeof item !== 'string') continue
    const id = byId.get(item) ?? byName.get(item)
    if (id && !seen.has(id)) {
      resolved.push(id)
      seen.add(id)
    }
  }
  for (const s of profile.skills.slice().sort((a, b) => a.sort_order - b.sort_order)) {
    if (!seen.has(s.id)) {
      resolved.push(s.id)
      seen.add(s.id)
    }
  }
  return resolved
}

/**
 * Builds the package's optimized_content. source_bullets/source_profile_summary
 * come from the REAL profile, never from the model's own echo (TASK-018's
 * design: never trust the model to transcribe long text back byte-for-byte).
 * Only entries in selectedBlocks.experienceIds get a block — untouched
 * entries are rendered directly from the profile by the template
 * (components/templates/GulfPremium.tsx), never round-tripped here.
 */
function buildOptimizedContent(
  profile: CareerProfileFull,
  parsed: Record<string, unknown>,
  selectedBlocks: SelectedBlocks,
): OptimizedContent {
  const summaryParsed = isObject(parsed.summary) ? parsed.summary : {}
  const generatedSummary = typeof summaryParsed.generated === 'string' ? summaryParsed.generated : ''

  const modelBlocksById = new Map<string, Record<string, unknown>>()
  if (Array.isArray(parsed.experience_blocks)) {
    for (const b of parsed.experience_blocks) {
      if (isObject(b) && typeof b.profile_experience_id === 'string') {
        modelBlocksById.set(b.profile_experience_id, b)
      }
    }
  }

  const experience_blocks: ExperienceBlock[] = selectedBlocks.experienceIds
    .map((expId): ExperienceBlock | null => {
      const sourceEntry = profile.work_experience.find((e) => e.id === expId)
      if (!sourceEntry) return null // selected id not on this profile — skip, don't fabricate
      const modelBlock = modelBlocksById.get(expId)
      const generatedBullets =
        modelBlock && Array.isArray(modelBlock.generated_bullets)
          ? (modelBlock.generated_bullets.filter((x) => typeof x === 'string') as string[])
          : []
      const claims =
        modelBlock && Array.isArray(modelBlock.claims)
          ? (modelBlock.claims.filter((x) => typeof x === 'string') as string[])
          : []
      return {
        profile_experience_id: expId,
        was_optimized: true,
        generated_bullets: generatedBullets,
        user_edited_bullets: null,
        source_bullets: sourceEntry.highlights ?? [],
        claims,
      }
    })
    .filter((b): b is ExperienceBlock => b !== null)

  return {
    summary: {
      generated: generatedSummary,
      user_edited: null,
      source_profile_summary: profile.professional_summary ?? '',
    },
    experience_blocks,
  }
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  const supabase = await createClient()
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let rawBody: unknown
  try {
    rawBody = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const parsedBody = validateBody(rawBody)
  if ('error' in parsedBody) {
    return NextResponse.json({ error: `Invalid field: ${parsedBody.error}` }, { status: 400 })
  }
  const { profileId, targetFields, jobDescription, selectedBlocks, level } = parsedBody.body

  // Load the profile scoped to BOTH id and the caller's own user_id in one
  // query. profileId is never trusted alone — see the file header note on
  // Unplanned #5. A profile owned by someone else simply does not match and
  // returns no row, never leaking whether it exists.
  const { data: profileRow, error: profileError } = await supabase
    .from('career_profiles')
    .select('*')
    .eq('id', profileId)
    .eq('user_id', user.id)
    .maybeSingle()

  if (profileError) {
    console.error('optimize: profile lookup error user=' + user.id, profileError.message)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
  if (!profileRow) {
    return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
  }

  const fetchChildren = async (table: (typeof CHILD_TABLES)[number]): Promise<unknown[]> => {
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

  const profile: CareerProfileFull = {
    ...(profileRow as CareerProfile),
    work_experience: work_experience as ProfileWorkExperience[],
    skills: skills as ProfileSkill[],
    certifications: certifications as ProfileCertification[],
    education: education as ProfileEducation[],
    additional_information: additional_information as ProfileAdditionalInformation[],
  }

  // Rate limit BEFORE the model call — see the file header note. Secondary
  // keying via the profile's own phone/email, same as extraction.
  const limit = await getRateLimitStatus({
    userId: user.id,
    action: LIMIT_ACTION_OPTIMIZATION,
    phone: profile.phone,
    email: profile.email,
  })
  if (!limit.allowed) {
    return NextResponse.json({ error: limit.message ?? 'Daily limit reached' }, { status: 429 })
  }

  // Job Match findings (TASK-073, docs/GCC_READINESS_JOB_MATCH.md §19) —
  // best-effort ONLY. A failure here must never block a paid optimization
  // that would otherwise have succeeded; the prompt builder already treats
  // a missing/null value as "behave exactly as before this ticket" (see
  // buildOptimizationPrompt's renderJobMatchFindings). Deterministic
  // categories only — the LLM semantic explanation layer used on /ats-scan
  // is skipped here on purpose: nothing in this flow displays it, so paying
  // for a second AI call to produce prose nobody sees would be pure waste.
  let jobMatchCategories: Partial<Record<JobMatchCategoryKey, JobMatchCategoryResult>> | null = null
  if (jobDescription) {
    try {
      const jdResult = await generate({
        system: JOB_DESCRIPTION_SYSTEM_PROMPT,
        user: buildJobDescriptionUserPrompt(jobDescription),
        maxTokens: 1536,
        temperature: 0.1,
        userId: user.id,
        route: '/api/optimize',
        configKey: 'job_description',
      })
      const structuredJob = validateStructuredJobProfile(extractJsonObject(jdResult.text))
      if (structuredJob) {
        const profileInput = buildJobMatchProfileInputFromFullProfile(profile)
        jobMatchCategories = computeDeterministicCategories(profileInput, structuredJob)
      }
    } catch (e) {
      console.error('optimize: job match findings failed (non-fatal) user=' + user.id + ' profile=' + profileId, e instanceof Error ? e.message : String(e))
    }
  }

  const { system, user: userPrompt } = buildOptimizationPrompt(
    profile,
    targetFields,
    level,
    selectedBlocks,
    jobDescription,
    jobMatchCategories,
  )

  const runOnce = async (userMessage: string) => {
    const result = await generate({
      system,
      user: userMessage,
      maxTokens: 8192,
      temperature: 0.2,
      userId: user.id,
      route: '/api/optimize',
      configKey: 'optimization',
    })
    const parsed = extractJsonObject(result.text)
    const parsedSkillsOrder = isObject(parsed) ? parsed.skills_order : undefined
    const validation = validateGrounding(profile, parsed, parsedSkillsOrder)
    return { parsed, validation }
  }

  let attempt: Awaited<ReturnType<typeof runOnce>>
  try {
    attempt = await runOnce(userPrompt)

    // Retry ONCE with a corrective instruction on a hard failure
    // (docs/PROMPTS.md §7). A flag-only result is already `valid: true` and
    // does not trigger a retry.
    if (!attempt.validation.valid) {
      const corrective = userPrompt + buildCorrectiveAddendum(attempt.validation.failures)
      attempt = await runOnce(corrective)
    }
  } catch (e) {
    console.error('optimize: AI call failed user=' + user.id + ' profile=' + profileId, e instanceof Error ? e.message : String(e))
    return NextResponse.json({ error: 'Could not generate your optimized resume. Please try again.' }, { status: 502 })
  }

  if (!attempt.validation.valid) {
    // NEVER return unvalidated output. Log IDs and reason only — never a
    // field value or the model's offendingValue (docs/RULES.md §3).
    const reasons = attempt.validation.failures
      .filter((f) => f.severity === 'hard')
      .map((f) => `${f.code}@${f.path}`)
      .join(',')
    console.error(
      'optimize: validation failed twice user=' + user.id + ' profile=' + profileId + ' reasons=' + reasons,
    )
    return NextResponse.json(
      { error: 'Could not produce a grounded result. Please try again or contact support.' },
      { status: 502 },
    )
  }

  const parsedObj = isObject(attempt.parsed) ? attempt.parsed : {}
  const optimized_content = buildOptimizedContent(profile, parsedObj, selectedBlocks)
  const skills_order = resolveSkillsOrder(profile, parsedObj.skills_order)

  // field_visibility_snapshot: visibility state AT GENERATION TIME
  // (docs/CAREER_PROFILE.md §2 "Visibility storage"), not a live reference.
  const { data: created, error: insertError } = await supabase
    .from('packages')
    .insert({
      user_id: user.id,
      profile_id: profileId,
      target_job_title: targetFields.target_job_title,
      target_industry: targetFields.target_industry,
      target_country: targetFields.target_country,
      target_company: targetFields.target_company,
      job_description: jobDescription,
      optimization_level: level,
      optimized_content,
      skills_order,
      field_visibility_snapshot: profile.field_visibility,
      is_paid: false,
    })
    .select('id')
    .single()

  if (insertError || !created) {
    console.error('optimize: package insert failed user=' + user.id + ' profile=' + profileId, insertError?.message ?? 'no row')
    return NextResponse.json({ error: 'Could not save your optimized resume. Please try again.' }, { status: 500 })
  }

  const packageId = created.id as string

  // ---- Manual credit grant (TASK-045, docs/ADMIN.md §2.3) --------------------
  // "Insert a credit row the optimize flow checks BEFORE requiring payment."
  // This is that check. If the founder granted this user a free optimization
  // (the §6 support loop: "I paid but it broke" -> grant -> user re-runs at no
  // cost), consume it and mark this package paid so the download gate in
  // app/api/packages/[id]/pdf|docx lets them through without paying again.
  //
  // ORDER MATTERS: the package is created first, unpaid, then a credit is
  // consumed and the row flipped to paid. The credit ledger records which
  // package it paid for, so the package id must exist to attribute it. If the
  // flip below fails, the package simply stays unpaid — recoverable (the
  // founder can grant again), and it never marks something paid on an error
  // path. Consumption itself is atomic in Postgres, not here (migration 018) —
  // a JS read-then-write would let a double-click spend one credit twice.
  let creditApplied = false
  try {
    creditApplied = await consumeOptimizationCredit(user.id, packageId)
    if (creditApplied) {
      const { error: paidError } = await supabase
        .from('packages')
        .update({ is_paid: true })
        .eq('id', packageId)
        .eq('user_id', user.id)
      if (paidError) {
        // Credit is spent but the package didn't flip. Log loudly with ids —
        // this is the one state a human needs to resolve, and it is strictly
        // better than the alternative (flipping first, then failing to record
        // consumption, which would hand out unlimited free optimizations).
        console.error(
          'optimize: credit consumed but is_paid flip FAILED — needs manual fix. user=' +
            user.id + ' package=' + packageId,
          paidError.message,
        )
        creditApplied = false
      }
    }
  } catch (e) {
    console.error(
      'optimize: credit check failed (package left unpaid) user=' + user.id + ' package=' + packageId,
      e instanceof Error ? e.message : String(e),
    )
    creditApplied = false
  }

  // Usage logging happens inside generate() (TASK-039) — do not add a second
  // call. Only a fully successful run consumes a rate-limit slot — same
  // accepted tradeoff as extraction's Unplanned #12: a failed/retried
  // attempt that produced nothing for the user should not cost them a try.
  await incrementRateLimit({ userId: user.id, action: LIMIT_ACTION_OPTIMIZATION })

  // creditApplied tells the client this run was covered by an admin-granted
  // free optimization, so the payment step can be skipped. It is derived
  // server-side and never trusted from the request.
  return NextResponse.json({ success: true, packageId, creditApplied })
}
