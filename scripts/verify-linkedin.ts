import assert from 'node:assert/strict'
import './resolve-paths'
import { makeTemplateFixture } from './fixtures/templateFixture'
import {
  candidateFacts,
  checklistKeys,
  completion,
  importConflicts,
  outputShape,
  parseSetup,
  publicText,
} from '../lib/linkedin/model'
import { DEFAULT_SETUP } from '../lib/linkedin/types'
import {
  buildLinkedInInput,
  LINKEDIN_PERSONA,
  LINKEDIN_INSTRUCTIONS,
} from '../lib/ai/buildLinkedInPrompt'
import { validateLinkedIn } from '../lib/ai/validateLinkedIn'

const profile = makeTemplateFixture().profile
const setup = {
  ...DEFAULT_SETUP,
  targetRoles: 'Piping Engineer',
  experienceIds: profile.work_experience.map((role) => role.id),
}
const output = {
  headlines: [
    profile.work_experience[0].role,
    profile.work_experience[0].role,
    profile.work_experience[0].role,
  ],
  about: profile.professional_summary ?? 'Piping Engineer',
  experience: profile.work_experience.map((role) => ({
    id: role.id,
    description:
      [role.description, ...(role.highlights ?? [])]
        .filter(Boolean)
        .join('\n') || role.role,
  })),
  skills: profile.skills.slice(0, 15).map((skill) => skill.name),
  advice: [
    'Emphasize your documented engineering work.',
    'Keep your strongest saved skills visible.',
    'Use a clear professional photo.',
  ],
}
assert.ok(parseSetup(setup, profile))
assert.equal(
  parseSetup({ ...setup, experienceIds: ['other-owner'] }, profile),
  null,
)
assert.equal(parseSetup({ ...setup, targetRoles: '' }, profile), null)
assert.equal(
  parseSetup(
    {
      ...setup,
      experienceIds: [setup.experienceIds[0], setup.experienceIds[0]],
    },
    profile,
  ),
  null,
)
assert.equal(
  parseSetup({ ...setup, omitTerms: ['x'.repeat(81)] }, profile),
  null,
)
assert.equal(
  'extra' in parseSetup({ ...setup, extra: 'override' }, profile)!,
  false,
)
assert.equal(publicText('A+B (client)', ['A+B']), '[private] (client)')
assert.equal(outputShape(output, profile, setup.experienceIds), null)
assert.ok(
  outputShape(
    { ...output, skills: ['Invented licence'] },
    profile,
    setup.experienceIds,
  ),
)
assert.ok(
  outputShape(
    { ...output, experience: [...output.experience, output.experience[0]] },
    profile,
    setup.experienceIds,
  ),
)
assert.ok(
  outputShape(
    { ...output, full_name: 'Invented' },
    profile,
    setup.experienceIds,
  ),
)
const valid = validateLinkedIn(profile, output)
assert.equal(valid.valid, true, JSON.stringify(valid.failures))
assert.equal(
  validateLinkedIn(profile, {
    ...output,
    about: 'I increased production by 98765%.',
  }).valid,
  false,
)
const facts = candidateFacts(profile, setup)
assert.equal('phone' in facts, false)
assert.equal('nationality' in facts, false)
assert.equal('photo_url' in facts, false)
const privateInput = buildLinkedInInput(
  {
    ...profile,
    professional_summary: `Contact ${profile.email}. PrivateClient`,
    email: 'private@example.org',
  },
  { ...setup, omitTerms: ['PrivateClient'] },
  null,
)
assert.ok(!privateInput.includes('private@example.org'))
assert.ok(!JSON.stringify(facts).includes('passport'))
assert.ok(LINKEDIN_PERSONA.includes('nursing'))
assert.ok(LINKEDIN_PERSONA.includes('THIS candidate'))
assert.ok(LINKEDIN_INSTRUCTIONS.includes('never transfer'))
assert.ok(LINKEDIN_INSTRUCTIONS.includes('first person'))
const role = profile.work_experience[0]
assert.deepEqual(importConflicts(profile, null), [])
const conflicts = importConflicts(profile, {
  id: 'import',
  fullName: 'Different Person',
  summary: '',
  warnings: [],
  experience: [
    {
      company: role.company,
      role: 'Another title',
      start: '1900-01-01',
      end: '1901-01-01',
      description: '',
    },
  ],
})
assert.deepEqual(
  conflicts.map((item) => item.id),
  ['identity', 'import-0-role', 'import-0-start', 'import-0-end'],
)
assert.ok(
  importConflicts(profile, {
    id: 'import',
    fullName: '',
    summary: '',
    warnings: [],
    experience: [
      {
        company: 'Another employer',
        role: role.role,
        start: null,
        end: null,
        description: '',
      },
    ],
  }).some((item) => item.id.includes('unmatched')),
)
const keys = checklistKeys(output, profile)
assert.equal(completion(keys, [], []), 0)
assert.equal(completion(keys, keys, []), 100)
assert.equal(completion(keys, keys.slice(1), [keys[0]]), 100)
assert.equal(completion(keys, [], keys), 0)
// New graduates and other disciplines have no engineering default in their source facts.
const nursing = {
  ...profile,
  full_name: 'Aisha',
  professional_summary: 'Registered nurse providing patient care.',
  work_experience: [],
  skills: [{ ...profile.skills[0], name: 'Patient care' }],
}
const nursingSetup = {
  ...setup,
  targetRoles: 'Staff Nurse',
  experienceIds: [],
}
const nurseInput = buildLinkedInInput(nursing, nursingSetup, null)
assert.ok(nurseInput.includes('Staff Nurse'))
assert.equal(candidateFacts(nursing, nursingSetup).experience.length, 0)
console.log(
  'PASS: LinkedIn personalization, privacy, facts/shape validation, cross-owner IDs, conflicts, freshers and completion rules',
)
