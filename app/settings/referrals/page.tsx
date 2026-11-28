import Link from 'next/link'
import { ChevronLeft } from 'lucide-react'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { AppShell } from '@/components/layout/AppShell'
import { PageContainer } from '@/components/layout/PageHeader'
import { buttonVariants } from '@/components/ui/Button'
import { loadReferralDashboard } from '@/lib/referrals/dashboard'
import { pageNumber, ReferralDashboard } from '@/components/referrals/ReferralDashboard'

export const dynamic = 'force-dynamic'

export default async function ReferralsPage({ searchParams }: { searchParams: Promise<{ activity?: string; ledger?: string; qualification?: string }> }) {
  const { data: { user } } = await (await createClient()).auth.getUser()
  if (!user) redirect('/login?redirectTo=%2Fsettings%2Freferrals')
  const params = await searchParams
  const activityPage = pageNumber(params.activity)
  const ledgerPage = pageNumber(params.ledger)
  const data = await loadReferralDashboard(user.id, activityPage, ledgerPage).catch(() => null)

  return <AppShell><PageContainer width="wide" className="grid min-w-0 [--ui-h1-size:1.375rem] [--ui-h2-size:1.0625rem] [--ui-page-gap:1rem] [--ui-page-top:1rem] [--ui-weight-title:600] sm:[--ui-h1-size:1.625rem]">
    <header className="flex flex-wrap items-center justify-between gap-2">
      <h1 className="text-ink">Referral &amp; Credits</h1>
      <Link className={buttonVariants({ variant: 'secondary', size: 'sm' })} href="/settings"><ChevronLeft size={15} aria-hidden="true" /> Settings</Link>
    </header>
    <ReferralDashboard data={data} activityPage={activityPage} ledgerPage={ledgerPage} qualification={params.qualification} />
  </PageContainer></AppShell>
}
