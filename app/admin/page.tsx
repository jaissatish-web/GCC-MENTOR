import Link from 'next/link'
import { requireAdmin } from '@/lib/admin/adminAuth'
import { listPiiAccessLog } from '@/lib/admin/adminData'
import { listProviderConfigs } from '@/lib/ai/providerConfig'
import { listPromoCodes } from '@/lib/admin/promoCodes'
import { getAllPromptTemplates } from '@/lib/ai/promptTemplates'
import { listServicePackages } from '@/lib/admin/servicePackages'
import { Card } from '@/components/ui/Card'

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
  const servicePackages = await listServicePackages()
  const recentAccessLog = await listPiiAccessLog(50)

  const providerConfigured = allProviderConfigs.length > 0
  const defaultConfigured = allProviderConfigs.some((c) => c.key === 'default')
  const activePromoCodes = promoCodes.filter((c) => c.active).length
  const activePackages = servicePackages.filter((p) => p.isActive).length

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
    <main className="mx-auto flex max-w-3xl flex-col gap-6 px-5 py-8">
      <div>
        <h1 className="font-serif text-2xl text-midnight">Admin</h1>
        <p className="text-sm text-ink-muted">
          Signed in as {admin.email ?? admin.id}. Operational tooling — one dashboard,
          one page per function.
        </p>
      </div>

      <div className="flex flex-col gap-3">
        {sections.map((s) => (
          <Link key={s.href} href={s.href} className="block">
            <Card
              className={`flex flex-col gap-1 p-5 transition-colors ${
                s.warn
                  ? 'border-terracotta/40 bg-state-terra-bg'
                  : 'hover:border-gold/50'
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <h2 className="text-[13px] font-bold uppercase tracking-wide text-ink-warm">
                  {s.title}
                </h2>
                <span className="text-sm text-emerald">→</span>
              </div>
              <p
                className={
                  s.warn
                    ? 'text-[13px] font-semibold text-state-terra-text'
                    : 'text-[13px] text-ink-body'
                }
              >
                {s.summary}
              </p>
            </Card>
          </Link>
        ))}
      </div>
    </main>
  )
}
