import './resolve-paths'
import assert from 'node:assert/strict'
import * as React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { ScoreRing, BandPill, PartBars } from '../components/optimizer/MatchScore'
import { MatchResult, readMatchReport } from '../components/optimizer/MatchResult'
import { ResultsOverview } from '../components/package/ResultsOverview'
import { TargetJobCard } from '../components/package/TargetJobCard'
import { PreparationJourney } from '../components/package/PreparationJourney'
import { SuggestionsPanel } from '../components/optimizer/SuggestionsPanel'
import type { Package } from '../types/package'
import type { MatchReport, MatchScore } from '../lib/optimizer/types'
;(globalThis as unknown as {React:unknown}).React=React
const pending={total:null,assessment_status:'needs_date_clarification',parts:{keywords:{score:80,weight:55},summary:{score:70,weight:20},title:{score:60,weight:10},format:{score:100,weight:5},qualifications:{score:null,weight:10}},keywords:[]} as unknown as MatchScore
const known={...pending,total:80,assessment_status:'assessed'} as unknown as MatchScore
const report={report_version:1,before:pending,after:pending,max_total:null,target:{job_title:'Coordinator'},mode:'job_description',gaps:[],kept_original:[]} as unknown as MatchReport
assert.ok(readMatchReport(report),'pending reports remain readable rather than mistaken for unavailable reports')
const ring=renderToStaticMarkup(React.createElement(ScoreRing,{value:null as unknown as number,label:'After'}))
assert.ok(ring.includes('Pending clarification'));assert.ok(!ring.includes('<svg'),'pending duration must not become a zero-valued ring')
const band=renderToStaticMarkup(React.createElement(BandPill,{value:null as unknown as number}))
assert.ok(band.includes('Pending clarification'));assert.ok(!band.includes('Low'))
const bars=renderToStaticMarkup(React.createElement(PartBars,{score:pending,compare:known}))
assert.ok(bars.includes('Insufficient date precision'));assert.ok(bars.includes('80'),'assessable categories remain visible');assert.ok(!bars.includes('null%'));assert.ok(!bars.includes('NaN'))
const result=renderToStaticMarkup(React.createElement(MatchResult,{report,packageId:'synthetic-package',roleNames:{}}))
assert.ok(result.includes('Pending clarification'));assert.ok(result.includes('Insufficient date precision'));assert.ok(!result.includes('Estimated match potential'));assert.ok(!result.includes('+0 points'));assert.ok(!result.includes('null'))
const v2={...pending,v2:{breakdown:{quality:{score:80,points:20,max:25,applicable:true},presentation:{score:80,points:8,max:10,applicable:true},screening:{score:null,points:null,max:10,applicable:true},skills:{score:80,points:24,max:30,applicable:true},responsibilities:{score:80,points:16,max:20,applicable:true},supporting:{score:80,points:4,max:5,applicable:true}},screening:[],quality_checks:[],applicableMaximum:100,rawPoints:null}} as unknown as MatchScore
const v2Bars=renderToStaticMarkup(React.createElement(PartBars,{score:v2,compare:v2}));assert.ok(v2Bars.includes('Insufficient date precision'));assert.ok(v2Bars.includes('20/25'));assert.ok(!v2Bars.includes('null%'));assert.ok(!v2Bars.includes('NaN'));
const numericRing=renderToStaticMarkup(React.createElement(ScoreRing,{value:80,label:'After'}))
assert.ok(numericRing.includes('<svg'));assert.ok(numericRing.includes('80'));assert.ok(!numericRing.includes('Pending clarification'))
const pkg={id:'synthetic-package',name:'Coordinator',target_job_title:'Coordinator',target_country:null,target_company:null,target_industry:null,optimization_level:'easy',match_report:report,optimized_content:{experience_blocks:[],summary:'Synthetic summary'},skills_order:[],mock_interview_runs:[],created_at:'2026-11-17T12:00:00Z'} as unknown as Package
for(const component of [React.createElement(ResultsOverview,{pkg,document:null,onScored:()=>{}}),React.createElement(TargetJobCard,{pkg}),React.createElement(PreparationJourney,{pkg,current:'letter'})]){const html=renderToStaticMarkup(component);assert.ok(html.includes('Pending clarification'),'package summaries must disclose pending ATS');assert.ok(!html.includes('Estimated match potential'));assert.ok(!html.includes('score stays low'));assert.ok(!html.includes('NaN'));assert.ok(!html.includes('null%'))}
const suggested={...report,suggestions:[{id:'s1',status:'pending',block:'summary',requirement:'Coordination',text:'Synthetic truthful line'}]} as unknown as MatchReport
const suggestions=renderToStaticMarkup(React.createElement(SuggestionsPanel,{report:suggested,roleNames:{},onAction:async()=>{}}));assert.ok(suggestions.includes('Pending clarification'));assert.ok(!suggestions.includes('up to'));
console.log('PASS pending-score UI: null scores remain pending, known categories/numeric scores preserved, no zero rings/bands/gains/potential claims')
