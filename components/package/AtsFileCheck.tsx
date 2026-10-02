'use client'

import { useState } from 'react'
import { ScanText } from 'lucide-react'
import { CheckCircleIcon, ExclamationTriangleIcon, XCircleIcon } from '@heroicons/react/24/solid'
import { buttonVariants } from '@/components/ui/Button'
import { ProcessingInline } from '@/components/ui/Processing'
import { FILE_CHECK_NOTES } from '@/lib/processingNotes'
import { cn } from '@/lib/utils'
import type { FileCheckReport } from '@/lib/atsFileCheck'

/**
 * ATS FILE CHECK (founder, 2026-10-02): "your file reads correctly ✓".
 * Builds the exact PDF the Download button gives, reads it back the way an
 * ATS does (POST /api/packages/[id]/file-check), and lists what passed and
 * what to fix. On demand — a few seconds of PDF rendering, no AI.
 */
export function AtsFileCheck({ packageId }: { packageId: string }) {
  const [state, setState] = useState<'idle' | 'running' | 'done' | 'error'>('idle')
  const [report, setReport] = useState<FileCheckReport | null>(null)
  const [design, setDesign] = useState('')
  const [error, setError] = useState<string | null>(null)

  const run = async () => {
    setState('running')
    setError(null)
    try {
      const res = await fetch(`/api/packages/${encodeURIComponent(packageId)}/file-check`, { method: 'POST' })
      const body = await res.json().catch(() => ({}))
      if (!res.ok || !body?.report) {
        setError((body?.error as string) ?? 'The check did not finish. Please try again.')
        setState('error')
        return
      }
      setReport(body.report as FileCheckReport)
      setDesign((body.template?.name as string) ?? '')
      setState('done')
    } catch {
      setError('Network error. Please check your connection and try again.')
      setState('error')
    }
  }

  const banner =
    report?.status === 'pass'
      ? { box: 'border-ok/40 bg-ok-soft', text: 'text-ok', title: 'Your file reads correctly ✓' }
      : report?.status === 'warn'
        ? { box: 'border-gold/40 bg-gold-soft/60', text: 'text-gold-ink', title: 'Your file reads correctly, with small notes' }
        : { box: 'border-alert/30 bg-alert-soft', text: 'text-alert', title: 'An ATS will miss part of this file' }

  return (
    <article className="flex flex-col gap-3 rounded-card border border-teal/25 bg-white p-4 shadow-m-1">
      <p className="flex items-center gap-1.5 text-[12px] font-bold uppercase tracking-[0.12em] text-teal">
        <ScanText className="size-4 shrink-0" strokeWidth={2.2} aria-hidden="true" />
        ATS file check
      </p>
      {state === 'idle' || state === 'error' ? (
        <>
          <p className="text-[13.5px] leading-relaxed text-ink-soft">
            Your CV looks right on screen — but an ATS only sees the text it can pull out of your PDF. We read the file you
            download the way an ATS does and check your name, contact details, headings, jobs, dates and keywords.
          </p>
          {error ? <p className="text-[12.5px] text-alert">{error}</p> : null}
          <button type="button" onClick={() => void run()} className={cn(buttonVariants({ variant: 'primary', size: 'sm' }), 'self-start')}>
            Check my PDF
          </button>
        </>
      ) : state === 'running' ? (
        <ProcessingInline steps={['Building your PDF in your design', 'Reading it the way an ATS does', 'Checking headings, jobs and keywords']} stepMs={2500} notes={FILE_CHECK_NOTES} />
      ) : report ? (
        <>
          <div className={cn('flex flex-col gap-0.5 rounded-ctl border px-3.5 py-3', banner.box)}>
            <p className={cn('text-[15px] font-bold', banner.text)}>{banner.title}</p>
            <p className="text-[12.5px] text-ink-soft">
              {report.passed} of {report.total} checks passed{design ? ` · design: ${design}` : ''} · {report.pages} page{report.pages === 1 ? '' : 's'}
            </p>
          </div>
          <ul className="flex flex-col gap-2">
            {report.items.map((i) => (
              <li key={i.id} className="flex gap-2.5">
                {i.status === 'pass' ? (
                  <CheckCircleIcon className="mt-0.5 size-5 shrink-0 text-ok" aria-label="Passed" />
                ) : i.status === 'warn' ? (
                  <ExclamationTriangleIcon className="mt-0.5 size-5 shrink-0 text-gold" aria-label="Note" />
                ) : (
                  <XCircleIcon className="mt-0.5 size-5 shrink-0 text-alert" aria-label="Problem" />
                )}
                <span className="flex min-w-0 flex-col">
                  <span className="text-[13.5px] font-semibold text-ink">{i.label}</span>
                  <span className="text-[12.5px] leading-snug text-ink-soft">{i.detail}</span>
                </span>
              </li>
            ))}
          </ul>
          <button type="button" onClick={() => void run()} className="inline-flex min-h-11 items-center self-start text-[13px] font-semibold text-teal underline-offset-2 hover:underline">
            Changed the design or the text? Check again
          </button>
        </>
      ) : null}
    </article>
  )
}
