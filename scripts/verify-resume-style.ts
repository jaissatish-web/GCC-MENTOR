/**
 * The user's style choices: what the server accepts, and what each one does to
 * a design (2026-10-04).
 *
 *   node_modules/.bin/sucrase-node scripts/verify-resume-style.ts
 *
 * lib/resumeStyle.ts turns a client payload into stored keys and stored keys
 * into a theme. These are the rules both halves must keep: only named keys,
 * nothing stored that is the default, and each choice changing exactly what it
 * says — text colour the text, highlight the shading, borders the lines, header
 * the header — and nothing at all when it is not set.
 */

import './resolve-paths'
import { applyStyleOverrides, parseStyleOverrides } from '../lib/resumeStyle'
import * as themes from '../components/templates/themes'

let failures = 0
function check(name: string, cond: boolean) {
  if (cond) console.log(`  PASS  ${name}`)
  else {
    failures++
    console.error(`  FAIL  ${name}`)
  }
}

const value = (input: unknown) => {
  const r = parseStyleOverrides(input)
  return 'error' in r ? undefined : r.value
}
const error = (input: unknown) => {
  const r = parseStyleOverrides(input)
  return 'error' in r ? r.error : undefined
}

console.log('The server keeps only named choices')
check('text colour: dark and black are accepted', value({ ink: 'dark' })?.ink === 'dark' && value({ ink: 'black' })?.ink === 'black')
check('text colour: anything else is rejected by name', error({ ink: '#000' }) === 'styleOverrides.ink')
check('highlight: every named tint and none are accepted', ['none', 'grey', 'blue', 'green', 'yellow', 'rose'].every((h) => value({ highlight: h })?.highlight === h))
check('highlight: a raw colour is rejected', error({ highlight: '#FFF4CC' }) === 'styleOverrides.highlight')
check('header: light and bold are accepted', value({ header: 'light' })?.header === 'light' && value({ header: 'bold' })?.header === 'bold')
check('header: anything else is rejected', error({ header: 'band' }) === 'styleOverrides.header')
check('built-in object names are not keys', ['toString', 'constructor', '__proto__', 'hasOwnProperty'].every((k) => error({ ink: k }) && error({ highlight: k }) && error({ header: k })))
check('borders: off is stored as false', value({ lines: false })?.lines === false)
check('borders: on is the default, so nothing is stored', value({ lines: true }) === null)
check('borders: a non-boolean is rejected', error({ lines: 'no' }) === 'styleOverrides.lines')
check('the new choices sit beside the old ones', JSON.stringify(value({ font: 'serif', ink: 'black', highlight: 'none', lines: false, header: 'bold' })) === JSON.stringify({ font: 'serif', ink: 'black', highlight: 'none', lines: false, header: 'bold' }))

console.log('\nNothing set changes nothing')
check('no overrides return the very same theme', applyStyleOverrides(themes.CLINICAL_CARE, {}) === themes.CLINICAL_CARE)
check('the stored theme objects are never changed', (() => {
  const before = JSON.stringify(themes.WORKSHOP_PRO)
  applyStyleOverrides(themes.WORKSHOP_PRO, { ink: 'black', highlight: 'none', lines: false, header: 'light' })
  return JSON.stringify(themes.WORKSHOP_PRO) === before
})())

console.log('\nEach choice changes what it says')
const dark = applyStyleOverrides(themes.CLINICAL_CARE, { ink: 'black' })
check('text colour: body and secondary text go dark', dark.ink === '#000000' && dark.muted === '#1F1F1F')
check('text colour: headings keep the accent', dark.accent === themes.CLINICAL_CARE.accent)
const yellow = applyStyleOverrides(themes.CLINICAL_CARE, { highlight: 'yellow' })
check('highlight: the shading takes the chosen tint', yellow.accentSoft === '#FFF4CC')
check('highlight wins over the accent colour\'s own tint', applyStyleOverrides(themes.CLINICAL_CARE, { accent: 'navy', highlight: 'grey' }).accentSoft === '#F1F3F5')
check('highlight: a solid heading bar becomes a light bar', applyStyleOverrides(themes.WORKSHOP_PRO, { highlight: 'grey' }).headingStyle === 'tint')
check('highlight none: a solid heading bar becomes an underlined heading', applyStyleOverrides(themes.WORKSHOP_PRO, { highlight: 'none' }).headingStyle === 'rule')
check('highlight none: the shading is white', applyStyleOverrides(themes.CLINICAL_CARE, { highlight: 'none' }).accentSoft === '#FFFFFF')
check('borders off: box and tag lines go', applyStyleOverrides(themes.CLINICAL_CARE, { lines: false }).boxLines === false)
check('borders off: underlined headings go plain', ['rule', 'side', 'bar'].every((h) => applyStyleOverrides({ ...themes.CLINICAL_CARE, headingStyle: h as 'rule' }, { lines: false }).headingStyle === 'plain'))
check('no highlight and no borders: a heading bar ends plain', applyStyleOverrides(themes.WORKSHOP_PRO, { highlight: 'none', lines: false }).headingStyle === 'plain')
check('header bold: a colour band', applyStyleOverrides(themes.CLINICAL_CARE, { header: 'bold' }).headerBand === true)
check('header light: no band', applyStyleOverrides(themes.FALCON_EXECUTIVE, { header: 'light' }).headerBand === false)
check('header: a side-column design is left alone', applyStyleOverrides(themes.PIPELINE_PRO, { header: 'bold' }).headerBand === themes.PIPELINE_PRO.headerBand)

if (failures) {
  console.error(`\n${failures} check(s) failed`)
  process.exit(1)
}
console.log('\nAll resume-style checks passed')
