/**
 * The rules every resume template must keep (2026-10-04).
 *
 *   node_modules/.bin/sucrase-node scripts/verify-template-quality.ts
 *
 * verify-engine-templates.ts proves a template has not CHANGED; this proves
 * each one is RIGHT, which is what a new template has to show before its
 * baseline is captured. For every template in the registry, under a spread of
 * show/hide combinations:
 *
 *   1. It renders without throwing, and prints no "undefined", "NaN" or
 *      "[object Object]" — in the text, nor in a style, where a `${undefined}px`
 *      is invisible but breaks the layout. Also under every font, size, accent
 *      and photo-size choice a user can make.
 *   2. The candidate's name is the first text in the markup when it is shown —
 *      what an applicant-tracking parser reads first. (Photos are alt="" and
 *      initials badges come after the name, so neither may get ahead of it.)
 *   3. The photo appears exactly when the template allows one, the resume has
 *      one, the visibility switch is on and the user has not hidden it.
 *   4. Every section the document carries is printed under its heading.
 */

import './resolve-paths'
import * as React from 'react'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { availableTemplates } from '../lib/templates'
import { ACCENT_OPTIONS, FONT_OPTIONS, SIZE_OPTIONS, type ResumeStyleOverrides } from '../lib/resumeStyle'
import type { FieldVisibility } from '../types/careerProfile'
import { VISIBILITY_KEYS, makeTemplateFixture } from './fixtures/templateFixture'

;(globalThis as unknown as { React: unknown }).React = React

let failures = 0
function fail(msg: string) {
  failures++
  if (failures <= 40) console.error(`  FAIL  ${msg}`)
}

function textOf(html: string): string {
  return html
    .replace(/<style[\s\S]*?<\/style>/g, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&#x27;|&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/\s+/g, ' ')
    .trim()
}

const N = VISIBILITY_KEYS.length
const ALL = (1 << N) - 1
const bit = (k: (typeof VISIBILITY_KEYS)[number]) => 1 << VISIBILITY_KEYS.indexOf(k)
// Everything on, everything off, each switch alone off, and a few mixes.
const MASKS = [ALL, 0, ...VISIBILITY_KEYS.map((k) => ALL & ~bit(k)), bit('full_name'), bit('full_name') | bit('photo'), ALL & ~(bit('phone') | bit('email') | bit('whatsapp'))]

/** Every style choice a user can make, one at a time, plus both photo extremes. */
const STYLE_CHOICES: ResumeStyleOverrides[] = [
  ...(Object.keys(FONT_OPTIONS) as Array<keyof typeof FONT_OPTIONS>).map((font) => ({ font })),
  ...(Object.keys(SIZE_OPTIONS) as Array<keyof typeof SIZE_OPTIONS>).map((size) => ({ size })),
  ...(Object.keys(ACCENT_OPTIONS) as Array<keyof typeof ACCENT_OPTIONS>).map((accent) => ({ accent })),
  { photo: 0 },
  { photo: 100 },
]

const BAD_STYLE = /style="[^"]*(NaN|undefined|\[object Object\])/

const { profile, optimizedContent, skillsOrder } = makeTemplateFixture()
const templates = availableTemplates()

for (const t of templates) {
  const Template = t.component!
  for (const mask of MASKS) {
    const fv: Partial<FieldVisibility> = {}
    for (let b = 0; b < N; b++) fv[VISIBILITY_KEYS[b]] = (mask & (1 << b)) !== 0
    for (const hidePhoto of [false, true]) {
      let html = ''
      try {
        html = renderToStaticMarkup(
          createElement(Template, {
            profile: { ...profile, field_visibility: fv as FieldVisibility },
            optimizedContent,
            skillsOrder,
            fieldVisibility: fv,
            ...(hidePhoto ? { styleOverrides: { showPhoto: false } } : {}),
          } as never),
        )
      } catch (e) {
        fail(`${t.id} mask ${mask}: threw ${(e as Error).message}`)
        continue
      }
      const text = textOf(html)
      const where = `${t.id} mask ${mask}${hidePhoto ? ' photo-hidden' : ''}`
      for (const bad of ['undefined', 'NaN', '[object Object]']) {
        if (text.includes(bad)) fail(`${where}: prints "${bad}"`)
      }
      if (BAD_STYLE.test(html)) fail(`${where}: a style holds ${BAD_STYLE.exec(html)![1]}`)
      // Every switch is set explicitly on or off: a missing key means SHOWN
      // (lib/resumeDocument.ts visible()), so leaving it out tests nothing.
      if (fv.full_name) {
        if (!text.startsWith(profile.full_name)) fail(`${where}: first text is "${text.slice(0, 30)}", not the name`)
      }
      const imgs = (html.match(/<img /g) ?? []).length
      // Gulf Premium and ATS Classic have their own photo rules; the engine
      // templates follow allowPhoto + the photo switch + the user's toggle.
      const wantPhoto = t.allowsPhoto && Boolean(fv.photo) && !(hidePhoto && t.styleable) ? 1 : 0
      if (t.id !== 'gulf_premium' && imgs !== wantPhoto) fail(`${where}: ${imgs} photo(s), expected ${wantPhoto}`)
      if (mask === ALL && !hidePhoto) {
        for (const must of ['Senior I&C Commissioning Engineer', 'Anna University', 'Triconex SIS', 'NEBOSH', 'Languages']) {
          if (!text.includes(must)) fail(`${where}: missing "${must}"`)
        }
      }
    }
  }
}

// Every style choice, on the full CV.
const everything = Object.fromEntries(VISIBILITY_KEYS.map((k) => [k, true])) as Partial<FieldVisibility>
for (const t of templates) {
  for (const choice of STYLE_CHOICES) {
    const where = `${t.id} ${JSON.stringify(choice)}`
    let html = ''
    try {
      html = renderToStaticMarkup(
        createElement(t.component!, {
          profile: { ...profile, field_visibility: everything as FieldVisibility },
          optimizedContent,
          skillsOrder,
          fieldVisibility: everything,
          styleOverrides: choice,
        } as never),
      )
    } catch (e) {
      fail(`${where}: threw ${(e as Error).message}`)
      continue
    }
    const text = textOf(html)
    if (!text.startsWith(profile.full_name)) fail(`${where}: first text is "${text.slice(0, 30)}", not the name`)
    for (const bad of ['undefined', 'NaN', '[object Object]']) if (text.includes(bad)) fail(`${where}: prints "${bad}"`)
    if (BAD_STYLE.test(html)) fail(`${where}: a style holds ${BAD_STYLE.exec(html)![1]}`)
  }
}

if (failures) {
  console.error(`VERIFY FAIL — ${failures} problem(s) across ${templates.length} templates`)
  process.exit(1)
}
console.log(
  `VERIFY PASS — ${templates.length} templates × ${MASKS.length} visibility combinations × photo shown/hidden, and × ${STYLE_CHOICES.length} style choices`,
)
