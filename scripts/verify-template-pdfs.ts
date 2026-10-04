/**
 * Every template through the real PDF download, read back like an ATS (2026-10-04).
 *
 *   node_modules/.bin/sucrase-node scripts/verify-template-pdfs.ts            -> all templates
 *   node_modules/.bin/sucrase-node scripts/verify-template-pdfs.ts falcon_executive ats_classic
 *   OUT=/some/dir node_modules/.bin/sucrase-node scripts/verify-template-pdfs.ts   -> also keep the PDFs
 *
 * NEEDS A LOCAL CHROME (lib/pdf/browser.ts finds it), so it is run by hand when
 * a template is added or the engine changes — not from run-checks.mjs.
 *
 * The other template checks render markup. This one builds the FILE: each
 * template goes through lib/pdf/renderPackage.ts — the exact code the download
 * and "Check my PDF" use — with the shared fixture CV, a database stand-in and
 * the photo served over HTTP the way a signed URL is fetched. The PDF is then
 * read back with lib/atsFileCheck.ts, the same check users run, and must pass
 * every item, as all fifteen designs did in the 2026-10-02 audit. On top:
 *   - the candidate's name is the first text an ATS reads;
 *   - the photo is in the file exactly when the design shows one;
 *   - the CV stays on the pages recruiters expect.
 * Each template is built twice — with a photo, and for a candidate without one,
 * where several designs print initials in its place.
 */

import './resolve-paths'
import * as React from 'react'
import { createServer } from 'node:http'
import { deflateSync } from 'node:zlib'
import { mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import type { AddressInfo } from 'node:net'
import type { SupabaseClient } from '@supabase/supabase-js'
import { renderPackagePdf } from '../lib/pdf/renderPackage'
import { atsTextOfPdf, checkAtsText, norm } from '../lib/atsFileCheck'
import { availableTemplates } from '../lib/templates'
import { makeTemplateFixture } from './fixtures/templateFixture'

;(globalThis as unknown as { React: unknown }).React = React

/** A head-and-shoulders silhouette as a real PNG, so the PDF carries a raster image like a photo. */
function portraitPng(w = 120, h = 150): Buffer {
  const rows: Buffer[] = []
  for (let y = 0; y < h; y++) {
    const row = Buffer.alloc(1 + w * 3)
    for (let x = 0; x < w; x++) {
      const head = (x - w / 2) ** 2 + (y - h * 0.38) ** 2 < (w * 0.2) ** 2
      const body = y > h * 0.62 && Math.abs(x - w / 2) < w * 0.18 + (y - h * 0.62) * 0.7
      const [r, g, b] = head ? [214, 178, 150] : body ? [44, 62, 88] : [226, 232, 240]
      row.set([r, g, b], 1 + x * 3)
    }
    rows.push(row)
  }
  const chunk = (type: string, data: Buffer) => {
    const body = Buffer.concat([Buffer.from(type, 'latin1'), data])
    const len = Buffer.alloc(4)
    len.writeUInt32BE(data.length)
    const crc = Buffer.alloc(4)
    crc.writeUInt32BE(crc32(body))
    return Buffer.concat([len, body, crc])
  }
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(w, 0)
  ihdr.writeUInt32BE(h, 4)
  ihdr.set([8, 2, 0, 0, 0], 8)
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(Buffer.concat(rows))),
    chunk('IEND', Buffer.alloc(0)),
  ])
}

function crc32(buf: Buffer): number {
  let c = ~0
  for (const byte of buf) {
    c ^= byte
    for (let k = 0; k < 8; k++) c = c & 1 ? (c >>> 1) ^ 0xedb88320 : c >>> 1
  }
  return ~c >>> 0
}

/** Just enough of the Supabase query builder for renderPackagePdf's reads. */
function databaseStandIn(single: Record<string, unknown>, rows: Record<string, unknown[]>): SupabaseClient {
  return {
    from(table: string) {
      const query = {
        select: () => query,
        eq: () => query,
        maybeSingle: async () => ({ data: single[table] ?? null, error: null }),
        then: (ok: (v: unknown) => unknown, ko?: (e: unknown) => unknown) => Promise.resolve({ data: rows[table] ?? [], error: null }).then(ok, ko),
      }
      return query
    },
  } as unknown as SupabaseClient
}

/** Job words the fixture CV really contains — the keyword item must find them all. */
const KEYWORDS = ['commissioning', 'Triconex SIS', 'HART calibration', 'loop checking', 'NEBOSH', 'DCS']

/**
 * The two left-rail designs that shipped before the grid rail: their PDF still
 * reads the rail before the name (engine.tsx `railFirstInPdf`). Reported, not
 * failed, until the switch is approved — docs/14_OPEN_ITEMS.md.
 */
const RAIL_FIRST_UNTIL_APPROVED = ['technical_sidebar', 'creative_gcc']

async function main() {
  const png = portraitPng()
  const server = createServer((_req, res) => {
    res.writeHead(200, { 'content-type': 'image/png', 'content-length': png.length })
    res.end(png)
  })
  await new Promise<void>((done) => server.listen(0, '127.0.0.1', done))
  const photoUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}/photo.png`

  const { profile, optimizedContent, skillsOrder } = makeTemplateFixture()
  const { work_experience, skills, certifications, education, additional_information, ...profileRow } = profile
  const pkg = {
    id: 'pkg-1',
    user_id: profile.user_id,
    profile_id: profile.id,
    target_job_title: 'Commissioning Leader – Instrumentation & Control',
    template_id: null,
    optimized_content: optimizedContent,
    skills_order: skillsOrder,
    field_visibility_snapshot: profile.field_visibility,
    document_snapshot: null,
    style_overrides: null,
  }
  const children = {
    profile_work_experience: work_experience,
    profile_skills: skills,
    profile_certifications: certifications,
    profile_education: education,
    profile_additional_information: additional_information,
  }
  const variants = [
    { label: 'photo', photo: true, supabase: databaseStandIn({ packages: pkg, career_profiles: { ...profileRow, photo_url: photoUrl } }, children) },
    { label: 'no photo', photo: false, supabase: databaseStandIn({ packages: pkg, career_profiles: { ...profileRow, photo_url: null } }, children) },
  ]

  const wanted = process.argv.slice(2)
  const templates = availableTemplates().filter((t) => !wanted.length || wanted.includes(t.id))
  const out = process.env.OUT
  if (out) mkdirSync(out, { recursive: true })

  let failures = 0
  const fail = (msg: string) => {
    failures++
    console.error(`  FAIL  ${msg}`)
  }
  for (const t of templates) for (const v of variants) {
    const r = await renderPackagePdf({ supabase: v.supabase, userId: profile.user_id, packageId: pkg.id, templateId: t.id })
    const where = `${t.id} (${v.label})`
    if (!r.ok) {
      fail(`${where}: no PDF (${r.error}${r.detail ? ' — ' + r.detail : ''})`)
      continue
    }
    if (out) writeFileSync(join(out, `${t.id}${v.photo ? '' : '.nophoto'}.pdf`), r.pdf)
    const before = failures
    const { text, pages } = await atsTextOfPdf(r.pdf)
    const report = checkAtsText(text, pages, r.document, KEYWORDS)
    for (const item of report.items) if (item.status !== 'pass') fail(`${where}: ${item.status} — ${item.label}: ${item.detail}`)
    // Case-blind, as an ATS is: several designs print the name in capitals.
    if (!norm(text).startsWith(norm(profile.full_name))) {
      const read = `an ATS reads "${text.trim().slice(0, 40).replace(/\s+/g, ' ')}" before the name`
      if (RAIL_FIRST_UNTIL_APPROVED.includes(t.id)) console.log(`  NOTE  ${where}: ${read} (known, docs/14_OPEN_ITEMS.md)`)
      else fail(`${where}: ${read}`)
    }
    // Chrome writes each <img> as an image XObject; the dictionaries are plain text.
    const images = (Buffer.from(r.pdf).toString('latin1').match(/\/Subtype\s*\/Image/g) ?? []).length
    const wantImages = t.allowsPhoto && v.photo ? 1 : 0
    if (images !== wantImages) fail(`${where}: ${images} image(s) in the PDF, expected ${wantImages}`)
    if (pages > 1) fail(`${where}: ${pages} pages for a two-job CV`)
    if (failures === before) console.log(`  PASS  ${where} — ${report.passed}/${report.total} ATS checks, ${pages} page${pages === 1 ? '' : 's'}, ${images ? 'photo' : 'no photo'}`)
  }
  server.close()
  if (failures) {
    console.error(`VERIFY FAIL — ${failures} problem(s)`)
    process.exit(1)
  }
  console.log(`VERIFY PASS — ${templates.length} templates × with/without photo, built by the download code and read back clean`)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
