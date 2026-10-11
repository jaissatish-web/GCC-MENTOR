import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/** Read/delete only. Review evidence is written by the server-side importer. */
export async function GET(): Promise<NextResponse> {
  const db = await createClient()
  const { data: { user } } = await db.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { data, error } = await db.from('resume_import_reviews').select('review').eq('user_id', user.id).maybeSingle()
  if (error) return NextResponse.json({ error: 'Your import review could not be loaded.' }, { status: 503 })
  return NextResponse.json({ review: data?.review ?? null }, { headers: { 'Cache-Control': 'private, no-store' } })
}
export async function DELETE(): Promise<NextResponse> {
  const db = await createClient()
  const { data: { user } } = await db.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { error } = await db.from('resume_import_reviews').delete().eq('user_id', user.id)
  if (error) return NextResponse.json({ error: 'Your import review could not be removed.' }, { status: 500 })
  // Do not resurrect the private source comparison from an unresolved draft.
  const { data: pending, error: readError } = await db.from('pending_profile_drafts').select('report').eq('user_id', user.id).maybeSingle()
  if (readError) return NextResponse.json({ error: 'Could not finish removing the comparison. Please retry.' }, { status: 500 })
  if (pending?.report?.review) {
    const { review: _removed, ...report } = pending.report
    const { error: clearError } = await db.from('pending_profile_drafts').update({ report }).eq('user_id', user.id)
    if (clearError) return NextResponse.json({ error: 'Could not finish removing the comparison. Please retry.' }, { status: 500 })
  }
  return NextResponse.json({ ok: true })
}
