'use client'

import dynamic from 'next/dynamic'
import { LoaderCircle } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'

/** Reserve space for the document ring while its ten resume templates load. */
function OrbitLoading() {
  return <div className="flex h-[336px] items-center justify-center gap-2 min-[480px]:h-[432px]" role="status" style={{ color: 'var(--resume-caption, #475569)' }}><LoaderCircle className="size-5 animate-spin motion-reduce:animate-none" aria-hidden="true" /><span className="type-helper">Loading resume designs…</span></div>
}

const LoadedDocumentOrbit = dynamic(() => import('./DocumentOrbit').then((m) => m.DocumentOrbit), {
  ssr: false,
  loading: () => <OrbitLoading />,
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
  return <div ref={ref} className={(className ?? '') + ' min-h-[336px] min-[480px]:min-h-[432px]'}>
    {ready ? <LoadedDocumentOrbit /> : <OrbitLoading />}
  </div>
}
