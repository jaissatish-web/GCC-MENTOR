import { createHash, randomUUID } from 'node:crypto'
import { createServiceRoleClient } from '@/lib/supabase/serviceAdmin'
import { createClient } from '@/lib/supabase/server'
import { loadCareerProfileFull } from '@/lib/packages/profileLoader'
import type { CareerProfileFull } from '@/types/careerProfile'
import type { LinkedInDraft } from './types'
import { candidateFacts } from './model'
import { DEFAULT_SETUP } from './types'

export async function ownProfile(
  client: Awaited<ReturnType<typeof createClient>>,
  userId: string,
) {
  const { data, error } = await client
    .from('career_profiles')
    .select('id')
    .eq('user_id', userId)
    .maybeSingle()
  if (error) throw new Error('Profile unavailable')
  return data ? loadCareerProfileFull(client, data.id as string, userId) : null
}
export function fingerprint(profile: CareerProfileFull): string {
  return createHash('sha256')
    .update(
      JSON.stringify(
        candidateFacts(profile, {
          ...DEFAULT_SETUP,
          experienceIds: profile.work_experience.map((entry) => entry.id),
        }),
      ),
    )
    .digest('hex')
}
export async function readDraft(
  client: Awaited<ReturnType<typeof createClient>>,
  userId: string,
): Promise<LinkedInDraft | null> {
  const { data, error } = await client
    .from('linkedin_drafts')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle()
  if (error) throw new Error('LinkedIn draft unavailable')
  return data as LinkedInDraft | null
}
/** Optimistic revision prevents edits/imports in another tab being overwritten. */
export async function writeDraft(
  userId: string,
  revision: string | null,
  patch: Partial<LinkedInDraft>,
): Promise<LinkedInDraft | null> {
  const values = {
    ...patch,
    revision: randomUUID(),
    updated_at: new Date().toISOString(),
  }
  const admin = createServiceRoleClient()
  const query = revision
    ? admin
        .from('linkedin_drafts')
        .update(values)
        .eq('user_id', userId)
        .eq('revision', revision)
    : admin.from('linkedin_drafts').insert({ ...values, user_id: userId })
  const { data, error } = await query.select('*').maybeSingle()
  if (error?.code === '23505') return null
  if (error) throw new Error('LinkedIn draft could not be saved')
  return data as LinkedInDraft | null
}
export function safeProfile(
  profile: CareerProfileFull,
  ids: string[],
): CareerProfileFull {
  return {
    ...profile,
    professional_summary: profile.professional_summary,
    work_experience: profile.work_experience.filter((entry) =>
      ids.includes(entry.id),
    ),
    additional_information: [],
    current_project: null,
    current_employer: null,
    target_job_title: null,
  }
}
