import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { generate } from '@/lib/ai/provider'
import { buildOptimizationPrompt } from '@/lib/ai/buildOptimizationPrompt'
import type { SelectedBlocks, OptimizationTarget } from '@/lib/ai/buildOptimizationPrompt'
import { buildResumeDocument } from '@/lib/resumeDocument'
import { reserveAiAction } from '@/lib/ai/serviceGuard'
import { loadCareerProfileFull, ProfileLoadError } from '@/lib/packages/profileLoader'
import { appendPackageEventAtomic, insertPackageForUser, updatePackageServerFields } from '@/lib/packages/serverWrites'
import { getTemplate } from '@/lib/templates'
import { validateGrounding, partitionFailures } from '@/lib/ai/validateGrounding'
import { normalizeSkillsOrder } from '@/lib/ai/skillsOrder'
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
import { LIMIT_ACTION_JOB_DESCRIPTION, LIMIT_ACTION_OPTIMIZATION } from '@/lib/rateLimit'
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
 * the client â€” everything the model returns is re-derived from real profile
 * data or the validator before it touches the database.
 *
 * RATE LIMITED, deliberately beyond the ticket's literal text â€” see the
 * comment on LIMIT_ACTION_OPTIMIZATION in lib/rateLimit.ts. Optimization is
 * NOT payment-gated (packages get created and the full diff is shown at
 * screen 08, before payment at screen 09), so "paid actions are
 * self-limiting" (docs/ADMIN.md Â§5) does not hold for this specific action.
 *
 * CLOSES docs/TASKS.md Unplanned #5: `packages.profile_id` ownership was
 * never verified server-side anywhere. Here, the profile is loaded scoped
 * to `user_id = caller` AND `id = profileId` in the same query â€” if
 * `profileId` belongs to another user, the query returns no row and this
 * 404s. `profileId` is never trusted alone.
 */

// NO `maxDuration` HERE (removed 2026-09-11). It was `60`, set on the belief
// that the Hobby plan caps every function at 60s — and it was the cap. A
// founder build with no job description was killed at 60s before the model
// finished: the package stayed empty, no usage was logged, and Vercel's
// timeout page reached the screen. The parse routes proved the point first:
// with no `maxDuration` they have completed a 72.9s read in production, so on
// this project the platform default is longer. The reasoning model's think
// varies run to run, and 45.5s of a 60s ceiling was always too thin.
//
// The provider's RETRY deadline below is deliberately unchanged: a doubled-
// budget retry is still only attempted when the first attempt was quick. Only
// the first attempt gets more room.
const RETRY_BUDGET_SECONDS = 60

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
  // Optional (migration 043) — see lib/ai/personas.ts's fallback note.
  // null/absent is valid; if present it must at least be a string.
  if (tf.target_industry !== undefined && tf.target_industry !== null && typeof tf.target_industry !== 'string') {
    return { error: 'targetFields.target_industry' }
  }
  // Optional (migration 030) â€” see types/careerProfile.ts's note. null/absent
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
        target_industry: (tf.target_industry as string | null | undefined) ?? null,
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
 * Only hard failures block validity (docs/PROMPTS.md Â§7 â€” unsourced numerics
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

/**
 * Builds the package's optimized_content. source_bullets/source_profile_summary
 * come from the REAL profile, never from the model's own echo (TASK-018's
 * design: never trust the model to transcribe long text back byte-for-byte).
 * Only entries in selectedBlocks.experienceIds get a block â€” untouched
 * entries are rendered directly from the profile by the template
 * (components/templates/GulfPremium.tsx), never round-tripped here.
 */
function buildOptimizedContent(
  profile: CareerProfileFull,
  parsed: Record<string, unknown>,
  selectedBlocks: SelectedBlocks,
  /**
   * Blocks whose optimized text failed grounding after the corrective retry.
   * Each one falls back to ITS OWN original profile text.
   *
   * Content can never cross entries here: the fallback is read from
   * `sourceEntry`, which is looked up by the block's own id in the loop below,
   * and a block whose id is unknown was already rejected as a structural
   * failure before this function is reached.
   */
  fallback?: { summary: boolean; experienceIds: string[] },
): OptimizedContent {
  const summaryParsed = isObject(parsed.summary) ? parsed.summary : {}
  const fallbackIds = new Set(fallback?.experienceIds ?? [])
  // An empty generated summary makes buildResumeDocument fall through to
  // profile.professional_summary, which is exactly the original text.
  const generatedSummary =
    fallback?.summary || typeof summaryParsed.generated !== 'string'
      ? ''
      : summaryParsed.generated

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
      if (!sourceEntry) return null // selected id not on this profile â€” skip, don't fabricate
      const modelBlock = modelBlocksById.get(expId)
      const sourceBullets = sourceEntry.highlights ?? []
      const modelBullets =
        modelBlock && Array.isArray(modelBlock.generated_bullets)
          ? (modelBlock.generated_bullets.filter((x) => typeof x === 'string') as string[])
          : []
      // A selected entry the model left out, or returned empty, falls back too.
      // An empty array is not nullish, so buildResumeDocument would render the
      // role with no bullets at all rather than its original highlights.
      const usedFallback =
        fallbackIds.has(expId) || (modelBullets.length === 0 && sourceBullets.length > 0)
      if (usedFallback) fallbackIds.add(expId) // recorded in fallback_used below
      const generatedBullets = usedFallback
        ? // This entry's own highlights, never another entry's.
          sourceBullets
        : modelBullets
      // `claims` is no longer requested from the model (see
      // lib/ai/buildOptimizationPrompt.ts). Written as an empty array so the
      // shape of new rows matches the stored rows that still carry one.
      const claims =
        modelBlock && Array.isArray(modelBlock.claims)
          ? (modelBlock.claims.filter((x) => typeof x === 'string') as string[])
          : []
      return {
        profile_experience_id: expId,
        // A fallback block is the profile's own text, so it is not optimized
        // content and the diff must not present it as a rewrite.
        was_optimized: !usedFallback,
        generated_bullets: generatedBullets,
        user_edited_bullets: null,
        source_bullets: sourceBullets,
        claims,
      }
    })
    .filter((b): b is ExperienceBlock => b !== null)

  const usedFallback = Boolean(fallback?.summary) || fallbackIds.size > 0

  return {
    summary: {
      generated: generatedSummary,
      user_edited: null,
      source_profile_summary: profile.professional_summary ?? '',
    },
    experience_blocks,
    // Internal only. Never rendered, never returned to the client — it exists
    // so a rising fallback rate is visible in the data rather than inferred
    // from complaints. Omitted entirely when nothing fell back, so existing
    // rows and new clean rows stay byte-identical in shape.
    ...(usedFallback
      ? {
          fallback_used: {
            summary: Boolean(fallback?.summary),
            experience_ids: [...fallbackIds],
          },
        }
      : {}),
  }
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  // The deadline the provider uses to decide whether a doubled-budget retry is
  // worth starting — NOT the function's ceiling any more (there is no
  // `maxDuration`; see the note at the top). Kept at its old value on purpose,
  // so a slow first attempt is never followed by an equally slow second one.
  const deadlineAt = Date.now() + (RETRY_BUDGET_SECONDS - 6) * 1000
  // THE ROUTE'S OWN GIVE-UP POINT (2026-09-12). The platform ceiling on this
  // project is 300s — Vercel's log for a founder build: "Task timed out after
  // 300 seconds". No model attempt starts, or runs, past this point, and the
  // grounding retry below checks it first, so the route always answers with
  // its own message instead of the platform's timeout page.
  const giveUpAt = Date.now() + 280 * 1000
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

  // ---- TWO PHASES, ONE ROUTE -------------------------------------------------
  //
  //   PHASE A  POST { profileId, ...target }  -> creates the package EMPTY,
  //            runs NO model call, returns its id.
  //   PHASE B  POST { packageId }             -> generates into that row.
  //
  // Kept in one route rather than split into two files so the grounding
  // pipeline below has exactly one implementation. Phase B deliberately reads
  // the target fields back off the ROW, never from the request, so a caller
  // cannot set up one job title and then generate against another.
  //
  // NO PAYMENT CHECK. Founder decision 2026-08-17: every service is open while
  // the AI pipeline is being built, and the locks are re-applied afterwards.
  // The two phases stay as they are because Phase A is where the row and its
  // target fields are established, and Phase B's read-from-the-row behaviour is
  // a correctness property independent of payment. When the lock returns, it
  // goes back at the top of Phase B — see docs/15_DECISION_LOG.md.
  //
  // COST: payment used to be the only limit on this route. There is now none.
  const bodyObj = (rawBody ?? {}) as Record<string, unknown>
  const generatePackageId =
    typeof bodyObj.packageId === 'string' && bodyObj.packageId.trim() ? bodyObj.packageId.trim() : null

  let profileId: string
  let targetFields: OptimizationTarget
  let jobDescription: string | null
  /** Phase A's structured advert (migration 045). Null on pre-045 rows. */
  let storedStructuredJob: unknown = null
  let selectedBlocks: SelectedBlocks
  let level: OptimizationLevel

  if (generatePackageId) {
    const { data: pkgRow, error: pkgErr } = await supabase
      .from('packages')
      .select('*')
      .eq('id', generatePackageId)
      .eq('user_id', user.id)
      .maybeSingle()

    if (pkgErr) {
      console.error('optimize: package lookup failed user=' + user.id, pkgErr.message)
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
    if (!pkgRow) return NextResponse.json({ error: 'Package not found' }, { status: 404 })

    // Idempotence: a double-click, a refresh, or a retry must not spend a
    // second model call on a package that already has its resume. This is now
    // the ONLY thing standing between a retry and a duplicate model call, so it
    // matters more than it did when a payment check sat in front of it.
    if (pkgRow.optimized_content) {
      return NextResponse.json({ success: true, packageId: generatePackageId, alreadyGenerated: true })
    }

    profileId = pkgRow.profile_id as string
    targetFields = {
      target_job_title: pkgRow.target_job_title as string,
      target_industry: pkgRow.target_industry as string | null,
      target_country: (pkgRow.target_country as string | null) ?? null,
      target_company: (pkgRow.target_company as string | null) ?? null,
    } as OptimizationTarget
    jobDescription = (pkgRow.job_description as string | null) ?? null
    storedStructuredJob = pkgRow.structured_job ?? null
    level = pkgRow.optimization_level as OptimizationLevel
    selectedBlocks = (pkgRow.selected_blocks as SelectedBlocks | null) ?? {
      summary: true,
      experienceIds: [],
    }
  } else {
    const parsedBody = validateBody(rawBody)
    if ('error' in parsedBody) {
      return NextResponse.json({ error: `Invalid field: ${parsedBody.error}` }, { status: 400 })
    }
    ;({ profileId, targetFields, jobDescription, selectedBlocks, level } = parsedBody.body)
  }

  // Load the profile scoped to BOTH id and the caller's own user_id in one
  // query. profileId is never trusted alone â€” see the file header note on
  // Unplanned #5. A profile owned by someone else simply does not match and
  // returns no row, never leaking whether it exists.
  // One loader for every AI route (lib/packages/profileLoader.ts): a failed
  // child read is an error, not an empty work history (audit M04).
  let loadedProfile: CareerProfileFull | null
  try {
    loadedProfile = await loadCareerProfileFull(supabase, profileId, user.id)
  } catch (e) {
    if (e instanceof ProfileLoadError) {
      console.error('optimize: incomplete profile read user=' + user.id + ' table=' + e.table)
      return NextResponse.json(
        { error: 'We could not read your full Career Profile just now. Nothing was used — please try again.' },
        { status: 503 },
      )
    }
    throw e
  }
  if (!loadedProfile) {
    return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
  }
  const profile: CareerProfileFull = loadedProfile

  // A caller may name a template at creation; anything unknown, unavailable or
  // absent resolves to the default rather than erroring, so a stale client can
  // never block someone from starting a resume.
  const chosenTemplate = getTemplate(
    typeof bodyObj.templateId === 'string' ? bodyObj.templateId : null,
  )

  // ---- PHASE A: create the package, charge nothing, generate nothing --------
  //
  // Everything generation will need is written to the row now, because the
  // request that generates runs later and carries only a package id.
  if (!generatePackageId) {
    // STRUCTURE THE ADVERT HERE, NOT AT GENERATION TIME.
    //
    // Phase B used to make two sequential model calls when a job description
    // was present. Measured 2026-09-05 on one request: 9.6s to structure the
    // advert, 18.4s to write the resume, 29.6s in total locally — which on
    // production exceeded Vercel's function ceiling and returned
    // 504 FUNCTION_INVOCATION_TIMEOUT. The account is on the Hobby plan, where
    // 60s is a hard cap no `maxDuration` can raise, so Phase B has to do less.
    //
    // Structuring depends only on the advert, never on the profile, so it
    // belongs here: Phase A previously made no model call at all and returned
    // in milliseconds. It now spends ~10s of a 60s budget and Phase B keeps
    // its whole budget for the call that writes the resume.
    //
    // FAILURE IS NON-FATAL, exactly as it was in Phase B. A package must still
    // be creatable when the provider is having a bad minute; Phase B falls
    // back to structuring inline when this column is null.
    //
    // NOTE FOR METERING: this makes Phase A a call that costs money, which the
    // route header previously stated it never did. When the paid locks return,
    // the charge point is still Phase B — but a package created and abandoned
    // now costs one structuring call. Recorded in docs/15_DECISION_LOG.md.
    let structuredJobForRow: unknown = null
    // Structuring costs a model call, so it passes the same guard as every other
    // one (audit H03, 2026-09-15). A refusal is non-fatal here, exactly like a
    // failure: Phase B structures inline under the optimization reservation.
    const jdReservation = jobDescription
      ? await reserveAiAction({
          userId: user.id,
          action: LIMIT_ACTION_JOB_DESCRIPTION,
          phone: profile.phone,
          email: profile.email,
          ttlSeconds: 120,
        })
      : null
    if (jobDescription && jdReservation && jdReservation.ok) {
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
        structuredJobForRow = validateStructuredJobProfile(extractJsonObject(jdResult.text))
      } catch (e) {
        console.error(
          'optimize: phase A job-description structuring failed (non-fatal) user=' + user.id,
          e instanceof Error ? e.message : String(e),
        )
      }
      await jdReservation.finish(structuredJobForRow !== null)
    }

    // Created through the server writer (migration 050): a package row carries
    // server-derived fields from its first write, so a client cannot INSERT
    // one. profileId was matched to this user above; user_id is forced there.
    const { row: createdRow, error: createError } = await insertPackageForUser<{ id: string }>({
      userId: user.id,
      row: {
        profile_id: profileId,
        target_job_title: targetFields.target_job_title,
        target_industry: targetFields.target_industry,
        target_country: targetFields.target_country,
        target_company: targetFields.target_company,
        job_description: jobDescription,
        // NULL when there is no advert, or when structuring failed above.
        // Phase B treats both the same way and structures inline.
        structured_job: structuredJobForRow,
        optimization_level: level,
        selected_blocks: selectedBlocks,
        // Stamp the template AND its version at creation (migration 035). The
        // version is what stops a later revision of the same template from
        // restyling a resume that has already been delivered.
        template_id: chosenTemplate.id,
        template_version: chosenTemplate.version,
        // NULL until generated — the distinction migration 033 exists to make
        // expressible, and still the honest description of an empty row.
        // skills_order was NOT NULL here from migration 012 until migration 044
        // (2026-08-18) — this insert was rejected by the database on EVERY call
        // until that fix, which is why "Could not start your optimization" fired
        // instantly, before any model was ever reached. See 15_DECISION_LOG.md.
        optimized_content: null,
        skills_order: null,
        field_visibility_snapshot: profile.field_visibility,
        // Left FALSE deliberately while the locks are off. Nothing was paid, so
        // writing `true` would put a false fact in the database and every row
        // created during this phase would later read as a completed purchase.
        // Nothing gates on it today; it is a record, not a permission.
        is_paid: false,
      },
    })

    if (createError || !createdRow) {
      console.error(
        'optimize: package create failed user=' + user.id + ' profile=' + profileId,
        createError ?? 'no row',
      )
      return NextResponse.json(
        { error: 'Could not start your optimization. Please try again.' },
        { status: 500 },
      )
    }

    const newPackageId = createdRow.id as string

    // NO CREDIT IS CONSUMED while the locks are off. An admin-granted credit
    // buys one free optimization; spending one when the optimization is free
    // anyway would silently burn something the founder issued deliberately, and
    // the grant ledger would record it as having paid for this run. Generation
    // is simply open, so nothing needs to pay for it.
    //
    // No rate-limit slot is spent here either: nothing was generated. Phase B
    // spends it, on a run that actually costs a model call.
    return NextResponse.json({
      success: true,
      packageId: newPackageId,
      requiresPayment: false,
    })
  }

  // ---- PHASE B: the row is paid, so generate into it ------------------------
  // Reserved BEFORE the model call and settled after (lib/ai/serviceGuard.ts,
  // audit H01/H03, 2026-09-15): in-flight builds count toward the daily limit,
  // so two tabs cannot both pass it, and the founder's pause applies here.
  // Secondary keying via the profile's own phone/email, as before.
  const reservation = await reserveAiAction({
    userId: user.id,
    action: LIMIT_ACTION_OPTIMIZATION,
    phone: profile.phone,
    email: profile.email,
    ttlSeconds: 330,
  })
  if (!reservation.ok) {
    return NextResponse.json({ error: reservation.error, code: reservation.code }, { status: reservation.status })
  }

  // Only a build that is SAVED counts as a use; every other exit below releases
  // the slot — a failure that was not the user's fault costs them nothing.
  let generatedAndSaved = false
  try {

    // Job Match findings (TASK-073, docs/GCC_READINESS_JOB_MATCH.md Â§19) â€”
    // best-effort ONLY. A failure here must never block a paid optimization
    // that would otherwise have succeeded; the prompt builder already treats
    // a missing/null value as "behave exactly as before this ticket" (see
    // buildOptimizationPrompt's renderJobMatchFindings). Deterministic
    // categories only â€” the LLM semantic explanation layer used on /ats-scan
    // is skipped here on purpose: nothing in this flow displays it, so paying
    // for a second AI call to produce prose nobody sees would be pure waste.
    //
    // THE STRUCTURING CALL NORMALLY HAPPENED IN PHASE A (migration 045), so the
    // common path here spends no model call at all — it reads the stored result
    // and recomputes the categories against the profile as it stands NOW. That
    // recomputation is the point of storing the structured job rather than the
    // categories: the user may have edited their profile between creating the
    // package and generating it, and the findings must reflect the current one.
    //
    // The inline fallback stays for two real cases: a package created before
    // migration 045, and one whose Phase A structuring failed. Those pay the
    // extra ~10s and risk the timeout exactly as every package used to.
    let jobMatchCategories: Partial<Record<JobMatchCategoryKey, JobMatchCategoryResult>> | null = null
    if (jobDescription) {
      try {
        let structuredJob = validateStructuredJobProfile(storedStructuredJob)
        if (!structuredJob) {
          const jdResult = await generate({
            system: JOB_DESCRIPTION_SYSTEM_PROMPT,
            user: buildJobDescriptionUserPrompt(jobDescription),
            maxTokens: 1536,
            temperature: 0.1,
            userId: user.id,
            route: '/api/optimize',
            configKey: 'job_description',
          })
          structuredJob = validateStructuredJobProfile(extractJsonObject(jdResult.text))
        }
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

    const runOnce = async (
      userMessage: string,
    ): Promise<
      | { truncated: true; parsed: null; validation: null }
      | { truncated: false; parsed: unknown; validation: ReturnType<typeof validateGrounding> }
    > => {
      const result = await generate({
        system,
        user: userMessage,
        maxTokens: 8192,
        temperature: 0.2,
        userId: user.id,
        route: '/api/optimize',
        configKey: 'optimization',
        // The one call big enough that a doubled-budget retry cannot finish
        // inside the function's ceiling. See lib/ai/provider.ts's retry block.
        deadlineAt,
        // Shared by BOTH calls below, so the pair can never outrun the ceiling.
        giveUpAt,
      })
      // A cut-off answer is incomplete JSON: never parse or check it (2026-09-12).
      // It used to fail the grounding check and trigger the corrective retry.
      if (result.truncated) return { truncated: true, parsed: null, validation: null }
      const parsed = extractJsonObject(result.text)
      const parsedSkillsOrder = isObject(parsed) ? parsed.skills_order : undefined
      // The advert is handed to the validator ONLY so an imported requirement
      // (in the JD, absent from the profile) can be told apart from ordinary
      // paraphrase. It is never a source of permitted facts.
      const validation = validateGrounding(profile, parsed, parsedSkillsOrder, {
        jobDescription,
        strictNumerics: process.env.GROUNDING_STRICT_NUMERICS !== 'false',
      })
      return { truncated: false, parsed, validation }
    }

    // A second full generation needs room for a whole healthy answer — ~100s
    // for the largest resume measured (14 jobs, 5,676 output tokens). With less
    // left, retrying only runs into the ceiling: exactly how a founder build was
    // lost on 2026-09-11, when the first answer arrived and the untimed
    // corrective retry did not.
    const MIN_RETRY_MS = 100_000

    let attempt: Awaited<ReturnType<typeof runOnce>>
    try {
      attempt = await runOnce(userPrompt)

      // Retry ONCE on a hard grounding failure (with a corrective instruction,
      // docs/PROMPTS.md §7) or on a cut-off answer (as-is — thinking length
      // varies run to run) — but only when there is time to finish it. A
      // flag-only result is already `valid: true` and does not trigger a retry.
      if (attempt.truncated || !attempt.validation.valid) {
        if (giveUpAt - Date.now() >= MIN_RETRY_MS) {
          const first = attempt
          const message = first.truncated
            ? userPrompt
            : userPrompt + buildCorrectiveAddendum(first.validation.failures)
          const retry = await runOnce(message)
          // Never trade a usable first answer for a worse retry. A first answer
          // with only content failures can still ship with per-block fallback;
          // a retry that is cut off or structurally broken cannot.
          const isStructurallySound = (a: typeof first) =>
            !a.truncated && partitionFailures(a.validation.failures).structural.length === 0
          attempt = isStructurallySound(first) && !isStructurallySound(retry) ? first : retry
        } else {
          console.warn(
            'optimize: retry skipped, only ' + Math.round((giveUpAt - Date.now()) / 1000) + 's left user=' + user.id,
          )
        }
      }
    } catch (e) {
      const reason = e instanceof Error ? e.message : String(e)
      console.error('optimize: AI call failed user=' + user.id + ' profile=' + profileId, reason)
      // A stall (lib/ai/provider.ts) is the AI service not answering — say so,
      // and that nothing is lost: the job and its settings are saved.
      const stalled = /stalled|out of time/.test(reason)
      return NextResponse.json(
        {
          error: stalled
            ? "The AI service didn't answer in time. Your job is saved — please try again."
            : 'Could not generate your optimized resume. Please try again.',
        },
        { status: 502 },
      )
    }

    if (attempt.truncated) {
      console.error('optimize: answer cut off at the token budget user=' + user.id + ' profile=' + profileId)
      return NextResponse.json(
        { error: "We couldn't finish writing your CV this time. Your job is saved — please try again." },
        { status: 502 },
      )
    }

    // BLOCK-LEVEL FALLBACK (2026-09-16).
    //
    // Until now any surviving hard failure threw the whole resume away: the user
    // paid, waited through the slowest call in the product, and got an error
    // because one bullet in one role carried one number the profile did not
    // support. Unchanged source text is better than that, and better than
    // invented text.
    //
    // The split that makes this safe is STRUCTURAL vs CONTENT. A structural
    // failure — unparseable JSON, a missing array, an invented employment id, a
    // skills list that is not a permutation, a fixed field the model tried to
    // own — leaves nothing trustworthy to keep, so it still returns an error.
    // A content failure belongs to exactly one block, and that block falls back
    // to its own original text.
    const { structural, summary: summaryFailures, byExperienceId } = partitionFailures(
      attempt.validation.failures,
    )

    if (structural.length > 0) {
      // NEVER return unvalidated output. Log IDs and reason only â€” never a
      // field value or the model's offendingValue (docs/RULES.md Â§3).
      const reasons = structural.map((f) => `${f.code}@${f.path}`).join(',')
      console.error(
        'optimize: structural validation failed twice user=' + user.id + ' profile=' + profileId + ' reasons=' + reasons,
      )
      return NextResponse.json(
        { error: 'Could not produce a grounded result. Please try again or contact support.' },
        { status: 502 },
      )
    }

    const fallbackExperienceIds = [...byExperienceId.keys()]
    const fallbackSummary = summaryFailures.length > 0
    if (fallbackSummary || fallbackExperienceIds.length > 0) {
      // Codes only. No field values, no offendingValue (docs/RULES.md Â§3).
      const codes = [...summaryFailures, ...[...byExperienceId.values()].flat()]
        .map((f) => f.code)
        .join(',')
      console.warn(
        'optimize: block fallback user=' + user.id + ' package=' + generatePackageId +
          ' summary=' + fallbackSummary + ' blocks=' + fallbackExperienceIds.length + ' codes=' + codes,
      )
    }

    const parsedObj = isObject(attempt.parsed) ? attempt.parsed : {}
    const optimized_content = buildOptimizedContent(profile, parsedObj, selectedBlocks, {
      summary: fallbackSummary,
      experienceIds: fallbackExperienceIds,
    })
    // The same normalizer the validator used, so what was checked is what is
    // saved: recognized ids/names first, every omitted skill appended, nothing
    // unknown kept (lib/ai/skillsOrder.ts).
    const skillRepair = normalizeSkillsOrder(profile.skills, parsedObj.skills_order)
    const skills_order = skillRepair.order
    if (skillRepair.repaired) {
      // Fixed codes only — never a skill name or model value (docs/RULES.md §3).
      console.warn(
        'optimize: skills_order repaired user=' + user.id + ' package=' + generatePackageId +
          ' codes=' + skillRepair.codes.join(','),
      )
    }

    // UPDATE, not insert: the row already exists and is already paid for. It is
    // re-scoped to the caller here as well — the earlier ownership check and this
    // write are separate statements, and the write must not rely on the read.
    //
    // field_visibility_snapshot: visibility state AT GENERATION TIME
    // (docs/CAREER_PROFILE.md §2 "Visibility storage"), not a live reference.
    // Re-snapshotted now rather than kept from creation, because generation is
    // the moment the document is actually produced.
    // FREEZE WHAT WAS DELIVERED (TASK-132, migration 034). Until now a package
    // stored only the AI text; every fixed field — name, contact, education,
    // certifications, photo — was read live from career_profiles at render time,
    // so editing the profile silently rewrote resumes the user had already paid
    // for. The rendered document is captured here, once, and renderers prefer it.
    //
    // Deliberately the RENDERED document (buildResumeDocument output), not a copy
    // of the profile: field visibility is already applied, so a hidden field is
    // absent rather than duplicated into a second, unencrypted table.
    const document_snapshot = buildResumeDocument({
      profile,
      optimizedContent: optimized_content,
      skillsOrder: skills_order,
      fieldVisibility: profile.field_visibility,
      // The APPLICATION's title, not the Career Profile's. The profile field is
      // never written by this flow, so before 2026-09-16 every snapshot froze an
      // empty headline.
      targetJobTitle: targetFields.target_job_title,
    })

    // Server-derived fields go through the server writer (migration 050).
    const { row: created, error: insertError } = await updatePackageServerFields<{ id: string }>({
      packageId: generatePackageId as string,
      userId: user.id,
      fields: {
        optimized_content,
        skills_order,
        field_visibility_snapshot: profile.field_visibility,
        document_snapshot,
      },
    })

    if (insertError || !created) {
      console.error('optimize: package update failed user=' + user.id + ' package=' + generatePackageId, insertError ?? 'no row')
      return NextResponse.json({ error: 'Could not save your optimized resume. Please try again.' }, { status: 500 })
    }

    const packageId = created.id
    // History is appended atomically; failing to record it never loses the CV.
    await appendPackageEventAtomic({ packageId, userId: user.id, type: 'cv_generated', label: 'Optimized CV generated' }).catch((e) =>
      console.error('optimize: history event not recorded pkg=' + packageId, e instanceof Error ? e.message : String(e)),
    )

    // The credit grant (TASK-045) moved to Phase A, where it belongs now: a
    // granted credit is what makes a package PAID, and payment has to be settled
    // before generation rather than after it. Nothing consumes a credit here.

    // Usage logging happens inside generate() (TASK-039) — do not add a second call.
    generatedAndSaved = true

    return NextResponse.json({ success: true, packageId })
  } finally {
    await reservation.finish(generatedAndSaved)
  }
}
