'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { WORKSPACE_PRIMARY_ITEMS, workspaceItemActive } from './navItems'

export function MobileBottomNav() {
  const pathname = usePathname() ?? ''
  return <nav aria-label="Primary" data-mobile-navigation className="studio-bottom-nav">
    {WORKSPACE_PRIMARY_ITEMS.map(item => <Link key={item.href} href={item.href} aria-label={item.label} aria-current={workspaceItemActive(item.href, pathname) ? 'page' : undefined}><item.icon aria-hidden="true" /><span>{item.shortLabel}</span></Link>)}
  </nav>
}
