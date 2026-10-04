/**
 * Render every template to a standalone HTML page, for a visual review in a
 * browser (2026-10-04). Not a check — a lab tool, like scripts/resume-lab.
 *
 *   OUT=<dir> node_modules/.bin/sucrase-node scripts/render-templates-lab.ts
 *
 * Without OUT it writes to <system temp>/gcc-templates-lab, never into the repo.
 *
 * Writes <id>.html (photo), <id>.nophoto.html and index.json. The photo is an
 * inline SVG portrait so the pages need no network.
 */
import './resolve-paths'
import * as React from 'react'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { availableTemplates } from '../lib/templates'
import { makeTemplateFixture } from './fixtures/templateFixture'

;(globalThis as unknown as { React: unknown }).React = React

const PORTRAIT =
  'data:image/svg+xml;base64,' +
  Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 150" width="120" height="150">
      <defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#cfd8e3"/><stop offset="1" stop-color="#9fb0c3"/></linearGradient></defs>
      <rect width="120" height="150" fill="url(#g)"/>
      <circle cx="60" cy="58" r="26" fill="#e9c9a8"/>
      <path d="M20 150c4-34 22-50 40-50s36 16 40 50z" fill="#24364d"/>
      <path d="M50 100l10 18 10-18z" fill="#ffffff"/>
    </svg>`,
  ).toString('base64')

const out = process.env.OUT || join(tmpdir(), 'gcc-templates-lab')
mkdirSync(out, { recursive: true })
const { profile, optimizedContent, skillsOrder } = makeTemplateFixture()
const withPhoto = { ...profile, photo_url: PORTRAIT }
const index: Array<{ id: string; name: string; allowsPhoto: boolean; fields: string[] }> = []

for (const t of availableTemplates()) {
  const Template = t.component!
  for (const variant of ['photo', 'nophoto'] as const) {
    const p = variant === 'photo' ? withPhoto : { ...profile, photo_url: null }
    const html = renderToStaticMarkup(
      createElement(Template, { profile: p, optimizedContent, skillsOrder, fieldVisibility: profile.field_visibility } as never),
    )
    const page = `<!doctype html><html><head><meta charset="utf-8"><style>body{margin:0;background:#888}</style></head><body>${html}</body></html>`
    writeFileSync(join(out, `${t.id}${variant === 'photo' ? '' : '.nophoto'}.html`), page)
  }
  index.push({ id: t.id, name: t.name, allowsPhoto: t.allowsPhoto, fields: t.fields })
}
writeFileSync(join(out, 'index.json'), JSON.stringify(index, null, 2))
console.log(`rendered ${index.length} templates -> ${out}`)
