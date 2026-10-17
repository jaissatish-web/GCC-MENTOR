import './resolve-paths'
import assert from 'node:assert/strict'
import * as React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { sortedWorkRoles, workDateLabel } from '../lib/profileWorkNavigation'
import { WorkExperienceItem } from '../components/profile/WorkExperienceItem'
import { ImportComparison } from '../components/profile/ImportComparison'
import { importJobIndex } from '../lib/resumeParse/reviewEditor'
import type { ImportChange } from '../lib/resumeParse/importReview'
;(globalThis as unknown as { React: unknown }).React = React
const roles = [
  {key:'old',role:'Engineer',company:'Earlier employer',start_date:'2012-01',end_date:'2014-06'},
  {key:'recent',role:'Lead Engineer',company:'Previous employer',start_date:'2020-01',end_date:'2024-06'},
  {key:'current',role:'Commissioning Engineer',company:'Current employer',start_date:'2024-07',end_date:''},
  {key:'new',role:'',company:'',start_date:'',end_date:''},
]
const snapshot=JSON.stringify(roles)
assert.deepEqual(sortedWorkRoles(roles).map(role=>role.key),['current','recent','old','new'])
assert.equal(JSON.stringify(roles),snapshot,'Display order must not change saved history or import field indexes')
assert.equal(workDateLabel('2024-07'),'Jul 2024')
assert.equal(workDateLabel('2024-13'),'2024-13','Invalid dates must not be invented')
const closed=renderToStaticMarkup(React.createElement(WorkExperienceItem,{role:roles[2],number:1,open:false,onToggle:()=>{},children:React.createElement('input',{'aria-label':'Role'})}))
assert.ok(closed.includes('Current employer') && closed.includes('Current role') && closed.includes('Jul 2024'))
assert.ok(closed.includes('aria-expanded="false"') && closed.includes('id="work-role-current" hidden=""'),'Closed roles must hide fields from keyboard and assistive technology')
const blank=renderToStaticMarkup(React.createElement(WorkExperienceItem,{role:roles[3],number:4,open:true,onToggle:()=>{},children:'Fields'}))
assert.ok(blank.includes('aria-expanded="true"') && !blank.includes('>Current role<'),'An incomplete new role must not claim current employment')
const change: ImportChange={id:'wording',field:'professional_summary',label:'Summary',kind:'wording',before:'Engineer with experiance in DCS.',after:'Engineer with experience in DCS.',reason:'Spelling',suggested:true,restorable:true}
const comparison=renderToStaticMarkup(React.createElement(ImportComparison,{change,applied:false}))
assert.ok(comparison.includes('<del') && comparison.includes('<mark') && comparison.includes('experiance') && comparison.includes('experience'))
assert.ok(comparison.includes('Removed text:') && comparison.includes('New text:') && !comparison.includes('Approved'),'Changes need text semantics as well as colour and cannot claim approval')
const unsafe=renderToStaticMarkup(React.createElement(ImportComparison,{change:{...change,before:'<script>original</script>',after:'<script>suggested</script>'},applied:false}))
assert.ok(!unsafe.includes('<script>') && unsafe.includes('&lt;'),'Comparison text must never become HTML')
const editor={professional_summary:'',skills:[],work_experience:roles.map(role=>({...role,description:'',highlights:''}))}
assert.equal(importJobIndex(editor,{...change,job:{company:'Current employer',role:'Commissioning Engineer',start_date:'2024-07'}}),2,'Review links must find the source role rather than its display position')
assert.equal(importJobIndex(editor,{...change,job:{company:'Deleted employer',role:'Engineer',start_date:'2012-01'}}),-1,'A missing role must not navigate to an unrelated entry')
console.log('PASS profile navigation: immutable newest-first display, current/blank role labels, accessible collapse, precise and escaped word differences, stable review anchors')
