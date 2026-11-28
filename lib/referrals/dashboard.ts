import { createServiceRoleClient } from '@/lib/supabase/serviceAdmin'
import { SITE_URL } from '@/lib/siteUrl'

export const REFERRAL_PAGE_SIZE = 15

const REFERRAL_METRICS = {
  visits: 0,
  unique_browsers_90d: 0,
  registrations: 0,
  pending_verification: 0,
  incomplete_profile: 0,
  pending_qualification: 0,
  under_review: 0,
  qualified: 0,
  rejected: 0,
}

export async function loadReferralDashboard(userId: string, activityPage: number, walletPage: number) {
  const admin = createServiceRoleClient({ fresh: true })
  const activityStart = (activityPage - 1) * REFERRAL_PAGE_SIZE
  const walletStart = (walletPage - 1) * REFERRAL_PAGE_SIZE
  const [link, stats, sources, activity, ledger, config, legacy, incoming] = await Promise.all([
    admin.from('referral_links').select('code, suspended_at').eq('owner_id', userId).maybeSingle(),
    admin.rpc('referral_summary', { p_owner: userId }),
    admin.rpc('wallet_source_summary', { p_owner: userId }),
    admin.from('referral_attributions').select('id, status, created_at, qualified_at')
      .eq('referrer_id', userId).order('created_at', { ascending: false }).order('id', { ascending: false })
      .range(activityStart, activityStart + REFERRAL_PAGE_SIZE),
    admin.from('credit_ledger').select('id, kind, units, recorded_at, credit_lots!inner(source, owner_id), credit_service_reservations(service)')
      .eq('credit_lots.owner_id', userId).order('id', { ascending: false }).range(walletStart, walletStart + REFERRAL_PAGE_SIZE),
    admin.from('referral_program_settings').select('enabled, reward_units, attribution_days').eq('singleton', true).single(),
    admin.from('user_service_credits').select('service_key').eq('user_id', userId).is('consumed_at', null).limit(500),
    admin.from('referral_attributions').select('status').eq('referred_id', userId).maybeSingle(),
  ])

  if ([link, stats, sources, activity, ledger, config, legacy, incoming].some(query => query.error)) {
    throw new Error('Referral dashboard data unavailable')
  }
  if (!config.data) throw new Error('Referral settings unavailable')

  const url = link.data ? new URL('/', SITE_URL) : null
  if (url && link.data) url.searchParams.set('ref', link.data.code)
  const walletSources = (sources.data ?? []) as Array<{
    source: string; available: number; reserved: number; earned: number; used: number
  }>
  const totals = walletSources.reduce((total, source) => ({
    available: total.available + source.available,
    reserved: total.reserved + source.reserved,
    earned: total.earned + source.earned,
    used: total.used + source.used,
  }), { available: 0, reserved: 0, earned: 0, used: 0 })

  return {
    url: url?.toString() ?? null,
    suspended: Boolean(link.data?.suspended_at),
    config: config.data,
    incoming: incoming.data?.status ?? null,
    stats: { ...REFERRAL_METRICS, ...(stats.data as typeof REFERRAL_METRICS | null) },
    sources: walletSources,
    totals,
    referralEarned: walletSources.find(source => source.source === 'referral')?.earned ?? 0,
    activity: activity.data ?? [],
    ledger: (ledger.data ?? []) as unknown as Array<{
      id: number; kind: string; units: number; recorded_at: string; credit_lots: { source: string };
      credit_service_reservations: { service: string } | null
    }>,
    allowances: (legacy.data ?? []).reduce<Record<string, number>>((row, { service_key }) => {
      row[service_key] = (row[service_key] ?? 0) + 1
      return row
    }, {}),
  }
}
