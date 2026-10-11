import { createHash, randomUUID } from 'node:crypto'
import { createServiceRoleClient } from '@/lib/supabase/serviceAdmin'
import { createClient } from '@/lib/supabase/server'
import type { LinkedInDraft } from '@/lib/linkedin/types'

import { fingerprint as careerFingerprint } from '@/lib/linkedin/server'
import type { CareerProfileFull } from '@/types/careerProfile'
export { ownProfile, safeProfile } from '@/lib/linkedin/server'
export function fingerprint(profile: CareerProfileFull): string {
  return createHash('sha256').update(JSON.stringify([careerFingerprint(profile), profile.current_location, profile.notice_period, profile.visa_status])).digest('hex')
}
export async function readDraft(
  client: Awaited<ReturnType<typeof createClient>>,
  userId: string,
): Promise<LinkedInDraft | null> {
  const { data, error } = await client
    .from('naukrigulf_drafts')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle()
  if (error) throw new Error('NaukriGulf draft unavailable')
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
        .from('naukrigulf_drafts')
        .update(values)
        .eq('user_id', userId)
        .eq('revision', revision)
    : admin.from('naukrigulf_drafts').insert({ ...values, user_id: userId })
  const { data, error } = await query.select('*').maybeSingle()
  if (error?.code === '23505') return null
  if (error) throw new Error('NaukriGulf draft could not be saved')
  return data as LinkedInDraft | null
}
