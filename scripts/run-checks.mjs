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
 * real AI calls against a configured deployment), scripts/pdf-loadtest.ts and
 * scripts/verify-template-pdfs.ts (both need a local Chrome).
 */

import { spawnSync } from 'node:child_process'
import { createRequire } from 'node:module'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const require = createRequire(import.meta.url)
const sucrase = require.resolve('sucrase/bin/sucrase-node')

const TS_CHECKS = [
  'verify-tracker-dates.ts',
  'verify-quality-remediation.ts',
  'verify-template-catalog.ts',
  'verify-template-showcase.ts',
  'verify-resume-quality.ts',
  'verify-universal-theme.ts',
  'verify-linkedin.ts',
  'verify-professional-profiles.ts',
  'verify-dashboard-ui.ts',
  'verify-home-followthrough.ts',
  'verify-career-profile-resume.ts',
  'verify-next-action.ts',
  'verify-stages.ts',
  'verify-journey-guide.ts',
  'verify-journey-experience.ts',
  'verify-profile-readiness.ts',
  'verify-gcc-experience.ts',
  'verify-gulf-readiness.ts',
  'verify-gulf-readiness-v2.ts',
  'verify-profile-merge.ts',
  'verify-profile-data.ts',
  'verify-profile-categories.ts',
  'verify-resume-parse.ts',
  'verify-import-review.ts',
  'verify-import-review-checks.ts',
  'verify-review-before-profile.ts',
  'verify-profile-review-navigation.ts',
  'verify-client-import.ts',
  'verify-loose-duties.ts',
  'verify-match-terms.ts',
  'verify-optimizer-v3.ts',
  'verify-resume-order.ts',
  'verify-ats-file-check.ts',
  'verify-service-outputs.ts',
  'verify-workspace-service-counts.ts',
  'verify-landing-anchors.ts',
  'verify-runtask.ts',
  'verify-safe-redirect.ts',
  'verify-photo-rehydration.ts',
  'verify-optimization-grounding.ts',
  'verify-prose-claims.ts',
  'verify-id-numbers.ts',
  'verify-skills-order.ts',
  'verify-optimizer-engine.ts',
  'verify-resume-edits.ts',
  'verify-sidebar-wrapping.ts',
  'verify-answer-grounding.ts',
  'verify-deadlines.ts',
  'verify-voice-transcription.ts',
  'verify-mock-report.ts',
  'verify-interview-progress.ts',
  'verify-resume.ts',
  'verify-engine-templates.ts',
  'verify-template-quality.ts',
  'verify-resume-style.ts',
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
run('verify-career-profile-services.mjs', [join(root, 'scripts', 'verify-career-profile-services.mjs')])
run('verify-resume-export-api.mjs', [join(root, 'scripts', 'verify-resume-export-api.mjs')])
run('verify-linkedin-api.mjs', [join(root, 'scripts', 'verify-linkedin-api.mjs')])
run('verify-naukrigulf-api.mjs', [join(root, 'scripts', 'verify-naukrigulf-api.mjs')])
run('verify-naukrigulf-db.mjs', [join(root, 'scripts', 'verify-naukrigulf-db.mjs')])
run('verify-linkedin-db.mjs', [join(root, 'scripts', 'verify-linkedin-db.mjs')])
run('verify-profile-photo-api.mjs', [join(root, 'scripts', 'verify-profile-photo-api.mjs')])
run('verify-career-profile-resume-api.mjs', [join('scripts', 'verify-career-profile-resume-api.mjs')])
run('verify-import-review-api.mjs', [join('scripts', 'verify-import-review-api.mjs')])
run('verify-import-review-db.mjs', [join('scripts', 'verify-import-review-db.mjs')])
run('verify-db-security.mjs', [join('scripts', 'verify-db-security.mjs')])
run('verify-dashboard-overview.mjs', [join('scripts', 'verify-dashboard-overview.mjs')])
run('verify-profile-categories-db.mjs', [join(root, 'scripts', 'verify-profile-categories-db.mjs')])
run('verify-voice-db.mjs', [join('scripts', 'verify-voice-db.mjs')])
run('verify-interview-history-db.mjs', [join('scripts', 'verify-interview-history-db.mjs')])
run('verify-interview-progress-api.mjs', [join('scripts', 'verify-interview-progress-api.mjs')])

run('verify-typography-source.mjs', [join(root, 'scripts', 'verify-typography-source.mjs')])

const failed = results.filter((r) => !r.ok)
console.log(`\n${results.length - failed.length}/${results.length} checks passed`)
process.exit(failed.length === 0 ? 0 : 1)
