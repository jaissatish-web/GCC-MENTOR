'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const TABS = [
  { href: '/admin', label: 'Dashboard' },
  { href: '/admin/ai-provider', label: 'AI Provider' },
  { href: '/admin/prompts', label: 'Prompts' },
  { href: '/admin/promo-codes', label: 'Promo Codes' },
  { href: '/admin/packages', label: 'Packages' },
  { href: '/admin/users', label: 'Users' },
  { href: '/admin/access-log', label: 'Access Log' },
]

/**
 * Horizontal tab nav for the admin panel (TASK-075). Each tab is a distinct
 * route (never two tabs pointing at the same href, so at most one can be
 * active). Exact-match on pathname: `/admin` is the dashboard and lights
 * only its own tab; sibling sub-routes never keep it lit.
 */
export function AdminNav() {
  const pathname = usePathname()
  return (
    <nav className="flex flex-wrap gap-1 border-b border-line px-5 pt-4">
      {TABS.map((tab) => {
        const active = pathname === tab.href
        return (
          <Link
            key={tab.href}
            href={tab.href}
            aria-current={active ? 'page' : undefined}
            className={`-mb-px rounded-t-lg border-b-2 px-3 py-2 text-[13px] font-semibold transition-colors ${
              active
                ? 'border-gold text-midnight'
                : 'border-transparent text-ink-muted hover:text-midnight'
            }`}
          >
            {tab.label}
          </Link>
        )
      })}
    </nav>
  )
}
