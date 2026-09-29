/**
 * Six FICTIONAL example candidates — one per sector — so the page never reads
 * as "engineers only". Every name, employer and figure here is invented and
 * shown with an "Example" label; nothing is a claim about real outcomes.
 *
 * Markup: **text** inside a string renders as a highlighted keyword (see Rich
 * in primitives.tsx).
 *
 * Photos: the interviewer portraits in /public/interviewers plus the existing
 * template sample headshot. `arab-man.webp` is kept for the mock interviewer so
 * no face is both a candidate and an interviewer.
 */

export type Job = {
  code: 'SA' | 'AE' | 'QA' | 'OM' | 'KW' | 'BH'
  country: string
  title: string
  employer: string
  before: number
  after: number
}

export type Persona = {
  key: string
  sector: string
  name: string
  photo: string
  role: string
  years: number
  base: string
  readiness: [number, number]
  jobs: [Job, Job, Job]
  /** Keywords job 1 asks for that the original CV never says. */
  missing: string[]
  tags: [string, string, string]
  /** Optimized bullets for job 1, keywords in **…**. */
  bullets: [string, string]
  match: Array<{ kind: string; job: string; you: string }>
  gap: string
  before: { objective: string; duties: [string, string, string] }
  summary: string
  skills: string[]
  certs: [string, string]
  education: string
  mock: {
    question: string
    answer: string
    good: string
    improve: string
    suggested: string
    scores: [number, number, number, number]
    overall: number
  }
  cover: string
}

export const PERSONAS: Persona[] = [
  {
    key: 'engineering',
    sector: 'Engineering',
    name: 'Ahmed Al-Hassan',
    photo: '/sample/sample-headshot.jpg',
    role: 'Senior Mechanical Engineer',
    years: 15,
    base: 'Riyadh, KSA',
    readiness: [64, 81],
    jobs: [
      { code: 'SA', country: 'Saudi Arabia', title: 'Mechanical Lead', employer: 'Petrochemical plant · Jubail', before: 58, after: 87 },
      { code: 'AE', country: 'UAE', title: 'Senior Mechanical Engineer', employer: 'EPC contractor · Abu Dhabi', before: 61, after: 85 },
      { code: 'QA', country: 'Qatar', title: 'Static Equipment Engineer', employer: 'LNG facility · Ras Laffan', before: 55, after: 83 },
    ],
    missing: ['Static equipment', 'ASME B31.3', 'Shutdown planning', 'API 570'],
    tags: ['15 yrs GCC', 'Saudi national', 'PMP'],
    bullets: [
      'Led pre-commissioning and handover of two refinery units with a 40-person **multidiscipline** team.',
      'Delivered 14 **static equipment** packages to **ASME B31.3**, all accepted first pass.',
    ],
    match: [
      { kind: 'Skills', job: 'Static equipment & piping', you: 'ASME B31.3 · 14 packages delivered' },
      { kind: 'Experience', job: '12+ yrs oil & gas', you: '15 yrs · refinery & petrochemical' },
      { kind: 'Certifications', job: 'API 570 preferred', you: 'API 570 Piping Inspector' },
      { kind: 'GCC experience', job: 'Saudi plant experience', you: 'Dhahran & Jubail sites, 11 yrs' },
      { kind: 'Achievements', job: 'Shutdown delivery', you: '2 units handed over on schedule' },
    ],
    gap: 'SAP PM (desirable)',
    before: {
      objective: 'Seeking a challenging role in a reputed organisation where I can use my skills.',
      duties: ['Responsible for mechanical works.', 'Handling site activities.', 'Coordination with contractors.'],
    },
    summary:
      'Senior Mechanical Engineer, 15 years in **oil & gas** and **EPC** across Saudi Arabia and the UAE. Led **commissioning** and handover on refinery scopes.',
    skills: ['Static equipment', 'ASME B31.3', 'Commissioning', 'Primavera P6', 'API 570'],
    certs: ['PMP', 'API 570 Piping Inspector'],
    education: 'BSc Mechanical Engineering · KFUPM',
    mock: {
      question: 'Tell me about a shutdown you delivered.',
      answer: '“At Jubail I led the mechanical scope for a 21-day shutdown…”',
      good: 'Clear scope and your own role in it.',
      improve: 'Close with the result — days saved, safety record.',
      suggested:
        '“I led the mechanical scope of a 21-day shutdown at Jubail — 60 items, 3 contractors. We finished a day early with zero LTI and every item signed off.”',
      scores: [84, 80, 79, 70],
      overall: 78,
    },
    cover: '…delivered 14 static equipment packages to ASME B31.3, all accepted first pass…',
  },
  {
    key: 'healthcare',
    sector: 'Healthcare',
    name: 'Priya Nair',
    photo: '/interviewers/south-asian-woman.webp',
    role: 'Registered Nurse (ICU)',
    years: 8,
    base: 'Kochi, India',
    readiness: [59, 80],
    jobs: [
      { code: 'QA', country: 'Qatar', title: 'ICU Staff Nurse', employer: 'Government hospital · Doha', before: 54, after: 86 },
      { code: 'SA', country: 'Saudi Arabia', title: 'Registered Nurse', employer: 'Specialist hospital · Riyadh', before: 57, after: 84 },
      { code: 'AE', country: 'UAE', title: 'Critical Care Nurse', employer: 'Private hospital · Dubai', before: 60, after: 85 },
    ],
    missing: ['Ventilator care', 'BLS / ACLS', 'JCI standards', 'Infection control'],
    tags: ['8 yrs ICU', 'DataFlow done', 'ACLS'],
    bullets: [
      'Cared for up to 3 **ventilated** patients per shift in a 24-bed **ICU**, following **JCI** protocols.',
      'Trained 12 new nurses on **infection control** and early-warning scoring.',
    ],
    match: [
      { kind: 'Skills', job: 'Ventilator management', you: '24-bed ICU · 3 ventilated patients/shift' },
      { kind: 'Experience', job: '5+ yrs critical care', you: '8 yrs ICU, tertiary hospital' },
      { kind: 'Certifications', job: 'BLS & ACLS current', you: 'BLS, ACLS (2025)' },
      { kind: 'Licensing', job: 'Licence eligibility', you: 'DataFlow verification complete' },
      { kind: 'Achievements', job: 'Quality & safety', you: 'Trained 12 nurses on infection control' },
    ],
    gap: 'Arabic language (desirable)',
    before: {
      objective: 'To serve patients with dedication and grow in the nursing profession.',
      duties: ['Patient care duties.', 'Giving medications.', 'Assisting doctors.'],
    },
    summary:
      'Registered Nurse with 8 years in **critical care**. Experienced in **ventilator care**, **ACLS** response and **JCI** accredited practice.',
    skills: ['ICU care', 'Ventilators', 'ACLS', 'JCI standards', 'Infection control'],
    certs: ['BLS & ACLS', 'DataFlow verified'],
    education: 'BSc Nursing · Kerala University',
    mock: {
      question: 'How do you handle a deteriorating patient?',
      answer: '“I check the early-warning score, escalate to the doctor…”',
      good: 'Correct steps in a clear order.',
      improve: 'Give one real case and what happened.',
      suggested:
        '“Last year a post-op patient’s score rose to 7. I started oxygen, called the rapid response team within two minutes, and he was stable in the ICU within the hour.”',
      scores: [82, 83, 76, 71],
      overall: 79,
    },
    cover: '…eight years in a 24-bed ICU, working to JCI standards every shift…',
  },
  {
    key: 'finance',
    sector: 'Finance',
    name: 'Arjun Sharma',
    photo: '/interviewers/south-asian-man.webp',
    role: 'Senior Accountant',
    years: 9,
    base: 'Dubai, UAE',
    readiness: [62, 82],
    jobs: [
      { code: 'AE', country: 'UAE', title: 'Finance Manager', employer: 'Retail group · Dubai', before: 59, after: 86 },
      { code: 'KW', country: 'Kuwait', title: 'Senior Accountant', employer: 'Trading company · Kuwait City', before: 63, after: 88 },
      { code: 'BH', country: 'Bahrain', title: 'Financial Controller', employer: 'Bank subsidiary · Manama', before: 52, after: 81 },
    ],
    missing: ['IFRS 16', 'UAE VAT', 'Month-end close', 'SAP FICO'],
    tags: ['9 yrs', 'UAE resident visa', 'CA'],
    bullets: [
      'Cut **month-end close** from 9 to 5 days across 3 entities using **SAP FICO**.',
      'Prepared **UAE VAT** returns and led **IFRS 16** lease adoption for 40 stores.',
    ],
    match: [
      { kind: 'Skills', job: 'IFRS reporting', you: 'IFRS 16 adoption, 40 leases' },
      { kind: 'Experience', job: '7+ yrs accounting', you: '9 yrs · 4 in UAE' },
      { kind: 'Certifications', job: 'CA / CPA / ACCA', you: 'Chartered Accountant (ICAI)' },
      { kind: 'GCC experience', job: 'UAE VAT', you: 'Quarterly VAT returns since 2020' },
      { kind: 'Achievements', job: 'Faster close', you: 'Close cut from 9 to 5 days' },
    ],
    gap: 'Oracle Fusion (desirable)',
    before: {
      objective: 'Hardworking accountant looking for a good opportunity for career growth.',
      duties: ['Handling accounts.', 'Preparing reports.', 'Bank reconciliation.'],
    },
    summary:
      'Chartered Accountant, 9 years in **IFRS** reporting, **UAE VAT** and **month-end close** for multi-entity retail.',
    skills: ['IFRS 16', 'UAE VAT', 'SAP FICO', 'Month-end close', 'Budgeting'],
    certs: ['Chartered Accountant', 'SAP FICO'],
    education: 'B.Com · Mumbai University',
    mock: {
      question: 'How did you speed up month-end close?',
      answer: '“I mapped every step in the close and found three…”',
      good: 'Specific numbers — 9 days down to 5.',
      improve: 'Say what you personally changed.',
      suggested:
        '“I mapped the close across three entities, automated intercompany matching in SAP and moved accruals to day 1. Close went from 9 days to 5 in two quarters.”',
      scores: [81, 84, 78, 73],
      overall: 80,
    },
    cover: '…cut month-end close from 9 to 5 days across three entities…',
  },
  {
    key: 'construction',
    sector: 'Construction',
    name: 'Daniel Hughes',
    photo: '/interviewers/british-man.webp',
    role: 'Construction Project Manager',
    years: 14,
    base: 'Muscat, Oman',
    readiness: [66, 84],
    jobs: [
      { code: 'SA', country: 'Saudi Arabia', title: 'Project Manager', employer: 'Giga-project · Riyadh', before: 60, after: 87 },
      { code: 'OM', country: 'Oman', title: 'Construction Manager', employer: 'Infrastructure · Muscat', before: 64, after: 88 },
      { code: 'QA', country: 'Qatar', title: 'Project Controls Lead', employer: 'Main contractor · Lusail', before: 56, after: 82 },
    ],
    missing: ['FIDIC', 'Primavera P6', 'HSE leadership', 'Cost control'],
    tags: ['14 yrs', '6 yrs GCC', 'PMP'],
    bullets: [
      'Delivered a 42-storey tower 3 weeks early under **FIDIC** Red Book, **cost control** within 2%.',
      'Ran **Primavera P6** programmes for 600+ workers with **HSE** at 4M hours LTI-free.',
    ],
    match: [
      { kind: 'Skills', job: 'FIDIC contracts', you: 'FIDIC Red & Yellow Book, 4 projects' },
      { kind: 'Experience', job: '10+ yrs high-rise', you: '14 yrs · 3 towers delivered' },
      { kind: 'Certifications', job: 'PMP preferred', you: 'PMP (2019)' },
      { kind: 'GCC experience', job: 'Gulf project delivery', you: '6 yrs Oman & Qatar' },
      { kind: 'Achievements', job: 'Safe delivery', you: '4M man-hours LTI-free' },
    ],
    gap: 'Saudi Council of Engineers (to confirm)',
    before: {
      objective: 'Experienced manager seeking a senior position with growth prospects.',
      duties: ['Managing projects.', 'Site supervision.', 'Client meetings.'],
    },
    summary:
      'Project Manager, 14 years in **high-rise** and **infrastructure**, 6 in the GCC. **FIDIC**, **Primavera P6** and strong **HSE** record.',
    skills: ['FIDIC', 'Primavera P6', 'Cost control', 'HSE', 'Stakeholders'],
    certs: ['PMP', 'NEBOSH IGC'],
    education: 'BEng Civil Engineering · Leeds',
    mock: {
      question: 'Tell me about a project that fell behind.',
      answer: '“On the Lusail tower we lost six weeks to a façade…”',
      good: 'Honest about the problem.',
      improve: 'Spend more time on the recovery plan.',
      suggested:
        '“We lost six weeks to a façade supplier. I re-sequenced the MEP works, added a night shift for 8 weeks and recovered the programme — the tower handed over 3 weeks early.”',
      scores: [83, 82, 80, 72],
      overall: 80,
    },
    cover: '…delivered a 42-storey tower three weeks early under FIDIC Red Book…',
  },
  {
    key: 'it',
    sector: 'IT & Software',
    name: 'Sarah Collins',
    photo: '/interviewers/british-woman.webp',
    role: 'Senior Software Engineer',
    years: 7,
    base: 'Manama, Bahrain',
    readiness: [61, 79],
    jobs: [
      { code: 'BH', country: 'Bahrain', title: 'Senior Software Engineer', employer: 'Fintech · Manama', before: 62, after: 88 },
      { code: 'AE', country: 'UAE', title: 'Cloud Engineer', employer: 'Telecom · Dubai', before: 55, after: 83 },
      { code: 'SA', country: 'Saudi Arabia', title: 'Full-stack Developer', employer: 'Government digital · Riyadh', before: 58, after: 84 },
    ],
    missing: ['AWS', 'Kubernetes', 'PCI DSS', 'Microservices'],
    tags: ['7 yrs', 'Bahrain CPR', 'AWS certified'],
    bullets: [
      'Moved a card-payments service to **microservices** on **Kubernetes**, cutting latency 38%.',
      'Led **PCI DSS** remediation for 4 services on **AWS**, passing audit first time.',
    ],
    match: [
      { kind: 'Skills', job: 'AWS & Kubernetes', you: 'EKS · 12 services in production' },
      { kind: 'Experience', job: '5+ yrs backend', you: '7 yrs · Node & Go' },
      { kind: 'Certifications', job: 'AWS certification', you: 'AWS Solutions Architect' },
      { kind: 'Domain', job: 'Payments / fintech', you: 'Card payments, PCI DSS' },
      { kind: 'Achievements', job: 'Performance', you: 'Latency cut 38%' },
    ],
    gap: 'Arabic language (desirable)',
    before: {
      objective: 'Passionate developer who loves coding and learning new technologies.',
      duties: ['Worked on backend.', 'Fixed bugs.', 'Attended stand-ups.'],
    },
    summary:
      'Backend engineer, 7 years building **payments** systems. **AWS**, **Kubernetes** and **PCI DSS** in regulated fintech.',
    skills: ['AWS', 'Kubernetes', 'Go', 'Node.js', 'PCI DSS'],
    certs: ['AWS Solutions Architect', 'CKA'],
    education: 'BSc Computer Science · Manchester',
    mock: {
      question: 'Walk me through a system you designed.',
      answer: '“Our card service was a monolith, so I split it into…”',
      good: 'Good technical depth.',
      improve: 'Explain the business impact first.',
      suggested:
        '“Card approvals were slow at peak. I split the service into four microservices on EKS with a queue in front — latency fell 38% and we handled Ramadan peak with no incidents.”',
      scores: [86, 80, 74, 72],
      overall: 79,
    },
    cover: '…moved a card-payments service to microservices, cutting latency 38%…',
  },
  {
    key: 'hr',
    sector: 'HR & Admin',
    name: 'Fatima Al-Mansoori',
    photo: '/interviewers/arab-woman.webp',
    role: 'HR Business Partner',
    years: 10,
    base: 'Abu Dhabi, UAE',
    readiness: [67, 85],
    jobs: [
      { code: 'AE', country: 'UAE', title: 'Senior HR Business Partner', employer: 'Energy company · Abu Dhabi', before: 63, after: 88 },
      { code: 'SA', country: 'Saudi Arabia', title: 'Talent Acquisition Lead', employer: 'Healthcare group · Riyadh', before: 57, after: 84 },
      { code: 'OM', country: 'Oman', title: 'HR Manager', employer: 'Logistics firm · Sohar', before: 60, after: 85 },
    ],
    missing: ['Emiratisation', 'UAE Labour Law', 'Workforce planning', 'SuccessFactors'],
    tags: ['10 yrs', 'UAE national', 'CIPD L5'],
    bullets: [
      'Raised **Emiratisation** from 18% to 31% in two years through a graduate programme.',
      'Ran **workforce planning** for 2,400 staff on **SuccessFactors**, in line with **UAE Labour Law**.',
    ],
    match: [
      { kind: 'Skills', job: 'Workforce planning', you: '2,400 staff on SuccessFactors' },
      { kind: 'Experience', job: '8+ yrs HRBP', you: '10 yrs · 6 as HRBP' },
      { kind: 'Certifications', job: 'CIPD or SHRM', you: 'CIPD Level 5' },
      { kind: 'GCC experience', job: 'Nationalisation targets', you: 'Emiratisation 18% → 31%' },
      { kind: 'Achievements', job: 'Retention', you: 'Attrition down 9 points' },
    ],
    gap: 'Saudization (Nitaqat) experience',
    before: {
      objective: 'Dynamic HR professional looking to contribute to organisational success.',
      duties: ['Handling HR activities.', 'Recruitment.', 'Employee relations.'],
    },
    summary:
      'HR Business Partner, 10 years in energy and government. **Emiratisation**, **workforce planning** and **UAE Labour Law**.',
    skills: ['Emiratisation', 'Workforce planning', 'SuccessFactors', 'Labour Law', 'Talent'],
    certs: ['CIPD Level 5', 'SHRM-CP'],
    education: 'BBA Human Resources · UAE University',
    mock: {
      question: 'How did you improve national hiring?',
      answer: '“We built a graduate programme with two universities…”',
      good: 'Strong, measurable result.',
      improve: 'Name the obstacle you overcame.',
      suggested:
        '“Managers doubted graduates could do the job. I built a 12-month programme with two universities and paired mentors — Emiratisation went from 18% to 31% and first-year retention was 92%.”',
      scores: [80, 85, 84, 74],
      overall: 81,
    },
    cover: '…raised Emiratisation from 18% to 31% in two years…',
  },
]
