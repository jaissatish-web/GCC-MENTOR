/**
 * Offline assertions for the universal optimizer (2026-09-16).
 *
 *   node_modules/.bin/sucrase-node scripts/verify-optimization-grounding.ts
 *
 * No AI call, no network, no production data. Synthetic profiles across eight
 * professions are fed to the real prompt builder and the real validator, with
 * canned model output standing in for a generation.
 *
 * The point is not that the prompt contains the right words. It is that a
 * response which breaks a grounding rule is REJECTED by executable code — the
 * prompt is advice, the validator is the thing that can refuse to ship.
 */

import './resolve-paths'
import {
  buildOptimizationPrompt,
  resolveOptimizationMode,
  LEVEL_INSTRUCTION_TEXT,
  type SelectedBlocks,
  type OptimizationTarget,
} from '../lib/ai/buildOptimizationPrompt'
import { validateGrounding, partitionFailures } from '../lib/ai/validateGrounding'
import type { FailureCode } from '../lib/ai/validateGrounding'
import type { CareerProfileFull } from '../types/careerProfile'

let failures = 0
function check(name: string, cond: boolean) {
  if (cond) console.log(`  PASS  ${name}`)
  else {
    console.error(`  FAIL  ${name}`)
    failures++
  }
}

// ---------------------------------------------------------------------------
// Synthetic profiles. Deliberately unglamorous and deliberately varied: the
// optimizer must behave identically for a nurse and a site engineer.
// ---------------------------------------------------------------------------

let uid = 0
const id = () => `id-${++uid}`

function profileOf(opts: {
  summary?: string
  roles: Array<{ role: string; company: string; location?: string; highlights: string[] }>
  skills?: string[]
  certifications?: string[]
  education?: Array<{ degree: string; institution: string }>
}): CareerProfileFull {
  return {
    id: id(),
    full_name: 'Test Candidate',
    email: 't@example.com',
    phone: '+000',
    professional_summary: opts.summary ?? null,
    target_job_title: null,
    work_experience: opts.roles.map((r, i) => ({
      id: `exp-${i}-${id()}`,
      profile_id: 'p',
      company: r.company,
      role: r.role,
      location: r.location ?? null,
      start_date: '2016-01-01',
      end_date: '2022-01-01',
      description: null,
      highlights: r.highlights,
      sort_order: i,
      created_at: '',
      gcc_country: null,
    })),
    skills: (opts.skills ?? []).map((name, i) => ({
      id: `skill-${i}-${id()}`,
      profile_id: 'p',
      name,
      sort_order: i,
      created_at: '',
    })),
    certifications: (opts.certifications ?? []).map((name, i) => ({
      id: `cert-${i}-${id()}`,
      profile_id: 'p',
      name,
      issuer: null,
      issue_date: null,
      expiry_date: null,
      sort_order: i,
      created_at: '',
    })),
    education: (opts.education ?? []).map((e, i) => ({
      id: `edu-${i}-${id()}`,
      profile_id: 'p',
      degree: e.degree,
      institution: e.institution,
      field_of_study: null,
      start_year: null,
      end_year: null,
      sort_order: i,
      created_at: '',
    })),
    additional_information: [],
    field_visibility: {},
  } as unknown as CareerProfileFull
}

const PROFILES: Record<string, CareerProfileFull> = {
  'senior engineer': profileOf({
    summary: 'Commissioning engineer with 15+ years across process plants.',
    roles: [
      { role: 'Commissioning Engineer', company: 'Delta Projects', location: 'Doha, Qatar',
        highlights: ['Completed 120 loop checks', 'Followed ClientCo welding standard'] },
      { role: 'Site Engineer', company: 'Harbour Works',
        highlights: ['Supported cable pulling across two units'] },
    ],
    skills: ['Loop checking', 'Relay testing'],
    certifications: ['NEBOSH IGC'],
    education: [{ degree: 'BEng', institution: 'State University' }],
  }),
  'software developer': profileOf({
    summary: 'Backend developer with 6 years building payment services.',
    roles: [
      { role: 'Backend Developer', company: 'Ledger Systems',
        highlights: ['Built settlement service in Java', 'Cut batch runtime to 40 minutes'] },
      { role: 'Junior Developer', company: 'Formwork Apps',
        highlights: ['Maintained internal reporting tools'] },
    ],
    skills: ['Java', 'PostgreSQL'],
  }),
  'healthcare professional': profileOf({
    summary: 'Registered nurse with 8 years in acute medical wards.',
    roles: [
      { role: 'Staff Nurse', company: 'Riverside Hospital',
        highlights: ['Managed a 24-bed ward rota', 'Supported infection control audits'] },
    ],
    skills: ['Triage', 'Wound care'],
    certifications: ['BLS'],
  }),
  'finance professional': profileOf({
    summary: 'Management accountant with 10 years in manufacturing.',
    roles: [
      { role: 'Management Accountant', company: 'Northgate Foods',
        highlights: ['Owned monthly close for 3 entities', 'Reduced accrual errors'] },
    ],
    skills: ['IFRS', 'Variance analysis'],
  }),
  'sales professional': profileOf({
    summary: 'Field sales specialist with 7 years in industrial supply.',
    roles: [
      { role: 'Account Manager', company: 'Union Supply',
        highlights: ['Grew territory revenue by 18 percent', 'Managed 45 active accounts'] },
    ],
    skills: ['Territory planning'],
  }),
  'skilled technician': profileOf({
    summary: 'HVAC technician with 12 years in commercial buildings.',
    roles: [
      { role: 'HVAC Technician', company: 'Coolair Services',
        highlights: ['Serviced 60 rooftop units', 'Completed planned maintenance rounds'] },
    ],
    skills: ['Refrigerant handling'],
  }),
  'recent graduate': profileOf({
    summary: 'Recent logistics graduate seeking a first operations role.',
    roles: [
      { role: 'Intern', company: 'Portside Logistics',
        highlights: ['Assisted with inbound scheduling'] },
    ],
    skills: ['Excel'],
    education: [{ degree: 'BSc Logistics', institution: 'City College' }],
  }),
  'senior manager': profileOf({
    summary: 'Operations manager with 14 years in facilities management.',
    roles: [
      { role: 'Operations Manager', company: 'Meridian FM',
        highlights: ['Ran a team of 30 across two sites', 'Held a 2 million budget'] },
    ],
    skills: ['Contract management'],
  }),
}

const TARGET: OptimizationTarget = {
  target_job_title: 'Operations Lead',
  target_industry: null,
  target_country: null,
  target_company: null,
}

const selectedOf = (p: CareerProfileFull): SelectedBlocks => ({
  summary: true,
  experienceIds: p.work_experience.map((e) => e.id),
})

/** A well-formed response that simply echoes the profile's own text back. */
function cleanOutput(p: CareerProfileFull) {
  return {
    mode: 'job_description',
    summary: { generated: p.professional_summary ?? '' },
    experience_blocks: p.work_experience.map((e) => ({
      profile_experience_id: e.id,
      was_optimized: true,
      generated_bullets: e.highlights ?? [],
    })),
    skills_order: p.skills.map((s) => s.id),
  }
}

const codesOf = (r: { failures: Array<{ code: FailureCode }> }) => r.failures.map((f) => f.code)
const hasHard = (r: { failures: Array<{ code: FailureCode; severity: string }> }, code: FailureCode) =>
  r.failures.some((f) => f.code === code && f.severity === 'hard')

// ---------------------------------------------------------------------------
console.log('\nEvery profession passes when the output echoes the profile')
for (const [name, p] of Object.entries(PROFILES)) {
  const r = validateGrounding(p, cleanOutput(p), p.skills.map((s) => s.id))
  check(`${name}: clean output is valid`, r.valid)
}

console.log('\nBoth modes build, for every profession')
for (const [name, p] of Object.entries(PROFILES)) {
  const jd = buildOptimizationPrompt(p, TARGET, 'moderate', selectedOf(p), 'We need an operations lead.')
  const tt = buildOptimizationPrompt(p, TARGET, 'moderate', selectedOf(p), null)
  check(`${name}: JD mode is job_description`, jd.mode === 'job_description')
  check(`${name}: no-JD mode is target_title_only`, tt.mode === 'target_title_only')
  check(`${name}: JD prompt carries all five blocks`,
    ['BLOCK 1 — CANDIDATE FACTS', 'BLOCK 2 — TARGET CONTEXT', 'BLOCK 3 — EMPLOYER REQUIREMENTS',
     'BLOCK 5 — OUTPUT INSTRUCTIONS'].every((b) => jd.user.includes(b)))
  check(`${name}: title-only forbids a match percentage`,
    tt.user.includes('State or estimate any match, fit or ATS percentage'))
  check(`${name}: title-only carries no analysis block`, !tt.user.includes('BLOCK 4'))
}

console.log('\nMode derivation')
check('empty string is title-only', resolveOptimizationMode('') === 'target_title_only')
check('whitespace is title-only', resolveOptimizationMode('   ') === 'target_title_only')
check('null is title-only', resolveOptimizationMode(null) === 'target_title_only')
check('text is job_description', resolveOptimizationMode('Hiring a nurse') === 'job_description')

console.log('\nThe prompt is profession-neutral')
const neutral = buildOptimizationPrompt(PROFILES['healthcare professional'], TARGET, 'high', selectedOf(PROFILES['healthcare professional']), null)
for (const banned of ['Aramco', 'ADNOC', 'Indian', 'Instrumentation & Control', 'oil and gas']) {
  check(`system prompt does not mention ${banned}`, !neutral.system.includes(banned))
}
check('level text is preserved verbatim', neutral.system.includes(LEVEL_INSTRUCTION_TEXT.high))
check('level cannot relax grounding', neutral.system.includes('grounding rules above apply identically at every level'))

console.log('\nStated years of experience survive exactly')
const eng = PROFILES['senior engineer']
for (const bad of ['14+ years', '16 years', 'nearly 20 years']) {
  const out = { ...cleanOutput(eng), summary: { generated: `Commissioning engineer with ${bad} across process plants.` } }
  const r = validateGrounding(eng, out, eng.skills.map((s) => s.id))
  check(`summary "${bad}" is rejected`, !r.valid)
}
const okYears = { ...cleanOutput(eng), summary: { generated: 'Engineer with 15+ years across process plants.' } }
check('summary "15+ years" is accepted', validateGrounding(eng, okYears, eng.skills.map((s) => s.id)).valid)

console.log('\nJob-description requirements are never imported')
const dev = PROFILES['software developer']
const pmp = { ...cleanOutput(dev), summary: { generated: 'Backend developer with 6 years and PMP certification.' } }
check('PMP absent from profile is rejected',
  hasHard(validateGrounding(dev, pmp, dev.skills.map((s) => s.id), { jobDescription: 'Must hold PMP.' }), 'jd_only_entity'))

const pyBlocks = cleanOutput(dev)
pyBlocks.experience_blocks[0].generated_bullets = ['Built settlement service in Python']
check('Python added to a Java-only profile is rejected',
  hasHard(validateGrounding(dev, pyBlocks, dev.skills.map((s) => s.id), { jobDescription: 'Python required.' }), 'jd_only_entity'))

console.log('\nFacts cannot move between employment entries')
const sapProfile = profileOf({
  summary: 'Analyst with 9 years.',
  roles: [
    { role: 'Analyst', company: 'Alpha Retail', highlights: ['Ran month-end in SAP'] },
    { role: 'Analyst', company: 'Beta Foods', highlights: ['Prepared supplier reconciliations'] },
  ],
  skills: ['Reconciliations'],
})
const leak = cleanOutput(sapProfile)
leak.experience_blocks[1].generated_bullets = ['Prepared supplier reconciliations in SAP']
check('SAP from role 1 cannot appear in role 2',
  hasHard(validateGrounding(sapProfile, leak, sapProfile.skills.map((s) => s.id)), 'cross_entry_leak'))

const sharedProfile = profileOf({
  summary: 'Analyst.',
  roles: [
    { role: 'Analyst', company: 'Alpha Retail', highlights: ['Used Tableau daily'] },
    { role: 'Analyst', company: 'Beta Foods', highlights: ['Used Tableau for supplier reports'] },
  ],
  skills: ['Tableau'],
})
const shared = cleanOutput(sharedProfile)
shared.experience_blocks[1].generated_bullets = ['Built Tableau dashboards for suppliers']
check('a tool used in BOTH roles is not a leak (false-positive guard)',
  !codesOf(validateGrounding(sharedProfile, shared, sharedProfile.skills.map((s) => s.id))).includes('cross_entry_leak'))

console.log('\nNumbers are hard failures, and dates are not numbers')
const numOut = cleanOutput(eng)
numOut.experience_blocks[0].generated_bullets = ['Completed 5000 loop checks']
check('an invented quantity blocks the block',
  hasHard(validateGrounding(eng, numOut, eng.skills.map((s) => s.id)), 'unsourced_numeric'))
const dateOut = cleanOutput(eng)
dateOut.experience_blocks[0].generated_bullets = ['Completed 2016 loop checks']
check('an employment year is not a usable quantity',
  hasHard(validateGrounding(eng, dateOut, eng.skills.map((s) => s.id)), 'unsourced_numeric'))

const metricFree = PROFILES['recent graduate']
const invented = cleanOutput(metricFree)
invented.experience_blocks[0].generated_bullets = ['Improved scheduling accuracy by 30 percent']
check('a metric-free profile gets no invented percentage',
  hasHard(validateGrounding(metricFree, invented, metricFree.skills.map((s) => s.id)), 'unsourced_numeric'))

const summaryNum = { ...cleanOutput(eng), summary: { generated: 'Engineer who completed 9000 checks.' } }
check('an invented summary number is rejected',
  hasHard(validateGrounding(eng, summaryNum, eng.skills.map((s) => s.id)), 'unsourced_summary_numeric'))

console.log('\nThe numerics escape hatch still exists')
const lenient = validateGrounding(eng, numOut, eng.skills.map((s) => s.id), { strictNumerics: false })
check('strictNumerics:false downgrades to a flag', lenient.valid)

console.log('\nFixed fields and structure')
const fixed = { ...cleanOutput(eng), company: 'Somewhere Else' }
check('emitting a fixed field is rejected', hasHard(validateGrounding(eng, fixed, eng.skills.map((s) => s.id)), 'fixed_field_emitted'))
const unknownBlock = cleanOutput(eng)
unknownBlock.experience_blocks[0].profile_experience_id = 'not-a-real-id'
check('an invented employment id is rejected', hasHard(validateGrounding(eng, unknownBlock, eng.skills.map((s) => s.id)), 'unknown_experience_block'))
const extraSkill = validateGrounding(eng, cleanOutput(eng), [...eng.skills.map((s) => s.id), 'extra'])
check('a skills list with an extra entry is flagged', extraSkill.failures.some((f) => f.code === 'skills_not_permutation'))
check('a bad skills list alone never fails the resume (normalizeSkillsOrder repairs it; see verify-skills-order.ts)',
  extraSkill.valid && partitionFailures(extraSkill.failures).structural.length === 0)
const partialSkills = validateGrounding(eng, cleanOutput(eng), eng.skills.slice(0, 1).map((s) => s.id))
check('a partial skills list is not structural', partitionFailures(partialSkills.failures).structural.length === 0)

console.log('\nFailures are owned, so the caller can fall back per block')
const twoBad = cleanOutput(eng)
twoBad.experience_blocks[0].generated_bullets = ['Completed 5000 loop checks']
const part = partitionFailures(validateGrounding(eng, twoBad, eng.skills.map((s) => s.id)).failures)
check('no structural failure for a content-only problem', part.structural.length === 0)
check('the failing block is identified by id', part.byExperienceId.has(eng.work_experience[0].id))
check('the healthy block is not implicated', !part.byExperienceId.has(eng.work_experience[1].id))

const badSummary = { ...cleanOutput(eng), summary: { generated: 'Engineer who completed 9000 checks.' } }
const partS = partitionFailures(validateGrounding(eng, badSummary, eng.skills.map((s) => s.id)).failures)
check('a summary failure is owned by the summary', partS.summary.length > 0)
check('a summary failure implicates no experience block', partS.byExperienceId.size === 0)

const malformed = partitionFailures(validateGrounding(eng, 'not json', undefined).failures)
check('malformed JSON is structural, never a fallback', malformed.structural.length > 0)

console.log('\nThe profile serialization carries every section')
const full = buildOptimizationPrompt(eng, TARGET, 'moderate', selectedOf(eng), 'JD text')
for (const section of ['## IDENTITY', '## EXISTING PROFESSIONAL SUMMARY', '## WORK EXPERIENCE',
  '## SKILLS', '## CERTIFICATIONS', '## EDUCATION', '## ADDITIONAL INFORMATION', '## FIXED-FIELD RULE']) {
  check(`prompt carries ${section}`, full.user.includes(section))
}
check('schema no longer asks for claims', !full.user.includes('"claims"'))
check('historical titles are marked fixed', full.system.includes('never replaces a historical job title'))

if (failures > 0) {
  console.error(`\n${failures} check(s) failed`)
  process.exit(1)
}
console.log('\nAll optimization-grounding checks passed')
