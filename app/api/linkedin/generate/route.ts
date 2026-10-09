import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { reserveAiAction } from '@/lib/ai/serviceGuard'
import { runAiTask } from '@/lib/ai/runTask'
import {
  LINKEDIN_PERSONA,
  LINKEDIN_INSTRUCTIONS,
  LINKEDIN_REVIEW_INSTRUCTIONS,
  buildLinkedInInput,
} from '@/lib/ai/buildLinkedInPrompt'
import { validateLinkedIn } from '@/lib/ai/validateLinkedIn'
import {
  fingerprint,
  ownProfile,
  readDraft,
  safeProfile,
  writeDraft,
} from '@/lib/linkedin/server'
import {
  candidateFacts,
  importConflicts,
  outputShape,
  parseSetup,
} from '@/lib/linkedin/model'
import type { LinkedInOutput } from '@/lib/linkedin/types'
export const maxDuration = 300
export async function POST(req: NextRequest) {
  const client = await createClient()
  const {
    data: { user },
  } = await client.auth.getUser()
  if (!user)
    return NextResponse.json({ error: 'Please sign in.' }, { status: 401 })
  let reservation: Awaited<ReturnType<typeof reserveAiAction>> | null = null
  let saved = false
  try {
    const text = await req.text()
    if (text.length > 32000)
      return NextResponse.json(
        { error: 'Your instructions are too long.' },
        { status: 413 },
      )
    const body = JSON.parse(text)
    const profile = await ownProfile(client, user.id)
    if (
      !profile ||
      !profile.full_name ||
      (!profile.work_experience.length &&
        !profile.education.length &&
        !profile.skills.length &&
        !profile.professional_summary)
    )
      return NextResponse.json(
        { error: 'Add your name and career details to Career Profile first.' },
        { status: 422 },
      )
    const setup = parseSetup(body.setup, profile)
    if (!setup)
      return NextResponse.json(
        { error: 'Check your target roles and setup fields.' },
        { status: 400 },
      )
    const current = await readDraft(client, user.id)
    const initialFingerprint = fingerprint(profile)
    if (
      (body.revision ?? null) !== (current?.revision ?? null) ||
      body.fingerprint !== initialFingerprint
    )
      return NextResponse.json(
        { error: 'Your profile or draft changed. Refresh before generating.' },
        { status: 409 },
      )
    const imported =
      setup.source === 'career' ? null : (current?.imported ?? null)
    if (
      setup.source !== 'career' &&
      (!imported || body.importId !== imported.id)
    )
      return NextResponse.json(
        { error: 'Import and review your LinkedIn content first.' },
        { status: 400 },
      )
    if (imported && setup.mode !== 'existing')
      return NextResponse.json(
        {
          error:
            'An imported LinkedIn profile uses the existing-profile path. Use Career Profile for a first profile.',
        },
        { status: 400 },
      )
    const conflicts = importConflicts(profile, imported)
    if (
      imported &&
      (body.confirmImport !== true ||
        !Array.isArray(body.acknowledged) ||
        conflicts.some((entry) => !body.acknowledged.includes(entry.id)))
    )
      return NextResponse.json(
        {
          error:
            'Confirm the extracted content and resolve every difference first.',
        },
        { status: 422 },
      )
    reservation = await reserveAiAction({
      userId: user.id,
      action: 'linkedin_optimization',
      phone: user.phone,
      email: user.email,
    })
    if (!reservation.ok)
      return NextResponse.json(
        { error: reservation.error },
        { status: reservation.status },
      )
    const deadlineAt = Date.now() + 260000
    const evidence = safeProfile(profile, setup.experienceIds)
    const generated = await runAiTask<LinkedInOutput>({
      service: 'linkedin_optimization',
      route: '/api/linkedin/generate',
      userId: user.id,
      persona: LINKEDIN_PERSONA,
      instructions: LINKEDIN_INSTRUCTIONS,
      input: buildLinkedInInput(profile, setup, imported),
      deadlineAt,
      grounding: {
        mode: 'enforced',
        profile: evidence,
        check: (facts, value) =>
          validateLinkedIn(facts, value as LinkedInOutput),
      },
      validateShape: (output) =>
        outputShape(output, profile, setup.experienceIds) ??
        ([...setup.omitTerms, profile.phone, profile.email]
          .filter(Boolean)
          .some((term) =>
            JSON.stringify(output)
              .toLocaleLowerCase()
              .includes(term.toLocaleLowerCase()),
          )
          ? 'Excluded private terms must not appear.'
          : null),
    })
    const reviewed = await runAiTask<{ valid: boolean; issues: string[] }>({
      service: 'linkedin_review',
      route: '/api/linkedin/generate/review',
      userId: user.id,
      instructions: LINKEDIN_REVIEW_INSTRUCTIONS,
      input: JSON.stringify({
        'CANDIDATE FACTS': candidateFacts(profile, setup),
        context: setup,
        output: generated.value,
      }),
      deadlineAt,
      grounding: {
        mode: 'not_applicable',
        reason:
          'This task audits generated claims; it creates no candidate prose.',
      },
      validateShape: (result) =>
        typeof result?.valid === 'boolean' &&
        Array.isArray(result.issues) &&
        result.issues.length <= 10 &&
        result.issues.every(
          (issue) => typeof issue === 'string' && issue.length <= 1000,
        ) &&
        (!result.valid || result.issues.length === 0)
          ? null
          : 'Return a fact-check verdict and issue list.',
    })
    if (!reviewed.value.valid)
      return NextResponse.json(
        {
          error:
            'The fact-check could not approve this version. Review your Career Profile and try again. Your previous draft is safe.',
        },
        { status: 422 },
      )
    const latest = await ownProfile(client, user.id)
    if (!latest || fingerprint(latest) !== initialFingerprint)
      return NextResponse.json(
        {
          error:
            'Career Profile changed while generating. Refresh and try again.',
        },
        { status: 409 },
      )
    const draft = await writeDraft(user.id, current?.revision ?? null, {
      setup,
      imported,
      output: generated.value,
      selected_headline: 0,
      completed: [],
      skipped: [],
      profile_fingerprint: initialFingerprint,
    })
    if (!draft)
      return NextResponse.json(
        {
          error:
            'Your draft changed while generating. Reload before trying again.',
        },
        { status: 409 },
      )
    saved = true
    return NextResponse.json({
      draft,
      fingerprint: initialFingerprint,
      stale: false,
    })
  } catch {
    return NextResponse.json(
      {
        error:
          'Your LinkedIn content could not be prepared safely. Try again; your previous draft is unchanged.',
      },
      { status: 503 },
    )
  } finally {
    if (reservation?.ok) await reservation.finish(saved)
  }
}
