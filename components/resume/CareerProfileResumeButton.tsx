'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { UserCircleIcon } from '@heroicons/react/24/outline'
import { Button } from '@/components/ui/Button'

/** Open the existing design screen with saved profile data; never save editor drafts. */
export function CareerProfileResumeButton({ showHint = true }: { showHint?: boolean } = {}) {
  const router = useRouter()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  async function open() {
    if (busy) return
    setBusy(true); setError(null)
    try {
      const response = await fetch('/api/packages/career-profile', { method: 'POST' })
      const data = await response.json()
      if (!response.ok) throw new Error('Could not open your resume. Please try again.')
      if (!data.package?.id) throw new Error('Save your Career Profile first to see your resume.')
      router.push(`/package/${encodeURIComponent(data.package.id)}?tab=design`)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not open your resume.')
      setBusy(false)
    }
  }
  return <div className="flex flex-col items-start gap-1">
    <Button variant="secondary" size="sm" busy={busy} busyLabel="Opening…" onClick={() => void open()}><UserCircleIcon className="size-4" aria-hidden="true" />Preview CV</Button>
    {showHint ? <span className="type-caption text-ink-muted">Save changes before previewing.</span> : null}
    {error ? <p role="alert" className="type-helper text-alert">{error}</p> : null}
  </div>
}
