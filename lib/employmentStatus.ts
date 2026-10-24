import type { CareerProfileFull } from '@/types/careerProfile'

/** A deferred answer is distinct from the legacy null-end-date current role. */
export interface EmploymentEndStatus {
  end_date?: unknown
  end_date_unconfirmed?: unknown
}

export function hasUnknownEmploymentEnd(role: EmploymentEndStatus): boolean {
  const blank = role.end_date == null || typeof role.end_date === 'string' && !role.end_date.trim()
  return blank && role.end_date_unconfirmed === true
}

export function employmentEndLabel(role: EmploymentEndStatus, format: (date: string) => string = date => date, currentLabel = 'Present'): string {
  if (hasUnknownEmploymentEnd(role)) return 'End date not provided'
  return typeof role.end_date === 'string' && role.end_date.trim() ? format(role.end_date) : currentLabel
}

export function employmentStatusLabel(role: EmploymentEndStatus): string {
  if (hasUnknownEmploymentEnd(role)) return 'unconfirmed — end date/current status not provided; do not describe this as a current role'
  return role.end_date ? 'ended — use past tense' : 'current role (no end date in profile)'
}

/** End dates are employment facts; an unanswered question is never current employment. */
export function employmentStatusContext(profile: Pick<CareerProfileFull, 'work_experience'>): string {
  return [
    'EMPLOYMENT STATUS — dates are authoritative. Use past tense for ended roles; say "most recent role", never "current role", for a job with an end date. A notice period does not establish current employment.',
    ...(profile.work_experience.some(hasUnknownEmploymentEnd) ? ['An unconfirmed end date/current status must not be described as ongoing employment.'] : []),
    ...profile.work_experience.map(e => `${e.role} at ${e.company}: ${hasUnknownEmploymentEnd(e) ? 'UNKNOWN — end date/current status not provided; do not claim this role is current' : e.end_date ? `ENDED ${e.end_date.slice(0, 7)}` : 'CURRENT ROLE (no end date, per the profile schema)'}.`),
  ].join('\n')
}
