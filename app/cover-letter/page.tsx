'use client'

import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { AppShell } from '@/components/layout/AppShell'
import { Card } from '@/components/ui/Card'
import { Button, buttonVariants } from '@/components/ui/Button'
import { cn } from '@/lib/utils'
import type { CoverLetter, Package } from '@/types/package'

/**
 * Cover Letter — new route (TASK-093, PAGE_SPECS §C / TASK-066 frontend).
 *
 * Generation UI over TASK-065's fully-built backend. The backend generates a
 * letter FROM a paid package (POST /api/packages/[id]/cover-letter, empty
 * body — it reads the target + job description from the package itself), so
 * this standalone page lets the user pick a paid package, shows every letter
 * already on it, and offers a "Generate cover letter" button gated on an
 * available `cover_letter` service credit (GET /api/service-credits).
 *
 * Gating is 100% server-side (package.is_paid + credit), and a credit is only
 * consumed AFTER a validated success — this page never guesses or bypasses
 * that; it just surfaces the server's authoritative count and verbatim error
 * strings. A "Redeem a code" entry point (POST /api/redeem-package-promo,
 * §C "reachable from here") lets a user top up credits without leaving.
 *
 * NOTE (flagged for CTO): §C lists "form field set (persona/tone selection)",
 * but the backend's POST body is empty — `buildCoverLetterPrompt` derives
 * tone internally from the profile + target + JD, and the route accepts no
 * persona/tone input. Building a tone picker that sent nothing would be a
 * fake control, so it is deliberately omitted; the only form field here is
 * the package selector, which the backend actually requires.
 */

function letterTarget(pkg: Package): string {
  const bits = [pkg.target_job_title, pkg.target_company ?? 'No company'].filter(Boolean)
  return bits.join(' · ')
}

function CoverLetterScreen() {
  const [packages, setPackages] = useState<Package[] | null>(null)
  const [available, setAvailable] = useState<number | null>(null)
  const [selectedId, setSelectedId] = useState<string | null>(null)
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
        const firstPaid = list.find((p) => p.is_paid)
        if (firstPaid) setSelectedId(firstPaid.id)
        else setSelectedId(list[0]?.id ?? null)
      })
      .catch(() => setLoadError('Could not load your packages. Please try again.'))
  }, [refreshCredits])

  const paidPackages = useMemo(() => (packages ?? []).filter((p) => p.is_paid), [packages])
  const selected = useMemo(() => (packages ?? []).find((p) => p.id === selectedId) ?? null, [packages, selectedId])
  const letters = useMemo(
    () => (selected?.cover_letters ?? []).slice().sort((a, b) => b.generated_at.localeCompare(a.generated_at)),
    [selected],
  )
  const canGenerate = selected?.is_paid === true && (available ?? 0) > 0 && !generating

  async function generate() {
    if (!selected) return
    setGenError(null)
    setGenerating(true)
    try {
      const res = await fetch(`/api/packages/${encodeURIComponent(selected.id)}/cover-letter`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: '{}',
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
        <div className="rounded-radius-lg border border-terra-dark/40 bg-terra-tint-dark px-3.5 py-3 text-[12.5px] text-terra-dark">
          {loadError}
        </div>
      </main>
    )
  }

  if (packages === null || available === null) {
    return (
      <main className="mx-auto w-full max-w-[900px] px-5 py-8 sm:px-8 lg:px-10 font-redesign-sans">
        <p className="font-mono text-sm text-ink-400-dark">Loading…</p>
      </main>
    )
  }

  return (
    <main className="mx-auto w-full max-w-[900px] px-5 py-8 sm:px-8 lg:px-10 font-redesign-sans">
      <div className="flex flex-col gap-1">
        <h1 className="font-serif text-[28px] leading-tight text-ink-900-dark sm:text-[32px]">Cover Letter</h1>
        <p className="text-[13px] text-ink-400-dark">
          Generate a tailored cover letter from any paid resume in your Library.
        </p>
      </div>

      {/* Credits status */}
      <div className="mt-4 rounded-radius-lg border border-line-dark bg-surface-2-dark/40 px-4 py-3 text-[12px] text-ink-400-dark">
        Cover letter credits available:{' '}
        <span className="font-mono font-bold text-gold-text-dark">{available ?? 0}</span>
      </div>

      {/* Centered generation form (720px, §C) */}
      <Card tone="dark" className="mt-5 p-6">
        {paidPackages.length === 0 ? (
          <div className="flex flex-col items-center gap-3 p-4 text-center">
            <p className="text-[13px] font-semibold text-ink-900-dark/85">No unlocked resumes yet</p>
            <p className="max-w-sm text-[12.5px] text-ink-400-dark">
              A cover letter is generated from a paid resume package. Optimize a resume first to unlock one.
            </p>
            <a href="/optimize/target" className={cn(buttonVariants({ variant: 'purchase' }), 'text-[13.5px]')}>
              Optimize a resume
            </a>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            <label className="flex flex-col gap-1.5 text-[13px] font-semibold text-ink-900-dark">
              Resume package
              <select
                value={selectedId ?? ''}
                onChange={(e) => setSelectedId(e.target.value)}
                className="min-h-11 w-full cursor-pointer rounded-radius-md border border-line-dark/70 bg-surface-2-dark/50 px-3 text-[14px] text-ink-900-dark outline-none focus:border-redesign-gold focus:ring-2 focus:ring-redesign-gold/25"
              >
                {paidPackages.map((p) => (
                  <option key={p.id} value={p.id} className="bg-surface-dark text-ink-900-dark">
                    {letterTarget(p)} · unlocked
                  </option>
                ))}
                {selected && !selected.is_paid ? (
                  <option value={selected.id} className="bg-surface-dark text-ink-900-dark">
                    {letterTarget(selected)} · locked
                  </option>
                ) : null}
              </select>
            </label>

            {selected && !selected.is_paid ? (
              <p className="text-[12px] text-terra-dark">Unlock this resume before generating a cover letter for it.</p>
            ) : null}

            {genError ? (
              <p role="alert" className="rounded-radius-md border border-terra-dark/40 bg-terra-tint-dark px-3.5 py-3 text-[12.5px] text-terra-dark">
                {genError}
              </p>
            ) : null}

            {selected?.is_paid ? (
              (available ?? 0) > 0 ? (
                <div className="flex items-center justify-between gap-3">
                  <p className="text-[12px] text-ink-400-dark">Target: {letterTarget(selected)}</p>
                  <Button type="button" variant="purchase" onClick={generate} disabled={!canGenerate}>
                    {generating ? 'Generating…' : 'Generate cover letter'}
                  </Button>
                </div>
              ) : (
                <p className="text-[12.5px] text-ink-400-dark">
                  No cover letter credits left. Redeem a code below to generate more.
                </p>
              )
            ) : null}
          </div>
        )}
      </Card>

      {/* Redeem entry point (reachable from here per §C) */}
      <Card tone="dark" className="mt-4 p-6">
        <h2 className="text-[14px] font-bold text-ink-900-dark">Redeem a code</h2>
        <p className="mt-1 text-[12px] text-ink-400-dark">A package-promo code adds credits to your account.</p>
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
            className="min-h-11 flex-1 rounded-radius-md border border-line-dark/70 bg-surface-2-dark/50 px-3 text-[14px] text-ink-900-dark outline-none placeholder:text-ink-400-dark focus:border-redesign-gold focus:ring-2 focus:ring-redesign-gold/25"
          />
          <Button type="submit" variant="purchase" disabled={redeeming || redeemCode.trim().length === 0}>
            {redeeming ? 'Redeeming…' : 'Redeem'}
          </Button>
        </form>
        {redeemMsg ? (
          <p
            className={cn(
              'mt-3 rounded-radius-md px-3.5 py-2 text-[12.5px]',
              redeemMsg.ok
                ? 'border border-forest-dark/40 bg-forest-tint-dark text-forest-dark'
                : 'border border-terra-dark/40 bg-terra-tint-dark text-terra-dark',
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
            <h2 className="font-serif text-[20px] text-ink-900-dark">Generated letters</h2>
            <span className="text-[12px] text-ink-400-dark">{letters.length} total</span>
          </div>
          {letters.map((letter) => (
            <Card key={letter.id} tone="dark" className="flex flex-col gap-3 p-6">
              <div className="flex flex-col gap-1">
                <p className="text-[13px] font-bold text-ink-900-dark">
                  {letter.target_job_title}
                  {letter.target_company ? ` · ${letter.target_company}` : ''}
                </p>
                <p className="text-[11px] text-ink-400-dark">
                  Generated {new Date(letter.generated_at).toLocaleString()}
                </p>
              </div>
              <textarea
                value={edits[letter.id] ?? letter.full_text}
                onChange={(e) => setEdits((prev) => ({ ...prev, [letter.id]: e.target.value }))}
                rows={Math.min(20, (edits[letter.id] ?? letter.full_text).split('\n').length)}
                aria-label="Cover letter text (editable)"
                className="w-full resize-y rounded-radius-md border border-line-dark/70 bg-surface-2-dark/50 p-4 font-sans text-[13px] leading-relaxed text-ink-900-dark outline-none focus:border-redesign-gold focus:ring-2 focus:ring-redesign-gold/25"
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
      <p className="mt-6 text-center text-[11.5px] text-ink-400-dark">
        Based strictly on your saved Career Profile and the resume&apos;s target — nothing invented.
      </p>
    </main>
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