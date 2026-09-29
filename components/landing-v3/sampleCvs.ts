import { buildResumeDocument, type ResumeDocument } from '@/lib/resumeDocument'
import type { CareerProfileFull } from '@/types/careerProfile'
import type { OptimizedContent } from '@/types/package'
import { PERSONAS } from './personas'

/**
 * One fictional CV per example candidate, built with the product's REAL
 * document builder so the real templates render them exactly as they render a
 * user's CV. Same approach as lib/sampleResume.ts (which stays untouched and
 * is still used by /templates) — this file only adds more people and more
 * professions for the landing concept.
 */

type Role = { role: string; company: string; location: string; start: string; end: string | null; bullets: string[] }

const HISTORY: Record<string, { email: string; phone: string; nationality: string; roles: Role[]; languages: string }> = {
  engineering: {
    email: 'ahmed.alhassan@example.com',
    phone: '+966 55 000 0000',
    nationality: 'Saudi',
    languages: 'English, Arabic',
    roles: [
      { role: 'Senior Mechanical Engineer', company: 'Gulf Energy Contracting', location: 'Dhahran, Saudi Arabia', start: '2019-01', end: null, bullets: ['Led a 40-strong multidiscipline team through pre-commissioning and handover of two refinery units.', 'Reduced piping rework by introducing a weld-tracking log across three contractors.'] },
      { role: 'Mechanical Engineer', company: 'Peninsula Industrial Services', location: 'Abu Dhabi, UAE', start: '2015-03', end: '2018-12', bullets: ['Delivered 14 static equipment packages to ASME specifications, all accepted first pass.'] },
      { role: 'Project Engineer', company: 'Jubail Engineering Works', location: 'Jubail, Saudi Arabia', start: '2010-06', end: '2015-02', bullets: ['Managed mechanical scope for a petrochemical expansion, IFC to mechanical completion.'] },
    ],
  },
  healthcare: {
    email: 'priya.nair@example.com',
    phone: '+91 90000 00000',
    nationality: 'Indian',
    languages: 'English, Malayalam, Hindi',
    roles: [
      { role: 'Registered Nurse — ICU', company: 'Lakeshore Specialty Hospital', location: 'Kochi, India', start: '2020-02', end: null, bullets: ['Cared for up to 3 ventilated patients per shift in a 24-bed ICU under JCI protocols.', 'Trained 12 new nurses on infection control and early-warning scoring.'] },
      { role: 'Staff Nurse — Cardiac', company: 'Malabar Heart Institute', location: 'Kozhikode, India', start: '2017-06', end: '2020-01', bullets: ['Post-operative cardiac care for a 16-bed step-down unit.'] },
      { role: 'Staff Nurse', company: 'City General Hospital', location: 'Kochi, India', start: '2016-01', end: '2017-05', bullets: ['Medical-surgical ward care, medication administration and charting.'] },
    ],
  },
  finance: {
    email: 'arjun.sharma@example.com',
    phone: '+971 50 000 0000',
    nationality: 'Indian',
    languages: 'English, Hindi',
    roles: [
      { role: 'Senior Accountant', company: 'Oasis Retail Group', location: 'Dubai, UAE', start: '2021-04', end: null, bullets: ['Cut month-end close from 9 to 5 days across 3 entities using SAP FICO.', 'Prepared UAE VAT returns and led IFRS 16 adoption for 40 stores.'] },
      { role: 'Accountant', company: 'Western Trading Co.', location: 'Mumbai, India', start: '2017-07', end: '2021-03', bullets: ['Owned bank reconciliations and fixed-asset register for a 300-staff business.'] },
      { role: 'Audit Associate', company: 'Mehta & Rao Chartered Accountants', location: 'Mumbai, India', start: '2015-08', end: '2017-06', bullets: ['Statutory audits for manufacturing and retail clients.'] },
    ],
  },
  construction: {
    email: 'daniel.hughes@example.com',
    phone: '+968 9000 0000',
    nationality: 'British',
    languages: 'English',
    roles: [
      { role: 'Project Manager', company: 'Al Batinah Construction', location: 'Muscat, Oman', start: '2020-03', end: null, bullets: ['Delivered a 42-storey tower 3 weeks early under FIDIC Red Book, cost within 2%.', 'Ran Primavera P6 programmes for 600+ workers; 4M man-hours LTI-free.'] },
      { role: 'Senior Construction Manager', company: 'Peninsula Builders', location: 'Lusail, Qatar', start: '2017-01', end: '2020-02', bullets: ['Recovered a six-week façade delay by re-sequencing MEP works.'] },
      { role: 'Site Manager', company: 'Northgate Contracting', location: 'Leeds, UK', start: '2011-09', end: '2016-12', bullets: ['Managed residential and mixed-use schemes up to £40m.'] },
    ],
  },
  it: {
    email: 'sarah.collins@example.com',
    phone: '+973 3000 0000',
    nationality: 'British',
    languages: 'English',
    roles: [
      { role: 'Senior Software Engineer', company: 'PearlPay Fintech', location: 'Manama, Bahrain', start: '2022-01', end: null, bullets: ['Moved a card-payments service to microservices on Kubernetes, cutting latency 38%.', 'Led PCI DSS remediation for 4 services on AWS, passing audit first time.'] },
      { role: 'Software Engineer', company: 'Brightline Digital', location: 'Manchester, UK', start: '2019-02', end: '2021-12', bullets: ['Built booking APIs in Node.js serving 2M requests a day.'] },
      { role: 'Graduate Developer', company: 'Northern Systems', location: 'Manchester, UK', start: '2017-09', end: '2019-01', bullets: ['Maintained internal tools and CI pipelines.'] },
    ],
  },
  hr: {
    email: 'fatima.almansoori@example.com',
    phone: '+971 50 000 0001',
    nationality: 'Emirati',
    languages: 'Arabic, English',
    roles: [
      { role: 'HR Business Partner', company: 'Emirates Energy Services', location: 'Abu Dhabi, UAE', start: '2019-05', end: null, bullets: ['Raised Emiratisation from 18% to 31% in two years through a graduate programme.', 'Ran workforce planning for 2,400 staff on SuccessFactors.'] },
      { role: 'HR Specialist', company: 'Abu Dhabi Municipal Services', location: 'Abu Dhabi, UAE', start: '2015-09', end: '2019-04', bullets: ['Handled employee relations cases in line with UAE Labour Law.'] },
      { role: 'Recruitment Officer', company: 'Gulf Talent Partners', location: 'Dubai, UAE', start: '2014-01', end: '2015-08', bullets: ['Filled 120+ roles a year across hospitality and retail.'] },
    ],
  },
}

function build(key: string): ResumeDocument {
  const p = PERSONAS.find((x) => x.key === key)!
  const h = HISTORY[key]
  const profile = {
    id: `concept-${key}`,
    user_id: 'sample',
    full_name: p.name,
    target_job_title: p.role,
    email: h.email,
    phone: h.phone,
    current_location: p.base,
    nationality: h.nationality,
    professional_summary: p.summary.replace(/\*\*/g, ''),
    photo_url: p.photo,
    field_visibility: null,
    work_experience: h.roles.map((r, i) => ({ id: `w${i}`, role: r.role, company: r.company, location: r.location, start_date: r.start, end_date: r.end })),
    skills: p.skills.map((name, i) => ({ id: `s${i}`, profile_id: 'sample', name })),
    certifications: p.certs.map((name, i) => ({ id: `c${i}`, profile_id: 'sample', name, issuer: '' })),
    education: [{ id: 'e1', profile_id: 'sample', degree: p.education.split(' · ')[0], institution: p.education.split(' · ')[1] ?? '' }],
    additional_information: [{ id: 'a1', profile_id: 'sample', label: 'Languages', value: h.languages }],
  } as unknown as CareerProfileFull
  const content = {
    summary: { generated: '', source_profile_summary: '' },
    experience_blocks: h.roles.map((r, i) => ({ profile_experience_id: `w${i}`, generated_bullets: r.bullets })),
  } as unknown as OptimizedContent
  return buildResumeDocument({ profile, optimizedContent: content, skillsOrder: [], fieldVisibility: null })
}

/** Built once at module load; immutable and identical for every visitor. */
export const SAMPLE_CVS: Record<string, ResumeDocument> = Object.fromEntries(PERSONAS.map((p) => [p.key, build(p.key)]))
