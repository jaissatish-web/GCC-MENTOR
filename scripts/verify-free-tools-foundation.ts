import assert from 'node:assert/strict'
import fs from 'node:fs'
import {TOOLS,ACTIVE_IDS} from '../lib/free-tools/registry'
import {number,dateValue,integer} from '../lib/free-tools/validation'
assert.equal(TOOLS.length,50);assert.equal(new Set(TOOLS.map(t=>t.slug)).size,50)
assert.deepEqual(TOOLS.map(t=>t.id),Array.from({length:50},(_,i)=>i+1))
for(const value of ['', '-1','NaN','Infinity','1000000000001'])assert.throws(()=>number({amount:value},'amount'))
assert.equal(number({amount:'0'},'amount'),0);assert.equal(number({amount:'1.25'},'amount'),1.25)
assert.throws(()=>integer({n:'1.5'},'n'));assert.throws(()=>dateValue('2026-02-30'));assert.throws(()=>dateValue('2026-02-29'));assert.ok(dateValue('2024-02-29'))
const mw=fs.readFileSync('middleware.ts','utf8');assert.ok(!mw.includes("'/tools"),'Tools stay public without modifying auth')
const nav=fs.readFileSync('components/layout/navItems.ts','utf8');assert.ok(nav.includes("href: '/tools'"));assert.ok(nav.includes("hrefs: ['/tools']"))
for(const id of ACTIVE_IDS)assert.ok(TOOLS.some(t=>t.id===id))
console.log('PASS free-tools registry, validation, public route and navigation contracts')
