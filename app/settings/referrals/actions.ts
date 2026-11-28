'use server'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createServiceRoleClient } from '@/lib/supabase/serviceAdmin'

export async function confirmReferralProfile(form: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login?redirectTo=%2Fsettings%2Freferrals')
  let outcome = 'incomplete_profile'
  if (form.get('confirmed') === 'on') {
    const { data: profile, error: profileError } = await supabase.from('career_profiles')
      .select('updated_at').eq('user_id', user.id).maybeSingle()
    if (profileError) outcome = 'error'
    if (profile?.updated_at) {
      const { data, error } = await createServiceRoleClient({ fresh: true }).rpc('qualify_referral', {
        p_referred: user.id, p_assessed_profile_version: profile.updated_at,
      })
      outcome = error || typeof data !== 'string' ? 'error' : data
    }
  }
  const embedded = form.get('fromSettings') === '1'
  redirect((embedded ? '/settings?' : '/settings/referrals?') + new URLSearchParams({
    ...(embedded ? { tab: 'package' } : {}),
    qualification: outcome,
  }).toString() + '#joining')
}
