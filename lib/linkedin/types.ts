export type LinkedInSource = 'career' | 'paste' | 'upload'
export interface LinkedInSetup {
  source: LinkedInSource
  mode: 'existing' | 'new'
  goal: 'job' | 'promotion' | 'change' | 'presence'
  targetRoles: string
  industries: string
  countries: string
  language: 'English' | 'Arabic'
  tone: 'professional' | 'approachable' | 'technical'
  experienceIds: string[]
  jobDescriptions: string
  instructions: string
  omitTerms: string[]
}
export interface LinkedInImport {
  id: string
  fullName: string
  summary: string
  experience: Array<{
    company: string
    role: string
    start: string | null
    end: string | null
    description: string
  }>
  warnings: string[]
}
export interface LinkedInConflict {
  id: string
  label: string
  profileValue: string
  importedValue: string
}
export interface LinkedInOutput {
  headlines: string[]
  about: string
  experience: Array<{ id: string; description: string }>
  skills: string[]
  advice: string[]
}
export interface LinkedInDraft {
  user_id: string
  revision: string
  imported: LinkedInImport | null
  setup: LinkedInSetup | null
  output: LinkedInOutput | null
  selected_headline: number
  completed: string[]
  skipped: string[]
  profile_fingerprint: string | null
  updated_at: string
}
export const FIELD_LIMITS = {
  headline: 200,
  about: 2400,
  experience: 1800,
} as const
export const DEFAULT_SETUP: LinkedInSetup = {
  source: 'career',
  mode: 'existing',
  goal: 'job',
  targetRoles: '',
  industries: '',
  countries: '',
  language: 'English',
  tone: 'professional',
  experienceIds: [],
  jobDescriptions: '',
  instructions: '',
  omitTerms: [],
}
