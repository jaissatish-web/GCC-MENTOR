import './resolve-paths'
import assert from 'node:assert/strict'
import { editorDateFact, editorDatePayload, editorDateInvalid } from '../lib/profileEditorDates'
import { makeTemplateFixture } from './fixtures/templateFixture'
import { buildCareerProfileResume } from '../lib/careerProfileResume'
for (const value of ['2021','2021-01','2021-01-17']) {
 const fact=editorDateFact(value)
 assert.equal(fact.value,value)
 assert.equal(editorDatePayload('start_date',fact.value,fact.precision).start_date,value)
}
const legacy=editorDateFact('2021-11-17',null)
assert.equal(legacy.value,'2021-11-17','retain legacy bytes for unchanged save')
assert.deepEqual(editorDatePayload('start_date',legacy.value,legacy.precision),{start_date:'2021-11-17',start_date_precision:null})
assert.ok(editorDateInvalid('2021-02-29','day'))
assert.ok(!editorDateInvalid('2020-02-29','day'))
assert.ok(editorDateInvalid('2021-06-02','month'))
const profile=makeTemplateFixture().profile
profile.work_experience=[{...profile.work_experience[0],start_date:'2021-01-01',end_date:'2022-01-01',start_date_precision:'year',end_date_precision:'year'}]
assert.equal(buildCareerProfileResume(profile).experience[0].range,'2021 — 2022')
profile.work_experience=[{...profile.work_experience[0],start_date:'2021-11-17',end_date:'2022-02-01',start_date_precision:null,end_date_precision:null}]
assert.equal(buildCareerProfileResume(profile).experience[0].range,'2021 (date precision unverified) — 2022 (date precision unverified)')
console.log('PASS V4 editor/date document: lossless canonical and legacy values, invalid supplied values, truthful derived ranges')
import * as React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { WorkExperienceItem } from '../components/profile/WorkExperienceItem'
;(globalThis as unknown as {React:unknown}).React=React
const legacyCard=renderToStaticMarkup(React.createElement(WorkExperienceItem,{role:{key:'legacy',role:'Coordinator',company:'Synthetic',start_date:'2021-11-01',end_date:'2022-02-01',start_date_precision:null,end_date_precision:null},number:1,open:false,onToggle:()=>{},children:'Fields'}))
assert.ok(!legacyCard.includes('Nov 2021') && legacyCard.includes('precision unverified'),'closed card must not certify legacy month')
