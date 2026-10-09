import { randomUUID } from 'node:crypto'
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { reserveAiAction } from '@/lib/ai/serviceGuard'
import { parseResume, type ParseInput } from '@/lib/resumeParse/pipeline'
import {
  fingerprint,
  ownProfile,
  readDraft,
  writeDraft,
} from '@/lib/linkedin/server'
import { importConflicts, summarizeImport } from '@/lib/linkedin/model'
export const maxDuration = 180
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
    if (
      Number(req.headers.get('content-length') ?? 0) >
      4 * 1024 * 1024 + 262144
    )
      return NextResponse.json(
        {
          error: 'File is too large. Use a PDF up to 4 MB or DOCX up to 2 MB.',
        },
        { status: 413 },
      )
    const profile = await ownProfile(client, user.id)
    if (!profile)
      return NextResponse.json(
        { error: 'Save your Career Profile first.' },
        { status: 422 },
      )
    const existing = await readDraft(client, user.id)
    let input: ParseInput
    if (req.headers.get('content-type')?.includes('multipart/form-data')) {
      const form = await req.formData()
      if ((form.get('revision') || null) !== (existing?.revision ?? null))
        return NextResponse.json(
          { error: 'Your draft changed. Reload before importing.' },
          { status: 409 },
        )
      const file = form.get('file')
      if (!(file instanceof File))
        return NextResponse.json(
          { error: 'Choose a PDF or DOCX file.' },
          { status: 400 },
        )
      const kind = file.name.toLowerCase().endsWith('.pdf')
        ? 'pdf'
        : file.name.toLowerCase().endsWith('.docx')
          ? 'docx'
          : null
      if (
        !kind ||
        !file.size ||
        file.size > (kind === 'pdf' ? 4 : 2) * 1024 * 1024
      )
        return NextResponse.json(
          { error: 'Use a PDF up to 4 MB or DOCX up to 2 MB.' },
          { status: 400 },
        )
      const buffer = Buffer.from(await file.arrayBuffer())
      if (
        kind === 'pdf' &&
        !buffer.subarray(0, 1024).toString().includes('%PDF-')
      )
        return NextResponse.json(
          { error: 'This does not appear to be a PDF.' },
          { status: 400 },
        )
      input = { kind, buffer }
    } else {
      const text = await req.text()
      if (text.length > 64000)
        return NextResponse.json(
          { error: 'Pasted text is too long.' },
          { status: 413 },
        )
      const body = JSON.parse(text)
      if ((body.revision ?? null) !== (existing?.revision ?? null))
        return NextResponse.json(
          { error: 'Your draft changed. Reload before importing.' },
          { status: 409 },
        )
      if (
        typeof body.text !== 'string' ||
        body.text.length < 100 ||
        body.text.length > 30000
      )
        return NextResponse.json(
          { error: 'Paste between 100 and 30,000 characters.' },
          { status: 400 },
        )
      input = { kind: 'text', text: body.text }
    }
    reservation = await reserveAiAction({
      userId: user.id,
      action: 'profile_extraction',
      phone: user.phone,
      email: user.email,
    })
    if (!reservation.ok)
      return NextResponse.json(
        { error: reservation.error },
        { status: reservation.status },
      )
    const parsed = await parseResume(input, {
      route: '/api/linkedin/import',
      userId: user.id,
    })
    if (!parsed.ok)
      return NextResponse.json(
        {
          error:
            'We could not read this profile reliably. Try pasted text, or continue with Career Profile.',
        },
        { status: 422 },
      )
    const imported = summarizeImport(
      parsed.draft,
      randomUUID(),
      parsed.report.warnings.map((warning) => warning.message),
    )
    const next = await writeDraft(user.id, existing?.revision ?? null, {
      imported,
    })
    if (!next)
      return NextResponse.json(
        { error: 'Your draft changed while importing. Reload and try again.' },
        { status: 409 },
      )
    saved = true
    return NextResponse.json({
      draft: next,
      conflicts: importConflicts(profile, imported),
      fingerprint: fingerprint(profile),
    })
  } catch {
    return NextResponse.json(
      { error: 'Import could not finish. Try pasted text or Career Profile.' },
      { status: 503 },
    )
  } finally {
    if (reservation?.ok) await reservation.finish(saved)
  }
}
