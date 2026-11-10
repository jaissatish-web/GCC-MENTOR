import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { parse } from 'postcss'
import { DEFAULT_THEME, DEVICES, NUMBER_FIELDS, normalizeTheme, themeVariables, themeStyleText, contrastRatio } from '../lib/design-system/theme'

// Stored/browser data is untrusted, even without a server publishing endpoint.
for (const input of [null, undefined, [], 'body{display:none}', { fontFamily: 'url(https://invalid.test)' }, { colors: { brand: '#fff; color:red' } }, { mobile: { heroSize: Infinity, bodySize: -1 } }]) {
  assert.deepEqual(normalizeTheme(input), DEFAULT_THEME)
}
const changed = normalizeTheme({ colors: { brand: '#123abc' }, mobile: { heroSize: 32 }, desktop: { landingGap: 120 }, unexpected: 'ignored' })
assert.equal(changed.colors.brand, '#123ABC')
assert.equal(changed.mobile.heroSize, 32)
assert.equal(changed.tablet.heroSize, 44)
assert.equal(changed.desktop.landingGap, 120)
assert.equal(changed.desktop.heroSize, 52)
changed.mobile.heroSize = 40
assert.equal(DEFAULT_THEME.mobile.heroSize, 36, 'Normalization returns independent defaults')
const malicious = { colors: { brand: '</style><script>alert(1)</script>' }, mobile: { gutter: '12px;display:none' }, fontFamily: 'Arial; color:red' }
assert.ok(!themeStyleText(malicious).includes('<'))
assert.ok(!themeStyleText(malicious).includes('display:none'))
const vars = themeVariables(DEFAULT_THEME) as Record<string,string>
assert.equal(vars['--uds-brand'], '#087F76')
assert.equal(vars['--uds-brand-rgb'], '8 127 118')
assert.equal(vars['--uds-mobile-hero-size'], '2.25rem')
assert.equal(vars['--uds-desktop-landing-gap'], '96px')
assert.ok(Object.keys(vars).every(key => key.startsWith('--uds-')), 'No existing resume/UI token is overwritten')
assert.ok(contrastRatio(DEFAULT_THEME.colors.ink, DEFAULT_THEME.colors.canvas) >= 4.5)
assert.ok(contrastRatio(DEFAULT_THEME.colors.primaryText, DEFAULT_THEME.colors.brand) >= 4.5)
assert.ok(contrastRatio(DEFAULT_THEME.colors.muted, DEFAULT_THEME.colors.surface) >= 4.5)
const css = parse(readFileSync('components/design-system/UniversalTheme.module.css','utf8'))
css.walkRules(rule => assert.ok(!rule.selector.includes(':root') && !/(^|[\s,>+~])body(?:[\s.#:[>+~]|$)/.test(rule.selector), 'Foundation only has opt-in module selectors'))
css.walkRules('.theme', rule => rule.walkDecls(decl => assert.ok(decl.prop.startsWith('--uds-'), 'Theme container does not apply inheritable document styles')))
for (const device of DEVICES) for (const field of NUMBER_FIELDS) {
  assert.ok(typeof DEFAULT_THEME[device][field.key] === 'number')
  assert.ok(DEFAULT_THEME[device][field.key] >= field.min && DEFAULT_THEME[device][field.key] <= field.max)
}
console.log('PASS: bounded themes, rejected CSS injection, independent responsive values, scoped variables and default text contrast')

const pilotCss = readFileSync("components/landing-v3/universal-pilot.module.css", "utf8")
assert.ok(pilotCss.includes(":global(.actual-template-orbit-face)"), "Document classes must retain their global identity inside CSS Modules")
assert.ok(pilotCss.includes(":global(#resume-render)"), "Document IDs must retain their global identity inside CSS Modules")
