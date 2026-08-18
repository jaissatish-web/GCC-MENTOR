'use client'

import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { AppShell } from '@/components/layout/AppShell'
import { PageShell } from '@/components/layout/PageShell'
import { Card } from '@/components/ui/Card'
import { Button, buttonVariants } from '@/components/ui/Button'
import { cn } from '@/lib/utils'
import type { CoverLetter, CoverLetterTone, Package } from '@/types/package'

/**
 * Cover Letter — new route (TASK-093, PAGE_SPECS §C / TASK-066 frontend).
 *
 * Generation UI. The backend writes a letter FROM a resume package (POST
 * /api/packages/[id]/cover-letter, empty body — it reads the target role and job
 * description off the package itself), so this page picks a package, shows every
 * letter already on it, and offers a Generate button.
 *
 * NO GATING while the locks are off (founder decision 2026-08-17). This screen
 * used to require the package to be paid and a `cover_letter` credit to be
 * available, and to show the credit balance. Both requirements are gone, and the
 * balance is no longer displayed — a counter implies something is spending it.
 *
 * The redeem-a-code entry point below still works and still adds credits; it is
 * left in place because topping up is not blocked by anything, and the codes
 * become meaningful again with the locks. Server-side is still the only
 * authority: this page surfaces the server's verbatim error strings and never
 * decides anything itself.
 *
 * TONE SELECTION (2026-08-18, founder decision — resolves the gap once
 * flagged here): §C's "form field set (persona/tone selection)" is now real.
 * Four styles — Professional / Short / Technical / Explanatory
 * (lib/ai/buildCoverLetterPrompt.ts's TONE_INSTRUCTIONS) — are sent as
 * `{ tone }` in the POST body and genuinely change what the model writes;
 * this is not a control that sends nothing. Each generated letter records
 * which tone produced it and shows it as a small label, so a letter list
 * with several styles stays legible. Pre-2026-08-18 letters have no `tone`
 * on their stored record and simply show no label — never a guessed one.
 */

function letterTarget(pkg: Package): string {
  const bits = [pkg.target_job_title, pkg.target_company ?? 'No company'].filter(Boolean)
  return bits.join(' · ')
}

const TONE_OPTIONS: ReadonlyArray<{ value: CoverLetterTone; label: string; description: string }> = [
  { value: 'professional', label: 'Professional', description: 'Polished and formal — the standard choice' },
  { value: 'short', label: 'Short', description: 'One brief paragraph, straight to the point' },
  { value: 'technical', label: 'Technical', description: 'Leads with tools, standards and measurable results' },
  { value: 'explanatory', label: 'Explanatory', description: 'Walks through why the experience fits the role' },
]

function CoverLetterScreen() {
  const [packages, setPackages] = useState<Package[] | null>(null)
  const [available, setAvailable] = useState<number | null>(null)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [tone, setTone] = useState<CoverLetterTone>('professional')
  const [loadError, setLoadError] = useState<string | null>(null)

  const [generating, setGenerating] = useState(false)
  const [genError, setGenError] = useState<string | null>(null)

  const [redeemCode, setRedeemCode] = useState('')
  const [redeeming, setRedeeming] = useState(false)
  const [redeemMsg, setRedeemMsg] = useState<{ ok: boolean; text: string } | null>(null)

  // Local edits (edit-in-place textarea per letter) — never persisted.
  const [edits, setEdits] = useState<Record<string, string>>({})
  const didInit = useRef(false)

  const refreshCredits = useCallback(async () => {
    const res = await fetch('/api/service-credits?service=cover_letter', { cache: 'no-store' })
    if (res.ok) {
      const data = (await res.json().catch(() => ({}))) as { available?: number }
      if (typeof data.available === 'number') setAvailable(data.available)
    }
  }, [])

  useEffect(() => {
    if (didInit.current) return
    didInit.current = true
    Promise.all([
      fetch('/api/packages', { cache: 'no-store' }).then((r) => (r.ok ? r.json() : { packages: [] })),
      refreshCredits(),
    ])
      .then(([data]) => {
        const list = (data?.packages as Package[] | undefined) ?? []
        setPackages(list)
        setSelectedId(list[0]?.id ?? null)
      })
      .catch(() => setLoadError('Could not load your packages. Please try again.'))
  }, [refreshCredits])

  // EVERY resume is eligible while the locks are off (founder decision
  // 2026-08-17). This used to filter to paid packages only; leaving that filter
  // in place would now hide every resume the user has, because nothing is marked
  // paid any more — the screen would look broken rather than open.
  const eligiblePackages = useMemo(() => packages ?? [], [packages])
  const selected = useMemo(() => (packages ?? []).find((p) => p.id === selectedId) ?? null, [packages, selectedId])
  const letters = useMemo(
    () => (selected?.cover_letters ?? []).slice().sort((a, b) => b.generated_at.localeCompare(a.generated_at)),
    [selected],
  )
  // No credit requirement and no paid requirement while the locks are off. The
  // server is still the authority; this only stops a double-submit.
  const canGenerate = selected !== null && !generating

  async function generate() {
    if (!selected) return
    setGenError(null)
    setGenerating(true)
    try {
      const res = await fetch(`/api/packages/${encodeURIComponent(selected.id)}/cover-letter`, {
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
        // Add to the selected package's list + drop the credit count by one
        // (authoritative refresh is cheap; optimistic is fine here).
        setPackages((prev) =>
          prev
            ? prev.map((p) => (p.id === selected.id ? { ...p, cover_letters: [...(p.cover_letters ?? []), letter] } : p))
            : prev,
        )
        setAvailable((a) => (a === null ? a : a - 1))
        setEdits((e) => ({ ...e, [letter.id]: letter.full_text }))
      }
    } catch {
      setGenError('Could not generate your cover letter. Please try again.')
    } finally {
      setGenerating(false)
    }
  }

  async function redeem() {
    const code = redeemCode.trim()
    if (!code) {
      setRedeemMsg({ ok: false, text: 'Enter a promo code.' })
      return
    }
    setRedeeming(true)
    setRedeemMsg(null)
    try {
      const res = await fetch('/api/redeem-package-promo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code }),
      })
      const payload = await res.json().catch(() => ({}))
      if (res.ok) {
        setRedeemMsg({ ok: true, text: 'Code redeemed — your credits were updated.' })
        setRedeemCode('')
        await refreshCredits()
      } else {
        setRedeemMsg({ ok: false, text: (payload?.error as string | undefined) ?? 'That code could not be redeemed.' })
      }
    } catch {
      setRedeemMsg({ ok: false, text: 'Network error. Could not redeem that code.' })
    } finally {
      setRedeeming(false)
    }
  }

  async function copyLetter(id: string) {
    const text = edits[id] ?? ''
    try {
      await navigator.clipboard.writeText(text)
    } catch {
      // clipboard unavailable — fall back to a selection hint
      setGenError('Could not copy automatically. Select the text and copy manually.')
    }
  }

  function downloadLetter(letter: CoverLetter) {
    const text = edits[letter.id] ?? letter.full_text
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${(letter.target_job_title ?? 'cover-letter').replace(/[^a-z0-9]+/gi, '-').toLowerCase()}-cover-letter.txt`
    document.body.appendChild(a)
    a.click()
    a.remove()
    URL.revokeObjectURL(url)
  }

  if (loadError) {
    return (
      <main className="mx-auto w-full max-w-[900px] px-5 py-8 sm:px-8 lg:px-10 font-redesign-sans">
        <div className="rounded-radius-lg border border-terra/40 bg-terra-tint px-3.5 py-3 text-[12.5px] text-terra">
          {loadError}
        </div>
      </main>
    )
  }

  // Credits no longer gate anything, so the page must not wait on their count
  // before it can render.
  if (packages === null) {
    return (
      <main className="mx-auto w-full max-w-[900px] px-5 py-8 sm:px-8 lg:px-10 font-redesign-sans">
        <p className="font-mono text-sm text-ink-400">Loading…</p>
      </main>
    )
  }

  return (
    <PageShell
      title="Cover Letter"
      subtitle="Generate a tailored cover letter from any resume in your Library."
    >
      {/* The credit counter is deliberately not shown while the locks are off: a
          credit balance implies it is being spent, and nothing is spending it. */}

      {/* Centered generation form (720px, §C) */}
      <Card tone="light" className="mt-5 p-6">
        {eligiblePackages.length === 0 ? (
          <div className="flex flex-col items-center gap-3 p-4 text-center">
            <p className="text-[13px] font-semibold text-ink-900/85">No resumes yet</p>
            <p className="max-w-sm text-[12.5px] text-ink-400">
              A cover letter is written from one of your resumes — it takes the target role and job
              description from it. Create a resume first.
            </p>
            <a href="/optimize/target" className={cn(buttonVariants({ variant: 'primary' }), 'text-[13.5px]')}>
              Optimize a resume
            </a>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            <label className="flex flex-col gap-1.5 text-[13px] font-semibold text-ink-900">
              Resume package
              <select
                value={selectedId ?? ''}
                onChange={(e) => setSelectedId(e.target.value)}
                className="min-h-11 w-full cursor-pointer rounded-radius-md border border-line-light/70 bg-surface-2-light/50 px-3 text-[14px] text-ink-900 outline-none focus:border-redesign-gold focus:ring-2 focus:ring-redesign-gold/25"
              >
                {eligiblePackages.map((p) => (
                  <option key={p.id} value={p.id} className="bg-surface-light text-ink-900">
                    {letterTarget(p)}
                  </option>
                ))}
              </select>
            </label>

            <fieldset className="flex flex-col gap-1.5">
              <legend className="text-[13px] font-semibold text-ink-900">Tone</legend>
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
                        'flex min-h-11 flex-col items-start gap-0.5 rounded-radius-md border px-3 py-2 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-redesign-gold focus-visible:ring-offset-2',
                        active
                          ? 'border-redesign-gold bg-redesign-gold/[0.08]'
                          : 'border-line-light/70 bg-surface-2-light/40 hover:border-line-light-strong',
                      )}
                    >
                      <span className={cn('text-[12.5px] font-semibold', active ? 'text-gold-text' : 'text-ink-900')}>
                        {opt.label}
                      </span>
                      <span className="text-[10.5px] leading-snug text-ink-400">{opt.description}</span>
                    </button>
                  )
                })}
              </div>
            </fieldset>

            {genError ? (
              <p role="alert" className="rounded-radius-md border border-terra/40 bg-terra-tint px-3.5 py-3 text-[12.5px] text-terra">
                {genError}
              </p>
            ) : null}

            {selected ? (
              <div className="flex items-center justify-between gap-3">
                <p className="text-[12px] text-ink-400">Target: {letterTarget(selected)}</p>
                <Button type="button" variant="primary" onClick={generate} disabled={!canGenerate}>
                  {generating ? 'Generating…' : 'Generate cover letter'}
                </Button>
              </div>
            ) : null}
          </div>
        )}
      </Card>

      {/* Redeem entry point (reachable from here per §C) */}
      <Card tone="light" className="mt-4 p-6">
        <h2 className="text-[14px] font-bold text-ink-900">Redeem a code</h2>
        <p className="mt-1 text-[12px] text-ink-400">A package-promo code adds credits to your account.</p>
        <form
          onSubmit={(e) => {
            e.preventDefault()
            void redeem()
          }}
          className="mt-3 flex flex-col gap-3 sm:flex-row"
        >
          <input
            value={redeemCode}
            onChange={(e) => setRedeemCode(e.target.value)}
            placeholder="Paste your code"
            autoComplete="off"
            className="min-h-11 flex-1 rounded-radius-md border border-line-light/70 bg-surface-2-light/50 px-3 text-[14px] text-ink-900 outline-none placeholder:text-ink-400 focus:border-redesign-gold focus:ring-2 focus:ring-redesign-gold/25"
          />
          <Button type="submit" variant="primary" disabled={redeeming || redeemCode.trim().length === 0}>
            {redeeming ? 'Redeeming…' : 'Redeem'}
          </Button>
        </form>
        {redeemMsg ? (
          <p
            className={cn(
              'mt-3 rounded-radius-md px-3.5 py-2 text-[12.5px]',
              redeemMsg.ok
                ? 'border border-forest/40 bg-forest-tint text-forest'
                : 'border border-terra/40 bg-terra-tint text-terra',
            )}
          >
            {redeemMsg.text}
          </p>
        ) : null}
      </Card>

      {/* Generated letters — full width once present (§C) */}
      {letters.length > 0 ? (
        <section className="mt-6 flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <h2 className="font-serif text-[20px] text-ink-900">Generated letters</h2>
            <span className="text-[12px] text-ink-400">{letters.length} total</span>
          </div>
          {letters.map((letter) => (
            <Card key={letter.id} tone="light" className="flex flex-col gap-3 p-6">
              <div className="flex flex-col gap-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-[13px] font-bold text-ink-900">
                    {letter.target_job_title}
                    {letter.target_company ? ` · ${letter.target_company}` : ''}
                  </p>
                  {/* No badge for a pre-tone letter (letter.tone absent) —
                      showing one would be a guess, not a fact. */}
                  {letter.tone ? (
                    <span className="rounded-full bg-redesign-gold-tint px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-gold-text">
                      {TONE_OPTIONS.find((o) => o.value === letter.tone)?.label ?? letter.tone}
                    </span>
                  ) : null}
                </div>
                <p className="text-[11px] text-ink-400">
                  Generated {new Date(letter.generated_at).toLocaleString()}
                </p>
              </div>
              <textarea
                value={edits[letter.id] ?? letter.full_text}
                onChange={(e) => setEdits((prev) => ({ ...prev, [letter.id]: e.target.value }))}
                rows={Math.min(20, (edits[letter.id] ?? letter.full_text).split('\n').length)}
                aria-label="Cover letter text (editable)"
                className="w-full resize-y rounded-radius-md border border-line-light/70 bg-surface-2-light/50 p-4 font-sans text-[13px] leading-relaxed text-ink-900 outline-none focus:border-redesign-gold focus:ring-2 focus:ring-redesign-gold/25"
              />
              <div className="flex flex-wrap gap-2">
                <Button type="button" variant="secondary" onClick={() => void copyLetter(letter.id)}>
                  Copy
                </Button>
                <Button type="button" variant="secondary" onClick={() => downloadLetter(letter)}>
                  Download (.txt)
                </Button>
              </div>
            </Card>
          ))}
        </section>
      ) : null}

      {/* Grounding notice */}
      <p className="mt-6 text-center text-[11.5px] text-ink-400">
        Based strictly on your saved Career Profile and the resume&apos;s target — nothing invented.
      </p>
    </PageShell>
  )
}

export default function CoverLetterPage() {
  return (
    <AppShell>
      <Suspense>
        <CoverLetterScreen />
      </Suspense>
    </AppShell>
  )
}