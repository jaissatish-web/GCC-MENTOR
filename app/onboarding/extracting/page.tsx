'use client'

import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { Suspense, useCallback, useEffect, useRef, useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { ProcessingOrbit, ProcessingSteps } from '@/components/ui/Processing'
import { cn } from '@/lib/utils'
import { CAREER_PROFILE_DRAFT_KEY, CLAIMED_RESUME_TEXT_KEY } from '@/lib/onboardingDraft'
import { EXTRACTION_NOTES } from '@/lib/processingNotes'

/**
 * Extraction progress screen — screen 03 (TASK-023), route /onboarding/extracting.
 *
 * Conversion of the "03 · Extracting (transient)" screen in
 * design-reference/MVP Screens.dc.html — sweep-animated "CV" badge and an
 * itemised four-row checklist. Not a spinner. The mockup's "usually takes
 * ~20s" and its "nothing is saved until you confirm" footer are gone
 * (2026-09-11): the estimate was a local number production runs well past,
 * and a first-time profile IS saved straight after extraction (2026-08-18).
 *
 * TASK-082 light restyle (2026-08-12, PAGE_SPECS.md §B): the dark navy
 * full-screen mockup frame becomes a single light centered card on the
 * paper `--bg` (the extract/collect surface is a 640px card; the
 * extracting progress is a narrow centered card). Logic is untouched —
 * collect → extracting → error/success, the client timer, the /api/parse
 * calls, the session-storage handoff, and the error path are unchanged.
 *
 * TRANSIENT SCREEN — not streaming: POST /api/parse/upload and /api/parse/text
 * each return the full CareerProfileDraft once. The four checklist rows advance
 * on a client-side timer to approx. the ~20s estimate; there is no server-sent
 * per-field progress. If the response arrives first, the checklist is skipped
 * straight to done.
 *
 * On success the draft is stored in SESSIONSTORAGE under the single documented
 * key CAREER_PROFILE_DRAFT_KEY, then routed to /profile. TASK-024 reads/clears.
 *
 * On API error the server's own message is shown (e.g. 429), with a way back to
 * /onboarding — never a stranded screen.
 */

/**
 * 'claimed' is a paste in everything but origin: the text comes from the
 * anonymous scan the user already ran (handed over by /onboarding via
 * CLAIMED_RESUME_TEXT_KEY) rather than from the textarea, and extraction starts
 * on its own because the person already chose this by signing up. It posts to
 * the same endpoint with the same payload as 'paste'.
 */
type Path = 'upload' | 'paste' | 'claimed'

// "4 work experience entries" used to be the second row, shown to everyone —
// a fresher with one job and a veteran with nine were both told four. It was a
// small invented fact on the screen that exists to promise nothing is invented.
const CHECKLIST = [
  'Contact & identity fields',
  'Work experience entries',
  'Skills & certifications',
  'Education',
]

type Stage = 'collect' | 'extracting' | 'error'

const ROW_MS = 5000 // 4 rows × 5s ≈ the ~20s estimate

function ExtractingScreen() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const raw = searchParams.get('path')
  const path: Path | null =
    raw === 'upload' ? 'upload' : raw === 'paste' ? 'paste' : raw === 'claimed' ? 'claimed' : null

  const [file, setFile] = useState<File | null>(null)
  const [text, setText] = useState('')
  const [stage, setStage] = useState<Stage>('collect')
  const [rowCount, setRowCount] = useState(0)
  const [serverMessage, setServerMessage] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)

  // No valid path → send the user back to the chooser.
  useEffect(() => {
    if (!path) router.replace('/onboarding')
  }, [path, router])

  const canStart =
    stage === 'collect' &&
    (path === 'upload' ? file !== null : (text ?? '').trim().length >= 50)

  const runExtraction = useCallback(async (overrideText?: string) => {
    if (!path) return
    const bodyText = overrideText ?? text
    setStage('extracting')
    setServerMessage('')

    // Client-side timer advances the four rows (~20s). Started at 1 (active).
    setRowCount(1)
    const timer = window.setInterval(() => {
      setRowCount((c) => Math.min(c + 1, CHECKLIST.length))
    }, ROW_MS)

    try {
      const res =
        path === 'upload'
          ? await uploadFile(file!)
          : await postText(bodyText)

      if (!res.ok) {
        // Surface the server's own message verbatim (e.g. 429 rate limit).
        // A 504 with no JSON is the platform's timeout page, not our route
        // (2026-09-11) — say so, rather than a generic failure.
        let msg =
          res.status === 504
            ? 'Reading your CV took too long and was stopped. Nothing was changed — please try again.'
            : 'Extraction failed. Please try again.'
        try {
          const body = await res.json()
          msg = (body?.error ?? body?.message) || msg
        } catch {
          /* keep default */
        }
        setServerMessage(msg)
        setStage('error')
        clearInterval(timer)
        return
      }

      const body = await res.json()
      const draft = body?.draft
      if (!draft) {
        setServerMessage('Unexpected response from the server.')
        setStage('error')
        clearInterval(timer)
        return
      }

      // Success — store draft (session only) and go straight to the review
      // screen; the checklist may jump straight to done.
      window.sessionStorage.setItem(CAREER_PROFILE_DRAFT_KEY, JSON.stringify(draft))
      clearInterval(timer)
      router.push('/profile')
    } catch {
      setServerMessage('Network error. Please check your connection and try again.')
      setStage('error')
      clearInterval(timer)
    }
  }, [file, path, router, text])

  // 'claimed' starts on its own from the text /onboarding handed over. The ref
  // guard matters: React runs effects twice in development StrictMode, and this
  // one spends a real AI call and a rate-limit slot.
  const claimedStarted = useRef(false)
  useEffect(() => {
    if (path !== 'claimed' || claimedStarted.current) return
    const claimed = window.sessionStorage.getItem(CLAIMED_RESUME_TEXT_KEY)
    // One-time handoff — clear before doing anything with it, so a refresh
    // mid-extraction cannot silently spend a second call on the same text.
    window.sessionStorage.removeItem(CLAIMED_RESUME_TEXT_KEY)
    if (!claimed || claimed.trim().length < 50) {
      // Nothing usable to resume from (refresh, or a cleared tab). The chooser
      // is the honest destination — not an error screen for something the user
      // did not do wrong.
      router.replace('/onboarding')
      return
    }
    claimedStarted.current = true
    setText(claimed)
    void runExtraction(claimed)
  }, [path, router, runExtraction])

  // 'claimed' never collects anything — the text is already in hand. Without
  // this the paste card would flash for one frame before the effect above runs.
  if (path === 'claimed' && stage === 'collect') {
    return (
      <main className="flex min-h-dvh items-center justify-center bg-canvas px-6 py-12 font-redesign-sans">
        <p className="text-sm text-ink-soft">Picking up your scan…</p>
      </main>
    )
  }

  // ---- Collect stage (deferred upload/paste interaction) -------------------
  if (stage === 'collect') {
    return (
      <main className="flex min-h-dvh items-center justify-center bg-canvas px-6 py-12 font-redesign-sans">
        <Card tone="light" className="w-full max-w-[560px] p-6 sm:p-8">
          <Link
            href="/onboarding"
            aria-label="Back to choose how to start"
            className="inline-flex size-11 items-center justify-center rounded-ctl text-2xl leading-none text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal focus-visible:ring-offset-2 focus-visible:ring-offset-canvas"
          >
            ←
          </Link>

          <h1 className="mt-4 font-display text-[30px] leading-snug text-ink">
            {path === 'upload' ? 'Upload your resume' : 'Paste your resume'}
          </h1>

          {path === 'upload' ? (
            <>
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.docx,.doc"
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                className="sr-only"
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="mt-6 flex min-h-11 w-full items-center justify-center gap-2 rounded-ctl border border-dashed border-line-strong bg-canvas px-4 py-6 text-sm text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal focus-visible:ring-offset-2 focus-visible:ring-offset-canvas"
              >
                {file ? file.name : 'Choose a file — PDF/DOCX'}
              </button>
            </>
          ) : (
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              rows={8}
              placeholder="Paste your resume text here…"
              className="field mt-6"
            />
          )}

          <Button variant="primary" className="mt-6 w-full" disabled={!canStart} onClick={() => void runExtraction()}>
            Start extraction
          </Button>
        </Card>
      </main>
    )
  }

  // ---- Error stage: give the user a way back, never strand on the screen
  if (stage === 'error') {
    return (
      <main className="flex min-h-dvh items-center justify-center bg-canvas px-6 py-12 font-redesign-sans">
        <Card tone="light" className="w-full max-w-[480px] p-8 text-center">
          <div className="mx-auto flex size-24 items-center justify-center rounded-card border border-line bg-canvas font-display text-3xl text-teal">
            !
          </div>
          <h1 className="mt-6 font-display text-[27px] leading-tight text-ink">
            We couldn&apos;t read that
          </h1>
          <p className="mt-3 text-sm leading-relaxed text-ink-soft">{serverMessage}</p>
          <div className="mt-8 flex flex-col gap-3">
            <Button
              variant="primary"
              className="w-full"
              onClick={() => router.push('/onboarding')}
            >
              Back to choose how to start
            </Button>
            <Button variant="secondary" className="w-full" onClick={() => setStage('collect')}>
              Try again
            </Button>
          </div>
        </Card>
      </main>
    )
  }

  // ---- Extracting stage: single centered card with the step checklist ------
  return (
    <main className="flex min-h-dvh flex-col bg-canvas font-redesign-sans">
      <div className="mx-auto flex w-full max-w-[520px] flex-1 flex-col items-center justify-center gap-6 px-6 py-12">
        {/* The shared processing orbit, with "CV" in its core. It replaces a
            static badge with a light sweeping across it, which on a slow phone
            read as a frozen screen. */}
        <ProcessingOrbit size={176} glyph="CV" />

        <div className="text-center">
          <h1 className="font-display text-[27px] leading-tight text-ink">Reading your resume</h1>
          <p className="mt-2 text-[13px] leading-relaxed text-ink-soft">
            Finding your roles, dates, skills and certifications.
          </p>
        </div>

        <ProcessingSteps steps={CHECKLIST} activeIndex={Math.max(0, rowCount - 1)} notes={EXTRACTION_NOTES} />

        {/* Was "— nothing is saved until you confirm". Not true for a
            first-time profile, which is auto-saved straight after this
            (2026-08-18). What IS true in every case is below. */}
        <p className="text-center text-[12px] leading-relaxed text-ink-muted">
          You&apos;ll review and correct everything on the next screen.
        </p>
      </div>
    </main>
  )
}

// ---- API calls -------------------------------------------------------------

async function uploadFile(file: File): Promise<Response> {
  const form = new FormData()
  form.append('file', file)
  return fetch('/api/parse/upload', { method: 'POST', body: form })
}

async function postText(text: string): Promise<Response> {
  return fetch('/api/parse/text', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text }),
  })
}

// useSearchParams() in a client page requires a Suspense boundary at the page
// level during static generation (next.js "missing-suspense-with-csr-bailout").
export default function ExtractingPage() {
  return (
    <Suspense>
      <ExtractingScreen />
    </Suspense>
  )
}
