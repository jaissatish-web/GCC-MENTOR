import GulfPremium from '@/components/templates/GulfPremium'
import AtsClassic from '@/components/templates/AtsClassic'
import { makeTemplate, type TemplateTheme } from '@/components/templates/engine'
import * as themes from '@/components/templates/themes'
import type { GulfPremiumProps } from '@/components/templates/GulfPremium'

/**
 * Resume template registry (TASK-031, extended for the template system in
 * TASK-136).
 *
 * ONE DOCUMENT, MANY PRESENTATIONS. Every template renders the SAME
 * `ResumeDocument` produced by lib/resumeDocument.ts — the canonical model the
 * spec's §12 asks for, which already existed here and is shared by the screen,
 * the PDF and the DOCX builder. A template is a renderer, never a second data
 * shape: there is deliberately no GulfPremiumData / AtsClassicData.
 *
 * That is what makes "change template without touching content" true by
 * construction rather than by careful copying — switching templates re-renders
 * the same document object through a different component.
 *
 * IDS ARE STABLE AND PERMANENT. They are written into `packages.template_id`
 * (migration 035) and a stored resume is reproduced by looking its id up here.
 * Renaming one silently restyles every resume that referenced it. Display
 * names may change freely; ids may not.
 */

export type TemplateId =
  | 'gulf_premium'
  | 'ats_classic'
  | 'gcc_engineering'
  | 'executive_gcc'
  | 'modern_professional'
  | 'senior_compact'
  | 'gulf_minimal'
  | 'corporate_band'
  | 'technical_sidebar'
  | 'graduate_entry'
  // TASK-151 — five more photo templates: two right-side, one left-side, two
  // two-column with a coloured rail.
  | 'portrait_right'
  | 'consultant_right'
  | 'heritage_left'
  | 'project_twocol'
  | 'creative_gcc'
  // 2026-10-04 — thirty-five more, across the Gulf job market (themes.ts).
  | 'desert_steel'
  | 'pipeline_pro'
  | 'blueprint_engineer'
  | 'power_grid'
  | 'offshore_navy'
  | 'commissioning_lead'
  | 'field_technician'
  | 'workshop_pro'
  | 'maintenance_master'
  | 'skilled_trades'
  | 'site_supervisor'
  | 'hard_hat_pro'
  | 'qs_precision'
  | 'hse_shield'
  | 'project_director'
  | 'ledger_classic'
  | 'riyadh_banker'
  | 'audit_clarity'
  | 'cfo_signature'
  | 'marina_creative'
  | 'spotlight_sales'
  | 'brand_story'
  | 'clinical_care'
  | 'medical_pearl'
  | 'care_compass'
  | 'lab_precision'
  | 'oasis_hospitality'
  | 'retail_star'
  | 'tech_horizon'
  | 'data_clarity'
  | 'office_elegance'
  | 'people_partner'
  | 'logistics_route'
  | 'scholar_classic'
  | 'falcon_executive'

export const DEFAULT_TEMPLATE_ID: TemplateId = 'gulf_premium'

/** Kept for the pre-registry call sites that still import it. */
export const MVP_TEMPLATE_ID: TemplateId = 'gulf_premium'

export type TemplateCategory =
  | 'professional'
  | 'ats'
  | 'engineering'
  | 'executive'
  | 'senior'
  | 'minimal'
  | 'entry'

/**
 * The job families a template is designed for (2026-10-04). Drives the "filter
 * by field" chips on the template picker, so fifty templates stay browsable on
 * a phone. A template lists every field it genuinely suits; the order of
 * TEMPLATE_FIELDS is the order of the chips.
 */
export type TemplateField =
  | 'engineering'
  | 'oil-gas'
  | 'technician'
  | 'construction'
  | 'hse'
  | 'supervisor'
  | 'healthcare'
  | 'finance'
  | 'sales-marketing'
  | 'hospitality'
  | 'it'
  | 'admin-hr'
  | 'logistics'
  | 'education'
  | 'executive'
  | 'graduate'

export const TEMPLATE_FIELDS: ReadonlyArray<{ key: TemplateField; label: string }> = [
  { key: 'engineering', label: 'Engineering' },
  { key: 'oil-gas', label: 'Oil & Gas' },
  { key: 'technician', label: 'Technician' },
  { key: 'construction', label: 'Construction' },
  { key: 'supervisor', label: 'Supervisor' },
  { key: 'hse', label: 'HSE & Safety' },
  { key: 'healthcare', label: 'Nursing & Healthcare' },
  { key: 'finance', label: 'Finance & Banking' },
  { key: 'sales-marketing', label: 'Sales & Marketing' },
  { key: 'hospitality', label: 'Hospitality & Retail' },
  { key: 'it', label: 'IT & Data' },
  { key: 'admin-hr', label: 'Admin & HR' },
  { key: 'logistics', label: 'Logistics & Drivers' },
  { key: 'education', label: 'Education' },
  { key: 'executive', label: 'Executive' },
  { key: 'graduate', label: 'Fresh graduate' },
]

/** How safely a template parses in an applicant tracking system. */
export type AtsLevel = 'maximum' | 'high'

export interface TemplateEntry {
  id: TemplateId
  /**
   * Bumped whenever a released template's LAYOUT changes. Stored alongside the
   * id so a revision cannot restyle resumes already delivered under the old
   * one (spec §14).
   */
  version: number
  name: string
  /** One line, shown on the picker card. */
  description: string
  /** Who it is for, shown as "Best for …". */
  recommendedFor: string[]
  /** Job families it is designed for — the picker's field filter. */
  fields: TemplateField[]
  category: TemplateCategory
  region: 'gcc'
  direction: 'ltr' | 'rtl'
  languages: string[]
  atsLevel: AtsLevel
  /**
   * Whether this template honours the user's font/size/accent/photo choices.
   * True for every engine-driven template via `applyStyleOverrides`
   * (TASK-152), and TRUE for gulf_premium since 2026-08-19 via its own small,
   * dedicated override logic (GulfPremium.tsx) — kept hand-written rather
   * than ported onto the shared engine (that port is Large, separately
   * tracked, and stays deferred; see 14_OPEN_ITEMS.md). FALSE only for
   * ats_classic, which stays fixed on purpose: "maximum ATS compatibility"
   * is the one thing it sells, and a styling control (including a photo) works
   * against that. The resume screen reads this flag to disable the controls
   * with a reason, rather than offering settings that do nothing.
   */
  styleable: boolean
  /**
   * Whether this template prints a photo at all (TASK-158). Read from the theme
   * itself where there is one, so it cannot drift from what the renderer does.
   * The resume screen hides the photo-size slider when this is false, rather than
   * offering a control with nothing to move.
   */
  allowsPhoto: boolean
  /** False until the renderer exists — the picker only offers real templates. */
  available: boolean
  /**
   * Undefined while a template is still on the roadmap. `getTemplate` falls
   * back to the default, so a stored id for an unbuilt template still renders
   * rather than throwing.
   */
  component?: (props: GulfPremiumProps) => React.JSX.Element
  /**
   * The design data an engine-driven template renders from (2026-10-04):
   * its layout, rail side and the like, for code that has to know the shape
   * of a design — which style controls apply, where its columns are. Absent
   * on the two hand-written templates.
   */
  theme?: TemplateTheme
}

/**
 * An engine-driven template's registry entry (2026-10-04): everything the
 * first fifteen spell out by hand — region, language, ATS level, styleable,
 * photo — set the same way, so a new template cannot differ from them by a
 * forgotten field. `allowsPhoto` is read from the theme, as above.
 */
function engineTemplate(
  id: TemplateId,
  theme: TemplateTheme,
  meta: Pick<TemplateEntry, 'name' | 'description' | 'recommendedFor' | 'fields' | 'category'> & { atsLevel?: AtsLevel },
): TemplateEntry {
  return {
    id,
    version: 1,
    region: 'gcc',
    direction: 'ltr',
    languages: ['en'],
    atsLevel: meta.atsLevel ?? 'high',
    available: true,
    allowsPhoto: theme.allowPhoto,
    styleable: true,
    component: makeTemplate(theme),
    theme,
    name: meta.name,
    description: meta.description,
    recommendedFor: meta.recommendedFor,
    fields: meta.fields,
    category: meta.category,
  }
}

/**
 * All seven ids exist here from the start, so a template can be built and
 * switched on by setting `available` and attaching a component — no id
 * invention later, and no chance of two developers picking different strings
 * for the same template.
 */
export const TEMPLATES: Record<TemplateId, TemplateEntry> = {
  gulf_premium: {
    id: 'gulf_premium',
    version: 1,
    name: 'Gulf Premium',
    description: 'Premium GCC professional resume',
    recommendedFor: ['Engineering', 'Management', 'Oil & Gas'],
    fields: ['engineering', 'oil-gas', 'executive'],
    category: 'professional',
    region: 'gcc',
    direction: 'ltr',
    languages: ['en'],
    atsLevel: 'high',
    available: true,
    allowsPhoto: true,
    // Styleable since 2026-08-19 (founder decision) via GulfPremium.tsx's own
    // dedicated override logic — see the `styleable` doc above.
    styleable: true,
    component: GulfPremium,
  },
  ats_classic: {
    id: 'ats_classic',
    version: 1,
    name: 'ATS Classic',
    description: 'Maximum ATS compatibility',
    recommendedFor: ['Corporate applications', 'Workday', 'LinkedIn'],
    fields: ['finance', 'it', 'admin-hr', 'engineering'],
    category: 'ats',
    region: 'gcc',
    direction: 'ltr',
    languages: ['en'],
    atsLevel: 'maximum',
    available: true,
    allowsPhoto: false,
    styleable: false,
    component: AtsClassic,
  },
  gcc_engineering: {
    id: 'gcc_engineering',
    version: 1,
    name: 'GCC Engineering',
    description: 'Built for GCC engineering careers',
    recommendedFor: ['Engineering', 'EPC', 'Oil & Gas'],
    fields: ['engineering', 'oil-gas', 'technician'],
    category: 'engineering',
    region: 'gcc',
    direction: 'ltr',
    languages: ['en'],
    atsLevel: 'high',
    available: true,
    allowsPhoto: themes.GCC_ENGINEERING.allowPhoto,
    styleable: true,
    component: makeTemplate(themes.GCC_ENGINEERING),
    theme: themes.GCC_ENGINEERING,
  },
  executive_gcc: {
    id: 'executive_gcc',
    version: 1,
    name: 'Executive GCC',
    description: 'Executive-level professional presentation',
    recommendedFor: ['Directors', 'GMs', 'VPs'],
    fields: ['executive', 'finance'],
    category: 'executive',
    region: 'gcc',
    direction: 'ltr',
    languages: ['en'],
    atsLevel: 'high',
    available: true,
    allowsPhoto: themes.EXECUTIVE_GCC.allowPhoto,
    styleable: true,
    component: makeTemplate(themes.EXECUTIVE_GCC),
    theme: themes.EXECUTIVE_GCC,
  },
  modern_professional: {
    id: 'modern_professional',
    version: 1,
    name: 'Modern Professional',
    description: 'Modern corporate resume',
    recommendedFor: ['Technology', 'Sales', 'Marketing'],
    fields: ['it', 'sales-marketing', 'admin-hr'],
    category: 'professional',
    region: 'gcc',
    direction: 'ltr',
    languages: ['en'],
    atsLevel: 'high',
    available: true,
    allowsPhoto: themes.MODERN_PROFESSIONAL.allowPhoto,
    styleable: true,
    component: makeTemplate(themes.MODERN_PROFESSIONAL),
    theme: themes.MODERN_PROFESSIONAL,
  },
  senior_compact: {
    id: 'senior_compact',
    version: 1,
    name: 'Senior Compact',
    description: 'High-density resume for experienced professionals',
    recommendedFor: ['10+ years experience'],
    fields: ['engineering', 'supervisor', 'executive'],
    category: 'senior',
    region: 'gcc',
    direction: 'ltr',
    languages: ['en'],
    atsLevel: 'high',
    available: true,
    allowsPhoto: themes.SENIOR_COMPACT.allowPhoto,
    styleable: true,
    component: makeTemplate(themes.SENIOR_COMPACT),
    theme: themes.SENIOR_COMPACT,
  },
  gulf_minimal: {
    id: 'gulf_minimal',
    version: 1,
    name: 'Gulf Minimal',
    description: 'Restrained, text-first resume',
    recommendedFor: ['Academia', 'Consulting', 'Research'],
    fields: ['education', 'admin-hr', 'finance'],
    category: 'minimal',
    region: 'gcc',
    direction: 'ltr',
    languages: ['en'],
    atsLevel: 'maximum',
    available: true,
    allowsPhoto: themes.GULF_MINIMAL.allowPhoto,
    styleable: true,
    component: makeTemplate(themes.GULF_MINIMAL),
    theme: themes.GULF_MINIMAL,
  },
  corporate_band: {
    id: 'corporate_band',
    version: 1,
    name: 'Corporate Band',
    description: 'Bold section bands, easy to scan',
    recommendedFor: ['Operations', 'Banking', 'Corporate'],
    fields: ['admin-hr', 'finance', 'logistics'],
    category: 'professional',
    region: 'gcc',
    direction: 'ltr',
    languages: ['en'],
    atsLevel: 'high',
    available: true,
    allowsPhoto: themes.CORPORATE_BAND.allowPhoto,
    styleable: true,
    component: makeTemplate(themes.CORPORATE_BAND),
    theme: themes.CORPORATE_BAND,
  },
  technical_sidebar: {
    id: 'technical_sidebar',
    version: 1,
    name: 'Technical Sidebar',
    description: 'Skills and tools in a dedicated rail',
    recommendedFor: ['Technicians', 'IT', 'Instrumentation'],
    fields: ['technician', 'it', 'engineering'],
    category: 'engineering',
    region: 'gcc',
    direction: 'ltr',
    languages: ['en'],
    atsLevel: 'high',
    available: true,
    allowsPhoto: themes.TECHNICAL_SIDEBAR.allowPhoto,
    styleable: true,
    component: makeTemplate(themes.TECHNICAL_SIDEBAR),
    theme: themes.TECHNICAL_SIDEBAR,
  },
  graduate_entry: {
    id: 'graduate_entry',
    version: 1,
    name: 'Graduate Entry',
    description: 'For early-career and first Gulf roles',
    recommendedFor: ['Graduates', 'Under 3 years experience'],
    fields: ['graduate'],
    category: 'entry',
    region: 'gcc',
    direction: 'ltr',
    languages: ['en'],
    atsLevel: 'high',
    available: true,
    allowsPhoto: themes.GRADUATE_ENTRY.allowPhoto,
    styleable: true,
    component: makeTemplate(themes.GRADUATE_ENTRY),
    theme: themes.GRADUATE_ENTRY,
  },
  portrait_right: {
    id: 'portrait_right',
    version: 1,
    name: 'Portrait Right',
    description: 'Photo on the right, no colour block',
    recommendedFor: ['Engineering', 'Operations', 'Management'],
    fields: ['engineering', 'supervisor', 'admin-hr'],
    category: 'professional',
    region: 'gcc',
    direction: 'ltr',
    languages: ['en'],
    atsLevel: 'high',
    available: true,
    allowsPhoto: themes.PORTRAIT_RIGHT.allowPhoto,
    styleable: true,
    component: makeTemplate(themes.PORTRAIT_RIGHT),
    theme: themes.PORTRAIT_RIGHT,
  },
  consultant_right: {
    id: 'consultant_right',
    version: 1,
    name: 'Consultant Right',
    description: 'Warm banded header with the photo on the right',
    recommendedFor: ['Consulting', 'Client-facing', 'Advisory'],
    fields: ['sales-marketing', 'executive'],
    category: 'professional',
    region: 'gcc',
    direction: 'ltr',
    languages: ['en'],
    atsLevel: 'high',
    available: true,
    allowsPhoto: themes.CONSULTANT_RIGHT.allowPhoto,
    styleable: true,
    component: makeTemplate(themes.CONSULTANT_RIGHT),
    theme: themes.CONSULTANT_RIGHT,
  },
  heritage_left: {
    id: 'heritage_left',
    version: 1,
    name: 'Heritage Left',
    description: 'Formal serif name on a deep navy band, photo left',
    recommendedFor: ['Directors', 'Government', 'Banking'],
    fields: ['executive', 'finance'],
    category: 'executive',
    region: 'gcc',
    direction: 'ltr',
    languages: ['en'],
    atsLevel: 'high',
    available: true,
    allowsPhoto: themes.HERITAGE_LEFT.allowPhoto,
    styleable: true,
    component: makeTemplate(themes.HERITAGE_LEFT),
    theme: themes.HERITAGE_LEFT,
  },
  project_twocol: {
    id: 'project_twocol',
    version: 1,
    name: 'Project Two-Column',
    description: 'Coloured rail on the right, reads as a project data sheet',
    recommendedFor: ['EPC', 'Projects', 'Site roles'],
    fields: ['construction', 'engineering', 'oil-gas'],
    category: 'engineering',
    region: 'gcc',
    direction: 'ltr',
    languages: ['en'],
    atsLevel: 'high',
    available: true,
    allowsPhoto: themes.PROJECT_TWOCOL.allowPhoto,
    styleable: true,
    component: makeTemplate(themes.PROJECT_TWOCOL),
    theme: themes.PROJECT_TWOCOL,
  },
  creative_gcc: {
    id: 'creative_gcc',
    version: 1,
    name: 'Creative GCC',
    description: 'Coloured rail on the left, warmest of the set',
    recommendedFor: ['Marketing', 'Design', 'Communications'],
    fields: ['sales-marketing', 'hospitality'],
    category: 'professional',
    region: 'gcc',
    direction: 'ltr',
    languages: ['en'],
    atsLevel: 'high',
    available: true,
    allowsPhoto: themes.CREATIVE_GCC.allowPhoto,
    styleable: true,
    component: makeTemplate(themes.CREATIVE_GCC),
    theme: themes.CREATIVE_GCC,
  },
  // ---- 2026-10-04 — thirty-five more (components/templates/themes.ts) ----
  desert_steel: engineTemplate('desert_steel', themes.DESERT_STEEL, {
    name: 'Desert Steel',
    description: 'Steel-blue masthead with an amber stripe; skills lead',
    recommendedFor: ['Engineers', 'Oil & Gas', 'Heavy industry'],
    fields: ['engineering', 'oil-gas'],
    category: 'engineering',
  }),
  pipeline_pro: engineTemplate('pipeline_pro', themes.PIPELINE_PRO, {
    name: 'Pipeline Pro',
    description: 'Petrol-blue photo rail with a career timeline',
    recommendedFor: ['Piping & mechanical', 'EPC', 'Oil & Gas'],
    fields: ['engineering', 'oil-gas'],
    category: 'engineering',
  }),
  blueprint_engineer: engineTemplate('blueprint_engineer', themes.BLUEPRINT_ENGINEER, {
    name: 'Blueprint Engineer',
    description: 'Light blueprint rail on the right, clean drawing-paper page',
    recommendedFor: ['Civil & structural', 'Design engineers', 'Consultants'],
    fields: ['engineering', 'construction'],
    category: 'engineering',
  }),
  power_grid: engineTemplate('power_grid', themes.POWER_GRID, {
    name: 'Power Grid',
    description: 'Indigo header card, ringed photo, skills first',
    recommendedFor: ['Electrical engineers', 'I&C', 'Utilities'],
    fields: ['engineering', 'technician'],
    category: 'engineering',
  }),
  offshore_navy: engineTemplate('offshore_navy', themes.OFFSHORE_NAVY, {
    name: 'Offshore Navy',
    description: 'Deep-navy masthead with a sea-teal stripe, photo right',
    recommendedFor: ['Offshore & marine', 'Drilling', 'Oil & Gas'],
    fields: ['oil-gas', 'engineering'],
    category: 'engineering',
  }),
  commissioning_lead: engineTemplate('commissioning_lead', themes.COMMISSIONING_LEAD, {
    name: 'Commissioning Lead',
    description: 'Centred masthead over a gold rule, skills then a timeline',
    recommendedFor: ['Commissioning', 'Start-up', 'Operations leads'],
    fields: ['engineering', 'oil-gas', 'supervisor'],
    category: 'engineering',
  }),
  field_technician: engineTemplate('field_technician', themes.FIELD_TECHNICIAN, {
    name: 'Field Technician',
    description: 'Safety-blue edge, contact strip, two-column tools list',
    recommendedFor: ['Electricians', 'Instrument technicians', 'HVAC'],
    fields: ['technician'],
    category: 'engineering',
  }),
  workshop_pro: engineTemplate('workshop_pro', themes.WORKSHOP_PRO, {
    name: 'Workshop Pro',
    description: 'Charcoal masthead with a safety-orange stripe',
    recommendedFor: ['Mechanics', 'Welders', 'Fabricators'],
    fields: ['technician', 'construction'],
    category: 'engineering',
  }),
  maintenance_master: engineTemplate('maintenance_master', themes.MAINTENANCE_MASTER, {
    name: 'Maintenance Master',
    description: 'Olive photo rail on the right with a timeline',
    recommendedFor: ['Maintenance', 'Planners', 'Plant technicians'],
    fields: ['technician', 'oil-gas'],
    category: 'engineering',
  }),
  skilled_trades: engineTemplate('skilled_trades', themes.SKILLED_TRADES, {
    name: 'Skilled Trades',
    description: 'Friendly centred layout with trade skills as pills',
    recommendedFor: ['Carpenters & masons', 'Plumbers', 'Operators & drivers'],
    fields: ['technician', 'construction', 'logistics'],
    category: 'professional',
  }),
  site_supervisor: engineTemplate('site_supervisor', themes.SITE_SUPERVISOR, {
    name: 'Site Supervisor',
    description: 'Slate masthead with a hi-vis stripe and a timeline',
    recommendedFor: ['Site supervisors', 'Foremen', 'Safety supervisors'],
    fields: ['supervisor', 'construction', 'hse'],
    category: 'professional',
  }),
  hard_hat_pro: engineTemplate('hard_hat_pro', themes.HARD_HAT_PRO, {
    name: 'Hard Hat Pro',
    description: 'Amber top edge with a tinted fact box beside the work',
    recommendedFor: ['Construction', 'Site crews', 'Safety officers'],
    fields: ['construction', 'supervisor', 'technician', 'hse'],
    category: 'professional',
  }),
  qs_precision: engineTemplate('qs_precision', themes.QS_PRECISION, {
    name: 'QS Precision',
    description: 'Light slate rail, date pills, figures-first',
    recommendedFor: ['Quantity surveyors', 'Cost engineers', 'Planners'],
    fields: ['construction', 'finance', 'engineering'],
    category: 'professional',
  }),
  hse_shield: engineTemplate('hse_shield', themes.HSE_SHIELD, {
    name: 'HSE Shield',
    description: 'Safety-green card; certifications lead',
    recommendedFor: ['HSE officers', 'Safety managers', 'Fire & safety'],
    fields: ['hse', 'construction', 'oil-gas'],
    category: 'professional',
  }),
  project_director: engineTemplate('project_director', themes.PROJECT_DIRECTOR, {
    name: 'Project Director',
    description: 'Navy masthead, gold stripe, serif capitals',
    recommendedFor: ['Project managers', 'Construction managers', 'Directors'],
    fields: ['construction', 'executive', 'engineering'],
    category: 'executive',
  }),
  ledger_classic: engineTemplate('ledger_classic', themes.LEDGER_CLASSIC, {
    name: 'Ledger Classic',
    description: 'Serif on ivory with a ledger-green surname',
    recommendedFor: ['Accountants', 'Auditors', 'Finance officers'],
    fields: ['finance'],
    category: 'professional',
  }),
  riyadh_banker: engineTemplate('riyadh_banker', themes.RIYADH_BANKER, {
    name: 'Riyadh Banker',
    description: 'Deep-green masthead with a gold stripe',
    recommendedFor: ['Banking', 'Investment', 'Relationship managers'],
    fields: ['finance', 'executive'],
    category: 'executive',
  }),
  audit_clarity: engineTemplate('audit_clarity', themes.AUDIT_CLARITY, {
    name: 'Audit Clarity',
    description: 'Text-first, light rail, initials instead of a photo',
    recommendedFor: ['Audit', 'Financial analysts', 'Multinationals'],
    fields: ['finance'],
    category: 'professional',
  }),
  cfo_signature: engineTemplate('cfo_signature', themes.CFO_SIGNATURE, {
    name: 'CFO Signature',
    description: 'Centred serif capitals over a gold rule',
    recommendedFor: ['Finance managers', 'CFOs', 'Controllers'],
    fields: ['finance', 'executive'],
    category: 'executive',
  }),
  marina_creative: engineTemplate('marina_creative', themes.MARINA_CREATIVE, {
    name: 'Marina Creative',
    description: 'Sea-teal photo rail, pill headings, a timeline',
    recommendedFor: ['Marketing', 'Communications', 'PR'],
    fields: ['sales-marketing'],
    category: 'professional',
  }),
  spotlight_sales: engineTemplate('spotlight_sales', themes.SPOTLIGHT_SALES, {
    name: 'Spotlight Sales',
    description: 'Berry masthead, round photo, contact strip',
    recommendedFor: ['Sales executives', 'Business development', 'Account managers'],
    fields: ['sales-marketing'],
    category: 'professional',
  }),
  brand_story: engineTemplate('brand_story', themes.BRAND_STORY, {
    name: 'Brand Story',
    description: 'Indigo header card with a story-like timeline',
    recommendedFor: ['Digital marketing', 'Social media', 'Content'],
    fields: ['sales-marketing', 'graduate'],
    category: 'professional',
  }),
  clinical_care: engineTemplate('clinical_care', themes.CLINICAL_CARE, {
    name: 'Clinical Care',
    description: 'Calm teal card; licences lead',
    recommendedFor: ['Registered nurses', 'Nurse specialists', 'Midwives'],
    fields: ['healthcare'],
    category: 'professional',
  }),
  medical_pearl: engineTemplate('medical_pearl', themes.MEDICAL_PEARL, {
    name: 'Medical Pearl',
    description: 'Centred serif name over a soft-blue rule',
    recommendedFor: ['Doctors', 'Pharmacists', 'Allied health'],
    fields: ['healthcare'],
    category: 'professional',
  }),
  care_compass: engineTemplate('care_compass', themes.CARE_COMPASS, {
    name: 'Care Compass',
    description: 'Soft rose photo rail with a timeline',
    recommendedFor: ['Nursing assistants', 'Caregivers', 'Patient care'],
    fields: ['healthcare', 'graduate'],
    category: 'professional',
  }),
  lab_precision: engineTemplate('lab_precision', themes.LAB_PRECISION, {
    name: 'Lab Precision',
    description: 'Lab-teal top edge, date pills; licences lead',
    recommendedFor: ['Lab technicians', 'Radiographers', 'Pharmacy technicians'],
    fields: ['healthcare', 'technician'],
    category: 'professional',
  }),
  oasis_hospitality: engineTemplate('oasis_hospitality', themes.OASIS_HOSPITALITY, {
    name: 'Oasis Hospitality',
    description: 'Warm terracotta, centred and welcoming',
    recommendedFor: ['Hotels', 'F&B', 'Front office'],
    fields: ['hospitality'],
    category: 'professional',
  }),
  retail_star: engineTemplate('retail_star', themes.RETAIL_STAR, {
    name: 'Retail Star',
    description: 'Royal-blue masthead with a sunshine stripe',
    recommendedFor: ['Retail', 'Customer service', 'Cashiers'],
    fields: ['hospitality', 'sales-marketing', 'graduate'],
    category: 'entry',
  }),
  tech_horizon: engineTemplate('tech_horizon', themes.TECH_HORIZON, {
    name: 'Tech Horizon',
    description: 'Deep-cyan rail, tech stack and timeline',
    recommendedFor: ['Software', 'Networks', 'IT support'],
    fields: ['it'],
    category: 'professional',
  }),
  data_clarity: engineTemplate('data_clarity', themes.DATA_CLARITY, {
    name: 'Data Clarity',
    description: 'Text-first, initials badge, skills lead',
    recommendedFor: ['Data & ERP analysts', 'Systems', 'Multinationals'],
    fields: ['it', 'finance', 'graduate'],
    category: 'professional',
  }),
  office_elegance: engineTemplate('office_elegance', themes.OFFICE_ELEGANCE, {
    name: 'Office Elegance',
    description: 'Burgundy and ivory, centred serif name',
    recommendedFor: ['Admin & secretaries', 'Reception', 'PRO & government relations'],
    fields: ['admin-hr'],
    category: 'professional',
  }),
  people_partner: engineTemplate('people_partner', themes.PEOPLE_PARTNER, {
    name: 'People Partner',
    description: 'Soft green rail with a timeline',
    recommendedFor: ['HR', 'Recruitment', 'Training'],
    fields: ['admin-hr'],
    category: 'professional',
  }),
  logistics_route: engineTemplate('logistics_route', themes.LOGISTICS_ROUTE, {
    name: 'Logistics Route',
    description: 'Route-blue masthead with an orange stripe',
    recommendedFor: ['Supply chain', 'Warehouse', 'Drivers'],
    fields: ['logistics'],
    category: 'professional',
  }),
  scholar_classic: engineTemplate('scholar_classic', themes.SCHOLAR_CLASSIC, {
    name: 'Scholar Classic',
    description: 'Scholarly serif with a violet top edge',
    recommendedFor: ['Teachers', 'Lecturers', 'Trainers'],
    fields: ['education'],
    category: 'minimal',
  }),
  falcon_executive: engineTemplate('falcon_executive', themes.FALCON_EXECUTIVE, {
    name: 'Falcon Executive',
    description: 'Night-navy masthead, gold stripe, serif capitals',
    recommendedFor: ['C-suite', 'General managers', 'Country heads'],
    fields: ['executive'],
    category: 'executive',
  }),
}

/** Only the templates a user can actually pick right now. */
export function availableTemplates(): TemplateEntry[] {
  return Object.values(TEMPLATES).filter((t) => t.available)
}

export function isTemplateId(value: unknown): value is TemplateId {
  return typeof value === 'string' && value in TEMPLATES
}

/**
 * Resolve a template by id, with a renderer guaranteed.
 *
 * Falls back to the default for an unknown id, a null id (every package
 * created before migration 035), or an id whose renderer is not built yet —
 * a stored package must always render, never 500. Same reasoning as
 * getPersona() in lib/ai/personas.ts.
 */
export function getTemplate(id?: string | null): TemplateEntry & {
  component: (props: GulfPremiumProps) => React.JSX.Element
} {
  const entry = isTemplateId(id) ? TEMPLATES[id] : TEMPLATES[DEFAULT_TEMPLATE_ID]
  if (entry.component) {
    return entry as TemplateEntry & { component: (props: GulfPremiumProps) => React.JSX.Element }
  }
  return TEMPLATES[DEFAULT_TEMPLATE_ID] as TemplateEntry & {
    component: (props: GulfPremiumProps) => React.JSX.Element
  }
}
