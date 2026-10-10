'use client'

import * as Dialog from '@radix-ui/react-dialog'
import { ArrowDown, FileText, BriefcaseBusiness, UserRound, X, Check, LayoutTemplate, Download } from 'lucide-react'

const result = [
  { label: 'Preview', icon: FileText },
  { label: 'Choose template', icon: LayoutTemplate },
  { label: 'Save / Download', icon: Download },
]

/** A visual guide only: no data requests, eligibility rules or document actions. */
export function HowItWorks({ className = '' }: { className?: string }) {
  return (
    <Dialog.Root>
      <Dialog.Trigger className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-ctl px-4 type-button text-teal hover:bg-teal-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal ${className}`}>
        How it works <span aria-hidden="true">↗</span>
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-[70] bg-ink/40 backdrop-blur-sm" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-[71] flex max-h-[90dvh] w-[calc(100%_-_24px)] max-w-[900px] -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden rounded-card border border-line bg-canvas font-redesign-sans text-ink shadow-xl focus:outline-none">
          <div className="flex items-start justify-between gap-3 border-b border-line bg-white p-5 sm:p-6">
            <div>
              <Dialog.Title className="type-section">One profile. Two ways to create your CV.</Dialog.Title>
              <Dialog.Description className="mt-1 type-helper text-ink-soft">Start with your experience. Choose what you need next.</Dialog.Description>
            </div>
            <Dialog.Close aria-label="Close guide" className="flex size-11 shrink-0 items-center justify-center rounded-ctl bg-canvas text-ink-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal"><X className="size-5" /></Dialog.Close>
          </div>
          <div className="overflow-y-auto overscroll-contain p-4 sm:p-6">
            <div className="mx-auto max-w-[480px] rounded-card border border-line bg-white p-4 text-center">
              <div className="flex flex-wrap justify-center gap-2">{['Upload CV', 'Paste text', 'Enter details'].map(label => <span key={label} className="rounded-ctl bg-canvas px-3 py-2 type-helper font-medium">{label}</span>)}</div>
              <ArrowDown aria-hidden="true" className="mx-auto my-3 size-5 text-teal" />
              <div className="inline-flex items-center gap-2 type-card text-teal"><UserRound aria-hidden="true" className="size-5" />Career Profile</div>
              <p className="mt-1 type-helper text-ink-soft">Review and save your details.</p>
            </div>
            <ArrowDown aria-hidden="true" className="mx-auto my-4 size-5 text-teal" />
            <div className="grid gap-4 md:grid-cols-2">
              <section aria-label="Create my CV path" className="rounded-card border border-teal/25 bg-white p-5">
                <FileText aria-hidden="true" className="mb-3 size-7 text-teal" />
                <h3 className="type-card">Create my CV</h3>
                <p className="mt-2 type-helper text-ink-soft">Your saved profile, professionally formatted. No AI rewriting.</p>
                <OutputSteps />
              </section>
              <section aria-label="Tailor for a job path" className="rounded-card border border-gold/40 bg-white p-5">
                <BriefcaseBusiness aria-hidden="true" className="mb-3 size-7 text-teal" />
                <h3 className="type-card">Tailor for a job</h3>
                <ol className="mt-3 flex flex-col gap-2 type-helper text-ink-soft"><li>1. Add a job description</li><li>2. Optimise and review your CV</li></ol>
                <OutputSteps />
                <div className="mt-4 border-t border-line pt-4"><p className="type-helper font-semibold text-teal">When you need them</p><p className="mt-1 type-helper text-ink-soft">Cover letter · Interview Q&A · Mock interview</p></div>
              </section>
            </div>
            <p className="mt-5 flex items-center justify-center gap-2 type-helper text-ink-soft"><Check aria-hidden="true" className="size-4 shrink-0 text-teal" />Find your saved work in My CVs.</p>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}

function OutputSteps() {
  return <ol className="mt-4 flex flex-col gap-2 border-t border-line pt-4">{result.map(({ label, icon: Icon }) => <li key={label} className="flex items-center gap-2 type-helper font-medium"><Icon aria-hidden="true" className="size-4 text-teal" />{label}</li>)}</ol>
}
