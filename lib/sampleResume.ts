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
 * certifications. It is deliberately full — four roles with detailed bullets,
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
    'Senior Mechanical Engineer with 15 years across oil & gas, EPC and construction projects in Saudi Arabia and the UAE. Led multidiscipline teams through commissioning and handover on refinery and petrochemical scopes. Experienced in equipment installation, vendor coordination, quality inspections and safe start-up. Works closely with engineering, construction and operations teams to resolve field issues, maintain clear technical records and deliver systems ready for reliable operation.',
  /**
   * The showcase photo (TASK-147, founder-supplied 2026-08-17).
   *
   * A Gulf CV normally carries a photograph, and the four templates whose
   * themes set `allowPhoto` were rendering their photo slot empty in every
   * gallery preview — so half the reason to pick those templates was invisible.
   * Zety and Enhancv both demo with a photo for the same reason.
   *
   * Served from /public, not Supabase storage: this is a static marketing
   * asset on a page that must render for a signed-out visitor, and it must
   * never touch the private `profile-photos` bucket (TASK-113), whose objects
   * are deliberately not publicly readable and require a signed URL per user.
   *
   * A REAL USER NEVER SEES THIS ON THEIR OWN CV. It lives only on
   * SAMPLE_PROFILE, which only /templates renders; /package/[id] builds from
   * the signed-in user's own profile, and a user without a photo gets
   * showPhoto=false, not this one.
   */
  photo_url: '/sample/sample-headshot.jpg',
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
    'Rotating equipment', 'FAT / SAT', 'Mechanical completion', 'Punch-list closeout',
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
    { id: 'a2', profile_id: 'sample', label: 'Selected project', value: 'Refinery utilities expansion: equipment installation, commissioning checks and client handover.' },
    { id: 'a3', profile_id: 'sample', label: 'Technical standards', value: 'ASME B31.3, API 610, project quality plans and approved inspection procedures.' },
    { id: 'a4', profile_id: 'sample', label: 'Professional development', value: 'Equipment reliability workshops, permit-to-work training and contractor safety leadership.' },
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
        'Planned system walkdowns with operations, verified completion dossiers and prioritised outstanding punch items to support safe start-up and timely client acceptance.',
        'Coordinated pump alignment and performance testing with vendors, resolving site queries and recording corrective actions in the commissioning register.',
      ],
    },
    {
      profile_experience_id: 'w2',
      generated_bullets: [
        'Delivered 14 static equipment packages to ASME and client specifications, all accepted first pass.',
        'Coordinated vendor inspections across four fabrication yards in the UAE and India.',
        'Reviewed equipment datasheets, fabrication drawings and material certificates against project specifications, closing technical queries with engineering and quality teams.',
        'Tracked procurement and installation milestones in weekly reports, highlighting delivery risks and coordinating work fronts with civil and electrical contractors.',
      ],
    },
    {
      profile_experience_id: 'w3',
      generated_bullets: [
        'Managed mechanical scope for a petrochemical expansion, from IFC drawings to mechanical completion.',
        'Prepared installation work packs, checked material availability and coordinated site access so supervisors could execute planned activities against approved drawings.',
        'Maintained inspection records and as-built markups, supporting client walkdowns and preparing turnover packages for the commissioning team.',
      ],
    },
    {
      profile_experience_id: 'w4',
      generated_bullets: [
        'Supported commissioning of utility systems during plant start-up.',
        'Assisted senior engineers with equipment inspections, pressure-test records and daily progress tracking, following approved procedures and site safety requirements.',
        'Compiled vendor manuals, maintenance checklists and equipment registers to support operations training and the final project document handover.',
      ],
    },
  ],
} as unknown as OptimizedContent

const FULL_SAMPLE_DOCUMENT: ResumeDocument = buildResumeDocument({
  profile: SAMPLE_PROFILE,
  optimizedContent: SAMPLE_CONTENT,
  skillsOrder: [],
  fieldVisibility: null,
})

// One identical fictional CV for every design and every showcase surface.
// Copy is never trimmed or changed when the selected template changes.
export const SAMPLE_RESUME_DOCUMENT: ResumeDocument = {
  ...FULL_SAMPLE_DOCUMENT,
  experience: FULL_SAMPLE_DOCUMENT.experience.map((item, i) => ({
    ...item, bullets: item.bullets.slice(0, i < 2 ? 3 : 2),
  })),
  additional: FULL_SAMPLE_DOCUMENT.additional.slice(0, 2),
}

// Presentation-only fitting of this fixed sample; never used for user resumes.
export const SAMPLE_TEMPLATE_SCALES: Record<string, number> = {
  // Checked with production CSS and headroom for platform font metrics.
  ats_professional: 0.84,
  gcc_professional: 0.82,
  senior_professional: 0.89,
  gulf_premium: 1.07,
  ats_classic: 0.83,
  gcc_engineering: 0.95,
  executive_gcc: 0.83,
  modern_professional: 0.87,
  senior_compact: 0.98,
  gulf_minimal: 0.87,
  corporate_band: 0.9,
  technical_sidebar: 1.04,
  graduate_entry: 0.82,
  portrait_right: 0.89,
  consultant_right: 0.9,
  heritage_left: 0.89,
  project_twocol: 1.04,
  creative_gcc: 1.01,
  desert_steel: 0.85,
  pipeline_pro: 1.01,
  blueprint_engineer: 1,
  power_grid: 0.84,
  offshore_navy: 0.91,
  commissioning_lead: 0.83,
  field_technician: 0.83,
  workshop_pro: 0.91,
  maintenance_master: 1.01,
  skilled_trades: 0.81,
  site_supervisor: 0.85,
  hard_hat_pro: 0.91,
  qs_precision: 1.03,
  hse_shield: 0.89,
  project_director: 0.88,
  ledger_classic: 0.86,
  riyadh_banker: 0.9,
  audit_clarity: 1.01,
  cfo_signature: 0.76,
  marina_creative: 1,
  spotlight_sales: 0.89,
  brand_story: 0.85,
  clinical_care: 0.85,
  medical_pearl: 0.78,
  care_compass: 0.99,
  lab_precision: 0.89,
  oasis_hospitality: 0.81,
  retail_star: 0.87,
  tech_horizon: 1.03,
  data_clarity: 0.89,
  office_elegance: 0.8,
  people_partner: 0.99,
  logistics_route: 0.87,
  scholar_classic: 0.86,
  falcon_executive: 0.81,
}
