/**
 * Service output fixes from the 2026-09-23 real end-to-end test.
 *
 *   node_modules/.bin/sucrase-node scripts/verify-service-outputs.ts
 *
 * 1. Interview Q&A failed outright (502 after 214s) because the validator
 *    demanded EXACTLY 25 items and the model returned a shorter list twice.
 * 2. The cover letter never received visa status or notice period, although
 *    the real KSA advert asked applicants to state their notice period.
 */

import './resolve-paths'
import { MIN_QA_QUESTIONS, dropNearDuplicates, normalizeInterviewQa, validateInterviewQa, withPartCategories } from '../lib/ai/validateInterviewQa'
import { QA_PARTS, gulfFactLine } from '../lib/ai/buildInterviewQaPrompt'
import type { CareerProfileFull } from '../types/careerProfile'
import { buildCoverLetterPrompt } from '../lib/ai/buildCoverLetterPrompt'
import { validateCoverLetterGrounding } from '../lib/ai/validateCoverLetterGrounding'
import { signOffBlock, writtenAboutApplicant } from '../lib/ai/naturalLetter'
import { onHundredScale } from '../lib/ai/validateMockInterview'
import { claimsInFeedback, notInCvFeedback, removePersonalClaims, splitSentences, unverifiedEntityClaims } from '../lib/ai/proseClaims'

let failures = 0
function check(name: string, cond: boolean) {
  if (cond) console.log(`  PASS  ${name}`)
  else {
    console.error(`  FAIL  ${name}`)
    failures++
  }
}

const q = (i: number) => ({
  category: 'technical',
  difficulty: 'standard',
  question: `Question ${i}?`,
  answer: `Answer ${i}.`,
  why_asked: 'Because.',
  resume_basis: 'Role 1',
  follow_up: null,
  tags: ['dcs'],
})

console.log('\nInterview Q&A validation')
check('25 valid questions pass', validateInterviewQa({ questions: Array.from({ length: 25 }, (_, i) => q(i)) }).valid)
check('22 valid questions now pass (was a hard failure)', validateInterviewQa({ questions: Array.from({ length: 22 }, (_, i) => q(i)) }).valid)
check(`fewer than ${MIN_QA_QUESTIONS} fail`, !validateInterviewQa({ questions: Array.from({ length: MIN_QA_QUESTIONS - 1 }, (_, i) => q(i)) }).valid)
const mixed = { questions: [...Array.from({ length: 20 }, (_, i) => q(i)), { ...q(99), answer: '' }, { junk: true }] }
check('one malformed item no longer fails a good set', validateInterviewQa(mixed).valid)
check('...and the malformed items are dropped', normalizeInterviewQa(mixed).questions.length === 20)
check('never more than 25 are kept', normalizeInterviewQa({ questions: Array.from({ length: 30 }, (_, i) => q(i)) }).questions.length === 25)
check('a missing array still fails', !validateInterviewQa({}).valid)

console.log('\nInterview Q&A in five parts (2026-10-03)')
check('the five parts add up to 25 questions', QA_PARTS.reduce((n, p) => n + p.count, 0) === 25)
check('a part of 5 passes with 3 good items', validateInterviewQa({ questions: [q(1), q(2), q(3)] }, 3).valid)
check('...and fails with 2', !validateInterviewQa({ questions: [q(1), q(2)] }, 3).valid)
{
  const labelled = withPartCategories({ questions: [{ ...q(1), category: 'gulf_readiness | company_role' }, { ...q(2), category: 'gulf_readiness' }] }, ['gulf_readiness', 'company_role']) as { questions: Array<{ category: string }> }
  check('a copied schema label becomes the part\'s category', labelled.questions[0].category === 'company_role')
  check('a correct label is left alone', labelled.questions[1].category === 'gulf_readiness')
}
{
  const ask = (question: string) => ({ question })
  const set = [
    ask('Walk me through your role on the metro station project at Larsen & Toubro.'),
    ask('Tell me about a mistake you made on the metro station project at Larsen & Toubro.'),
    ask('How did you reduce rework on the metro station project at Larsen & Toubro?'),
    ask('Describe your experience with SAP FICO implementation at Lulu International Exchange.'),
    ask('At Lulu International Exchange you helped implement SAP FICO. What was your part?'),
  ]
  const kept = dropNearDuplicates(set).map((x) => x.question)
  check('different questions about the same project are all kept', kept.filter((x) => x.includes('metro')).length === 3)
  check('the same question asked twice is kept once', kept.filter((x) => x.includes('SAP FICO')).length === 1)
  const pair = dropNearDuplicates([
    { question: 'On the metro station project at Larsen & Toubro, how did you achieve zero rework?', category: 'project' },
    { question: 'Tell me about a mistake you made on the metro station project at Larsen & Toubro.', category: 'behavioral' },
  ])
  check('a behavioural question about the same project is not a repeat', pair.length === 2)
}
{
  const base = { work_experience: [] } as unknown as CareerProfileFull
  const work = (location: string, start: string, end: string | null) => ({ location, start_date: start, end_date: end })
  const now = new Date('2026-10-01')
  check('no Gulf roles -> "none on the CV"', /none on the CV/.test(gulfFactLine({ ...base, work_experience: [work('Pune, India', '2015-01-01', null)] } as never, now)))
  check('Gulf years counted only from Gulf roles', /^Gulf \(GCC\) experience: 10\+ years, in Qatar, UAE\./.test(
    gulfFactLine({ ...base, work_experience: [work('Mumbai, India', '2012-01-01', '2016-10-01'), work('Doha, Qatar', '2016-11-01', '2020-02-01'), work('Dubai, UAE', '2020-03-01', null)] } as never, now),
  ))
}

console.log('\nCover letter facts')
const profile = {
  full_name: 'Test Candidate',
  nationality: 'Indian',
  current_location: 'Duba, Tabuk, Saudi Arabia',
  currently_in_gulf: true,
  visa_status: 'Transferable Iqama',
  notice_period: '60 days',
  professional_summary: 'Commissioning engineer.',
  work_experience: [],
  skills: [],
  certifications: [],
  education: [],
  additional_information: [],
} as never
const prompt = buildCoverLetterPrompt(profile, { target_job_title: 'Commissioning Leader', target_industry: null, target_country: 'saudi_arabia', target_company: 'KENT' }, 'Notice period required.')
check('visa status reaches the letter', prompt.user.includes('Visa status: Transferable Iqama'))
check('notice period reaches the letter', prompt.user.includes('Notice period: 60 days'))
const letter = {
  greeting: 'Dear Hiring Manager,',
  opening_paragraph: 'I am applying for the Commissioning Leader role at KENT.',
  body_paragraphs: ['I hold a Transferable Iqama and can join after a 60 days notice period.'],
  closing_paragraph: 'Thank you.',
  sign_off: 'Sincerely,',
}
const v = validateCoverLetterGrounding(profile, letter)
check('the notice-period number is the profile\'s own, not "unsourced"', !v.failures.some((f) => f.code === 'unsourced_numeric'))
const invented = validateCoverLetterGrounding(profile, { ...letter, body_paragraphs: ['I can join after 90 days.'] })
check('a different number is still caught', invented.failures.some((f) => f.code === 'unsourced_numeric'))

console.log('\nPersonal circumstances in generated Q&A answers')
{
  const evidence = 'Instrument Pre-Commissioning Engineer, Duba, Tabuk, Saudi Arabia. Transferable Iqama. No notice period.'
  const real =
    'Yes, I am open to relocation within Saudi Arabia. I am currently in Tabuk for the NEOM project, but I understand that projects may be elsewhere. I have no family constraints and am ready to move as required. My notice period is zero, so I can start immediately.'
  const r = removePersonalClaims(real, evidence)
  check('the invented "no family constraints" sentence is removed', r.changed && !r.text.includes('no family constraints'))
  check('the unstated relocation claim is removed', !r.text.includes('open to relocation'))
  check('true sentences stay', /currently in Tabuk/.test(r.text) && /notice period is zero/.test(r.text))
  check('no placeholder when enough true text remains', !r.text.includes('[your availability'))
  check(
    'a placeholder when too little is left',
    removePersonalClaims('I have no family constraints.', evidence).text.includes('[your availability'),
  )
  check(
    '"familiar" is not a personal claim (a real OPERCOM answer lost a sentence to it)',
    !removePersonalClaims('I am familiar with gate-based completion systems like ICAPS.', evidence).changed,
  )
  check('splitSentences keeps "99.2%" in one sentence', splitSentences('We reached 99.2% accuracy. Then handover.').length === 2)
  const stated = removePersonalClaims('I am willing to relocate across the GCC.', 'Location: Duba — willing to relocate across GCC')
  check('relocation the profile states is kept', !stated.changed)
  check('an answer without personal claims is untouched', !removePersonalClaims('I led loop checks at NEOM.', evidence).changed)
}

console.log('\nMock interview: credentials and products the CV never mentions')
{
  const evidence = [
    'Instrument Pre-Commissioning Engineer CCC — Air Products Duba, Tabuk, Saudi Arabia',
    'Completed 50,000+ instrumentation loop checks ahead of schedule with 99.2% first-pass accuracy',
    'Coordinated FAT/SAT with OEM vendors; managed ITR/ICAPS sign-off',
    'Supervised 12+ engineers and 90+ technicians',
    'Skills: Honeywell Experion PKS, Siemens S7, Emerson AMS, Triconex TS3000',
    'Certifications: Functional Safety SIS Awareness — TÜV/Industry Standard',
    'Key Projects: NEOM NGHC, USD 8.4B green hydrogen facility',
  ].join('\n')
  const fabricated = 'I have commissioned Emerson DeltaV systems on five projects and I hold a TUV Functional Safety Engineer certificate, so Emerson is my strongest platform.'
  const flagged = unverifiedEntityClaims(fabricated, evidence)
  check('"DeltaV" (not in the CV) is flagged', flagged.includes('DeltaV'))
  check('the unheld certificate is flagged', flagged.some((f) => /Functional Safety Engineer/.test(f)))
  const truthful =
    'At the NEOM green hydrogen project with Air Products I supervised 12+ engineers and 90+ technicians and we completed over 50,000 loop checks. I tracked progress against the ICAPS database.'
  check('a truthful answer is not flagged', unverifiedEntityClaims(truthful, evidence).length === 0)
  check('"Siemens S7" from the CV is not flagged', unverifiedEntityClaims('I validated Siemens S7 logic.', evidence).length === 0)
  check('an honest "I have not used DeltaV" is not a claim', unverifiedEntityClaims('I have not used DeltaV, but I know Experion.', evidence).length === 0)
  check('the TÜV awareness certificate the CV holds is not flagged', unverifiedEntityClaims('I hold the Functional Safety SIS Awareness certificate from TÜV.', evidence).length === 0)
  const feedback = notInCvFeedback(['DeltaV', 'TUV Functional Safety Engineer'], 'Weak answer.')
  check('the report can read the flagged claims back', claimsInFeedback(feedback).join('|') === 'DeltaV|TUV Functional Safety Engineer')
}

console.log('\nCover letter is the applicant\'s own (2026-10-03 live audit)')
{
  const live = 'I am writing to recommend Rania Haddad for the ICU Staff Nurse position. With 8+ years of experience, she brings clinical competence. Her skills in ventilator management are directly applicable.'
  check('the live "recommend Rania ... she brings" letter is caught', writtenAboutApplicant(live, 'Rania Haddad'))
  check('a first-person letter passes', !writtenAboutApplicant('I would like to apply for the ICU Staff Nurse role. In my current role I lead shifts and train new nurses.', 'Rania Haddad'))
  check('one "he" about a patient does not fail a letter', !writtenAboutApplicant('I cared for a patient until he was stable, and I trained my team.', 'Rania Haddad'))
  check('an employer that shares a first name is not the applicant', !writtenAboutApplicant('I worked at Ali Bin Ali Trading for six years.', 'Ali Khan'))
  check('name and contact under the sign-off', signOffBlock('Sincerely,', 'Rania Haddad', '+971 57 573 6749 · rania@example.com') === 'Sincerely,\nRania Haddad\n+971 57 573 6749 · rania@example.com')
  check('a capitals name is written normally', signOffBlock('Regards,', 'JOSEPH THOMAS VARGHESE', '') === 'Regards,\nJoseph Thomas Varghese')
  check('an empty sign-off still closes the letter', signOffBlock('', 'Rania Haddad', null).startsWith('Sincerely,\nRania'))
}

console.log('\nMock interview report scale (2026-10-03)')
{
  const r10 = { overall_score: 2, technical_score: 2, role_fit_score: 3, gulf_readiness_score: 3, answer_structure_score: 2 }
  const scaled = onHundredScale(r10, [3, 4]) as typeof r10
  check('a report on the 10-point scale is moved to 100', scaled.overall_score === 20 && scaled.role_fit_score === 30)
  const r100 = { overall_score: 25, technical_score: 20, role_fit_score: 30, gulf_readiness_score: 40, answer_structure_score: 30 }
  check('a report already out of 100 is left alone', (onHundredScale(r100, [3, 4]) as typeof r100).overall_score === 25)
  check('very weak answers keep a very low report', (onHundredScale({ ...r10, overall_score: 1 }, [1, 1]) as typeof r10).overall_score === 1)
}

console.log(failures === 0 ? '\nAll assertions passed.\n' : `\n${failures} FAILED\n`)
process.exit(failures === 0 ? 0 : 1)
