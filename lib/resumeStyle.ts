import type { TemplateTheme } from '@/components/templates/engine'

/**
 * User-adjustable resume styling (TASK-152, migration 037).
 *
 * ONE FILE, TWO CONSUMERS. The server validator in
 * `PATCH /api/packages/[id]` and the control panel on `/package/[id]` both read
 * the tables below, so the options a user is offered and the options the server
 * will accept cannot drift apart. A picker showing a colour the API rejects is
 * a bug that only appears in production.
 *
 * NAMED OPTIONS, NEVER FREE TEXT — this is the security-relevant decision.
 * These values end up inside inline `style` attributes in HTML that Puppeteer
 * renders server-side to produce the paid PDF. Accepting an arbitrary
 * font-family or colour string from a client would mean putting user input into
 * a stylesheet, so nothing here takes a string and uses it: the request carries
 * a KEY, the key is looked up in a frozen table in this file, and the resulting
 * CSS comes from the table. An unknown key is rejected outright rather than
 * defaulted, so a malformed request cannot silently produce a document the user
 * did not intend.
 *
 * PRESENTATION ONLY. Nothing in here can alter a single word of the resume —
 * the content lives in `document_snapshot` (migration 034) and is not reachable
 * from this path. That separation is the whole reason the column is not part of
 * the snapshot.
 */

/** Font stacks. Web-safe only: the PDF renderer has no network and no CDN. */
export const FONT_OPTIONS = {
  sans: { label: 'Helvetica', stack: '"Helvetica Neue", Helvetica, Arial, sans-serif' },
  grotesk: { label: 'Segoe', stack: '"Segoe UI", "Helvetica Neue", Helvetica, Arial, sans-serif' },
  serif: { label: 'Georgia', stack: 'Georgia, "Times New Roman", Times, serif' },
} as const

export type FontKey = keyof typeof FONT_OPTIONS

/**
 * Text size as a multiplier, not an absolute point value.
 *
 * A resume has a name, headings and body at a deliberate ratio to each other;
 * letting someone set body size in points independently would let them break
 * that relationship. Scaling all three together keeps the typographic hierarchy
 * the template designer chose, and keeps the page filling sensibly.
 */
export const SIZE_OPTIONS = {
  compact: { label: 'Compact', scale: 0.92 },
  normal: { label: 'Normal', scale: 1 },
  large: { label: 'Large', scale: 1.08 },
} as const

export type SizeKey = keyof typeof SIZE_OPTIONS

/**
 * Accent colours.
 *
 * Every one is dark enough to carry white text, because the accent is what the
 * banded and railed templates reverse the name out of — a pale accent would
 * produce white-on-pale and an unreadable name. That is a real constraint, not
 * a palette preference, so the list is restricted rather than free.
 */
export const ACCENT_OPTIONS = {
  navy: { label: 'Navy', hex: '#1B4272', soft: '#EEF3F8' },
  midnight: { label: 'Midnight', hex: '#0B1F38', soft: '#EDF1F6' },
  teal: { label: 'Teal', hex: '#15607A', soft: '#EDF4F7' },
  forest: { label: 'Forest', hex: '#2A6F4E', soft: '#EAF3EE' },
  bronze: { label: 'Bronze', hex: '#7A4E1D', soft: '#F6EFE6' },
  plum: { label: 'Plum', hex: '#6B2D5B', soft: '#F5EBF2' },
  slate: { label: 'Slate', hex: '#2F4858', soft: '#EDF1F4' },
  black: { label: 'Black', hex: '#1A1A1A', soft: '#F5F5F5' },
} as const

export type AccentKey = keyof typeof ACCENT_OPTIONS

export interface ResumeStyleOverrides {
  font?: FontKey
  size?: SizeKey
  accent?: AccentKey
}

export function isFontKey(v: unknown): v is FontKey {
  return typeof v === 'string' && v in FONT_OPTIONS
}
export function isSizeKey(v: unknown): v is SizeKey {
  return typeof v === 'string' && v in SIZE_OPTIONS
}
export function isAccentKey(v: unknown): v is AccentKey {
  return typeof v === 'string' && v in ACCENT_OPTIONS
}

/**
 * Validate a client payload into a stored value.
 *
 * Returns the offending FIELD NAME on failure, never the offending value — same
 * rule the rest of this codebase follows for anything that gets logged
 * (docs/RULES.md §3). An empty object is valid and means "back to template
 * defaults", which is how the Reset control works without a second endpoint.
 */
export function parseStyleOverrides(
  input: unknown,
): { error: string } | { value: ResumeStyleOverrides | null } {
  if (input === null || input === undefined) return { value: null }
  if (typeof input !== 'object' || Array.isArray(input)) return { error: 'styleOverrides' }
  const o = input as Record<string, unknown>
  const out: ResumeStyleOverrides = {}

  if (o.font !== undefined && o.font !== null) {
    if (!isFontKey(o.font)) return { error: 'styleOverrides.font' }
    out.font = o.font
  }
  if (o.size !== undefined && o.size !== null) {
    if (!isSizeKey(o.size)) return { error: 'styleOverrides.size' }
    out.size = o.size
  }
  if (o.accent !== undefined && o.accent !== null) {
    if (!isAccentKey(o.accent)) return { error: 'styleOverrides.accent' }
    out.accent = o.accent
  }

  // Nothing set is stored as NULL rather than `{}` — one representation for
  // "defaults", so a renderer never has to treat the two as equivalent.
  return { value: Object.keys(out).length === 0 ? null : out }
}

/**
 * Read an unknown stored value back safely.
 *
 * A row could hold anything a future bug writes, and a resume must render
 * regardless — same "a stored package must always render, never 500" rule as
 * getTemplate(). Unknown keys are dropped, not defaulted.
 */
export function readStyleOverrides(stored: unknown): ResumeStyleOverrides {
  const parsed = parseStyleOverrides(stored)
  if ('error' in parsed) return {}
  return parsed.value ?? {}
}

/**
 * Produce a new theme with the user's choices applied.
 *
 * Pure — the base theme object is shared across every render and must never be
 * mutated. `nameSize` and `headingSize` scale with `bodySize` so the hierarchy
 * the template established is preserved rather than flattened.
 *
 * `accentSoft` moves with `accent` because the two are a pair: the soft tone is
 * the pill and band-tint background behind text coloured with the accent, and
 * changing one without the other produces combinations nobody checked.
 */
export function applyStyleOverrides(
  theme: TemplateTheme,
  overrides: ResumeStyleOverrides | null | undefined,
): TemplateTheme {
  if (!overrides || Object.keys(overrides).length === 0) return theme
  const next: TemplateTheme = { ...theme }

  if (overrides.font) {
    const stack = FONT_OPTIONS[overrides.font].stack
    next.bodyFont = stack
    // The display face follows the body face deliberately. A template that
    // pairs a serif name with a sans body is making a design decision, but a
    // user choosing "Georgia" and getting Georgia body under a Helvetica name
    // would read as a bug rather than as a pairing.
    next.displayFont = stack
  }

  if (overrides.size) {
    const s = SIZE_OPTIONS[overrides.size].scale
    next.bodySize = Math.round(theme.bodySize * s * 100) / 100
    next.nameSize = Math.round(theme.nameSize * s * 100) / 100
    next.headingSize = Math.round(theme.headingSize * s * 100) / 100
  }

  if (overrides.accent) {
    const a = ACCENT_OPTIONS[overrides.accent]
    next.accent = a.hex
    next.accentSoft = a.soft
  }

  return next
}
