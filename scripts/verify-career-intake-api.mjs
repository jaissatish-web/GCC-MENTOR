import assert from 'node:assert/strict'
import {createRequire} from 'node:module'
const require=createRequire(import.meta.url);require('sucrase/register');require('./resolve-paths.ts')
const draft={full_name:'Example Person',email:'person@example.com',phone:'+919876543210',work_experience:[],education:[],skills:[],certifications:[],additional_information:[]}
let allowed=true,paused=false,calls=0,reads=0,fail=false,user={id:'owner'},existing=null,saves=0
function stub(path,exports){const id=require.resolve(path);require.cache[id]={id,filename:id,loaded:true,exports}}
stub('../lib/anonymousRateLimit.ts',{getClientIdentityHash:()=> 'test',getAnonymousRateLimitStatus:async()=>({allowed,message:'Limit reached'}),incrementAnonymousRateLimit:async()=>{reads++},LIMIT_ACTION_ANON_ATS_SCAN:'ats_scan'})
stub('../lib/ai/serviceGuard.ts',{isServicePaused:async()=>({paused,message:'Paused'})})
stub('../lib/ai/provider.ts',{generate:async()=>{calls++;if(fail)throw Error('fake provider failure');return {text:JSON.stringify(draft),inputTokens:10,outputTokens:20,truncated:false}}})
stub('../lib/supabase/server.ts',{
 createClient:async()=>({
  auth:{getUser:async()=>({data:{user}})},
  from(table){
   assert.equal(table,'career_profiles')
   return {select(){return {eq(field,id){
    assert.equal(field,'user_id');assert.equal(id,'owner')
    return {maybeSingle:async()=>({data:existing,error:null})}
   }}}}
  }
 })
})
stub('../lib/pendingDraft.ts',{savePendingDraft:async(client,id,value,source,report)=>{assert.equal(id,'owner');assert.equal(value.full_name,'Example Person');assert.ok(report.review);saves++}})
const {NextRequest}=require('next/server');const {POST:read}=require('../app/api/career-intake/route.ts');const {POST:claim}=require('../app/api/career-intake/claim/route.ts')
const source='Example Person\nperson@example.com\nPhone: +919876543210\nRecent graduate with practical training, coursework and experience supporting daily tasks. This is synthetic source text for a controlled test.'
function request(text=source){const body=new FormData();body.append('resume_text',text);return new NextRequest('http://localhost/api/career-intake',{method:'POST',body})}
assert.equal((await read(request('short'))).status,400);assert.equal(calls,0);assert.equal(reads,0)
allowed=false;assert.equal((await read(request())).status,429);assert.equal(calls,0);allowed=true
paused=true;assert.equal((await read(request())).status,503);paused=false
const response=await read(request());assert.equal(response.status,200);const payload=await response.json();assert.ok(payload.intake.draft);assert.ok(payload.intake.report.review);assert.equal(reads,1);assert.equal(calls,1)
const claimRequest=()=>new NextRequest('http://localhost/api/career-intake/claim',{method:'POST',body:JSON.stringify(payload.intake),headers:{'Content-Type':'application/json'}})
user=null;assert.equal((await claim(claimRequest())).status,401);assert.equal(saves,0)
user={id:'owner'};existing={id:'saved-profile',full_name:'Saved Person'};assert.equal((await claim(claimRequest())).status,409);assert.equal(saves,0,'existing profiles cannot bypass monthly imports')
existing={id:'incomplete-profile',full_name:''};assert.equal((await claim(claimRequest())).status,409);assert.equal(saves,0,'incomplete saved profiles also retain quota/overwrite protection')
existing=null;assert.equal((await claim(claimRequest())).status,200);assert.equal(saves,1);assert.equal(calls,1,'claim does not re-extract or call the model')
console.log('PASS intake API: validation, pause, limits, one extraction, owner-authenticated first-profile claim, returning-user quota protection')
