import './resolve-paths'
import assert from 'node:assert/strict'
import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'

;(globalThis as unknown as { React: typeof React }).React = React

// Exercise the sample journey's selection transitions without a server,
// credentials, production data or AI calls.
require.extensions['.css'] = (module: NodeModule) => {
  module.exports = new Proxy({}, { get: (_, key) => String(key) })
}
const { JourneySimulation, JourneyDiagram } = require('../components/journey/JourneyExperience')
const originalState = React.useState
const originalId = React.useId
let values: unknown[] = []
let cursor = 0
React.useState = ((initial: unknown) => {
  const index = cursor++
  if (!(index in values)) values[index] = initial
  return [values[index], (next: unknown) => { values[index] = typeof next === 'function' ? next(values[index]) : next }]
}) as typeof React.useState
React.useId = () => 'sample-guide'
type Element = React.ReactElement<Record<string, any>>
let tree: Element
function render(component = JourneySimulation) {
  cursor = 0
  tree = component()
  return renderToStaticMarkup(tree)
}
function find(predicate: (element: Element) => boolean, element: React.ReactNode = tree): Element | undefined {
  if (!React.isValidElement(element)) return undefined
  const el = element as Element
  if (predicate(el)) return el
  for (const child of React.Children.toArray(el.props.children)) {
    const match = find(predicate, child)
    if (match) return match
  }
}
function choose(suffix: string, value: string) {
  const select = find(el => el.type === 'select' && el.props.id === `sample-guide-${suffix}`)
  assert.ok(select, `Missing ${suffix} selector`)
  select.props.onChange({ target: { value } })
  return render()
}
try {
  let html = render()
  assert.match(html, /Fictional sample data/)
  assert.match(html, /Maintenance Engineer/)
  assert.match(html, /Session 6.*Latest review/)
  assert.match(html, /Mock interview improvement cycle/)
  html = choose('service', 'qa')
  assert.match(html, /Gulf-standard Q&amp;A/)
  assert.ok(!html.includes('Mock interview improvement cycle'), 'Q&A must not have the mock improvement loop')
  html = choose('version', '3')
  assert.match(html, /Set 4/)
  assert.match(html, /Teamwork and handover/)
  html = choose('job', '0')
  assert.match(html, /3.1 · Instrument Engineer/)
  assert.match(html, /Set 1/)
  assert.ok(!html.includes('Set 4'), 'Job switches must reset the selected Q&A set')
  html = choose('service', 'letters')
  html = choose('version', '1')
  assert.match(html, /Sample cover letter · Version 2/)
  html = choose('job', '2')
  assert.match(html, /Sample cover letter · Version 1/)
  assert.match(html, /I am applying for the Commissioning Lead position/)
  html = choose('service', 'mock')
  assert.match(html, /Session 5.*Latest review/)
  html = choose('session', '0')
  assert.match(html, /Guided review · Session 1/)
  const repeat = find(el => el.type === 'button' && el.props.children === 'Simulate practise again')
  assert.ok(repeat)
  repeat.props.onClick()
  html = render()
  assert.match(html, /Guided review · Session 2/)
  assert.match(html, /Showing the next saved sample session/)
  values = []
  html = render(JourneyDiagram)
  assert.match(html, /Job title/)
  assert.match(html, /Job description/)
  assert.ok(!html.includes('Company') && !html.includes('Country'))
  assert.match(html, /Multiple versions/)
  assert.match(html, /Multiple sets/)
  assert.match(html, /Multiple sessions/)
  console.log('PASS sample journey: job isolation, version/set/session selection, mock-only improvement loop, repeat progression and exact job inputs')
} finally {
  React.useState = originalState
  React.useId = originalId
}
