'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Squares2X2Icon, Cog6ToothIcon } from '@heroicons/react/24/outline'
import { WORKSPACE_PRIMARY_ITEMS, workspaceItemActive } from './navItems'

/** Stable workspace rail; the shared services drawer retains all detailed tools. */
export function Sidebar() {
  const pathname = usePathname() ?? ''
  return <aside className="studio-sidebar" aria-label="Workspace sidebar">
    <Link href="/dashboard" className="studio-brand"><strong>GCC MENTOR</strong><span>Career workspace</span></Link>
    <nav aria-label="Primary" className="studio-primary-nav">
      {WORKSPACE_PRIMARY_ITEMS.map(item => <Link key={item.href} href={item.href} aria-label={item.shortLabel} aria-current={workspaceItemActive(item.href, pathname) ? 'page' : undefined}><item.icon aria-hidden="true" /><span>{item.shortLabel}</span></Link>)}
    </nav>
    <div className="studio-sidebar-bottom">
      <Link href="/dashboard/tools" aria-label="All tools"><Squares2X2Icon aria-hidden="true" /><span>All tools</span></Link>
      <Link href="/settings" aria-label="Settings"><Cog6ToothIcon aria-hidden="true" /><span>Settings</span></Link>
      <a href="mailto:jaissatish@gmail.com" className="studio-help">Help &amp; support</a>
    </div>
  </aside>
}
