import type { CareerProfileFull } from '@/types/careerProfile'
import { DEFAULT_FIELD_VISIBILITY } from '@/lib/fieldVisibility'
import { HEADLINE_CATEGORY, HEADLINE_LABEL } from '@/lib/resumeHeadline'

/** Invented review fixtures only; never fetch or imitate a customer's CV. */
export const SAMPLE_PROFESSIONS = [
  ['Instrumentation Engineer', 'Loop checking', 'DCS commissioning', 'Cause & effect'],
  ['Mechanical Engineer', 'Rotating equipment', 'Preventive maintenance', 'Piping inspection'],
  ['Electrical Engineer', 'Switchgear testing', 'Power distribution', 'Protection relays'],
  ['Civil Engineer', 'Site execution', 'Concrete inspection', 'AutoCAD'],
  ['HSE Officer', 'Risk assessment', 'Permit to work', 'Safety training'],
  ['QA/QC Inspector', 'Inspection plans', 'Quality documentation', 'Nonconformance review'],
  ['Site Supervisor', 'Workforce coordination', 'Progress reporting', 'Site safety'],
  ['Maintenance Technician', 'Fault finding', 'Equipment servicing', 'Work orders'],
  ['Registered Nurse', 'Patient assessment', 'Care planning', 'Clinical documentation'],
  ['Physician', 'Clinical assessment', 'Patient management', 'Medical documentation'],
  ['Accountant', 'Financial reporting', 'Reconciliation', 'ERP systems'],
  ['Finance Manager', 'Budgeting', 'Financial controls', 'Cash flow planning'],
  ['Software Engineer', 'TypeScript', 'API development', 'Automated testing'],
  ['Data Analyst', 'SQL', 'Data visualization', 'Data validation'],
  ['Sales Executive', 'Client relationships', 'Sales proposals', 'CRM'],
  ['HR Specialist', 'Recruitment coordination', 'Employee relations', 'HRIS'],
  ['Hotel Operations Supervisor', 'Guest services', 'Shift planning', 'Service standards'],
  ['Logistics Coordinator', 'Inventory control', 'Shipment tracking', 'Supplier coordination'],
  ['Teacher', 'Lesson planning', 'Student assessment', 'Classroom management'],
  ['Project Manager', 'Project planning', 'Stakeholder reporting', 'Risk management'],
] as const

export const SAMPLE_PATTERNS = ['Graduate', 'Early career', 'Experienced', 'Senior', 'Long career'] as const
const COUNTRIES = ['Saudi Arabia', 'United Arab Emirates', 'Qatar', 'Oman', 'Kuwait', 'Bahrain']
const uuid = (n: number) => `10000000-0000-4000-8000-${String(n).padStart(12, '0')}`

/** 20 professions × 5 career patterns × 20 content variations = 2,000 cases. */
export function makeQualitySample(profession: number, pattern: number, variation: number): CareerProfileFull {
  const [role, ...skills] = SAMPLE_PROFESSIONS[profession % SAMPLE_PROFESSIONS.length]
  const caseId = profession * 100 + pattern * 20 + variation
  const profileId = uuid(caseId + 1)
  const now = '2026-10-14T00:00:00.000Z'
  const country = COUNTRIES[variation % COUNTRIES.length]
  const title = pattern === 0 ? `Graduate · ${role}` : pattern >= 3 ? `Senior ${role}` : role
  const headline = variation === 19 ? `${title} · Operations, Delivery and Cross-functional Coordination` : title
  const entry = (n: number) => ({ id: uuid(10000 + caseId * 100 + n), profile_id: profileId, sort_order: n, created_at: now })
  const roleCount = [0, 1, 3, 7, 10][pattern % 5]
  return {
    id: profileId, user_id: uuid(caseId + 3000), created_at: now, updated_at: now,
    currently_in_gulf: true, current_employer: null, current_project: null,
    target_job_title: null, target_industry: null, target_country: 'generic_gulf', target_company: null,
    full_name: variation === 18 ? 'Aisha Noor Rahman Al-Hassan · عائشة' : 'Aisha Rahman',
    photo_url: null, nationality: 'Indian', date_of_birth: null, passport_type: null,
    passport_validity_date: null, visa_status: variation % 3 === 0 ? 'Work visa' : null,
    visa_transferable: null, notice_period: variation % 3 === 0 ? '30 days' : null,
    current_location: country, phone: '+971 50 000 0000', whatsapp: null,
    email: 'aisha@example.test', linkedin_url: variation % 4 === 0 ? 'linkedin.com/in/synthetic-candidate-for-template-review' : null,
    professional_summary: variation === 0 ? null : `${title} focused on ${skills.join(', ').toLowerCase()}. Works with multidisciplinary teams to deliver reliable outcomes and clear documentation.`,
    has_driving_license: null, driving_license_country: null, driving_license_category: null, driving_license_validity_date: null,
    readiness_category: null, readiness_score: null,
    field_visibility: { ...DEFAULT_FIELD_VISIBILITY, photo: false, email: variation !== 17, nationality: variation % 2 === 0 },
    work_experience: Array.from({ length: roleCount }, (_, i) => ({
      ...entry(i), company: `Example Services ${i + 1} Ltd`, role: i === 0 ? title : role,
      start_date: `${2024 - i * 2}-01-01`, end_date: i === 0 ? null : `${2025 - i * 2}-12-01`,
      location: country, gcc_country: null,
      description: variation % 2 === 0 ? `Delivered ${skills[0].toLowerCase()} support for project ${i + 1}.` : null,
      highlights: Array.from({ length: pattern === 4 && i === 0 ? 13 : 3 }, (_, j) =>
        `Coordinated ${skills[j % skills.length].toLowerCase()} activities for assignment ${i + 1}, reviewing requirements with the delivery team.${variation === 19 ? ' Maintained a clear record of decisions, outstanding actions and stakeholder approvals across project phases.' : ''}`),
    })),
    skills: skills.map((name, i) => ({ ...entry(30 + i), name })),
    education: [{ ...entry(40), degree: 'Bachelor’s degree', institution: 'Example University', field_of_study: role, start_year: null, end_year: 2012 }],
    certifications: variation === 1 ? [] : [{ ...entry(45), name: 'Professional development certificate', issuer: 'Example Training Institute', issue_date: '2023-05-01', expiry_date: null }],
    additional_information: [
      { ...entry(50), label: HEADLINE_LABEL, value: headline, category_id: uuid(900000 + caseId * 4), category_name: HEADLINE_CATEGORY, category_order: 3, category_position: 'end', show_on_resume: variation !== 16 },
      { ...entry(51), label: 'English', value: 'Professional communication', category_id: uuid(900001 + caseId * 4), category_name: 'Languages', category_order: 1, category_position: 'end', show_on_resume: true, level: 'Fluent' },
      { ...entry(52), label: 'Project Delta', value: `Supported ${skills[0].toLowerCase()} and documented project handover actions.`, category_id: uuid(900002 + caseId * 4), category_name: 'Projects', category_order: 0, category_position: pattern === 0 ? 'after_summary' : 'after_experience', show_on_resume: variation !== 15 },
      { ...entry(53), label: 'Professional membership', value: 'Example Professional Association', category_id: uuid(900003 + caseId * 4), category_name: 'Memberships', category_order: 2, category_position: 'end', show_on_resume: true },
    ],
  }
}
