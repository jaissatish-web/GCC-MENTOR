/**
 * Gulf Readiness v2 (2026-10-01) — photo, Gulf CV essentials, must-haves, verdict.
 *
 *   node_modules/.bin/sucrase-node scripts/verify-gulf-readiness-v2.ts
 *
 * Pins the founder-approved rules:
 *   - photo: 0 none · 2 hidden · 4 shown · 6 shown + checklist confirmed; unknown
 *     (pasted text) is left out, never counted as missing
 *   - notice period scored by how soon, not whether it is mentioned
 *   - must-haves apply only where they really apply (Saudi verification for a
 *     Saudi target, licence for regulated jobs, attestation with a degree)
 *   - verdict: a blocker outranks any score; an unanswered must-have keeps a
 *     strong profile at "almost", never "not ready"
 *   - fairness: WHICH nationality never changes the score
 */
import './resolve-paths'
import { calculateGulfReadiness } from '../lib/gulfReadiness/engine'
import { scoreProfileReadiness, type ProfileScoringInput } from '../lib/gulfReadiness/fromProfile'
import { noticeDays } from '../lib/gulfReadiness/essentials'
import type { FunnelAnswers } from '../lib/gulfReadiness/types'

let failures = 0
function check(name: string, cond: boolean, detail?: unknown) {
  if (cond) console.log(`  PASS  ${name}`)
  else {
    console.error(`  FAIL  ${name}${detail !== undefined ? ' — ' + JSON.stringify(detail) : ''}`)
    failures++
  }
}

const TODAY = new Date('2026-10-01T00:00:00Z')
const IN_GULF: FunnelAnswers = { hasGulfExperience: true, currentlyInGulf: true }
const ABROAD: FunnelAnswers = { hasGulfExperience: false, hasProfessionalExperience: true }

const base: ProfileScoringInput = {
  professional_summary: 'Senior site engineer with nine years delivering MEP works on high-rise residential and hospitality towers across Dubai and Mumbai. Leads teams of 20 technicians, coordinates consultants and authorities, and closed 14 projects on time and within budget.',
  email: 'ravi@example.com',
  phone: '+971 50 123 4567',
  nationality: 'Indian',
  current_location: 'Dubai, UAE',
  visa_status: 'Employment visa (transferable)',
  notice_period: '30 days',
  work_experience: [
    { company: 'Al Futtaim', role: 'Senior Site Engineer', start_date: '2020-03-01', end_date: null, location: 'Dubai, UAE', highlights: ['Led 20 technicians and 3 foremen across HVAC, plumbing and fire fighting', 'Delivered 6 towers worth AED 400M with zero lost-time incidents', 'Secured Civil Defence approval on first inspection for 3 projects'] },
    { company: 'L&T', role: 'Site Engineer', start_date: '2015-06-01', end_date: '2020-02-01', location: 'Mumbai', highlights: ['Closed 8 hotel and hospital projects for Taj and Apollo', 'Cut rework 15% by introducing shop-drawing reviews', 'Prepared BOQs and subcontractor bills for 40 packages'] },
  ],
  skills: ['HVAC', 'AutoCAD', 'Revit', 'Primavera P6', 'BOQ', 'Testing & Commissioning', 'Shop drawings', 'Value engineering', 'Fire fighting'].map((name) => ({ name })),
  certifications: [{ name: 'NEBOSH IGC' }, { name: 'PMP' }],
  education: [{ degree: 'B.E.', field_of_study: 'Mechanical Engineering', institution: 'University of Mumbai' }],
  passport_validity_date: '2031-01-01',
  whatsapp: '+971 50 123 4567',
  has_driving_license: true,
  driving_license_country: 'UAE',
  arabic_level: 'basic',
  degree_attestation: 'done',
  target_country: 'uae',
  target_job_title: 'Senior MEP Engineer',
}
const score = (p: ProfileScoringInput, a: FunnelAnswers = IN_GULF) => scoreProfileReadiness(p, a, TODAY)
const essentialsOf = (r: ReturnType<typeof score>) => r.dimensions.find((d) => d.key === 'gulf_essentials')!

console.log('1. photo')
const none = score({ ...base, photo_url: null })
const hidden = score({ ...base, photo_url: 'p.jpg', photo_visible: false })
const shown = score({ ...base, photo_url: 'p.jpg', photo_visible: true })
const confirmed = score({ ...base, photo_url: 'p.jpg', photo_visible: true, photo_checklist_confirmed: true })
const e = (r: ReturnType<typeof score>) => essentialsOf(r).score
check('essentials: none < hidden < shown < confirmed', e(none) < e(hidden) && e(hidden) < e(shown) && e(shown) < e(confirmed), [e(none), e(hidden), e(shown), e(confirmed)])
check('a confirmed professional photo is worth 6 points over none', e(confirmed) - e(none) === 6, e(confirmed) - e(none))
check('no photo → "Add a professional photo" worth +6', none.recommendations.some((r) => r.title === 'Add a professional photo' && r.gain === 6))
check('shown but unconfirmed → asked to confirm the checklist', shown.recommendations.some((r) => r.title === 'Confirm your photo is professional'))
check('confirmed photo → no photo step', !confirmed.recommendations.some((r) => /photo/i.test(r.title)))
const pasted = calculateGulfReadiness({ answers: IN_GULF, resumeText: 'x '.repeat(10), facts: { photo: 'unknown' } })
check('anonymous pasted text: photo left out, never told it is missing', !pasted.recommendations.some((r) => /photo/i.test(r.title)))

console.log('2. notice period')
check('notice: "Immediate" = 0, "1 month" = 30, "90 days" = 90, "3 months" = 90', noticeDays('Immediate') === 0 && noticeDays('1 month') === 30 && noticeDays('90 days') === 90 && noticeDays('3 months') === 90)
const fast = e(score({ ...base, notice_period: 'Immediate' }))
const slow = e(score({ ...base, notice_period: '3 months' }))
check('immediate joiner scores higher than 3 months notice', fast > slow, [fast, slow])

console.log('3. must-haves')
const keys = (r: ReturnType<typeof score>) => r.mustHaves.map((m) => m.key).sort().join(',')
check('UAE engineer with a degree: passport + attestation only', keys(confirmed) === 'degree_attestation,passport', keys(confirmed))
const saudi = score({ ...base, target_country: 'saudi_arabia' })
check('Saudi target adds Saudi verification and SCE (engineer)', keys(saudi) === 'degree_attestation,passport,professional_licence,saudi_verification', keys(saudi))
const nurse = score({ ...base, target_job_title: 'Staff Nurse', education: [{ degree: 'B.Sc', field_of_study: 'Nursing', institution: 'Kerala University' }], target_country: 'uae' })
const lic = nurse.mustHaves.find((m) => m.key === 'professional_licence')
check('a nurse needs a healthcare licence, naming the UAE regulators', !!lic && /DHA/.test(lic.why), lic?.why)
const expired = score({ ...base, passport_validity_date: '2026-12-01' })
check('passport expiring in 2 months is a blocker', expired.mustHaves.find((m) => m.key === 'passport')?.status === 'missing')
const ecr = score({ ...base, passport_type: 'ECR' })
check('ECR passport gets the emigration-clearance step', ecr.mustHaves.find((m) => m.key === 'passport')!.steps.some((s) => /eMigrate/.test(s)))
const noDegree = score({ ...base, education: [{ degree: 'HSC', institution: 'State Board' }] })
check('no degree → no attestation must-have', !noDegree.mustHaves.some((m) => m.key === 'degree_attestation'), keys(noDegree))
const notNeeded = score({ ...base, degree_attestation: 'not_needed' })
check('attestation "not needed" is dropped', !notNeeded.mustHaves.some((m) => m.key === 'degree_attestation'))

console.log('4. verdict')
check('everything in place → Ready to apply', confirmed.verdict.key === 'ready', [confirmed.finalScore, confirmed.verdict])
check('expired passport → Not ready yet, whatever the score', expired.verdict.key === 'not_ready' && expired.finalScore >= 75, [expired.finalScore, expired.verdict.key])
const unanswered = score({ ...base, degree_attestation: null, photo_url: 'p.jpg', photo_checklist_confirmed: true })
check('attestation not answered → Almost ready (not checked), not "not ready"', unanswered.verdict.key === 'almost' && unanswered.verdict.pending === 1, unanswered.verdict)
check('paperwork steps lead the path', unanswered.recommendations[0]?.stage === 'paperwork', unanswered.recommendations[0])
check('the path always ends with an apply step', confirmed.recommendations.some((r) => r.stage === 'apply'))

check('a blocker is named as paperwork to sort out', /to sort out/.test(expired.verdict.label), expired.verdict.label)
check('an unanswered item is named as paperwork to check', /to check/.test(unanswered.verdict.label), unanswered.verdict.label)
const thin = calculateGulfReadiness({ answers: IN_GULF, resumeText: 'Ravi Kumar\nSite engineer\nB.E. Mechanical, Anna University\n' + 'worked on projects '.repeat(40), today: TODAY })
check('a low CV score is never presented as a paperwork problem', thin.verdict.key === 'not_ready' && /strengthen your CV/.test(thin.verdict.label), thin.verdict.label)
const bhm = score({ ...base, education: [{ degree: 'BHM', field_of_study: 'Hotel Management', institution: 'IHM Mumbai' }], degree_attestation: null })
check('a hospitality degree (BHM) needs attestation too', bhm.mustHaves.some((m) => m.key === 'degree_attestation'))
const mention = e(score({ ...confirmedProfile(), arabic_level: null, additional_information: [{ label: 'Languages', value: 'English, Arabic' }] }))
const basic = e(score({ ...confirmedProfile(), arabic_level: 'basic', additional_information: [{ label: 'Languages', value: 'English, Arabic' }] }))
check('answering "Basic" Arabic never lowers the score below a bare mention', basic >= mention, [mention, basic])

console.log('5. fairness')
const a = score({ ...confirmedProfile(), nationality: 'Indian' })
const b = score({ ...confirmedProfile(), nationality: 'Filipino' })
const c = score({ ...confirmedProfile(), nationality: 'British' })
check('which nationality never changes the score', a.finalScore === b.finalScore && b.finalScore === c.finalScore, [a.finalScore, b.finalScore, c.finalScore])
function confirmedProfile(): ProfileScoringInput { return { ...base, photo_url: 'p.jpg', photo_checklist_confirmed: true } }

console.log('6. abroad')
const abroad = score({ ...base, current_location: 'Mumbai, India', visa_status: null }, ABROAD)
check('outside the Gulf, passport details stand in for visa status', !abroad.recommendations.some((r) => r.title === 'State your visa status'))

console.log(failures === 0 ? '\nALL PASS' : `\n${failures} FAILED`)
process.exit(failures === 0 ? 0 : 1)
