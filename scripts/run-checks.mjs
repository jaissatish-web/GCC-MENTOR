/**
 * Every repeatable check in one command (audit M13, 2026-09-15).
 *
 *   npm test
 *
 * Runs the deterministic verification scripts and the disposable-database
 * security suite. Needs NO production secrets, network or database: the DB
 * suite runs on an in-process Postgres (scripts/db/supabaseStub.mjs), and the
 * AI checks use fakes. Exits non-zero if any script fails, so CI can gate on it.
 *
 * Not here, deliberately: scripts/e2e-smoke.mjs (creates an account and spends
 * real AI calls against a configured deployment) and scripts/pdf-loadtest.ts.
 */

import { spawnSync } from 'node:child_process'
import { createRequire } from 'node:module'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const require = createRequire(import.meta.url)
const sucrase = require.resolve('sucrase/bin/sucrase-node')

const TS_CHECKS = [
  'verify-next-action.ts',
  'verify-profile-readiness.ts',
  'verify-gcc-experience.ts',
  'verify-gulf-readiness.ts',
  'verify-profile-merge.ts',
  'verify-landing-anchors.ts',
  'verify-runtask.ts',
  'verify-safe-redirect.ts',
  'verify-photo-rehydration.ts',
  'verify-optimization-grounding.ts',
  'verify-sidebar-wrapping.ts',
  'verify-answer-grounding.ts',
  'verify-deadlines.ts',
  'verify-resume.ts',
  'docx-smoke.ts',
]

const results = []
function run(label, args) {
  const started = Date.now()
  const r = spawnSync(process.execPath, args, { cwd: root, stdio: ['ignore', 'pipe', 'pipe'], encoding: 'utf8' })
  const ok = r.status === 0
  results.push({ label, ok, ms: Date.now() - started })
  const tail = (r.stdout + r.stderr).trim().split('\n').slice(-3).join('\n')
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${label} (${Math.round((Date.now() - started) / 1000)}s)`)
  if (!ok) console.log(tail.replace(/^/gm, '      '))
}

for (const script of TS_CHECKS) run(script, [sucrase, join('scripts', script)])
run('verify-db-security.mjs', [join('scripts', 'verify-db-security.mjs')])

const failed = results.filter((r) => !r.ok)
console.log(`\n${results.length - failed.length}/${results.length} checks passed`)
process.exit(failed.length === 0 ? 0 : 1)
