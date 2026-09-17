/**
 * job_analyses reads/writes (migration 056). SERVER ONLY, service role.
 *
 * The table has no client grants, so every function here takes the caller's
 * authenticated user id and matches it in the query — that match IS the
 * ownership check. Never pass a user id taken from a request body.
 */

import { createServiceRoleClient } from '@/lib/supabase/serviceAdmin'
import type { JobTargetProfile, OptimizationMode, VerifiedBridge } from './types'
import { validateKeywords } from './jobAnalysis'

export interface StoredAnalysis {
  id: string
  profileId: string | null
  inputHash: string
  mode: OptimizationMode
  targetJobTitle: string
  targetProfile: JobTargetProfile
  bridges: VerifiedBridge[]
  profileFingerprint: string | null
}

function mapRow(r: Record<string, unknown>): StoredAnalysis | null {
  const tp = r.target_profile as JobTargetProfile | null
  if (!tp || typeof tp !== 'object' || !Array.isArray(tp.keywords)) return null
  // Re-validated on read: a stored row is data, and the engine trusts only shapes it checked.
  const keywords = validateKeywords(tp.keywords)
  if (keywords.length === 0) return null
  return {
    id: r.id as string,
    profileId: (r.profile_id as string | null) ?? null,
    inputHash: r.input_hash as string,
    mode: r.mode as OptimizationMode,
    targetJobTitle: r.target_job_title as string,
    targetProfile: { ...tp, keywords },
    bridges: Array.isArray(r.bridges) ? (r.bridges as VerifiedBridge[]) : [],
    profileFingerprint: (r.profile_fingerprint as string | null) ?? null,
  }
}

const COLUMNS = 'id, profile_id, input_hash, mode, target_job_title, target_profile, bridges, profile_fingerprint, expires_at'

export async function getAnalysisByHash(userId: string, inputHash: string): Promise<StoredAnalysis | null> {
  const { data, error } = await createServiceRoleClient()
    .from('job_analyses')
    .select(COLUMNS)
    .eq('user_id', userId)
    .eq('input_hash', inputHash)
    .gt('expires_at', new Date().toISOString())
    .maybeSingle()
  if (error) {
    console.error('job_analyses read failed user=' + userId, error.message)
    return null
  }
  return data ? mapRow(data as Record<string, unknown>) : null
}

export async function getAnalysisById(userId: string, id: string): Promise<StoredAnalysis | null> {
  const { data, error } = await createServiceRoleClient()
    .from('job_analyses')
    .select(COLUMNS)
    .eq('user_id', userId)
    .eq('id', id)
    .maybeSingle()
  if (error) {
    console.error('job_analyses read failed user=' + userId, error.message)
    return null
  }
  return data ? mapRow(data as Record<string, unknown>) : null
}

export async function saveAnalysis(opts: {
  userId: string
  profileId: string
  inputHash: string
  targetJobTitle: string
  targetProfile: JobTargetProfile
  bridges: VerifiedBridge[]
  profileFingerprint: string
}): Promise<string | null> {
  const now = new Date()
  const { data, error } = await createServiceRoleClient()
    .from('job_analyses')
    .upsert(
      {
        user_id: opts.userId,
        profile_id: opts.profileId,
        input_hash: opts.inputHash,
        mode: opts.targetProfile.mode,
        target_job_title: opts.targetJobTitle.slice(0, 300),
        target_profile: opts.targetProfile,
        bridges: opts.bridges,
        profile_fingerprint: opts.profileFingerprint,
        updated_at: now.toISOString(),
        expires_at: new Date(now.getTime() + 30 * 24 * 3600 * 1000).toISOString(),
      },
      { onConflict: 'user_id,input_hash' },
    )
    .select('id')
    .single()
  if (error) {
    console.error('job_analyses write failed user=' + opts.userId, error.message)
    return null
  }
  return (data as { id: string }).id
}
