export const INTERVIEWERS = [
  { id: 'british-woman', name: 'Emma', label: 'British woman', region: 'British', image: '/interviewers/british-woman.webp' },
  { id: 'british-man', name: 'James', label: 'British man', region: 'British', image: '/interviewers/british-man.webp' },
  { id: 'south-asian-woman', name: 'Priya', label: 'South Asian woman', region: 'South Asian', image: '/interviewers/south-asian-woman.webp' },
  { id: 'south-asian-man', name: 'Arjun', label: 'South Asian man', region: 'South Asian', image: '/interviewers/south-asian-man.webp' },
  { id: 'arab-woman', name: 'Mariam', label: 'Arab woman', region: 'Gulf Arab', image: '/interviewers/arab-woman.webp' },
  { id: 'arab-man', name: 'Omar', label: 'Arab man', region: 'Gulf Arab', image: '/interviewers/arab-man.webp' },
] as const

export type InterviewerId = (typeof INTERVIEWERS)[number]['id']

export function isInterviewerId(value: unknown): value is InterviewerId {
  return INTERVIEWERS.some((host) => host.id === value)
}

export function getInterviewer(value: unknown) {
  return INTERVIEWERS.find((host) => host.id === value) ?? INTERVIEWERS[0]
}
