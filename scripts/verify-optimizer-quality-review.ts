import './resolve-paths'
import assert from 'node:assert/strict'
import { makeTemplateFixture } from './fixtures/templateFixture'
import { buildResumeDocument } from '../lib/resumeDocument'
import { reviewScoreQuality } from '../lib/optimizer/qualityReview'
import { scoreDocumentFromResume, scoreResume } from '../lib/optimizer/score'
import { scoreDocumentSignature } from '../lib/optimizer/scoreV2'
import type { JobTargetProfile } from '../lib/optimizer/types'
const provider = require('../lib/ai/provider') as typeof import('../lib/ai/provider')
const original = provider.generate
const fixture = makeTemplateFixture()
const doc = buildResumeDocument({ ...fixture })
const target: JobTargetProfile = { version: 1, scoring_version: 'match-v2', mode: 'job_description', job_title: 'Commissioning Engineer', title_variants: [], seniority: null, keywords: [], structured: null }
const key = scoreDocumentSignature(scoreDocumentFromResume(doc))
async function main() {
 let calls=0
 provider.generate = async args => { calls++; const rows=JSON.parse(args.user); assert.equal(rows.length,1,'identical documents share one review'); assert.ok(!args.user.includes('ravi.sharma@example.com'),'no contact text submitted'); return {text:JSON.stringify({documents:rows.map((r:{id:string})=>({id:r.id,grammar:'passed'}))}),truncated:false} as Awaited<ReturnType<typeof provider.generate>> }
 const reviewed = await reviewScoreQuality([doc,doc],target,'test')
 assert.equal(calls,1)
 assert.equal(reviewed.quality_reviews?.[key].grammar,'passed')
 assert.equal(reviewed.quality_reviews?.[key].exportReadability,'passed','real DOCX renderer output survives real parser')
 assert.equal(target.quality_reviews,undefined,'target not mutated')
 await reviewScoreQuality([doc],reviewed,'test');assert.equal(calls,1,'reuse verified exact version')
 const changed={...doc,summary:doc.summary+' Additional candidate wording.'}
 const changedScore=scoreResume(scoreDocumentFromResume(changed),reviewed,null)
 assert.equal(changedScore.v2?.quality_checks.find(c=>c.id==='grammar')?.status,'pending')
 provider.generate = async ()=>({text:JSON.stringify({documents:[{id:key,grammar:'passed'},{id:key,grammar:'issues'}]}),truncated:false} as Awaited<ReturnType<typeof provider.generate>>)
 assert.equal((await reviewScoreQuality([doc],target,'test')).quality_reviews?.[key].grammar,'unavailable','contradictory response fails closed')
 const excerpt=doc.summary.slice(0,35)
 provider.generate = async ()=>({text:JSON.stringify({documents:[{id:key,grammar:'issues',grammarIssues:[{excerpt,reason:'Review this phrase.'},{excerpt:'INVENTED TEXT NOT IN RESUME',reason:'Invalid'}]}]}),truncated:false} as Awaited<ReturnType<typeof provider.generate>>)
 const issues=await reviewScoreQuality([doc],target,'test')
 assert.equal(issues.quality_reviews?.[key].grammar,'issues')
 assert.equal(issues.quality_reviews?.[key].grammarIssues?.length,1,'only exact source excerpts shown')
 assert.ok(scoreResume(scoreDocumentFromResume(doc),issues,null).v2?.quality_checks.find(c=>c.id==='grammar')?.details?.[0].includes(excerpt))
 provider.generate = async ()=>{throw Error('Unavailable')}
 assert.equal((await reviewScoreQuality([doc],target,'test')).quality_reviews?.[key].grammar,'unavailable')
 provider.generate = async ()=>({text:JSON.stringify({documents:[{id:key,grammar:'passed'}]}),truncated:true} as Awaited<ReturnType<typeof provider.generate>>)
 assert.equal((await reviewScoreQuality([doc],target,'test')).quality_reviews?.[key].grammar,'unavailable')
 assert.equal(await reviewScoreQuality([doc],{...target,scoring_version:undefined},'test').then(r=>r.scoring_version),undefined,'historical target untouched')
 console.log('PASS version-bound grammar checks, actual Word parse, deduplication, no contact submission, unchanged historical scores and failure handling')
}
main().catch(e=>{console.error(e);process.exitCode=1}).finally(()=>{provider.generate=original})
