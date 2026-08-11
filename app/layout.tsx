import type { Metadata } from 'next'
import { Instrument_Serif, Inter, Plus_Jakarta_Sans, IBM_Plex_Mono } from 'next/font/google'
import './globals.css'

// Typography per docs/redesign/DESIGN_SYSTEM.md §2.
// Instrument Serif = headlines · Inter = UI/body · IBM Plex Mono = scores
// Plus Jakarta Sans remains loaded as a compatibility fallback for existing
// CSS variable consumers until page-level redesign tickets migrate them.
const instrumentSerif = Instrument_Serif({
  subsets: ['latin'],
  weight: '400',
  variable: '--font-instrument-serif',
  display: 'swap',
})

const inter = Inter({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-inter',
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

// Product name decided 2026-08-08 — "GCC MENTOR", see docs/RULES.md §5.
export const metadata: Metadata = {
  title: 'GCC MENTOR — Gulf Career Platform',
  description:
    'Rebuild your resume in Gulf format and reframe it for the exact role you are targeting — using only facts you already have.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    // suppressHydrationWarning: the inline script below adds `js-reveal` to
    // <html> before React hydrates, so the client element legitimately has an
    // attribute the server markup did not. Scoped to this element only — it
    // does not suppress warnings anywhere else in the tree.
    <html lang="en" suppressHydrationWarning>
      <head>
        {/*
          Set the reveal flag before first paint. Scroll-reveal CSS only
          pre-hides content when this class is present, so if JS is disabled
          or fails, every section renders fully visible instead of blank.
          Inline + head-placed specifically to avoid a flash of visible
          content that then jumps back to hidden.
        */}
        <script
          dangerouslySetInnerHTML={{
            __html: "document.documentElement.classList.add('js-reveal')",
          }}
        />
      </head>
      <body
        className={`${instrumentSerif.variable} ${inter.variable} ${jakarta.variable} ${plexMono.variable} font-sans bg-void text-marble antialiased`}
      >
        {children}
      </body>
    </html>
  )
}
