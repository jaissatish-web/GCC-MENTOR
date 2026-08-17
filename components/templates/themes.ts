import type { TemplateTheme } from './engine'

/**
 * The eight engine-driven templates (TASK-137).
 *
 * ORIGINAL DESIGNS, not clones. The reference builders the founder pointed at
 * were studied for the things that are common professional practice — where
 * the name sits, how dense a senior CV can get before it stops being readable,
 * when a rule under a heading helps scanning — and nothing proprietary was
 * copied: no third-party HTML, CSS, icons or artwork is used anywhere here.
 * Each theme below is a set of numbers and colours in this repo's own visual
 * language.
 *
 * Fonts are deliberately web-safe stacks. The PDF renderer runs in a headless
 * browser with no network and no CDN, so a downloaded webfont would silently
 * fall back to something else and the PDF would stop matching the preview.
 *
 * Gulf Premium and ATS Classic are NOT here — they keep their own hand-written
 * components, because they already shipped and their exact output is what
 * existing resumes were delivered with.
 */

const SERIF = 'Georgia, "Times New Roman", Times, serif'
const SANS = '"Helvetica Neue", Helvetica, Arial, sans-serif'
const GROTESK = '"Segoe UI", "Helvetica Neue", Helvetica, Arial, sans-serif'

/** Navy that matches the product's own brand primary. */
const NAVY = '#1B4272'
const NAVY_DEEP = '#0B1F38'
const INK = '#14202B'
const MUTED = '#55636F'
const RULE = '#C9D2DA'

export const GCC_ENGINEERING: TemplateTheme = {
  displayFont: SANS,
  bodyFont: SANS,
  bodySize: 9.8,
  nameSize: 18,
  headingSize: 10.5,
  density: 0.85,
  ink: INK,
  muted: MUTED,
  rule: RULE,
  accent: NAVY,
  accentSoft: '#EEF3F8',
  headingStyle: 'side',
  layout: 'single',
  uppercaseName: false,
  allowPhoto: false,
  // Engineering CVs in the Gulf lead with capability, not narrative.
  labels: {
    summary: 'Professional Profile',
    skills: 'Technical Expertise',
    certifications: 'Certifications & Standards',
    additional: 'Projects & Additional Information',
  },
}

export const EXECUTIVE_GCC: TemplateTheme = {
  displayFont: SERIF,
  bodyFont: SERIF,
  bodySize: 10.6,
  nameSize: 23,
  headingSize: 11,
  density: 1.25, // space is the whole point at this level
  ink: '#101820',
  muted: '#5A6672',
  rule: '#D8CFC0',
  accent: NAVY_DEEP,
  accentSoft: '#F4F1EA',
  headingStyle: 'plain',
  layout: 'single',
  uppercaseName: true,
  allowPhoto: false,
  labels: {
    summary: 'Executive Profile',
    experience: 'Career Experience',
    additional: 'Leadership & Governance',
  },
}

export const MODERN_PROFESSIONAL: TemplateTheme = {
  displayFont: GROTESK,
  bodyFont: GROTESK,
  bodySize: 10,
  nameSize: 20,
  headingSize: 10,
  density: 1,
  ink: INK,
  muted: MUTED,
  rule: RULE,
  accent: '#1F6FB2',
  accentSoft: '#EAF2F9',
  headingStyle: 'rule',
  layout: 'single',
  uppercaseName: false,
  allowPhoto: true,
  // TASK-149: deliberately the RESTRAINED modern option — icons and skill pills
  // but no colour block. Someone who wants the contemporary look without a
  // masthead has to have somewhere to land, or the four photo themes all become
  // loud in the same way.
  skillStyle: 'chips',
  contactIcons: true,
}

export const SENIOR_COMPACT: TemplateTheme = {
  displayFont: SANS,
  bodyFont: SANS,
  // Compact through RHYTHM, not through shrinking type to an unreadable size —
  // a 20-year career fits because the spacing is tight, not because the reader
  // needs a magnifier.
  bodySize: 9.6,
  nameSize: 17,
  headingSize: 9.8,
  density: 0.62,
  ink: INK,
  muted: MUTED,
  rule: RULE,
  accent: NAVY,
  accentSoft: '#EEF3F8',
  headingStyle: 'rule',
  layout: 'single',
  uppercaseName: false,
  allowPhoto: false,
}

export const GULF_MINIMAL: TemplateTheme = {
  displayFont: SERIF,
  bodyFont: SERIF,
  bodySize: 10.2,
  nameSize: 19,
  headingSize: 10,
  density: 1.1,
  ink: '#1A1A1A',
  muted: '#5F5F5F',
  rule: '#DDDDDD',
  accent: '#1A1A1A', // no colour at all: restraint is the design
  accentSoft: '#F5F5F5',
  headingStyle: 'plain',
  layout: 'single',
  uppercaseName: false,
  allowPhoto: false,
}

export const CORPORATE_BAND: TemplateTheme = {
  displayFont: GROTESK,
  bodyFont: GROTESK,
  bodySize: 10,
  nameSize: 20,
  headingSize: 9.8,
  density: 0.95,
  ink: INK,
  muted: MUTED,
  rule: RULE,
  accent: NAVY,
  accentSoft: '#EEF3F8',
  headingStyle: 'band',
  layout: 'single',
  uppercaseName: true,
  allowPhoto: true,
  // TASK-149: a full-bleed navy masthead with the name reversed out of it. The
  // 'band' heading style alone was too quiet to tell this apart from the other
  // single-column themes at a glance.
  headerBand: true,
  photoShape: 'rect',
  contactIcons: true,
}

export const TECHNICAL_SIDEBAR: TemplateTheme = {
  displayFont: SANS,
  bodyFont: SANS,
  bodySize: 9.8,
  nameSize: 18,
  headingSize: 9.8,
  density: 0.85,
  ink: INK,
  muted: MUTED,
  rule: RULE,
  accent: '#15607A',
  accentSoft: '#EDF4F7',
  headingStyle: 'plain',
  // TASK-149: the full-bleed rail. This was a pale-tinted box beside the text,
  // which at thumbnail size was indistinguishable from the single-column
  // themes. Now the rail runs the whole page height in solid teal with the
  // photo and contact details reversed out of it.
  layout: 'sidebar-filled',
  uppercaseName: false,
  allowPhoto: true,
  photoShape: 'circle',
  skillStyle: 'chips',
  contactIcons: true,
  labels: { skills: 'Tools & Skills' },
}

export const GRADUATE_ENTRY: TemplateTheme = {
  displayFont: GROTESK,
  bodyFont: GROTESK,
  bodySize: 10.4,
  nameSize: 19,
  headingSize: 10,
  density: 1.15, // a short history should fill the page comfortably
  ink: INK,
  muted: MUTED,
  rule: RULE,
  accent: '#2A6F4E',
  accentSoft: '#EAF3EE',
  headingStyle: 'rule',
  layout: 'single',
  uppercaseName: false,
  allowPhoto: true,
  // TASK-149: green masthead and a round photo. A first CV is the one most
  // likely to be read by a human rather than a parser, so this is the theme
  // that can afford to look the friendliest.
  headerBand: true,
  photoShape: 'circle',
  skillStyle: 'chips',
  contactIcons: true,
  labels: { summary: 'Career Objective' },
}

/* ------------------------------------------------------------------------- *
 * TASK-151 — five more photo templates.
 *
 * Founder asked for more photo styles, specifically: some with the photo on the
 * RIGHT, some on the LEFT, and some two-column with colour. These five fill
 * that grid deliberately rather than adding five near-copies:
 *
 *   RIGHT-side photo   PORTRAIT_RIGHT (plain header), CONSULTANT_RIGHT (band)
 *   LEFT-side photo    HERITAGE_LEFT (formal serif band)
 *   TWO-COLUMN colour  PROJECT_TWOCOL (rail right), CREATIVE_GCC (rail left)
 *
 * Photo side is `flex-direction: row-reverse`, never a reordered DOM, so the
 * name is still the first thing a parser reads on every one of them.
 * ------------------------------------------------------------------------- */

/** Photo right, no colour block — the restrained right-aligned option. */
export const PORTRAIT_RIGHT: TemplateTheme = {
  displayFont: SANS,
  bodyFont: SANS,
  bodySize: 10.1,
  nameSize: 20,
  headingSize: 9.8,
  density: 0.95,
  ink: INK,
  muted: MUTED,
  rule: RULE,
  accent: NAVY,
  accentSoft: '#EEF3F8',
  headingStyle: 'rule',
  layout: 'single',
  uppercaseName: false,
  allowPhoto: true,
  photoShape: 'rect',
  photoSide: 'right',
  contactIcons: true,
}

/** Photo right, inside a warm band. Client-facing / advisory tone. */
export const CONSULTANT_RIGHT: TemplateTheme = {
  displayFont: GROTESK,
  bodyFont: GROTESK,
  bodySize: 10,
  nameSize: 21,
  headingSize: 9.8,
  density: 0.95,
  ink: INK,
  muted: MUTED,
  rule: '#D8CFC0',
  accent: '#7A4E1D',
  accentSoft: '#F6EFE6',
  headingStyle: 'plain',
  layout: 'single',
  uppercaseName: false,
  allowPhoto: true,
  photoShape: 'circle',
  photoSide: 'right',
  headerBand: true,
  skillStyle: 'chips',
  contactIcons: true,
}

/** Photo left in a deep navy band, serif name. The most formal of the five. */
export const HERITAGE_LEFT: TemplateTheme = {
  displayFont: SERIF,
  bodyFont: SANS,
  bodySize: 10.1,
  nameSize: 22,
  headingSize: 9.6,
  density: 1,
  ink: INK,
  muted: MUTED,
  rule: RULE,
  accent: NAVY_DEEP,
  accentSoft: '#EDF1F6',
  headingStyle: 'rule',
  layout: 'single',
  uppercaseName: true,
  allowPhoto: true,
  photoShape: 'rect',
  photoSide: 'left',
  headerBand: true,
  contactIcons: true,
}

/** Two column, coloured rail on the RIGHT. Reads as a project data sheet. */
export const PROJECT_TWOCOL: TemplateTheme = {
  displayFont: SANS,
  bodyFont: SANS,
  bodySize: 9.8,
  nameSize: 19,
  headingSize: 9.6,
  density: 0.85,
  ink: INK,
  muted: MUTED,
  rule: RULE,
  accent: '#2F4858',
  accentSoft: '#EDF1F4',
  headingStyle: 'plain',
  layout: 'sidebar-filled',
  sidebarSide: 'right',
  uppercaseName: false,
  allowPhoto: true,
  photoShape: 'rect',
  skillStyle: 'chips',
  contactIcons: true,
  labels: { skills: 'Technical Skills', additional: 'Projects & Additional' },
}

/** Two column, coloured rail on the LEFT, warmest palette of the set. */
export const CREATIVE_GCC: TemplateTheme = {
  displayFont: GROTESK,
  bodyFont: GROTESK,
  bodySize: 10,
  nameSize: 20,
  headingSize: 9.6,
  density: 0.9,
  ink: INK,
  muted: MUTED,
  rule: RULE,
  accent: '#6B2D5B',
  accentSoft: '#F5EBF2',
  headingStyle: 'plain',
  layout: 'sidebar-filled',
  sidebarSide: 'left',
  uppercaseName: false,
  allowPhoto: true,
  photoShape: 'circle',
  skillStyle: 'chips',
  contactIcons: true,
}
