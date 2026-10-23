'use client'

import { useState } from 'react'
import Link from 'next/link'
import * as Dialog from '@radix-ui/react-dialog'
import { ArrowRight, X, ShieldCheck, Pause, Play, Network, ChevronDown } from 'lucide-react'
import { NAV_ITEMS, NAV_GROUPS, navHref } from '@/components/layout/navItems'
import { GUIDE_SERVICES } from './guide'
import { cn } from '@/lib/utils'
import s from './how-it-works.module.css'
import { JourneyDiagram, JourneySimulation } from './JourneyExperience'

/** Navigation guide only. Opening it does not create documents or spend credits. */
export function HowItWorks({ className = '' }: { className?: string }) {
  const [view, setView] = useState<'journey' | 'simulation' | 'services'>('journey')
  const [paused, setPaused] = useState(false)
  return <Dialog.Root>
    <Dialog.Trigger className={`journey-guide-trigger inline-flex min-h-11 items-center justify-center gap-2 rounded-ctl px-4 type-button text-teal hover:bg-teal-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal ${className}`}>
      How it works <Network className="size-4" aria-hidden="true" />
    </Dialog.Trigger>
    <Dialog.Portal>
      <Dialog.Overlay className={cn(s.overlay, 'fixed inset-0 z-[70]')} />
      <Dialog.Content className={cn(s.dialog, s.experience, paused && s.paused, 'app-type internal-ui font-redesign-sans focus:outline-none')}>
        <div className={s.chrome}>
          <span className={s.guideBrand}><span>G</span> GCC <strong>MENTOR</strong><small>How it works</small></span>
          <div className={s.chromeActions}>
            <button type="button" aria-pressed={paused} aria-label={paused ? 'Resume guide animation' : 'Pause guide animation'} onClick={() => setPaused(v => !v)} className={s.chromeButton}>{paused ? <Play size={17} aria-hidden="true" /> : <Pause size={17} aria-hidden="true" />}</button>
            <Dialog.Close aria-label="Close guide" className={s.chromeButton}><X size={21} aria-hidden="true" /></Dialog.Close>
          </div>
        </div>
        <div className={s.guideScroll}>
          <header className={s.editorialHero}>
            <span className={s.heroKicker}><Network size={14} aria-hidden="true" /> YOUR GULF CAREER, CONNECTED</span>
            <Dialog.Title className={s.editorialTitle}>One profile.<br className={s.mobileBreak} /> <em>Multiple possibilities.</em></Dialog.Title>
            <Dialog.Description className={s.editorialDescription}>Follow the branches. Select a job and explore your preparation.</Dialog.Description>
            <div className={s.viewSwitch} role="group" aria-label="Choose guide view">
              {([{key:'journey',label:'Journey diagram'}, {key:'simulation',label:'Simulation'}, {key:'services',label:'All services'}] as const).map(item => <button key={item.key} type="button" aria-pressed={view === item.key} onClick={() => setView(item.key)} className={cn(s.viewButton, view === item.key && s.viewSelected)}>{item.label}</button>)}
            </div>
          </header>
          <div className={s.guideBody}>
            {view === 'journey' ? <JourneyDiagram /> : view === 'simulation' ? <JourneySimulation /> : <ServiceDirectory />}
          </div>
        </div>
      </Dialog.Content>
    </Dialog.Portal>
  </Dialog.Root>
}

function GuideLink({ href, children }: { href: string; children: React.ReactNode }) {
  return <Dialog.Close asChild><Link href={href} className={s.link}>{children}<ArrowRight className="size-4 shrink-0" aria-hidden="true" /></Link></Dialog.Close>
}
function ServiceDirectory() {
  const headings: Record<string, string> = { home: 'Your starting point', profile: 'Your career foundation', files: 'Your saved work', cv: 'Build your resume & application', apply: 'Interview preparation', professional: 'Recruiter profiles', account: 'Your account' }
  return <div className="space-y-5">
    <div><h3 className="type-card text-teal">Every destination, explained</h3><p className="mt-1 type-helper text-ink-soft">Follow the links here or use the app menu. Expand any service to see its inputs and outputs.</p></div>
    {NAV_GROUPS.map(group => <section key={group.key} className="border-l-2 border-teal/20 pl-3"><h4 className="type-caption font-semibold uppercase tracking-wide text-teal">{headings[group.key] ?? group.label ?? group.key}</h4>{group.hrefs.map(href => {
      const item = NAV_ITEMS.find(nav => nav.href === href)
      if (!item) return null
      const detail = GUIDE_SERVICES[href]
      const Icon = item.icon
      return <div key={href} className={s.serviceRow}><span className={cn(item.iconClass, 'flex size-9 shrink-0 items-center justify-center rounded-ctl')}><Icon className="size-5" aria-hidden="true" /></span><div className="min-w-0 flex-1"><GuideLink href={navHref(item)}>{item.label}</GuideLink><p className="type-helper text-ink-soft">{detail?.purpose}</p>{detail && <details className={s.details}><summary>Inputs & results <ChevronDown className="size-3 shrink-0" aria-hidden="true" /></summary><dl className="space-y-2 rounded-ctl bg-white p-3 type-helper"><div><dt className="font-semibold text-teal">What you get</dt><dd className="mt-1 text-ink-soft">{detail.outputs}</dd></div><div><dt className="font-semibold text-teal">What it uses</dt><dd className="mt-1 text-ink-soft">{detail.uses}</dd></div></dl></details>}</div></div>
    })}</section>)}
    <section className={s.node}><div className="flex items-center gap-2"><ShieldCheck className="size-5 text-teal" aria-hidden="true" /><h4 className="type-label text-teal">Gulf Readiness is inside Career Profile</h4></div><p className="mt-1 type-helper text-ink-soft">Review your score and missing details without creating another resume.</p><GuideLink href="/profile?view=readiness">Open Gulf Readiness</GuideLink></section>
  </div>
}
