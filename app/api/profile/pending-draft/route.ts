import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import type { PendingDraft } from '@/lib/pendingDraft'

/**
 * The CV reading waiting for this user's decision, if any (2026-09-11,
 * migration 047). See lib/pendingDraft.ts.
 *
 * GET    → { pending: PendingDraft | null }
 * DELETE → removes it, once the Career Profile page has resolved it.
 *
 * Session client, so owner-only RLS applies; the query is also scoped to the
 * caller explicitly, never RLS alone.
 */

export async function GET(): Promise<NextResponse> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data, error } = await supabase
    .from('pending_profile_drafts')
    .select('draft, source, created_at')
    .eq('user_id', user.id)
    .maybeSingle()
  if (error) {
    console.error('pending draft read failed: user=' + user.id, error.message)
    return NextResponse.json({ error: 'Could not check for a waiting CV reading.' }, { status: 500 })
  }
  return NextResponse.json({ pending: (data as PendingDraft | null) ?? null })
}

export async function DELETE(): Promise<NextResponse> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { error } = await supabase.from('pending_profile_drafts').delete().eq('user_id', user.id)
  if (error) {
    console.error('pending draft delete failed: user=' + user.id, error.message)
    return NextResponse.json({ error: 'Could not clear the waiting CV reading.' }, { status: 500 })
  }
  return NextResponse.json({ ok: true })
}
