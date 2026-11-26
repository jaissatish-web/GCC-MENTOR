'use server'

import { redirect } from 'next/navigation'
import { requireAdmin } from '@/lib/admin/adminAuth'
import { createServiceRoleClient } from '@/lib/supabase/serviceAdmin'
import { isCreditService } from '@/lib/credits/services'
import { REFERRAL_TOKEN } from '@/lib/referrals/cookies'

export async function grantComplimentaryService(form: FormData) {
  const admin = await requireAdmin()
  const user = String(form.get('user') ?? '')
  const service = String(form.get('service') ?? '')
  const uses = Number(form.get('uses'))
  const operation = String(form.get('operation') ?? '')
  const reason = String(form.get('reason') ?? '').trim()
  const query = new URLSearchParams({ user, q: String(form.get('q') ?? '').slice(0, 200) })
  let granted = false

  if (REFERRAL_TOKEN.test(user) && REFERRAL_TOKEN.test(operation) && isCreditService(service)
    && Number.isInteger(uses) && uses >= 1 && uses <= 50 && reason.length >= 1 && reason.length <= 500) {
    const { data, error } = await createServiceRoleClient({ fresh: true }).rpc('admin_grant_complimentary_service', {
      p_admin: admin.id, p_user: user, p_service: service, p_quantity: uses, p_reason: reason, p_operation: operation,
    })
    granted = !error && data === uses
    if (error) console.error('Complimentary service grant failed', error.code)
  }

  query.set('complimentary', granted ? 'granted' : 'error')
  redirect('/admin/users?' + query.toString() + '#complimentary-service')
}
