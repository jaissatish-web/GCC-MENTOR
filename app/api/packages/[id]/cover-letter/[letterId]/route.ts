import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { downloadFileName } from '@/lib/downloadName'
import { letterDocx, letterPdf } from '@/lib/coverLetterFiles'
import { updateCoverLetterTextAtomic } from '@/lib/packages/serverWrites'
import type { CoverLetter } from '@/types/package'

/**
 * One saved cover letter (2026-10-03, launch audit I3).
 *   PATCH { full_text }          — save the user's own edit of the letter.
 *   GET   ?format=pdf|docx       — the letter as the file they send.
 * Owner-scoped like every package route: a letter on someone else's package
 * matches nothing and 404s. No AI call and no quota — it is the user's text.
 */

export const maxDuration = 60
const MAX_TEXT = 8000

type Params = { params: Promise<{ id: string; letterId: string }> }

async function loadLetter(packageId: string, letterId: string) {
  const supabase = await createClient()
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()
  if (authError || !user) return { ok: false as const, res: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) }
  const { data: pkg, error } = await supabase
    .from('packages')
    .select('id, profile_id, target_job_title, cover_letters')
    .eq('id', packageId)
    .eq('user_id', user.id)
    .maybeSingle()
  if (error) {
    console.error('cover-letter file: package lookup error user=' + user.id + ' pkg=' + packageId, error.message)
    return { ok: false as const, res: NextResponse.json({ error: 'Internal server error' }, { status: 500 }) }
  }
  const letter = ((pkg?.cover_letters as CoverLetter[] | null) ?? []).find((l) => l.id === letterId)
  if (!pkg || !letter) return { ok: false as const, res: NextResponse.json({ error: 'Cover letter not found' }, { status: 404 }) }
  return { ok: true as const, supabase, user, pkg, letter }
}

export async function PATCH(request: NextRequest, props: Params): Promise<NextResponse> {
  const { id, letterId } = await props.params
  const body = await request.json().catch(() => null)
  const text = typeof body?.full_text === 'string' ? body.full_text.replace(/\r\n/g, '\n').trim() : ''
  if (!text) return NextResponse.json({ error: 'The letter is empty.' }, { status: 400 })
  if (text.length > MAX_TEXT) return NextResponse.json({ error: `A letter can be up to ${MAX_TEXT} characters.` }, { status: 400 })

  const ctx = await loadLetter(id, letterId)
  if (!ctx.ok) return ctx.res
  try {
    const saved = await updateCoverLetterTextAtomic({ packageId: id, userId: ctx.user.id, letterId, fullText: text })
    if (!saved) return NextResponse.json({ error: 'Cover letter not found' }, { status: 404 })
  } catch (e) {
    console.error('cover-letter edit: save failed user=' + ctx.user.id + ' pkg=' + id, e instanceof Error ? e.message : String(e))
    return NextResponse.json({ error: 'Could not save your changes. Please try again.' }, { status: 500 })
  }
  return NextResponse.json({ success: true, full_text: text })
}

export async function GET(request: NextRequest, props: Params): Promise<NextResponse> {
  const { id, letterId } = await props.params
  const format = request.nextUrl.searchParams.get('format') === 'docx' ? 'docx' : 'pdf'
  const ctx = await loadLetter(id, letterId)
  if (!ctx.ok) return ctx.res

  const { data: profile } = await ctx.supabase
    .from('career_profiles')
    .select('full_name')
    .eq('id', ctx.pkg.profile_id as string)
    .eq('user_id', ctx.user.id)
    .maybeSingle()
  const name = `${downloadFileName(profile?.full_name as string | null, ctx.pkg.target_job_title as string | null)}_Cover_Letter`

  try {
    if (format === 'docx') {
      const file = await letterDocx(ctx.letter.full_text)
      return new NextResponse(new Uint8Array(file), {
        headers: {
          'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          'Content-Disposition': `attachment; filename="${name}.docx"`,
          'Cache-Control': 'private, no-store',
        },
      })
    }
    const file = await letterPdf(ctx.letter.full_text)
    return new NextResponse(new Uint8Array(file), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${name}.pdf"`,
        'Cache-Control': 'private, no-store',
      },
    })
  } catch (e) {
    console.error('cover-letter file: render failed user=' + ctx.user.id + ' pkg=' + id, e instanceof Error ? e.message : String(e))
    return NextResponse.json({ error: 'Could not create the file. Please try again.' }, { status: 500 })
  }
}
