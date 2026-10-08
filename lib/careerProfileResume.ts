import { buildResumeDocument } from '@/lib/resumeDocument'
import type { CareerProfileFull } from '@/types/careerProfile'

export const CAREER_RESUME_NAME = 'My Career Profile Resume'
export const CAREER_RESUME_BADGE = 'Raw Career Profile Data'

/** Source identity survives renaming; never infer it from empty AI content. */
export function isCareerProfileResume(pkg: { tier?: string | null }): boolean {
  return pkg.tier === 'free'
}

/** No snapshot, rewrite, relevance order or stale visibility from a package. */
export function buildCareerProfileResume(profile: CareerProfileFull) {
  return buildResumeDocument({
    profile,
    optimizedContent: {
      summary: { generated: '', source_profile_summary: '' },
      // The shared renderer normally shows highlights only. Include the profile
      // editor's separate "What you did" field as well. user_edited_bullets is
      // an in-memory adapter here (never stored) and preserves own punctuation.
      experience_blocks: (profile.work_experience ?? []).map((role) => ({
        profile_experience_id: role.id,
        was_optimized: false,
        source_bullets: [],
        user_edited_bullets: [...new Set([
          ...(role.description ?? '').split(/\r?\n/),
          ...(role.highlights ?? []),
        ].filter((line) => line.trim() !== ''))],
      })),
    },
    skillsOrder: [],
    fieldVisibility: profile.field_visibility,
    targetJobTitle: profile.target_job_title,
  })
}
