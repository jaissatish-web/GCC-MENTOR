import { TEMPLATES } from '@/lib/templates'

/**
 * Landing v2 content. Truth rules (docs/02_PHILOSOPHY.md) still apply:
 * no guarantee of a job, every figure is an example and says so, and no price
 * is printed while checkout is not live (founder decision M10).
 */

// One source for the template count (audit M10): the registry, not copy.
export const AVAILABLE_TEMPLATE_COUNT = Object.values(TEMPLATES).filter((t) => t.available).length

export const CONTACT_EMAIL = 'jaissatish@gmail.com'

/**
 * FOUNDER BAND — waiting on the founder's name and photo (design §8).
 * While `name` is empty the band shows the statement without a person row,
 * so no "[Founder name]" placeholder ever reaches the live page.
 * `photo` is a path under /public, e.g. '/landing/founder.jpg'.
 */
export const FOUNDER = {
  name: '',
  photo: '',
  role: 'E&I Superintendent · Middle East EPC & PMC',
}

export const COUNTRY_CHIPS = [
  ['SA', 'Saudi Arabia'],
  ['AE', 'UAE'],
  ['QA', 'Qatar'],
  ['OM', 'Oman'],
  ['KW', 'Kuwait'],
  ['BH', 'Bahrain'],
] as const

/**
 * How it works — three EXAMPLE target jobs. Qatar is a nurse on purpose
 * (founder decision 2026-09-24) so the demo matches "any profession".
 * White text only ever sits on these three colours (contrast ≥ 7:1).
 */
export const EXAMPLE_JOBS = [
  {
    code: 'SA',
    title: 'Senior Instrumentation Engineer',
    country: 'Saudi Arabia',
    color: '#0F4C43',
    soft: '#E4EEEB',
    before: 49,
    after: 78,
    tone: 'Professional tone',
    mock: 'Practise next',
    img: '/landing/market-saudi-riyadh.jpg',
    alt: 'Riyadh skyline',
  },
  {
    code: 'AE',
    title: 'Commissioning Lead',
    country: 'UAE',
    color: '#8A6114',
    soft: '#F7EFDD',
    before: 52,
    after: 81,
    tone: 'Technical tone',
    mock: 'Ready',
    img: '/landing/market-uae-dubai.jpg',
    alt: 'Dubai skyline at night',
  },
  {
    code: 'QA',
    title: 'Registered Nurse',
    country: 'Qatar',
    color: '#1F5A8A',
    soft: '#DCEAF7',
    before: 45,
    after: 74,
    tone: 'Short tone',
    mock: 'Ready',
    img: '/landing/who-any-profession.jpg',
    alt: 'A nurse at work in a hospital',
  },
] as const

export type ExampleJob = (typeof EXAMPLE_JOBS)[number]

export const FAQ: ReadonlyArray<readonly [string, string]> = [
  [
    'Can GCC Mentor guarantee me a job or an interview?',
    'No. GCC Mentor helps you present your real experience more clearly for each job. Employers make their own decisions, and no score, CV or letter can guarantee an interview, a shortlist, an offer or a salary.',
  ],
  [
    'Does it invent skills or experience?',
    'No. Your employers, job titles, dates and education are never changed, and documents are written from your Career Profile. If a job asks for something your profile does not mention, GCC Mentor can suggest a line — it is highlighted, and it only goes into your CV if you confirm it is true for you.',
  ],
  [
    'Is it only for engineers?',
    'No. It works for any profession — engineering, construction, IT, finance, healthcare, operations, administration and others. It reads your own CV and the job you are targeting.',
  ],
  [
    'Can I use my existing CV?',
    'Yes. Upload a PDF or Word file, or paste the text. We read it into your Career Profile, and you check and correct it before anything is written from it.',
  ],
  [
    'Can I make different CVs for different jobs?',
    'Yes. Each target job gets its own optimized CV, and each one stays in your Resume Library with its cover letter and interview preparation.',
  ],
  [
    'What does Gulf Readiness measure?',
    'How clearly your CV presents what Gulf employers commonly look for: your Gulf market position, work experience, skills, education, certifications, and CV quality and targeting. It is guidance on what to improve — not a hiring prediction.',
  ],
  [
    'How does the job match work?',
    'Add a job title and, for the best result, paste the job description. GCC Mentor compares what the job asks for with your profile and shows an ATS score for your CV before and after optimizing. Without a job description the score is an estimate from the title.',
  ],
  [
    'Which countries are supported?',
    'Saudi Arabia, the UAE, Qatar, Oman, Kuwait and Bahrain. GCC Mentor is not a recruitment agency: it does not list jobs, place candidates or contact employers for you.',
  ],
  [
    'How is my information used?',
    'Your Career Profile is used to write your own documents. You choose what appears on each CV, and you can delete all your data from Settings at any time.',
  ],
  [
    'How do paid services work?',
    'Card checkout is not live yet. Create an account to see current access in the app, and confirm any price and what it includes directly with GCC Mentor before paying.',
  ],
]
