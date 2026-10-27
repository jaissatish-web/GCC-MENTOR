import assert from 'node:assert/strict'
import { REVIEW_RECOVERY_KEY, reviewSource, readReviewRecovery, writeReviewRecovery, clearReviewRecovery } from '../lib/resumeReviewRecovery'
assert.equal(reviewSource({category_id:'generated-a',value:'Fact'}),reviewSource({category_id:'generated-b',value:'Fact'}),'Regenerated category ids must not prevent refresh recovery')
const entries = new Map<string,string>()
const storage = {getItem:(key:string)=>entries.get(key)??null,setItem:(key:string,value:string)=>{entries.set(key,value)},removeItem:(key:string)=>{entries.delete(key)}}
const valid = (v: unknown): v is {summary:string} => !!v && typeof v==='object' && 'summary' in v && typeof v.summary==='string'
const checkpoint = {importId:'server-import-A',savedVersion:'v1',source:'original incoming draft',original:{summary:'Original'},editor:{summary:'My manual edit'},scan:{overall_score:73}}
assert.equal(writeReviewRecovery(storage,checkpoint),true)
assert.deepEqual(readReviewRecovery(storage,'server-import-A','v1',checkpoint.source,valid),checkpoint)
for(const [id,version,source] of [['server-import-B','v1',checkpoint.source],['server-import-A','v2',checkpoint.source],['server-import-A','v1','different merge choice']]) assert.equal(readReviewRecovery(storage,id,version,source,valid),null,'Never recover another import, saved version or merge source')
entries.set(REVIEW_RECOVERY_KEY,'{broken')
assert.equal(readReviewRecovery(storage,'server-import-A','v1',checkpoint.source,valid),null)
entries.set(REVIEW_RECOVERY_KEY,JSON.stringify({...checkpoint,editor:{summary:42}}))
assert.equal(readReviewRecovery(storage,'server-import-A','v1',checkpoint.source,valid),null)
assert.equal(writeReviewRecovery(null,checkpoint),false)
assert.equal(readReviewRecovery(null,'server-import-A','v1',checkpoint.source,valid),null)
assert.equal(writeReviewRecovery({setItem:()=>{throw Error('Quota exceeded')}},checkpoint),false)
assert.equal(readReviewRecovery({getItem:()=>{throw Error('Storage blocked')}},'server-import-A','v1',checkpoint.source,valid),null)
writeReviewRecovery(storage,checkpoint);entries.set(REVIEW_RECOVERY_KEY+':markers','{}');clearReviewRecovery(storage)
assert.equal(entries.size,0,'Save/discard removes facts and markers')
console.log('PASS tab review recovery: exact import/version/source, corruption, unavailable storage, and explicit cleanup')
