import type { FieldVisibility } from '@/types/careerProfile'

/**
 * Shared default `field_visibility` map (docs/CAREER_PROFILE.md §2): every
 * field defaults to shown EXCEPT `date_of_birth` and `passport_type`, which
 * default to hidden.
 *
 * The single source for this default, reused by both:
 *   - /profile (TASK-024) — the editor's initial `field_visibility` state
 *   - /profile/visibility (TASK-025) — when no saved value exists / a key is
 *     absent from the stored map
 * so the two screens can never drift. Mirrors the fallback object inside
 * app/api/profile/visibility/route.ts (keep in step by hand).
 *
 * The key name set is EXACTLY FieldVisibility — `photo` not `photo_url`,
 * `passport_validity` not `passport_validity_date`. There is deliberately no
 * `professional_summary` key (core resume content, no toggle).
 */
export const DEFAULT_FIELD_VISIBILITY: FieldVisibility = {
  full_name: true,
  photo: true,
  nationality: true,
  date_of_birth: false,
  passport_type: false,
  passport_validity: true,
  visa_status: true,
  visa_transferable: true,
  notice_period: true,
  current_location: true,
  phone: true,
  whatsapp: true,
  email: true,
  linkedin_url: true,
  additional_information: true,
}
