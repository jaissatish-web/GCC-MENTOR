import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createServiceRoleClient } from '@/lib/supabase/serviceAdmin'
import { SITE_URL } from '@/lib/siteUrl'

export async function POST() {
  const session = await createClient()
  const { data: { user }, error: sessionError } = await session.auth.getUser()
  if (sessionError || !user) return NextResponse.json({ error: 'Sign in to create your referral link.' }, { status: 401 })
  if (!user.email_confirmed_at) return NextResponse.json({ error: 'Verify your email to create your referral link.' }, { status: 403 })

  const { data, error } = await createServiceRoleClient({ fresh: true }).rpc('get_or_create_referral_link', {
    p_user_id: user.id,
  }).maybeSingle<{ code: string | null; suspended_at: string | null }>()
  if (error) return NextResponse.json({ error: 'Could not load your referral link. Try again.' }, { status: 503 })
  if (!data?.code) return NextResponse.json({ error: 'Referral links are currently unavailable.' }, { status: 409 })
  const url = new URL('/', SITE_URL)
  url.searchParams.set('ref', data.code)
  return NextResponse.json({ url: url.toString(), suspended: Boolean(data.suspended_at) }, {
    headers: { 'Cache-Control': 'private, no-store' },
  })
}
