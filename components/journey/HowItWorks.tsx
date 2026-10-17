'use client'

import { useState } from 'react'
import Link from 'next/link'
import * as Dialog from '@radix-ui/react-dialog'
import { ArrowRight, FileText, BriefcaseBusiness, UserRound, X, LayoutTemplate, Download, ShieldCheck, Mail, MessagesSquare, Mic, Pause, Play, Network, ChevronDown } from 'lucide-react'
import { NAV_ITEMS, NAV_GROUPS, navHref } from '@/components/layout/navItems'
import { GUIDE_SERVICES } from './guide'
import { cn } from '@/lib/utils'
import s from './how-it-works.module.css'

const results = [
  { label: 'Preview & edit', icon: FileText },
  { label: 'Choose a template', icon: LayoutTemplate },
  { label: 'Save · PDF / DOCX', icon: Download },
]

/** Navigation guide only. Opening it does not create documents or spend credits. */
export function HowItWorks({ className = '' }: { className?: string }) {
  const [view, setView] = useState<'journey' | 'services'>('journey')
  const [paused, setPaused] = useState(false)
  return (
    <Dialog.Root>
      <Dialog.Trigger className={`journey-guide-trigger inline-flex min-h-11 items-center justify-center gap-2 rounded-ctl px-4 type-button text-teal hover:bg-teal-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal ${className}`}>
        How it works <Network className="size-4" aria-hidden="true" />
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className={cn(s.overlay, 'fixed inset-0 z-[70]')} />
        <Dialog.Content className={cn(s.dialog, paused && s.paused, 'fixed left-1/2 top-1/2 z-[71] flex max-h-[94dvh] w-[calc(100%_-_16px)] max-w-[960px] -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden rounded-card font-redesign-sans text-ink focus:outline-none')}>
          <header className={cn(s.hero, 'shrink-0 px-4 pb-4 pt-4 sm:px-6 sm:pt-5')}>
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className={cn(s.eyebrow, 'type-caption font-semibold tracking-wide')}>YOUR PREPARATION GUIDE</p>
                <Dialog.Title className={cn(s.heroTitle, 'mt-1.5 type-section')}>Your next step, made simple.</Dialog.Title>
                <Dialog.Description className={cn(s.heroDescription, 'mt-2 type-helper')}>Save your profile once. Choose the tools you need for each Gulf opportunity.</Dialog.Description>
              </div>
              <Dialog.Close aria-label="Close guide" className={cn(s.close, 'flex size-11 shrink-0 items-center justify-center rounded-ctl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white')}><X className="size-5" aria-hidden="true" /></Dialog.Close>
            </div>
            <div className={s.route} aria-label="Journey overview">
              {[{ label: 'Profile', icon: UserRound, tone: 'profile' }, { label: 'CV', icon: FileText, tone: 'tailor' }, { label: 'Apply', icon: Mail, tone: 'letter' }, { label: 'Practise', icon: Mic, tone: 'mock' }].map(({ label, icon: Icon, tone }) => <div key={label} data-ui-service={tone} className={s.routeStop}><span className={s.routeIcon}><Icon className="size-4" aria-hidden="true" /></span><span>{label}</span></div>)}
            </div>
          </header>
          <div className="flex shrink-0 items-center gap-1 border-b border-line bg-white px-3 py-1.5 sm:px-5" role="group" aria-label="Choose guide view">
            <button type="button" aria-pressed={view === 'journey'} onClick={() => setView('journey')} className={cn('min-h-11 rounded-ctl px-3 type-helper font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal', view === 'journey' ? 'bg-teal-soft text-teal' : 'text-ink-soft')}>Steps</button>
            <button type="button" aria-pressed={view === 'services'} onClick={() => setView('services')} className={cn('min-h-11 rounded-ctl px-3 type-helper font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal', view === 'services' ? 'bg-teal-soft text-teal' : 'text-ink-soft')}>Services</button>
            <button type="button" aria-pressed={paused} aria-label={paused ? 'Resume guide animation' : 'Pause guide animation'} onClick={() => setPaused(v => !v)} className="ml-auto flex min-h-11 items-center gap-1 rounded-ctl px-2 type-caption text-ink-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal">{paused ? <Play className="size-4" aria-hidden="true" /> : <Pause className="size-4" aria-hidden="true" />}<span>{paused ? 'Play' : 'Pause'}</span></button>
          </div>
          <div className="min-h-0 overflow-y-auto overscroll-contain px-3 py-4 sm:px-6 sm:py-5">
            {view === 'journey' ? <JourneyTree /> : <ServiceDirectory />}
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}

function GuideLink({ href, children }: { href: string; children: React.ReactNode }) {
  return <Dialog.Close asChild><Link href={href} className={s.link}>{children}<ArrowRight className="size-4 shrink-0" aria-hidden="true" /></Link></Dialog.Close>
}
function Connector() { return <div className={s.connector} aria-hidden="true" /> }
function Stage({ number, children }: { number: number; children: React.ReactNode }) {
  return <h3 className={s.stage}><span className={s.stageNumber}>{number}</span>{children}</h3>
}
function JourneyTree() {
  return <div className={s.tree}>
    <Stage number={1}>Save your career details</Stage>
    <section data-ui-service="profile" className={s.node} aria-label="Career Profile and Gulf Readiness">
      <div className="flex flex-wrap gap-1.5">{[{ label: 'Upload resume', href: '/profile?import=upload' }, { label: 'Paste text', href: '/profile?import=paste' }, { label: 'Enter details', href: '/profile?view=details' }].map(item => <Dialog.Close asChild key={item.label}><Link href={item.href} className="flex min-h-11 items-center rounded-ctl bg-teal-soft px-2.5 type-caption font-semibold text-teal focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal">{item.label}</Link></Dialog.Close>)}</div>
      <div className="mt-3 flex items-center gap-2"><UserRound className="size-5 text-teal" aria-hidden="true" /><h4 className="type-card text-teal">Career Profile</h4></div>
      <p className="mt-1 type-helper text-ink-soft">Upload, paste or enter your resume. Check the details, then save.</p>
      <div className="mt-3 border-t border-teal/15 pt-3"><div className="flex items-center gap-2"><ShieldCheck className="size-5 text-teal" aria-hidden="true" /><h4 className="type-label text-teal">Gulf Readiness</h4></div><p className="mt-1 type-helper text-ink-soft">See what is complete and what to improve.</p><GuideLink href="/profile?view=readiness">Check readiness</GuideLink></div>
    </section>
    <Connector />
    <Stage number={2}>Choose your resume</Stage>
    <div className={s.branch}>
      <section data-ui-service="library" className={s.node} aria-label="Profile Resume path"><FileText className="size-6 text-teal" aria-hidden="true" /><h4 className="mt-2 type-card text-teal">Profile Resume</h4><p className="mt-2 type-helper text-ink-soft">Format your saved details. Your wording stays yours.</p><details className={s.details}><summary>How it works <ChevronDown className="size-3" aria-hidden="true" /></summary><ol className="space-y-2 type-helper text-ink-soft"><li>1. Save your Career Profile.</li><li>2. Choose Preview Profile Resume.</li><li>3. Edit the design and download.</li></ol></details><GuideLink href="/profile">Open profile</GuideLink></section>
      <section data-ui-service="tailor" className={s.node} aria-label="Optimized Resume path"><BriefcaseBusiness className="size-6 text-gold-ink" aria-hidden="true" /><h4 className="mt-2 type-card text-gold-ink">Optimized Resume</h4><p className="mt-2 type-helper text-ink-soft">Match a vacancy using your real skills and experience.</p><details className={s.details}><summary>How it works <ChevronDown className="size-3" aria-hidden="true" /></summary><ol className="space-y-2 type-helper text-ink-soft"><li>1. Add the job description.</li><li>2. Review job-match findings.</li><li>3. Review the optimized resume.</li></ol></details><GuideLink href="/optimize/target">Optimize My Resume</GuideLink></section>
    </div>
    <Connector />
    <section data-ui-service="templates" className={s.node} aria-label="Shared resume outputs and storage">
      <h4 className="type-card text-teal">Your resume, ready to use</h4>
      <ol className="mt-3 grid gap-2 sm:grid-cols-3">{results.map(({ label, icon: Icon }) => <li key={label} className="flex items-center gap-2 type-helper text-ink-soft"><Icon className="size-4 shrink-0 text-teal" aria-hidden="true" />{label}</li>)}</ol>
      <div className="mt-2 flex flex-wrap gap-x-5"><GuideLink href="/templates">Browse templates</GuideLink><GuideLink href="/dashboard/library">Open Resume Library</GuideLink></div>
      <p className="type-caption text-ink-muted">Use either resume for letters and interview practice.</p>
    </section>
    <Connector />
    <Stage number={3}>Prepare to apply</Stage>
    <section className={s.node} aria-label="Application and recruiter profile services">
      <CompactService href="/cover-letter" icon={Mail} title="Cover Letter" body="Introduce your experience. Review the letter before sending." />
      <CompactService href="/linkedin-optimization" icon={UserRound} title="LinkedIn Optimization" body="Prepare your headline, About and experience sections." />
      <CompactService href="/naukrigulf-optimization" icon={BriefcaseBusiness} title="NaukriGulf Optimization" body="Prepare a headline, summary and employment details." />
    </section>
    <Connector />
    <Stage number={4}>Get ready for interviews</Stage>
    <div className={s.branch}>
      <section data-ui-service="qa" className={s.node}><MessagesSquare className="size-6 text-teal" aria-hidden="true" /><h4 className="mt-2 type-card text-teal">Interview Q&A</h4><p className="mt-2 type-helper text-ink-soft">Study relevant questions and review suggested answers.</p><GuideLink href="/interview-qa">Prepare answers</GuideLink></section>
      <section data-ui-service="mock" className={s.node}><Mic className="size-6 text-gold-ink" aria-hidden="true" /><h4 className="mt-2 type-card text-gold-ink">Mock Interview</h4><p className="mt-2 type-helper text-ink-soft">Practise your answers, request feedback and work on improvements.</p><GuideLink href="/mock-interview">Start practising</GuideLink></section>
    </div>
    <Connector />
    <section className="border-t border-line pt-3"><h4 className="type-label text-teal">Return to your next step</h4><p className="mt-1 type-helper text-ink-soft">Home shows your progress. Resume Library keeps your saved preparation together. Settings gives you account and data controls.</p><div className="flex flex-wrap gap-x-5"><GuideLink href="/dashboard">Home</GuideLink><GuideLink href="/dashboard/library">Resume Library</GuideLink><GuideLink href="/settings">Settings</GuideLink></div></section>
    <p className="mt-3 type-caption text-ink-muted">Choose the services you need for each application. Review the requirements and any applicable plan limits on the service page.</p>
  </div>
}
function CompactService({ href, icon: Icon, title, body }: { href: string; icon: typeof Mail; title: string; body: string }) {
  return <div data-ui-service={href.includes("linkedin") ? "linkedin" : href.includes("naukrigulf") ? "naukrigulf" : "letter"} className={s.serviceRow}><span className={s.serviceIcon}><Icon className="size-5" aria-hidden="true" /></span><div className="min-w-0"><h4 className="type-label text-ink">{title}</h4><p className="mt-1 type-helper text-ink-soft">{body}</p><GuideLink href={href}>Open service</GuideLink></div></div>
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
