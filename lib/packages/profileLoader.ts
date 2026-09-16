import type { createClient } from '@/lib/supabase/server'
import type {
  CareerProfile,
  CareerProfileFull,
  ProfileAdditionalInformation,
  ProfileCertification,
  ProfileEducation,
  ProfileSkill,
  ProfileWorkExperience,
} from '@/types/careerProfile'

type SessionClient = Awaited<ReturnType<typeof createClient>>

const CHILD_TABLES = [
  'profile_work_experience',
  'profile_skills',
  'profile_certifications',
  'profile_education',
  'profile_additional_information',
] as const

/**
 * A profile read that did not complete. Thrown rather than returned as empty
 * data, because an AI service handed a profile with its work history silently
 * missing writes a worse — and less grounded — result than no result (audit M04).
 * `table` is safe to log; it never carries a field value.
 */
export class ProfileLoadError extends Error {
  constructor(readonly table: string) {
    super('Could not read your full Career Profile (' + table + ').')
    this.name = 'ProfileLoadError'
  }
}

/**
 * Load one profile and all five child collections for the signed-in caller,
 * using THEIR session (so owner RLS applies) and scoping the parent to both the
 * profile id and the caller's user id.
 *
 * Returns null when the profile does not exist or is not the caller's. Throws
 * ProfileLoadError when any part of the read fails.
 *
 * Replaces three hand-copied loaders (cover letter, Q&A, mock start) whose child
 * reads turned a failed query into an empty list.
 */
export async function loadCareerProfileFull(
  supabase: SessionClient,
  profileId: string,
  userId: string,
): Promise<CareerProfileFull | null> {
  const { data: profileRow, error: profileError } = await supabase
    .from('career_profiles')
    .select('*')
    .eq('id', profileId)
    .eq('user_id', userId)
    .maybeSingle()

  if (profileError) throw new ProfileLoadError('career_profiles')
  if (!profileRow) return null

  const results = await Promise.all(
    CHILD_TABLES.map(async (table) => {
      const { data, error } = await supabase.from(table).select('*').eq('profile_id', profileId)
      if (error || data === null) throw new ProfileLoadError(table)
      return data as unknown[]
    }),
  )
  const [work_experience, skills, certifications, education, additional_information] = results

  return {
    ...(profileRow as CareerProfile),
    work_experience: work_experience as ProfileWorkExperience[],
    skills: skills as ProfileSkill[],
    certifications: certifications as ProfileCertification[],
    education: education as ProfileEducation[],
    additional_information: additional_information as ProfileAdditionalInformation[],
  }
}
