'use client'

import Link from 'next/link'
import { UserCircleIcon } from '@heroicons/react/24/outline'
import { ServicesMenu } from './ServicesMenu'

/** Compact shared header with access to every existing service and account action. */
export function AppHeader() {
  return <header data-mobile-header className="studio-topbar">
    <Link href="/dashboard" aria-label="GCC MENTOR — go to your dashboard" className="studio-mobile-brand">GCC MENTOR</Link>
    <span className="studio-desktop-caption">Your career workspace</span>
    <div className="studio-topbar-actions">
      <Link href="/profile" aria-label="Open Career Profile" className="studio-account-link"><UserCircleIcon aria-hidden="true" /></Link>
      <ServicesMenu />
    </div>
  </header>
}
