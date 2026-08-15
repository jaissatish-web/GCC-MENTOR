'use client'

import { useRef, useState } from 'react'
import { Button } from '@/components/ui/Button'

/**
 * Career Profile photo upload (TASK-113).
 *
 * Replaces the disabled stub that shipped with TASK-024, which existed only
 * because there was nowhere to put the file. The photo is stored privately
 * (migration 032), shown here, and flows into the resume template's photo slot
 * — which has supported it since TASK-031 and simply never had a source.
 *
 * Uploads immediately rather than deferring to the form's Save. A photo is a
 * file, not a field: holding it in memory until Save would mean losing it on a
 * refresh, and would make "replace my photo" ambiguous about what is actually
 * stored.
 */
export function PhotoUpload({
  photoUrl,
  onChange,
  compact = false,
}: {
  photoUrl: string | null
  onChange: (nextUrl: string | null) => void
  /**
   * Header variant: just the frame, with the whole thing as the click target.
   *
   * The photo belongs at the top of the profile — it is the first thing a Gulf
   * recruiter looks at, and burying the control between form sections made it
   * feel like an afterthought. The full variant with its explanatory copy is
   * still right when the control stands alone; in the header the surrounding
   * context already explains itself.
   */
  compact?: boolean
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function upload(file: File) {
    setError(null)
    setBusy(true)
    try {
      const body = new FormData()
      body.set('photo', file)
      const res = await fetch('/api/profile/photo', { method: 'POST', body })
      const data = await res.json().catch(() => null)
      if (!res.ok) {
        setError(data?.error ?? 'Could not upload your photo.')
        return
      }
      onChange(data?.photoUrl ?? null)
    } catch {
      setError('Could not upload your photo. Check your connection and try again.')
    } finally {
      setBusy(false)
      if (inputRef.current) inputRef.current.value = ''
    }
  }

  async function remove() {
    setError(null)
    setBusy(true)
    try {
      const res = await fetch('/api/profile/photo', { method: 'DELETE' })
      if (!res.ok) {
        const data = await res.json().catch(() => null)
        setError(data?.error ?? 'Could not remove your photo.')
        return
      }
      onChange(null)
    } catch {
      setError('Could not remove your photo.')
    } finally {
      setBusy(false)
    }
  }

  if (compact) {
    return (
      <div className="flex shrink-0 flex-col items-center gap-1.5">
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={busy}
          aria-label={photoUrl ? 'Change your profile photo' : 'Upload a profile photo'}
          className="group relative h-[86px] w-[68px] shrink-0 overflow-hidden rounded-radius-md border border-line-light-strong bg-surface-2-light transition-colors hover:border-forest focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-redesign-gold focus-visible:ring-offset-2 disabled:opacity-60"
        >
          {photoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={photoUrl} alt="Your profile photo" className="h-full w-full object-cover" />
          ) : (
            <span className="flex h-full w-full flex-col items-center justify-center gap-1 px-1 text-center">
              <span aria-hidden="true" className="text-[18px] leading-none text-forest">
                +
              </span>
              <span className="text-[9px] font-semibold uppercase tracking-wider text-ink-400">
                Photo
              </span>
            </span>
          )}
          {/* Affordance on hover/focus so it is discoverable without a label. */}
          <span className="pointer-events-none absolute inset-x-0 bottom-0 bg-forest-deep/80 py-0.5 text-center text-[9px] font-semibold text-white opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100">
            {busy ? '…' : photoUrl ? 'Change' : 'Add'}
          </span>
        </button>

        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="sr-only"
          onChange={(e) => {
            const f = e.target.files?.[0]
            if (f) void upload(f)
          }}
        />

        {photoUrl ? (
          <button
            type="button"
            onClick={() => void remove()}
            disabled={busy}
            className="text-[10.5px] font-semibold text-ink-400 underline underline-offset-2 hover:text-terra focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-terra disabled:opacity-60"
          >
            Remove
          </button>
        ) : null}

        {error ? (
          <p role="alert" className="max-w-[120px] text-center text-[10px] font-medium text-terra">
            {error}
          </p>
        ) : null}
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-start gap-3.5">
        {/* Passport-ratio frame, matching how it renders on the CV. */}
        <div className="flex h-[92px] w-[74px] shrink-0 items-center justify-center overflow-hidden rounded-[7px] border border-dashed border-redesign-gold bg-surface-2-light">
          {photoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={photoUrl} alt="Your profile photo" className="h-full w-full object-cover" />
          ) : (
            <span className="px-1 text-center text-[9px] font-semibold uppercase tracking-wider text-gold-text">
              No photo
            </span>
          )}
        </div>

        <div className="flex min-w-0 flex-col gap-1.5">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[13px] font-bold text-ink-900">Photo</span>
            <span className="rounded-[5px] bg-redesign-gold-tint px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-gold-text">
              Expected in Gulf CVs
            </span>
          </div>
          <p className="text-[11px] leading-snug text-ink-400">
            Passport-style, plain background. Used on your CV wherever the template has a photo
            slot. JPG, PNG or WebP, up to 5MB.
          </p>

          <div className="mt-1 flex flex-wrap gap-2">
            <input
              ref={inputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="sr-only"
              onChange={(e) => {
                const f = e.target.files?.[0]
                if (f) void upload(f)
              }}
            />
            <Button
              type="button"
              variant="progress"
              size="sm"
              busy={busy}
              busyLabel="Uploading…"
              onClick={() => inputRef.current?.click()}
            >
              {photoUrl ? 'Replace photo' : 'Upload photo'}
            </Button>
            {photoUrl ? (
              <Button
                type="button"
                variant="danger"
                size="sm"
                busy={busy}
                busyLabel="Removing…"
                onClick={() => void remove()}
              >
                Remove
              </Button>
            ) : null}
          </div>
        </div>
      </div>

      {error ? (
        <p role="alert" className="text-[11.5px] font-medium text-terra">
          {error}
        </p>
      ) : null}
    </div>
  )
}
