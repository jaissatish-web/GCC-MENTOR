import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'
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
assert.equal(vars['--uds-brand'], DEFAULT_THEME.colors.brand)
assert.equal(vars['--uds-brand-rgb'], '0 127 120')
assert.equal(vars['--uds-mobile-hero-size'], '2.25rem')
assert.equal(vars['--uds-desktop-landing-gap'], DEFAULT_THEME.desktop.landingGap+'px')
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

// The component owner consumes tokens directly. An extra pilot override layer
// would recreate the competing cascade this migration removes.
const landingPath = 'components/landing-v3/premium.module.css'
const landingSource = readFileSync(landingPath, 'utf8')
assert.equal(existsSync('components/landing-v3/universal-pilot.module.css'), false, 'Remove the obsolete pilot override layer')
assert.ok(!readFileSync('app/page.tsx', 'utf8').includes('universal-pilot'), 'Landing must not import a second design owner')
for (const [path, sheet] of [['foundation', css], [landingPath, parse(landingSource)]] as const) {
  sheet.walkDecls(decl => assert.equal(Boolean(decl.important), false, `${path}: ${decl.prop} must use the scoped cascade rather than important`))
}
css.walkDecls(decl => assert.ok(!decl.value.includes('--ui-'), 'Shared foundation must use self-contained UDS values'))
assert.match(readFileSync('app/admin/design-system/FoundationPreview.tsx', 'utf8'), /<div\s+data-website-ui\s+data-universal-theme/, 'Shared specimen opts out of legacy application typography at its existing root')
// These document renderers must remain independent of website configuration.
// This checks architectural isolation; visual/PDF equivalence is tested separately.
for (const path of [
  'components/templates/engine.tsx', 'components/templates/GulfPremium.tsx',
  'components/templates/AtsClassic.tsx', 'components/templates/tokens.ts',
  'components/templates/themes.ts', 'components/templates/visualThemes.ts',
  'components/resume/ResumeDocumentView.tsx', 'lib/pdf/renderPackage.ts',
]) {
  assert.ok(!/--uds-|(?:lib|components)\/design-system/.test(readFileSync(path, 'utf8')), `${path}: document renderer must not consume website theme settings`)
}
console.log('PASS: one scoped component owner, no important or legacy UI dependencies in shared foundation, document renderer isolation')

const recovered = normalizeTheme({ fontFamily: 'georgia', buttonBackground: '#ff8800', mobile: { cardRadius: 28 } })
assert.equal(recovered.mobile.cardRadius, 28)
assert.equal(themeVariables(recovered)['--uds-button-background' as keyof ReturnType<typeof themeVariables>], '#FF8800')
assert.match(String(themeVariables(recovered)['--uds-font' as keyof ReturnType<typeof themeVariables>]), /^Georgia/)
assert.equal(normalizeTheme({ buttonBackground: 'red;display:none' }).buttonBackground, undefined)
assert.equal((themeVariables({ colors: { brand: '#AA00FF' } }) as Record<string,string>)['--uds-button-background'], '#AA00FF', 'Existing drafts follow brand')
