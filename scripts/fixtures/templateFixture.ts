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

/**
 * A long Gulf CV for pagination checks (2026-10-04): a 13-point current role —
 * the founder's own CV pushed exactly such a role to page 2 and left half of
 * page 1 blank — then `roles - 1` more roles, 48 skills, six certifications,
 * two degrees and five additional facts. Sixteen roles print to five to eight
 * pages depending on the design: the longest a Gulf CV runs to, so every
 * design is tested across six or seven page breaks.
 */
export function makeLongTemplateFixture(roles = 16): {
  profile: CareerProfileFull
  optimizedContent: OptimizedContent
  skillsOrder: string[]
} {
  const base = makeTemplateFixture()
  const now = '2026-10-04T00:00:00.000Z'
  const id = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`
  const profileId = base.profile.id
  const employers = [
    ['Air Products', 'Jubail, Saudi Arabia'],
    ['Petrofac', 'Abu Dhabi, UAE'],
    ['Saipem', 'Ras Laffan, Qatar'],
    ['Hyundai Engineering', 'Ruwais, UAE'],
    ['Larsen & Toubro', 'Sohar, Oman'],
    ['Técnicas Reunidas', 'Duqm, Oman'],
    ['Samsung Engineering', 'Mina Al Ahmadi, Kuwait'],
    ['Punj Lloyd', 'Vadodara, India'],
    ['Thermax', 'Pune, India'],
  ]
  const roleNames = [
    'Instrument Pre-Commissioning Engineer',
    'Assistant Superintendent — Utility Maintenance',
    'Senior Instrument Engineer',
    'Instrumentation & Control Engineer',
    'I&C Pre-Commissioning Engineer',
    'I&C Commissioning & Maintenance Engineer',
    'Instrument Commissioning Engineer',
    'Instrument & Control Engineer',
    'Instrumentation Engineer',
  ]
  const duties = [
    'Executed loop checks on DCS, ESD and F&G systems with 99% first-pass accuracy across process and utility units',
    'Coordinated FAT and SAT with vendors, logged punch items and closed them before mechanical completion',
    'Validated HART and Fieldbus communication, control logic, interlocks and fail-safe behaviour on rotating equipment',
    'Prepared loop folders, calibration certificates and handover dossiers accepted by the client at the first submission',
    'Supervised a crew of instrument technicians and subcontractors with zero lost-time incidents over the project',
    'Commissioned analysers, flow meters, control valves and on/off valves against the approved test procedures',
    'Reviewed P&IDs, cause and effect matrices and hook-up drawings and raised technical queries before installation',
    'Managed permit-to-work, isolation and toolbox talks with operations to keep live-plant work safe',
    'Reported daily progress, look-ahead plans and system readiness to the commissioning manager',
    'Tested fire and gas detectors, beacons and sounders and closed out the cause and effect verification',
    'Led root-cause analysis on recurring trips and implemented corrections that cut unplanned shutdowns by 25%',
    'Trained new engineers on the instrument index, SmartPlant data and the client’s commissioning procedures',
    'Handed over systems to operations with complete documentation and signed acceptance certificates',
  ]
  const work_experience = Array.from({ length: roles }, (_, i) => {
    const endYear = 2026 - i * 2
    return {
      id: id(100 + i),
      profile_id: profileId,
      company: employers[i % employers.length][0],
      // Distinct titles, so the ATS job-order check can tell the roles apart.
      role: i < roleNames.length ? roleNames[i] : `${roleNames[i % roleNames.length]} (contract)`,
      start_date: `${endYear - 2}-0${(i % 9) + 1}-01`,
      end_date: i === 0 ? null : `${endYear}-0${(i % 9) + 1}-01`,
      location: employers[i % employers.length][1],
      description: null,
      // The current role is the long one, as on a real senior CV: thirteen
      // points of two lines each — taller than what is left of page 1 under
      // the header, shorter than a whole page, the case that left the gap.
      highlights:
        i === 0
          ? duties.map((d) => `${d}, working with operations, vendors and the client's commissioning team from mechanical completion to start-up.`)
          : duties.slice(0, 6 + (i % 4)).map((d) => `${d}.`),
      sort_order: i,
      created_at: now,
      gcc_country: null,
    }
  })
  const skillNames = [
    'Honeywell Experion PKS', 'Yokogawa CENTUM VP', 'Triconex TS3000', 'Siemens S7', 'Emerson DeltaV',
    'ABB 800xA', 'Foxboro I/A', 'Allen Bradley PLC', 'SIS / IEC 61511', 'SIL verification',
    'HART calibration', 'Foundation Fieldbus', 'Profibus', 'Modbus', 'SCADA validation',
    'Loop checking', 'Cause & effect testing', 'FAT / SAT', 'ITR / ICAPS', 'Punch list management',
    'P&ID review', 'Hook-up drawings', 'Instrument index', 'SmartPlant Instrumentation', 'Control valves',
    'On/off valves', 'Analysers', 'Flow metering', 'Fire & gas detection', 'ESD systems',
    'BMS', 'Vibration monitoring', 'Pressure calibrators', 'Permit to work', 'Isolation & LOTO',
    'Toolbox talks', 'Pre-startup safety review', 'Mechanical completion', 'System handover', 'Root-cause analysis',
    'Saudi Aramco SAES', 'ADNOC standards', 'Shell DEP', 'API / IEC / ISA', 'Team leadership',
    'Vendor coordination', 'Progress reporting', 'MS Office',
  ]
  const skills = skillNames.map((name, i) => ({ id: id(200 + i), profile_id: profileId, name, sort_order: i, created_at: now }))
  const certNames: Array<[string, string]> = [
    ['TÜV Functional Safety Engineer (SIS)', 'TÜV Rheinland'],
    ['NEBOSH International General Certificate', 'NEBOSH'],
    ['Certified Commissioning Professional (CCP)', 'BCxA'],
    ['ATEX / IECEx Hazardous Area Competency', 'IECEx'],
    ['Industrial Automation & Instrumentation Engineering', 'ISA'],
    ['Saudi Arabia Light Vehicle Licence', 'Saudi Traffic'],
  ]
  const certifications = certNames.map(([name, issuer], i) => ({
    id: id(300 + i), profile_id: profileId, name, issuer, issue_date: `${2012 + i}-03-01`, expiry_date: null, sort_order: i, created_at: now,
  }))
  const education = [
    { id: id(400), profile_id: profileId, degree: 'B.Tech', institution: 'Anna University', field_of_study: 'Electronics & Instrumentation', start_year: 2004, end_year: 2008, sort_order: 0, created_at: now },
    { id: id(401), profile_id: profileId, degree: 'Diploma', institution: 'State Board of Technical Education', field_of_study: 'Instrumentation Technology', start_year: 2001, end_year: 2004, sort_order: 1, created_at: now },
  ]
  const additional_information = [
    ['Languages', 'English (fluent), Hindi (native), Arabic (basic)'],
    ['Eligibility', 'Saudi Arabia, UAE, Qatar, Kuwait, Oman, Bahrain — any GCC country'],
    ['Notice period', 'Immediate — no notice period'],
    ['Passport', 'Valid, NOC obtainable'],
    ['Key achievements', '50,000+ loop checks ahead of schedule; zero lost-time incidents over 15+ years; 67,000+ total loop checks across 8 mega-projects in 4 countries'],
  ].map(([label, value], i) => ({ id: id(500 + i), profile_id: profileId, label, value, sort_order: i, created_at: now }))

  const profile = {
    ...base.profile,
    professional_summary:
      'Instrument pre-commissioning engineer with fourteen years in oil and gas, petrochemical and power projects across the GCC and Asia, specialising in DCS, ESD, F&G and SCADA. 67,000+ loop checks, zero lost-time incidents, and successful FAT/SAT on greenfield and brownfield projects. Skilled in HSE regulations, project quality standards and leadership, with hands-on experience in Honeywell, Emerson, ABB, Siemens and Yokogawa systems.',
    work_experience,
    skills,
    certifications,
    education,
    additional_information,
  } as unknown as CareerProfileFull
  const optimizedContent = {
    summary: { generated: profile.professional_summary, user_edited: null, source_profile_summary: profile.professional_summary },
    experience_blocks: [],
  } as unknown as OptimizedContent
  return { profile, optimizedContent, skillsOrder: skills.map((s) => s.id) }
}
