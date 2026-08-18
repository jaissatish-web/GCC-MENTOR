'use client'

import { useRef, useState, type ChangeEvent, type DragEvent } from 'react'
import { Button, buttonVariants } from '@/components/ui/Button'
import { cn } from '@/lib/utils'
import type { CareerProfileDraft } from '@/types/careerProfile'

/**
 * Inline resume import, on the Career Profile page (founder decision 2026-08-18).
 *
 * This replaces the old multi-screen "Create Resume" walk — /create-resume →
 * /onboarding/extracting → back to /profile — which dipped out of the app shell
 * and whose two "back" affordances went to different places. Everything now
 * happens on ONE screen inside the shell: pick a file or paste text, watch the
 * extraction here, and the resulting draft is handed to the parent, which runs
 * the SAME add-or-replace decision the page already had. No navigation, so no
 * inconsistent back button.
 *
 * It only produces a draft (POST /api/parse/upload | /api/parse/text). What
 * happens to that draft — merge, replace, or first-time load — is the parent's
 * call, exactly as when a draft used to arrive via sessionStorage.
 */

type Mode = 'idle' | 'upload' | 'paste'

const MIN_TEXT = 50
const MAX_TEXT = 20000

export function ResumeImport({
  initialMode = 'idle',
  onDraft,
  onFillManually,
}: {
  /** Deep-link intent, e.g. ?import=upload opens the file panel. */
  initialMode?: Mode
  onDraft: (draft: CareerProfileDraft) => void
  onFillManually: () => void
}) {
  const fileInput = useRef<HTMLInputElement>(null)
  const [mode, setMode] = useState<Mode>(initialMode)
  const [parsing, setParsing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [text, setText] = useState('')
  const [dragging, setDragging] = useState(false)

  const run = async (call: () => Promise<Response>) => {
    setParsing(true)
    setError(null)
    try {
      const res = await call()
      const body = (await res.json().catch(() => null)) as { draft?: CareerProfileDraft; error?: string } | null
      if (!res.ok || !body?.draft) {
        setError(body?.error || 'We could not read that resume. Please try again.')
        setParsing(false)
        return
      }
      // Success — hand the draft up. The parent swaps the page (add/replace) or
      // fills the editor, so we leave `parsing` on until this component unmounts
      // or the parent re-renders it; reset defensively in case it stays mounted.
      onDraft(body.draft)
      setParsing(false)
      setMode('idle')
      setText('')
    } catch {
      setError('Network error. Please check your connection and try again.')
      setParsing(false)
    }
  }

  const chooseFile = (file: File | null) => {
    if (!file) return
    if (!/\.(pdf|docx?|doc)$/i.test(file.name)) {
      setError('Only PDF and Word files are supported.')
      return
    }
    const form = new FormData()
    form.append('file', file)
    void run(() => fetch('/api/parse/upload', { method: 'POST', body: form }))
  }

  const submitText = () => {
    const trimmed = text.trim()
    if (trimmed.length < MIN_TEXT) {
      setError('Paste at least 50 characters of resume text.')
      return
    }
    if (trimmed.length > MAX_TEXT) {
      setError('Resume text must be 20,000 characters or fewer.')
      return
    }
    void run(() =>
      fetch('/api/parse/text', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: trimmed }),
      }),
    )
  }

  return (
    <div className="mx-5 mt-4 rounded-radius-lg border border-line-light bg-surface-2-light/40 p-4">
      <h2 className="text-[13px] font-bold text-ink-900">Start or update from a resume</h2>
      <p className="mt-1 text-[11.5px] leading-relaxed text-ink-400">
        Bring in a resume to fill your profile, or just edit the details below. If you already have a
        profile, you&rsquo;ll get an add-or-replace choice first — nothing is overwritten until you pick.
      </p>

      {parsing ? (
        <div className="mt-3 flex items-center gap-3 rounded-radius-md border border-line-light bg-surface-light px-4 py-3.5">
          <span className="size-2.5 animate-pulse rounded-full bg-redesign-gold" />
          <span className="text-[12.5px] text-ink-700">Reading your resume… usually about 20 seconds.</span>
        </div>
      ) : (
        <>
          <div className="mt-3 grid gap-2 sm:grid-cols-3">
            <button
              type="button"
              onClick={() => {
                setError(null)
                setMode('upload')
              }}
              className={cn(
                buttonVariants({ variant: mode === 'upload' ? 'primary' : 'secondary', size: 'sm' }),
                'w-full justify-center',
              )}
            >
              Upload a file
            </button>
            <button
              type="button"
              onClick={() => {
                setError(null)
                setMode('paste')
              }}
              className={cn(
                buttonVariants({ variant: mode === 'paste' ? 'primary' : 'secondary', size: 'sm' }),
                'w-full justify-center',
              )}
            >
              Paste text
            </button>
            <button
              type="button"
              onClick={onFillManually}
              className={cn(buttonVariants({ variant: 'secondary', size: 'sm' }), 'w-full justify-center')}
            >
              Fill in manually
            </button>
          </div>

          {mode === 'upload' ? (
            <div
              className={cn(
                'mt-3 rounded-radius-md border-2 border-dashed p-5 text-center transition-colors',
                dragging ? 'border-redesign-gold bg-redesign-gold/10' : 'border-line-light-strong bg-surface-light',
              )}
              onDragOver={(e: DragEvent) => {
                e.preventDefault()
                setDragging(true)
              }}
              onDragLeave={() => setDragging(false)}
              onDrop={(e: DragEvent) => {
                e.preventDefault()
                setDragging(false)
                chooseFile(e.dataTransfer.files[0] ?? null)
              }}
            >
              <input
                ref={fileInput}
                type="file"
                accept=".pdf,.doc,.docx"
                className="sr-only"
                onChange={(e: ChangeEvent<HTMLInputElement>) => chooseFile(e.target.files?.[0] ?? null)}
              />
              <p className="text-[12.5px] text-ink-700">Drop your resume here, or</p>
              <button
                type="button"
                onClick={() => fileInput.current?.click()}
                className={cn(buttonVariants({ variant: 'secondary', size: 'sm' }), 'mt-2')}
              >
                Choose a file
              </button>
              <p className="mt-2 text-[11px] text-ink-400">PDF up to 5MB · Word up to 2MB</p>
            </div>
          ) : null}

          {mode === 'paste' ? (
            <div className="mt-3">
              <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                maxLength={MAX_TEXT}
                rows={7}
                placeholder="Paste your resume text (50–20,000 characters)"
                className="w-full rounded-radius-md border border-line-light bg-surface-light p-3.5 text-[13px] outline-none focus:border-redesign-gold focus:ring-2 focus:ring-redesign-gold/25"
              />
              <div className="mt-2 flex items-center justify-between">
                <span className="text-[11px] text-ink-400">{text.length.toLocaleString()} / {MAX_TEXT.toLocaleString()}</span>
                <Button variant="primary" size="sm" onClick={submitText}>
                  Read this text
                </Button>
              </div>
            </div>
          ) : null}
        </>
      )}

      {error ? (
        <p role="alert" className="mt-3 rounded-radius-md border border-terra/40 bg-terra-tint px-3.5 py-2.5 text-[12px] text-terra">
          {error}
        </p>
      ) : null}
    </div>
  )
}
