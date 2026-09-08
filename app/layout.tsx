import type { Metadata } from 'next'
import { Archivo, Instrument_Serif, Inter, Plus_Jakarta_Sans, IBM_Plex_Mono } from 'next/font/google'
import './globals.css'
import { SITE_URL } from '@/lib/siteUrl'

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

// Blueprint display face (2026-09-08). Loaded alongside the others while the
// new identity rolls out screen by screen.
const archivo = Archivo({
  subsets: ['latin'],
  weight: ['500', '600', '700'],
  variable: '--font-archivo',
  display: 'swap',
})

const plexMono = IBM_Plex_Mono({
  subsets: ['latin'],
  weight: ['400', '500'],
  variable: '--font-plex-mono',
  display: 'swap',
})

/**
 * Site metadata. Product name decided 2026-08-08 — "GCC MENTOR".
 *
 * `metadataBase` is what makes the Open Graph image and canonical URLs
 * absolute; without it Next emits relative URLs and every social preview
 * (WhatsApp, LinkedIn, X) silently falls back to a bare link with no card.
 * Env-driven so a preview deployment does not advertise the production domain.
 *
 * The BODY ground is `paper`, not `void`. It was dark for a long time while
 * every signed-in page painted itself light on top — a light product on a dark
 * body, which worked only because each page covered the ground completely and
 * failed anywhere one did not. Recorded as a defect in 14_OPEN_ITEMS.md and
 * fixed with the Blueprint rollout. The landing page paints its own dark hero
 * and its own ground, so it is unaffected.
 *
 * The OG image is the site's own hero photograph rather than a generated card:
 * it already exists, it is licensed for this use, and a real Gulf plant reads
 * as more credible in a feed than a logo on a colour block.
 */
const OG_IMAGE =
  'https://images.unsplash.com/photo-1509390288171-ce2088f7d08e?auto=format&fit=crop&w=1200&h=630&q=80'

const TITLE = 'GCC MENTOR — Gulf Career Platform'
const DESCRIPTION =
  'Score your CV against Gulf hiring standards free, then rebuild it in Gulf format for the exact role you are targeting — using only facts you already have. Built by a 15+ year Gulf E&I Superintendent.'

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: TITLE,
    // Every other page gets "<its title> — GCC MENTOR" without repeating itself.
    template: '%s — GCC MENTOR',
  },
  description: DESCRIPTION,
  applicationName: 'GCC MENTOR',
  keywords: [
    'Gulf jobs',
    'GCC resume',
    'Saudi Arabia jobs',
    'UAE jobs',
    'ATS resume',
    'Gulf CV format',
    'resume optimization',
    'Gulf career',
  ],
  alternates: { canonical: '/' },
  openGraph: {
    type: 'website',
    siteName: 'GCC MENTOR',
    title: TITLE,
    description: DESCRIPTION,
    url: SITE_URL,
    locale: 'en_US',
    images: [{ url: OG_IMAGE, width: 1200, height: 630, alt: 'GCC MENTOR — Gulf Career Platform' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: TITLE,
    description: DESCRIPTION,
    images: [OG_IMAGE],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, 'max-image-preview': 'large', 'max-snippet': -1 },
  },
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
        className={`${instrumentSerif.variable} ${inter.variable} ${jakarta.variable} ${plexMono.variable} ${archivo.variable} font-redesign-sans bg-paper text-graphite antialiased`}
      >
        {children}
      </body>
    </html>
  )
}
