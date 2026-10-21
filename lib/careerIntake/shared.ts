import type { CareerProfileDraft } from '@/types/careerProfile'
import { profileTextPresent, validProfileEmail, validProfilePhone } from '@/lib/profileFieldValidity'
import { calculateReadiness } from '@/lib/readiness'
import type { ParseReport } from '@/lib/resumeParse/pipeline'

export const INTAKE_KEY = 'career_intake_v1'
export const COUNTRY_OPTIONS = [
  { value: 'generic_gulf', label: 'Open to all six Gulf countries' },
  { value: 'saudi_arabia', label: 'Saudi Arabia' }, { value: 'uae', label: 'United Arab Emirates' },
  { value: 'qatar', label: 'Qatar' }, { value: 'oman', label: 'Oman' },
  { value: 'kuwait', label: 'Kuwait' }, { value: 'bahrain', label: 'Bahrain' },
]
export interface IntakeContext {
  currentLocation: string
  currentlyInGulf: boolean | null
  hasGulfExperience: boolean | null
  careerStage: 'experienced' | 'fresher' | ''
  targetCountry: string
  profession: string
  passportStatus: 'available' | 'in_progress' | 'not_available' | ''
  passportExpiry: string
  dateOfBirth: string
  visaStatus: string
  availability: string
  noFormalQualification?: boolean
}
export interface CareerIntake {
  version: 1
  draft: CareerProfileDraft
  resumeText: string
  report: ParseReport
  context: IntakeContext
}
export function latestRole(draft: CareerProfileDraft): string {
  return [...draft.work_experience].sort((a,b) => String(b.start_date ?? '').localeCompare(String(a.start_date ?? '')))[0]?.role?.trim() ?? ''
}
export function contextFromDraft(d: CareerProfileDraft): IntakeContext {
  return { currentLocation: d.current_location ?? '', currentlyInGulf: null, hasGulfExperience: null,
    careerStage: d.work_experience.length ? 'experienced' : '', targetCountry: '', profession: latestRole(d),
    passportStatus: d.passport_validity_date ? 'available' : '', passportExpiry: d.passport_validity_date ?? '',
    dateOfBirth: d.date_of_birth ?? '', visaStatus: d.visa_status ?? '', availability: d.notice_period ?? '' }
}
/** Explicit answers win. This changes one draft, never historical titles or an existing profile. */
export function applyIntakeAnswers(d: CareerProfileDraft, c: IntakeContext): CareerProfileDraft {
  return { ...d, current_location: c.currentLocation || d.current_location,
    passport_validity_date: c.passportStatus==='not_available'||c.passportStatus==='in_progress' ? undefined : c.passportExpiry || d.passport_validity_date,
    date_of_birth: c.dateOfBirth || d.date_of_birth, visa_status: c.visaStatus || d.visa_status,
    notice_period: c.availability || d.notice_period,
    additional_information: [
      ...d.additional_information.filter(x => !['Gulf work experience','Career stage','Passport preparation','Education status'].includes(x.label ?? '')),
      ...(c.hasGulfExperience !== null ? [{ label:'Gulf work experience', value:c.hasGulfExperience ? 'Yes' : 'No', sort_order: 900,category_name:'Preparation details (private)',show_on_resume:false }] : []),
      ...(c.careerStage ? [{ label:'Career stage', value:c.careerStage==='experienced'?'Experienced professional':'Fresher', sort_order:901,category_name:'Preparation details (private)',show_on_resume:false }] : []),
      ...(c.noFormalQualification ? [{label:'Education status',value:'No formal qualification',sort_order:903,category_name:'Preparation details (private)',show_on_resume:false}]:[]),
      ...(c.passportStatus ? [{ label:'Passport preparation', value:({available:'Passport available',in_progress:'Application or renewal in progress',not_available:'No passport yet'} as const)[c.passportStatus], sort_order:902,category_name:'Preparation details (private)',show_on_resume:false }] : []),
    ] }
}
export function contextFromProfile(p: { current_location?: string | null; target_country?: string | null; target_job_title?: string | null; passport_validity_date?: string | null; date_of_birth?: string | null; visa_status?: string | null; notice_period?: string | null; currently_in_gulf?: boolean; additional_information?: Array<{label?:string|null;value?:string|null}> | null; work_experience?: unknown[] | null }): IntakeContext {
  const get=(label:string)=>p.additional_information?.find(x=>x.label===label)?.value
  return { currentLocation:p.current_location??'', currentlyInGulf:p.currently_in_gulf??null,
    hasGulfExperience:get('Gulf work experience')==='Yes'?true:get('Gulf work experience')==='No'?false:null,
    careerStage:['fresher'].includes((get('Career stage')??'').toLowerCase())?'fresher':['experienced','experienced professional'].includes((get('Career stage')??'').toLowerCase())||p.work_experience?.length?'experienced':'',
    targetCountry:p.target_country??'', profession:p.target_job_title??'', passportExpiry:p.passport_validity_date??'',
    passportStatus:({'Passport available':'available','Application or renewal in progress':'in_progress','No passport yet':'not_available',available:'available',in_progress:'in_progress',not_available:'not_available'} as Record<string,IntakeContext['passportStatus']>)[get('Passport preparation')??''] || (p.passport_validity_date?'available':''),
    noFormalQualification:get('Education status')==='No formal qualification',
    dateOfBirth:p.date_of_birth??'', visaStatus:p.visa_status??'', availability:p.notice_period??'' }
}
export function intakeProfileReadiness(d: CareerProfileDraft,c:IntakeContext) {
  const merged=applyIntakeAnswers(d,c)
  return calculateReadiness({ ...merged, currently_in_gulf:c.currentlyInGulf===true, no_formal_qualification:c.noFormalQualification, career_stage:c.careerStage, work_experience:merged.work_experience.map(w=>({...w,start_date:w.start_date??'',company:w.company??'',role:w.role??''})) })
}
export function missingContact(d: CareerProfileDraft): Array<'full_name'|'email'|'phone'> {
  return [!profileTextPresent(d.full_name)?'full_name':null,!validProfileEmail(d.email)?'email':null,!validProfilePhone(d.phone)?'phone':null].filter(Boolean) as Array<'full_name'|'email'|'phone'>
}
