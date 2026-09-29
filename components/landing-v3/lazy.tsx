'use client'

import dynamic from 'next/dynamic'

/**
 * The two heaviest pieces of the landing page load after the first paint:
 * the document ring renders ten real resume templates, and the globe carries
 * its land-dot data. Both sit far below the fold, so a phone on mobile data
 * gets the hero first. Each placeholder reserves the component's height, so
 * nothing jumps when it arrives.
 */
export const DocumentOrbit = dynamic(() => import('./DocumentOrbit').then((m) => m.DocumentOrbit), {
  ssr: false,
  loading: () => <div className="h-[760px] md:h-[960px]" aria-hidden="true" />,
})

export const GccGlobe = dynamic(() => import('./GccGlobe').then((m) => m.GccGlobe), {
  ssr: false,
  loading: () => <div className="min-h-[760px] rounded-[28px] border border-line bg-white lg:min-h-[640px]" aria-hidden="true" />,
})
