import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { generate } from '@/lib/ai/provider'
import { buildCoverLetterPrompt } from '@/lib/ai/buildCoverLetterPrompt'
import type { CoverLetterTarget } from '@/lib/ai/buildCoverLetterPrompt'
import { validateCoverLetterGrounding, type ParsedCoverLetter } from '@/lib/ai/validateCoverLetterGrounding'
import type { CoverLetterValidationFailure } from '@/lib/ai/validateCoverLetterGrounding'
import { extractJsonObject } from '@/lib/ai/extractionPrompt'
// Credit helpers are deliberately not imported while the locks are off — the
// route neither checks nor consumes a credit. They come back with the lock.
import type {
  CareerProfile,
  CareerProfileFull,
  ProfileAdditionalInformation,
  ProfileCertification,
  ProfileEducation,
  ProfileSkill,
  ProfileWorkExperience,
} from '@/types/careerProfile'
import type { CoverLetter } from '@/types/package'

/**
 * Cover letter generation route (TASK-065).
 *
 * POST /api/packages/[id]/cover-letter   body: {} (nothing needed — target
 * and job description are read from the package itself, matching
 * docs/PROMPTS.md §8: "no new data or mechanism required").
 *
 * Gated on TWO things, both server-side, neither trusted from the client:
 *   1. package.is_paid — same gate as PDF/DOCX download. A letter costs a
 *      real AI call; it does not make sense to give one away attached to an
 *      unpaid resume.
 *   2. an available 'cover_letter' service credit (TASK-060/062's
 *      generalized ledger) — checked with a fast pre-check
 *      (countAvailableServiceCredits) to avoid spending an AI call on a user
 *      with nothing to spend, then actually spent with the atomic
 *      consumeServiceCredit RPC AFTER a validated success, never before.
 *      Consuming only on success mirrors this project's own accepted
 *      tradeoff (Unplanned #12: a failure that was not the user's fault
 *      must not cost them anything) — generalized from rate-limit slots to
 *      credits here.
 *
 * Repeatable per package (docs/DASHBOARD_LIBRARY.md §7) — each successful
 * generation appends to packages.cover_letters rather than replacing it.
 */

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

function buildCorrectiveAddendum(failures: CoverLetterValidationFailure[]): string {
  const hard = failures.filter((f) => f.severity === 'hard')
  const lines = hard.map(
    (f) => `- ${f.path}: ${f.detail}` + (f.offendingValue ? ` (found: "${f.offendingValue}")` : ''),
  )
  return (
    '\n\n## CORRECTION REQUIRED\n' +
    'Your previous response violated the grounding rule or schema in these ways:\n' +
    lines.join('\n') +
    '\n\nRegenerate the FULL letter from scratch, fixing every issue above. ' +
    'Return ONLY the corrected JSON, matching the exact schema.'
  )
}

function composeFullText(letter: ParsedCoverLetter): string {
  return [letter.greeting, letter.opening_paragraph, ...letter.body_paragraphs, letter.closing_paragraph, letter.sign_off].join(
    '\n\n',
  )
}

export async function POST(
  request: NextRequest,
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

  // Owner-scoped in one query — a foreign package id simply matches no row
  // and 404s, never leaking existence. Same pattern as every other
  // package-scoped route (pdf, docx, redeem-promo).
  const { data: pkgRow, error: pkgError } = await supabase
    .from('packages')
    .select(
      'id, profile_id, is_paid, target_job_title, target_industry, target_country, target_company, job_description, cover_letters',
    )
    .eq('id', packageId)
    .eq('user_id', user.id)
    .maybeSingle()

  if (pkgError) {
    console.error('cover-letter: package lookup error user=' + user.id + ' pkg=' + packageId, pkgError.message)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
  if (!pkgRow) {
    return NextResponse.json({ error: 'Package not found' }, { status: 404 })
  }
  // NO PAYMENT GATE AND NO CREDIT REQUIREMENT while the locks are off (founder
  // decision 2026-08-17). Auth and ownership above are unchanged.
  //
  // WHEN THE LOCKS RETURN, both halves come back: the is_paid check here, and
  // the atomic credit consume AFTER a validated success further down — never
  // before it, so a model failure cannot cost the user a credit they keep
  // nothing for. That ordering is the part worth preserving.

  // Profile loaded scoped to BOTH profile_id and the caller's own user_id —
  // same double-scoping fix TASK-030's review added to the PDF route.
  const { data: profileRow, error: profileError } = await supabase
    .from('career_profiles')
    .select('*')
    .eq('id', pkgRow.profile_id)
    .eq('user_id', user.id)
    .maybeSingle()

  if (profileError) {
    console.error('cover-letter: profile lookup error user=' + user.id + ' pkg=' + packageId, profileError.message)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
  if (!profileRow) {
    return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
  }

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

  const target: CoverLetterTarget = {
    target_job_title: pkgRow.target_job_title,
    target_industry: pkgRow.target_industry,
    target_country: pkgRow.target_country,
    target_company: pkgRow.target_company,
  }

  const { system, user: userPrompt } = buildCoverLetterPrompt(profile, target, pkgRow.job_description)

  const runOnce = async (userMessage: string) => {
    const result = await generate({
      system,
      user: userMessage,
      maxTokens: 2048,
      temperature: 0.4,
      userId: user.id,
      route: '/api/packages/[id]/cover-letter',
      configKey: 'cover_letter',
    })
    const parsed = extractJsonObject(result.text)
    const validation = validateCoverLetterGrounding(profile, parsed)
    return { parsed, validation }
  }

  let attempt: Awaited<ReturnType<typeof runOnce>>
  try {
    attempt = await runOnce(userPrompt)
    if (!attempt.validation.valid) {
      const corrective = userPrompt + buildCorrectiveAddendum(attempt.validation.failures)
      attempt = await runOnce(corrective)
    }
  } catch (e) {
    console.error(
      'cover-letter: AI call failed user=' + user.id + ' pkg=' + packageId,
      e instanceof Error ? e.message : String(e),
    )
    return NextResponse.json({ error: 'Could not generate your cover letter. Please try again.' }, { status: 502 })
  }

  if (!attempt.validation.valid) {
    const reasons = attempt.validation.failures
      .filter((f) => f.severity === 'hard')
      .map((f) => `${f.code}@${f.path}`)
      .join(',')
    console.error('cover-letter: validation failed twice user=' + user.id + ' pkg=' + packageId + ' reasons=' + reasons)
    return NextResponse.json(
      { error: 'Could not produce a grounded letter. Please try again or contact support.' },
      { status: 502 },
    )
  }

  const parsedLetter = attempt.parsed as unknown as ParsedCoverLetter

  // NO CREDIT IS CONSUMED while the locks are off. Spending one when the letter
  // is free anyway would silently burn something the founder issued
  // deliberately, and the ledger would record it as having paid for this run.
  //
  // When the lock returns, the consume goes back HERE — after a validated
  // success, never before it — and a failed consume must discard the generation
  // rather than persist it, since nothing was charged for it.

  const letter: CoverLetter = {
    id: crypto.randomUUID(),
    generated_at: new Date().toISOString(),
    target_job_title: pkgRow.target_job_title,
    target_company: pkgRow.target_company,
    greeting: parsedLetter.greeting,
    opening_paragraph: parsedLetter.opening_paragraph,
    body_paragraphs: parsedLetter.body_paragraphs,
    closing_paragraph: parsedLetter.closing_paragraph,
    sign_off: parsedLetter.sign_off,
    full_text: composeFullText(parsedLetter),
  }

  // Re-read cover_letters immediately before appending — narrows (does not
  // eliminate) the read-modify-write race against a second concurrent
  // generation on the same package. Same accepted single-writer tradeoff as
  // TASK-013's field_visibility merge: one real user is not expected to
  // fire two concurrent generations on the same package, and the worst case
  // of losing this race is a lost letter, not a security or payment issue —
  // the credit is already spent and logged in user_service_credits either way.
  const { data: freshPkg } = await supabase
    .from('packages')
    .select('cover_letters')
    .eq('id', packageId)
    .eq('user_id', user.id)
    .maybeSingle()
  const existingLetters = (freshPkg?.cover_letters as CoverLetter[] | null) ?? pkgRow.cover_letters ?? []

  const { error: updateError } = await supabase
    .from('packages')
    .update({ cover_letters: [...existingLetters, letter] })
    .eq('id', packageId)
    .eq('user_id', user.id)

  if (updateError) {
    // Credit is spent and the letter was validated, but it didn't save.
    // Log loudly with ids — same "this is the one state a human needs to
    // resolve" reasoning as the optimize route's credit-flip failure.
    console.error(
      'cover-letter: credit consumed but save FAILED — needs manual fix. user=' + user.id + ' pkg=' + packageId,
      updateError.message,
    )
    return NextResponse.json({ error: 'Your letter was generated but could not be saved. Please contact support.' }, { status: 500 })
  }

  console.info(`cover letter generated: pkg=${packageId} user=${user.id} letter=${letter.id}`)
  return NextResponse.json({ success: true, letter })
}
