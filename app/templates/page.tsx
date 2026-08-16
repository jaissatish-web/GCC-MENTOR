'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { buttonVariants } from '@/components/ui/Button'
import { AppShell } from '@/components/layout/AppShell'
import { PageShell } from '@/components/layout/PageShell'
import { TemplatePicker } from '@/components/resume/TemplatePicker'
import { getTemplate, DEFAULT_TEMPLATE_ID, type TemplateId } from '@/lib/templates'
import { SAMPLE_RESUME_DOCUMENT } from '@/lib/sampleResume'
import type { Package } from '@/types/package'

/**
 * Resume Templates — browse the designs, then open one of your resumes in it.
 *
 * SHOWCASE DATA, NOT THE USER'S. Every card renders a fictional GCC engineering
 * CV (lib/sampleResume.ts). The gallery used to render the signed-in user's own
 * resume, which meant a brand-new user — who has not optimized anything yet —
 * saw ten empty pages and could not judge a single one. A template gallery has
 * to be browsable before you own a resume.
 *
 * NO SECOND PREVIEW PANE. The cards ARE the preview: they are rendered by the
 * real template components, not screenshots. Choosing a template and then
 * pressing Preview opens the resume screen itself, which is where saving,
 * downloading and editing already live — rather than rebuilding those three
 * things here and having two places that can disagree.
 *
 * NOTHING IS WRITTEN HERE. Preview navigates with the template as a query
 * parameter; the resume screen renders it and offers to keep it. A gallery
 * click must not silently restyle a resume the user has already delivered.
 */

function TemplatesInner() {
  const router = useRouter()
  const [packages, setPackages] = useState<Package[] | null>(null)
  const [selectedId, setSelectedId] = useState<string>('')
  const [templateId, setTemplateId] = useState<TemplateId>(DEFAULT_TEMPLATE_ID)
  const [error, setError] = useState<string | null>(null)
  const didInit = useRef(false)

  useEffect(() => {
    if (didInit.current) return
    didInit.current = true
    fetch('/api/packages', { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        const paid = ((data?.packages as Package[] | undefined) ?? []).filter((p) => p.is_paid)
        setPackages(paid)
        if (paid.length > 0) setSelectedId(paid[0].id)
      })
      .catch(() => setError('Could not load your resumes.'))
  }, [])

  const hasResumes = (packages?.length ?? 0) > 0
  const templateName = getTemplate(templateId).name

  return (
    <PageShell
      width="wide"
      title="Resume templates"
      subtitle="Ten designs, all built for GCC applications. Every preview shows the same example CV, so you can compare them properly."
    >
      {/* The action bar sticks to the top so the choice made at the bottom of a
          long gallery is still actionable without scrolling back. */}
      <div className="sticky top-0 z-20 -mt-2 flex flex-col gap-3 border-b border-line-light/60 bg-bg/95 py-3 backdrop-blur sm:flex-row sm:items-center sm:justify-between">
        <p className="text-[12.5px] text-ink-700">
          Selected: <strong className="text-ink-900">{templateName}</strong>
        </p>

        {packages === null ? (
          <span className="text-[12px] text-ink-400">Loading your resumes…</span>
        ) : hasResumes ? (
          <div className="flex flex-wrap items-center gap-2">
            <label className="sr-only" htmlFor="resume-select">
              Resume to preview
            </label>
            <select
              id="resume-select"
              value={selectedId}
              onChange={(e) => setSelectedId(e.target.value)}
              className="min-h-11 min-w-[220px] rounded-radius-md border border-line-light bg-surface-light px-3 text-[13px] text-ink-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-forest"
            >
              {packages.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name?.trim() || p.target_job_title} — {p.id.slice(0, 8)}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={() =>
                router.push(
                  `/package/${encodeURIComponent(selectedId)}?template=${encodeURIComponent(templateId)}`,
                )
              }
              disabled={!selectedId}
              className={buttonVariants({ variant: 'primary', size: 'sm' })}
            >
              Preview my resume
            </button>
          </div>
        ) : (
          <span className="text-[12px] text-ink-400">
            Create a resume to try these with your own details.
          </span>
        )}
      </div>

      {error ? (
        <p role="alert" className="text-[12.5px] text-terra">
          {error}
        </p>
      ) : null}

      <TemplatePicker
        document={SAMPLE_RESUME_DOCUMENT}
        current={templateId}
        onSelect={(id) => setTemplateId(id)}
      />

      <p className="text-center text-[11.5px] text-ink-400">
        Previews use an example CV. Your own wording, dates and details are never changed by
        switching template.
      </p>
    </PageShell>
  )
}

export default function TemplatesPage() {
  return (
    <AppShell>
      <TemplatesInner />
    </AppShell>
  )
}
