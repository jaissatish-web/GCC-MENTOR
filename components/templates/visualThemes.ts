import type { TemplateTheme } from './engine'

/** Original direct-sharing designs. Data, controls and pagination stay in engine.tsx. */
const BASE: TemplateTheme = {
  displayFont: '"Segoe UI", Helvetica, Arial, sans-serif',
  bodyFont: '"Helvetica Neue", Helvetica, Arial, sans-serif',
  bodySize: 10.5, nameSize: 27, headingSize: 10.5, density: 0.95,
  ink: '#202D3B', muted: '#4F5E6D', rule: '#CDD7DF',
  accent: '#153550', accentSoft: '#EDF3F7',
  headingStyle: 'rule', layout: 'single', uppercaseName: false,
  allowPhoto: true, photoShape: 'rounded', photoSide: 'right',
  nameFill: true, contactIcons: true, contactColumns: 2,
  showExperienceDescription: true,
}
const SERIF = 'Georgia, "Times New Roman", Times, serif'

/** Dark left column, cyan section markers and a restrained career timeline. */
export const EXECUTIVE_NAVY: TemplateTheme = {
  ...BASE, layout: 'sidebar-filled', sidebarSide: 'left', railWidth: 252,
  accent: '#102C46', accentSoft: '#EDF7FA', rule: '#A2CDDA',
  nameSize: 26, headingStyle: 'marker', experienceStyle: 'timeline',
  skillStyle: 'outline', photoRing: true, fillPage: true,
}

/** Framed masthead above a light emerald credentials column; serif/sans pairing. */
export const EMERALD_PROFESSIONAL: TemplateTheme = {
  ...BASE, displayFont: SERIF, layout: 'sidebar', headerVariant: 'card',
  accent: '#15634F', accentSoft: '#ECF5EF', rule: '#B9D6C8',
  headingStyle: 'bar', skillStyle: 'list', photoSide: 'left', photoShape: 'rect',
  nameSize: 25, density: 0.9,
}

/** Full-width blue gradient, right portrait and connected experience dates. */
export const ROYAL_BLUE_MODERN: TemplateTheme = {
  ...BASE, accent: '#2458A6', accentSoft: '#EDF3FC', rule: '#C0D0E9',
  headerBand: true, bandGradient: true, bandStripe: '#78C9ED',
  headingStyle: 'bar', experienceStyle: 'timeline', dateStyle: 'chip',
  contactBar: true, skillStyle: 'outline', photoRing: true,
}

/** Quiet editorial layout, silver paper and labels in a separate narrow gutter. */
export const GRAPHITE_EXECUTIVE: TemplateTheme = {
  ...BASE, displayFont: SERIF, accent: '#313C47', accentSoft: '#EFF1F3',
  ink: '#20252B', muted: '#515A64', rule: '#BBC2CA',
  headingStyle: 'side', uppercaseName: true, nameSize: 25,
  headerContactLines: true, skillStyle: 'inline', pageEdge: 'left',
  paper: '#FCFCFD', fillPage: true,
}

/** Soft teal card, rounded photograph, inset summary and outlined competencies. */
export const TEAL_HORIZON: TemplateTheme = {
  ...BASE, accent: '#14666B', accentSoft: '#EAF5F4', rule: '#B6D7D5',
  headerVariant: 'card', bandStripe: '#66ADA7', headingStyle: 'pill',
  summaryStyle: 'boxed', skillStyle: 'outline', contactBar: true,
  photoShape: 'circle', photoRing: true, sectionOrder: 'skills-first',
}

/** Elegant burgundy right column and serif identity; narrative remains prominent. */
export const BURGUNDY_PRESTIGE: TemplateTheme = {
  ...BASE, displayFont: SERIF, layout: 'sidebar-filled', sidebarSide: 'right',
  railWidth: 252, accent: '#6B293D', accentSoft: '#F7EEF1', rule: '#DBC2CA',
  headingStyle: 'bar', nameSize: 27, density: 0.88,
  skillStyle: 'inline', photoShape: 'rect', fillPage: true,
}

/** Steel masthead, slate rules and a full-width competency panel before work. */
export const INDUSTRIAL_PRO: TemplateTheme = {
  ...BASE, accent: '#34546C', accentSoft: '#EAF0F4', rule: '#B6C6D1',
  nameSize: 25, headerBand: true, bandStripe: '#98AFBE',
  photoSide: 'left', photoShape: 'rect', headingStyle: 'band',
  sectionOrder: 'skills-first', skillStyle: 'chips', contactBar: true,
  labels: { skills: 'Technical Skills' },
}

/** Centred serif identity, muted gold rulework and generous single-column reading. */
export const GOLDEN_EXECUTIVE: TemplateTheme = {
  ...BASE, displayFont: SERIF, accent: '#80652D', accentSoft: '#F6F2E9',
  ink: '#25231F', muted: '#625D53', rule: '#D1C4A4',
  headerVariant: 'centered', bandStripe: '#B59A5B', headingStyle: 'bar',
  nameSize: 28, uppercaseName: true, skillStyle: 'inline',
  contactBar: true, photoShape: 'circle', photoRing: true,
}

/** Left portrait anchors a sapphire masthead; short bars break the wide narrative. */
export const SAPPHIRE_EDGE: TemplateTheme = {
  ...BASE, accent: '#1E468E', accentSoft: '#EBF0FA', rule: '#C1CEE5',
  headerBand: true, photoSide: 'left', photoRing: true,
  bandStripe: '#95B9E9', nameStyle: 'two-tone', pageEdge: 'top',
  headingStyle: 'marker', summaryStyle: 'boxed', skillStyle: 'list',
  contactBar: true, nameSize: 29,
}

/** Broad light right column with architectural rules and a navy/turquoise hierarchy. */
export const MODERN_SKYLINE: TemplateTheme = {
  ...BASE, layout: 'sidebar-filled', sidebarSide: 'right', railStyle: 'soft',
  railWidth: 252, accent: '#124C62', accentSoft: '#EAF4F5',
  ink: '#172F46', rule: '#87BABC', pageEdge: 'left',
  nameStyle: 'two-tone', nameSize: 27, headingStyle: 'band',
  summaryStyle: 'boxed', dateStyle: 'chip', skillStyle: 'outline',
  photoShape: 'rounded', photoRing: true, fillPage: true,
}
