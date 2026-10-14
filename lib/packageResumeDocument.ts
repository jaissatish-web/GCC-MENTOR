import { buildCareerProfileResume, isCareerProfileResume } from '@/lib/careerProfileResume'
import { applyLivePhotoToDocument, applyTargetTitleToDocument, buildResumeDocument, type ResumeDocument } from '@/lib/resumeDocument'
import type { CareerProfileFull, FieldVisibility } from '@/types/careerProfile'
import type { OptimizedContent } from '@/types/package'

export interface ResumePackageSource {
  tier?: string | null
  target_job_title?: string | null
  optimized_content?: OptimizedContent | null
  skills_order?: string[] | null
  field_visibility_snapshot?: Partial<FieldVisibility> | null
  document_snapshot?: ResumeDocument | null
}

/** One content decision for preview, PDF and Word. Signing photos is a caller's concern. */
export function resolvePackageResumeDocument(pkg: ResumePackageSource, profile: CareerProfileFull): ResumeDocument {
  if (isCareerProfileResume(pkg)) return buildCareerProfileResume(profile)
  if (pkg.document_snapshot) {
    return applyTargetTitleToDocument(
      applyLivePhotoToDocument(pkg.document_snapshot, profile.photo_url, pkg.field_visibility_snapshot),
      pkg.target_job_title,
    )
  }
  return buildResumeDocument({
    profile,
    optimizedContent: pkg.optimized_content ?? { summary: { generated: '', source_profile_summary: '' }, experience_blocks: [] },
    skillsOrder: pkg.skills_order ?? [],
    fieldVisibility: pkg.field_visibility_snapshot,
    targetJobTitle: pkg.target_job_title,
  })
}
