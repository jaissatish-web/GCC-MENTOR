/** Deterministic profile scenarios; no claim of live model extraction quality. */
import './resolve-paths'
import { strict as assert } from 'node:assert'
import { PROFILE_BLOCKS, profileBlockForCategory } from '../lib/careerProfileBlocks'
import { normalizeDraft } from '../lib/ai/extractionPrompt'
import { organizeCategoryEntries, validateCategoryEntries } from '../lib/profileCategories'

assert.equal(PROFILE_BLOCKS.length, 14)
assert.equal(new Set(PROFILE_BLOCKS.map(block => block.id)).size, 14)
const scenarios = [
  ['Academic Projects', 'projects', 'Solar tracker; academic project; role: controls; 2025'],
  ['Professional Registration', 'licences', 'Nursing registration, authority supplied, valid until 2027'],
  ['Publications', 'research', 'Paper title, journal, 2025'],
  ['Volunteer Experience', 'activities', 'Community teaching, weekends'],
  ['GitHub', 'links', 'https://github.com/example'],
  ['Languages', 'languages', 'English'],
  ['Awards', 'achievements', 'First prize, university robotics competition'],
  ['Training', 'training', 'Apprenticeship classroom training, 2024'],
  ['Software & Systems', 'skills', 'AutoCAD; SAP'],
  ['Education Details', 'education', 'Diploma, ongoing; expected completion 2027'],
  ['Availability & Preferences', 'gulf', 'Notice period: 60 days'],
] as const
for (const [heading, expected, value] of scenarios) {
  assert.equal(profileBlockForCategory(heading), expected, heading)
  const result = normalizeDraft({ additional_information: [{ category_name: heading, label: heading, value, sort_order: 1 }] })!
  assert.equal(result.additional_information[0].category_name, heading)
  assert.equal(result.additional_information[0].value, value)
  assert.equal(result.work_experience.length, 0, 'specialist information must not create employment')
  assert.equal(result.additional_information[0].level, null, 'never invent proficiency')
}
assert.equal(profileBlockForCategory('Preparation details (private)'), null)
assert.equal(profileBlockForCategory('Unusual original heading'), null)
const id = 'a6fa0d8f-9ca4-493f-994c-567886e32bd1'
const existing = [{ label: 'Cloud portal', value: 'Client: ABC; role: contractor; dates as supplied', category_id: id, category_name: 'Client Portfolio', category_order: 8, category_position: 'after_experience' as const, show_on_resume: false, level: '', sort_order: 1 }]
const organized = organizeCategoryEntries(existing, () => { throw Error('must preserve existing category identity') })
assert.deepEqual(organized, existing)
assert.equal(validateCategoryEntries(organized), null)
const employment = normalizeDraft({ work_experience: [{ company: 'Actual Contractor', role: 'Engineer', description: 'Contract employment; client: Project Owner; project: Plant A', start_date: '2023', sort_order: 1 }] })!
assert.equal(employment.work_experience[0].company, 'Actual Contractor')
assert.equal(employment.work_experience[0].description, 'Contract employment; client: Project Owner; project: Plant A')
console.log(`PASS 14 profile blocks, ${scenarios.length} career scenarios, category preservation and employer context`)
