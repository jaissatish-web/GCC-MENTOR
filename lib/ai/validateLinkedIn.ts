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
  const location = derivedLocationClaim(
    [prose, ...output.experience.map((entry) => entry.description)].join('\n'),
    profile,
  )
  if (location)
    failures.push({
      detail: location,
      offendingValue: undefined,
    })
  if (/\[private\]/i.test(JSON.stringify(output)))
    failures.push({
      detail: 'Private content must be omitted, not emitted as markers.',
      offendingValue: undefined,
    })
  // Paraphrase/entity flags are handled by the independent semantic fact-check.
  return { valid: failures.length === 0, failures }
}

/**
 * A candidate's base (city/country/visa) must never be inferred from an
 * employer, a project site or a client location. Only an explicit current
 * location or living-in-Gulf status makes a residence claim safe.
 */
export function derivedLocationClaim(
  text: string,
  profile: CareerProfileFull,
): string | null {
  const explicit = [
    profile.current_location,
    profile.currently_in_gulf ? (profile.current_location ?? 'Gulf') : null,
  ]
    .filter(Boolean)
    .join(' ')
    .toLocaleLowerCase()
  if (!explicit) return null
  const pattern =
    /\b(?:currently based (?:in|at)|based (?:in|at)|relocated to|currently (?:in|living in|staying in|residing in)|resident (?:of|in))\s+([A-Za-z][A-Za-z\s-]{1,40}?)\b/gi
  let caught: string[] = []
  let match: RegExpExecArray | null
  while ((match = pattern.exec(text))) {
    const place = match[1]
      .trim()
      .replace(/[.,;)$]+$/u, '')
      .toLocaleLowerCase()
    if (!place || explicit.includes(place)) continue
    caught.push(match[1].trim())
    // One unsupported claim is enough to fail; keep reporting the first.
    break
  }
  return caught.length
    ? `The generated text claims the candidate is based in "${caught[0]}", but Career Profile states "${profile.current_location ?? 'no current location'}". Location must never be inferred from a project or employer — update Career Profile, then prepare again.`
    : null
}
