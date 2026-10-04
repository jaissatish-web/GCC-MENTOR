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
  // Photo added 2026-08-19 (founder decision) — Gulf employers generally
  // expect one, and the engine's own header hides it cleanly when a resume
  // has none or the user turns it off, same as every other photo theme.
  allowPhoto: true,
  // Engineering CVs in the Gulf lead with capability, not narrative.
  labels: {
    summary: 'Professional Profile',
    skills: 'Technical Skills', // was 'Technical Expertise': not every ATS maps it to Skills (file check 2026-10-02)
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
  // Photo added 2026-08-19 (founder decision) — see GCC_ENGINEERING's note.
  allowPhoto: true,
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
  // Photo added 2026-08-19 (founder decision) — see GCC_ENGINEERING's note.
  allowPhoto: true,
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
  // Photo added 2026-08-19 (founder decision) — see GCC_ENGINEERING's note.
  // The engine's photo box carries no colour of its own, so it does not
  // conflict with this theme's deliberate restraint.
  allowPhoto: true,
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
  // Shipped with the reversed-row rail; kept until the switch to the grid rail
  // is approved (engine.tsx `railFirstInPdf`, docs/14_OPEN_ITEMS.md).
  railFirstInPdf: true,
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
  // As Technical Sidebar: the reversed-row rail until the switch is approved.
  railFirstInPdf: true,
  uppercaseName: false,
  allowPhoto: true,
  photoShape: 'circle',
  skillStyle: 'chips',
  contactIcons: true,
}

/* ========================================================================= *
 * 2026-10-04 — THIRTY-FIVE MORE, FOR THE WHOLE GULF JOB MARKET.
 *
 * Founder brief: study the leading builders and the Canva-style templates,
 * find what works for Gulf hiring across engineering, technicians,
 * supervisors, construction, finance, marketing, nursing and the rest, and add
 * 35 premium templates — most with a photo — that work exactly like the first
 * fifteen: same document, same PDF, same style controls.
 *
 * ORIGINAL DESIGNS, same rule as the first eight (top of this file). What was
 * taken from the market is the vocabulary that is common professional practice
 * — a coloured photo rail, a banded masthead, a centred masthead, a career
 * timeline, skills ahead of experience for technical roles, licences ahead of
 * experience for clinical ones — and nothing proprietary: no third-party
 * markup, artwork, icons or fonts. Every theme is numbers and colours on the
 * same engine, so every one inherits its parsing order (name first), its
 * empty-section rules and its page breaks.
 *
 * COLOUR RULES. Every `accent` carries white text (banded and railed themes
 * reverse the name out of it) and reads as text on white and on its own
 * `accentSoft`. `bandStripe` is the one second colour: a stripe, a photo ring,
 * and on a few themes the surname — always at name size, where it clears the
 * 3:1 large-text contrast floor against its band.
 *
 * PHOTOS. 33 of the 35 take one (Gulf CVs expect it); each hides cleanly when a
 * resume has none or the user turns it off. Audit Clarity and Data Clarity
 * are text-first for multinational job portals and show the initials instead.
 * ========================================================================= */

const GOLD = '#C9962E'
const AMBER = '#E0A526'
const HIVIS = '#F2A900'
const SAFETY_ORANGE = '#E8590C'

/* ---- Engineering & Oil / Gas ------------------------------------------- */

/** Steel-blue gradient masthead, amber stripe and surname; skills lead. */
export const DESERT_STEEL: TemplateTheme = {
  displayFont: SANS,
  bodyFont: SANS,
  bodySize: 9.8,
  nameSize: 21,
  headingSize: 10,
  density: 0.92,
  ink: INK,
  muted: MUTED,
  rule: RULE,
  accent: '#22384F',
  accentSoft: '#EDF1F6',
  headingStyle: 'bar',
  layout: 'single',
  uppercaseName: false,
  allowPhoto: true,
  nameFill: true,
  headerBand: true,
  bandGradient: true,
  bandStripe: AMBER,
  nameStyle: 'two-tone',
  photoShape: 'rect',
  photoRing: true,
  skillStyle: 'list',
  sectionOrder: 'skills-first',
  dateStyle: 'chip',
  contactIcons: true,
  contactColumns: 2,
  labels: { summary: 'Professional Profile', skills: 'Core Technical Skills' },
}

/** Petrol rail on the left, rounded photo, a career timeline. */
export const PIPELINE_PRO: TemplateTheme = {
  displayFont: GROTESK,
  bodyFont: GROTESK,
  bodySize: 9.8,
  nameSize: 20,
  headingSize: 9.8,
  density: 0.9,
  ink: INK,
  muted: MUTED,
  rule: RULE,
  accent: '#0E4D64',
  accentSoft: '#E7F1F4',
  headingStyle: 'marker',
  layout: 'sidebar-filled',
  fillPage: true,
  sidebarSide: 'left',
  uppercaseName: false,
  allowPhoto: true,
  nameFill: true,
  photoShape: 'rounded',
  skillStyle: 'chips',
  experienceStyle: 'timeline',
  nameStyle: 'two-tone',
  monogram: true,
  contactIcons: true,
  labels: { skills: 'Technical Skills', additional: 'Projects & Additional' },
}

/** Light blueprint-blue rail on the right, outline skills, drawing-paper white. */
export const BLUEPRINT_ENGINEER: TemplateTheme = {
  displayFont: SANS,
  bodyFont: SANS,
  bodySize: 9.9,
  nameSize: 20,
  headingSize: 9.8,
  density: 0.95,
  ink: INK,
  muted: MUTED,
  rule: RULE,
  accent: '#1F4E79',
  accentSoft: '#E8F0F8',
  headingStyle: 'rule',
  layout: 'sidebar-filled',
  fillPage: true,
  sidebarSide: 'right',
  railStyle: 'soft',
  uppercaseName: false,
  allowPhoto: true,
  nameFill: true,
  photoShape: 'rect',
  skillStyle: 'outline',
  dateStyle: 'chip',
  paper: '#FBFCFE',
  contactIcons: true,
}

/** Indigo header card, ringed round photo, pill headings, skills first. */
export const POWER_GRID: TemplateTheme = {
  displayFont: GROTESK,
  bodyFont: GROTESK,
  bodySize: 9.9,
  nameSize: 20,
  headingSize: 9.6,
  density: 0.92,
  ink: INK,
  muted: MUTED,
  rule: RULE,
  accent: '#2B3A8C',
  accentSoft: '#EEF0FA',
  headingStyle: 'pill',
  layout: 'single',
  headerVariant: 'card',
  uppercaseName: false,
  allowPhoto: true,
  nameFill: true,
  photoShape: 'circle',
  photoRing: true,
  experienceStyle: 'timeline',
  skillStyle: 'list',
  sectionOrder: 'skills-first',
  monogram: true,
  contactIcons: true,
  contactColumns: 2,
}

/** Deep-navy gradient masthead with a sea-teal stripe, photo on the right. */
export const OFFSHORE_NAVY: TemplateTheme = {
  displayFont: SANS,
  bodyFont: SANS,
  bodySize: 9.9,
  nameSize: 20,
  headingSize: 9.8,
  density: 0.95,
  ink: INK,
  muted: MUTED,
  rule: RULE,
  accent: '#0B2545',
  accentSoft: '#E9EEF5',
  headingStyle: 'side',
  layout: 'single',
  uppercaseName: true,
  allowPhoto: true,
  nameFill: true,
  headerBand: true,
  bandGradient: true,
  bandStripe: '#13A89E',
  photoShape: 'rect',
  photoSide: 'right',
  dateStyle: 'chip',
  skillStyle: 'chips',
  contactIcons: true,
  contactColumns: 2,
}

/** Centred masthead over a gold rule, ringed photo, skills then a timeline. */
export const COMMISSIONING_LEAD: TemplateTheme = {
  displayFont: GROTESK,
  bodyFont: GROTESK,
  bodySize: 9.9,
  nameSize: 22,
  headingSize: 9.8,
  density: 0.95,
  ink: INK,
  muted: MUTED,
  rule: RULE,
  accent: '#0F4C43',
  accentSoft: '#E4EEEB',
  headingStyle: 'bar',
  layout: 'single',
  headerVariant: 'centered',
  bandStripe: GOLD,
  uppercaseName: false,
  allowPhoto: true,
  nameFill: true,
  photoShape: 'circle',
  photoRing: true,
  skillStyle: 'chips',
  sectionOrder: 'skills-first',
  experienceStyle: 'timeline',
  monogram: true,
  contactIcons: true,
  labels: { summary: 'Profile', skills: 'Key Skills' },
}

/* ---- Technicians & Trades ---------------------------------------------- */

/** Safety-blue edge, contact strip, a two-column skills and tools list first. */
export const FIELD_TECHNICIAN: TemplateTheme = {
  displayFont: SANS,
  bodyFont: SANS,
  bodySize: 10,
  nameSize: 19,
  headingSize: 9.8,
  density: 0.95,
  ink: INK,
  muted: MUTED,
  rule: RULE,
  accent: '#1F5FA8',
  accentSoft: '#EAF1FA',
  headingStyle: 'marker',
  layout: 'single',
  fillPage: true,
  pageEdge: 'left',
  contactBar: true,
  uppercaseName: false,
  allowPhoto: true,
  nameFill: true,
  photoShape: 'rect',
  skillStyle: 'list',
  sectionOrder: 'skills-first',
  contactIcons: true,
  labels: { skills: 'Technical Skills & Tools' },
}

/** Charcoal masthead with a safety-orange stripe and surname; banded headings. */
export const WORKSHOP_PRO: TemplateTheme = {
  displayFont: GROTESK,
  bodyFont: GROTESK,
  bodySize: 9.8,
  nameSize: 20,
  headingSize: 9.6,
  density: 0.85,
  ink: INK,
  muted: MUTED,
  rule: RULE,
  accent: '#2B2D31',
  accentSoft: '#F1F1F2',
  headingStyle: 'band',
  layout: 'single',
  uppercaseName: true,
  allowPhoto: true,
  nameFill: true,
  headerBand: true,
  bandStripe: SAFETY_ORANGE,
  nameStyle: 'two-tone',
  photoShape: 'rect',
  skillStyle: 'chips',
  contactIcons: true,
  contactColumns: 2,
}

/** Olive rail on the right, rounded photo, outline skills, a timeline. */
export const MAINTENANCE_MASTER: TemplateTheme = {
  displayFont: SANS,
  bodyFont: SANS,
  bodySize: 9.8,
  nameSize: 19,
  headingSize: 9.6,
  density: 0.9,
  ink: INK,
  muted: MUTED,
  rule: RULE,
  accent: '#4B5D23',
  accentSoft: '#F1F4E8',
  headingStyle: 'plain',
  layout: 'sidebar-filled',
  fillPage: true,
  sidebarSide: 'right',
  uppercaseName: false,
  allowPhoto: true,
  nameFill: true,
  photoShape: 'rounded',
  skillStyle: 'outline',
  experienceStyle: 'timeline',
  monogram: true,
  contactIcons: true,
}

/** Centred, friendly, burnt-orange pills; contact details in a strip. */
export const SKILLED_TRADES: TemplateTheme = {
  displayFont: GROTESK,
  bodyFont: GROTESK,
  bodySize: 10.2,
  nameSize: 21,
  headingSize: 9.8,
  density: 1,
  ink: INK,
  muted: MUTED,
  rule: RULE,
  accent: '#A3471E',
  accentSoft: '#FBEEE7',
  headingStyle: 'pill',
  layout: 'single',
  headerVariant: 'centered',
  contactBar: true,
  uppercaseName: false,
  allowPhoto: true,
  nameFill: true,
  photoShape: 'circle',
  skillStyle: 'chips',
  contactIcons: true,
  labels: { skills: 'Trade Skills & Tools' },
}

/* ---- Construction, Supervision & HSE ----------------------------------- */

/** Slate gradient masthead with a hi-vis stripe and surname; a timeline. */
export const SITE_SUPERVISOR: TemplateTheme = {
  displayFont: SANS,
  bodyFont: SANS,
  bodySize: 9.8,
  nameSize: 20,
  headingSize: 9.8,
  density: 0.9,
  ink: INK,
  muted: MUTED,
  rule: RULE,
  accent: '#263238',
  accentSoft: '#ECEFF1',
  headingStyle: 'bar',
  layout: 'single',
  uppercaseName: true,
  allowPhoto: true,
  nameFill: true,
  headerBand: true,
  bandGradient: true,
  bandStripe: HIVIS,
  nameStyle: 'two-tone',
  photoShape: 'rect',
  photoRing: true,
  experienceStyle: 'timeline',
  dateStyle: 'chip',
  skillStyle: 'list',
  contactIcons: true,
  contactColumns: 2,
}

/** Amber top edge, photo right, an amber-tinted fact box beside the work history. */
export const HARD_HAT_PRO: TemplateTheme = {
  displayFont: GROTESK,
  bodyFont: GROTESK,
  bodySize: 10,
  nameSize: 21,
  headingSize: 9.6,
  density: 0.95,
  ink: INK,
  muted: MUTED,
  rule: RULE,
  accent: '#8A5A00',
  accentSoft: '#FBF3E2',
  headingStyle: 'band',
  // The engine's boxed rail beside the work history — contacts, skills,
  // certificates and education in an amber-tinted box — and the only theme
  // that uses it, so it reads unlike any other at a glance.
  layout: 'sidebar',
  pageEdge: 'top',
  uppercaseName: true,
  allowPhoto: true,
  nameFill: true,
  photoShape: 'rounded',
  photoSide: 'right',
  skillStyle: 'chips',
}

/** Light slate rail on the left, date pills, a clean figures-first read. */
export const QS_PRECISION: TemplateTheme = {
  displayFont: SANS,
  bodyFont: SANS,
  bodySize: 9.7,
  nameSize: 19,
  headingSize: 9.6,
  density: 0.88,
  ink: INK,
  muted: MUTED,
  rule: RULE,
  accent: '#2E4057',
  accentSoft: '#EEF1F5',
  headingStyle: 'rule',
  layout: 'sidebar-filled',
  fillPage: true,
  sidebarSide: 'left',
  railStyle: 'soft',
  uppercaseName: false,
  allowPhoto: true,
  nameFill: true,
  photoShape: 'rect',
  skillStyle: 'inline',
  dateStyle: 'chip',
  paper: '#FCFCFB',
  contactIcons: true,
  labels: { skills: 'Skills & Software' },
}

/** Safety-green card with an orange rule; certifications lead. */
export const HSE_SHIELD: TemplateTheme = {
  displayFont: GROTESK,
  bodyFont: GROTESK,
  bodySize: 9.9,
  nameSize: 20,
  headingSize: 9.8,
  density: 0.95,
  ink: INK,
  muted: MUTED,
  rule: RULE,
  accent: '#1E6B3A',
  accentSoft: '#E9F4EC',
  headingStyle: 'marker',
  layout: 'single',
  headerVariant: 'card',
  bandStripe: SAFETY_ORANGE,
  uppercaseName: false,
  allowPhoto: true,
  nameFill: true,
  photoShape: 'circle',
  photoRing: true,
  sectionOrder: 'credentials-first',
  summaryStyle: 'boxed',
  skillStyle: 'chips',
  contactIcons: true,
  contactColumns: 2,
  labels: { certifications: 'Safety Certifications & Licences' },
}

/** Navy masthead with a gold stripe and ringed photo on the right; serif name. */
export const PROJECT_DIRECTOR: TemplateTheme = {
  displayFont: SERIF,
  bodyFont: SANS,
  bodySize: 10.2,
  nameSize: 23,
  headingSize: 10,
  density: 1.05,
  ink: INK,
  muted: MUTED,
  rule: RULE,
  accent: '#14213D',
  accentSoft: '#EEF0F5',
  headingStyle: 'side',
  layout: 'single',
  uppercaseName: true,
  allowPhoto: true,
  nameFill: true,
  headerBand: true,
  bandStripe: GOLD,
  photoShape: 'rect',
  photoSide: 'right',
  photoRing: true,
  experienceStyle: 'timeline',
  skillStyle: 'inline',
  contactIcons: true,
  contactColumns: 2,
  labels: { summary: 'Executive Summary' },
}

/* ---- Finance & Banking ------------------------------------------------- */

/** Serif throughout on ivory, ledger-green surname, quiet hairlines. */
export const LEDGER_CLASSIC: TemplateTheme = {
  displayFont: SERIF,
  bodyFont: SERIF,
  bodySize: 10.3,
  nameSize: 21,
  headingSize: 10.2,
  density: 1.05,
  ink: '#141A1F',
  muted: '#58636C',
  rule: '#D6D2C4',
  accent: '#1B4D3E',
  accentSoft: '#EEF4F1',
  headingStyle: 'rule',
  layout: 'single',
  fillPage: true,
  uppercaseName: false,
  allowPhoto: true,
  nameFill: true,
  nameStyle: 'two-tone',
  photoShape: 'rect',
  skillStyle: 'inline',
  paper: '#FFFEFB',
}

/** Deep-green masthead with a gold stripe and surname; serif capitals. */
export const RIYADH_BANKER: TemplateTheme = {
  displayFont: SERIF,
  bodyFont: SANS,
  bodySize: 10,
  nameSize: 21,
  headingSize: 9.8,
  density: 1.05,
  ink: INK,
  muted: MUTED,
  rule: RULE,
  accent: '#0B5D3B',
  accentSoft: '#EAF4EE',
  headingStyle: 'plain',
  layout: 'single',
  uppercaseName: true,
  allowPhoto: true,
  nameFill: true,
  headerBand: true,
  bandStripe: GOLD,
  nameStyle: 'two-tone',
  photoShape: 'rect',
  skillStyle: 'inline',
  contactIcons: true,
  contactColumns: 2,
}

/** Light graphite rail, initials instead of a photo — for multinational portals. */
export const AUDIT_CLARITY: TemplateTheme = {
  displayFont: SANS,
  bodyFont: SANS,
  bodySize: 9.8,
  nameSize: 20,
  headingSize: 9.6,
  density: 0.92,
  ink: INK,
  muted: MUTED,
  rule: RULE,
  accent: '#2D3748',
  accentSoft: '#F1F3F6',
  headingStyle: 'bar',
  layout: 'sidebar-filled',
  fillPage: true,
  sidebarSide: 'right',
  railStyle: 'soft',
  uppercaseName: false,
  allowPhoto: false,
  nameFill: true,
  monogram: true,
  skillStyle: 'list',
  dateStyle: 'chip',
  contactIcons: true,
}

/** Centred serif capitals over a gold rule; the profile in a boxed panel. */
export const CFO_SIGNATURE: TemplateTheme = {
  displayFont: SERIF,
  bodyFont: SERIF,
  bodySize: 10.4,
  nameSize: 23,
  headingSize: 10.2,
  density: 1.12,
  ink: '#10171F',
  muted: '#59646F',
  rule: '#D8D3C6',
  accent: '#10243E',
  accentSoft: '#EEF1F6',
  headingStyle: 'rule',
  layout: 'single',
  headerVariant: 'centered',
  bandStripe: GOLD,
  uppercaseName: true,
  allowPhoto: true,
  nameFill: true,
  photoShape: 'rect',
  photoRing: true,
  summaryStyle: 'boxed',
  skillStyle: 'inline',
  contactIcons: true,
  labels: { summary: 'Executive Profile' },
}

/* ---- Sales & Marketing ------------------------------------------------- */

/** Sea-teal rail on the left, ringed round photo, pill headings, a timeline. */
export const MARINA_CREATIVE: TemplateTheme = {
  displayFont: GROTESK,
  bodyFont: GROTESK,
  bodySize: 9.9,
  nameSize: 21,
  headingSize: 9.6,
  density: 0.92,
  ink: INK,
  muted: MUTED,
  rule: RULE,
  accent: '#0B5C63',
  accentSoft: '#E6F2F2',
  headingStyle: 'pill',
  layout: 'sidebar-filled',
  fillPage: true,
  sidebarSide: 'left',
  uppercaseName: false,
  allowPhoto: true,
  nameFill: true,
  photoShape: 'circle',
  photoRing: true,
  skillStyle: 'chips',
  experienceStyle: 'timeline',
  nameStyle: 'two-tone',
  monogram: true,
  contactIcons: true,
}

/** Berry gradient masthead, round photo right, contacts in a strip. */
export const SPOTLIGHT_SALES: TemplateTheme = {
  displayFont: GROTESK,
  bodyFont: GROTESK,
  bodySize: 10,
  nameSize: 21,
  headingSize: 9.8,
  density: 0.95,
  ink: INK,
  muted: MUTED,
  rule: RULE,
  accent: '#8E2453',
  accentSoft: '#FAEEF3',
  headingStyle: 'marker',
  layout: 'single',
  uppercaseName: false,
  allowPhoto: true,
  nameFill: true,
  headerBand: true,
  bandGradient: true,
  contactBar: true,
  photoShape: 'circle',
  photoSide: 'right',
  photoRing: true,
  skillStyle: 'outline',
  dateStyle: 'chip',
  contactIcons: true,
}

/** Indigo header card, rounded photo, pill headings, a story-like timeline. */
export const BRAND_STORY: TemplateTheme = {
  displayFont: GROTESK,
  bodyFont: GROTESK,
  bodySize: 10,
  nameSize: 21,
  headingSize: 9.6,
  density: 0.95,
  ink: INK,
  muted: MUTED,
  rule: RULE,
  accent: '#4338CA',
  accentSoft: '#EEF0FF',
  headingStyle: 'pill',
  layout: 'single',
  headerVariant: 'card',
  uppercaseName: false,
  allowPhoto: true,
  nameFill: true,
  photoShape: 'rounded',
  experienceStyle: 'timeline',
  skillStyle: 'chips',
  nameStyle: 'two-tone',
  monogram: true,
  contactIcons: true,
  contactColumns: 2,
}

/* ---- Healthcare & Nursing ---------------------------------------------- */

/** Calm medical teal card, ringed photo; licences lead, profile boxed. */
export const CLINICAL_CARE: TemplateTheme = {
  displayFont: SANS,
  bodyFont: SANS,
  bodySize: 10,
  nameSize: 20,
  headingSize: 9.8,
  density: 0.98,
  ink: INK,
  muted: MUTED,
  rule: RULE,
  accent: '#0E6E6E',
  accentSoft: '#E6F4F3',
  headingStyle: 'bar',
  layout: 'single',
  headerVariant: 'card',
  uppercaseName: false,
  allowPhoto: true,
  nameFill: true,
  photoShape: 'circle',
  photoRing: true,
  sectionOrder: 'credentials-first',
  summaryStyle: 'boxed',
  skillStyle: 'chips',
  monogram: true,
  contactIcons: true,
  contactColumns: 2,
  labels: { certifications: 'Licences & Certifications', skills: 'Clinical Skills' },
}

/** Centred serif name over a soft-blue rule; licences lead. */
export const MEDICAL_PEARL: TemplateTheme = {
  displayFont: SERIF,
  bodyFont: SANS,
  bodySize: 10,
  nameSize: 22,
  headingSize: 9.8,
  density: 1,
  ink: INK,
  muted: MUTED,
  rule: RULE,
  accent: '#1E5A8C',
  accentSoft: '#EAF2FA',
  headingStyle: 'rule',
  layout: 'single',
  headerVariant: 'centered',
  bandStripe: '#7FB3D5',
  uppercaseName: false,
  allowPhoto: true,
  nameFill: true,
  photoShape: 'circle',
  sectionOrder: 'credentials-first',
  skillStyle: 'list',
  contactIcons: true,
  labels: { certifications: 'Licences & Certifications' },
}

/** Soft rose rail on the right, ringed round photo, pill headings, a timeline. */
export const CARE_COMPASS: TemplateTheme = {
  displayFont: GROTESK,
  bodyFont: GROTESK,
  bodySize: 10,
  nameSize: 20,
  headingSize: 9.6,
  density: 0.95,
  ink: INK,
  muted: MUTED,
  rule: RULE,
  accent: '#9D2F55',
  accentSoft: '#FBEFF3',
  headingStyle: 'pill',
  layout: 'sidebar-filled',
  fillPage: true,
  sidebarSide: 'right',
  railStyle: 'soft',
  uppercaseName: false,
  allowPhoto: true,
  nameFill: true,
  photoShape: 'circle',
  photoRing: true,
  skillStyle: 'chips',
  experienceStyle: 'timeline',
  monogram: true,
  contactIcons: true,
  labels: { skills: 'Care Skills' },
}

/** Top edge in lab teal, rounded photo, date pills; licences lead. */
export const LAB_PRECISION: TemplateTheme = {
  displayFont: SANS,
  bodyFont: SANS,
  bodySize: 9.8,
  nameSize: 19,
  headingSize: 9.6,
  density: 0.9,
  ink: INK,
  muted: MUTED,
  rule: RULE,
  accent: '#0F5E78',
  accentSoft: '#E8F3F7',
  headingStyle: 'bar',
  layout: 'single',
  pageEdge: 'top',
  uppercaseName: false,
  allowPhoto: true,
  nameFill: true,
  photoShape: 'rounded',
  skillStyle: 'chips',
  sectionOrder: 'credentials-first',
  dateStyle: 'chip',
  contactIcons: true,
  contactColumns: 2,
  labels: { skills: 'Technical & Lab Skills', certifications: 'Licences & Certifications' },
}

/* ---- Hospitality & Retail ---------------------------------------------- */

/** Warm terracotta, centred and welcoming, ringed photo, a contact strip. */
export const OASIS_HOSPITALITY: TemplateTheme = {
  displayFont: GROTESK,
  bodyFont: GROTESK,
  bodySize: 10.2,
  nameSize: 22,
  headingSize: 9.8,
  density: 1.02,
  ink: INK,
  muted: MUTED,
  rule: RULE,
  accent: '#A0452E',
  accentSoft: '#FBF0EB',
  headingStyle: 'pill',
  layout: 'single',
  fillPage: true,
  headerVariant: 'centered',
  contactBar: true,
  uppercaseName: false,
  allowPhoto: true,
  nameFill: true,
  photoShape: 'circle',
  photoRing: true,
  skillStyle: 'chips',
  paper: '#FFFDF9',
  contactIcons: true,
  labels: { skills: 'Service Skills' },
}

/** Royal-blue masthead with a sunshine stripe and surname, round photo. */
export const RETAIL_STAR: TemplateTheme = {
  displayFont: GROTESK,
  bodyFont: GROTESK,
  bodySize: 10.2,
  nameSize: 21,
  headingSize: 9.8,
  density: 1,
  ink: INK,
  muted: MUTED,
  rule: RULE,
  accent: '#1D4ED8',
  accentSoft: '#EEF3FE',
  headingStyle: 'band',
  layout: 'single',
  uppercaseName: false,
  allowPhoto: true,
  nameFill: true,
  headerBand: true,
  bandStripe: '#FBBF24',
  nameStyle: 'two-tone',
  photoShape: 'circle',
  skillStyle: 'outline',
  contactIcons: true,
  contactColumns: 2,
}

/* ---- IT & Data ---------------------------------------------------------- */

/** Deep-cyan narrower rail on the left, rounded photo, a stack-and-timeline read. */
export const TECH_HORIZON: TemplateTheme = {
  displayFont: GROTESK,
  bodyFont: GROTESK,
  bodySize: 9.8,
  nameSize: 20,
  headingSize: 9.6,
  density: 0.9,
  ink: INK,
  muted: MUTED,
  rule: RULE,
  accent: '#0E5E70',
  accentSoft: '#E6F3F6',
  headingStyle: 'marker',
  layout: 'sidebar-filled',
  fillPage: true,
  sidebarSide: 'left',
  railWidth: 222,
  uppercaseName: false,
  allowPhoto: true,
  nameFill: true,
  photoShape: 'rounded',
  skillStyle: 'outline',
  experienceStyle: 'timeline',
  nameStyle: 'two-tone',
  monogram: true,
  contactIcons: true,
  labels: { skills: 'Tech Stack & Skills' },
}

/** Text-first with initials on the right; skills lead, contacts in a strip. */
export const DATA_CLARITY: TemplateTheme = {
  displayFont: SANS,
  bodyFont: SANS,
  bodySize: 9.9,
  nameSize: 20,
  headingSize: 9.8,
  density: 0.95,
  ink: INK,
  muted: MUTED,
  rule: RULE,
  accent: '#2F4B7C',
  accentSoft: '#EEF2F8',
  headingStyle: 'bar',
  layout: 'single',
  contactBar: true,
  uppercaseName: false,
  allowPhoto: false,
  nameFill: true,
  monogram: true,
  photoSide: 'right',
  skillStyle: 'chips',
  sectionOrder: 'skills-first',
  dateStyle: 'chip',
  contactIcons: true,
}

/* ---- Admin & HR --------------------------------------------------------- */

/** Burgundy and ivory, centred serif name, ringed round photo, boxed profile. */
export const OFFICE_ELEGANCE: TemplateTheme = {
  displayFont: SERIF,
  bodyFont: SANS,
  bodySize: 10.2,
  nameSize: 22,
  headingSize: 9.8,
  density: 1.05,
  ink: INK,
  muted: MUTED,
  rule: RULE,
  accent: '#6E1E2F',
  accentSoft: '#F7EDEF',
  headingStyle: 'rule',
  layout: 'single',
  fillPage: true,
  headerVariant: 'centered',
  uppercaseName: false,
  allowPhoto: true,
  nameFill: true,
  photoShape: 'circle',
  photoRing: true,
  summaryStyle: 'boxed',
  skillStyle: 'chips',
  paper: '#FFFEFC',
  contactIcons: true,
}

/** Soft green rail on the right, round photo, outline skills, a timeline. */
export const PEOPLE_PARTNER: TemplateTheme = {
  displayFont: GROTESK,
  bodyFont: GROTESK,
  bodySize: 9.9,
  nameSize: 20,
  headingSize: 9.6,
  density: 0.95,
  ink: INK,
  muted: MUTED,
  rule: RULE,
  accent: '#2F6B4F',
  accentSoft: '#EDF6F1',
  headingStyle: 'pill',
  layout: 'sidebar-filled',
  fillPage: true,
  sidebarSide: 'right',
  railStyle: 'soft',
  uppercaseName: false,
  allowPhoto: true,
  nameFill: true,
  photoShape: 'circle',
  skillStyle: 'outline',
  experienceStyle: 'timeline',
  monogram: true,
  contactIcons: true,
}

/* ---- Logistics ---------------------------------------------------------- */

/** Route-blue gradient masthead with an orange stripe; skills, then a timeline. */
export const LOGISTICS_ROUTE: TemplateTheme = {
  displayFont: SANS,
  bodyFont: SANS,
  bodySize: 9.8,
  nameSize: 20,
  headingSize: 9.8,
  density: 0.9,
  ink: INK,
  muted: MUTED,
  rule: RULE,
  accent: '#12355B',
  accentSoft: '#EBF0F6',
  headingStyle: 'marker',
  layout: 'single',
  uppercaseName: false,
  allowPhoto: true,
  nameFill: true,
  headerBand: true,
  bandGradient: true,
  bandStripe: '#F28C28',
  photoShape: 'rect',
  experienceStyle: 'timeline',
  skillStyle: 'list',
  sectionOrder: 'skills-first',
  contactIcons: true,
  contactColumns: 2,
  labels: { skills: 'Key Skills' },
}

/* ---- Education ---------------------------------------------------------- */

/** Scholarly serif with a violet top edge and side-ruled headings. */
export const SCHOLAR_CLASSIC: TemplateTheme = {
  displayFont: SERIF,
  bodyFont: SERIF,
  bodySize: 10.4,
  nameSize: 21,
  headingSize: 10.2,
  density: 1.1,
  ink: '#16141F',
  muted: '#5B5868',
  rule: '#D9D5E3',
  accent: '#3B2F63',
  accentSoft: '#F2EFF8',
  headingStyle: 'side',
  layout: 'single',
  pageEdge: 'top',
  uppercaseName: false,
  allowPhoto: true,
  nameFill: true,
  photoShape: 'rect',
  skillStyle: 'inline',
  contactIcons: true,
  contactColumns: 2,
}

/* ---- Executive ---------------------------------------------------------- */

/** Night-navy gradient masthead, gold stripe and surname, ringed photo right. */
export const FALCON_EXECUTIVE: TemplateTheme = {
  displayFont: SERIF,
  bodyFont: SANS,
  bodySize: 10.4,
  nameSize: 24,
  headingSize: 10.2,
  density: 1.12,
  ink: INK,
  muted: MUTED,
  rule: RULE,
  accent: '#161B33',
  accentSoft: '#EEEFF4',
  headingStyle: 'bar',
  layout: 'single',
  uppercaseName: true,
  allowPhoto: true,
  nameFill: true,
  headerBand: true,
  bandGradient: true,
  bandStripe: GOLD,
  nameStyle: 'two-tone',
  photoShape: 'rect',
  photoSide: 'right',
  photoRing: true,
  experienceStyle: 'timeline',
  summaryStyle: 'boxed',
  skillStyle: 'inline',
  contactIcons: true,
  contactColumns: 2,
  labels: { summary: 'Executive Profile', experience: 'Leadership Experience' },
}
