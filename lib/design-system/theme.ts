import type { CSSProperties } from 'react'

export const FONT_OPTIONS = [
  { value: 'inter', label: 'Inter' },
  { value: 'system', label: 'System sans serif' },
  { value: 'arial', label: 'Arial' },
  { value: 'georgia', label: 'Georgia' },
] as const
export const COLOR_FIELDS = [
  { key: 'canvas', label: 'Main canvas', value: '#F6F3EC' },
  { key: 'surface', label: 'Card background', value: '#FFFFFF' },
  { key: 'ink', label: 'Primary text', value: '#12211D' },
  { key: 'muted', label: 'Secondary text', value: '#5F6E69' },
  { key: 'brand', label: 'Primary emerald', value: '#0A4A3F' },
  { key: 'brandHover', label: 'Primary hover', value: '#0E5D4F' },
  { key: 'brandSoft', label: 'Soft emerald', value: '#E7EEEA' },
  { key: 'border', label: 'Borders', value: '#E4DFD4' },
  { key: 'success', label: 'Success', value: '#1A6B48' },
  { key: 'warning', label: 'Warning', value: '#8A6B2E' },
  { key: 'error', label: 'Error', value: '#A4332D' },
  { key: 'info', label: 'Information', value: '#0F6B5D' },
  { key: 'primaryText', label: 'Primary button text', value: '#FFFFFF' },
] as const
export type ColorKey = typeof COLOR_FIELDS[number]['key']
export type Device = 'mobile' | 'tablet' | 'desktop'
export const DEVICES: Device[] = ['mobile', 'tablet', 'desktop']

// A fixed schema, not a CSS editor. Every value has a known unit and bounds.
export const NUMBER_FIELDS = [
  { key: 'heroSize', label: 'Landing hero', min: 24, max: 72, step: 1, unit: 'px', section: 'Typography', defaults: [28,34,42] },
  { key: 'marketingSize', label: 'Landing section heading', min: 20, max: 48, step: 1, unit: 'px', section: 'Typography', defaults: [20,24,28] },
  { key: 'pageSize', label: 'Application page heading', min: 20, max: 40, step: 1, unit: 'px', section: 'Typography', defaults: [24,26,28] },
  { key: 'sectionSize', label: 'Section heading', min: 16, max: 32, step: 1, unit: 'px', section: 'Typography', defaults: [18,19,20] },
  { key: 'cardSize', label: 'Card heading', min: 14, max: 24, step: 1, unit: 'px', section: 'Typography', defaults: [15,15,16] },
  { key: 'bodySize', label: 'Body text', min: 14, max: 20, step: 1, unit: 'px', section: 'Typography', defaults: [15,15,16] },
  { key: 'navSize', label: 'Navigation', min: 13, max: 20, step: 1, unit: 'px', section: 'Typography', defaults: [14,14,14] },
  { key: 'helperSize', label: 'Helper text', min: 12, max: 18, step: 1, unit: 'px', section: 'Typography', defaults: [13,13,14] },
  { key: 'scoreSize', label: 'Important scores', min: 24, max: 48, step: 1, unit: 'px', section: 'Typography', defaults: [30,32,34] },
  { key: 'headingWeight', label: 'Heading weight', min: 400, max: 700, step: 100, unit: '', section: 'Typography', defaults: [600,600,600] },
  { key: 'bodyWeight', label: 'Body weight', min: 400, max: 600, step: 100, unit: '', section: 'Typography', defaults: [400,400,400] },
  { key: 'bodyLine', label: 'Body line height', min: 1.4, max: 2, step: 0.05, unit: '', section: 'Typography', defaults: [1.6,1.6,1.6] },
  { key: 'reportLine', label: 'Long report line height', min: 1.4, max: 2, step: 0.05, unit: '', section: 'Typography', defaults: [1.6,1.6,1.6] },
  { key: 'headingLine', label: 'Heading line height', min: 1.15, max: 1.5, step: 0.05, unit: '', section: 'Typography', defaults: [1.2,1.2,1.2] },
  { key: 'tracking', label: 'Letter spacing', min: -0.04, max: 0.05, step: 0.005, unit: 'em', section: 'Typography', defaults: [-0.025,-0.025,-0.025] },
  { key: 'contentMax', label: 'Maximum content width', min: 720, max: 1440, step: 20, unit: 'px', section: 'Layout and spacing', defaults: [1200,1200,1200] },
  { key: 'gutter', label: 'Page gutter', min: 12, max: 64, step: 2, unit: 'px', section: 'Layout and spacing', defaults: [16,24,32] },
  { key: 'cardPadding', label: 'Card padding', min: 12, max: 40, step: 2, unit: 'px', section: 'Layout and spacing', defaults: [16,20,24] },
  { key: 'gridGap', label: 'Grid gap', min: 8, max: 32, step: 2, unit: 'px', section: 'Layout and spacing', defaults: [12,16,16] },
  { key: 'sectionGap', label: 'Application section gap', min: 16, max: 64, step: 4, unit: 'px', section: 'Layout and spacing', defaults: [24,28,32] },
  { key: 'landingGap', label: 'Landing section spacing', min: 32, max: 128, step: 4, unit: 'px', section: 'Layout and spacing', defaults: [32,40,48] },
  { key: 'buttonHeight', label: 'Button height', min: 44, max: 60, step: 2, unit: 'px', section: 'Buttons', defaults: [46,46,46] },
  { key: 'primaryHeight', label: 'Primary CTA height', min: 44, max: 64, step: 2, unit: 'px', section: 'Buttons', defaults: [48,46,46] },
  { key: 'buttonRadius', label: 'Button radius', min: 0, max: 24, step: 1, unit: 'px', section: 'Buttons', defaults: [24,24,24] },
  { key: 'buttonSize', label: 'Button text', min: 13, max: 20, step: 1, unit: 'px', section: 'Buttons', defaults: [14,14,14] },
  { key: 'buttonPadding', label: 'Button horizontal padding', min: 12, max: 40, step: 2, unit: 'px', section: 'Buttons', defaults: [20,20,20] },
  { key: 'buttonWeight', label: 'Button weight', min: 500, max: 600, step: 100, unit: '', section: 'Buttons', defaults: [600,600,600] },
  { key: 'cardRadius', label: 'Card radius', min: 0, max: 32, step: 1, unit: 'px', section: 'Cards and forms', defaults: [18,18,18] },
  { key: 'borderWidth', label: 'Border width', min: 1, max: 3, step: 1, unit: 'px', section: 'Cards and forms', defaults: [1,1,1] },
  { key: 'shadow', label: 'Shadow strength', min: 0, max: 12, step: 1, unit: '', section: 'Cards and forms', defaults: [3,3,3] },
  { key: 'inputHeight', label: 'Input height', min: 44, max: 60, step: 2, unit: 'px', section: 'Cards and forms', defaults: [46,46,46] },
  { key: 'formGap', label: 'Form spacing', min: 8, max: 32, step: 2, unit: 'px', section: 'Cards and forms', defaults: [16,16,16] },
] as const
export type NumberKey = typeof NUMBER_FIELDS[number]['key']
export interface ThemeSettings {
  version: 1
  /** Absent means follow the primary brand color, including existing drafts. */
  buttonBackground?: string
  fontFamily: typeof FONT_OPTIONS[number]['value']
  colors: Record<ColorKey, string>
  mobile: Record<NumberKey, number>
  tablet: Record<NumberKey, number>
  desktop: Record<NumberKey, number>
}
const numericDefaults = (index: number) => Object.fromEntries(NUMBER_FIELDS.map(field => [field.key, field.defaults[index]])) as Record<NumberKey, number>
export const DEFAULT_THEME: ThemeSettings = {
  version: 1, fontFamily: 'inter',
  colors: Object.fromEntries(COLOR_FIELDS.map(field => [field.key, field.value])) as Record<ColorKey,string>,
  mobile: numericDefaults(0), tablet: numericDefaults(1), desktop: numericDefaults(2),
}
const record = (input: unknown): Record<string, unknown> => input !== null && typeof input === 'object' && !Array.isArray(input) ? input as Record<string,unknown> : {}
export function normalizeTheme(input: unknown): ThemeSettings {
  const source = record(input)
  const result: ThemeSettings = { ...DEFAULT_THEME, colors: { ...DEFAULT_THEME.colors }, mobile: { ...DEFAULT_THEME.mobile }, tablet: { ...DEFAULT_THEME.tablet }, desktop: { ...DEFAULT_THEME.desktop } }
  if (FONT_OPTIONS.some(option => option.value === source.fontFamily)) result.fontFamily = source.fontFamily as ThemeSettings['fontFamily']
  if (typeof source.buttonBackground === 'string' && /^#[0-9a-f]{6}$/i.test(source.buttonBackground)) result.buttonBackground = source.buttonBackground.toUpperCase()
  const colors = record(source.colors)
  for (const field of COLOR_FIELDS) {
    const value = colors[field.key]
    if (typeof value === 'string' && /^#[0-9a-f]{6}$/i.test(value)) result.colors[field.key] = value.toUpperCase()
  }
  for (const device of DEVICES) {
    const values = record(source[device])
    for (const field of NUMBER_FIELDS) {
      const value = values[field.key]
      if (typeof value === 'number' && Number.isFinite(value) && value >= field.min && value <= field.max) {
        result[device][field.key] = Math.round(value * 1000) / 1000
      }
    }
  }
  return result
}
const cssName = (key: string) => key.replace(/[A-Z]/g, char => `-${char.toLowerCase()}`)
const FONTS = { inter: 'var(--font-inter, Inter), ui-sans-serif, system-ui, sans-serif', system: 'ui-sans-serif, system-ui, sans-serif', arial: 'Arial, Helvetica, sans-serif', georgia: 'Georgia, \"Times New Roman\", serif' }
export function themeVariables(input: unknown): CSSProperties {
  const theme = normalizeTheme(input)
  const vars: Record<string,string> = { '--uds-font': FONTS[theme.fontFamily], '--uds-button-background': theme.buttonBackground ?? theme.colors.brand }
  for (const field of COLOR_FIELDS) {
    const color = theme.colors[field.key]
    vars[`--uds-${cssName(field.key)}`] = color
    vars[`--uds-${cssName(field.key)}-rgb`] = [1,3,5].map(index => parseInt(color.slice(index,index+2),16)).join(' ')
  }
  for (const device of DEVICES) for (const field of NUMBER_FIELDS) {
    // UI text scales with browser text preferences; admin values remain pixels at 16px base.
    const textSize = field.section === 'Typography' && field.unit === 'px' || field.key === 'buttonSize'
    vars[`--uds-${device}-${cssName(field.key)}`] = textSize ? `${theme[device][field.key] / 16}rem` : `${theme[device][field.key]}${field.unit}`
  }
  return vars as CSSProperties
}
/** Fixed selector and validated values only. Not a general-purpose CSS serializer. */
export function themeStyleText(input: unknown): string {
  const vars = themeVariables(input) as Record<string,string>
  return `[data-universal-theme]{${Object.entries(vars).map(([key,value]) => `${key}:${value}`).join(';')}}`
}
export const SPACING_SCALE = { micro: 4, small: 8, compact: 12, standard: 16, medium: 20, large: 24, section: 32, major: 48, landing: 64, spacious: 96 } as const
export function contrastRatio(first: string, second: string): number {
  const luminance = (hex: string) => {
    const channels = [1,3,5].map(index => parseInt(hex.slice(index,index+2),16) / 255).map(value => value <= .04045 ? value / 12.92 : ((value+.055)/1.055)**2.4)
    return channels[0]*.2126 + channels[1]*.7152 + channels[2]*.0722
  }
  const a = luminance(first), b = luminance(second)
  return (Math.max(a,b)+.05)/(Math.min(a,b)+.05)
}

/** Keep font configuration in the central schema, separate from inline UI CSS. */
export function withThemeFont(theme: ThemeSettings, fontFamily: unknown): ThemeSettings {
  return normalizeTheme({ ...theme, fontFamily })
}

/**
 * LANDING PRESENTATION AUTHORITY — 20 November 2026 (founder spec). LANDING-SCOPED RECORD.
 *
 * SCOPE: the public landing route (`/`) only — `app/page.tsx`,
 * `components/landing-v3/landing.module.css` and the landing-only faces in
 * `components/landing-v3/landingFonts.ts`. Nothing in this record is a universal theme field,
 * and reading it must never change a signed-in page.
 *
 * WHY THE LANDING CANNOT USE THE SCHEMA ABOVE. The landing needs Plus Jakarta Sans (headings,
 * 600/700/800), DM Sans (body) and JetBrains Mono (numerals), but `FONT_OPTIONS` offers only
 * inter / system / arial / georgia, and the landing h1 is weight 800 while
 * `NUMBER_FIELDS.headingWeight.max` is 700. Extending either would change the stored settings
 * contract for every page, so the landing carries its own pinned token layer instead. The
 * app-wide defaults — COLOR_FIELDS, NUMBER_FIELDS, FONT_OPTIONS, DEFAULT_THEME, `app/ui-system.css`
 * `--ui-*` and the `--uds-*` runtime — are deliberately unchanged.
 *
 * CARRIER: `.system, :global(#main-content)` in `components/landing-v3/landing.module.css`.
 * `:global()` is required: css-loader localises a bare `#main-content` selector inside a CSS
 * module, which silently compiled the previous pin to `#landing_main-content__<hash>` and left
 * the landing following the visitor's `--uds-*` theme. The landing now reads no `--uds-*`
 * value at all.
 *
 * THE STYLESHEET IS THE RENDERING OWNER of these values; this record documents the contract and
 * the schema boundary, and `scripts/verify-mobile-layout.mjs` /
 * `scripts/verify-landing-v3-presentation.mjs` assert it against the built page.
 */
export const LANDING_THEME = {
  scope: ['app/page.tsx', 'components/landing-v3/landing.module.css', 'components/landing-v3/landingFonts.ts'],
  carrier: '.system, :global(#main-content)',
  /** Wired in landingFonts.ts and applied on the landing wrapper — never on <body>. */
  fontVariables: ['--font-jakarta', '--font-dm-sans', '--font-jetbrains'],
  tokens: {
    '--lp-canvas': '#F8F7F4',
    '--lp-surface': '#FFFFFF',
    '--lp-surface-muted': '#F1EFEA',
    '--lp-line': '#E2E8F0',
    '--lp-ink': '#0B1628',
    '--lp-body-text': '#475569',
    '--lp-muted': '#64748B',
    '--lp-accent': '#B47B2B',
    '--lp-accent-hover': '#9E6A22',
    '--lp-navy': '#0B1628',
    '--lp-navy-hover': '#162742',
    '--lp-navy-card': '#122038',
    '--lp-navy-line': 'rgba(255, 255, 255, .15)',
    '--lp-on-navy': '#FFFFFF',
    '--lp-on-navy-body': '#CBD5E1',
    '--lp-gold': '#E5B869',
    '--lp-gold-strong': '#D99B43',
    '--lp-h1-size': 'clamp(2.35rem, 4.1vw, 3.75rem)',
    '--lp-h1-weight': '800',
    '--lp-h1-line': '1.06',
    '--lp-h2-size': '1.5rem / 1.75rem / 2.25rem (>=768px / >=1024px)',
    '--lp-h2-weight': '700',
    '--lp-h3-size': '1.125rem / 1.25rem / 1.5rem (>=768px / >=1024px)',
    '--lp-h3-weight': '700',
    '--lp-heading-tracking': '-0.025em',
    '--lp-body-size': '0.875rem / 1rem (>=1024px)',
    '--lp-body-line': '1.6',
    '--lp-meta-size': '0.75rem',
    '--lp-content-max': '1360px',
    '--lp-gutter': '24px / 40px (>=1024px)',
    '--lp-nav-height': '64px',
    '--lp-section-pad': '64px / 96px (>=1024px)',
    '--lp-radius': '6px',
  },
  /** CSS-generated (::before/::after); a literal interpunct in JSX is a copy change. */
  metadataSeparator: 'CSS-generated "·"',
  copyInvariance: 'D:/Deepseek harness/gcc-mentor-audit/labs/copy/copy-invariance-source.mjs + copy-invariance-html.mjs',
} as const

