/**
 * Landing asset weight budget — deterministic regression guard.
 *
 * The public landing page is the first thing a Gulf job seeker sees, usually on a
 * phone. A single oversized sprite sheet or flag file silently adds hundreds of
 * kilobytes to every mobile visit, and no visual review catches that. This check
 * pins a byte budget on the landing assets that actually ship to the browser.
 *
 * It reads files from disk only: no network, no database, no secrets.
 */
import assert from 'node:assert/strict'
import { readFileSync, statSync, existsSync } from 'node:fs'
import { join } from 'node:path'

const root = process.cwd()
const publicDir = join(root, 'public', 'landing', 'v2')
const KB = 1024

const size = (relative) => {
  const path = join(root, relative)
  assert.ok(existsSync(path), `Missing landing asset: ${relative}`)
  return statSync(path).size / KB
}

// 1. The country flags. All six render at 36x26 CSS px, so anything approaching
//    25 KB means the vector was exported with floating-point coordinates.
const flags = ['sa', 'ae', 'qa', 'om', 'kw', 'bh']
for (const code of flags) {
  const kb = size(`public/landing/v2/flags/${code}.svg`)
  assert.ok(kb <= 25, `Flag ${code}.svg is ${kb.toFixed(1)} KB; budget is 25 KB (export with integer precision)`)
}

// 2. The six industry scenes. A single 1536x1024 sprite was 294 KB and every
//    phone downloaded all six scenes to show six thumbnails. They are six files now.
const industries = ['oil-gas', 'construction', 'engineering', 'operations', 'projects', 'corporate']
let industriesTotal = 0
for (const name of industries) {
  const kb = size(`public/landing/v2/industries/${name}.webp`)
  industriesTotal += kb
  assert.ok(kb <= 45, `Industry tile ${name}.webp is ${kb.toFixed(1)} KB; budget is 45 KB`)
}
assert.ok(industriesTotal <= 210, `Industry tiles total ${industriesTotal.toFixed(1)} KB; budget is 210 KB`)

// 3. The legacy all-in-one sprite must not come back: one file cannot be lazy-loaded.
assert.ok(!existsSync(join(publicDir, 'industries.webp')),
  'public/landing/v2/industries.webp must stay deleted: it is a single 294 KB sheet that cannot lazy-load')

// 4. The resume halo. Mobile gets its own smaller file so a phone does not pull
//    the 86 KB desktop decoration.
const haloDesktop = size('public/landing/v2/resume-halo.webp')
const haloMobile = size('public/landing/v2/resume-halo-mobile.webp')
assert.ok(haloMobile <= 25, `Mobile halo is ${haloMobile.toFixed(1)} KB; budget is 25 KB`)
assert.ok(haloMobile < haloDesktop, `Mobile halo (${haloMobile.toFixed(1)} KB) must be smaller than desktop (${haloDesktop.toFixed(1)} KB)`)

// 5. The founder portrait is authenticated content and must not be re-encoded.
const portrait = readFileSync(join(publicDir, 'founder-satish.webp'))
assert.equal(portrait.length, 20954, 'Founder portrait must not be re-encoded')

// 6. Total landing image budget: the sum of what a cold mobile visit pulls.
const landingImageBudget = 700
const images = [
  'hero-gulf.webp',
  'gulf-skyline.webp',
  'resume-halo.webp',
  'resume-halo-mobile.webp',
  'founder-satish.webp',
  ...flags.map(code => `flags/${code}.svg`),
  ...industries.map(name => `industries/${name}.webp`),
]
const total = images.reduce((sum, file) => sum + size(`public/landing/v2/${file}`), 0)
assert.ok(total <= landingImageBudget,
  `Landing images total ${total.toFixed(1)} KB; budget is ${landingImageBudget} KB`)

console.log(`PASS: landing assets within budget (flags <=25 KB, industry tiles <=45 KB each, landing images ${total.toFixed(1)} KB <= ${landingImageBudget} KB).`)
