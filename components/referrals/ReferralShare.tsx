'use client'

import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/Button'

const initialMessage = 'I’m using GCC Mentor to prepare for Gulf career opportunities. You can build a free Career Profile and find tools for resumes, job matching and interview practice.'

export function ReferralShare({ initialUrl, suspended }: { initialUrl: string | null; suspended: boolean }) {
  const [url, setUrl] = useState(initialUrl)
  const [message, setMessage] = useState(initialMessage)
  const [status, setStatus] = useState('')
  const [busy, setBusy] = useState(false)
  const [native, setNative] = useState(false)

  useEffect(() => setNative(typeof navigator.share === 'function'), [])

  async function generate() {
    setBusy(true)
    setStatus('')
    try {
      const res = await fetch('/api/referrals/link', { method: 'POST' })
      const data = await res.json()
      if (!res.ok || typeof data.url !== 'string') {
        setStatus(typeof data.error === 'string' ? data.error : 'Your referral link is unavailable.')
        return
      }
      setUrl(data.url)
      setStatus('Referral link created.')
    } catch {
      setStatus('Could not load your referral link. Try again.')
    } finally {
      setBusy(false)
    }
  }

  async function copy(text: string, success: string) {
    try {
      await navigator.clipboard.writeText(text)
      setStatus(success)
    } catch {
      setStatus('Select the link or sharing message above and copy it manually.')
    }
  }

  const text = [message.trim(), url].filter(Boolean).join(' ')
  const link = encodeURIComponent(url ?? '')
  const encoded = encodeURIComponent(text)
  const hrefs = [
    ['WhatsApp', 'https://wa.me/?text=' + encoded],
    ['Facebook', 'https://www.facebook.com/sharer/sharer.php?u=' + link],
    ['LinkedIn', 'https://www.linkedin.com/sharing/share-offsite/?url=' + link],
    ['Telegram', 'https://t.me/share/url?url=' + link + '&text=' + encodeURIComponent(message)],
    ['X', 'https://twitter.com/intent/tweet?text=' + encoded],
    ['Email', 'mailto:?subject=GCC%20Mentor&body=' + encoded],
  ]

  return (
    <div className="grid min-w-0 gap-3">
      {suspended ? <p className="type-helper text-alert">This link is paused. Contact GCC Mentor if you think it should be active.</p> : null}
      {!url ? <Button type="button" busy={busy} onClick={generate} className="justify-self-start">Generate referral link</Button> : <>
        <label className="grid min-w-0 gap-1 type-label">Permanent link
          <input type="url" readOnly value={url} className="min-h-11 w-full rounded-ctl border border-line px-3" />
        </label>
        {!suspended && <>
          <label className="grid gap-1 type-label">Sharing message
            <textarea className="min-h-24 rounded-ctl border border-line p-3" maxLength={450} value={message} onChange={event => setMessage(event.target.value)} />
          </label>
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="secondary" onClick={() => void copy(url, 'Referral link copied.')}>Copy link</Button>
            <Button type="button" variant="secondary" onClick={() => void copy(text, 'Sharing message copied.')}>Copy message</Button>
            {native && <Button type="button" variant="secondary" onClick={() => {
              void navigator.share({ title: 'GCC Mentor', text: message, url }).catch(error => {
                if (error?.name !== 'AbortError') setStatus('Sharing did not open. You can copy the link and share it manually.')
              })
            }}>Share from device</Button>}
          </div>
          <ul aria-label="Sharing options" className="flex flex-wrap gap-x-4 gap-y-1">
            {hrefs.map(([label, href]) => <li key={label}>
              <a className="inline-flex min-h-11 items-center type-label text-teal underline" href={href} target={label === 'Email' ? undefined : '_blank'} rel="noopener noreferrer">{label}</a>
            </li>)}
          </ul>
          <p className="type-helper text-ink-muted">For Instagram, YouTube or Messenger, copy the link and paste it where you want to share it.</p>
        </>}
      </>}
      <p role="status" className="type-helper text-ink-soft">{status}</p>
    </div>
  )
}
