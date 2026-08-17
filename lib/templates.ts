import GulfPremium from '@/components/templates/GulfPremium'
import AtsClassic from '@/components/templates/AtsClassic'
import { makeTemplate } from '@/components/templates/engine'
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
  category: TemplateCategory
  region: 'gcc'
  direction: 'ltr' | 'rtl'
  languages: string[]
  atsLevel: AtsLevel
  /**
   * Whether this template honours the user's font/size/accent choices
   * (TASK-152). True for every engine-driven template. FALSE for gulf_premium
   * and ats_classic, which are hand-written with an explicit face and size on
   * each element, so there is nothing for an override to reach. The resume
   * screen reads this to disable the controls with a reason, rather than
   * offering settings that do nothing.
   */
  styleable: boolean
  /** False until the renderer exists — the picker only offers real templates. */
  available: boolean
  /**
   * Undefined while a template is still on the roadmap. `getTemplate` falls
   * back to the default, so a stored id for an unbuilt template still renders
   * rather than throwing.
   */
  component?: (props: GulfPremiumProps) => React.JSX.Element
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
    category: 'professional',
    region: 'gcc',
    direction: 'ltr',
    languages: ['en'],
    atsLevel: 'high',
    available: true,
    styleable: false,
    component: GulfPremium,
  },
  ats_classic: {
    id: 'ats_classic',
    version: 1,
    name: 'ATS Classic',
    description: 'Maximum ATS compatibility',
    recommendedFor: ['Corporate applications', 'Workday', 'LinkedIn'],
    category: 'ats',
    region: 'gcc',
    direction: 'ltr',
    languages: ['en'],
    atsLevel: 'maximum',
    available: true,
    styleable: false,
    component: AtsClassic,
  },
  gcc_engineering: {
    id: 'gcc_engineering',
    version: 1,
    name: 'GCC Engineering',
    description: 'Built for GCC engineering careers',
    recommendedFor: ['Engineering', 'EPC', 'Oil & Gas'],
    category: 'engineering',
    region: 'gcc',
    direction: 'ltr',
    languages: ['en'],
    atsLevel: 'high',
    available: true,
    styleable: true,
    component: makeTemplate(themes.GCC_ENGINEERING),
  },
  executive_gcc: {
    id: 'executive_gcc',
    version: 1,
    name: 'Executive GCC',
    description: 'Executive-level professional presentation',
    recommendedFor: ['Directors', 'GMs', 'VPs'],
    category: 'executive',
    region: 'gcc',
    direction: 'ltr',
    languages: ['en'],
    atsLevel: 'high',
    available: true,
    styleable: true,
    component: makeTemplate(themes.EXECUTIVE_GCC),
  },
  modern_professional: {
    id: 'modern_professional',
    version: 1,
    name: 'Modern Professional',
    description: 'Modern corporate resume',
    recommendedFor: ['Technology', 'Sales', 'Marketing'],
    category: 'professional',
    region: 'gcc',
    direction: 'ltr',
    languages: ['en'],
    atsLevel: 'high',
    available: true,
    styleable: true,
    component: makeTemplate(themes.MODERN_PROFESSIONAL),
  },
  senior_compact: {
    id: 'senior_compact',
    version: 1,
    name: 'Senior Compact',
    description: 'High-density resume for experienced professionals',
    recommendedFor: ['10+ years experience'],
    category: 'senior',
    region: 'gcc',
    direction: 'ltr',
    languages: ['en'],
    atsLevel: 'high',
    available: true,
    styleable: true,
    component: makeTemplate(themes.SENIOR_COMPACT),
  },
  gulf_minimal: {
    id: 'gulf_minimal',
    version: 1,
    name: 'Gulf Minimal',
    description: 'Restrained, text-first resume',
    recommendedFor: ['Academia', 'Consulting', 'Research'],
    category: 'minimal',
    region: 'gcc',
    direction: 'ltr',
    languages: ['en'],
    atsLevel: 'maximum',
    available: true,
    styleable: true,
    component: makeTemplate(themes.GULF_MINIMAL),
  },
  corporate_band: {
    id: 'corporate_band',
    version: 1,
    name: 'Corporate Band',
    description: 'Bold section bands, easy to scan',
    recommendedFor: ['Operations', 'Banking', 'Corporate'],
    category: 'professional',
    region: 'gcc',
    direction: 'ltr',
    languages: ['en'],
    atsLevel: 'high',
    available: true,
    styleable: true,
    component: makeTemplate(themes.CORPORATE_BAND),
  },
  technical_sidebar: {
    id: 'technical_sidebar',
    version: 1,
    name: 'Technical Sidebar',
    description: 'Skills and tools in a dedicated rail',
    recommendedFor: ['Technicians', 'IT', 'Instrumentation'],
    category: 'engineering',
    region: 'gcc',
    direction: 'ltr',
    languages: ['en'],
    atsLevel: 'high',
    available: true,
    styleable: true,
    component: makeTemplate(themes.TECHNICAL_SIDEBAR),
  },
  graduate_entry: {
    id: 'graduate_entry',
    version: 1,
    name: 'Graduate Entry',
    description: 'For early-career and first Gulf roles',
    recommendedFor: ['Graduates', 'Under 3 years experience'],
    category: 'entry',
    region: 'gcc',
    direction: 'ltr',
    languages: ['en'],
    atsLevel: 'high',
    available: true,
    styleable: true,
    component: makeTemplate(themes.GRADUATE_ENTRY),
  },
  portrait_right: {
    id: 'portrait_right',
    version: 1,
    name: 'Portrait Right',
    description: 'Photo on the right, no colour block',
    recommendedFor: ['Engineering', 'Operations', 'Management'],
    category: 'professional',
    region: 'gcc',
    direction: 'ltr',
    languages: ['en'],
    atsLevel: 'high',
    available: true,
    styleable: true,
    component: makeTemplate(themes.PORTRAIT_RIGHT),
  },
  consultant_right: {
    id: 'consultant_right',
    version: 1,
    name: 'Consultant Right',
    description: 'Warm banded header with the photo on the right',
    recommendedFor: ['Consulting', 'Client-facing', 'Advisory'],
    category: 'professional',
    region: 'gcc',
    direction: 'ltr',
    languages: ['en'],
    atsLevel: 'high',
    available: true,
    styleable: true,
    component: makeTemplate(themes.CONSULTANT_RIGHT),
  },
  heritage_left: {
    id: 'heritage_left',
    version: 1,
    name: 'Heritage Left',
    description: 'Formal serif name on a deep navy band, photo left',
    recommendedFor: ['Directors', 'Government', 'Banking'],
    category: 'executive',
    region: 'gcc',
    direction: 'ltr',
    languages: ['en'],
    atsLevel: 'high',
    available: true,
    styleable: true,
    component: makeTemplate(themes.HERITAGE_LEFT),
  },
  project_twocol: {
    id: 'project_twocol',
    version: 1,
    name: 'Project Two-Column',
    description: 'Coloured rail on the right, reads as a project data sheet',
    recommendedFor: ['EPC', 'Projects', 'Site roles'],
    category: 'engineering',
    region: 'gcc',
    direction: 'ltr',
    languages: ['en'],
    atsLevel: 'high',
    available: true,
    styleable: true,
    component: makeTemplate(themes.PROJECT_TWOCOL),
  },
  creative_gcc: {
    id: 'creative_gcc',
    version: 1,
    name: 'Creative GCC',
    description: 'Coloured rail on the left, warmest of the set',
    recommendedFor: ['Marketing', 'Design', 'Communications'],
    category: 'professional',
    region: 'gcc',
    direction: 'ltr',
    languages: ['en'],
    atsLevel: 'high',
    available: true,
    styleable: true,
    component: makeTemplate(themes.CREATIVE_GCC),
  },
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
