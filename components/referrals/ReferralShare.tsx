'use client'

import { useRef, useState } from 'react'
import { Check, Copy, Link2, Pencil, Share2 } from 'lucide-react'
import { Button, buttonVariants } from '@/components/ui/Button'
import { SocialIcon } from './SocialIcon'

const initialMessage = 'I’m using GCC Mentor to prepare for Gulf career opportunities. You can build a free Career Profile and find tools for resumes, job matching and interview practice.'

export function ReferralShare({ initialUrl, suspended }: { initialUrl: string | null; suspended: boolean }) {
  const [url, setUrl] = useState(initialUrl)
  const [message, setMessage] = useState(initialMessage)
  const [status, setStatus] = useState('')
  const [busy, setBusy] = useState(false)
  const linkInput = useRef<HTMLInputElement>(null)

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

  async function copy(text: string, success: string, fallback: string, onFailure?: () => void) {
    try {
      await navigator.clipboard.writeText(text)
      setStatus(success)
    } catch {
      onFailure?.()
      setStatus(fallback)
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
  ] as const

  async function share() {
    if (!url) return
    if (typeof navigator.share === 'function') {
      try {
        await navigator.share({ title: 'GCC Mentor', text: message, url })
        return
      } catch (error) {
        if (error instanceof Error && error.name === 'AbortError') return
      }
    }
    await copy(text, 'Invite copied. Paste it into a message to share.', 'Choose a sharing icon below or copy your referral link.')
  }

  return (
    <div className="grid min-w-0 gap-2.5">
      {suspended && <p className="text-sm text-alert">This link is paused. Contact GCC Mentor if you think it should be active.</p>}
      {!url ? <Button type="button" size="sm" disabled={suspended} busy={busy} busyLabel="Generating link…" onClick={generate} className="w-full">
        <Link2 size={17} aria-hidden="true" /> Generate referral link
      </Button> : <>
        <div className="flex min-w-0 items-center gap-2 rounded-lg border border-line bg-[#f7fafc] pl-3 focus-within:border-teal">
          <Link2 size={16} aria-hidden="true" className="shrink-0 text-teal" />
          <input ref={linkInput} aria-label="Permanent referral link" type="url" readOnly value={url} className="min-h-11 min-w-0 flex-1 bg-transparent text-sm text-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-teal" />
          {!suspended && <button type="button" aria-label="Copy referral link" title="Copy referral link" className="grid size-11 shrink-0 place-items-center rounded-r-lg text-teal hover:bg-teal-soft focus-visible:outline focus-visible:outline-2 focus-visible:outline-teal" onClick={() => {
            void copy(url, 'Referral link copied.', 'Copy the selected referral link.', () => {
              linkInput.current?.focus()
              linkInput.current?.select()
            })
          }}>
            {status === 'Referral link copied.' ? <Check size={17} aria-hidden="true" /> : <Copy size={17} aria-hidden="true" />}
          </button>}
        </div>
        {!suspended && <>
          <Button type="button" size="sm" className="w-full" onClick={() => void share()}>
            <Share2 size={17} aria-hidden="true" /> Share Invite Link
          </Button>
          <ul aria-label="Share invite via" className="-mx-1.5 flex flex-wrap sm:mx-0 sm:gap-0.5">
            {hrefs.map(([label, href]) => <li key={label}>
              <a aria-label={`Share via ${label}`} title={label} className="grid size-11 place-items-center rounded-full hover:bg-slate-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-teal" href={href} target={label === 'Email' ? undefined : '_blank'} rel="noopener noreferrer"><SocialIcon platform={label} /></a>
            </li>)}
          </ul>
          <details>
            <summary className="flex min-h-11 w-fit cursor-pointer list-none items-center gap-2 rounded text-sm font-semibold text-teal focus-visible:outline focus-visible:outline-2 focus-visible:outline-teal [&::-webkit-details-marker]:hidden">
              <Pencil size={14} aria-hidden="true" /> Edit Message
            </summary>
            <label className="grid gap-1 text-sm">
              <span className="sr-only">Sharing message</span>
              <textarea className="min-h-24 w-full resize-y rounded-lg border border-line p-3" maxLength={450} value={message} onChange={event => setMessage(event.target.value)} />
            </label>
            <button type="button" className={buttonVariants({ variant: 'secondary', size: 'sm', className: 'mt-2' })} onClick={() => void copy(text, 'Sharing message copied.', 'Select and copy the message above.')}>Copy message</button>
          </details>
        </>}
      </>}
      <p role="status" className={status ? 'text-sm text-ink-soft' : 'sr-only'}>{status}</p>
    </div>
  )
}
