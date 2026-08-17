/**
 * Assertions for the LLM control layer's prompt assembly.
 *
 *   node_modules/.bin/sucrase-node scripts/verify-runtask.ts
 *
 * These check the part that can be checked without spending a model call: that
 * the grounding block is injected when a task declares `enforced`, that it is
 * absent when a task declares `not_applicable`, and that the repair prompt
 * carries what the model needs to fix its own output.
 *
 * WHY THIS EXISTS AT ALL. "A generation route without the grounding instruction
 * is a critical bug" (docs/02_PHILOSOPHY.md §1). The control layer's whole claim
 * is that it makes that impossible rather than forbidden — so the claim is
 * asserted rather than described.
 *
 * The transport, the repair LOOP and the refusal to return ungrounded output all
 * need a live model and are exercised by the first service migrated onto this.
 */

import './resolve-paths'
import { buildSystemPrompt, buildRepairInput, AI_SERVICES } from '../lib/ai/runTask'
import { GROUNDING_INSTRUCTION } from '../lib/ai/grounding'
import type { CareerProfileFull } from '../types/careerProfile'

let failures = 0
function check(name: string, condition: boolean) {
  if (condition) {
    console.log(`  PASS  ${name}`)
  } else {
    console.error(`  FAIL  ${name}`)
    failures++
  }
}

const fakeProfile = {} as CareerProfileFull

const enforced = buildSystemPrompt({
  service: 'optimization',
  route: 'test',
  persona: 'PERSONA-MARKER',
  instructions: 'INSTRUCTIONS-MARKER',
  input: 'x',
  grounding: { mode: 'enforced', profile: fakeProfile, check: () => ({ valid: true, failures: [] }) },
})

const exempt = buildSystemPrompt({
  service: 'job_description',
  route: 'test',
  instructions: 'INSTRUCTIONS-MARKER',
  input: 'x',
  grounding: { mode: 'not_applicable', reason: 'structures an employer job advert; no user fact is involved' },
})

console.log('\nGrounding injection')
check('enforced task carries the grounding block verbatim', enforced.includes(GROUNDING_INSTRUCTION))
check('enforced task keeps its persona', enforced.includes('PERSONA-MARKER'))
check('enforced task keeps its instructions', enforced.includes('INSTRUCTIONS-MARKER'))
check('grounding precedes the task instructions', enforced.indexOf(GROUNDING_INSTRUCTION) < enforced.indexOf('INSTRUCTIONS-MARKER'))
check('not_applicable task omits the grounding block', !exempt.includes(GROUNDING_INSTRUCTION))
check('not_applicable task still carries its instructions', exempt.includes('INSTRUCTIONS-MARKER'))

console.log('\nRepair prompt')
const repair = buildRepairInput('ORIGINAL-INPUT', [
  { detail: 'unsourced numeric', offendingValue: '18,000 checks' },
  { detail: 'fixed field emitted' },
])
check('repair keeps the original input', repair.includes('ORIGINAL-INPUT'))
check('repair names each failure', repair.includes('unsourced numeric') && repair.includes('fixed field emitted'))
check('repair tells the model which text to remove', repair.includes('18,000 checks'))
check('repair asks for the same format back', /same format/i.test(repair))

console.log('\nService registry')
const keys = Object.keys(AI_SERVICES)
check('every built service is present', ['extraction', 'optimization', 'ats_scan', 'cover_letter'].every((k) => keys.includes(k)))
check('the two unbuilt services are marked unbuilt', AI_SERVICES.qa_generation.built === false && AI_SERVICES.mock_interview.built === false)

console.log(failures === 0 ? '\nAll assertions passed.\n' : `\n${failures} assertion(s) FAILED.\n`)
process.exit(failures === 0 ? 0 : 1)
