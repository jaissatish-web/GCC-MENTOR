/**
 * Print-template design tokens (TASK-031).
 *
 * WHY THIS FILE EXISTS — the one real conflict in this ticket:
 *
 * docs/DESIGN.md §2 says "never a hard-coded hex value in a component" and to
 * use Tailwind class names. That rule is correct for every SCREEN component.
 * It cannot hold for the print template, because the PDF pipeline renders it
 * with renderToStaticMarkup and injects only a small inline <style> block
 * (reference/pdf-route.reference.ts) — no Tailwind stylesheet is present in
 * that render at all. A Tailwind-classed template produces a completely
 * unstyled PDF, which is the actual paid deliverable. All three donor
 * templates in reference/templates/ carry the same note: "uses only inline
 * styles — zero Tailwind classes ... must render identically in browser and
 * Puppeteer."
 *
 * So: inline styles are required here. To keep the SPIRIT of the no-hex rule
 * (one source of truth, no magic values scattered through markup), every
 * colour and size lives in this file and mirrors tailwind.config.ts exactly.
 * If a token changes there, change it here — these two must stay in step.
 */

export const T = {
  // Colours — mirrored from tailwind.config.ts / docs/DESIGN.md §2
  midnight: '#0A1A2F',
  emerald: '#0E5C4A',
  sand: '#EDE3D2',
  white: '#FFFFFF',
  inkBody: '#3E4A59',
  inkMuted: '#6B7A8D',
  inkWarm: '#8A7A5F',
  goldText: '#8A6A1C',
  line: '#E4DED2',
  lineStrong: '#DDD5C6',

  // Fonts. The PDF pipeline has no access to the app's next/font CSS
  // variables, so print falls back to the real family names plus a stack.
  serif: "'Instrument Serif', Georgia, serif",
  sans: "'Plus Jakarta Sans', system-ui, -apple-system, sans-serif",
  mono: "'IBM Plex Mono', ui-monospace, monospace",
} as const

/**
 * A4 at 96 DPI, matching the donor templates and the Puppeteer viewport in
 * reference/pdf-route.reference.ts (`setViewport({ width: 794, height: 1123 })`).
 */
export const PAGE = {
  width: '794px',
  minHeight: '1123px',
  padding: '38px 46px',
} as const

/**
 * Type scale.
 *
 * NOTE ON THE MOCKUP: screen 10 in design-reference/MVP Screens.dc.html shows
 * this CV as a ~346px-wide thumbnail inside a 390px phone frame, so its type
 * is miniaturised (8.5px body). Reproducing those literal pixel values on a
 * 794px A4 page would render a comically small CV. What is copied from the
 * mockup is its DESIGN LANGUAGE — section order, the uppercase letter-spaced
 * section labels, the 2px midnight rule under the header, serif name over
 * gold uppercase target title, mono for dates — re-expressed at a real A4
 * scale consistent with the donor templates (~10-11px body).
 */
export const SIZE = {
  name: '25px',
  targetTitle: '11px',
  identity: '10px',
  sectionLabel: '9.5px',
  body: '10.5px',
  roleTitle: '11.5px',
  meta: '10px',
  date: '9.5px',
} as const
