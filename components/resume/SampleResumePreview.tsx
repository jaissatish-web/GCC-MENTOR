import { getTemplate, type TemplateId } from '@/lib/templates'
import { SAMPLE_RESUME_DOCUMENT, SAMPLE_TEMPLATE_SCALES } from '@/lib/sampleResume'
import type { GulfPremiumProps } from '@/components/templates/GulfPremium'

/** One sample, one renderer for gallery thumbnails, readers and the landing orbit. */
export function SampleResumePreview({ templateId }: { templateId: TemplateId }) {
  const Template = getTemplate(templateId).component
  return <Template {...({
    document: SAMPLE_RESUME_DOCUMENT,
    showcaseScale: SAMPLE_TEMPLATE_SCALES[templateId] ?? 1,
  } as GulfPremiumProps)} />
}
