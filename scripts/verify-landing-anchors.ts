/**
 * Every anchor in the public site navigation points at a section that exists.
 *
 *   node_modules/.bin/sucrase-node scripts/verify-landing-anchors.ts
 *
 * WHY THIS EXISTS. These have drifted twice in one day. First "How It Works"
 * pointed at `#how-it-works` after the section became `#how`; then the landing
 * page was restructured from a feature list into the guided path, and four of
 * the five entries pointed at sections that no longer existed.
 *
 * Both times the build passed, the types passed and the lint passed — a link to
 * a missing fragment is valid HTML that silently does nothing. It is a small
 * defect with an outsized cost: it happens on the one page whose entire job is
 * to convince a scam-wary visitor that this product is real and maintained.
 *
 * Deliberately a text scan rather than a render. The two files are plain
 * literals, the check has to run in a second, and anything that needed a
 * browser would not get run.
 */

import './resolve-paths'
import fs from 'fs'
import path from 'path'

const NAV = path.join(process.cwd(), 'components/marketing/SiteNav.tsx')
const PAGE = path.join(process.cwd(), 'app/page.tsx')

const nav = fs.readFileSync(NAV, 'utf8')
const page = fs.readFileSync(PAGE, 'utf8')

/**
 * `exec` in a loop rather than spreading `matchAll`.
 *
 * This project compiles for ES5-era iteration, so spreading an iterator is a
 * type error — and it fails the BUILD, not just this script, because `tsc`
 * covers the whole tree. Same reason `lib/jobMatch/degreeEquivalence.ts` uses
 * arrays rather than a Set.
 */
function findAll(source: string, re: RegExp): string[] {
  const out: string[] = []
  let m: RegExpExecArray | null
  while ((m = re.exec(source)) !== null) out.push(m[1])
  return out
}

/** Only the hrefs inside the ITEMS tuple list, not any in prose or comments. */
const itemsBlock = nav.slice(nav.indexOf('const ITEMS'), nav.indexOf('] as const'))
const anchors = findAll(itemsBlock, /'(#[a-zA-Z0-9-]+)'/g)
const ids = findAll(page, /id="([a-zA-Z0-9-]+)"/g).map((i) => `#${i}`)

let failures = 0
function check(name: string, ok: boolean) {
  if (ok) console.log(`  PASS  ${name}`)
  else {
    console.error(`  FAIL  ${name}`)
    failures++
  }
}

console.log('\nPublic navigation anchors')
check('the nav actually lists some anchors', anchors.length > 0)
check('the landing page actually declares some section ids', ids.length > 0)

for (const a of anchors) {
  check(`${a} resolves to a section on the landing page`, ids.includes(a))
}

// The reverse is not an error — a page may hold sections the nav does not link
// — but it is worth seeing, because a section nobody can navigate to is usually
// an oversight rather than a decision.
const unlinked = ids.filter((i) => !anchors.includes(i))
if (unlinked.length > 0) {
  console.log(`\n  note: sections with no nav entry — ${unlinked.join(' ')}`)
}

console.log(failures === 0 ? '\nAll anchors resolve.\n' : `\n${failures} FAILED\n`)
process.exit(failures === 0 ? 0 : 1)
