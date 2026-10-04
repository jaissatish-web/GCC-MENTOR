/**
 * Every resume template, fingerprinted (2026-10-04).
 *
 *   node_modules/.bin/sucrase-node scripts/verify-engine-templates.ts           -> check (sampled)
 *   node_modules/.bin/sucrase-node scripts/verify-engine-templates.ts --full    -> check (exhaustive)
 *   node_modules/.bin/sucrase-node scripts/verify-engine-templates.ts --golden  -> capture both
 *
 * WHY THIS EXISTS. `verify-resume.ts` proves Gulf Premium byte-identical across
 * all 32,768 show/hide combinations — but it is the ONLY template it covers.
 * Thirteen more templates run on the shared engine (components/templates/
 * engine.tsx), and a change to that engine restyles every one of them, including
 * resumes already delivered. Nothing measured that. This does.
 *
 * EVERY SWITCH IS SET EXPLICITLY, on or off. A missing key means SHOWN
 * (lib/resumeDocument.ts `visible()`), so a mask that only set the "on" keys
 * would render the same full CV 32,768 times — which is what verify-resume.ts
 * does for Gulf Premium (recorded in docs/14_OPEN_ITEMS.md).
 *
 * WHAT IS MEASURED. Every template in the registry is rendered with the same
 * realistic CV (scripts/fixtures/templateFixture.ts) under:
 *   - every combination of the 15 visibility switches (`--full`, 32,768 each), or
 *     a fixed 512-combination sample (default, fast enough for every test run);
 *   - the style overrides a user can set — each font, size, accent, the photo
 *     at both ends of the slider, the photo hidden, and all of them together.
 * Each template's renders are folded into ONE digest, so the golden file holds a
 * line per template rather than a million hashes.
 *
 * A template missing from the golden file fails: a new template is captured
 * deliberately (`--golden`), once its design is approved, never by accident.
 */

import './resolve-paths'
import * as React from 'react'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { createHash } from 'node:crypto'
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { availableTemplates } from '../lib/templates'
import type { ResumeStyleOverrides } from '../lib/resumeStyle'
import type { FieldVisibility } from '../types/careerProfile'
import { VISIBILITY_KEYS, makeTemplateFixture } from './fixtures/templateFixture'

;(globalThis as unknown as { React: unknown }).React = React

const N = VISIBILITY_KEYS.length
const COMBOS = 1 << N

/** 512 masks: all-on, all-off, each switch alone on/off, then a seeded spread. */
function sampleMasks(): number[] {
  const all = COMBOS - 1
  const set = new Set<number>([0, all])
  for (let b = 0; b < N; b++) {
    set.add(1 << b)
    set.add(all & ~(1 << b))
  }
  let x = 0x9e3779b9
  while (set.size < 512) {
    x = (Math.imul(x, 1664525) + 1013904223) >>> 0
    set.add(x & all)
  }
  return [...set].sort((a, b) => a - b)
}

const OVERRIDES: ResumeStyleOverrides[] = [
  { font: 'sans' },
  { font: 'grotesk' },
  { font: 'serif' },
  { size: 'compact' },
  { size: 'large' },
  { accent: 'navy' },
  { accent: 'forest' },
  { accent: 'black' },
  { photo: 0 },
  { photo: 100 },
  { showPhoto: false },
  { font: 'serif', size: 'large', accent: 'plum', photo: 80 },
]

function normalize(html: string): string {
  // React 19 prepends resource hints for <img>; React 18 did not.
  return html.replace(/^(<link rel="preload" as="image"[^>]*\/>)+/, '')
}

function digestFor(templateId: string, masks: number[]): string {
  const { profile, optimizedContent, skillsOrder } = makeTemplateFixture()
  const entry = availableTemplates().find((t) => t.id === templateId)
  if (!entry?.component) throw new Error(`no renderer for ${templateId}`)
  const Template = entry.component
  const h = createHash('sha256')
  const render = (fv: Partial<FieldVisibility>, styleOverrides?: ResumeStyleOverrides) =>
    normalize(
      renderToStaticMarkup(
        createElement(Template, {
          profile: { ...profile, field_visibility: fv as FieldVisibility },
          optimizedContent,
          skillsOrder,
          fieldVisibility: fv,
          ...(styleOverrides ? { styleOverrides } : {}),
        } as never),
      ),
    )
  for (const mask of masks) {
    const fv: Partial<FieldVisibility> = {}
    for (let b = 0; b < N; b++) fv[VISIBILITY_KEYS[b]] = (mask & (1 << b)) !== 0
    h.update(render(fv))
    h.update('\n')
  }
  const everything = Object.fromEntries(VISIBILITY_KEYS.map((k) => [k, true])) as Partial<FieldVisibility>
  for (const o of OVERRIDES) {
    h.update(render(everything, o))
    h.update('\n')
  }
  return h.digest('hex')
}

type Golden = Record<string, { sample: string; full?: string }>

function main() {
  const goldenPath = resolve(process.cwd(), 'scripts/engine-templates.golden.json')
  const capture = process.argv.includes('--golden')
  const full = capture || process.argv.includes('--full')
  const sample = sampleMasks()
  const every = Array.from({ length: COMBOS }, (_, i) => i)
  const ids = availableTemplates().map((t) => t.id)

  if (capture) {
    const out: Golden = {}
    for (const id of ids) {
      const started = Date.now()
      out[id] = { sample: digestFor(id, sample), full: digestFor(id, every) }
      console.log(`captured ${id} (${Math.round((Date.now() - started) / 1000)}s)`)
    }
    writeFileSync(goldenPath, JSON.stringify(out, null, 2) + '\n')
    console.log(`CAPTURED ${ids.length} templates -> ${goldenPath}`)
    return
  }

  if (!existsSync(goldenPath)) {
    console.error('No golden file. Run with --golden to capture it.')
    process.exit(2)
  }
  const golden = JSON.parse(readFileSync(goldenPath, 'utf-8')) as Golden
  let failures = 0
  for (const id of ids) {
    const want = golden[id]
    if (!want) {
      console.error(`  FAIL  ${id}: not in the baseline — capture it with --golden once approved`)
      failures++
      continue
    }
    const got = digestFor(id, full ? every : sample)
    const expected = full ? want.full : want.sample
    if (got === expected) console.log(`  PASS  ${id}`)
    else {
      console.error(`  FAIL  ${id}: output changed (${full ? 'exhaustive' : 'sampled'})`)
      failures++
    }
  }
  for (const id of Object.keys(golden)) {
    if (!ids.includes(id as (typeof ids)[number])) {
      console.error(`  FAIL  ${id}: in the baseline but no longer available`)
      failures++
    }
  }
  if (failures) {
    console.error(`VERIFY FAIL — ${failures} template(s)`)
    process.exit(1)
  }
  console.log(`VERIFY PASS — ${ids.length} templates identical (${full ? `all ${COMBOS}` : sample.length} visibility combinations + ${OVERRIDES.length} style variants each)`)
}

main()
