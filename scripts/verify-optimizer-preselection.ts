import './resolve-paths'
import assert from 'node:assert/strict'
import { dutySuggestions, requirementId, selectedAnalysis, recommendedLevel } from '../lib/optimizer/v3/preselection'
import type { AnalysisV3, Requirement } from '../lib/optimizer/v3/engine'
const duty = (term: string, location: string, importance: 'must' | 'nice' = 'must'): Requirement => ({term, location, importance, quote: 'Related source duty', kind: 'responsibility', group: 'B'})
const a: AnalysisV3 = { fieldMatch: 'same', candidateField: 'Engineering', jobField: 'Engineering', requirements: [duty('handover','a'), duty('planning','b','nice'), {...duty('PMP','a'), group: 'C', kind: 'certification'}, duty('teamwork','summary')], ms:0, inputTokens:0,outputTokens:0 }
const offered = dutySuggestions(a,['a','b'])
assert.equal(offered.length,2)
assert.deepEqual(offered[0].levels,['moderate','high'])
assert.deepEqual(offered[1].levels,['high'])
assert.equal(dutySuggestions({...a,fieldMatch:'different'},['a','b']).length,0)
const blocks={summary:true, experienceIds:['a'], skills:false, confirmedRequirements:[requirementId(a.requirements[0]), requirementId(a.requirements[1]), 'forged']}
assert.deepEqual(selectedAnalysis(a,blocks,'high').requirements.map(r=>r.group),['B','C','C','C'])
assert.ok(selectedAnalysis(a,{...blocks, experienceIds:['b']},'moderate').requirements.every(r=>r.group!=='B'))
assert.ok(selectedAnalysis(a,{...blocks,confirmedRequirements:[]},'high').requirements.every(r=>r.group!=='B'))
assert.ok(selectedAnalysis(a,blocks,'easy').requirements.every(r=>r.group!=='B'))
assert.equal(selectedAnalysis(a,{summary:true,experienceIds:['a']},'high'),a,'legacy keeps pending suggestion analysis')
assert.notEqual(requirementId(a.requirements[0]),requirementId({...a.requirements[0],quote:'Updated evidence'}))
assert.equal(recommendedLevel(50,{easy:60,moderate:80,high:90}),'easy')
assert.equal(recommendedLevel(50,{easy:55,moderate:75,high:90}),'moderate')
assert.equal(recommendedLevel(50,{easy:55,moderate:70,high:80}),'high')
assert.equal(recommendedLevel(20,{easy:25,moderate:30,high:40}),'moderate')
assert.equal(recommendedLevel(85,{easy:90,moderate:95,high:98}),'easy')
console.log('PASS optimizer preselection: owner, level, evidence, forged/empty approvals, legacy and recommendations')

// Mock only the writer boundary: the real build, document assembly and score run.
import { makeTemplateFixture } from './fixtures/templateFixture'
import { buildV3 } from '../lib/optimizer/v3/service'
import { scoreDocumentFromResume, scoreResume } from '../lib/optimizer/score'
const engine = require('../lib/optimizer/v3/engine') as typeof import('../lib/optimizer/v3/engine')
const originalWriter = engine.writeV3
async function verifyBuild() {
  const {profile} = makeTemplateFixture()
  const owner = profile.work_experience[0].id
  const other = profile.work_experience[1].id
  const requirement = duty('handover documentation',owner)
  const analysis = {...a,requirements:[requirement]}
  let received: AnalysisV3 | null = null
  engine.writeV3 = async (_p, _title, _jd, checked, level) => {
    received = checked
    return {level, summary:'Changed summary.',summaryKeptOriginal:false,summaryAdded:[],
      jobs:profile.work_experience.map(e=>({id:e.id,keptOriginal:false,droppedNew:[],bullets:[
        {text:`Reworded facts for ${e.id}`,isNew:false},
        {text:'Prepared handover documentation for operations.',isNew:true},
      ]})),skillsOrder:profile.skills.map(s=>s.name).reverse(),ms:0,inputTokens:0,outputTokens:0,caught:[]}
  }
  const run = async (selectedBlocks: import('../lib/ai/buildOptimizationPrompt').SelectedBlocks) => {
    const r = await buildV3({profile,target:{target_job_title:'Commissioning Engineer',target_industry:null,target_country:null},level:'moderate',selectedBlocks,jobDescription:'handover documentation',analysis,analysisId:null,autoApply:false,route:'test'})
    assert.ok(r.ok)
    if (!r.ok) throw Error('Build failed')
    assert.equal(r.report.after?.total,scoreResume(scoreDocumentFromResume(r.documentSnapshot),r.report.target,r.report.qualifications??null).total,'after score measures actual output')
    return r
  }
  const choices={summary:false,experienceIds:[owner],skills:false,confirmedRequirements:[requirementId(requirement)]}
  const approved = await run(choices)
  assert.equal(approved.report.suggestions?.length,1,'only approved company receives the duty')
  assert.equal(approved.report.suggestions?.[0].status,'confirmed')
  assert.equal(approved.report.auto_applied,true)
  assert.ok(approved.documentSnapshot.experience.find(e=>e.entry.id===owner)?.bullets.some(b=>b.includes('handover documentation')))
  assert.ok(approved.optimizedContent.experience_blocks.find(b=>b.profile_experience_id===owner)?.generated_bullets?.some(b=>b.includes('handover documentation')),'confirmed points mirrored to durable content')
  assert.equal(approved.documentSnapshot.summary,profile.professional_summary)
  assert.deepEqual(approved.skillsOrder,[...profile.skills].sort((x,y)=>x.sort_order-y.sort_order).map(s=>s.id))
  assert.equal(approved.optimizedContent.skills_reordered,false)
  assert.equal(approved.optimizedContent.experience_blocks.find(b=>b.profile_experience_id===other)?.generated_bullets,null)
  assert.deepEqual(approved.documentSnapshot.education.map(e=>e.entry),profile.education)
  const empty=await run({...choices,confirmedRequirements:[]})
  assert.equal(empty.report.suggestions?.length,0)
  assert.ok(received && (received as AnalysisV3).requirements.every(r=>r.group!=='B'))
  const forged=await run({...choices,confirmedRequirements:['forged']})
  assert.equal(forged.report.suggestions?.length,0)
  const legacy=await run({summary:true,experienceIds:[owner]})
  assert.equal(legacy.report.suggestions?.[0].status,'pending')
  assert.equal(legacy.report.auto_applied,false)
  assert.ok(!legacy.documentSnapshot.experience.find(e=>e.entry.id===owner)?.bullets.some(b=>b.includes('handover documentation')))
  const removedOwner=await run({...choices,experienceIds:[]})
  assert.equal(removedOwner.report.suggestions?.length,0)
  const corrupted={...analysis,requirements:[{...requirement,kind:'certification'}]}
  assert.equal(dutySuggestions(corrupted,[owner]).length,0)
  assert.equal(selectedAnalysis(corrupted,choices,'moderate').requirements[0].group,'C')
  console.log('PASS mocked build: preapproved content/owner/sections/skills, actual scoring, empty/forged/legacy choices')
}
verifyBuild().catch(e=>{console.error(e);process.exitCode=1}).finally(()=>{engine.writeV3=originalWriter})
