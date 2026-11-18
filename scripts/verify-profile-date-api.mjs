/** DATE-096: actual profile API and loader against isolated synthetic Postgres. */
import assert from 'node:assert/strict'
import {createRequire} from 'node:module'
import {fileURLToPath} from 'node:url'
import {createSupabaseLikeDb,applyMigrations,createAuthUser,asUser} from './db/supabaseStub.mjs'
const require=createRequire(import.meta.url);require('sucrase/register');require('./resolve-paths.ts')
const db=await createSupabaseLikeDb();let user=null,rpcCalls=0
const client={auth:{getUser:async()=>({data:{user}})},from(table){
  assert.ok(['career_profiles','profile_work_experience','profile_skills','profile_certifications','profile_education','profile_additional_information'].includes(table))
  const filters=[]
  const run=async single=>{
    const result=await db.query(`select * from public.${table}`+(filters.length?' where '+filters.map(([key],i)=>`"${key}"=$${i+1}`).join(' and '):''),filters.map(([,v])=>v))
    const serialize=row=>row?Object.fromEntries(Object.entries(row).map(([k,v])=>[k,v instanceof Date && /^(start_date|end_date|issue_date|expiry_date)$/.test(k)?v.toISOString().slice(0,10):v])):null
    const data=JSON.parse(JSON.stringify(single?serialize(result.rows[0]):result.rows.map(serialize)));return {data,error:null}
  }
  const chain={select(){return chain},eq(key,v){assert.ok(['id','user_id','profile_id'].includes(key));filters.push([key,v]);return chain},maybeSingle(){return run(true)},then(resolve,reject){return run(false).then(resolve,reject)}};return chain
},rpc:async(name,args)=>{
  assert.equal(name,'save_career_profile');rpcCalls++
  try{const result=await asUser(db,user.id,()=>db.query('select public.save_career_profile($1::jsonb,$2::jsonb,$3::timestamptz) result',[JSON.stringify(args.p_profile),JSON.stringify(args.p_children),args.p_expected_updated_at]));return {data:result.rows[0].result,error:null}}
  catch(error){return {data:null,error:{code:error.code,message:error.message}}}
}}
const serverId=require.resolve('../lib/supabase/server.ts');require.cache[serverId]={id:serverId,filename:serverId,loaded:true,exports:{createClient:async()=>client}}
const {NextRequest}=require('next/server');const {PUT,GET}=require('../app/api/profile/route.ts');const {loadCareerProfileFull}=require('../lib/packages/profileLoader.ts')
const body={full_name:'Synthetic Date Example',email:'',phone:'',currently_in_gulf:false,skills:[],education:[],certifications:[],additional_information:[],work_experience:[]}
const put=value=>PUT(new NextRequest('http://localhost/api/profile',{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify(value)}))
const role={company:'Synthetic Employer',role:'Coordinator',sort_order:0,start_date:'2021',start_date_precision:'year',end_date:'2022-01-17',end_date_precision:'day'}
try{
  await applyMigrations(db,fileURLToPath(new URL('../supabase/migrations',import.meta.url)))
  user={id:await createAuthUser(db,'date-api-owner@example.test')}
  for(const patch of [{end_date:'not-a-date'},{end_date:'2021-02-29'},{start_date:'2021',start_date_precision:'month'},{start_date:'2021-03-01',start_date_precision:'year'},{start_date:'2021',start_date_precision:null},{start_date:'2021',start_date_precision:'week'}]){
    const before=rpcCalls;const response=await put({...body,work_experience:[{...role,...patch}]});assert.equal(response.status,400,'invalid date/metadata must fail API validation: '+JSON.stringify(patch));assert.equal(rpcCalls,before)
  }
  const saved=await put({...body,work_experience:[role],certifications:[{name:'Synthetic certificate',sort_order:0,issue_date:'2021-01',issue_date_precision:'month',expiry_date:'2024-02-29',expiry_date_precision:'day'}]});assert.equal(saved.status,200,JSON.stringify(await saved.json()))
  let loaded=await (await GET()).json();assert.equal(loaded.employment_gaps_status,'insufficient_precision');assert.equal(loaded.work_experience[0].start_date,'2021');assert.equal(loaded.work_experience[0].end_date,'2022-01-17');assert.equal(loaded.certifications[0].issue_date,'2021-01');assert.equal(loaded.certifications[0].expiry_date,'2024-02-29')
  const shared=await loadCareerProfileFull(client,loaded.id,user.id);assert.equal(shared.work_experience[0].start_date,'2021');assert.equal(shared.work_experience[0].start_date_precision,'year')
  // Simulate a pre-migration record by owner INSERT with no precision metadata.
  await asUser(db,user.id,()=>db.query("insert into public.profile_work_experience(profile_id,company,role,start_date,end_date,sort_order) values($1,'Legacy','Coordinator','2021-11-01','2022-02-01',1)",[loaded.id]))
  loaded=await (await GET()).json();const legacy=loaded.work_experience.find(r=>r.company==='Legacy');assert.equal(legacy.start_date_precision,null);assert.equal(legacy.start_date,'2021-11-01T00:00:00.000Z'.slice(0,10),'legacy raw date stays available for an unchanged save')
  const serviceLegacy=(await loadCareerProfileFull(client,loaded.id,user.id)).work_experience.find(r=>r.company==='Legacy');assert.equal(serviceLegacy.start_date,'2021');assert.equal(serviceLegacy.start_date_precision,null,'service contexts must not expose unverified legacy calendar anchors')
  const fromDb=await loadCareerProfileFull(client,loaded.id,user.id);assert.equal(fromDb.work_experience.find(r=>r.company==='Legacy').start_date_precision,null)
  const kept=await put({...body,work_experience:loaded.work_experience,certifications:loaded.certifications});assert.equal(kept.status,200,JSON.stringify(await kept.json()))
  const changed=await put({...body,work_experience:loaded.work_experience.map(r=>r.company==='Legacy'?{...r,start_date:'2020-11-01'}:r),certifications:loaded.certifications});assert.equal(changed.status,409);assert.equal((await changed.json()).code,'DATE_PRECISION_REQUIRED')
  const freshWithout=await put({...body,work_experience:[{company:'New',role:'Coordinator',start_date:'2020-01-01',sort_order:0}]});assert.equal(freshWithout.status,409);assert.equal((await freshWithout.json()).code,'DATE_PRECISION_REQUIRED')
  console.log('PASS DATE-096 API: invalid dates rejected before RPC; year/month/day GET+shared-loader roundtrip; legacy uncertainty unchanged; actionable old-client compatibility errors')
}finally{await db.close()}
