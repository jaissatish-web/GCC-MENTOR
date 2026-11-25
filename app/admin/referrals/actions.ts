'use server'

import { redirect } from 'next/navigation'
import { requireAdmin } from '@/lib/admin/adminAuth'
import { createServiceRoleClient } from '@/lib/supabase/serviceAdmin'
import { REFERRAL_TOKEN } from '@/lib/referrals/cookies'
import { CREDIT_SERVICES } from '@/lib/credits/services'

const text = (form: FormData, key: string) => String(form.get(key) ?? '').trim()
const number = (form: FormData, key: string) => Number(text(form, key))
const checked = (form: FormData, key: string) => form.get(key) === 'on'

export async function saveMonetizationAction(form: FormData) {
  const admin = await requireAdmin()
  const action = text(form, 'action')
  const user = text(form, 'user')
  const subject = text(form, 'subject') || null
  const operation = text(form, 'operation')
  const reason = text(form, 'reason')
  let details: Record<string, unknown> | null = null
  switch (action) {
    case 'configure_referrals':
      details = {
        enabled: checked(form, 'enabled'), issuance_paused: checked(form, 'issuance_paused'),
        reward_units: number(form, 'reward_units'), attribution_days: number(form, 'attribution_days'),
        hourly_visit_threshold: number(form, 'hourly_visit_threshold'),
        daily_reward_review_threshold: number(form, 'daily_reward_review_threshold'),
      }
      break
    case 'configure_wallet':
      details = {
        enforcement_enabled: checked(form, 'enforcement_enabled'), pricing_visible: checked(form, 'pricing_visible'),
        prices: Object.fromEntries(Object.keys(CREDIT_SERVICES).map(key => [key, number(form, key)])),
      }
      break
    case 'suspend_link':
      details = { suspended: checked(form, 'suspended') }
      break
    case 'review_referral':
      details = { decision: text(form, 'decision') }
      break
    case 'grant_wallet': {
      const expiry = text(form, 'expires_at')
      details = {
        source: text(form, 'source'), units: number(form, 'units'),
        expires_at: /^\d{4}-\d{2}-\d{2}$/.test(expiry) ? expiry + 'T00:00:00+03:00' : expiry || null,
      }
      break
    }
    case 'reverse_wallet':
      details = { units: number(form, 'units') }
      break
  }
  const query = new URLSearchParams()
  if (REFERRAL_TOKEN.test(user)) query.set('user', user)
  let result = 'error'
  if (details && REFERRAL_TOKEN.test(operation) && (!subject || REFERRAL_TOKEN.test(subject))
    && reason.length > 0 && reason.length <= 500) {
    const { data, error } = await createServiceRoleClient({ fresh: true }).rpc('admin_monetization_action', {
      p_admin: admin.id, p_operation: operation, p_action: action, p_subject: subject, p_reason: reason, p_details: details,
    })
    result = error ? 'error' : typeof data?.status === 'string' ? data.status : 'saved'
    if (error) console.error('Referral and wallet administration failed', action, error.code)
  }
  query.set('result', result)
  redirect('/admin/referrals?' + query.toString())
}
