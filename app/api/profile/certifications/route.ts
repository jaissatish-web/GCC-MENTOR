import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/**
 * POST /api/profile/certifications — add ONE certificate or licence the user
 * says they hold (founder, 2026-10-02: "ask the user… so you depend upon the
 * user"). Used by the job check on the level screen: "This job asks for LEED
 * AP — I have it".
 *
 * Body: { name, issuer?, year? }   → 201 { certification }
 *
 * The user states it; we never add one for them. Nothing else on the profile
 * is touched. The session client is used, so RLS (owner-only, migration 011)
 * applies. career_profiles.updated_at is bumped so a Career Profile tab
 * opened earlier gets a 409 instead of saving over the new certificate.
 *
 * PII: values are never logged — only ids.
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null
  const name = typeof body?.name === 'string' ? body.name.trim().replace(/\s+/g, ' ') : ''
  const issuer = typeof body?.issuer === 'string' && body.issuer.trim() ? body.issuer.trim().slice(0, 200) : null
  const yearRaw = body?.year
  const year = typeof yearRaw === 'number' || (typeof yearRaw === 'string' && yearRaw.trim()) ? Number(yearRaw) : null
  const thisYear = new Date().getFullYear()
  if (name.length < 2 || name.length > 200) return NextResponse.json({ error: 'Please enter the certificate name.' }, { status: 400 })
  if (year !== null && (!Number.isInteger(year) || year < 1950 || year > thisYear)) {
    return NextResponse.json({ error: `The year must be between 1950 and ${thisYear}.` }, { status: 400 })
  }

  const { data: profile, error: profileError } = await supabase.from('career_profiles').select('id').eq('user_id', user.id).maybeSingle()
  if (profileError) return NextResponse.json({ error: 'Could not read your Career Profile. Please try again.' }, { status: 503 })
  if (!profile) return NextResponse.json({ error: 'Create your Career Profile first.' }, { status: 404 })

  const { data: existing } = await supabase.from('profile_certifications').select('name, sort_order').eq('profile_id', profile.id)
  if ((existing ?? []).some((c) => (c.name as string).trim().toLowerCase() === name.toLowerCase())) {
    return NextResponse.json({ error: 'This certificate is already on your profile.', code: 'DUPLICATE' }, { status: 409 })
  }
  const sortOrder = (existing ?? []).reduce((m, c) => Math.max(m, Number(c.sort_order) + 1), 0)

  const { data: row, error } = await supabase
    .from('profile_certifications')
    .insert({ profile_id: profile.id, name, issuer, issue_date: year ? `${year}-01-01` : null, expiry_date: null, sort_order: sortOrder })
    .select('id, profile_id, name, issuer, issue_date, expiry_date, sort_order, created_at')
    .single()
  if (error || !row) {
    console.error('profile certification add failed user=' + user.id, error?.message ?? 'no row')
    return NextResponse.json({ error: 'Could not save the certificate. Please try again.' }, { status: 500 })
  }
  await supabase.from('career_profiles').update({ updated_at: new Date().toISOString() }).eq('id', profile.id).eq('user_id', user.id)
  return NextResponse.json({ certification: row }, { status: 201 })
}
