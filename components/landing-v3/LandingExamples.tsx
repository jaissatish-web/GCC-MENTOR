'use client'

import { useEffect, useRef } from 'react'

/** Supporting demonstrations stay available without lengthening the main story.
 * A service's fragment link opens its example directly, including on first load. */
export function LandingExamples({ children }: { children: React.ReactNode }) {
  const root = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const openExample = () => {
      const target = document.getElementById(window.location.hash.slice(1))
      if (!target || !root.current?.contains(target)) return
      const disclosure = target.closest('details')
      if (disclosure) {
        disclosure.open = true
        target.scrollIntoView({ block: 'start' })
      }
    }
    openExample()
    window.addEventListener('hashchange', openExample)
    return () => window.removeEventListener('hashchange', openExample)
  }, [])
  return <div ref={root} className="mt-6 grid gap-3">{children}</div>
}

export function ExampleDisclosure({ id, title, children }: { id: string; title: string; children: React.ReactNode }) {
  return (
    <details id={id} className="group scroll-mt-24 overflow-hidden rounded-card border border-line bg-white">
      <summary className="flex min-h-16 cursor-pointer list-none items-center justify-between gap-3 px-5 py-4 type-label font-semibold text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-teal [&::-webkit-details-marker]:hidden">{title}<span aria-hidden="true" className="text-xl text-teal group-open:rotate-45">+</span></summary>
      <div className="border-t border-line p-4 sm:p-6">{children}</div>
    </details>
  )
}
