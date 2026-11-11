import type { CSSProperties } from 'react'

export const FONT_OPTIONS = [
  { value: 'inter', label: 'Inter' },
  { value: 'system', label: 'System sans serif' },
  { value: 'arial', label: 'Arial' },
  { value: 'georgia', label: 'Georgia' },
] as const
export const COLOR_FIELDS = [
  { key: 'canvas', label: 'Main canvas', value: '#F8FAFC' },
  { key: 'surface', label: 'Card background', value: '#FFFFFF' },
  { key: 'ink', label: 'Primary text', value: '#18283D' },
  { key: 'muted', label: 'Secondary text', value: '#64748B' },
  { key: 'brand', label: 'Primary teal', value: '#087F76' },
  { key: 'brandHover', label: 'Primary hover', value: '#066B63' },
  { key: 'brandSoft', label: 'Soft teal', value: '#E7F3F0' },
  { key: 'border', label: 'Borders', value: '#E2E8F0' },
  { key: 'success', label: 'Success', value: '#16803D' },
  { key: 'warning', label: 'Warning', value: '#B86A10' },
  { key: 'error', label: 'Error', value: '#C43D45' },
  { key: 'info', label: 'Information', value: '#2563EB' },
  { key: 'primaryText', label: 'Primary button text', value: '#FFFFFF' },
] as const
export type ColorKey = typeof COLOR_FIELDS[number]['key']
export type Device = 'mobile' | 'tablet' | 'desktop'
export const DEVICES: Device[] = ['mobile', 'tablet', 'desktop']

// A fixed schema, not a CSS editor. Every value has a known unit and bounds.
export const NUMBER_FIELDS = [
  { key: 'heroSize', label: 'Landing hero', min: 24, max: 72, step: 1, unit: 'px', section: 'Typography', defaults: [36,44,52] },
  { key: 'marketingSize', label: 'Landing section heading', min: 20, max: 48, step: 1, unit: 'px', section: 'Typography', defaults: [26,30,34] },
  { key: 'pageSize', label: 'Application page heading', min: 20, max: 40, step: 1, unit: 'px', section: 'Typography', defaults: [24,26,28] },
  { key: 'sectionSize', label: 'Section heading', min: 16, max: 32, step: 1, unit: 'px', section: 'Typography', defaults: [18,19,20] },
  { key: 'cardSize', label: 'Card heading', min: 14, max: 24, step: 1, unit: 'px', section: 'Typography', defaults: [16,16,16] },
  { key: 'bodySize', label: 'Body text', min: 14, max: 20, step: 1, unit: 'px', section: 'Typography', defaults: [15,16,16] },
  { key: 'navSize', label: 'Navigation', min: 13, max: 20, step: 1, unit: 'px', section: 'Typography', defaults: [14,14,14] },
  { key: 'helperSize', label: 'Helper text', min: 12, max: 18, step: 1, unit: 'px', section: 'Typography', defaults: [13,13,13] },
  { key: 'scoreSize', label: 'Important scores', min: 24, max: 48, step: 1, unit: 'px', section: 'Typography', defaults: [30,32,34] },
  { key: 'headingWeight', label: 'Heading weight', min: 400, max: 700, step: 100, unit: '', section: 'Typography', defaults: [600,600,600] },
  { key: 'bodyWeight', label: 'Body weight', min: 400, max: 600, step: 100, unit: '', section: 'Typography', defaults: [400,400,400] },
  { key: 'bodyLine', label: 'Body line height', min: 1.4, max: 2, step: 0.05, unit: '', section: 'Typography', defaults: [1.5,1.5,1.5] },
  { key: 'reportLine', label: 'Long report line height', min: 1.4, max: 2, step: 0.05, unit: '', section: 'Typography', defaults: [1.6,1.6,1.6] },
  { key: 'headingLine', label: 'Heading line height', min: 1.15, max: 1.5, step: 0.05, unit: '', section: 'Typography', defaults: [1.2,1.2,1.2] },
  { key: 'tracking', label: 'Letter spacing', min: -0.04, max: 0.05, step: 0.005, unit: 'em', section: 'Typography', defaults: [0,0,0] },
  { key: 'contentMax', label: 'Maximum content width', min: 720, max: 1440, step: 20, unit: 'px', section: 'Layout and spacing', defaults: [1200,1200,1200] },
  { key: 'gutter', label: 'Page gutter', min: 12, max: 64, step: 2, unit: 'px', section: 'Layout and spacing', defaults: [16,24,32] },
  { key: 'cardPadding', label: 'Card padding', min: 12, max: 40, step: 2, unit: 'px', section: 'Layout and spacing', defaults: [16,20,24] },
  { key: 'gridGap', label: 'Grid gap', min: 8, max: 32, step: 2, unit: 'px', section: 'Layout and spacing', defaults: [12,16,16] },
  { key: 'sectionGap', label: 'Application section gap', min: 16, max: 64, step: 4, unit: 'px', section: 'Layout and spacing', defaults: [24,28,32] },
  { key: 'landingGap', label: 'Landing section spacing', min: 32, max: 128, step: 4, unit: 'px', section: 'Layout and spacing', defaults: [64,80,96] },
  { key: 'buttonHeight', label: 'Button height', min: 44, max: 60, step: 2, unit: 'px', section: 'Buttons', defaults: [46,46,46] },
  { key: 'primaryHeight', label: 'Primary CTA height', min: 44, max: 64, step: 2, unit: 'px', section: 'Buttons', defaults: [48,46,46] },
  { key: 'buttonRadius', label: 'Button radius', min: 0, max: 24, step: 1, unit: 'px', section: 'Buttons', defaults: [10,10,10] },
  { key: 'buttonSize', label: 'Button text', min: 13, max: 20, step: 1, unit: 'px', section: 'Buttons', defaults: [14,14,14] },
  { key: 'buttonPadding', label: 'Button horizontal padding', min: 12, max: 40, step: 2, unit: 'px', section: 'Buttons', defaults: [20,20,20] },
  { key: 'buttonWeight', label: 'Button weight', min: 500, max: 600, step: 100, unit: '', section: 'Buttons', defaults: [600,600,600] },
  { key: 'cardRadius', label: 'Card radius', min: 0, max: 32, step: 1, unit: 'px', section: 'Cards and forms', defaults: [12,12,12] },
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
