/**
 * Landing-only faces (founder spec, 2026-11-20), SELF-HOSTED.
 *
 * WHY A SEPARATE MODULE. The signed-in app's type authority is `app/layout.tsx`
 * (Inter plus the legacy document faces) and roughly a dozen verification
 * scripts harvest that file's `<body>` class for their own fixtures, so the
 * landing cannot switch faces there without changing the workspace. These three
 * faces are declared here and applied on the landing wrapper in `app/page.tsx`,
 * which keeps them scoped to the marketing page and leaves the app-wide
 * `--ui-*` / `--uds-*` tokens untouched.
 *
 * WHY `next/font/local` RATHER THAN `next/font/google`. The Google loader fetches
 * the face at BUILD time. On 2026-11-21 that failed on CI twice in a row
 * (`An error occurred in next/font ... Cannot read properties of null` after
 * repeated "Retrying 1/3"), turning the production build - and therefore `main` -
 * red with no code defect. The files below are the latin subsets, vendored in
 * `public/fonts/` (93 KB total), so a build no longer depends on a third party
 * being reachable, and the served page makes no request to fonts.gstatic.com.
 *
 * Each family is a VARIABLE face, so one file per family covers every weight the
 * spec asks for rather than one file per weight.
 *
 * Plus Jakarta Sans - display, brand and headings (600/700/800)
 * DM Sans            - body prose, buttons and nav links (400/500/600/700)
 * JetBrains Mono     - numbers, step indices and attempt scores (tabular-nums)
 *
 * The landing stylesheet reads the three variables through its own tokens
 * (`--lp-font-display` and friends) rather than naming a family directly.
 */
import localFont from 'next/font/local'

const display = localFont({
  src: [{ path: '../../public/fonts/plus-jakarta-sans-latin.woff2', weight: '600 800', style: 'normal' }],
  variable: '--font-jakarta',
  display: 'swap',
  fallback: ['ui-sans-serif', 'system-ui', 'sans-serif'],
})

const body = localFont({
  src: [{ path: '../../public/fonts/dm-sans-latin.woff2', weight: '400 700', style: 'normal' }],
  variable: '--font-dm-sans',
  display: 'swap',
  fallback: ['ui-sans-serif', 'system-ui', 'sans-serif'],
})

const numeric = localFont({
  src: [{ path: '../../public/fonts/jetbrains-mono-latin.woff2', weight: '400 600', style: 'normal' }],
  variable: '--font-jetbrains',
  display: 'swap',
  fallback: ['ui-monospace', 'SFMono-Regular', 'monospace'],
})

/** Apply on the landing wrapper so landing.module.css can resolve the three variables. */
export const landingFontVariables = `${display.variable} ${body.variable} ${numeric.variable}`
