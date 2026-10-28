import './resolve-paths'
import assert from 'node:assert/strict'
import { scoreResume, type ScoreDocument } from '../lib/optimizer/score'
import { scoreDocumentSignature, uniqueScoredRequirements } from '../lib/optimizer/scoreV2'
import type { JobTargetProfile, TargetKeyword } from '../lib/optimizer/types'

const keyword = (term: string, kind: TargetKeyword['kind'], importance: 'must' | 'nice' = 'must', aliases: string[] = []): TargetKeyword => ({term,kind,importance,aliases})
const doc: ScoreDocument = {
  headline:'Target Instrument Engineer',
  summary:'Instrument Engineer working on gas plant control systems and field maintenance. Supports commissioning, loop checking, instrument calibration and safe handover, coordinating technical records with operations teams throughout project delivery.',
  experience:[{entryId:'e1',role:'Instrument Engineer',bullets:['Performed DCS commissioning and loop checking for gas plant instruments.','Prepared handover documentation and coordinated safety reviews with operations.']}],
  skills:['DCS','Loop checking'],education:['Bachelor of Technology in Electronics Engineering'],certifications:['PMP certification'],additional:[],hasEmail:true,hasPhone:true,
}
const target: JobTargetProfile = {version:1,mode:'job_description',job_title:'Instrument Engineer',title_variants:[],seniority:null,structured:null,scoring_version:'match-v2',
  keywords:[keyword('DCS','tool','must',['Distributed Control System']),keyword('loop checking','skill'),keyword('handover documentation','responsibility'),keyword('gas plant','domain'),keyword('Bachelor of Technology','education'),keyword('PMP','certification')],
  screening_requirements:[{term:'Bachelor of Technology',kind:'education',importance:'must',status:'met'},{term:'PMP',kind:'certification',importance:'must',status:'met'}],
}
const base = scoreResume(doc,target,100)
assert.equal(base.scoring_version,'match-v2')
assert.equal(base.v2?.breakdown.quality.max,25)
assert.equal(base.v2?.breakdown.skills.weight,30)
assert.equal(base.v2?.breakdown.responsibilities.weight,20)
assert.equal(base.v2?.breakdown.supporting.weight,5)
assert.equal(base.v2?.breakdown.screening.weight,10)
assert.equal(base.v2?.breakdown.presentation.weight,10)
assert.equal(base.v2?.applicableMaximum,100)
assert.equal(base.keywords.length,4,'fixed screening facts do not also earn keyword credit')
assert.equal(base.v2?.breakdown.quality.points,14,'unverified grammar/export do not earn points')
assert.deepEqual(base.v2?.quality_checks.filter(c=>c.status==='pending').map(c=>c.id),['export_readability','grammar'])
const signature=scoreDocumentSignature(doc)
const checked={...target,quality_reviews:{[signature]:{grammar:'passed' as const,exportReadability:'passed' as const}}}
const full=scoreResume(doc,checked,100)
assert.equal(full.v2?.breakdown.quality.points,25)
assert.equal(full.total,100)
assert.equal(full.v2?.quality_checks.find(c=>c.id==='export_readability')?.label,'Word export readability (PDF not checked)')
const issueTarget={...target,quality_reviews:{[signature]:{grammar:'issues' as const,grammarIssues:[{excerpt:'Instrument Engineer',reason:'Review the sentence wording.'}]}}}
assert.deepEqual(scoreResume(doc,issueTarget,100).v2?.quality_checks.find(c=>c.id==='grammar')?.details,['Instrument Engineer — Review the sentence wording.'])
assert.equal(scoreResume(doc,issueTarget,100).v2?.quality_checks.find(c=>c.id==='grammar')?.points,0)
assert.equal(scoreResume(doc,checked,0).total,full.total,'v2 uses individual screening evidence, not legacy qualification average')
assert.equal(scoreResume({...doc,headline:'Copied unrelated target title'},target,100).total,base.total,'a copied target headline earns no bonus')
const edited={...doc,summary:doc.summary+' Newly edited wording.'}
assert.notEqual(scoreDocumentSignature(edited),signature)
assert.equal(scoreResume(edited,checked,100).v2?.quality_checks.find(c=>c.id==='grammar')?.status,'pending','old grammar review cannot verify edited wording')
const duplicate={...target,keywords:[...target.keywords,keyword('dcs','responsibility','nice'),keyword('Distributed Control System','skill')]}
assert.equal(uniqueScoredRequirements(duplicate.keywords).length,6)
assert.equal(scoreResume(doc,duplicate,100).total,base.total,'duplicate/alias requirement cannot earn points twice')
const repeated={...doc,skills:[...doc.skills,'DCS','DCS','DCS']}
assert.equal(scoreResume(repeated,target,100).v2?.breakdown.skills.points,base.v2?.breakdown.skills.points,'keyword repetition has no reward')
const aliasDoc={...doc,skills:['distributed control system','LOOP CHECKING'],experience:doc.experience.map(e=>({...e,bullets:e.bullets.map(b=>b.replace('DCS','distributed control system'))}))}
assert.equal(scoreResume(aliasDoc,target,100).v2?.breakdown.skills.points,30,'verified aliases and case match')
const missingDoc={...doc,skills:[],summary:'Instrument Engineer with project experience.',experience:[{...doc.experience[0],bullets:['Supported project work and coordinated daily technical records.']}]}
const missing=scoreResume(missingDoc,target,100)
assert.equal(missing.v2?.breakdown.skills.points,0)
assert.equal(missing.v2?.breakdown.responsibilities.points,0)
assert.ok(base.total>missing.total)
const skillOnly={...missingDoc,skills:['DCS','Loop checking']}
assert.equal(scoreResume(skillOnly,target,100).v2?.breakdown.skills.points,30,'confirmed skills-only selections need not invent a company responsibility')
const listedDuty={...missingDoc,skills:['handover documentation']}
assert.equal(scoreResume(listedDuty,target,100).v2?.breakdown.responsibilities.points,5,'a bare duty list gets only partial responsibility credit')
const musts={...target,keywords:[keyword('DCS','tool'),keyword('SAP','tool','nice')]}
const mustCovered=scoreResume({...missingDoc,skills:['DCS']},musts,100)
const niceCovered=scoreResume({...missingDoc,skills:['SAP']},musts,100)
assert.equal(mustCovered.v2?.breakdown.skills.points,22.5)
assert.equal(niceCovered.v2?.breakdown.skills.points,7.5)
const blocker={...target,screening_requirements:[{term:'PMP',kind:'certification',importance:'must' as const,status:'unmet' as const}]}
assert.equal(scoreResume(doc,blocker,100).v2?.mandatoryGaps,1,'mandatory gap stays visible even in strong text')
const unknown={...blocker,screening_requirements:[{...blocker.screening_requirements[0],status:'unknown' as const}]}
assert.equal(scoreResume({...doc,certifications:[]},unknown,100).v2?.mandatoryUnknown,1)
assert.equal(scoreResume(doc,unknown,100).v2?.screening[0].status,'met','explicit final credential can resolve previously unknown qualification')
assert.equal(scoreResume({...doc,certifications:['No PMP certification.']},target,100).v2?.screening.find(r=>r.kind==='certification')?.status,'unknown')
assert.equal(scoreResume({...doc,certifications:[],summary:doc.summary+' Holds PMP.'},unknown,100).v2?.mandatoryUnknown,1,'summary alone cannot resolve a credential')
assert.equal(scoreResume({...doc,education:['B.Tech in Electronics Engineering']},target,100).v2?.screening.find(r=>r.kind==='education')?.status,'met','degree abbreviations normalize')
const hiddenDegree={...doc,education:[]}
assert.equal(scoreResume(hiddenDegree,target,100).v2?.screening.find(r=>r.kind==='education')?.status,'unknown','hidden qualification is not shown as screening met')
const noCategories={...target,keywords:[],screening_requirements:[]}
const nc=scoreResume(doc,noCategories,100)
assert.equal(nc.v2?.applicableMaximum,35)
assert.equal(nc.v2?.breakdown.skills.applicable,false)
assert.equal(nc.v2?.breakdown.skills.points,0)
assert.equal(nc.total,Math.round((nc.v2!.rawPoints/35)*100),'absent categories redistribute transparently instead of gifting nominal points')
const negativeTarget={...target,keywords:[keyword('SAP PM','tool'),keyword('handover documentation','responsibility')],screening_requirements:[]}
const denied={...doc,summary:'No SAP PM experience. I did not perform handover documentation.',skills:['No SAP PM experience'],additional:['Never performed handover documentation.'],experience:[{entryId:'e1',role:'Not an Instrument Engineer',bullets:['Did not perform handover documentation.','No SAP PM experience.']}]}
const deniedScore=scoreResume(denied,negativeTarget,100)
assert.ok(deniedScore.keywords.every(k=>k.credit===0),'denied claims in summary, bullets, skills and additional info earn no coverage')
assert.equal(deniedScore.v2?.breakdown.presentation.points,0,'denied role and summary cannot establish role presentation')
const affirmed={...denied,skills:['SAP PM'],experience:[{entryId:'e1',role:'Instrument Engineer',bullets:['Prepared handover documentation for the operations team.']}]}
assert.ok(scoreResume(affirmed,negativeTarget,100).keywords.every(k=>k.credit===1),'real affirmative skill and responsibility receive coverage')
const noLoadTarget={...target,keywords:[keyword('no-load testing','skill')],screening_requirements:[]}
assert.equal(scoreResume({...doc,summary:'',skills:['no-load testing'],experience:[]},noLoadTarget,100).keywords[0].credit,1,'technical no-load testing is not a denied claim')
const legacy={...target,scoring_version:undefined}
const legacyResult=scoreResume(doc,legacy,100)
assert.equal(legacyResult.scoring_version,'match-v1')
assert.equal(legacyResult.v2,undefined)
assert.deepEqual(legacyResult,scoreResume(doc,{...legacy,scoring_version:'match-v1'},100))
assert.deepEqual(scoreResume(doc,target,100),base,'pure repeatable nonmutating output')
console.log('PASS match-v2 scoring: weighted buckets, evidence-bound quality, screening blockers, deduplication, aliases, skills-only confirmations, no keyword/title inflation, absent-category arithmetic and historical compatibility')
