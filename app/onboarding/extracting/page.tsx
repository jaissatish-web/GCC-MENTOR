'use client'

import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { Suspense, useCallback, useEffect, useRef, useState } from 'react'
import { Button } from '@/components/ui/Button'
import { cn } from '@/lib/utils'
import { CAREER_PROFILE_DRAFT_KEY } from '@/lib/onboardingDraft'

/**
 * Extraction progress screen — screen 03 (TASK-023), route /onboarding/extracting.
 *
 * Conversion of the "03 · Extracting (transient)" screen in
 * design-reference/MVP Screens.dc.html — dark navy background, sweep-animated
 * "CV" badge, itemised four-row checklist, "usually takes ~20s", and the
 * "nothing is saved until you confirm" footer. Not a spinner.
 *
 * NOTE (flagged to CTO, same provisional-routing spirit as TASK-022's note):
 * TASK-022 deferred "the actual upload/paste interaction flow" to TASK-023, so
 * this screen collects the payload itself (file picker for upload, textarea for
 * paste) after /?path=upload or /?path=paste.
 *
 * TRANSIENT SCREEN — not streaming: POST /api/parse/upload and /api/parse/text
 * each return the full CareerProfileDraft once. The four checklist rows advance
 * on a client-side timer to approx. the ~20s estimate; there is no server-sent
 * per-field progress. If the response arrives first, the checklist is skipped
 * straight to done.
 *
 * On success the draft is stored in SESSIONSTORAGE under the single documented
 * key CAREER_PROFILE_DRAFT_KEY (parsed resume content — deliberately not
 * localStorage, so it never persists across browser sessions), then routed to
 * /profile. TASK-024 will read and clear this key when built.
 *
 * On API error the server's own message is shown (e.g. 429), with a way back to
 * /onboarding — never a stranded dark screen.
 */

type Path = 'upload' | 'paste'

const CHECKLIST = [
  'Contact & identity fields',
  '4 work experience entries',
  'Skills & certifications',
  'Education',
]

type Stage = 'collect' | 'extracting' | 'error'

const ROW_MS = 5000 // 4 rows × 5s ≈ the ~20s estimate

function ExtractingScreen() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const raw = searchParams.get('path')
  const path: Path | null = raw === 'upload' ? 'upload' : raw === 'paste' ? 'paste' : null

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

  const runExtraction = useCallback(async () => {
    if (!path) return
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
          : await postText(text)

      if (!res.ok) {
        // Surface the server's own message verbatim (e.g. 429 rate limit).
        let msg = 'Extraction failed. Please try again.'
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

  // ---- Collect stage (deferred upload/paste interaction) -------------------
  if (stage === 'collect') {
    return (
      <main className="flex min-h-dvh flex-col items-center justify-center bg-midnight px-6">
        <div className="w-full max-w-sm">
          <Link
            href="/onboarding"
            aria-label="Back to choose how to start"
            className="mb-6 inline-flex size-11 items-center justify-center rounded-lg text-2xl leading-none text-marble/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold"
          >
            ←
          </Link>

          <h1 className="font-serif text-[30px] leading-snug text-marble">
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
                className="mt-6 flex min-h-11 w-full items-center justify-center gap-2 rounded-lg border border-gold/40 bg-white/5 px-4 py-6 text-sm text-marble focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold"
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
              className="mt-6 w-full resize-none rounded-lg border border-gold/40 bg-white/5 px-4 py-3 text-sm text-marble placeholder:text-marble/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold"
            />
          )}

          <Button variant="primary" className="mt-6 w-full" disabled={!canStart} onClick={runExtraction}>
            Start extraction
          </Button>
        </div>
      </main>
    )
  }

  // ---- Error stage: give the user a way back, never strand on the dark screen
  if (stage === 'error') {
    return (
      <main className="flex min-h-dvh flex-col items-center justify-center bg-midnight px-6">
        <div className="w-full max-w-sm text-center">
          <div className="mx-auto flex size-24 items-center justify-center rounded-3xl border border-gold/40 bg-white/5 font-serif text-3xl text-gold-light">
            !
          </div>
          <h1 className="mt-6 font-serif text-[27px] leading-tight text-marble">
            We couldn&apos;t read that
          </h1>
          <p className="mt-3 text-sm leading-relaxed text-marble/70">{serverMessage}</p>
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
        </div>
      </main>
    )
  }

  // ---- Extracting stage: the dark screen from the mockup -------------------
  return (
    <main className="flex min-h-dvh flex-col bg-midnight">
      <header className="flex h-11 items-center justify-between px-5 text-[12px] font-semibold text-marble/80">
        <span>9:41</span>
        <span className="tracking-[0.14em]">▮▮▮</span>
      </header>

      <div className="flex flex-1 flex-col justify-center gap-6 px-6">
        {/* Sweep-animated CV badge — reuses the existing animate-sweep keyframe */}
        <div className="relative mx-auto flex size-24 items-center justify-center overflow-hidden rounded-[26px] border border-gold/40 bg-white/5">
          <span className="font-serif text-[34px] leading-none text-gold-light">CV</span>
          <span className="absolute inset-0 w-2/5 animate-sweep bg-gradient-to-r from-transparent via-gold/35 to-transparent" />
        </div>

        <div className="text-center">
          <h1 className="font-serif text-[27px] leading-tight text-marble">Reading your resume</h1>
          <p className="mt-2 text-[13px] leading-relaxed text-marble/60">
            Usually takes about 20 seconds.
          </p>
        </div>

        <div className="flex flex-col gap-3 rounded-2xl border border-line/10 bg-white/5 p-5">
          {CHECKLIST.map((label, i) => {
            const isDone = i <= rowCount - 2
            const isActive = i === rowCount - 1
            const icon = isDone ? '✓' : isActive ? '◍' : '○'
            const color = isDone ? 'text-state-emerald-line' : isActive ? 'text-gold-light' : 'text-marble/40'
            return (
              <div key={label} className="flex items-center gap-2.5 text-[13px] font-medium text-marble">
                <span className={cn('w-4 text-center', color)}>{icon}</span>
                {label}
              </div>
            )
          })}
        </div>

        <p className="text-center text-[11px] leading-relaxed text-marble/45">
          You&apos;ll get to review and correct everything on the next screen —{' '}
          <span className="text-marble/70">nothing is saved until you confirm.</span>
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
