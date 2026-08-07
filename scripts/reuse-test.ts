import { findSimilarPackage } from '../lib/reuseDetection'

const pkgs = (titles: Array<{ id: string; title: string }>) =>
  titles.map((t) => ({ id: t.id, target_job_title: t.title }))

let pass = 0
let fail = 0
function check(name: string, actual: unknown, expected: unknown) {
  const ok = JSON.stringify(actual) === JSON.stringify(expected)
  if (ok) pass++
  else {
    fail++
    console.error(`FAIL ${name}: got ${JSON.stringify(actual)}, want ${JSON.stringify(expected)}`)
  }
}

check('subset: new has extra tokens', findSimilarPackage('Commissioning Engineer (I&C)', pkgs([{ id: 'a', title: 'Commissioning Engineer' }])), { id: 'a', title: 'Commissioning Engineer' })
check('subset: pkg has extra tokens', findSimilarPackage('Commissioning Engineer', pkgs([{ id: 'b', title: 'Commissioning Engineer (I&C)' }])), { id: 'b', title: 'Commissioning Engineer (I&C)' })
check('exact', findSimilarPackage('Sr. I&C Commissioning Engineer', pkgs([{ id: 'c', title: 'Sr. I&C Commissioning Engineer' }])), { id: 'c', title: 'Sr. I&C Commissioning Engineer' })
check('case/punct insensitive', findSimilarPackage('Piping Engineer -', pkgs([{ id: 'd', title: 'piping engineer' }])), { id: 'd', title: 'piping engineer' })
check('ic tokenization not conflated', findSimilarPackage('Commissioning Engineer (I&C)', pkgs([{ id: 'z', title: 'Commissioning Engineer' }])), { id: 'z', title: 'Commissioning Engineer' })
check('no match different', findSimilarPackage('QA/QC Inspector', pkgs([{ id: 'e', title: 'Commissioning Engineer' }])), null)
check('no match filler only', findSimilarPackage('the of', pkgs([{ id: 'f', title: 'the' }])), null)
check('empty title', findSimilarPackage('', pkgs([{ id: 'g', title: 'Commissioning' }])), null)
check('first match wins', findSimilarPackage('Commissioning Engineer', pkgs([
  { id: 'h1', title: 'Commissioning Engineer' },
  { id: 'h2', title: 'Sr. Commissioning Engineer' },
])), { id: 'h1', title: 'Commissioning Engineer' })

console.log(`\n${pass} passed, ${fail} failed`)
process.exit(fail ? 1 : 0)
