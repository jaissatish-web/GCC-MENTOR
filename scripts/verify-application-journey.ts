import './resolve-paths'
import assert from 'node:assert/strict'
import { applicationHref, journeyNextAction, selectApplication, validGoal } from '../lib/applicationJourney'
import { careerResumeLabel } from '../lib/careerProfileResume'
import type { PackageSummary } from '../lib/packageSummary'

const cv = (id: string, extra: Partial<PackageSummary> = {}): PackageSummary => ({
  id, profile_id: 'owner-profile', tier: 'paid', name: null, target_job_title: id,
  target_company: null, target_country: null, target_industry: null, status: 'saved',
  optimization_level: 'moderate', template_id: null, is_paid: true, created_at: '2026-10-15',
  updated_at: null, job_url: null, application_deadline: null, interview_date: null,
  application_notes: null, has_resume: true, cover_letter_count: 0, qa_question_count: 0,
  mock_completed_run_id: null, mock_in_progress: false, ...extra,
})
assert.equal(careerResumeLabel({ name: 'My Career Profile Resume' }), 'My General CV')
assert.equal(careerResumeLabel({ name: 'My own CV name' }), 'My own CV name')
const general = cv('general-id', { tier: 'free', has_resume: false })
const first = cv('application-a', { cover_letter_count: 1, qa_question_count: 25 })
const second = cv('application-b')
const rows = [general, first, second]
assert.equal(selectApplication(rows, first.id)?.id, first.id)
assert.equal(selectApplication(rows, general.id)?.id, general.id)
assert.equal(selectApplication(rows, 'general')?.id, general.id)
assert.equal(selectApplication(rows, 'other-account-id')?.id, second.id)
assert.equal(selectApplication([], 'old-id'), null)
for (const destination of ['/cover-letter', '/interview-qa', '/mock-interview']) {
  assert.equal(applicationHref(destination, first), `${destination}?package=application-a`)
  assert.equal(applicationHref(destination, general), `${destination}?package=general-id`)
  assert.equal(applicationHref(destination, null), destination)
}
assert.equal(applicationHref('/profile', first), '/profile')
assert.equal(applicationHref('/mock-interview', cv('id&run=wrong')), '/mock-interview?package=id%26run%3Dwrong')
assert.equal(journeyNextAction(true, 80, rows, first, false, null).state, 'job_needs_mock')
assert.equal(journeyNextAction(true, 80, rows, second, false, null).state, 'job_needs_letter')
assert.equal(journeyNextAction(true, 80, rows, general, false, 'application').state, 'no_target_job')
assert.equal(journeyNextAction(true, 80, rows, general, false, 'interview').href, '/mock-interview?package=general-id')
assert.equal(journeyNextAction(false, 0, [], null, false, 'interview').state, 'no_profile')
assert.equal(journeyNextAction(true, 80, rows, first, true, 'interview').state, 'draft_waiting')
assert.equal(journeyNextAction(true, 80, rows, first, false, 'professional').href, '/linkedin-optimization')
assert.equal(journeyNextAction(true, 80, rows, first, false, 'cv').href, '/profile')
for (const value of ['application', 'cv', 'interview', 'professional']) assert.ok(validGoal(value))
for (const value of [null, '', 'admin', {}, 'https://untrusted.test']) assert.ok(!validGoal(value))
console.log('PASS: selected application, general CV, context-safe links, unavailable IDs, goals and next-action priority')
