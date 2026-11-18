import './resolve-paths'
import assert from 'node:assert/strict'
import * as React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
require.extensions['.css'] = (module: NodeModule) => { module.exports = {} }
const { ProfileReviewWorkspace } = require('../components/profile/review/ProfileReviewWorkspace') as typeof import('../components/profile/review/ProfileReviewWorkspace')
import { PrecisionDateField } from '../components/profile/review/PrecisionDateField'
import { RowActions } from '../components/profile/review/RowActions'
;(globalThis as unknown as {React:unknown}).React = React
const noop = () => {}
const html = renderToStaticMarkup(<ProfileReviewWorkspace sections={[{id:'identity',title:'Personal information'}]} onSectionChange={noop} unresolvedCount={2} onUnresolved={noop} confirmed={false} onConfirm={noop} onSave={noop} candidateName="Nina Sample"><input aria-label="Canonical name" defaultValue="Nina Sample" /></ProfileReviewWorkspace>)
assert.ok(html.includes('Review your Career Profile'))
assert.ok(html.includes('Canonical name'))
assert.ok(html.includes('2 details need checking'))
assert.equal((html.match(/type="checkbox"/g) ?? []).length,1,'one acknowledgement only')
assert.ok(html.includes('Save Career Profile'))
assert.ok(!html.includes('Next section'))
const legacy=renderToStaticMarkup(<PrecisionDateField id="legacy" label="Start" value="2021-06-17" precision={null} onChange={noop} />)
assert.ok(legacy.includes('value="2021"'))
assert.ok(legacy.includes('Date precision unverified'))
assert.ok(legacy.includes('Use year only'),'legacy confirmation requires an explicit action')
assert.ok(!legacy.includes('value="2021-06-17"'))
const day=renderToStaticMarkup(<PrecisionDateField id="day" label="Issued" value="2021-06-17" precision="day" onChange={noop} />)
assert.ok(day.includes('value="2021-06-17"'))
const invalid=renderToStaticMarkup(<PrecisionDateField id="invalid" label="Start" value="2021-02-31" onChange={noop} />)
assert.ok(invalid.includes('value="2021-02-31"'))
assert.ok(invalid.includes('aria-invalid="true"'))
const rows=renderToStaticMarkup(<RowActions name="Operations Coordinator" index={0} count={2} onMove={noop} onRemove={noop} />)
assert.ok(rows.includes('Move Operations Coordinator down'))
assert.ok(rows.includes('Remove Operations Coordinator'))
console.log('PASS V4 canonical shell, single acknowledgement, explicit precision, invalid retention and named row actions')
