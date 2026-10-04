import type { CareerProfileFull, FieldVisibility } from '../../types/careerProfile'
import type { OptimizedContent } from '../../types/package'

/**
 * One realistic Gulf CV for template checks (2026-10-04).
 *
 * Shared by scripts/verify-engine-templates.ts so every template is measured
 * against the same document: a photo, every Gulf identity field, two roles
 * (one rewritten by the optimizer, one the profile's own), skills,
 * certifications, education and additional information. Long values are
 * deliberate — a template has to survive a real engineer's CV, not a sample.
 */

export const VISIBILITY_KEYS: (keyof FieldVisibility)[] = [
  'full_name',
  'photo',
  'nationality',
  'date_of_birth',
  'passport_type',
  'passport_validity',
  'visa_status',
  'visa_transferable',
  'notice_period',
  'current_location',
  'phone',
  'whatsapp',
  'email',
  'linkedin_url',
  'additional_information',
]

export function makeTemplateFixture(): {
  profile: CareerProfileFull
  optimizedContent: OptimizedContent
  skillsOrder: string[]
} {
  const now = '2026-10-04T00:00:00.000Z'
  const id = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`
  const profileId = id(1)

  const allOn = Object.fromEntries(VISIBILITY_KEYS.map((k) => [k, true])) as unknown as FieldVisibility

  const profile = {
    id: profileId,
    user_id: id(2),
    currently_in_gulf: true,
    current_employer: 'Larsen & Toubro',
    current_project: null,
    target_job_title: 'Commissioning Leader – Instrumentation & Control',
    target_industry: 'engineering_technical',
    target_country: 'saudi_arabia',
    target_company: null,
    full_name: 'Ravi Kumar Sharma',
    photo_url: 'https://example.com/photo.jpg',
    nationality: 'Indian',
    date_of_birth: '1986-03-14',
    passport_type: 'Non-ECR',
    passport_validity_date: '2031-05-20',
    visa_status: 'Iqama holder',
    visa_transferable: true,
    notice_period: '30 days',
    current_location: 'Jubail, Saudi Arabia',
    phone: '+966 512345678',
    whatsapp: '+91 9876543210',
    email: 'ravi.sharma@example.com',
    linkedin_url: 'https://www.linkedin.com/in/ravi-kumar-sharma-commissioning',
    professional_summary:
      'Instrumentation and control engineer with fourteen years in oil and gas commissioning, nine of them in Saudi Arabia. Led loop checks, DCS and SIS commissioning and handover for gas plants, working with operations from mechanical completion to start-up.',
    readiness_category: 'currently_in_gulf',
    readiness_score: 88,
    has_driving_license: true,
    driving_license_country: 'Saudi Arabia',
    driving_license_category: 'Light vehicle',
    driving_license_validity_date: '2029-01-01',
    field_visibility: allOn,
    created_at: now,
    updated_at: now,
    work_experience: [
      {
        id: id(10),
        profile_id: profileId,
        company: 'Larsen & Toubro',
        role: 'Senior I&C Commissioning Engineer',
        start_date: '2019-04-01',
        end_date: null,
        location: 'Jubail, Saudi Arabia',
        description: 'Commissioning of DCS, SIS and field instruments for a gas processing plant.',
        highlights: ['Completed 4,200 loop checks with zero rework', 'Handed over three units ahead of schedule'],
        sort_order: 0,
        created_at: now,
        gcc_country: 'saudi_arabia',
      },
      {
        id: id(11),
        profile_id: profileId,
        company: 'Petrofac',
        role: 'Instrument Engineer',
        start_date: '2015-02-01',
        end_date: '2019-03-01',
        location: 'Abu Dhabi, UAE',
        description: 'Pre-commissioning of instrumentation for onshore gas facilities.',
        highlights: ['Built the instrument index for 2,000+ tags', 'Supported FAT and SAT to client standards'],
        sort_order: 1,
        created_at: now,
        gcc_country: 'uae',
      },
    ],
    skills: [
      'Honeywell Experion PKS Distributed Control System',
      'Triconex SIS',
      'Loop checking',
      'HART calibration',
      'SAT / FAT',
      'Permit to work',
    ].map((name, i) => ({ id: id(20 + i), profile_id: profileId, name, sort_order: i, created_at: now })),
    certifications: [
      {
        id: id(30),
        profile_id: profileId,
        name: 'TÜV Functional Safety Engineer (SIS)',
        issuer: 'TÜV Rheinland',
        issue_date: '2021-05-01',
        expiry_date: null,
        sort_order: 0,
        created_at: now,
      },
      {
        id: id(31),
        profile_id: profileId,
        name: 'NEBOSH International General Certificate',
        issuer: 'NEBOSH',
        issue_date: '2018-02-01',
        expiry_date: null,
        sort_order: 1,
        created_at: now,
      },
    ],
    education: [
      {
        id: id(40),
        profile_id: profileId,
        degree: 'B.Tech',
        institution: 'Anna University',
        field_of_study: 'Electronics & Instrumentation',
        start_year: 2004,
        end_year: 2008,
        sort_order: 0,
        created_at: now,
      },
    ],
    additional_information: [
      { id: id(50), profile_id: profileId, label: 'Languages', value: 'English (fluent), Hindi (native), Arabic (basic)', sort_order: 0, created_at: now },
      { id: id(51), profile_id: profileId, label: 'Award', value: 'Client HSE Recognition 2023', sort_order: 1, created_at: now },
    ],
  } as unknown as CareerProfileFull

  const optimizedContent = {
    summary: {
      generated:
        'Commissioning leader for instrumentation and control with fourteen years in oil and gas, nine in Saudi Arabia, taking DCS and SIS from mechanical completion to start-up.',
      user_edited: null,
      source_profile_summary: profile.professional_summary,
    },
    experience_blocks: [
      {
        profile_experience_id: id(10),
        was_optimized: true,
        generated_bullets: [
          'Led loop checks and DCS/SIS commissioning for a gas processing plant, 4,200 loops with zero rework',
          'Handed over three units ahead of schedule with operations sign-off',
        ],
        user_edited_bullets: null,
        source_bullets: ['Completed 4,200 loop checks with zero rework'],
        claims: [],
      },
    ],
  } as unknown as OptimizedContent

  const skillsOrder = [id(21), id(20), id(22), id(23), id(24), id(25)]
  return { profile, optimizedContent, skillsOrder }
}
