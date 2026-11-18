import './resolve-paths'
import assert from 'node:assert/strict'
import { mergeDraftIntoProfile, describeReplaceLosses } from '../lib/profileMerge'
import type { CareerProfileDraft, CareerProfileFull } from '../types/careerProfile'

const saved = {
  id: 'profile', user_id: 'owner', full_name: 'Saved Person', email: 'saved@example.test',
  phone: '', current_location: '', visa_status: 'Saved visa', field_visibility: { email: false },
  work_experience: [{ id: 'work-1', profile_id: 'profile', company: 'Synthetic Employer', role: 'Coordinator',
    start_date: '2010-01', start_date_precision: 'month', end_date: '2012-06', end_date_precision: 'month',
    description: 'Saved responsibilities', end_date_unconfirmed: false, sort_order: 0 }],
  skills: [{ id: 'skill-1', profile_id: 'profile', name: 'Saved skill', sort_order: 0 }],
  certifications: [{ id: 'cert-1', name: 'Synthetic certificate', issue_date: '2011-01-01', issue_date_precision: null, expiry_date: null, expiry_date_precision: null, sort_order: 0 }],
  education: [], additional_information: [],
} as unknown as CareerProfileFull
const incoming = {
  full_name: 'Incoming Person', email: 'incoming@example.test', current_location: 'New location',
  work_experience: [{ company: 'Synthetic Employer', role: 'Coordinator', start_date: '2015-01', end_date: '2018-06', description: 'Later tenure', sort_order: 0 }],
  skills: [{ name: 'New skill', sort_order: 0 }], certifications: [], education: [], additional_information: [],
} as unknown as CareerProfileDraft
const originalSaved = JSON.stringify(saved), originalIncoming = JSON.stringify(incoming)
const later = mergeDraftIntoProfile(saved, incoming)
assert.equal(later.profile.work_experience.length, 2, 'a distinct later tenure must not disappear behind role+employer deduplication')
assert.equal(later.profile.work_experience[0].id, 'work-1')
assert.equal(later.profile.work_experience[1].id, undefined)
assert.equal(later.profile.full_name, saved.full_name)
assert.equal(later.profile.email, saved.email)
assert.equal(later.profile.current_location, 'New location')
assert.deepEqual(later.profile.field_visibility, saved.field_visibility)
assert.equal(later.added.work_experience, 1)

// The module is loaded only after the behavioral baseline assertion above, so RED
// demonstrates the existing data-loss bug rather than a missing-export error.
const { buildProposedProfileUpdates, stageProposedProfileUpdates } = require('../lib/profileProposedUpdates') as typeof import('../lib/profileProposedUpdates')
const overlap = { ...incoming, work_experience: [{ ...incoming.work_experience![0], start_date: '2011', end_date: '2014' }] } as CareerProfileDraft
const ambiguous = mergeDraftIntoProfile(saved, overlap)
assert.equal(ambiguous.profile.work_experience.length, 1, 'ambiguous tenure is staged, not silently appended as a confirmed new job')
assert.equal(ambiguous.ambiguousWork.length, 1)
assert.equal(ambiguous.ambiguousWork[0].reason, 'overlapping_dates')
assert.equal(ambiguous.ambiguousWork[0].incoming.start_date, '2011', 'ambiguous incoming facts remain available for explicit review')
assert.deepEqual(ambiguous.ambiguousWork[0].savedIds, ['work-1'])
assert.equal(stageProposedProfileUpdates(saved, overlap, [], 'add', {0: 'keep'}).work_experience.length, 1)
const explicitlySeparate = stageProposedProfileUpdates(saved, overlap, [], 'add', {0: 'add'})
assert.equal(explicitlySeparate.work_experience.length, 2, 'only an explicit tenure choice can stage an ambiguous source as a separate role')
assert.equal(explicitlySeparate.work_experience[0].id, 'work-1')
assert.equal(explicitlySeparate.work_experience[1].id, undefined)
const undated = mergeDraftIntoProfile(saved, { ...incoming, work_experience: [{company: 'Synthetic Employer', role: 'Coordinator', start_date: null, end_date: null}] } as unknown as CareerProfileDraft)
assert.equal(undated.ambiguousWork[0].reason, 'insufficient_dates')
assert.equal(mergeDraftIntoProfile(saved, { ...incoming, work_experience: [incoming.work_experience![0], incoming.work_experience![0]] } as CareerProfileDraft).profile.work_experience.length, 2, 'identical incoming tenures append once')
const invalidTenure = mergeDraftIntoProfile(saved, { ...incoming, work_experience: [{ ...incoming.work_experience![0], start_date: '2020', end_date: '2000' }] } as CareerProfileDraft)
assert.equal(invalidTenure.ambiguousWork.length, 1, 'invalid chronology must not establish a separate tenure')
assert.equal(mergeDraftIntoProfile(saved, { ...incoming, work_experience: [{ ...incoming.work_experience![0], start_date: '2010-01', end_date: '2000-01' }] } as CareerProfileDraft).ambiguousWork.length, 1, 'an apparently matching start must not hide an invalid end boundary')
const repeatedUnknown = { company: 'Another employer', role: 'Assistant', start_date: '2020', end_date: null, sort_order: 0 }
const repeated = mergeDraftIntoProfile(saved, { ...incoming, work_experience: [repeatedUnknown, {...repeatedUnknown, sort_order: 1}] } as CareerProfileDraft)
assert.equal(repeated.profile.work_experience.length, 2)
assert.equal(repeated.ambiguousWork.length, 0, 'exact repeated source rows are deduplicated without a spurious tenure conflict')
const earlyJanuary = { ...saved, work_experience: [{ ...saved.work_experience[0], start_date: '2010-01', start_date_precision: 'month', end_date: '2010-01-02', end_date_precision: 'day' }] } as CareerProfileFull
const lateJanuary = { ...incoming, work_experience: [{...incoming.work_experience![0], start_date: '2010-01-31', start_date_precision: 'day', end_date: '2011-02-01', end_date_precision: 'day'}] } as CareerProfileDraft
assert.equal(mergeDraftIntoProfile(earlyJanuary, lateJanuary).profile.work_experience.length, 2, 'proven disjoint tenures take precedence over month/day-compatible start matching')

const sameTenure = {
  ...incoming,
  work_experience: [{ company: 'Synthetic Employer', role: 'Coordinator', start_date: '2010-01', end_date: '2012-06', description: 'Incoming responsibilities', sort_order: 0 }],
  certifications: [{name: 'Synthetic certificate', issue_date: '2011', expiry_date: null}],
} as unknown as CareerProfileDraft
const proposed = buildProposedProfileUpdates(saved, sameTenure)
assert.equal(proposed.additions.profile.work_experience.length, 1)
assert.equal(proposed.additions.profile.work_experience[0].description, 'Saved responsibilities')
assert.ok(proposed.updates.some(update => update.fields.includes('full_name')))
const jobChange = proposed.updates.find(update => update.rowId === 'work-1' && update.fields.includes('description'))!
const certDate = proposed.updates.find(update => update.rowId === 'cert-1' && update.fields.includes('issue_date'))!
assert.ok(jobChange)
assert.deepEqual(certDate.fields, ['issue_date', 'issue_date_precision'], 'date and precision form one explicit change')
assert.equal(certDate.before.issue_date_precision, null)
assert.equal(certDate.after.issue_date_precision, 'year', 'fresh incoming date precision is inferred without certifying saved legacy dates')
const addMode = stageProposedProfileUpdates(saved, sameTenure, proposed.updates.map(update => update.id), 'add')
assert.equal(addMode.full_name, saved.full_name, 'Add mode disables all overwrite choices even when stale selections exist')
assert.equal(addMode.work_experience[0].description, 'Saved responsibilities')
const reviewed = stageProposedProfileUpdates(saved, sameTenure, [jobChange.id, certDate.id], 'updates')
assert.equal(reviewed.work_experience[0].description, 'Incoming responsibilities')
assert.equal(reviewed.work_experience[0].id, 'work-1')
assert.equal(reviewed.certifications[0].issue_date, '2011')
assert.equal(reviewed.certifications[0].issue_date_precision, 'year')
assert.equal(reviewed.full_name, saved.full_name, 'unselected fields stay saved-first')
assert.equal(reviewed.skills.length, 2, 'genuine additions survive explicit update choices')
const backToAdd = stageProposedProfileUpdates(saved, sameTenure, [jobChange.id, certDate.id], 'add')
assert.equal(backToAdd.work_experience[0].description, 'Saved responsibilities')
assert.equal(backToAdd.certifications[0].issue_date_precision, null)
assert.equal(backToAdd.skills.length, 2, 'switching to Add clears overwrites but keeps genuine additions')
assert.deepEqual(backToAdd.field_visibility, saved.field_visibility)
assert.equal(JSON.stringify(saved), originalSaved, 'saved facts are immutable')
assert.equal(JSON.stringify(incoming), originalIncoming, 'source facts are immutable')
assert.equal(describeReplaceLosses(saved, incoming).entries.work_experience, 1, 'replacement names the old tenure that would be lost despite matching title/employer')
console.log('PASS V4 merge: distinct tenures, visible ambiguity, explicit saved-first updates, atomic date facts, stable IDs/preferences, Add reset and named replacement losses')

const monthVersusDay=mergeDraftIntoProfile(saved,{...incoming,work_experience:[{...incoming.work_experience[0],start_date:'2010-01-17',start_date_precision:'day',end_date:'2013-06',end_date_precision:'month'}]} as CareerProfileDraft)
assert.equal(monthVersusDay.ambiguousWork.length,1,'partial-month start cannot silently identify the same tenure as a supplied full day with a differing end')
