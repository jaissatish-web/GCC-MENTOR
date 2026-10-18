'use client'

import { useState } from 'react'
import Link from 'next/link'
import * as Dialog from '@radix-ui/react-dialog'
import { ArrowRight, FileText, UserRound, X, ShieldCheck, Mail, Mic, Pause, Play, Network, ChevronDown } from 'lucide-react'
import { NAV_ITEMS, NAV_GROUPS, navHref } from '@/components/layout/navItems'
import { GUIDE_SERVICES } from './guide'
import { cn } from '@/lib/utils'
import s from './how-it-works.module.css'
import { JourneyDiagram, JourneySimulation } from './JourneyExperience'

/** Navigation guide only. Opening it does not create documents or spend credits. */
export function HowItWorks({ className = '' }: { className?: string }) {
  const [view, setView] = useState<'journey' | 'simulation' | 'services'>('journey')
  const [paused, setPaused] = useState(false)
  return (
    <Dialog.Root>
      <Dialog.Trigger className={`journey-guide-trigger inline-flex min-h-11 items-center justify-center gap-2 rounded-ctl px-4 type-button text-teal hover:bg-teal-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal ${className}`}>
        How it works <Network className="size-4" aria-hidden="true" />
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className={cn(s.overlay, 'fixed inset-0 z-[70]')} />
        <Dialog.Content className={cn(s.dialog, paused && s.paused, 'fixed left-1/2 top-1/2 z-[71] flex max-h-[94dvh] w-[calc(100%_-_16px)] max-w-[1120px] -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden rounded-card font-redesign-sans text-ink focus:outline-none')}>
          <header className={cn(s.hero, 'shrink-0 px-4 pb-4 pt-4 sm:px-6 sm:pt-5')}>
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className={cn(s.eyebrow, 'type-caption font-semibold tracking-wide')}>YOUR PREPARATION GUIDE</p>
                <Dialog.Title className={cn(s.heroTitle, 'mt-1.5 type-section')}>One profile. A journey for every job.</Dialog.Title>
                <Dialog.Description className={cn(s.heroDescription, 'mt-2 type-helper')}>Explore the journey, then try a sample user’s saved jobs and preparation.</Dialog.Description>
              </div>
              <Dialog.Close aria-label="Close guide" className={cn(s.close, 'flex size-11 shrink-0 items-center justify-center rounded-ctl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white')}><X className="size-5" aria-hidden="true" /></Dialog.Close>
            </div>
            <div className={s.route} aria-label="Journey overview">
              {[{ label: 'Profile', icon: UserRound, tone: 'profile' }, { label: 'CV', icon: FileText, tone: 'tailor' }, { label: 'Apply', icon: Mail, tone: 'letter' }, { label: 'Practise', icon: Mic, tone: 'mock' }].map(({ label, icon: Icon, tone }) => <div key={label} data-ui-service={tone} className={s.routeStop}><span className={s.routeIcon}><Icon className="size-4" aria-hidden="true" /></span><span>{label}</span></div>)}
            </div>
          </header>
          <div className="flex shrink-0 flex-wrap items-center gap-1 border-b border-line bg-white px-3 py-1.5 sm:px-5" role="group" aria-label="Choose guide view">
            <button type="button" aria-pressed={view === 'journey'} onClick={() => setView('journey')} className={cn('min-h-11 rounded-ctl px-3 type-helper font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal', view === 'journey' ? 'bg-teal-soft text-teal' : 'text-ink-soft')}>Journey diagram</button>
            <button type="button" aria-pressed={view === 'simulation'} onClick={() => setView('simulation')} className={cn('min-h-11 rounded-ctl px-3 type-helper font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal', view === 'simulation' ? 'bg-teal-soft text-teal' : 'text-ink-soft')}>Interactive simulation</button>
            <button type="button" aria-pressed={view === 'services'} onClick={() => setView('services')} className={cn('min-h-11 rounded-ctl px-3 type-helper font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal', view === 'services' ? 'bg-teal-soft text-teal' : 'text-ink-soft')}>Services</button>
            <button type="button" aria-pressed={paused} aria-label={paused ? 'Resume guide animation' : 'Pause guide animation'} onClick={() => setPaused(v => !v)} className="ml-auto flex min-h-11 items-center gap-1 rounded-ctl px-2 type-caption text-ink-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal">{paused ? <Play className="size-4" aria-hidden="true" /> : <Pause className="size-4" aria-hidden="true" />}<span>{paused ? 'Play' : 'Pause'}</span></button>
          </div>
          <div className="min-h-0 overflow-y-auto overscroll-contain px-3 py-4 sm:px-6 sm:py-5">
            {view === 'journey' ? <JourneyDiagram /> : view === 'simulation' ? <JourneySimulation /> : <ServiceDirectory />}
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
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
