import './resolve-paths'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import * as React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { parse } from 'postcss'
import { Card } from '../components/ui/Card'
import { EmptyState } from '../components/ui/EmptyState'
import { Alert } from '../components/ui/Alert'
import { Button } from '../components/ui/Button'
import { NAV_ITEMS } from '../components/layout/navItems'
;(globalThis as unknown as {React: unknown}).React = React
const theme = parse(readFileSync('app/ui-system.css', 'utf8'))
const typography = parse(readFileSync('app/typography.css', 'utf8'))
const declared = new Set<string>()
const unresolved: string[] = []
for (const sheet of [theme, typography]) sheet.walkDecls(d => { if(d.prop.startsWith('--ui-')) declared.add(d.prop) })
for(const source of ['app/ui-system.css','app/typography.css','components/landing-premium/premium.module.css','components/landing-v3/premium.module.css']) {
  const sheet=parse(readFileSync(source,'utf8'))
  sheet.walkDecls(d=>{for(const match of d.value.matchAll(/var\((--ui-[\w-]+)/g)) { if(!declared.has(match[1])) unresolved.push(`${match[1]} in ${source}`) }})
}
assert.deepEqual(unresolved, [], "All theme consumers must resolve their variables")
// Compatibility rules must never recolor or resize authored resume descendants.
theme.walkRules(rule => {
  if(!rule.selector.startsWith('body .')) return
  if(!rule.nodes.some(node=>node.type==='decl' && ['font-size','font-family','color','background-color','border-color','border-radius','box-shadow'].includes(node.prop)))return
  for(const boundary of ['[data-document-preview]','#resume-render','.actual-template-orbit-face','.linkedin-profile-preview']) assert.ok(rule.selector.includes(boundary),`Missing document isolation: ${rule.selector}`)
})
const render=(element: React.ReactElement)=>renderToStaticMarkup(element)
const empty=render(React.createElement(EmptyState,{title:"No CVs yet",body:"Create your first CV.",action:React.createElement("a",{href:"/profile"},"Create my CV")}) )
assert.ok(empty.includes('href="/profile"') && !empty.includes('border-dashed'))
const info=render(React.createElement(Alert,{variant:"info"},"Review your details."))
assert.ok(info.includes('ui-alert-info') && !info.includes('bg-teal-soft'))
assert.ok(render(React.createElement(Alert,{variant:"danger"},"Save failed.")).includes('role="alert"'))
assert.ok(render(React.createElement(Button,{busy:true,busyLabel:"Saving"},"Save")).includes('disabled=""'))
assert.ok(render(React.createElement(Card,null,"Editable content")).includes('border-line'))
for(const item of NAV_ITEMS) assert.ok(theme.toString().includes(`.${item.iconClass} {`),`Navigation color missing: ${item.label}`)
console.log('PASS: resolved universal theme variables, protected document boundaries, useful containers, unboxed guidance, accessible states and navigation accents')
