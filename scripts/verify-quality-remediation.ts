/** Regression for approved audit fixes. Synthetic profiles; mocked AI transport, no live APIs. */
import './resolve-paths'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { writeV3, analyzeV3, type AnalysisV3 } from '../lib/optimizer/v3/engine'
import { parseClaimReview, CV_REVIEW_SYSTEM } from '../lib/optimizer/v3/claimReview'
import { cvMeaningIssues, positiveStatements } from '../lib/optimizer/v3/claimChecks'
import { outputLanguageIssue } from '../lib/professionalProfiles/outputLanguage'
import { employmentStatusContext } from '../lib/employmentStatus'
import { splitPhone, joinPhone, ALL_DIAL_CODES } from '../lib/phone'
import type { CareerProfileFull } from '../types/careerProfile'
import type { LinkedInOutput } from '../lib/linkedin/types'
const provider = require('../lib/ai/provider') as { generate: (input: any) => Promise<any> }
const originalGenerate = provider.generate
const cases = JSON.parse(readFileSync('scripts/fixtures/qualityProfessions.json','utf8')) as Array<{profession:string;profile:CareerProfileFull}>
let scenarios=0
const reply = (value: unknown) => ({text:JSON.stringify(value),truncated:false,inputTokens:1,outputTokens:1})
async function main() {
 try {
  for (const c of cases) for (const level of ['easy','moderate','high'] as const) {
   const p=c.profile, id=p.work_experience[0].id
   const a:AnalysisV3={jobField:c.profession,candidateField:c.profession,fieldMatch:'same',requirements:[],ms:0,inputTokens:0,outputTokens:0}
   // Even an incorrectly approving reviewer cannot override deterministic denial/authority checks.
   provider.generate=async call=>call.system===CV_REVIEW_SYSTEM ? reply({unsupported:[]}) : reply({summary:`${c.profession} who delivered documented cost savings.`,jobs:[{id:'job-1',bullets:[{text:'Led operations and delivered documented cost savings.',new:false}]}],skills_order:p.skills.map(s=>s.name)})
   const result=await writeV3(p,c.profession,'A synthetic target role',a,level)
   assert.equal(result.summary,p.professional_summary,`${c.profession}/${level}: keep source summary`)
   assert.equal(result.summaryKeptOriginal,true)
   assert.equal(result.jobs[0].keptOriginal,true)
   assert.deepEqual(result.jobs[0].bullets.filter(b=>!b.isNew).map(b=>b.text),p.work_experience[0].highlights)
   assert(result.caught.some(x=>x.startsWith('unsupported_claim@')))
   scenarios++
  }
  const p=cases[0].profile, id=p.work_experience[0].id
  const a:AnalysisV3={jobField:'instrumentation',candidateField:'instrumentation',fieldMatch:'same',requirements:[{term:'handover documentation',kind:'responsibility',importance:'must',group:'B',location:id,quote:p.work_experience[0].highlights![0]}],ms:0,inputTokens:0,outputTokens:0}
  provider.generate=async call=>call.system===CV_REVIEW_SYSTEM ? reply({unsupported:[]}) : reply({summary:p.professional_summary,jobs:[{id:'job-1',bullets:[...p.work_experience[0].highlights!.map(text=>({text,new:false})),{text:'Prepared handover documentation for field activities.',new:true}]}],skills_order:p.skills.map(s=>s.name)})
  const pending=await writeV3(p,'Instrumentation Engineer','Handover documentation',a,'moderate')
  assert(pending.jobs[0].bullets.some(b=>b.isNew),'New duty stays distinct from rewritten facts')
  provider.generate=async call=>call.system===CV_REVIEW_SYSTEM ? reply({unsupported:[{owner:id,reason:'unsupported new technique'}]}) : reply({summary:p.professional_summary,jobs:[{id:'job-1',bullets:[{text:'Performed an unsupported technique.',new:false}]}],skills_order:[]})
  assert.equal((await writeV3(p,'Engineer',null,a,'easy')).jobs[0].keptOriginal,true)
  provider.generate=async call=>call.system===CV_REVIEW_SYSTEM ? reply({}) : reply({summary:p.professional_summary,jobs:[{id:'job-1',bullets:[{text:p.work_experience[0].highlights![0],new:false}]}],skills_order:[]})
  assert.equal((await writeV3(p,'Engineer',null,a,'easy')).summaryKeptOriginal,true,'Malformed reviewer cannot publish unchecked output')
  assert.equal(parseClaimReview({unsupported:[{owner:'foreign-job',reason:'x'}]},['summary',id]),null)
  // Denied qualifications must not be promoted by an exact phrase/quote match.
  provider.generate=async()=>reply({job_field:'engineering',candidate_field:'engineering',field_match:'same',requirements:[{term:'SCE registration',kind:'certification',importance:'must',group:'A',job:'summary',quote:'No SCE registration.'}]})
  const denied={...p,professional_summary:'Engineer. No SCE registration.',certifications:[]} as CareerProfileFull
  const analysed=await analyzeV3(denied,'Engineer','SCE registration required')
  assert.equal(analysed.requirements[0].group,'C')
  assert.deepEqual(cvMeaningIssues('Conducted maintenance. No documented cost savings.','Led maintenance and delivered cost savings.'),['promoted_involvement','unsupported_savings'])
  assert.equal(positiveStatements('Performed no-load testing. No PMP certification.'),'Performed no-load testing.')
  const english:LinkedInOutput={headlines:['Engineer','Engineer','Engineer'],about:'I performed maintenance and recorded inspection results.',experience:[{id,description:'Performed field maintenance and recorded inspection results.'}],skills:[],advice:['Review your actual experience.','Check your profile details.','Keep your information current.']}
  assert(outputLanguageIssue(english,'Arabic'))
  assert.equal(outputLanguageIssue(english,'English'),null)
  const arabic={...english,about:'عملت في صيانة المعدات وإعداد التقارير الفنية الخاصة بالمشروع.',experience:[{id,description:'قمت بصيانة المعدات ومراجعة نتائج الفحص الفني.'}],advice:['راجع خبراتك الفعلية في ملفك المهني.','تحقق من بياناتك قبل نشرها.','حدث المعلومات عند حدوث تغيير.']}
  assert.equal(outputLanguageIssue(arabic,'Arabic'),null)
  assert(outputLanguageIssue(arabic,'English'))
  assert(employmentStatusContext(p).includes('ENDED 2026-01'))
  assert(employmentStatusContext({...p,work_experience:[{...p.work_experience[0],end_date:null}]}).includes('CURRENT ROLE'))
  // Simulate the actual draft-state entry path for every supported dial code.
  for(const code of ALL_DIAL_CODES){let draftDial=code.dial;let stored='';const parts=splitPhone(stored);const dial=parts.dial||(!parts.number?draftDial:'');stored=joinPhone(dial,'2025550142');assert.equal(splitPhone(stored).dial,code.dial);stored=joinPhone(dial,'');assert.equal(stored,'');assert.equal(draftDial,code.dial)}
  const service=readFileSync('lib/optimizer/v3/service.ts','utf8')
  assert(service.includes("status: 'pending'"));assert(!service.includes("status: opts.autoApply"));assert(service.includes('const generated = rewritten'))
  const preview=readFileSync('app/optimize/preview/[packageId]/page.tsx','utf8')
  assert(preview.includes('keep: false, text: s.text'));assert(preview.includes('const needsConfirm = kept.length > 0'))
  console.log(`PASS: ${scenarios} adversarial CV scenarios (50 professions × 3 levels), reviewer fallback, denied qualification, language, employment, dial-code entry, and per-application confirmation.`)
 } finally {provider.generate=originalGenerate}
}
main().catch(e=>{console.error(e);process.exit(1)})
