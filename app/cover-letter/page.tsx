'use client'

import { CAREER_RESUME_BADGE, isCareerProfileResume } from '@/lib/careerProfileResume'
import { Suspense, useMemo, useRef, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { EnvelopeIcon } from '@heroicons/react/24/outline'
import { PreparationJourney } from '@/components/package/PreparationJourney'
import { PageShell } from '@/components/layout/PageShell'
import { NextStep } from '@/components/journey/NextStep'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { ProcessingInline } from '@/components/ui/Processing'
import { COVER_LETTER_NOTES } from '@/lib/processingNotes'
import { cn } from '@/lib/utils'
import { CTA } from '@/lib/serviceLabels'
import { usePackagePicker } from '@/lib/usePackagePicker'
import type { PackageSummary } from '@/lib/packageSummary'
import { SAVED_PER_PACKAGE } from '@/lib/packageSummary'
import type { CoverLetter, CoverLetterTone } from '@/types/package'
import { Skeleton, SkeletonGroup } from '@/components/ui/Skeleton'
import { stageEyebrow } from '@/components/journey/stages'
import { StageGate } from '@/components/journey/StageGate'

/**
 * Cover Letter — new route (TASK-093, PAGE_SPECS §C / TASK-066 frontend).
 *
 * Generation UI. The backend writes a letter FROM a resume package (POST
 * /api/packages/[id]/cover-letter) — since 2026-09-15 from that job's SAVED CV
 * first, with the Career Profile as support (audit M04). This page picks a job,
 * shows every letter already on it, and offers a Generate button.
 *
 * LIST LIGHT, OPEN ONE (audit M08): the picker lists job summaries; only the
 * chosen job's letters are loaded (lib/usePackagePicker.ts). The picker is
 * locked while a letter is being written, so it cannot land on another job.
 *
 * NO GATING while the locks are off (founder decision 2026-08-17). The server
 * is the only authority; this page shows its errors verbatim.
 *
 * TONE SELECTION (2026-08-18, founder decision): four styles are sent as
 * `{ tone }` and genuinely change what the model writes. Each letter records
 * its tone; pre-2026-08-18 letters simply show no label — never a guessed one.
 */

function letterTarget(pkg: Pick<PackageSummary, 'tier' | 'name' | 'target_job_title' | 'target_company'>): string {
  if (isCareerProfileResume(pkg)) return `${pkg.name || pkg.target_job_title} · ${CAREER_RESUME_BADGE}`
  // The employer only when there is one.
  const bits = [pkg.target_job_title, pkg.target_company].filter(Boolean)
  return bits.join(' · ')
}

const TONE_OPTIONS: ReadonlyArray<{ value: CoverLetterTone; label: string; description: string }> = [
  { value: 'professional', label: 'Professional', description: 'Polished and formal — the standard choice' },
  { value: 'short', label: 'Short', description: 'One brief paragraph, straight to the point' },
  { value: 'technical', label: 'Technical', description: 'Leads with tools, standards and measurable results' },
  { value: 'explanatory', label: 'Explanatory', description: 'Walks through why the experience fits the role' },
]

function CoverLetterScreen() {
  // ?package=<id> — arriving from a job's own page or the dashboard's next
  // step, with that job already chosen. Read once; unknown ids fall back.
  const searchParams = useSearchParams()
  const requestedIdRef = useRef(searchParams.get('package'))
  const picker = usePackagePicker({ requestedId: requestedIdRef.current, onlyWithResume: false })
  const { list, listError, selectedId, setSelectedId, selectedSummary, detail, detailError, detailLoading } = picker
  const isRaw = isCareerProfileResume(selectedSummary ?? {})
  const [tone, setTone] = useState<CoverLetterTone>('professional')

  const [generating, setGenerating] = useState(false)
  const [genError, setGenError] = useState<string | null>(null)

  // Local edits (edit-in-place textarea per letter) — never persisted.
  const [edits, setEdits] = useState<Record<string, string>>({})
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [savingId, setSavingId] = useState<string | null>(null)
  const [savedId, setSavedId] = useState<string | null>(null)

  const letters = useMemo(
    () => (detail?.cover_letters ?? []).slice().sort((a, b) => b.generated_at.localeCompare(a.generated_at)),
    [detail],
  )
  // No credit requirement and no paid requirement while the locks are off. The
  // server is still the authority; this only stops a double-submit.
  const canGenerate = selectedId !== null && !generating

  async function generate() {
    if (!selectedId) return
    const packageId = selectedId
    setGenError(null)
    setGenerating(true)
    try {
      const res = await fetch(`/api/packages/${encodeURIComponent(packageId)}/cover-letter`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tone }),
      })
      const payload = await res.json().catch(() => ({}))
      if (!res.ok) {
        setGenError((payload?.error as string | undefined) ?? 'Could not generate your cover letter. Please try again.')
        return
      }
      const letter = payload?.letter as CoverLetter | undefined
      if (letter) {
        picker.updateDetail(packageId, (p) => ({ ...p, cover_letters: [...(p.cover_letters ?? []), letter].slice(-SAVED_PER_PACKAGE) }))
        const current = list?.find((p) => p.id === packageId)
        picker.patchSummary(packageId, { cover_letter_count: (current?.cover_letter_count ?? 0) + 1 })
        setEdits((e) => ({ ...e, [letter.id]: letter.full_text }))
      }
    } catch {
      setGenError('Could not reach the server. Check your connection and try again — nothing was used.')
    } finally {
      setGenerating(false)
    }
  }

  async function copyLetter(letter: CoverLetter) {
    // Falls back to the stored text, as Download already did.
    const text = edits[letter.id] ?? letter.full_text
    try {
      await navigator.clipboard.writeText(text)
      setCopiedId(letter.id)
      window.setTimeout(() => setCopiedId((c) => (c === letter.id ? null : c)), 2000)
    } catch {
      setGenError('Could not copy automatically. Select the text and copy manually.')
    }
  }

  const isDirty = (letter: CoverLetter) => edits[letter.id] !== undefined && edits[letter.id].trim() !== letter.full_text.trim()

  // Saved edits (2026-10-03, launch audit I3): the page used to say "changes
  // are not saved", so a letter polished on a phone was lost on leaving.
  async function saveLetter(letter: CoverLetter): Promise<boolean> {
    const packageId = selectedId
    const text = (edits[letter.id] ?? letter.full_text).trim()
    if (!packageId || !text) return false
    setSavingId(letter.id)
    setGenError(null)
    try {
      const res = await fetch(`/api/packages/${encodeURIComponent(packageId)}/cover-letter/${encodeURIComponent(letter.id)}`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ full_text: text }),
      })
      const payload = await res.json().catch(() => ({}))
      if (!res.ok) {
        setGenError((payload?.error as string | undefined) ?? 'Could not save your changes. Please try again.')
        return false
      }
      picker.updateDetail(packageId, (p) => ({
        ...p,
        cover_letters: (p.cover_letters ?? []).map((l) => (l.id === letter.id ? { ...l, full_text: text, edited_at: new Date().toISOString() } : l)),
      }))
      setEdits((e) => ({ ...e, [letter.id]: text }))
      setSavedId(letter.id)
      window.setTimeout(() => setSavedId((c) => (c === letter.id ? null : c)), 2500)
      return true
    } catch {
      setGenError('Could not reach the server. Your text is still in the box — try Save again.')
      return false
    } finally {
      setSavingId(null)
    }
  }

  // PDF or Word, the files Gulf employers and portals expect (was .txt only).
  // Unsaved edits are saved first, so the file always matches the screen.
  async function downloadLetter(letter: CoverLetter, format: 'pdf' | 'docx') {
    if (!selectedId) return
    if (isDirty(letter) && !(await saveLetter(letter))) return
    const a = document.createElement('a')
    a.href = `/api/packages/${encodeURIComponent(selectedId)}/cover-letter/${encodeURIComponent(letter.id)}?format=${format}`
    a.rel = 'noopener'
    document.body.appendChild(a)
    a.click()
    a.remove()
  }

  if (listError) {
    return (
      <main className="mx-auto flex w-full max-w-[900px] flex-col items-start gap-3 px-3 py-8 font-redesign-sans sm:px-8 lg:px-10">
        <div role="alert" className="rounded-card border border-alert/40 bg-alert-soft px-3.5 py-3 text-[13px] text-alert">
          {listError}
        </div>
        <Button type="button" variant="secondary" onClick={picker.reloadList}>
          Try again
        </Button>
      </main>
    )
  }

  if (list === null) {
    return (
      <main className="mx-auto w-full max-w-[900px] px-3 py-8 sm:px-8 lg:px-10 font-redesign-sans">
        <SkeletonGroup label="Loading your resumes">
          <Skeleton shape="title" />
          <Skeleton />
          <Skeleton className="w-3/4" />
        </SkeletonGroup>
      </main>
    )
  }

  return (
    <PageShell
      icon={EnvelopeIcon}
      eyebrow={stageEyebrow('apply')}
      title="Cover Letter"
      subtitle={isRaw ? 'A professional introduction for opportunities in your field, based only on your saved Career Profile. No job description required.' : 'A letter for one of your target jobs, in the tone you choose — consistent with the CV it goes with.'}
      uses={isRaw ? ['Career Profile Resume', 'Saved Career Profile'] : ['Optimized CV', 'Target job', 'Career Profile']}
    >

      {/* Centered generation form (720px, §C) */}
      <Card tone="light" className="p-4 sm:p-6">
        {list.length === 0 ? (
          <StageGate what="Your cover letter" />
        ) : (
          <div className="flex flex-col gap-4">
            <label className="flex flex-col gap-1.5">
              <span className="field-label">Which resume is this letter for?</span>
              <select
                value={selectedId ?? ''}
                onChange={(e) => {
                  setGenError(null)
                  setSelectedId(e.target.value)
                }}
                disabled={generating}
                className="field"
              >
                {list.map((p) => (
                  <option key={p.id} value={p.id} className="bg-white text-ink">
                    {letterTarget(p)}
                  </option>
                ))}
              </select>
            </label>
            {selectedSummary ? <PreparationJourney bare pkg={detail ?? selectedSummary} current="letter" /> : null}

            <fieldset className="flex flex-col gap-1.5">
              <legend className="field-label mb-1.5">Tone</legend>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                {TONE_OPTIONS.map((opt) => {
                  const active = tone === opt.value
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      aria-pressed={active}
                      onClick={() => setTone(opt.value)}
                      title={opt.description}
                      className={cn(
                        'flex min-h-11 min-w-0 flex-col items-start gap-0.5 rounded-ctl border px-3 py-2 text-left [overflow-wrap:anywhere] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal focus-visible:ring-offset-2',
                        // The chosen tone must look chosen from across the room.
                        active
                          ? 'border-2 border-teal bg-teal-soft'
                          : 'border-field-line bg-field hover:border-teal-bright',
                      )}
                    >
                      <span className={cn('text-[13px] font-semibold', active ? 'text-teal' : 'text-ink')}>
                        {opt.label}
                      </span>
                      <span className="text-[12px] leading-snug text-ink-muted">{opt.description}</span>
                    </button>
                  )
                })}
              </div>
            </fieldset>

            {genError ? (
              <p role="alert" className="rounded-ctl border border-alert/40 bg-alert-soft px-3.5 py-3 text-[13px] text-alert">
                {genError}
              </p>
            ) : null}

            {generating ? (
              <ProcessingInline
                steps={[
                  isRaw ? 'Reading your saved Career Profile Resume' : 'Reading the saved CV for this job',
                  'Drawing on your Career Profile',
                  `Writing in the ${tone} tone`,
                  'Checking every line against your profile',
                ]}
                stepMs={5000}
                notes={isRaw ? ['Written only from your saved Career Profile.', ...COVER_LETTER_NOTES.slice(1)] : COVER_LETTER_NOTES}
              />
            ) : null}

            {selectedSummary ? (
              // Stacked on a phone: side by side, the target line was squeezed.
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-end">
                <Button
                  type="button"
                  variant="primary"
                  onClick={generate}
                  disabled={!canGenerate}
                  busy={generating}
                  busyLabel="Writing…"
                >
                  {CTA.writeCoverLetter}
                </Button>
              </div>
            ) : null}
          </div>
        )}
      </Card>

      {detailError ? (
        <div className="mt-6 flex flex-col items-start gap-3">
          <p role="alert" className="rounded-ctl border border-alert/40 bg-alert-soft px-3.5 py-3 text-[13px] text-alert">
            {detailError}
          </p>
          <Button type="button" variant="secondary" onClick={picker.reloadDetail}>
            Try again
          </Button>
        </div>
      ) : detailLoading && !detail ? (
        <SkeletonGroup label={isRaw ? 'Loading your profile-based letters' : "Loading this job's letters"} className="mt-6">
          <Skeleton shape="title" />
          <Skeleton />
        </SkeletonGroup>
      ) : null}

      {/* Generated letters — full width once present (§C) */}
      {letters.length > 0 ? (
        <section className="mt-6 flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-[20px] text-ink">Generated letters</h2>
            <span className="text-[12px] text-ink-muted">{letters.length} total</span>
          </div>
          <p className="-mt-2 text-[12px] leading-relaxed text-ink-muted">
            Edit any letter below and press Save changes. Downloads use your saved text. The {SAVED_PER_PACKAGE} newest letters are kept for each {isRaw ? 'resume' : 'job'}.
          </p>
          {letters.map((letter) => (
            <Card key={letter.id} tone="light" className="flex flex-col gap-3 p-4 sm:p-6">
              <div className="flex flex-col gap-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="break-words text-[13px] font-bold text-ink">
                    {letter.target_job_title}
                    {letter.target_company ? ` · ${letter.target_company}` : ''}
                  </p>
                  {letter.tone ? (
                    <span className="rounded-full bg-teal-soft px-2 py-0.5 text-[12px] font-semibold uppercase tracking-wide text-teal">
                      {TONE_OPTIONS.find((o) => o.value === letter.tone)?.label ?? letter.tone}
                    </span>
                  ) : null}
                </div>
                <p className="text-[12px] text-ink-muted">
                  Generated {new Date(letter.generated_at).toLocaleString()}
                  {letter.edited_at ? ` · your edits saved ${new Date(letter.edited_at).toLocaleString()}` : ''}
                </p>
              </div>
              <textarea
                value={edits[letter.id] ?? letter.full_text}
                onChange={(e) => setEdits((prev) => ({ ...prev, [letter.id]: e.target.value }))}
                rows={Math.min(20, (edits[letter.id] ?? letter.full_text).split('\n').length)}
                aria-label="Cover letter text (editable)"
                className="field p-4"
              />
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  type="button"
                  onClick={() => void saveLetter(letter)}
                  disabled={!isDirty(letter) || savingId === letter.id}
                  busy={savingId === letter.id}
                >
                  {savedId === letter.id ? 'Saved' : 'Save changes'}
                </Button>
                <Button type="button" variant="secondary" onClick={() => void downloadLetter(letter, 'pdf')} disabled={savingId === letter.id}>
                  Download PDF
                </Button>
                <Button type="button" variant="secondary" onClick={() => void downloadLetter(letter, 'docx')} disabled={savingId === letter.id}>
                  Download Word
                </Button>
                <Button type="button" variant="ghost" onClick={() => void copyLetter(letter)}>
                  {copiedId === letter.id ? 'Copied' : 'Copy'}
                </Button>
                {isDirty(letter) ? <span className="text-[12px] font-semibold text-gold-ink">Unsaved changes</span> : null}
              </div>
            </Card>
          ))}
        </section>
      ) : null}

      {selectedId && letters.length > 0 ? (
        <NextStep
          className="mt-6"
          title="Prepare for the interview"
          body={isRaw ? 'Prepare for interviews in your field with answers drawn from your saved Career Profile.' : 'Get likely questions for this job with answers drawn from the same CV, so what you say matches what you sent.'}
          href={`/interview-qa?package=${encodeURIComponent(selectedId)}`}
          cta={CTA.prepareInterviewQa}
          secondary={{ href: `/package/${encodeURIComponent(selectedId)}`, label: isRaw ? 'See your resume' : CTA.viewOptimizedCv }}
        />
      ) : null}

      {/* Grounding notice */}
      <p className="mt-6 text-center text-[12px] text-ink-muted">
        {isRaw ? 'Written only from your saved Career Profile. No job description or AI resume optimization is used.' : "Written from this job's saved CV (once built) and your Career Profile — nothing that is in neither."}
      </p>
    </PageShell>
  )
}

export default function CoverLetterPage() {
  return (
    <>
      <Suspense>
        <CoverLetterScreen />
      </Suspense>
    </>
  )
}
