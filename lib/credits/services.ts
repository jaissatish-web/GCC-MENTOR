export const CREDIT_SERVICES = {
  optimization: 'Resume Optimizer',
  cover_letter: 'Cover Letter',
  interview_qa: 'Interview Q&A',
  mock_interview_start: 'AI Mock Interview',
} as const

export type CreditService = keyof typeof CREDIT_SERVICES

export function isCreditService(service: string): service is CreditService {
  return Object.hasOwn(CREDIT_SERVICES, service)
}
