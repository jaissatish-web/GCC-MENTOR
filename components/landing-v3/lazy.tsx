'use client'

import dynamic from 'next/dynamic'
import { useEffect, useRef, useState } from 'react'

/**
 * The two heaviest pieces of the landing page load after the first paint:
 * the document ring renders ten real resume templates, and the globe carries
 * its land-dot data. The orbit mounts near the viewport, so a phone on mobile
 * data gets the hero first. Each placeholder reserves the component's height, so
 * nothing jumps when it arrives.
 */
const LoadedDocumentOrbit = dynamic(() => import('./DocumentOrbit').then((m) => m.DocumentOrbit), {
  ssr: false,
  loading: () => <div className="h-[620px] md:h-[710px]" aria-hidden="true" />,
})

const LoadedGccGlobe = dynamic(() => import('./GccGlobe').then((m) => m.GccGlobe), {
  ssr: false,
  loading: () => <div className="min-h-[760px] rounded-[28px] border border-line bg-white lg:min-h-[640px]" aria-hidden="true" />,
})

/** Mount one expensive collection once, when its hero companion approaches. */
export function DocumentOrbit({ className }: { className?: string }) {
  const ref = useRef<HTMLDivElement>(null)
  const [ready, setReady] = useState(false)
  useEffect(() => {
    const observer = new IntersectionObserver(entries => {
      if (entries.some(entry => entry.isIntersecting)) {
        setReady(true)
        observer.disconnect()
      }
    }, { rootMargin: '240px' })
    if (ref.current) observer.observe(ref.current)
    return () => observer.disconnect()
  }, [])
  return <div ref={ref} className={(className ?? '') + ' min-h-[620px] md:min-h-[710px]'}>
    {ready ? <LoadedDocumentOrbit /> : <div className="h-[620px] md:h-[710px]" aria-hidden="true" />}
  </div>
}

export function GccGlobe() {
  const ref = useRef<HTMLDivElement>(null)
  const [ready, setReady] = useState(false)
  useEffect(() => {
    const observer = new IntersectionObserver(entries => {
      if (entries.some(entry => entry.isIntersecting)) { setReady(true); observer.disconnect() }
    }, { rootMargin: '240px' })
    if (ref.current) observer.observe(ref.current)
    return () => observer.disconnect()
  }, [])
  return <div ref={ref} className="min-h-[760px] lg:min-h-[640px]">{ready ? <LoadedGccGlobe /> : null}</div>
}
