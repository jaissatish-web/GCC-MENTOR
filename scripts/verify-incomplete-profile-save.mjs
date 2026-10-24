/** Real route + atomic Postgres save, with disposable owner-authenticated DB. */
import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'
import { createSupabaseLikeDb, applyMigrations, createAuthUser, asUser, asAnon } from './db/supabaseStub.mjs'
const require=createRequire(import.meta.url)
require('sucrase/register'); require('./resolve-paths.ts')
const db=await createSupabaseLikeDb()
let user=null, rpcCalls=0
const id=require.resolve('../lib/supabase/server.ts')
require.cache[id]={id,filename:id,loaded:true,exports:{createClient:async()=>({
  auth:{getUser:async()=>({data:{user}})},
  rpc:async(name,args)=>{
    assert.equal(name,'save_career_profile');rpcCalls++
    try {const result=await asUser(db,user.id,()=>db.query('select public.save_career_profile($1::jsonb,$2::jsonb,$3::timestamptz) result',[JSON.stringify(args.p_profile),JSON.stringify(args.p_children),args.p_expected_updated_at]));return {data:result.rows[0].result,error:null}}
    catch(error){return {data:null,error:{code:error.code,message:error.message}}}
  }
})}}
const {NextRequest}=require('next/server')
const {PUT}=require('../app/api/profile/route.ts')
const {calculateReadiness}=require('../lib/readiness.ts')
const {detectEmploymentGaps}=require('../lib/employmentGaps.ts')
const partial={currently_in_gulf:false,full_name:'',email:'',phone:'',work_experience:[{company:'',role:'Engineer',start_date:'',end_date:null,end_date_unconfirmed:true,description:'Maintained control systems.',sort_order:0}],skills:[{name:'',sort_order:0}],education:[{degree:'',institution:'Known college',sort_order:0}],certifications:[{name:'',issuer:'Known issuer',sort_order:0}],additional_information:[]}
const put=body=>PUT(new NextRequest('http://localhost/api/profile',{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)}))
try {
  await applyMigrations(db,fileURLToPath(new URL('../supabase/migrations',import.meta.url)))
  const owner=await createAuthUser(db,'incomplete-owner@example.test')
  const other=await createAuthUser(db,'incomplete-other@example.test')
  assert.equal((await put(partial)).status,401);assert.equal(rpcCalls,0)
  user={id:owner}
  const response=await put(partial);const created=await response.json();assert.equal(response.status,200,JSON.stringify(created))
  const rows=await asUser(db,owner,()=>db.query('select * from public.profile_work_experience'))
  assert.equal(rows.rows.length,1);const role=rows.rows[0]
  assert.equal(role.company,'');assert.equal(role.start_date,null);assert.equal(role.end_date_unconfirmed,true);assert.equal(role.description,partial.work_experience[0].description)
  assert.equal((await asUser(db,owner,()=>db.query('select * from public.profile_education'))).rows[0].institution,'Known college')
  assert.equal((await asUser(db,other,()=>db.query('select * from public.profile_work_experience'))).rows.length,0)
  assert.equal((await asAnon(db,()=>db.query('select * from public.career_profiles'))).rows.length,0)
  assert.ok(calculateReadiness(partial).missing.some(x=>x.field==='phone'))
  assert.deepEqual(detectEmploymentGaps([{company:'Unknown',start_date:null,end_date:null}]),[],'unknown date cannot become 1970')
  const before=rpcCalls
  for(const body of [{...partial,email:'invalid'},{...partial,phone:123},{...partial,work_experience:[{...partial.work_experience[0],start_date:'unknown'}]},{...partial,work_experience:[{...partial.work_experience[0],start_date:'2024-02-31'}]}])assert.equal((await put(body)).status,400)
  assert.equal(rpcCalls,before,'invalid supplied values never reach storage')
  const complete={...partial,full_name:'Example Person',email:'person@example.test',phone:'+919876543210',expected_updated_at:created.updated_at,work_experience:[{...partial.work_experience[0],id:role.id,company:'Known employer',start_date:'2020-01',end_date_unconfirmed:false}]}
  assert.equal((await put(complete)).status,200)
  const updated=(await asUser(db,owner,()=>db.query('select * from public.profile_work_experience'))).rows[0]
  assert.equal(updated.id,role.id);assert.equal(updated.end_date_unconfirmed,false);assert.equal(updated.start_date.toISOString().slice(0,10),'2020-01-01')
  assert.equal((await put({...complete,full_name:'Stale edit',expected_updated_at:'2000-01-01T00:00:00Z'})).status,409)
  assert.equal((await asUser(db,owner,()=>db.query('select full_name from public.career_profiles'))).rows[0].full_name,'Example Person')
  console.log('PASS incomplete profile: route/database round trip, preserved partial rows, later completion, null-date safety, format validation, owner/anon isolation and stale edits')
} finally {await db.close()}
