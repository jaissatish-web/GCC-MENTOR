import { buildResumeDocument, type ResumeDocument } from '@/lib/resumeDocument'
import type { CareerProfileFull } from '@/types/careerProfile'
import type { OptimizedContent } from '@/types/package'

/**
 * The showcase CV used on the template gallery.
 *
 * WHY IT EXISTS. The gallery previously rendered each template with the
 * signed-in user's own resume, which meant a brand-new user — who has not
 * created or optimized anything yet — saw ten empty pages and no way to judge
 * any of them. A template gallery has to be browsable before you own a resume;
 * that is most of its job.
 *
 * ENTIRELY FICTIONAL. A plausible GCC engineering candidate, invented for this
 * purpose: no real person's name, employer history, contact details or
 * certifications. It is deliberately full — four roles, two bullets each,
 * skills, certifications, education — because a template that looks good with
 * three lines can still fall apart with a real career in it, and the gallery
 * should show the honest case.
 *
 * Built once at module load: the document is immutable and identical for every
 * viewer, so rebuilding it per render would be pure waste on a page that
 * renders ten templates at once.
 */

const SAMPLE_PROFILE = {
  id: 'sample',
  user_id: 'sample',
  full_name: 'Ahmed Al-Hassan',
  target_job_title: 'Senior Mechanical Engineer',
  email: 'ahmed.alhassan@example.com',
  phone: '+966 55 000 0000',
  current_location: 'Riyadh, Saudi Arabia',
  nationality: 'Saudi',
  professional_summary:
    'Senior Mechanical Engineer with 15 years across oil & gas, EPC and construction projects in Saudi Arabia and the UAE. Led multidiscipline teams through commissioning and handover on refinery and petrochemical scopes.',
  photo_url: null,
  field_visibility: null,
  work_experience: [
    {
      id: 'w1', role: 'Senior Mechanical Engineer', company: 'Gulf Energy Contracting',
      location: 'Dhahran, Saudi Arabia', start_date: '2019-01', end_date: null,
    },
    {
      id: 'w2', role: 'Mechanical Engineer', company: 'Peninsula Industrial Services',
      location: 'Abu Dhabi, UAE', start_date: '2015-03', end_date: '2018-12',
    },
    {
      id: 'w3', role: 'Project Engineer', company: 'Jubail Engineering Works',
      location: 'Jubail, Saudi Arabia', start_date: '2012-01', end_date: '2015-02',
    },
    {
      id: 'w4', role: 'Graduate Engineer', company: 'Eastern Province Petrochemicals',
      location: 'Jubail, Saudi Arabia', start_date: '2010-06', end_date: '2011-12',
    },
  ],
  skills: [
    'Static equipment', 'Piping design (ASME B31.3)', 'Commissioning', 'AutoCAD',
    'SolidWorks', 'Primavera P6', 'Welding inspection', 'Project management',
  ].map((name, i) => ({ id: `s${i}`, profile_id: 'sample', name })),
  certifications: [
    { id: 'c1', profile_id: 'sample', name: 'PMP', issuer: 'Project Management Institute' },
    { id: 'c2', profile_id: 'sample', name: 'NEBOSH IGC', issuer: 'NEBOSH' },
    { id: 'c3', profile_id: 'sample', name: 'API 570 Piping Inspector', issuer: 'API' },
  ],
  education: [
    {
      id: 'e1', profile_id: 'sample', degree: 'BSc Mechanical Engineering',
      institution: 'King Fahd University of Petroleum & Minerals',
    },
  ],
  additional_information: [
    { id: 'a1', profile_id: 'sample', label: 'Languages', value: 'English, Arabic' },
  ],
} as unknown as CareerProfileFull

const SAMPLE_CONTENT = {
  summary: { generated: '', source_profile_summary: '' },
  experience_blocks: [
    {
      profile_experience_id: 'w1',
      generated_bullets: [
        'Led a 40-strong multidiscipline team through pre-commissioning and handover of two refinery units.',
        'Reduced rework on piping installation by introducing a weld-tracking log across three contractors.',
      ],
    },
    {
      profile_experience_id: 'w2',
      generated_bullets: [
        'Delivered 14 static equipment packages to ASME and client specifications, all accepted first pass.',
        'Coordinated vendor inspections across four fabrication yards in the UAE and India.',
      ],
    },
    {
      profile_experience_id: 'w3',
      generated_bullets: [
        'Managed mechanical scope for a petrochemical expansion, from IFC drawings to mechanical completion.',
      ],
    },
    {
      profile_experience_id: 'w4',
      generated_bullets: ['Supported commissioning of utility systems during plant start-up.'],
    },
  ],
} as unknown as OptimizedContent

export const SAMPLE_RESUME_DOCUMENT: ResumeDocument = buildResumeDocument({
  profile: SAMPLE_PROFILE,
  optimizedContent: SAMPLE_CONTENT,
  skillsOrder: [],
  fieldVisibility: null,
})
