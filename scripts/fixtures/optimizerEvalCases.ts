/**
 * Live evaluation fixtures for the optimizer engine (2026-09-17).
 * Synthetic people, realistic Gulf-market profiles across professions and
 * career stages. No real personal data.
 */

import type { CareerProfileFull } from '../../types/careerProfile'

interface Role {
  company: string
  role: string
  location: string
  start: string
  end: string | null
  description?: string
  highlights: string[]
}

function profile(opts: {
  id: string
  name: string
  summary: string | null
  roles: Role[]
  skills: string[]
  certs?: string[]
  education?: Array<{ degree: string; field: string; institution: string; start: number; end: number }>
  additional?: Array<{ label: string; value: string }>
  license?: boolean | null
}): CareerProfileFull {
  return {
    id: opts.id,
    user_id: 'eval-user',
    full_name: opts.name,
    phone: '+971500000001',
    email: `${opts.id}@example.test`,
    nationality: 'Indian',
    current_location: 'Dubai, UAE',
    professional_summary: opts.summary,
    target_job_title: null,
    field_visibility: {},
    has_driving_license: opts.license ?? null,
    work_experience: opts.roles.map((r, i) => ({
      id: `${opts.id}-r${i + 1}`,
      profile_id: opts.id,
      company: r.company,
      role: r.role,
      location: r.location,
      start_date: r.start,
      end_date: r.end,
      description: r.description ?? null,
      highlights: r.highlights,
      gcc_country: null,
      sort_order: i,
    })),
    skills: opts.skills.map((name, i) => ({ id: `${opts.id}-s${i + 1}`, profile_id: opts.id, name, sort_order: i })),
    certifications: (opts.certs ?? []).map((name, i) => ({ id: `${opts.id}-c${i + 1}`, profile_id: opts.id, name, issuer: null, issue_date: null, expiry_date: null, sort_order: i })),
    education: (opts.education ?? []).map((e, i) => ({
      id: `${opts.id}-d${i + 1}`,
      profile_id: opts.id,
      degree: e.degree,
      field_of_study: e.field,
      institution: e.institution,
      start_year: e.start,
      end_year: e.end,
      sort_order: i,
    })),
    additional_information: (opts.additional ?? []).map((a, i) => ({ id: `${opts.id}-a${i + 1}`, profile_id: opts.id, label: a.label, value: a.value, sort_order: i })),
  } as unknown as CareerProfileFull
}

export interface EvalCase {
  name: string
  profile: CareerProfileFull
  targetJobTitle: string
  jobDescription: string | null
}

const nurse = profile({
  id: 'nurse',
  name: 'Anitha Joseph',
  summary: 'Registered nurse with 7 years of experience in critical care and medical-surgical wards.',
  roles: [
    {
      company: 'Aster Hospital',
      role: 'Staff Nurse - ICU',
      location: 'Dubai, UAE',
      start: '2020-03-01',
      end: null,
      description: '16-bed adult intensive care unit.',
      highlights: [
        'Cared for ventilated patients and monitored hemodynamic status every hour',
        'Administered IV medications and titrated infusions as per physician orders',
        'Documented patient assessments in the Cerner electronic medical record',
        'Participated in rapid response and code blue calls',
      ],
    },
    {
      company: 'KIMS Hospital',
      role: 'Staff Nurse',
      location: 'Trivandrum, India',
      start: '2017-01-01',
      end: '2020-02-01',
      highlights: ['Provided care for 8 post-operative patients per shift', 'Educated patients and families on wound care before discharge'],
    },
  ],
  skills: ['Patient assessment', 'IV therapy', 'Ventilator care', 'Cerner'],
  certs: ['BLS', 'ACLS', 'DHA License'],
  education: [{ degree: 'B.Sc', field: 'Nursing', institution: 'Kerala University', start: 2012, end: 2016 }],
})

const accountant = profile({
  id: 'acct',
  name: 'Rahul Mehta',
  summary: 'Accountant with 6+ years in general ledger, month-end close and VAT compliance.',
  roles: [
    {
      company: 'Al Noor Trading LLC',
      role: 'Accountant',
      location: 'Sharjah, UAE',
      start: '2021-02-01',
      end: null,
      highlights: [
        'Prepared monthly financial statements under IFRS for 3 group entities',
        'Filed quarterly UAE VAT returns and reconciled input and output tax',
        'Performed bank reconciliations for 12 accounts in SAP',
        'Supported the external auditors during the annual audit',
      ],
    },
    {
      company: 'Deloitte India',
      role: 'Audit Associate',
      location: 'Mumbai, India',
      start: '2018-07-01',
      end: '2021-01-01',
      highlights: ['Tested revenue and receivables controls for manufacturing clients', 'Prepared audit working papers'],
    },
  ],
  skills: ['IFRS', 'SAP', 'VAT', 'Excel', 'Bank reconciliation'],
  certs: ['CA Inter'],
  education: [{ degree: 'B.Com', field: 'Accounting', institution: 'Mumbai University', start: 2015, end: 2018 }],
})

const developer = profile({
  id: 'dev',
  name: 'Fatima Khan',
  summary: null,
  roles: [
    {
      company: 'Careem',
      role: 'Software Engineer',
      location: 'Dubai, UAE',
      start: '2022-01-01',
      end: null,
      highlights: [
        'Built React and TypeScript screens for the driver onboarding web app',
        'Wrote Node.js REST APIs backed by PostgreSQL',
        'Added unit tests with Jest and raised coverage on the onboarding service',
        'Worked with designers and product managers in two-week sprints',
      ],
    },
    {
      company: 'Infosys',
      role: 'Associate Developer',
      location: 'Pune, India',
      start: '2019-06-01',
      end: '2021-12-01',
      highlights: ['Maintained Java Spring services for a banking client', 'Fixed production defects raised in JIRA'],
    },
  ],
  skills: ['React', 'TypeScript', 'Node.js', 'PostgreSQL', 'Java', 'Git', 'Docker'],
  education: [{ degree: 'B.Tech', field: 'Computer Science', institution: 'VIT', start: 2015, end: 2019 }],
})

const mep = profile({
  id: 'mep',
  name: 'Suresh Kumar',
  summary: 'Mechanical site engineer with 9 years on commercial building projects in the UAE and India.',
  roles: [
    {
      company: 'Drake & Scull',
      role: 'MEP Site Engineer',
      location: 'Abu Dhabi, UAE',
      start: '2018-04-01',
      end: null,
      description: 'Hospital and mall fit-out projects.',
      highlights: [
        'Supervised installation of chilled water piping and AHUs on a 22-floor tower',
        'Coordinated shop drawings with the consultant and the civil contractor',
        'Prepared inspection requests and closed snag lists before handover',
        'Witnessed testing and commissioning of HVAC systems',
      ],
    },
    {
      company: 'L&T Construction',
      role: 'Junior Engineer',
      location: 'Chennai, India',
      start: '2015-06-01',
      end: '2018-03-01',
      highlights: ['Checked plumbing and drainage installations against drawings', 'Maintained daily site progress reports'],
    },
  ],
  skills: ['HVAC', 'AutoCAD', 'MS Project', 'Plumbing', 'Fire fighting systems'],
  certs: ['OSHA 30'],
  education: [{ degree: 'B.E.', field: 'Mechanical Engineering', institution: 'Anna University', start: 2011, end: 2015 }],
})

const sales = profile({
  id: 'sales',
  name: 'Omar Haddad',
  summary: 'FMCG sales executive with 5 years covering modern trade accounts in the UAE.',
  roles: [
    {
      company: 'Al Ghurair Foods',
      role: 'Sales Executive',
      location: 'Dubai, UAE',
      start: '2020-01-01',
      end: null,
      highlights: [
        'Managed 14 hypermarket and supermarket accounts including Carrefour and Lulu',
        'Achieved 112% of the annual sales target in 2023',
        'Negotiated promotional listings and gondola-end displays with store buyers',
        'Tracked sell-out and stock levels weekly in Excel',
      ],
    },
    {
      company: 'Nestle Middle East',
      role: 'Merchandiser',
      location: 'Dubai, UAE',
      start: '2018-01-01',
      end: '2019-12-01',
      highlights: ['Maintained planograms across 30 stores', 'Reported competitor activity to the area manager'],
    },
  ],
  skills: ['Key account management', 'Negotiation', 'Excel', 'Modern trade'],
  education: [{ degree: 'BBA', field: 'Marketing', institution: 'University of Jordan', start: 2014, end: 2018 }],
  license: true,
})

const graduate = profile({
  id: 'grad',
  name: 'Priya Nair',
  summary: 'Civil engineering graduate.',
  roles: [
    {
      company: 'Sobha Constructions',
      role: 'Intern',
      location: 'Bangalore, India',
      start: '2024-01-01',
      end: '2024-06-01',
      highlights: ['Assisted site engineers with quantity take-off for a residential tower', 'Recorded concrete pour details'],
    },
  ],
  skills: ['AutoCAD', 'STAAD Pro', 'Excel'],
  education: [{ degree: 'B.Tech', field: 'Civil Engineering', institution: 'NIT Calicut', start: 2020, end: 2024 }],
})

const mba = profile({
  id: 'mba',
  name: 'Sara Al Mansoori',
  summary: 'Marketing manager with 8 years in FMCG brand and digital marketing across the GCC.',
  roles: [
    {
      company: 'Unilever Gulf',
      role: 'Brand Manager',
      location: 'Dubai, UAE',
      start: '2020-01-01',
      end: null,
      highlights: [
        'Managed the annual brand plan and a marketing budget for 3 personal care brands in the UAE and Saudi Arabia',
        'Led product launches with sales, supply chain and agency teams',
        'Grew brand market share by 2 points in 2023 through digital campaigns on Instagram and TikTok',
        'Tracked campaign performance and consumer insights using Nielsen data',
      ],
    },
    {
      company: 'Procter and Gamble',
      role: 'Assistant Brand Manager',
      location: 'Jeddah, Saudi Arabia',
      start: '2016-06-01',
      end: '2019-12-01',
      highlights: ['Prepared go-to-market plans for new product variants', 'Coordinated in-store promotions with key account managers'],
    },
  ],
  skills: ['Brand management', 'Digital marketing', 'Budget management', 'Consumer insights', 'Arabic', 'English'],
  education: [
    { degree: 'MBA', field: 'Marketing', institution: 'INSEAD', start: 2014, end: 2016 },
    { degree: 'BBA', field: 'Business Administration', institution: 'American University of Sharjah', start: 2010, end: 2014 },
  ],
})

const electrical = profile({
  id: 'elec',
  name: 'Vikram Singh',
  summary: 'Electrical engineer with 10 years in power distribution projects.',
  roles: [
    {
      company: 'ABB',
      role: 'Electrical Engineer',
      location: 'Abu Dhabi, UAE',
      start: '2018-03-01',
      end: null,
      description: 'Substation and power distribution projects for utilities.',
      highlights: [
        'Tested and commissioned 11kV and 33kV switchgear and transformers for utility substations',
        'Prepared cable schedules and single line diagrams in AutoCAD',
        'Carried out load flow and short circuit studies in ETAP',
        'Supervised LV panel installation and earthing systems with subcontractors',
      ],
    },
    {
      company: 'Larsen and Toubro',
      role: 'Site Engineer - Electrical',
      location: 'Mumbai, India',
      start: '2014-07-01',
      end: '2018-02-01',
      highlights: ['Installed cable trays, DBs and lighting for a commercial tower', 'Prepared as-built drawings and inspection test plans'],
    },
  ],
  skills: ['Switchgear', 'ETAP', 'AutoCAD', 'Substation commissioning', 'IEC standards'],
  certs: ['DEWA Electrical Consultant Approval'],
  education: [{ degree: 'B.E.', field: 'Electrical Engineering', institution: 'Pune University', start: 2010, end: 2014 }],
})

const hr = profile({
  id: 'hr',
  name: 'Meera Pillai',
  summary: 'HR executive with 5 years in recruitment and employee relations.',
  roles: [
    {
      company: 'Emirates Group',
      role: 'HR Executive',
      location: 'Dubai, UAE',
      start: '2021-01-01',
      end: null,
      highlights: [
        'Handled end-to-end recruitment for 40 frontline roles each quarter',
        'Processed onboarding, visa and labour contract documentation',
        'Answered employee queries on leave, payroll and policies',
      ],
    },
    {
      company: 'Infosys',
      role: 'HR Associate',
      location: 'Bangalore, India',
      start: '2019-06-01',
      end: '2020-12-01',
      highlights: ['Scheduled interviews and coordinated with hiring managers', 'Maintained employee records in SAP SuccessFactors'],
    },
  ],
  skills: ['Recruitment', 'Onboarding', 'SAP SuccessFactors', 'UAE Labour Law', 'Excel'],
  education: [{ degree: 'MBA', field: 'Human Resources', institution: 'Christ University', start: 2017, end: 2019 }],
})

const hospitality = profile({
  id: 'hotel',
  name: 'Joseph Mendes',
  summary: 'Hotel front office professional with 6 years in 5-star properties.',
  roles: [
    {
      company: 'Jumeirah Beach Hotel',
      role: 'Front Office Supervisor',
      location: 'Dubai, UAE',
      start: '2021-05-01',
      end: null,
      highlights: [
        'Supervised a team of 8 receptionists across morning and evening shifts',
        'Handled VIP arrivals and guest complaints at the front desk',
        'Used Opera PMS for check-in, check-out and room allocation',
      ],
    },
    {
      company: 'Taj Hotels',
      role: 'Guest Service Agent',
      location: 'Goa, India',
      start: '2018-03-01',
      end: '2021-04-01',
      highlights: ['Checked in guests and processed payments', 'Resolved billing queries with the accounts team'],
    },
  ],
  skills: ['Opera PMS', 'Guest relations', 'Front desk operations', 'English', 'Hindi'],
  education: [{ degree: 'Diploma', field: 'Hotel Management', institution: 'IHM Goa', start: 2015, end: 2018 }],
})

const fresher = profile({
  id: 'fresher',
  name: 'Aisha Khan',
  summary: null,
  roles: [
    {
      company: 'KPMG',
      role: 'Audit Intern',
      location: 'Mumbai, India',
      start: '2024-01-01',
      end: '2024-06-01',
      highlights: ['Helped the audit team with vouching and ledger scrutiny', 'Prepared working papers in Excel'],
    },
  ],
  skills: ['Excel', 'Tally', 'Accounting'],
  education: [{ degree: 'B.Com', field: 'Accounting and Finance', institution: 'Mumbai University', start: 2021, end: 2024 }],
})

export const EVAL_CASES: EvalCase[] = [
  {
    name: 'nurse-jd',
    profile: nurse,
    targetJobTitle: 'ICU Registered Nurse',
    jobDescription: `ICU Registered Nurse – Riyadh, Saudi Arabia
We are hiring experienced ICU nurses for a 400-bed tertiary hospital.
Requirements:
- Bachelor of Science in Nursing
- Minimum 3 years of ICU experience
- Valid BLS and ACLS
- Experience with mechanical ventilation and hemodynamic monitoring
- Ability to use electronic medical records
- SCFHS licence or eligibility (Prometric)
Responsibilities: patient assessment, medication administration, infection control practices, family education, participation in code blue response.
CCRN certification is a plus.`,
  },
  {
    name: 'accountant-jd',
    profile: accountant,
    targetJobTitle: 'Senior Accountant',
    jobDescription: `Senior Accountant – Dubai
Responsibilities: month-end and year-end closing, preparation of financial statements under IFRS, VAT return filing (UAE FTA), bank reconciliations, intercompany reconciliations, liaising with external auditors, budgeting and variance analysis.
Requirements: Bachelor's in Accounting or Finance; 5+ years experience; SAP FICO experience; CPA or ACCA preferred; advanced Excel.`,
  },
  {
    name: 'developer-jd',
    profile: developer,
    targetJobTitle: 'Full Stack Developer',
    jobDescription: `Full Stack Developer (React / Node.js) – Abu Dhabi
Must have: React, TypeScript, Node.js, REST APIs, PostgreSQL, automated testing, Git.
Nice to have: AWS, Docker, Kubernetes, GraphQL, CI/CD pipelines.
You will build customer-facing web applications in an agile team.`,
  },
  {
    name: 'mep-title',
    profile: mep,
    targetJobTitle: 'MEP Engineer',
    jobDescription: null,
  },
  {
    name: 'sales-title',
    profile: sales,
    targetJobTitle: 'Key Account Manager',
    jobDescription: null,
  },
  {
    name: 'mba-jd',
    profile: mba,
    targetJobTitle: 'Senior Marketing Manager',
    jobDescription: `Senior Marketing Manager – Riyadh
Lead brand strategy and the annual marketing plan for a portfolio of consumer brands in KSA.
Requirements: MBA preferred; 7+ years in FMCG marketing; brand management; P&L ownership; digital marketing and performance marketing; market research and consumer insights; managing agencies; stakeholder management; Arabic an advantage.`,
  },
  {
    name: 'electrical-jd',
    profile: electrical,
    targetJobTitle: 'Senior Electrical Engineer',
    jobDescription: `Senior Electrical Engineer (Power Distribution) – Doha
Must have: MV/LV switchgear testing and commissioning, transformers, protection relay coordination, ETAP load flow and short circuit studies, cable sizing and cable schedules, earthing design, IEC standards. Bachelor's in Electrical Engineering. KAHRAMAA approval is a plus. 8+ years experience.`,
  },
  {
    name: 'hr-title',
    profile: hr,
    targetJobTitle: 'HR Generalist',
    jobDescription: null,
  },
  {
    name: 'hotel-jd',
    profile: hospitality,
    targetJobTitle: 'Front Office Manager',
    jobDescription: `Front Office Manager – luxury resort, Muscat
Lead front office operations and a team of receptionists and concierge. Requirements: 5+ years front office experience in 5-star hotels, Opera PMS, guest satisfaction and complaint handling, revenue and upselling, rostering and staff training, budgeting. Hospitality diploma or degree.`,
  },
  {
    name: 'fresher-title',
    profile: fresher,
    targetJobTitle: 'Junior Accountant',
    jobDescription: null,
  },
  {
    name: 'graduate-jd',
    profile: graduate,
    targetJobTitle: 'Graduate Civil Engineer',
    jobDescription: `Graduate Civil Engineer – Doha, Qatar
Fresh graduates welcome. Bachelor's in Civil Engineering required.
Knowledge of AutoCAD and Revit; exposure to site supervision, quantity surveying and quality control; Primavera P6 is an advantage. Good communication skills.`,
  },
]
