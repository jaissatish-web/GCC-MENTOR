import type { CareerProfileFull } from '@/types/careerProfile'

/** End dates are employment facts; a target role or notice period cannot override them. */
export function employmentStatusContext(profile: Pick<CareerProfileFull, 'work_experience'>): string {
  return [
    'EMPLOYMENT STATUS — dates are authoritative. Use past tense for ended roles; say "most recent role", never "current role", for a job with an end date. A notice period does not establish current employment.',
    ...profile.work_experience.map(e => `${e.role} at ${e.company}: ${e.end_date ? `ENDED ${e.end_date.slice(0, 7)}` : 'CURRENT ROLE (no end date, per the profile schema)'}.`),
  ].join('\n')
}
