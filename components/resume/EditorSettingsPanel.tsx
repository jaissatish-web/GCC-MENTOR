'use client'

import { useEffect, useRef, useState, useSyncExternalStore } from 'react'
import { Squares2X2Icon, AdjustmentsHorizontalIcon, PhotoIcon, XMarkIcon } from '@heroicons/react/24/outline'
import { cn } from '@/lib/utils'

type Panel = 'templates' | 'text' | 'photo'
const query = '(max-width: 1023px)'
const subscribe = (callback: () => void) => {
  const media = window.matchMedia(query)
  media.addEventListener('change', callback)
  return () => media.removeEventListener('change', callback)
}
const snapshot = () => window.matchMedia(query).matches
const serverSnapshot = () => false
const PANELS = [
  { id: 'templates', label: 'Templates', icon: Squares2X2Icon },
  { id: 'text', label: 'Text', icon: AdjustmentsHorizontalIcon },
  { id: 'photo', label: 'Photo', icon: PhotoIcon },
] as const

/** One controls tree: a rail on desktop and a native, focus-trapped sheet on mobile.
 * Closing the sheet keeps its inputs mounted, including an in-progress upload. */
export function EditorSettingsPanel({ children, onOpen, hasPhotoControls }: {
  children: React.ReactNode
  onOpen: (panel: Panel) => void
  hasPhotoControls: boolean
}) {
  const mobile = useSyncExternalStore(subscribe, snapshot, serverSnapshot)
  const [open, setOpen] = useState(false)
  const [panel, setPanel] = useState<Panel>('templates')
  const dialog = useRef<HTMLDialogElement>(null)
  const scroll = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const element = dialog.current
    if (!element) return
    if (mobile) {
      if (open && !element.open) element.showModal()
      if (!open && element.open) element.close()
    } else {
      if (element.open) element.close()
      element.setAttribute('open', '')
    }
  }, [mobile, open])
  useEffect(() => {
    if (!mobile || !open) return
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = previous }
  }, [mobile, open])
  const select = (next: Panel) => {
    setPanel(next)
    onOpen(next)
    setOpen(true)
    scroll.current?.scrollTo({ top: 0 })
  }
  return (
    <>
      <div className="editor-mobile-toolbar -mx-3 flex lg:hidden items-center gap-1 border-y border-line px-3 py-2 sm:mx-0 sm:rounded-card sm:border" aria-label="CV design controls">
        {PANELS.map(({ id, label, icon: Icon }) => <button key={id} type="button" disabled={id === 'photo' && !hasPhotoControls} onClick={() => select(id)} className="flex min-h-11 min-w-0 flex-1 items-center justify-center gap-2 rounded-ctl type-label font-semibold text-teal hover:bg-teal-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal disabled:opacity-40"><Icon className="size-4" aria-hidden="true" />{label}</button>)}
      </div>
      <dialog ref={dialog} open={!mobile || undefined} aria-labelledby="editor-settings-title" aria-describedby="editor-settings-description" data-active-panel={panel} onClose={() => { if (mobile) setOpen(false) }} onCancel={() => setOpen(false)} className="editor-settings-panel order-2 lg:order-1">
        <div className="editor-sheet-heading border-b border-line px-5 pb-3 pt-4 lg:hidden">
          <div className="flex items-center justify-between gap-3"><div><h2 id="editor-settings-title" className="type-card text-ink">Template settings</h2><p id="editor-settings-description" className="mt-1 type-helper text-ink-muted">Make your Gulf CV your own.</p></div><button type="button" onClick={() => dialog.current?.close()} aria-label="Close template settings" className="flex size-11 shrink-0 items-center justify-center rounded-ctl text-teal hover:bg-teal-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal"><XMarkIcon className="size-5" aria-hidden="true" /></button></div>
          <div className="mt-3 flex gap-1" role="group" aria-label="Template setting categories">{PANELS.map(({ id, label }) => <button key={id} type="button" disabled={id === 'photo' && !hasPhotoControls} aria-pressed={panel === id} onClick={() => select(id)} className={cn('min-h-11 flex-1 rounded-ctl px-2 type-label font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal disabled:opacity-40', panel === id ? 'bg-teal-soft text-teal' : 'text-ink-muted hover:bg-canvas')}>{label}</button>)}</div>
        </div>
        <div ref={scroll} className="editor-settings-scroll">{children}</div>
        <div className="shrink-0 border-t border-line p-4 lg:hidden"><button type="button" onClick={() => dialog.current?.close()} className="min-h-12 w-full rounded-ctl bg-teal px-4 type-button text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal focus-visible:ring-offset-2">Back to preview</button></div>
      </dialog>
    </>
  )
}
