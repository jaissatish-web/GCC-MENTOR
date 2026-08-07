/**
 * TASK-030 PDF load test — render 5 PDFs CONCURRENTLY and record peak memory.
 *
 * Range: run with `node_modules/.bin/sucrase-node scripts/pdf-loadtest.ts`
 * (sucrase-node is already a transitive dep — no new package needed).
 *
 * This imports the REAL GulfPremium component (its `import type` alias imports
 * are type-only and erased, only `./tokens` is relative, so sucrase can run it)
 * and renders it with renderToStaticMarkup + Puppeteer's page.setContent —
 * exactly the route's heavy path — across 5 concurrent requests. Each "request"
 * is modelled as its own browser launch + one render (matching how
 * app/api/packages/[id]/pdf/route.ts launches a browser per request; 5 concurrent
 * requests = 5 concurrent Chrome instances).
 *
 * Records peak memory and writes docs/BOOT_REPORT.md. HARD STOP: if the peak
 * exceeds 1GB, report it — the VPS may need resizing or rendering may need to
 * move to a dedicated service.
 */
import { createElement } from 'react'
import * as React from 'react'
import { spawn } from 'node:child_process'
import { writeFileSync, existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import puppeteer from 'puppeteer'
import GulfPremium from '../components/templates/GulfPremium'
import type { CareerProfileFull } from '../types/careerProfile'

// GulfPremium.tsx is written for Next's automatic JSX runtime, so it never
// imports React itself. Under sucrase (classic runtime) the compiled JSX
// references a global `React`, so we provide it before any render happens.
;(globalThis as unknown as { React: unknown }).React = React

// --------------------------------------------------------------------------
// A realistic sample profile/package — enough content to resemble a real,
// full Gulf CV (so the memory measurement is representative, not an empty page).
// --------------------------------------------------------------------------
function makeProfile(): CareerProfileFull {
  const now = new Date().toISOString()
  const base = {
    id: '00000000-0000-0000-0000-000000000001',
    user_id: '00000000-0000-0000-0000-000000000002',
    currently_in_gulf: true,
    current_employer: 'L&T Energy',
    current_project: null,
    target_job_title: 'Sr. I&C Commissioning Engineer',
    target_industry: 'engineering_technical',
    target_country: 'saudi_arabia' as const,
    target_company: 'Saudi Aramco',
    full_name: 'Rahul Verma',
    photo_url: null,
    nationality: 'Indian',
    date_of_birth: '1988-04-12',
    passport_type: 'ECR' as const,
    passport_validity_date: '2031-06-30',
    visa_status: 'Transferable Iqama',
    visa_transferable: true,
    notice_period: '30 days',
    current_location: 'Jubail, KSA',
    phone: '+966 5x xxx xxxx',
    whatsapp: '+91 90000 00000',
    email: 'rahul.verma@example.com',
    linkedin_url: 'https://linkedin.example/rahulverma',
    professional_summary:
      'Instrumentation & Control commissioning engineer with 12+ years delivering upstream and downstream projects for Aramco-, ADNOC- and QP-standard megaprojects across the Gulf.',
    field_visibility: {
      full_name: true,
      photo: true,
      nationality: true,
      date_of_birth: false,
      passport_type: false,
      passport_validity: true,
      visa_status: true,
      visa_transferable: true,
      notice_period: true,
      current_location: true,
      phone: true,
      whatsapp: true,
      email: true,
      linkedin_url: true,
      additional_information: true,
    },
    readiness_category: 'currently_in_gulf' as const,
    readiness_score: 88,
    created_at: now,
    updated_at: now,
  }

  const people = Array.from({ length: 6 }, (_, i) => `00000000-0000-0000-0000-00000000001${i}`)

  return {
    ...base,
    work_experience: [
      {
        id: people[0],
        profile_id: base.id,
        company: 'L&T Energy',
        role: 'Sr. I&C Commissioning Engineer',
        start_date: '2022-03-01',
        end_date: null,
        location: 'Jubail, KSA',
        description: 'Lead commissioning of ESD, F&G and DCS systems across gas processing trains.',
        highlights: [
          'Commissioned ESD and F&G logic for 3 gas trains, achieving zero punch-list at handover',
          'Oversaw 40+ field I&C engineers and technicians across loop checking and SAT',
          'Introduced a logic-revision tracker that cut loop-check rework by ~25%',
        ],
        sort_order: 0,
        created_at: now,
      },
      {
        id: people[1],
        profile_id: base.id,
        company: 'Petrofac',
        role: 'Instrumentation Engineer',
        start_date: '2019-06-01',
        end_date: '2022-02-01',
        location: 'Abu Dhabi, UAE',
        description: 'Instrumentation design and site support for onshore EPC projects.',
        highlights: [
          'Prepared instrument index, datasheets and hook-ups for 2,000+ instruments',
          'Supported FAT/SAT and witnessed vendor testing to ADNOC standards',
        ],
        sort_order: 1,
        created_at: now,
      },
    ],
    skills: [
      { id: people[2], profile_id: base.id, name: 'Loop checking', sort_order: 0, created_at: now },
      { id: people[3], profile_id: base.id, name: 'SAT/FAT', sort_order: 1, created_at: now },
      { id: people[4], profile_id: base.id, name: 'AutoCAD', sort_order: 2, created_at: now },
      { id: people[5], profile_id: base.id, name: 'DCS / ESD', sort_order: 3, created_at: now },
    ],
    certifications: [
      {
        id: people[0],
        profile_id: base.id,
        name: 'TÜV Functional Safety (FS Engineer)',
        issuer: 'TÜV Rheinland',
        issue_date: '2021-05-01',
        expiry_date: null,
        sort_order: 0,
        created_at: now,
      },
    ],
    education: [
      {
        id: people[1],
        profile_id: base.id,
        degree: 'B.E.',
        institution: 'Anna University',
        field_of_study: 'Instrumentation & Control',
        start_year: 2006,
        end_year: 2010,
        sort_order: 0,
        created_at: now,
      },
    ],
    additional_information: [
      {
        id: people[2],
        profile_id: base.id,
        label: 'Languages',
        value: 'English, Hindi, Arabic (basic)',
        sort_order: 0,
        created_at: now,
      },
      {
        id: people[3],
        profile_id: base.id,
        label: 'Award',
        value: 'Aramco HSE Recognition 2023',
        sort_order: 1,
        created_at: now,
      },
    ],
  }
}

const optimizedContent = {
  summary: {
    generated:
      'Instrumentation & Control commissioning lead with 12+ years delivering Aramco- and ADNOC-standard megaprojects, expert in ESD, F&G and DCS system testing.',
    user_edited: null,
    source_profile_summary:
      'Instrumentation & Control commissioning engineer with 12+ years delivering upstream and downstream projects across the Gulf.',
  },
  experience_blocks: [
    {
      profile_experience_id: '00000000-0000-0000-0000-000000000010',
      was_optimized: true,
      generated_bullets: [
        'Led commissioning of ESD, F&G and DCS systems across 3 gas trains to zero-punch-list handover',
        'Directed 40+ field I&C engineers through loop checking and SAT to ADNOC/Aramco standards',
      ],
      user_edited_bullets: null,
      source_bullets: [
        'Commissioned ESD and F&G logic for 3 gas trains, achieving zero punch-list at handover',
        'Oversaw 40+ field I&C engineers and technicians across loop checking and SAT',
      ],
      claims: ['3 gas trains', '40+ field engineers'],
    },
    {
      profile_experience_id: '00000000-0000-0000-0000-000000000011',
      was_optimized: true,
      generated_bullets: ['Prepared instrumentation deliverables for 2,000+ instruments'],
      user_edited_bullets: null,
      source_bullets: ['Prepared instrument index, datasheets and hook-ups for 2,000+ instruments'],
      claims: ['2,000+ instruments'],
    },
  ],
}

const skillsOrder = [
  '00000000-0000-0000-0000-000000000012',
  '00000000-0000-0000-0000-000000000013',
  '00000000-0000-0000-0000-000000000014',
  '00000000-0000-0000-0000-000000000015',
]

// --------------------------------------------------------------------------
// Render ONE pdf — mirrors the route's page/pdf calls exactly.
// --------------------------------------------------------------------------
async function renderOne(): Promise<number> {
  const { renderToStaticMarkup } = await import('react-dom/server')
  const bodyHtml = renderToStaticMarkup(
    createElement(GulfPremium, {
      profile: makeProfile(),
      optimizedContent,
      skillsOrder,
      fieldVisibility: makeProfile().field_visibility,
    })
  )
  const fullHtml = `<!DOCTYPE html>
<html><head><meta charset="UTF-8"><style>
  html, body { margin: 0; padding: 0; background: #ffffff; }
  * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
  @page :first { size: A4; margin: 0; }
  @page { size: A4; margin: 14mm 0 12mm 0; }
</style></head><body>${bodyHtml}</body></html>`

  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
  })
  try {
    const page = await browser.newPage()
    await page.setViewport({ width: 794, height: 1123 })
    await page.setContent(fullHtml, { waitUntil: 'domcontentloaded' })
    const pdf = await page.pdf({ format: 'A4', printBackground: true, preferCSSPageSize: false })
    return pdf.length
  } finally {
    await browser.close()
  }
}

// Poll total Chrome working-set (Windows) via PowerShell every 250ms.
function chromeWorkingSetWatcher(store: { peakMB: number }, stop: () => boolean): void {
  const poll = () => {
    if (stop()) return
    const ps = spawn('powershell', [
      '-NoProfile',
      '-Command',
      "Get-Process chrome -ErrorAction SilentlyContinue | Measure-Object WorkingSet64 -Sum | Select-Object -ExpandProperty Sum",
    ])
    ps.stdout.on('data', (d: Buffer) => {
      const mb = Number(String(d).trim()) / (1024 * 1024)
      if (!Number.isNaN(mb) && mb > store.peakMB) store.peakMB = mb
    })
    ps.on('close', () => setTimeout(poll, 250))
  }
  poll()
}

async function main() {
  const N = 5
  const chromePeak = { peakMB: 0 }
  let stopWatching = false

  // Node-side peak RSS
  let nodePeakKB = process.memoryUsage().rss / 1024
  const rssTimer = setInterval(() => {
    nodePeakKB = Math.max(nodePeakKB, process.memoryUsage().rss / 1024)
  }, 100)

  chromeWorkingSetWatcher(chromePeak, () => stopWatching)

  const start = Date.now()
  const t0 = process.memoryUsage().rss

  // 5 CONCURRENT renders, each its own browser (mirrors 5 concurrent requests).
  const results = await Promise.all(Array.from({ length: N }, () => renderOne()))

  const elapsedMs = Date.now() - start
  const t1 = process.memoryUsage().rss
  stopWatching = true
  clearInterval(rssTimer)

  // Let the watcher flush one last sample.
  await new Promise((r) => setTimeout(r, 400))

  const rssDeltaMB = (t1 - t0) / (1024 * 1024)
  const peakRSSMB = nodePeakKB / 1024
  const pdfKBs = results.map((b) => (b / 1024).toFixed(1)).join(', ')

  const report = `# PDF Pipeline — TASK-030 Load Test

Run: ${new Date().toISOString()}
Method: 5 concurrent PDF renders, each its own headless-Chrome instance, via the real
GulfPremium template (renderToStaticMarkup + puppeteer setContent) — the route's heavy path.

| Metric | Value |
|---|---|
| Concurrent renders | ${N} |
| Total wall time | ${(elapsedMs / 1000).toFixed(1)}s |
| PDF sizes (kB) | ${pdfKBs} |
| Node process peak RSS | ${peakRSSMB.toFixed(1)} MB |
| Node RSS delta (before→after) | ${rssDeltaMB.toFixed(1)} MB |
| **Chrome working-set peak (all instances summed)** | **${chromePeak.peakMB.toFixed(1)} MB** |

**Verdict:** peak memory ${chromePeak.peakMB >= 1000 ? '**EXCEEDS 1GB — HARD STOP, report for VPS resize / dedicated renderer**' : 'under 1GB — no hard stop triggered.'}

Note: node peak RSS excludes the separate Chrome processes (each render launches its own
browser, which is what the per-request route does); the Chrome working-set peak above sums all
concurrent instances and is the figure that matters for the 1GB gate.
`
  const target = resolve(process.cwd(), 'docs/BOOT_REPORT.md')
  if (existsSync(target)) {
    writeFileSync(target, readFileSync(target) + '\n---\n\n' + report)
  } else {
    writeFileSync(target, report)
  }
  console.log(report)
}

main().catch((e) => {
  console.error('LOAD TEST FAILED:', e)
  process.exit(1)
})
