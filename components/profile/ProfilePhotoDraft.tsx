'use client'

import Image from 'next/image'
import { useRef, useState } from 'react'
import { Button } from '@/components/ui/Button'

/** Local selection only. The Career Profile Save changes action owns persistence. */
export function ProfilePhotoDraft({ photoUrl, busy, onSelect }: {
  photoUrl: string | null
  busy: boolean
  onSelect: (file: File | null) => void
}) {
  const input = useRef<HTMLInputElement>(null)
  const [error, setError] = useState('')
  return <div id="f_photo" tabIndex={-1} className="flex flex-wrap items-center gap-4">
    <div className="grid size-20 shrink-0 place-items-center overflow-hidden rounded-ctl border border-line bg-canvas">
      {photoUrl ? <Image src={photoUrl} alt="Profile photo preview" width={80} height={80} unoptimized className="size-full object-cover" /> : <span className="type-helper text-ink-muted">No photo</span>}
    </div>
    <div className="min-w-0 flex-1">
      <p className="type-label font-semibold text-ink">Profile photo</p>
      <p className="type-helper text-ink-muted">JPG, PNG or WebP, up to 5MB. Saved with your profile.</p>
      <input ref={input} type="file" aria-label="Choose profile photo" className="sr-only" disabled={busy} accept="image/jpeg,image/png,image/webp" onChange={event => {
        const file = event.target.files?.[0]
        event.target.value = ''
        if (!file) return
        if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || file.size > 5 * 1024 * 1024) { setError('Choose a JPG, PNG or WebP photo under 5MB.'); return }
        setError(''); onSelect(file)
      }} />
      <div className="mt-2 flex flex-wrap gap-2">
        <Button variant="secondary" size="sm" disabled={busy} onClick={() => input.current?.click()}>{photoUrl ? 'Change photo' : 'Choose photo'}</Button>
        {photoUrl ? <Button variant="ghost" size="sm" disabled={busy} onClick={() => { setError(''); onSelect(null) }}>Remove photo</Button> : null}
      </div>
      {error ? <p role="alert" className="mt-2 type-helper text-alert">{error}</p> : null}
    </div>
  </div>
}
