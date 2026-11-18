import './resolve-paths'
import assert from 'node:assert/strict'
import {readReviewRecovery,writeReviewRecovery,REVIEW_RECOVERY_KEY} from '../lib/resumeReviewRecovery'
const values=new Map<string,string>();const storage={getItem:(key:string)=>values.get(key)??null,setItem:(key:string,value:string)=>{values.set(key,value)}}
const valid=(v:unknown):v is {name:string}=>Boolean(v&&typeof(v as {name?:unknown}).name==='string')
const envelope={importId:'synthetic',savedVersion:'v1',source:'source',original:{name:'Original'},editor:{name:'Edited'},scan:null,presentation:{importMode:'updates',selectedUpdateIds:['profile:full_name'],openSectionId:'sec_identity',ambiguousWorkChoices:{'1':'keep'}}}
writeReviewRecovery(storage,envelope as never)
assert.deepEqual((readReviewRecovery(storage,'synthetic','v1','source',valid) as typeof envelope|null)?.presentation,envelope.presentation)
values.set(REVIEW_RECOVERY_KEY,JSON.stringify({...envelope,presentation:{...envelope.presentation,importMode:'silently-replace'}}))
assert.equal(readReviewRecovery(storage,'synthetic','v1','source',valid),null,'unrecognized recovery mode cannot unlock destructive staging')
values.set(REVIEW_RECOVERY_KEY,JSON.stringify({...envelope,presentation:{...envelope.presentation,ambiguousWorkChoices:{'1':'overwrite'}}}))
assert.equal(readReviewRecovery(storage,'synthetic','v1','source',valid),null,'invalid repeated-tenure decision rejected')
console.log('PASS V4 recovery: import mode, explicit choices and section retained with strict guarded envelope')
