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

  // Driving license (migration 027, docs/GCC_READINESS_JOB_MATCH.md §5).
  // has_driving_license is nullable: null = not yet answered, false =
  // explicitly answered "no". Never conflate the two — a missing answer
  // must not silently score as "no license" (docs/GCC_READINESS_JOB_MATCH.md
  // §5's own explicit warning against penalizing every candidate without one).
  has_driving_license: boolean | null
  driving_license_country: string | null
  driving_license_category: string | null
  driving_license_validity_date: string | null // date

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
  // migration 027, docs/GCC_READINESS_JOB_MATCH.md §5 "GCC Experience".
  // null = not GCC-based work. Reuses TargetCountry — 'generic_gulf' covers
  // older resume data where the specific GCC country isn't clearly stated.
  gcc_country: TargetCountry | null
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

// ---- Extraction draft (TASK-020) -------------------------------------------
//
// CareerProfileFull is the shape of a SAVED row — it has an id, a user_id,
// timestamps, a field_visibility default, and a derived readiness score.
// None of that exists yet when a resume has just been parsed. This type is
// what extraction actually returns: a draft for the review screen
// (TASK-024), nothing persisted, nothing invented.
//
// Two categories of field are deliberately absent, not merely optional:
//
// 1. DB-owned / derived — id, user_id, created_at, updated_at,
//    field_visibility, readiness_category, readiness_score. These have no
//    meaning before a save. TASK-024 supplies field_visibility's documented
//    default; TASK-012's PUT computes readiness via TASK-014 on save.
//
// 2. Status & target — currently_in_gulf, current_employer, current_project,
//    target_job_title, target_industry, target_country, target_company. A
//    resume describes the PAST; these are the user's current situation and
//    forward-looking intent, not resume facts. The manual-entry onboarding
//    path already collects these with zero AI involvement — extraction
//    staying silent on them keeps all three onboarding paths consistent,
//    and avoids a wrong guess here silently shifting deriveCategory's
//    readiness-category classification (docs/CAREER_PROFILE.md §5) before
//    the user ever sees the number.
//
// Every remaining field is OPTIONAL, not required-per-CareerProfile.
// docs/CAREER_PROFILE.md §4: "Extraction will be roughly 85% accurate...
// the review screen is the safety net." A field extraction could not find
// is simply absent — never a fabricated placeholder, never an invented "".
//
// Child list items carry the same treatment: no id / profile_id / created_at
// (they don't exist pre-save), but DO carry sort_order — assigned as the
// item's position in extraction order, which is a real fact (the order the
// resume presented them in), not an invention.

export type CareerProfileDraftFields = Partial<
  Pick<
    CareerProfile,
    | 'full_name'
    | 'photo_url'
    | 'nationality'
    | 'date_of_birth'
    | 'passport_type'
    | 'passport_validity_date'
    | 'visa_status'
    | 'visa_transferable'
    | 'notice_period'
    | 'current_location'
    | 'phone'
    | 'whatsapp'
    | 'email'
    | 'linkedin_url'
    | 'professional_summary'
  >
>

export type DraftWorkExperience = Partial<
  Omit<ProfileWorkExperience, 'id' | 'profile_id' | 'created_at' | 'sort_order'>
> & { sort_order: number }

export type DraftSkill = Partial<Omit<ProfileSkill, 'id' | 'profile_id' | 'created_at' | 'sort_order'>> & {
  sort_order: number
}

export type DraftCertification = Partial<
  Omit<ProfileCertification, 'id' | 'profile_id' | 'created_at' | 'sort_order'>
> & { sort_order: number }

export type DraftEducation = Partial<
  Omit<ProfileEducation, 'id' | 'profile_id' | 'created_at' | 'sort_order'>
> & { sort_order: number }

export type DraftAdditionalInformation = Partial<
  Omit<ProfileAdditionalInformation, 'id' | 'profile_id' | 'created_at' | 'sort_order'>
> & { sort_order: number }

export interface CareerProfileDraft extends CareerProfileDraftFields {
  work_experience: DraftWorkExperience[]
  skills: DraftSkill[]
  certifications: DraftCertification[]
  education: DraftEducation[]
  additional_information: DraftAdditionalInformation[]
}
