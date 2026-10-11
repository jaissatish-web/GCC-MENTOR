import type { CareerProfileFull } from '@/types/careerProfile'
import type { LinkedInOutput } from '@/lib/linkedin/types'
import { outputShape as sharedShape, checklistKeys as sharedKeys } from '@/lib/linkedin/model'
import { PROFESSIONAL_PLATFORMS } from '@/lib/professionalProfiles/config'
export function outputShape(value: unknown, profile: CareerProfileFull, ids: string[]) {
  return sharedShape(value, profile, ids, PROFESSIONAL_PLATFORMS.naukrigulf.limits)
}
export function checklistKeys(output: LinkedInOutput, profile: CareerProfileFull) {
  return [...sharedKeys(output, profile), 'preferences', 'resume']
}
