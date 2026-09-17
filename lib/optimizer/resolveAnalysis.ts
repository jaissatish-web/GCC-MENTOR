/**
 * Get the analysis for one target, from cache when it is still valid, running
 * only the model calls that are actually missing (2026-09-17). SERVER ONLY.
 *
 *   requirements  cached per (user, title, industry, advert) — the profile
 *                 plays no part in them
 *   evidence      cached with a fingerprint of the profile; recomputed the
 *                 moment the profile's text changes, so a user who adds a
 *                 missing skill sees it counted on the next analysis
 */

import type { CareerProfileFull } from '@/types/careerProfile'
import { analysisInputHash, analyzeTargetWithEvidence, bridgeEvidence, profileFingerprint, type GenerateFn } from './analyze'
import { getAnalysisByHash, saveAnalysis } from './analysisStore'
import type { JobTargetProfile, VerifiedBridge } from './types'
import { verifyBridges } from './evidence'

export interface ResolvedAnalysis {
  analysisId: string | null
  targetProfile: JobTargetProfile
  bridges: VerifiedBridge[]
  fingerprint: string
}

export interface ResolveInput {
  userId: string
  profile: CareerProfileFull
  targetJobTitle: string
  targetIndustry: string | null
  jobDescription: string | null
  generateFn: GenerateFn
  route: string
  giveUpAt?: number
}

/** True when resolving needs at least one model call. */
export async function analysisNeedsModel(input: Omit<ResolveInput, 'generateFn' | 'route' | 'giveUpAt'>): Promise<boolean> {
  const stored = await getAnalysisByHash(input.userId, analysisInputHash(input.targetJobTitle, input.targetIndustry, input.jobDescription))
  return !stored || stored.profileFingerprint !== profileFingerprint(input.profile)
}

export async function resolveAnalysis(input: ResolveInput): Promise<ResolvedAnalysis | null> {
  const hash = analysisInputHash(input.targetJobTitle, input.targetIndustry, input.jobDescription)
  const stored = await getAnalysisByHash(input.userId, hash)
  const fingerprint = profileFingerprint(input.profile)

  let targetProfile = stored?.targetProfile ?? null
  let changed = false
  let freshBridges: VerifiedBridge[] | null = null
  if (!targetProfile) {
    // First look at this job: requirements and evidence in ONE call.
    const analysed = await analyzeTargetWithEvidence({
      generateFn: input.generateFn,
      userId: input.userId,
      route: input.route,
      targetJobTitle: input.targetJobTitle,
      targetIndustry: input.targetIndustry,
      jobDescription: input.jobDescription,
      profile: input.profile,
      giveUpAt: input.giveUpAt,
    })
    if (!analysed) return null
    targetProfile = analysed.target
    freshBridges = analysed.bridges
    changed = true
  }

  let bridges: VerifiedBridge[]
  if (freshBridges) {
    bridges = freshBridges
  } else if (stored && stored.profileFingerprint === fingerprint) {
    // Cached quotes are re-verified against the profile as it is now.
    bridges = verifyBridges(input.profile, targetProfile, stored.bridges)
  } else {
    bridges = await bridgeEvidence({
      generateFn: input.generateFn,
      profile: input.profile,
      target: targetProfile,
      userId: input.userId,
      route: input.route,
      giveUpAt: input.giveUpAt,
    })
    changed = true
  }

  let analysisId = stored?.id ?? null
  if (changed) {
    analysisId =
      (await saveAnalysis({
        userId: input.userId,
        profileId: input.profile.id,
        inputHash: hash,
        targetJobTitle: input.targetJobTitle,
        targetProfile,
        bridges,
        profileFingerprint: fingerprint,
      })) ?? analysisId
  }
  return { analysisId, targetProfile, bridges, fingerprint }
}
