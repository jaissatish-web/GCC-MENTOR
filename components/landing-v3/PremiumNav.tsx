import Link from 'next/link'
import { ArrowUpRight } from 'lucide-react'
import { LandingSectionMenu } from './LandingSectionMenu'
import p from './premium.module.css'

export function PremiumNav({ anchors }: { anchors: ReadonlyArray<readonly [string, string]> }) {
  return <header className={p.header}>
    <a href="#main-content" className={p.skipLink}>Skip to content</a>
    <div className={p.navInner}>
      <Link href="/" className={p.brand} aria-label="GCC Mentor home"><span className={p.brandMark}>G<span aria-hidden="true" /></span><span>GCC <b>MENTOR</b><small>PREPARE FOR YOUR NEXT CHAPTER</small></span></Link>
      <nav aria-label="Page sections" className={p.desktopNav}>{anchors.map(([label, href]) => <a key={href} href={href}>{label}</a>)}</nav>
      <div className={p.navActions}><Link href="/login" className={p.signIn}>Sign in</Link><Link href="/gulf-readiness-score" className={p.navCta}>Check free readiness <ArrowUpRight size={16} aria-hidden="true" /></Link><LandingSectionMenu anchors={anchors} /></div>
    </div>
  </header>
}
