/**
 * Landing-only faces (founder spec, 2026-11-20).
 *
 * WHY A SEPARATE MODULE. The signed-in app's type authority is `app/layout.tsx`
 * (Inter plus the legacy document faces) and roughly a dozen verification
 * scripts harvest that file's `<body>` class for their own fixtures, so the
 * landing cannot switch faces there without changing the workspace. These three
 * faces are declared here and applied on the landing wrapper in `app/page.tsx`,
 * which keeps them scoped to the marketing page and leaves the app-wide
 * `--ui-*` / `--uds-*` tokens untouched.
 *
 * Plus Jakarta Sans — display, brand and headings (600/700/800)
 * DM Sans            — body prose, buttons and nav links (400/500/600/700)
 * JetBrains Mono     — numbers, step indices and attempt scores (tabular-nums)
 *
 * The landing stylesheet reads the three variables through its own tokens
 * (`--lp-font-display` and friends) rather than naming a family directly.
 */
import { DM_Sans, JetBrains_Mono, Plus_Jakarta_Sans } from 'next/font/google'

const display = Plus_Jakarta_Sans({
  subsets: ['latin'],
  weight: ['600', '700', '800'],
  variable: '--font-jakarta',
  display: 'swap',
})

const body = DM_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-dm-sans',
  display: 'swap',
})

const numeric = JetBrains_Mono({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  variable: '--font-jetbrains',
  display: 'swap',
})

/** Apply on the landing wrapper so landing.module.css can resolve the three variables. */
export const landingFontVariables = `${display.variable} ${body.variable} ${numeric.variable}`
