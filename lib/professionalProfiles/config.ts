import { FIELD_LIMITS } from '@/lib/linkedin/types'
export type ProfessionalPlatform = 'linkedin' | 'naukrigulf'
export const PROFESSIONAL_PLATFORMS = {
  linkedin: { name: 'LinkedIn', api: '/api/linkedin', home: '/linkedin-optimization', headline: 'Headline', summary: 'About', experience: 'Experience', skills: 'Skills', limits: FIELD_LIMITS },
  naukrigulf: { name: 'NaukriGulf', api: '/api/naukrigulf', home: '/naukrigulf-optimization', headline: 'CV headline', summary: 'Profile summary', experience: 'Employment', skills: 'Key skills', limits: { headline: 200, about: 2000, experience: 1800 } },
} as const
