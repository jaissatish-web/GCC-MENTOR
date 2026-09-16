/**
 * Skill ordering is recoverable presentation metadata (2026-09-16).
 *
 *   node_modules/.bin/sucrase-node scripts/verify-skills-order.ts
 *
 * Regression for a production failure: POST /api/optimize returned 502 with
 * `skills_not_permutation@output.skills_order` on consecutive builds because
 * the model omitted skills from its ordering. The validator rejected a list the
 * persistence step already knew how to repair.
 *
 * Every case runs the real validator AND the real normalizer the route saves
 * with (lib/ai/skillsOrder.ts), and asserts both that the resume is not failed
 * and that the saved order is safe. No AI call, no network, no database.
 */

import './resolve-paths'
import { validateGrounding, partitionFailures } from '../lib/ai/validateGrounding'
import { normalizeSkillsOrder } from '../lib/ai/skillsOrder'
import type { CareerProfileFull } from '../types/careerProfile'

let failures = 0
function check(name: string, cond: boolean) {
  if (cond) console.log(`  PASS  ${name}`)
  else {
    console.error(`  FAIL  ${name}`)
    failures++
  }
}

// sort_order deliberately differs from array order, so "original profile
// order" is proven to mean sort_order and not insertion order.
const SKILLS = [
  { id: 'sk-c', name: 'Loop Checking', sort_order: 2 },
  { id: 'sk-a', name: 'PLC Programming', sort_order: 0 },
  { id: 'sk-d', name: 'HAZOP', sort_order: 3 },
  { id: 'sk-b', name: 'DCS Configuration', sort_order: 1 },
  { id: 'sk-e', name: 'Calibration', sort_order: 4 },
]
const PROFILE_ORDER = ['sk-a', 'sk-b', 'sk-c', 'sk-d', 'sk-e']
const nameOf = (id: string) => SKILLS.find((s) => s.id === id)!.name

const profile = {
  id: 'p1',
  full_name: 'Test Candidate',
  email: 't@example.com',
  phone: '+000',
  professional_summary: 'Instrumentation engineer.',
  target_job_title: null,
  work_experience: [
    {
      id: 'exp-1',
      profile_id: 'p1',
      company: 'Plant Co',
      role: 'Engineer',
      location: null,
      start_date: '2016-01-01',
      end_date: '2022-01-01',
      description: null,
      highlights: ['Commissioned field instruments'],
      sort_order: 0,
      created_at: '',
      gcc_country: null,
    },
  ],
  skills: SKILLS.map((s) => ({ ...s, profile_id: 'p1', created_at: '' })),
  certifications: [],
  education: [],
  additional_information: [],
  field_visibility: {},
} as unknown as CareerProfileFull

const NO_KEY = Symbol('omit skills_order')

function outputWith(skillsOrder: unknown) {
  const out: Record<string, unknown> = {
    mode: 'target_title_only',
    summary: { generated: 'Instrumentation engineer.' },
    experience_blocks: [
      { profile_experience_id: 'exp-1', was_optimized: true, generated_bullets: ['Commissioned field instruments'] },
    ],
  }
  if (skillsOrder !== NO_KEY) out.skills_order = skillsOrder
  return out
}

/**
 * Mirrors the route: validate with the parsed skills_order, partition, then
 * persist through normalizeSkillsOrder. `expectedFirst` is the recognized
 * model order that must lead the saved list.
 */
function recoverable(label: string, skillsOrder: unknown, expectedFirst: string[], expectRepaired: boolean) {
  console.log(`\n${label}`)
  const out = outputWith(skillsOrder)
  const validation = validateGrounding(profile, out, out.skills_order)
  const part = partitionFailures(validation.failures)
  const { order, codes, repaired } = normalizeSkillsOrder(profile.skills, out.skills_order)

  check('optimization does not fail (valid, no structural failure)', validation.valid && part.structural.length === 0)
  check('no skill-order failure reaches any fallback bucket',
    part.summary.length === 0 && part.byExperienceId.size === 0)
  check('every Career Profile skill exactly once',
    order.length === PROFILE_ORDER.length && new Set(order).size === order.length &&
      PROFILE_ORDER.every((id) => order.includes(id)))
  check('no unknown skill appears', order.every((id) => PROFILE_ORDER.includes(id)))
  check('recognized model order is preserved first',
    expectedFirst.every((id, i) => order[i] === id))
  const rest = order.slice(expectedFirst.length)
  check('omitted skills are appended in original profile order',
    JSON.stringify(rest) === JSON.stringify(PROFILE_ORDER.filter((id) => !expectedFirst.includes(id))))
  check(`repair ${expectRepaired ? 'is' : 'is not'} recorded`, repaired === expectRepaired)
  const flag = validation.failures.find((f) => f.path === 'output.skills_order')
  check('any skill-order note is a flag owned by skills_order',
    !flag || (flag.severity === 'flag' && flag.owner === 'skills_order'))
  check('warning codes and detail carry no skill names',
    SKILLS.every((s) => !codes.join(',').includes(s.name) && !(flag?.detail ?? '').includes(s.name)))
  check('warning detail carries no model values', !(flag?.detail ?? '').includes('Invented'))
  check('no offendingValue is attached', !flag?.offendingValue)
}

const REORDERED = ['sk-e', 'sk-c', 'sk-a', 'sk-d', 'sk-b']

recoverable('Exact complete ID permutation', REORDERED, REORDERED, false)
recoverable('Exact complete name permutation', REORDERED.map(nameOf), REORDERED, false)
recoverable('Mixed IDs and names', ['sk-e', nameOf('sk-c'), 'sk-a', nameOf('sk-d'), 'sk-b'], REORDERED, false)
recoverable('Partial ID list', ['sk-d', 'sk-b'], ['sk-d', 'sk-b'], true)
recoverable('Partial name list', [nameOf('sk-e'), nameOf('sk-a')], ['sk-e', 'sk-a'], true)
recoverable('Duplicate values', ['sk-c', 'sk-c', nameOf('sk-c'), 'sk-a'], ['sk-c', 'sk-a'], true)
recoverable('Unknown skill ID', ['sk-b', 'sk-zzz-invented'], ['sk-b'], true)
recoverable('Unknown skill name', ['Invented Skill', nameOf('sk-d')], ['sk-d'], true)
recoverable('Missing skills_order', NO_KEY, [], true)
recoverable('Null skills_order', null, [], true)
recoverable('Non-array skills_order', 'sk-a, sk-b', [], true)
recoverable('Non-array skills_order (object)', { 0: 'sk-a' }, [], true)
recoverable('Empty array', [], [], true)
recoverable('All-unrecognized values', ['Invented Skill', 'sk-nope', 42, null], [], true)
recoverable('Duplicates + recognized + unknown combined',
  ['sk-d', 'Invented Skill', nameOf('sk-d'), 'sk-a', 'sk-nope', 'sk-a', { x: 1 }, nameOf('sk-e')],
  ['sk-d', 'sk-a', 'sk-e'], true)

console.log('\nRepair codes describe what actually happened')
{
  const codes = (raw: unknown) => normalizeSkillsOrder(profile.skills, raw).codes.slice().sort().join(',')
  check('missing is only "missing"', codes(undefined) === 'skills_order_missing')
  check('null is only "missing"', codes(null) === 'skills_order_missing')
  check('non-array is only "malformed"', codes('sk-a') === 'skills_order_malformed')
  check('empty array is only "no_recognized"', codes([]) === 'skills_order_no_recognized')
  check('a partial list is "incomplete"', codes(['sk-b']) === 'skills_order_incomplete')
  check('a clean id permutation has no codes', codes(REORDERED) === '')
}

console.log('\nName matching is trimmed and case-insensitive, never fuzzy')
{
  const r = normalizeSkillsOrder(profile.skills, ['  hazop ', 'PLC PROGRAMMING', ' sk-b '])
  check('trimmed/cased names and a padded id are recognized', JSON.stringify(r.order.slice(0, 3)) === JSON.stringify(['sk-d', 'sk-a', 'sk-b']))
  const fuzzy = normalizeSkillsOrder(profile.skills, ['PLC', 'Loop Check', 'Calibrations', 'SK-A'])
  check('partial, pluralised and re-cased ids are not matched', JSON.stringify(fuzzy.order) === JSON.stringify(PROFILE_ORDER))
  check('those are reported as unrecognized', fuzzy.codes.includes('skills_order_no_recognized'))
}

console.log('\nSame-named skills are neither lost nor doubled')
{
  const twins = [
    { id: 't1', name: 'Python', sort_order: 0 },
    { id: 't2', name: 'python', sort_order: 1 },
    { id: 't3', name: 'SQL', sort_order: 2 },
  ]
  const r = normalizeSkillsOrder(twins, ['SQL', 'Python', 'PYTHON', 'python'])
  check('each name occurrence claims the next unused skill', JSON.stringify(r.order) === JSON.stringify(['t3', 't1', 't2']))
  check('the surplus occurrence is a duplicate', r.codes.includes('skills_order_duplicates'))
}

console.log('\nA profile with no skills never warns')
{
  const r = normalizeSkillsOrder([], ['anything'])
  check('empty order, no codes', r.order.length === 0 && r.codes.length === 0 && !r.repaired)
}

console.log('\nGenuinely unsafe structure is still a hard structural failure')
{
  const invented = outputWith(REORDERED)
  ;(invented.experience_blocks as Array<Record<string, unknown>>)[0].profile_experience_id = 'exp-invented'
  const r = partitionFailures(validateGrounding(profile, invented, invented.skills_order).failures)
  check('an invented experience id is structural', r.structural.some((f) => f.code === 'unknown_experience_block'))

  const badContainer: Record<string, unknown> = { ...outputWith(['sk-a']), experience_blocks: { not: 'an array' } }
  const r2 = partitionFailures(validateGrounding(profile, badContainer, badContainer.skills_order).failures)
  check('an invalid experience container is structural', r2.structural.some((f) => f.code === 'schema_violation'))

  const both: Record<string, unknown> = { ...outputWith(null), experience_blocks: 'nope' }
  const r3 = partitionFailures(validateGrounding(profile, both, both.skills_order).failures)
  check('a broken skill order never masks a structural failure', r3.structural.length > 0)
  check('and is never itself counted as structural',
    r3.structural.every((f) => f.path !== 'output.skills_order'))
}

if (failures > 0) {
  console.error(`\n${failures} check(s) failed`)
  process.exit(1)
}
console.log('\nAll skills-order checks passed')
