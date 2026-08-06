/**
 * Career Profile schema types (TASK-011).
 *
 * Mirrors migration 010 (career_profiles) and 011 (profile child tables)
 * exactly — every column, correct nullability, and the same value sets as
 * the Postgres enums created in supabase/migrations/010_career_profiles.sql.
 *
 * Nullability rule: NOT NULL columns are required; nullable columns are
 * optional (`?`).
 */

// ---- Enums (value sets match the DB enums from migration 010) --------------

/** public.target_country_enum */
export type TargetCountry =
  | 'saudi_arabia'
  | 'uae'
  | 'qatar'
  | 'oman'
  | 'kuwait'
  | 'bahrain'
  | 'generic_gulf'

/** public.passport_type_enum */
export type PassportType = 'ECR' | 'Non-ECR'

/** public.readiness_category_enum */
export type ReadinessCategory =
  | 'currently_in_gulf'
  | 'fresher'
  | 'returner'
  | 'experienced_not_in_gulf'

// ---- field_visibility (JSONB) ---------------------------------------------

/**
 * Per-field visibility toggles stored on career_profiles.field_visibility.
 * Hiding a field never deletes data — it only controls what renders on the
 * generated resume. Keys mirror migration 010's documented default.
 */
export interface FieldVisibility {
  full_name: boolean
  photo: boolean
  nationality: boolean
  date_of_birth: boolean
  passport_type: boolean
  passport_validity: boolean
  visa_status: boolean
  visa_transferable: boolean
  notice_period: boolean
  current_location: boolean
  phone: boolean
  whatsapp: boolean
  email: boolean
  linkedin_url: boolean
  additional_information: boolean
}

// ---- career_profiles (migration 010) ---------------------------------------

export interface CareerProfile {
  id: string
  user_id: string

  // Status
  currently_in_gulf: boolean
  current_employer: string | null
  current_project: string | null

  // Target
  target_job_title: string
  target_industry: string
  target_country: TargetCountry
  target_company: string | null

  // Identity & contact
  full_name: string
  photo_url: string | null
  nationality: string | null
  date_of_birth: string | null // date
  passport_type: PassportType | null
  passport_validity_date: string | null // date
  visa_status: string | null
  visa_transferable: boolean | null
  notice_period: string | null
  current_location: string | null
  phone: string
  whatsapp: string | null
  email: string
  linkedin_url: string | null

  // Professional summary — the user's OWN summary, the source side of the
  // diff. Never holds AI output; the rewrite lives on the package.
  // Null on the manual/fresher paths, meaning "no before" (not empty).
  professional_summary: string | null

  // Visibility storage
  field_visibility: FieldVisibility

  // Derived / metadata
  readiness_category: ReadinessCategory | null
  readiness_score: number | null // 0–100
  created_at: string // timestamptz
  updated_at: string // timestamptz
}

// ---- profile_work_experience (migration 011) -------------------------------

export interface ProfileWorkExperience {
  id: string
  profile_id: string
  company: string
  role: string
  start_date: string // date
  end_date: string | null // date; null = current role
  location: string | null
  description: string | null
  highlights: string[] | null
  sort_order: number
  created_at: string
}

// ---- profile_skills (migration 011) ----------------------------------------

export interface ProfileSkill {
  id: string
  profile_id: string
  name: string
  sort_order: number // user's canonical order; never mutated by AI
  created_at: string
}

// ---- profile_certifications (migration 011) --------------------------------

export interface ProfileCertification {
  id: string
  profile_id: string
  name: string
  issuer: string | null
  issue_date: string | null // date
  expiry_date: string | null // date
  sort_order: number // user's canonical order; never mutated by AI
  created_at: string
}

// ---- profile_education (migration 011) -------------------------------------

export interface ProfileEducation {
  id: string
  profile_id: string
  degree: string
  institution: string
  field_of_study: string | null
  start_year: number | null
  end_year: number | null
  sort_order: number
  created_at: string
}

// ---- profile_additional_information (migration 011) ------------------------
// MVP scope: one section, one show/hide toggle for the whole block.

export interface ProfileAdditionalInformation {
  id: string
  profile_id: string
  label: string // AI suggests it; user can rename
  value: string
  sort_order: number
  created_at: string
}

// ---- Aggregated profile (parent + children) --------------------------------

export interface CareerProfileFull extends CareerProfile {
  work_experience: ProfileWorkExperience[]
  skills: ProfileSkill[]
  certifications: ProfileCertification[]
  education: ProfileEducation[]
  additional_information: ProfileAdditionalInformation[]
}
