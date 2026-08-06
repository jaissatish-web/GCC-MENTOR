import GulfPremium from '@/components/templates/GulfPremium'
import type { GulfPremiumProps } from '@/components/templates/GulfPremium'

/**
 * Template registry (TASK-031).
 *
 * MVP ships exactly ONE template. Multiple selectable templates are a Phase 2
 * feature (docs/RULES.md §4) — do not add a second entry here to "prepare"
 * for that. The registry exists so the PDF route (TASK-030) and the DOCX
 * route (TASK-032) resolve the template by id rather than importing the
 * component directly, which is what makes adding Phase 2 templates a
 * data change rather than a rewrite.
 *
 * This also closes docs/TASKS.md Unplanned #2: the previous build's registry
 * and its template UI disagreed about how many templates existed. There is
 * one, it is named here, and nothing else is exposed.
 */

export const MVP_TEMPLATE_ID = 'gulf_premium' as const

export type TemplateId = typeof MVP_TEMPLATE_ID

export interface TemplateEntry {
  id: TemplateId
  /** Shown in UI copy if a template is ever named to the user. */
  label: string
  component: (props: GulfPremiumProps) => React.JSX.Element
}

export const TEMPLATES: Record<TemplateId, TemplateEntry> = {
  [MVP_TEMPLATE_ID]: {
    id: MVP_TEMPLATE_ID,
    label: 'Gulf Premium',
    component: GulfPremium,
  },
}

/**
 * Resolve a template by id. Falls back to the MVP template for an unknown id
 * rather than throwing — a stored package referencing a retired template must
 * still render, never 500. Same reasoning as getPersona() in lib/ai/personas.ts.
 */
export function getTemplate(id?: string | null): TemplateEntry {
  if (id && id in TEMPLATES) return TEMPLATES[id as TemplateId]
  return TEMPLATES[MVP_TEMPLATE_ID]
}
