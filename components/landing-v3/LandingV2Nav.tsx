'use client'

import Link from 'next/link'
import { ArrowRight, Menu, X } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import s from './landing-v2.module.css'

const links = [['Services', '#services'], ['Why GCC Mentor', '#challenges'], ['Industries', '#industries'], ['Resources', '/tools'], ['Pricing', '#pricing']] as const

export function LandingV2Nav() {
  const [open, setOpen] = useState(false)
  const button = useRef<HTMLButtonElement>(null)
  useEffect(() => {
    if (!open) return
    const escape = (event: KeyboardEvent) => { if (event.key === 'Escape') { setOpen(false); button.current?.focus() } }
    document.addEventListener('keydown', escape)
    return () => document.removeEventListener('keydown', escape)
  }, [open])
  return <header className={s.header}>
    <a href="#main-content" className={s.skip}>Skip to content</a>
    <div className={s.navInner}>
      <Link href="/" className={s.brand} aria-label="GCC Mentor home"><span className={s.brandMark} aria-hidden="true">G</span><span><strong>GCC Mentor</strong><small>Gulf Technical Careers</small></span></Link>
      <nav className={s.desktopNav} aria-label="Main navigation">{links.map(([label, href]) => <Link key={href} href={href}>{label}</Link>)}</nav>
      <div className={s.navActions}><Link className={s.login} href="/login">Log In</Link><Link href="/signup" className={s.primary}>Get Started Free <ArrowRight size={16} aria-hidden="true" /></Link><button ref={button} type="button" className={s.menuButton} aria-expanded={open} aria-controls="landing-mobile-nav" aria-label={open ? 'Close navigation' : 'Open navigation'} onClick={() => setOpen(!open)}>{open ? <X aria-hidden="true" /> : <Menu aria-hidden="true" />}</button></div>
    </div>
    <nav hidden={!open} id="landing-mobile-nav" className={s.mobileNav} aria-label="Mobile navigation">{links.map(([label, href]) => <Link key={href} href={href} onClick={() => setOpen(false)}>{label}</Link>)}<Link href="/login" onClick={() => setOpen(false)}>Log In</Link><Link href="/signup" className={s.primary} onClick={() => setOpen(false)}>Get Started Free <ArrowRight size={16} aria-hidden="true" /></Link></nav>
  </header>
}
