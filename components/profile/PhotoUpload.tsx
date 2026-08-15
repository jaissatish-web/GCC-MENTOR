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
}: {
  photoUrl: string | null
  onChange: (nextUrl: string | null) => void
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
