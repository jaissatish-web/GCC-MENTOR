import type { Metadata } from 'next'
import { Instrument_Serif, Plus_Jakarta_Sans, IBM_Plex_Mono } from 'next/font/google'
import './globals.css'

// Typography per docs/DESIGN.md §3.
// Instrument Serif = headlines · Plus Jakarta Sans = UI/body · IBM Plex Mono = scores
const instrumentSerif = Instrument_Serif({
  subsets: ['latin'],
  weight: '400',
  variable: '--font-instrument-serif',
  display: 'swap',
})

const jakarta = Plus_Jakarta_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-jakarta',
  display: 'swap',
})

const plexMono = IBM_Plex_Mono({
  subsets: ['latin'],
  weight: ['400', '500'],
  variable: '--font-plex-mono',
  display: 'swap',
})

// Product name is an open decision — see docs/RULES.md §5.
// Do not replace this placeholder without founder approval.
export const metadata: Metadata = {
  title: '[Product Name] — Gulf Career Platform',
  description:
    'Rebuild your resume in Gulf format and reframe it for the exact role you are targeting — using only facts you already have.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body
        className={`${instrumentSerif.variable} ${jakarta.variable} ${plexMono.variable} font-sans bg-marble text-ink antialiased`}
      >
        {children}
      </body>
    </html>
  )
}
