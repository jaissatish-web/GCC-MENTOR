import type { CareerProfileFull } from '@/types/careerProfile'
import type { LinkedInOutput } from '@/lib/linkedin/types'
import type { GroundingCheck } from './runTask'
import { validateGrounding } from './validateGrounding'
import { checkProseClaims, profileEvidenceText } from './proseClaims'

export function validateLinkedIn(
  profile: CareerProfileFull,
  output: LinkedInOutput,
): GroundingCheck {
  const prose = [...output.headlines, output.about].join('.\n')
  const mapped = {
    summary: { generated: prose },
    experience_blocks: output.experience.map((entry) => ({
      profile_experience_id: entry.id,
      was_optimized: true,
      generated_bullets: [entry.description],
    })),
  }
  const checked = validateGrounding(
    profile,
    mapped,
    profile.skills.map((skill) => skill.id),
  )
  const failures = checked.failures
    .filter((failure) => failure.severity === 'hard')
    .map((failure) => ({
      detail: failure.detail,
      offendingValue: failure.offendingValue,
    }))
  const claims = checkProseClaims({
    text: [prose, ...output.experience.map((entry) => entry.description)].join(
      '\n',
    ),
    evidence: profileEvidenceText(profile),
  })
  failures.push(
    ...claims
      .filter((claim) => claim.severity === 'hard')
      .map((claim) => ({
        detail: claim.detail,
        offendingValue: claim.offendingValue,
      })),
  )
  if (/\[private\]/i.test(JSON.stringify(output)))
    failures.push({
      detail: 'Private content must be omitted, not emitted as markers.',
      offendingValue: undefined,
    })
  // Paraphrase/entity flags are handled by the independent semantic fact-check.
  return { valid: failures.length === 0, failures }
}
