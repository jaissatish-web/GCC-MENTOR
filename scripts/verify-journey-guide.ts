import './resolve-paths'
import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'
import { parse } from 'postcss'
import { NAV_ITEMS, NAV_GROUPS, navHref } from '../components/layout/navItems'
import { GUIDE_SERVICES } from '../components/journey/guide'

for (const item of NAV_ITEMS) {
  const guide = GUIDE_SERVICES[item.href]
  assert.ok(guide?.purpose && guide.outputs && guide.uses, `${item.label} needs an explanation, outputs and inputs`)
  assert.equal(NAV_GROUPS.flatMap(group => group.hrefs).filter(href => href === item.href).length, 1, `${item.label} appears once in the navigation tree`)
  assert.ok(existsSync(`app${navHref(item)}/page.tsx`), `${item.label} must link to a real page`)
}
assert.equal(navHref(NAV_ITEMS.find(item => item.href === '/optimize')!), '/optimize/target')
const declared = new Set<string>()
parse(readFileSync('app/ui-system.css', 'utf8') + readFileSync('app/typography.css', 'utf8') + readFileSync('app/responsive.css', 'utf8')).walkDecls(decl => { if (decl.prop.startsWith('--ui-')) declared.add(decl.prop) })
const css = parse(readFileSync('components/journey/how-it-works.module.css', 'utf8'))
css.walkDecls(decl => { for (const match of decl.value.matchAll(/var\((--ui-[\w-]+)/g)) assert.ok(declared.has(match[1]), `Missing brand token ${match[1]}`) })
assert.ok(css.toString().includes('prefers-reduced-motion:reduce'))
assert.ok(css.toString().includes('animation-play-state:paused'))
console.log('PASS journey guide: all services explained, real navigation destinations, resolved brand tokens and motion controls')
