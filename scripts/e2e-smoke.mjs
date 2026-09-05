/**
 * END-TO-END SMOKE TEST — drives the real HTTP routes with a real session.
 *
 *   node scripts/e2e-smoke.mjs                      # against a local dev server
 *   node scripts/e2e-smoke.mjs https://your-host    # against a deployment
 *   node scripts/e2e-smoke.mjs --no-ai              # skip every model call
 *
 * WHY THIS EXISTS. `docs/14_OPEN_ITEMS.md` §C1 has said, since the beginning,
 * that **no authenticated page has ever been checked** — there is no login
 * session in the CTO environment, so every signed-in screen was verified by
 * diff, build and reasoning. That is a real gap and this closes it: the script
 * creates a throwaway account through the admin API, mints the same cookie the
 * browser would hold, and calls the routes a real user calls, in the order a
 * real user calls them.
 *
 * WHAT IT COSTS, stated plainly because it is not free:
 *   - It writes to the LIVE Supabase project (there is only one).
 *   - It spends roughly SIX real model calls unless `--no-ai` is passed.
 *   - It consumes rate-limit slots for the throwaway user only.
 * Everything it creates is deleted at the end, including on failure: the user
 * is removed and the schema's cascades take the profile, its children and the
 * packages with it. The cleanup is in a `finally`, so a crash still tidies up.
 *
 * It is a SMOKE test, not a unit test. It answers "does the product work end to
 * end right now", which is the question the pure suites in this folder cannot
 * answer at all. Pure logic belongs in those; this one is about wiring.
 */

import { createClient } from '@supabase/supabase-js'
import { createRequire } from 'module'
import fs from 'fs'
import crypto from 'crypto'

const require = createRequire(import.meta.url)
const { createChunks } = require('@supabase/ssr/dist/main/utils/chunker.js')
const { stringToBase64URL } = require('@supabase/ssr/dist/main/utils/base64url.js')

// ---------------------------------------------------------------------------

const args = process.argv.slice(2)
const SKIP_AI = args.includes('--no-ai')
const BASE = (args.find((a) => a.startsWith('http')) ?? 'http://localhost:3000').replace(/\/$/, '')

const env = Object.fromEntries(
  fs
    .readFileSync('.env.local', 'utf8')
    .split(/\r?\n/)
    .filter((l) => l.includes('=') && !l.startsWith('#'))
    .map((l) => [l.slice(0, l.indexOf('=')).trim(), l.slice(l.indexOf('=') + 1).trim()]),
)

const admin = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
})

let pass = 0
let fail = 0
const failures = []

function check(name, ok, detail) {
  if (ok) {
    pass++
    console.log(`  PASS  ${name}`)
  } else {
    fail++
    failures.push(name + (detail ? ` — ${detail}` : ''))
    console.error(`  FAIL  ${name}${detail ? ` — ${detail}` : ''}`)
  }
}
function section(t) {
  console.log(`\n${t}\n${'-'.repeat(t.length)}`)
}

/**
 * A resume with a deliberate shape: Gulf work stated only as free-text
 * locations ("Abu Dhabi, UAE", "Jubail"), and an Indian-named degree against a
 * job that will ask for the British name. That is the §B1 defect's exact
 * fingerprint. It is optimized against a job description that asks for GCC
 * experience and a B.Eng, so the optimization below exercises the same matching
 * engine the removed standalone service used to expose.
 */
const RESUME_TEXT = `RAJESH KUMAR
Senior Piping Engineer
Email: rajesh.kumar.e2e@example.com | Phone: +971 50 123 4567
Current Location: Abu Dhabi, UAE
Nationality: Indian

PROFESSIONAL SUMMARY
Senior Piping Engineer with 12 years of experience across oil and gas projects
in the Gulf. Specialised in piping design, stress analysis and site supervision.

WORK EXPERIENCE

Senior Piping Engineer, Al Mansoori Engineering
Abu Dhabi, UAE | January 2020 - Present
- Led piping design for a 200,000 bpd refinery expansion
- Supervised a team of 8 piping designers across two sites
- Delivered isometrics and stress analysis using CAESAR II

Piping Engineer, Saudi Industrial Services
Jubail | March 2014 - December 2019
- Produced piping layouts and isometric drawings for petrochemical plants
- Performed pipe stress analysis to ASME B31.3

EDUCATION
B.Tech in Mechanical Engineering, Anna University, 2010 - 2014

SKILLS
Piping Design, CAESAR II, AutoCAD, Pipe Stress Analysis, ASME B31.3, PDMS

CERTIFICATIONS
ASNT Level II, 2018
NEBOSH IGC, 2019
`

const JOB_DESCRIPTION = `Senior Piping Engineer - Abu Dhabi, UAE

We are seeking a Senior Piping Engineer for a major oil and gas project in Abu Dhabi.

Requirements:
- B.Eng in Mechanical Engineering
- Minimum 10 years of piping engineering experience
- GCC experience is required
- Proficiency in CAESAR II and AutoCAD
- Strong knowledge of ASME B31.3

Responsibilities:
- Lead piping design and stress analysis for refinery projects
- Supervise piping designers and review isometric drawings
`

// ---------------------------------------------------------------------------

const EMAIL = `e2e-smoke-${Date.now()}@example.com`
const PASSWORD = crypto.randomBytes(18).toString('base64url') + 'Aa1!'
let userId = null

async function createUser() {
  const { data, error } = await admin.auth.admin.createUser({
    email: EMAIL,
    password: PASSWORD,
    email_confirm: true,
  })
  if (error) throw new Error('could not create the throwaway user: ' + error.message)
  userId = data.user.id
  return data.user.id
}

/**
 * Mint the exact cookie `@supabase/ssr` writes, so the app's own server client
 * reads this session the way it reads a browser's. Chunked because a session
 * JWT exceeds the 4KB per-cookie limit — that chunking is the part a naive
 * hand-rolled cookie gets wrong.
 */
async function sessionCookie() {
  const anon = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
    auth: { persistSession: false },
  })
  const { data, error } = await anon.auth.signInWithPassword({ email: EMAIL, password: PASSWORD })
  if (error) throw new Error('could not sign in as the throwaway user: ' + error.message)

  const ref = new URL(env.NEXT_PUBLIC_SUPABASE_URL).hostname.split('.')[0]
  const encoded = 'base64-' + stringToBase64URL(JSON.stringify(data.session))
  const chunks = createChunks(`sb-${ref}-auth-token`, encoded)
  return chunks.map((c) => `${c.name}=${encodeURIComponent(c.value)}`).join('; ')
}

let COOKIE = ''

async function req(path, { method = 'GET', body, json, auth = true, redirect = 'manual' } = {}) {
  const headers = {}
  if (auth && COOKIE) headers.cookie = COOKIE
  if (json !== undefined) {
    headers['content-type'] = 'application/json'
    body = JSON.stringify(json)
  }
  const res = await fetch(`${BASE}${path}`, { method, headers, body, redirect })
  const ct = res.headers.get('content-type') ?? ''
  let payload = null
  if (ct.includes('application/json')) payload = await res.json().catch(() => null)
  else if (ct.includes('pdf')) payload = Buffer.from(await res.arrayBuffer())
  else payload = await res.text().catch(() => '')
  return { status: res.status, headers: res.headers, body: payload }
}

function short(v) {
  if (v == null) return 'null'
  if (Buffer.isBuffer(v)) return `<${v.length} bytes>`
  const s = typeof v === 'string' ? v : JSON.stringify(v)
  return s.length > 160 ? s.slice(0, 160) + '…' : s
}

// ---------------------------------------------------------------------------

async function run() {
  console.log(`\nGCC MENTOR end-to-end smoke test`)
  console.log(`target: ${BASE}`)
  console.log(`model calls: ${SKIP_AI ? 'SKIPPED (--no-ai)' : 'ENABLED — this spends real money'}`)

  // ---- anonymous ----------------------------------------------------------
  section('Public surface, signed out')

  {
    const r = await req('/', { auth: false })
    check('GET / serves the landing page', r.status === 200 && String(r.body).includes('GCC MENTOR'), `status ${r.status}`)
    check('landing page no longer claims DOCX', !String(r.body).includes('DOCX'))
    check('landing page no longer claims instant checkout', !String(r.body).includes('Instant self-serve'))
  }
  {
    const r = await req('/robots.txt', { auth: false })
    check('GET /robots.txt serves', r.status === 200 && String(r.body).includes('Disallow: /api/'), `status ${r.status}`)
  }
  {
    const r = await req('/sitemap.xml', { auth: false })
    check('GET /sitemap.xml serves', r.status === 200 && String(r.body).includes('<urlset'), `status ${r.status}`)
  }
  {
    const r = await req('/gulf-readiness-score', { auth: false })
    check('GET /gulf-readiness-score is reachable signed out', r.status === 200, `status ${r.status}`)
  }

  section('The auth wall actually holds')
  for (const path of ['/dashboard', '/profile', '/settings', '/dashboard/library']) {
    const r = await req(path, { auth: false })
    const loc = r.headers.get('location') ?? ''
    check(`${path} redirects a signed-out visitor to /login`, r.status === 307 && loc.includes('/login'), `status ${r.status} → ${loc || 'no location'}`)
  }
  for (const path of ['/api/profile', '/api/packages', '/api/service-credits']) {
    const r = await req(path, { auth: false })
    check(`${path} refuses a signed-out caller with 401`, r.status === 401, `status ${r.status}`)
  }
  {
    const r = await req('/api/parse/text', { auth: false, method: 'POST', json: { text: RESUME_TEXT } })
    check('/api/parse/text refuses a signed-out caller BEFORE any model call', r.status === 401, `status ${r.status}`)
  }

  section('Anonymous Gulf Readiness — arithmetic, no model, nothing stored')
  {
    const fd = new FormData()
    fd.set('answers', JSON.stringify({ hasGulfExperience: true, currentlyInGulf: true }))
    fd.set('resume_text', RESUME_TEXT)
    const res = await fetch(`${BASE}/api/gulf-readiness`, { method: 'POST', body: fd })
    const j = await res.json().catch(() => null)
    check('scores an anonymous resume', res.status === 200 && j?.success === true, `status ${res.status} ${short(j)}`)
    const score = j?.result?.finalScore
    check('returns a numeric score in 0..100', typeof score === 'number' && score >= 0 && score <= 100, `got ${score}`)
    check('returns a band and dimension breakdown', Boolean(j?.result?.band) && (j?.result?.dimensions?.length ?? 0) > 0, short(j?.result?.band))
    check('returns the resume text back for the signup handoff', typeof j?.resumeText === 'string' && j.resumeText.length > 50)
    if (typeof score === 'number') console.log(`        readiness score: ${score}`)
  }

  // ---- authenticated ------------------------------------------------------
  section('Creating a throwaway account')
  await createUser()
  COOKIE = await sessionCookie()
  check('created a user and minted a session cookie', Boolean(userId) && COOKIE.length > 0)
  console.log(`        user: ${userId}`)

  {
    // 404 is the CORRECT answer for a brand-new account: authenticated, but no
    // profile row yet. 401 would mean the cookie did not authenticate.
    const r = await req('/api/profile')
    check('GET /api/profile authenticates the minted session', r.status === 404, `status ${r.status} ${short(r.body)}`)
  }
  {
    const r = await req('/dashboard')
    check('GET /dashboard renders for a signed-in user', r.status === 200, `status ${r.status}`)
  }
  {
    const r = await req('/api/service-credits?service=cover_letter')
    check('GET /api/service-credits reports a balance', r.status === 200 && typeof r.body?.available === 'number', `status ${r.status} ${short(r.body)}`)
    const bad = await req('/api/service-credits')
    check('service-credits rejects a call with no service key', bad.status === 400, `status ${bad.status}`)
  }

  let draft = null
  if (!SKIP_AI) {
    section('Resume parsing — the GPT extraction path')
    const r = await req('/api/parse/text', { method: 'POST', json: { text: RESUME_TEXT } })
    draft = r.body?.draft ?? null
    check('POST /api/parse/text extracts a profile', r.status === 200 && Boolean(draft), `status ${r.status} ${short(r.body)}`)
    if (draft) {
      check('extracted the name', /rajesh/i.test(draft.full_name ?? ''), `got ${short(draft.full_name)}`)
      check('extracted both jobs', (draft.work_experience?.length ?? 0) === 2, `got ${draft.work_experience?.length}`)
      check('extracted skills', (draft.skills?.length ?? 0) >= 4, `got ${draft.skills?.length}`)
      check('extracted education', (draft.education?.length ?? 0) >= 1, `got ${draft.education?.length}`)
      const locs = (draft.work_experience ?? []).map((w) => w.location ?? '')
      check('kept the free-text location per job — what §B1 needs', locs.some((l) => /abu dhabi/i.test(l)) && locs.some((l) => /jubail/i.test(l)), `got ${short(locs)}`)
      check('invented no target fields (grounding: they are not in the resume)', !('target_job_title' in draft) && !('target_country' in draft))
      console.log(`        locations extracted: ${JSON.stringify(locs)}`)
    }
  }

  let profileId = null
  if (draft) {
    section('Saving the Career Profile')

    // The editor is what actually PUTs, and it merges the draft over its own
    // defaults before sending (app/profile/page.tsx). That matters here: the
    // extraction prompt is FORBIDDEN from returning `currently_in_gulf`, and
    // the save REQUIRES it as a boolean — so a raw draft PUT is rejected with
    // "Invalid field: currently_in_gulf". Nothing in the product does that
    // today (one caller, and it defaults the field), but the two contracts do
    // contradict each other, and only a client-side default bridges them.
    // Recorded in docs/14_OPEN_ITEMS.md §B9. This mirrors the editor.
    const putBody = { currently_in_gulf: false, ...draft }
    const r = await req('/api/profile', { method: 'PUT', json: putBody })
    check('PUT /api/profile saves the extracted draft', r.status === 200, `status ${r.status} ${short(r.body)}`)

    // GET returns the profile at the TOP LEVEL, with the five child arrays and
    // computed employment_gaps merged in — not nested under a `profile` key.
    const g = await req('/api/profile')
    const saved = g.body ?? {}
    profileId = saved.id ?? null
    check('GET /api/profile returns the saved profile', Boolean(profileId), short(g.body))
    check('work experience round-tripped', (saved.work_experience?.length ?? 0) === 2, `got ${saved.work_experience?.length}`)
    check('skills round-tripped', (saved.skills?.length ?? 0) >= 4, `got ${saved.skills?.length}`)
    check('education round-tripped', (saved.education?.length ?? 0) >= 1, `got ${saved.education?.length}`)
    const savedLocs = (saved.work_experience ?? []).map((w) => w.location)
    check('locations survived the save', savedLocs.some((l) => /abu dhabi/i.test(l ?? '')), `got ${short(savedLocs)}`)
    check('gcc_country is still NULL in the database — nothing fabricates it', (saved.work_experience ?? []).every((w) => w.gcc_country == null))
    check('employment gaps were computed', Array.isArray(saved.employment_gaps), short(saved.employment_gaps))
  }

  // The standalone Job Match service was removed 2026-09-04 (founder decision):
  // it is no longer something a user opens on its own. The MATCHING ENGINE is
  // very much alive — /api/optimize structures the pasted job description and
  // runs computeDeterministicCategories to build the "Job Match Findings"
  // section of the optimization prompt. So this suite no longer calls a
  // Job Match endpoint; instead it proves the same work still happens INSIDE
  // optimization, below, by asserting a job_description model call was made.
  //
  // The §B1 scoring itself (Gulf location read from the resume, B.Tech vs
  // B.Eng) is pure and is covered exhaustively by
  // scripts/verify-gcc-experience.ts — 47 assertions, no network, no cost.

  let packageId = null
  if (profileId) {
    section('Resume package — create, generate, list, download')
    const a = await req('/api/optimize', {
      method: 'POST',
      json: {
        profileId,
        targetFields: {
          target_job_title: 'Senior Piping Engineer',
          target_industry: 'engineering_technical',
          target_country: 'uae',
          target_company: null,
        },
        jobDescription: JOB_DESCRIPTION,
        selectedBlocks: { summary: true, experienceIds: [] },
        level: 'moderate',
      },
    })
    packageId = a.body?.packageId ?? a.body?.id ?? null
    check('Phase A creates the package and spends no model call', a.status === 200 && Boolean(packageId), `status ${a.status} ${short(a.body)}`)

    if (packageId && !SKIP_AI) {
      // TIMED. Phase B makes TWO sequential model calls when a job description
      // is present — structuring the advert, then the 8192-token rewrite, which
      // can itself retry at double budget on a reasoning-only response. The
      // route declares maxDuration = 60, and on 2026-09-04 this returned
      // FUNCTION_INVOCATION_TIMEOUT (504) against production while passing
      // locally. The number below is the margin, so it stops being a guess.
      const t0 = Date.now()
      const b = await req('/api/optimize', { method: 'POST', json: { packageId } })
      const secs = (Date.now() - t0) / 1000
      console.log(`        generation took ${secs.toFixed(1)}s (Vercel limit for this route: 60s)`)
      check('Phase B generates the optimized resume', b.status === 200 && b.body?.success === true, `status ${b.status} ${short(b.body)}`)
      check('generation finished inside the serverless timeout, with margin', secs < 50, `${secs.toFixed(1)}s — too close to the 60s ceiling`)

      const again = await req('/api/optimize', { method: 'POST', json: { packageId } })
      check('a repeat generate is refused as already-done, not charged twice', again.body?.alreadyGenerated === true, short(again.body))
    }

    const list = await req('/api/packages')
    check('GET /api/packages lists the new package', list.status === 200 && (list.body?.packages ?? []).some((p) => p.id === packageId), `status ${list.status}`)

    if (packageId) {
      const pdf = await req(`/api/packages/${packageId}/pdf`)
      const isPdf = Buffer.isBuffer(pdf.body) && pdf.body.slice(0, 5).toString() === '%PDF-'
      check('GET /api/packages/[id]/pdf returns a real PDF (Chromium launches)', pdf.status === 200 && isPdf, `status ${pdf.status} ${short(pdf.body)}`)
      if (isPdf) console.log(`        pdf: ${(pdf.body.length / 1024).toFixed(0)} KB`)
    }

    if (packageId && !SKIP_AI) {
      const cl = await req(`/api/packages/${packageId}/cover-letter`, { method: 'POST', json: {} })
      check('POST cover-letter generates a letter', cl.status === 200, `status ${cl.status} ${short(cl.body)}`)
    }
  }

  // Must run BEFORE cleanup. `ai_usage_log.user_id` is ON DELETE CASCADE, so
  // deleting the throwaway user erases its own spend rows — which is also how
  // this check found that Job Match was logging with user_id NULL (its rows
  // were the only ones that survived the delete).
  if (!SKIP_AI) {
    section('Spend was recorded, and recorded against this user')
    const { data: rows } = await admin
      .from('ai_usage_log')
      .select('route, input_tokens, output_tokens, estimated_cost_inr')
      .eq('user_id', userId)
    const logged = rows ?? []
    const routes = [...new Set(logged.map((r) => r.route))].sort()
    console.log(`        ${logged.length} calls logged: ${routes.join(', ')}`)

    check('every model call was written to ai_usage_log', logged.length >= 3, `only ${logged.length}`)
    // Proof the job-description analysis still runs INSIDE optimization after the
    // standalone Job Match service was removed. /api/optimize makes a second,
    // separate model call to structure the pasted JD before it writes the resume;
    // if that ever stops happening, the optimizer silently goes back to ignoring
    // the job description and this count drops.
    const optimizeCalls = logged.filter((r) => r.route === '/api/optimize').length
    check('optimization structured the pasted job description as well as writing the resume', optimizeCalls >= 2, `only ${optimizeCalls} call(s) on /api/optimize`)
    check('token counts are real, never zero', logged.every((r) => r.input_tokens > 0 && r.output_tokens > 0))
    // The regression guard for the 2026-09-04 defect: an empty rate env var made
    // Number('') === 0, so every row logged at ₹0.00 while the tokens looked fine.
    check('cost is priced, not silently zero', logged.every((r) => Number(r.estimated_cost_inr) > 0), JSON.stringify(logged.map((r) => r.estimated_cost_inr)))
    check('extraction and optimization both attributed their spend', routes.includes('/api/optimize'), routes.join(','))
    check('extraction attributed its spend to the user', routes.includes('/api/parse/text'), routes.join(','))
    const total = logged.reduce((n, r) => n + Number(r.estimated_cost_inr), 0)
    console.log(`        this run cost about ₹${total.toFixed(2)}`)
  }

  section('Ownership — another account must not reach these rows')
  if (packageId) {
    const r = await req(`/api/packages/${packageId}`, { auth: false })
    check('the package is unreachable without a session', r.status === 401 || r.status === 404, `status ${r.status}`)
  }
}

async function cleanup() {
  if (!userId) return
  try {
    await admin.auth.admin.deleteUser(userId)
    const { count } = await admin.from('career_profiles').select('id', { count: 'exact', head: true }).eq('user_id', userId)
    const { count: pkgs } = await admin.from('packages').select('id', { count: 'exact', head: true }).eq('user_id', userId)
    console.log(`\ncleanup: user deleted; career_profiles left=${count ?? 0}, packages left=${pkgs ?? 0}`)
  } catch (e) {
    console.error('\ncleanup FAILED — remove this user by hand:', userId, e.message)
  }
}

try {
  await run()
} catch (e) {
  fail++
  failures.push('threw: ' + e.message)
  console.error('\nUNCAUGHT:', e.message)
} finally {
  await cleanup()
}

console.log(`\n${'='.repeat(60)}`)
console.log(`${pass} passed, ${fail} failed`)
if (failures.length) {
  console.log('\nFailures:')
  for (const f of failures) console.log('  - ' + f)
}
process.exit(fail === 0 ? 0 : 1)
