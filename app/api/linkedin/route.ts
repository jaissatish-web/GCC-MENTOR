import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import {
  ownProfile,
  fingerprint,
  readDraft,
  writeDraft,
} from '@/lib/linkedin/server'
import {
  checklistKeys,
  importConflicts,
  outputShape,
} from '@/lib/linkedin/model'
import type { LinkedInOutput } from '@/lib/linkedin/types'

export async function GET() {
  const client = await createClient()
  const {
    data: { user },
  } = await client.auth.getUser()
  if (!user)
    return NextResponse.json({ error: 'Please sign in.' }, { status: 401 })
  try {
    const profile = await ownProfile(client, user.id)
    if (!profile)
      return NextResponse.json(
        { error: 'Save your Career Profile first.' },
        { status: 422 },
      )
    const draft = await readDraft(client, user.id)
    return NextResponse.json({
      draft,
      fingerprint: fingerprint(profile),
      conflicts: importConflicts(profile, draft?.imported ?? null),
      stale:
        !!draft?.output && draft.profile_fingerprint !== fingerprint(profile),
    })
  } catch {
    return NextResponse.json(
      { error: 'Your draft could not be loaded. Please try again.' },
      { status: 503 },
    )
  }
}

export async function PATCH(req: NextRequest) {
  const client = await createClient()
  const {
    data: { user },
  } = await client.auth.getUser()
  if (!user)
    return NextResponse.json({ error: 'Please sign in.' }, { status: 401 })
  try {
    const text = await req.text()
    if (text.length > 40000)
      return NextResponse.json(
        { error: 'Draft is too large.' },
        { status: 413 },
      )
    const body = JSON.parse(text)
    const profile = await ownProfile(client, user.id)
    const draft = await readDraft(client, user.id)
    if (!profile || !draft?.setup || !draft.output)
      return NextResponse.json(
        { error: 'Generate your LinkedIn content first.' },
        { status: 422 },
      )
    if (body.revision !== draft.revision)
      return NextResponse.json(
        { error: 'Your draft changed in another tab. Reload before saving.' },
        { status: 409 },
      )
    if (
      outputShape(body.output, profile, draft.setup.experienceIds) ||
      !Number.isInteger(body.selected_headline) ||
      body.selected_headline < 0 ||
      body.selected_headline > 2
    )
      return NextResponse.json(
        { error: 'Check your content and character limits.' },
        { status: 400 },
      )
    const output = body.output as LinkedInOutput
    const keys = checklistKeys(output, profile)
    if (
      !Array.isArray(body.completed) ||
      !Array.isArray(body.skipped) ||
      body.completed.length > keys.length ||
      body.skipped.length > keys.length ||
      [...body.completed, ...body.skipped].some(
        (key) => typeof key !== 'string' || !keys.includes(key),
      ) ||
      new Set([...body.completed, ...body.skipped]).size !==
        body.completed.length + body.skipped.length
    )
      return NextResponse.json({ error: 'Invalid checklist.' }, { status: 400 })
    const changed = new Set<string>()
    if (
      draft.selected_headline !== body.selected_headline ||
      JSON.stringify(draft.output.headlines) !==
        JSON.stringify(output.headlines)
    )
      changed.add('headline')
    if (draft.output.about !== output.about) changed.add('about')
    if (JSON.stringify(draft.output.skills) !== JSON.stringify(output.skills))
      changed.add('skills')
    output.experience.forEach((entry) => {
      if (
        draft.output!.experience.find((old) => old.id === entry.id)
          ?.description !== entry.description
      )
        changed.add(`experience:${entry.id}`)
    })
    const saved = await writeDraft(user.id, draft.revision, {
      output,
      selected_headline: body.selected_headline,
      completed: body.completed.filter((key: string) => !changed.has(key)),
      skipped: body.skipped,
    })
    return saved
      ? NextResponse.json({ draft: saved })
      : NextResponse.json(
          { error: 'Your draft changed. Reload before saving.' },
          { status: 409 },
        )
  } catch {
    return NextResponse.json(
      { error: 'Could not save. Your changes are still on this page.' },
      { status: 400 },
    )
  }
}
