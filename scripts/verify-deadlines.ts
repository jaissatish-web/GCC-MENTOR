/**
 * Deadlines reach every model attempt, and a slow provider hands control back
 * before the platform kills the route (audit H09, 2026-09-15).
 *
 *   node_modules/.bin/sucrase-node scripts/verify-deadlines.ts
 *
 * No network and no database: the provider's generate() and the prompt store
 * are replaced with fakes for the duration of the script. What is asserted is
 * the CONTROL LAYER's behaviour — lib/ai/runTask.ts passes one give-up point to
 * every attempt, starts a repair only when it can finish, and returns a
 * catchable error rather than outliving the route — plus a static check that
 * every AI route's own deadline sits inside its `maxDuration`.
 */

import './resolve-paths'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { runAiTask, AiTaskError } from '../lib/ai/runTask'

// eslint-disable-next-line @typescript-eslint/no-require-imports
const provider = require('../lib/ai/provider') as Record<string, unknown>
// eslint-disable-next-line @typescript-eslint/no-require-imports
const prompts = require('../lib/ai/prompts') as Record<string, unknown>

type FakeResult = { text: string; inputTokens: number; outputTokens: number; truncated: boolean }
type Params = { deadlineAt?: number; giveUpAt?: number }

let calls: Params[] = []
let behaviour: (p: Params) => Promise<FakeResult> = async () => ({ text: '{}', inputTokens: 0, outputTokens: 0, truncated: false })
provider.generate = async (p: Params) => {
  calls.push(p)
  return behaviour(p)
}
prompts.getActivePrompt = async () => null

let failures = 0
function check(name: string, cond: boolean, detail = '') {
  if (cond) console.log(`  PASS  ${name}`)
  else {
    console.error(`  FAIL  ${name}${detail ? ' — ' + detail : ''}`)
    failures++
  }
}

const ok = (text: string): FakeResult => ({ text, inputTokens: 1, outputTokens: 1, truncated: false })
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))
const baseTask = {
  service: 'cover_letter' as const,
  route: 'verify-deadlines',
  instructions: 'x',
  input: 'y',
  grounding: { mode: 'not_applicable' as const, reason: 'deadline test — no user fact involved' },
  // Strict parsing, so "not json" really is a parse failure. The default
  // extractor is lenient and returns without throwing on plain prose.
  parse: (text: string) => JSON.parse(text) as unknown,
}

async function main() {
  console.log('\nThe deadline reaches the provider')
  calls = []
  behaviour = async () => ok('{"fine":true}')
  const deadlineAt = Date.now() + 60_000
  await runAiTask({ ...baseTask, deadlineAt })
  check('giveUpAt is the task deadline', calls[0]?.giveUpAt === deadlineAt)
  check('deadlineAt is the task deadline', calls[0]?.deadlineAt === deadlineAt)

  console.log('\nA repair starts only when it can finish')
  calls = []
  behaviour = async () => ok('this is not json')
  let err: unknown = null
  try {
    await runAiTask({ ...baseTask, deadlineAt: Date.now() + 5_000, minRepairMs: 30_000 })
  } catch (e) {
    err = e
  }
  check('too little time: no repair call is made', calls.length === 1, `calls=${calls.length}`)
  check('…and the task fails with a catchable error', err instanceof AiTaskError && err.kind === 'unparseable')

  calls = []
  err = null
  try {
    await runAiTask({ ...baseTask, deadlineAt: Date.now() + 120_000, minRepairMs: 30_000 })
  } catch (e) {
    err = e
  }
  check('enough time: exactly one repair is attempted', calls.length === 2, `calls=${calls.length}`)

  calls = []
  err = null
  // Valid JSON this time, so the SHAPE check — not the parser — is what fails.
  behaviour = async () => ok('{"unexpected":true}')
  try {
    await runAiTask({ ...baseTask, validateShape: () => 'wrong shape', deadlineAt: Date.now() + 5_000, minRepairMs: 30_000 })
  } catch (e) {
    err = e
  }
  check('a shape failure near the deadline is not repaired either', calls.length === 1 && err instanceof AiTaskError && err.kind === 'invalid_shape')

  calls = []
  behaviour = async () => ok('this is not json')
  try {
    await runAiTask({ ...baseTask })
  } catch {
    /* expected */
  }
  check('with no deadline set, repair behaves as before', calls.length === 2)

  console.log('\nA stalled provider hands control back in time')
  calls = []
  behaviour = async (p) => {
    // A provider that stalls until its give-up point, then reports it.
    await sleep(Math.max(0, (p.giveUpAt ?? Date.now()) - Date.now()))
    throw new Error('attempt stalled: out of time')
  }
  const started = Date.now()
  const stalledDeadline = started + 300
  err = null
  try {
    await runAiTask({ ...baseTask, deadlineAt: stalledDeadline })
  } catch (e) {
    err = e
  }
  const elapsed = Date.now() - started
  check('the task returns a provider error the route can answer with', err instanceof AiTaskError && err.kind === 'provider')
  check('…within the deadline plus scheduling slack', elapsed < 300 + 250, `elapsed=${elapsed}ms`)
  check('…and does not start a second attempt past the deadline', calls.length === 1)

  console.log("\nEvery AI route's deadline sits inside its own maxDuration")
  const root = join(__dirname, '..')
  const routes = [
    'app/api/packages/[id]/cover-letter/route.ts',
    'app/api/packages/[id]/interview-qa/route.ts',
    'app/api/packages/[id]/mock-interview/start/route.ts',
    'app/api/packages/[id]/mock-interview/[runId]/answer/route.ts',
    'app/api/packages/[id]/mock-interview/[runId]/finish/route.ts',
  ]
  for (const rel of routes) {
    const src = readFileSync(join(root, rel), 'utf8')
    const max = Number(/export const maxDuration = (\d+)/.exec(src)?.[1] ?? NaN)
    const deadline = Number((/const DEADLINE_MS = ([\d_]+)/.exec(src)?.[1] ?? 'NaN').replace(/_/g, ''))
    check(`${rel.replace('app/api/packages/[id]/', '')}: ${deadline / 1000}s deadline, ${max}s ceiling, ≥15s left to save`, deadline + 15_000 <= max * 1000)
  }

  if (failures > 0) {
    console.error(`\n${failures} check(s) failed`)
    process.exit(1)
  }
  console.log('\nAll deadline checks passed')
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
