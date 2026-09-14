import Link from 'next/link'
import { requireAdmin } from '@/lib/admin/adminAuth'
import { listPiiAccessLog } from '@/lib/admin/adminData'
import { listProviderConfigs } from '@/lib/ai/providerConfig'
import { listPromoCodes } from '@/lib/admin/promoCodes'
import { listPublishedLegal } from '@/lib/admin/siteContent'
import { getAllPromptTemplates } from '@/lib/ai/promptTemplates'
import { listServicePackages } from '@/lib/admin/servicePackages'
import { Card } from '@/components/ui/Card'
import { PageShell } from '@/components/layout/PageShell'

function plural(n: number, singular: string, pluralForm: string): string {
  return n === 1 ? singular : pluralForm
}

/**
 * Admin panel dashboard (TASK-075). A lightweight landing page: one card per
 * admin function linking to its own route, each with a single line of *live*
 * summary data. No forms, no tables, no per-item lists here — navigation
 * only. The big blocker warning (AI provider not configured) gets the most
 * visual weight so it is not buried.
 *
 * Scope is navigation restructure only — these are the same data-fetch
 * functions the old monolithic /admin page already used, no new queries.
 */
export default async function AdminDashboardPage() {
  const admin = await requireAdmin()

  const allProviderConfigs = await listProviderConfigs()
  const promptTemplates = await getAllPromptTemplates()
  const promoCodes = await listPromoCodes(50)
  // How many legal pages are actually live. Surfaced on the dashboard because
  // "none" is the current answer and it is a trust and compliance gap, not a
  // cosmetic one — see 14_OPEN_ITEMS.md §A4.
  const legalLive = (await listPublishedLegal()).length
  const servicePackages = await listServicePackages()
  const recentAccessLog = await listPiiAccessLog(50)

  const providerConfigured = allProviderConfigs.length > 0
  const defaultConfigured = allProviderConfigs.some((c) => c.key === 'default')
  const activePromoCodes = promoCodes.filter((c) => c.active).length
  const activePackages = servicePackages.filter((p) => p.isActive).length
  const liveLegal = legalLive === 3
  const commerceReady = activePromoCodes > 0 || activePackages > 0
  const aiReady = providerConfigured && defaultConfigured

  const launchChecks = [
    { label: 'AI default configured', ok: aiReady },
    { label: 'Legal pages published', ok: liveLegal },
    { label: 'Manual unlock path ready', ok: commerceReady },
    { label: 'PII access log reachable', ok: true },
  ]

  const sections: {
    title: string
    href: string
    summary: React.ReactNode
    warn?: boolean
  }[] = [
    {
      title: 'AI provider',
      href: '/admin/ai-provider',
      summary: providerConfigured
        ? `${allProviderConfigs.length} ${plural(allProviderConfigs.length, 'config', 'configs')} · default ${
            defaultConfigured ? 'configured' : 'not set'
          }`
        : 'Not configured — no AI calls will work until a default is saved',
      warn: !providerConfigured,
    },
    {
      title: 'Prompts',
      href: '/admin/prompts',
      summary: `${promptTemplates.length} ${plural(promptTemplates.length, 'template', 'templates')}`,
    },
    {
      title: 'Site content',
      href: '/admin/content',
      summary: legalLive
        ? `${legalLive} of 3 legal pages live`
        : 'No legal pages written yet — privacy, terms and refund are all empty',
      warn: legalLive < 3,
    },
    {
      title: 'Promo codes',
      href: '/admin/promo-codes',
      summary: `${activePromoCodes} active / ${promoCodes.length} total`,
    },
    {
      title: 'Service packages',
      href: '/admin/packages',
      summary: `${activePackages} active ${plural(activePackages, 'package', 'packages')}`,
    },
    {
      title: 'Users',
      href: '/admin/users',
      summary: 'Search users →',
    },
    {
      title: 'PII access log',
      href: '/admin/access-log',
      summary: `${recentAccessLog.length} ${plural(recentAccessLog.length, 'recent entry', 'recent entries')}`,
    },
  ]

  return (
    <PageShell
      title="Founder Control Center"
      subtitle={`Signed in as ${admin.email ?? admin.id}. Control services, AI, launch readiness and user support without touching code.`}
      width="wide"
    >

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Card className={aiReady ? 'p-4' : 'border-alert/40 bg-alert-soft p-4'}>
          <p className="text-[12px] font-semibold uppercase tracking-[0.12em] text-ink-muted">AI Status</p>
          <p className={aiReady ? 'mt-2 font-display text-[24px] font-semibold text-teal' : 'mt-2 font-display text-[24px] font-semibold text-alert'}>
            {aiReady ? 'Ready' : 'Check'}
          </p>
          <p className="mt-1 text-[12px] leading-relaxed text-ink-soft">
            {allProviderConfigs.length} service config{allProviderConfigs.length === 1 ? '' : 's'}
          </p>
        </Card>
        <Card className={liveLegal ? 'p-4' : 'border-alert/40 bg-alert-soft p-4'}>
          <p className="text-[12px] font-semibold uppercase tracking-[0.12em] text-ink-muted">Legal</p>
          <p className={liveLegal ? 'mt-2 font-display text-[24px] font-semibold text-teal' : 'mt-2 font-display text-[24px] font-semibold text-alert'}>
            {legalLive}/3
          </p>
          <p className="mt-1 text-[12px] leading-relaxed text-ink-soft">Privacy, terms, refund</p>
        </Card>
        <Card className="p-4">
          <p className="text-[12px] font-semibold uppercase tracking-[0.12em] text-ink-muted">Unlocks</p>
          <p className="mt-2 font-display text-[24px] font-semibold text-teal">{activePromoCodes}</p>
          <p className="mt-1 text-[12px] leading-relaxed text-ink-soft">Active promo codes</p>
        </Card>
        <Card className="p-4">
          <p className="text-[12px] font-semibold uppercase tracking-[0.12em] text-ink-muted">Packages</p>
          <p className="mt-2 font-display text-[24px] font-semibold text-teal">{activePackages}</p>
          <p className="mt-1 text-[12px] leading-relaxed text-ink-soft">Active service bundles</p>
        </Card>
      </section>

      <section className="grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">
        <Card className="p-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="font-display text-[18px] font-semibold text-ink">Launch checklist</h2>
              <p className="mt-1 text-[13px] leading-relaxed text-ink-soft">
                Configuration indicators only. Confirm generation, downloads and paid access with a real test account before launch.
              </p>
            </div>
            <span className="rounded-full bg-canvas px-3 py-1 text-[12px] font-semibold text-ink-muted">
              {launchChecks.filter((c) => c.ok).length}/{launchChecks.length} configured
            </span>
          </div>
          <div className="mt-4 flex flex-col divide-y divide-line">
            {launchChecks.map((item) => (
              <div key={item.label} className="flex items-center justify-between gap-3 py-3">
                <span className="text-[13px] font-medium text-ink">{item.label}</span>
                <span
                  className={
                    item.ok
                      ? 'rounded-full bg-teal-soft px-2.5 py-1 text-[12px] font-bold uppercase tracking-[0.08em] text-teal'
                      : 'rounded-full bg-alert-soft px-2.5 py-1 text-[12px] font-bold uppercase tracking-[0.08em] text-alert'
                  }
                >
                  {item.ok ? 'Ready' : 'Open'}
                </span>
              </div>
            ))}
          </div>
        </Card>

        <Card className="p-5">
          <h2 className="font-display text-[18px] font-semibold text-ink">Service availability</h2>
          <p className="mt-1 text-[13px] leading-relaxed text-ink-soft">
            Resume and cover letter settings are available below. Interview tools remain planned; their links open provider settings, not an implemented interview service.
          </p>
          <div className="mt-4 grid gap-2 sm:grid-cols-2">
            {[
              ['Resume Optimizer', 'Live', '/admin/ai-provider'],
              ['Cover Letter', 'Live', '/admin/ai-provider'],
              ['GCC Templates', 'Live', '/templates'],
              ['Interview Q&A', 'Planned', '/admin/ai-provider'],
              ['Mock Interview', 'Planned', '/admin/ai-provider'],
              ['Payments', 'Manual now', '/admin/promo-codes'],
            ].map(([name, status, href]) => (
              <Link
                key={name}
                href={href}
                className="flex items-center justify-between gap-3 rounded-ctl border border-line bg-canvas px-3 py-2.5 transition-colors hover:border-teal/40 hover:bg-white"
              >
                <span className="text-[13px] font-semibold text-ink">{name}</span>
                <span className="text-[12px] font-semibold text-ink-muted">{status}</span>
              </Link>
            ))}
          </div>
        </Card>
      </section>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {sections.map((s) => (
          <Link key={s.href} href={s.href} className="block">
            <Card
              className={`flex flex-col gap-1 p-5 transition-colors ${
                s.warn
                  ? 'border-alert/40 bg-alert-soft'
                  : 'hover:border-teal/50'
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <h2 className="text-[13px] font-bold uppercase tracking-wide text-ink-muted">
                  {s.title}
                </h2>
                <span className="text-sm text-teal">→</span>
              </div>
              <p
                className={
                  s.warn
                    ? 'text-[13px] font-semibold text-alert'
                    : 'text-[13px] text-ink-soft'
                }
              >
                {s.summary}
              </p>
            </Card>
          </Link>
        ))}
      </div>
    </PageShell>
  )
}
