import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/**
 * POST /api/profile/skills — add the skills, tools and standards the user
 * TICKED on High's list ("This job also asks for these — tick the ones you
 * really have", founder 2026-10-02).
 *
 * Body: { names: string[] }   → 201 { added: string[] }
 *
 * The user states each one; nothing is added without the tick. Names already
 * on the profile (any case) are skipped. Only profile_skills is written, with
 * the session client, so RLS (owner-only, migration 011) applies, and
 * career_profiles.updated_at is bumped so an older Career Profile tab gets a
 * 409 instead of saving over the new skills.
 *
 * PII: values are never logged — only ids and counts.
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null
  const raw = Array.isArray(body?.names) ? (body!.names as unknown[]) : []
  const names = [...new Map(raw.filter((n): n is string => typeof n === 'string').map((n) => n.trim().replace(/\s+/g, ' ')).filter((n) => n.length >= 2 && n.length <= 80).map((n) => [n.toLowerCase(), n])).values()]
  if (!names.length || names.length > 30) return NextResponse.json({ error: 'Tick at least one skill.' }, { status: 400 })

  const { data: profile, error: profileError } = await supabase.from('career_profiles').select('id').eq('user_id', user.id).maybeSingle()
  if (profileError) return NextResponse.json({ error: 'Could not read your Career Profile. Please try again.' }, { status: 503 })
  if (!profile) return NextResponse.json({ error: 'Create your Career Profile first.' }, { status: 404 })

  const { data: existing } = await supabase.from('profile_skills').select('name, sort_order').eq('profile_id', profile.id)
  const have = new Set((existing ?? []).map((s) => (s.name as string).trim().toLowerCase()))
  const fresh = names.filter((n) => !have.has(n.toLowerCase()))
  if (!fresh.length) return NextResponse.json({ added: [] }, { status: 201 })
  const start = (existing ?? []).reduce((m, s) => Math.max(m, Number(s.sort_order) + 1), 0)

  const { error } = await supabase.from('profile_skills').insert(fresh.map((name, i) => ({ profile_id: profile.id, name, sort_order: start + i })))
  if (error) {
    console.error('profile skills add failed user=' + user.id, error.message)
    return NextResponse.json({ error: 'Could not save your skills. Please try again.' }, { status: 500 })
  }
  await supabase.from('career_profiles').update({ updated_at: new Date().toISOString() }).eq('id', profile.id).eq('user_id', user.id)
  console.log(`profile skills added user=${user.id} count=${fresh.length}`)
  return NextResponse.json({ added: fresh }, { status: 201 })
}
