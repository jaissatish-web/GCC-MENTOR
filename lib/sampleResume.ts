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

// Only fictional gallery content varies: spacious and compact designs need
// different amounts of copy to showcase one A4 page at their existing sizes.
// These variants never enter a user's profile, resume or download.
const ORIGINAL_SUMMARY = 'Senior Mechanical Engineer with 15 years across oil & gas, EPC and construction projects in Saudi Arabia and the UAE. Led multidiscipline teams through commissioning and handover on refinery and petrochemical scopes.'
const BASE_BULLETS = [2, 2, 1, 1]
const EXTRA_BULLETS_AT = [[3, 8], [4, 9], [5, 10], [6, 11]]

const SAMPLE_RESUME_VARIANTS: ResumeDocument[] = Array.from({ length: 15 }, (_, index) => {
  const level = index - 1
  return {
    ...FULL_SAMPLE_DOCUMENT,
    summary: level < 0
      ? 'Senior Mechanical Engineer with 15 years in GCC oil & gas, EPC and construction. Leads multidiscipline commissioning and handover for refinery and petrochemical projects.'
      : level < 2 ? ORIGINAL_SUMMARY : FULL_SAMPLE_DOCUMENT.summary,
    skills: FULL_SAMPLE_DOCUMENT.skills.slice(0, level < 1 ? 8 : undefined),
    additional: FULL_SAMPLE_DOCUMENT.additional.slice(0, level < 0 ? 0 : level < 7 ? 1 : level < 12 ? 2 : level < 13 ? 3 : 4),
    experience: FULL_SAMPLE_DOCUMENT.experience.map((item, i) => ({
      ...item,
      bullets: item.bullets.slice(0, BASE_BULLETS[i] + EXTRA_BULLETS_AT[i].filter((at) => level >= at).length),
    })),
  }
})

export const SAMPLE_RESUME_DOCUMENT = SAMPLE_RESUME_VARIANTS[14]

// Content amounts checked against the existing A4 layouts, including the
// gallery thumbnail and full-size preview. No template style overrides.
const SAMPLE_VARIANT_BY_TEMPLATE: Record<string, number> = {
  ats_professional: 2,
  gcc_professional: 1,
  senior_professional: 3,
  gulf_premium: 14,
  ats_classic: 2,
  gcc_engineering: 7,
  executive_gcc: 2,
  modern_professional: 4,
  senior_compact: 9,
  gulf_minimal: 4,
  corporate_band: 4,
  technical_sidebar: 9,
  graduate_entry: 2,
  portrait_right: 4,
  consultant_right: 5,
  heritage_left: 4,
  project_twocol: 9,
  creative_gcc: 8,
  desert_steel: 4,
  pipeline_pro: 9,
  blueprint_engineer: 8,
  power_grid: 2,
  offshore_navy: 6,
  commissioning_lead: 2,
  field_technician: 4,
  workshop_pro: 6,
  maintenance_master: 9,
  skilled_trades: 2,
  site_supervisor: 4,
  hard_hat_pro: 7,
  qs_precision: 9,
  hse_shield: 5,
  project_director: 3,
  ledger_classic: 3,
  riyadh_banker: 5,
  audit_clarity: 9,
  cfo_signature: 0,
  marina_creative: 8,
  spotlight_sales: 5,
  brand_story: 3,
  clinical_care: 3,
  medical_pearl: 1,
  care_compass: 8,
  lab_precision: 6,
  oasis_hospitality: 2,
  retail_star: 4,
  tech_horizon: 9,
  data_clarity: 5,
  office_elegance: 2,
  people_partner: 8,
  logistics_route: 5,
  scholar_classic: 2,
  falcon_executive: 0,
}

export const SAMPLE_TEMPLATE_DOCUMENTS: Record<string, ResumeDocument> = Object.fromEntries(
  Object.entries(SAMPLE_VARIANT_BY_TEMPLATE).map(([id, variant]) => [id, SAMPLE_RESUME_VARIANTS[variant]]),
)
