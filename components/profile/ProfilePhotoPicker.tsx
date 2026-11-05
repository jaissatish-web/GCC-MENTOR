'use client'

import Image from 'next/image'
import * as Dialog from '@radix-ui/react-dialog'
import { UserCircleIcon } from '@heroicons/react/24/outline'
import { useEffect, useRef, useState } from 'react'
import { Button } from '@/components/ui/Button'

/** Crop locally; the existing Career Profile Save changes action owns uploads. */
export function ProfilePhotoPicker({ photoUrl, disabled, onSelect }: {
  photoUrl: string | null
  disabled: boolean
  onSelect: (file: File | null) => void
}) {
  const input = useRef<HTMLInputElement>(null)
  const canvas = useRef<HTMLCanvasElement>(null)
  const [file, setFile] = useState<File | null>(null)
  const [image, setImage] = useState<HTMLImageElement | null>(null)
  const [zoom, setZoom] = useState(1)
  const [horizontal, setHorizontal] = useState(50)
  const [vertical, setVertical] = useState(50)
  const [working, setWorking] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!file) { setImage(null); return }
    const url = URL.createObjectURL(file)
    const next = new window.Image()
    let active = true
    next.onload = () => { if (active) setImage(next) }
    next.onerror = () => { if (active) { setError('Could not read this photo. Choose another image.'); setFile(null) } }
    next.src = url
    return () => { active = false; URL.revokeObjectURL(url) }
  }, [file])

  useEffect(() => {
    const context = canvas.current?.getContext('2d')
    if (!context || !image) return
    const width = 480, height = 600
    const scale = Math.max(width / image.naturalWidth, height / image.naturalHeight) * zoom
    const drawnWidth = image.naturalWidth * scale, drawnHeight = image.naturalHeight * scale
    context.fillStyle = '#ffffff'
    context.fillRect(0, 0, width, height)
    context.drawImage(image, -(drawnWidth - width) * horizontal / 100, -(drawnHeight - height) * vertical / 100, drawnWidth, drawnHeight)
  }, [image, zoom, horizontal, vertical])

  async function applyCrop() {
    if (!canvas.current || !image || working) return
    setWorking(true); setError('')
    try {
      const blob = await new Promise<Blob>((resolve, reject) => canvas.current!.toBlob(value => value ? resolve(value) : reject(new Error('Could not crop this photo. Try another image.')), 'image/jpeg', .92))
      onSelect(new File([blob], 'profile-photo.jpg', { type: 'image/jpeg' }))
      setFile(null)
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Could not crop this photo. Try again.') }
    finally { setWorking(false) }
  }

  return <div className="profile-overview-photo-control">
    <div className="profile-overview-portrait">
      {photoUrl ? <Image src={photoUrl} alt="Your profile photo" width={120} height={150} unoptimized /> : <UserCircleIcon aria-label="No profile photo" />}
    </div>
    <input ref={input} type="file" aria-label="Upload profile photo" accept="image/jpeg,image/png,image/webp" className="sr-only" disabled={disabled || working} onChange={event => {
      const chosen = event.target.files?.[0]
      event.target.value = ''
      if (!chosen) return
      if (!['image/jpeg', 'image/png', 'image/webp'].includes(chosen.type) || chosen.size > 5 * 1024 * 1024) { setError('Choose a JPG, PNG or WebP photo under 5MB.'); return }
      setError(''); setImage(null); setZoom(1); setHorizontal(50); setVertical(50); setFile(chosen)
    }} />
    <Button variant="secondary" size="sm" disabled={disabled || working} onClick={() => input.current?.click()}>{photoUrl ? 'Change photo' : 'Upload photo'}</Button>
    {photoUrl ? <Button variant="ghost" size="sm" disabled={disabled || working} onClick={() => { setError(''); onSelect(null) }}>Remove photo</Button> : null}
    {error && !file ? <p role="alert" className="type-helper text-alert">{error}</p> : null}
    <Dialog.Root open={Boolean(file)} onOpenChange={open => { if (!open && !working) { setFile(null); setError('') } }}>
      <Dialog.Portal>
        <Dialog.Overlay className="profile-overview-overlay" />
        <Dialog.Content className="app-type internal-ui profile-overview-crop-dialog" onEscapeKeyDown={event => { if (working) event.preventDefault() }} onPointerDownOutside={event => { if (working) event.preventDefault() }}>
          <Dialog.Title className="type-section text-ink">Adjust your photo</Dialog.Title>
          <Dialog.Description className="mt-1 type-helper text-ink-soft">Zoom and position your photo. Apply the crop, then save your changes.</Dialog.Description>
          <div className="profile-overview-crop-workspace">
            <canvas ref={canvas} width={480} height={600} className="profile-overview-crop-canvas" aria-label="Cropped profile photo preview" />
            <div className="profile-overview-crop-controls">
              <label className="type-helper text-ink">Zoom<input aria-label="Photo zoom" type="range" min={1} max={3} step={.05} value={zoom} disabled={!image || working} onChange={event => setZoom(Number(event.target.value))} /></label>
              <label className="type-helper text-ink">Move left or right<input aria-label="Photo horizontal position" type="range" min={0} max={100} value={horizontal} disabled={!image || working} onChange={event => setHorizontal(Number(event.target.value))} /></label>
              <label className="type-helper text-ink">Move up or down<input aria-label="Photo vertical position" type="range" min={0} max={100} value={vertical} disabled={!image || working} onChange={event => setVertical(Number(event.target.value))} /></label>
              <p className="type-caption text-ink-muted">JPG, PNG or WebP · Up to 5MB</p>
            </div>
          </div>
          {error ? <p role="alert" className="type-helper text-alert">{error}</p> : null}
          <div className="profile-overview-crop-actions">
            <Dialog.Close asChild><Button variant="secondary" disabled={working}>Cancel crop</Button></Dialog.Close>
            <Button disabled={!image} busy={working} busyLabel="Cropping…" onClick={() => void applyCrop()}>Apply crop</Button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  </div>
}
