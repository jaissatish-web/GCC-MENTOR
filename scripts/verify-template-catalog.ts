import './resolve-paths'
import assert from 'node:assert/strict'
import { templateCatalog } from '../lib/templateCatalog'
import { availableTemplates, TEMPLATE_FIELDS } from '../lib/templates'

const source = JSON.stringify(availableTemplates().map(t => ({ id: t.id, fields: t.fields })))
const all = templateCatalog()
assert.equal(all.length, availableTemplates().length)
assert.equal(new Set(all.map(t => t.id)).size, all.length)
assert.equal(all[0].id, 'gulf_premium')
assert.ok(templateCatalog({ purpose: 'recommended' }).length > 0)
assert.ok(templateCatalog({ purpose: 'ats' }).every(t => !t.allowsPhoto && (!t.theme || t.theme.layout === 'single')))
assert.ok(templateCatalog({ purpose: 'photo' }).every(t => t.allowsPhoto))
assert.ok(templateCatalog({ purpose: 'senior' }).every(t => ['senior', 'executive'].includes(t.category)))
assert.ok(templateCatalog({ purpose: 'entry' }).every(t => t.category === 'entry'))
for (const field of TEMPLATE_FIELDS) {
  const entries = templateCatalog({ field: field.key })
  assert.ok(entries.length > 0, field.label)
  assert.ok(entries.every(t => t.fields.includes(field.key)))
}
assert.deepEqual(templateCatalog({ search: '  ATS PROFESSIONAL ' }).map(t => t.id), ['ats_professional'])
assert.equal(templateCatalog({ search: 'nonexistent-template-query' }).length, 0)
assert.equal(JSON.stringify(availableTemplates().map(t => ({ id: t.id, fields: t.fields }))), source)
console.log('PASS: all designs retained, recommended order, combined search/profession/style filters and source identity preserved')
