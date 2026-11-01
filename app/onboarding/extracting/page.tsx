'use client'

import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { Suspense, useCallback, useEffect, useRef, useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { ProcessingOrbit, ProcessingSteps } from '@/components/ui/Processing'
import { cn } from '@/lib/utils'
import { CAREER_PROFILE_DRAFT_KEY, CAREER_PROFILE_PARSE_NOTES_KEY, CLAIMED_RESUME_TEXT_KEY } from '@/lib/onboardingDraft'
import { EXTRACTION_NOTES } from '@/lib/processingNotes'
import { uploadResumeFile, requestResumeImport, IMPORT_DISPLAY_FAILED } from '@/lib/resumeParse/clientImport'

/** Existing parse routes return one complete result, without stage events.
 * The selected input is known; internal extraction/check steps remain pending
 * until the actual response. This screen never advances backend progress on a timer.
 */

/**
 * 'claimed' is a paste in everything but origin: the text comes from the
 * anonymous scan the user already ran (handed over by /onboarding via
 * CLAIMED_RESUME_TEXT_KEY) rather than from the textarea, and extraction starts
 * on its own because the person already chose this by signing up. It posts to
 * the same endpoint with the same payload as 'paste'.
 */
type Path = 'upload' | 'paste' | 'claimed'

const CHECKLIST = [
  'Resume input selected',
  'Reading and organizing your career information',
  'Preparing your review after the response arrives',
]

type Stage = 'collect' | 'extracting' | 'error'

function ExtractingScreen() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const raw = searchParams.get('path')
  const path: Path | null =
    raw === 'upload' ? 'upload' : raw === 'paste' ? 'paste' : raw === 'claimed' ? 'claimed' : null

  const [file, setFile] = useState<File | null>(null)
  const [text, setText] = useState('')
  const [stage, setStage] = useState<Stage>('collect')
  const [serverMessage, setServerMessage] = useState('')
  const [checkSaved, setCheckSaved] = useState(false)
  const importBusy = useRef(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // No valid path → send the user back to the chooser.
  useEffect(() => {
    if (!path) router.replace('/onboarding')
  }, [path, router])

  const canStart =
    stage === 'collect' &&
    (path === 'upload' ? file !== null : (text ?? '').trim().length >= 50)

  const runExtraction = useCallback(async (overrideText?: string) => {
    if (!path || importBusy.current) return
    importBusy.current = true
    const bodyText = overrideText ?? text
    setStage('extracting')
    setServerMessage('')
    setCheckSaved(false)

    try {
      const result = await requestResumeImport(() =>
        path === 'upload' ? uploadResumeFile(file!) : postText(bodyText),
      )
      if (!result.ok) {
        setServerMessage(result.error)
        setCheckSaved(result.checkSaved)
        setStage('error')
        return
      }
      try {
        window.sessionStorage.setItem(CAREER_PROFILE_DRAFT_KEY, JSON.stringify(result.draft))
        if (Array.isArray(result.warnings)) {
          window.sessionStorage.setItem(CAREER_PROFILE_PARSE_NOTES_KEY, JSON.stringify(result.warnings))
        }
        router.push('/profile/review')
      } catch {
        setServerMessage(IMPORT_DISPLAY_FAILED)
        setCheckSaved(true)
        setStage('error')
      }
    } finally {
      importBusy.current = false
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
      <main data-career-builder="true" className="flex min-h-dvh items-center justify-center bg-canvas px-6 py-12 font-redesign-sans">
        <p className="text-sm text-ink-soft type-helper">Picking up your scan…</p>
      </main>
    )
  }

  // ---- Collect stage (deferred upload/paste interaction) -------------------
  if (stage === 'collect') {
    return (
      <main data-career-builder="true" className="flex min-h-dvh items-center justify-center bg-canvas px-6 py-12 font-redesign-sans">
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
                onChange={(e) => {
                  setFile(e.target.files?.[0] ?? null)
                  e.target.value = ''
                }}
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
      <main data-career-builder="true" className="flex min-h-dvh items-center justify-center bg-canvas px-6 py-12 font-redesign-sans">
        <Card tone="light" className="w-full max-w-[480px] p-8 text-center">
          <div className="mx-auto flex size-24 items-center justify-center rounded-card border border-line bg-canvas font-display text-3xl text-teal">
            !
          </div>
          <h1 className="mt-6 font-display text-[27px] leading-tight text-ink">
            Your resume import needs attention
          </h1>
          <p className="mt-3 text-sm leading-relaxed text-ink-soft type-helper">{serverMessage}</p>
          <div className="mt-8 flex flex-col gap-3">
            {checkSaved ? <button type="button" onClick={() => window.location.assign('/profile')} className="font-semibold text-teal underline">Check saved resume reading</button> : null}
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
    <main data-career-builder="true" className="flex min-h-dvh flex-col bg-canvas font-redesign-sans">
      <div className="mx-auto flex w-full max-w-[520px] flex-1 flex-col items-center justify-center gap-6 px-6 py-12">
        {/* The shared processing orbit, with "CV" in its core. It replaces a
            static badge with a light sweeping across it, which on a slow phone
            read as a frozen screen. */}
        <ProcessingOrbit size={176} glyph="CV" />

        <div className="text-center">
          <h1 className="font-display text-[27px] leading-tight text-ink">Reading your resume</h1>
          <p className="mt-2 type-helper leading-relaxed text-ink-soft">
            Reading your details and checking for missing or unclear information. This step stays active until your reading is ready.
          </p>
        </div>

        <ProcessingSteps steps={CHECKLIST} activeIndex={1} completedIndices={[0]} notes={EXTRACTION_NOTES} />

        {/* The response is a pending reading; final facts still require review. */}
        <p className="text-center type-helper leading-relaxed text-ink-muted">
          You&apos;ll review and correct everything on the next screen.
        </p>
      </div>
    </main>
  )
}

// ---- API calls -------------------------------------------------------------

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
