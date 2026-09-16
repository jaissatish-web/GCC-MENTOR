/**
 * Offline assertions for skill chips in filled-sidebar templates (2026-09-16).
 *
 *   node_modules/.bin/sucrase-node scripts/verify-sidebar-wrapping.ts
 *
 * THE BUG. A filled-sidebar rail is 238px wide with 22px padding each side, so
 * a chip has 194px to live in. The chip carried `white-space: nowrap`, so a
 * long skill — "Honeywell Experion PKS Distributed Control System" — could not
 * break and ran straight through the coloured edge, where it was clipped.
 *
 * This renders the real templates to static markup and reads the styles React
 * actually emitted, rather than grepping the source for the property names: a
 * refactor that moved the style elsewhere would still have to keep the rendered
 * result correct, and only rendering proves that.
 *
 * Geometry itself is verified visually in a browser — a static renderer has no
 * layout engine and cannot measure a wrapped line. What it CAN prove is that
 * nothing forbids wrapping, which is the whole of the defect.
 */

import './resolve-paths'
import { createElement } from 'react'
// Templates are JSX; the repo's sucrase transform needs React in scope here,
// exactly as scripts/verify-resume.ts does.
import * as React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { availableTemplates, getTemplate } from '../lib/templates'
import { buildResumeDocument } from '../lib/resumeDocument'
import type { CareerProfileFull } from '../types/careerProfile'
import type { OptimizedContent } from '../types/package'

// The templates use Next's automatic JSX runtime and carry no React import, so
// under sucrase a global has to be injected before rendering — identical to
// scripts/verify-resume.ts.
;(globalThis as unknown as { React: unknown }).React = React

let failures = 0
function check(name: string, cond: boolean) {
  if (cond) console.log(`  PASS  ${name}`)
  else {
    console.error(`  FAIL  ${name}`)
    failures++
  }
}


/**
 * The inline style of the element that directly contains `text`. Walks back to
 * the nearest opening tag, so the assertion reads the style React actually put
 * on the skill, not one that happens to appear elsewhere on the page.
 */
function styleOfElementContaining(html: string, text: string): string | null {
  const escaped = text.replace(/\//g, '&#x2F;')
  const at = html.includes(text) ? html.indexOf(text) : html.indexOf(escaped)
  if (at < 0) return null
  const open = html.lastIndexOf('<', at)
  if (open < 0) return null
  const tagEnd = html.indexOf('>', open)
  if (tagEnd < 0 || tagEnd > at) return null
  const tag = html.slice(open, tagEnd)
  const m = /style="([^"]*)"/.exec(tag)
  return m ? m[1] : ''
}

/** Long enough that it cannot fit 194px at any sane font size. */
const LONG_SKILLS = [
  'Honeywell Experion PKS Distributed Control System Administration',
  'Electroencephalography Interpretation And Reporting',
  'Internationalfinancialreportingstandardsconsolidation',
  'SAP S/4HANA Financial Supply Chain Management',
]

const profile = {
  id: 'p',
  full_name: 'Test Candidate',
  email: 't@example.com',
  phone: '+000',
  professional_summary: 'Summary.',
  target_job_title: null,
  work_experience: [
    {
      id: 'e1',
      profile_id: 'p',
      company: 'Example Co',
      role: 'Specialist',
      location: 'Doha',
      start_date: '2018-01-01',
      end_date: null,
      description: null,
      highlights: ['Did the work'],
      sort_order: 0,
      created_at: '',
      gcc_country: null,
    },
  ],
  skills: LONG_SKILLS.map((name, i) => ({
    id: `s${i}`,
    profile_id: 'p',
    name,
    sort_order: i,
    created_at: '',
  })),
  certifications: [],
  education: [],
  additional_information: [],
  field_visibility: {},
} as unknown as CareerProfileFull

const EMPTY: OptimizedContent = {
  summary: { generated: '', user_edited: null, source_profile_summary: '' },
  experience_blocks: [],
}

const doc = buildResumeDocument({ profile, optimizedContent: EMPTY, targetJobTitle: 'Target Role' })

/** Templates whose rail is a fixed-width filled column. */
const FILLED_SIDEBAR = ['technical_sidebar', 'project_twocol', 'creative_gcc']

console.log('\nThe filled-sidebar templates still exist under the expected ids')
for (const id of FILLED_SIDEBAR) {
  check(`${id} is a registered template`, availableTemplates().some((t) => t.id === id))
}

console.log('\nNo rendered skill chip forbids wrapping')
for (const t of availableTemplates()) {
  const Component = getTemplate(t.id).component
  const html = renderToStaticMarkup(
    createElement(Component, {
      document: doc,
      profile,
      optimizedContent: EMPTY,
      skillsOrder: profile.skills.map((s) => s.id),
      fieldVisibility: {},
    } as never),
  )

  // Every skill must reach the page. A clipped chip is still in the DOM, so
  // this is a content check, not a geometry one — but a template that dropped
  // a skill entirely would be a worse bug and is worth catching here.
  const allPresent = LONG_SKILLS.every((s) => html.includes(s) || html.includes(s.replace(/\//g, '&#x2F;')))
  check(`${t.id}: renders every skill`, allPresent)

  // The defect, stated exactly, and scoped to the SKILL elements. A blanket
  // search for nowrap would fail on the date ranges and education years, where
  // refusing to break mid-range is correct and deliberate - those sit in the
  // wide main column with flex:none, never in the 194px rail.
  const skillStyles = LONG_SKILLS.map((skill) => styleOfElementContaining(html, skill))
  check(
    `${t.id}: no skill element forbids wrapping`,
    skillStyles.every((style) => style !== null && !/white-space:\s*nowrap/i.test(style)),
  )

  if (FILLED_SIDEBAR.includes(t.id)) {
    check(
      `${t.id}: skills may break a long word`,
      skillStyles.every((style) => style !== null && /overflow-wrap:\s*anywhere/i.test(style)),
    )
    check(
      `${t.id}: skills are capped to the column`,
      skillStyles.every((style) => style !== null && /max-width:\s*100%/i.test(style)),
    )
  }
}

console.log('\nThe rail keeps its padding')
const railHtml = renderToStaticMarkup(
  createElement(getTemplate('technical_sidebar').component, {
    document: doc,
    profile,
    optimizedContent: EMPTY,
    skillsOrder: profile.skills.map((s) => s.id),
    fieldVisibility: {},
  } as never),
)
check('rail padding is unchanged', /padding:\s*30px 22px/.test(railHtml))
check('rail width is unchanged', /width:\s*238px/.test(railHtml))

if (failures > 0) {
  console.error(`\n${failures} check(s) failed`)
  process.exit(1)
}
console.log('\nAll sidebar-wrapping checks passed')
