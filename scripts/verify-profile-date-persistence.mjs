/** DATE-096: real SQL/atomic RPC, entirely disposable synthetic Postgres. */
import assert from 'node:assert/strict'
import { fileURLToPath } from 'node:url'
import { existsSync } from 'node:fs'
import { createSupabaseLikeDb, applyMigrations, bootstrapOrder, createAuthUser, asUser } from './db/supabaseStub.mjs'
const directory=fileURLToPath(new URL('../supabase/migrations',import.meta.url))
const db=await createSupabaseLikeDb()
try {
  await applyMigrations(db,directory,bootstrapOrder(directory).filter(name=>name!=='073_profile_date_precision.sql'))
  const owner=await createAuthUser(db,'date-owner@example.test')
  const other=await createAuthUser(db,'date-other@example.test')
  const profile={full_name:'Synthetic Example',email:'',phone:'',currently_in_gulf:false}
  const save=(children,patch=profile,version=null)=>asUser(db,owner,async()=>{
    const r=await db.query('select public.save_career_profile($1::jsonb,$2::jsonb,$3::timestamptz) result',[JSON.stringify(patch),JSON.stringify(children),version]);return r.rows[0].result
  })
  await save({work_experience:[{company:'Legacy Employer',role:'Coordinator',start_date:'2021-11-01',end_date:'2022-02-01',sort_order:0}]})
  const legacy=(await asUser(db,owner,()=>db.query('select id,profile_id from public.profile_work_experience'))).rows[0]
  assert.ok(existsSync(directory+'/073_profile_date_precision.sql'),'approved precision migration is not implemented')
  await applyMigrations(db,directory,['073_profile_date_precision.sql'])
  const rows=async()=> (await asUser(db,owner,()=>db.query('select *,start_date::text start_text,end_date::text end_text from public.profile_work_experience order by sort_order'))).rows
  assert.equal((await rows())[0].start_date_precision,null,'migration must not backfill legacy precision')
  const base={id:legacy.id,company:'Legacy Employer',role:'Coordinator',sort_order:0,start_date:'2021-11-01',end_date:'2022-02-01'}
  await save({work_experience:[base]});assert.equal((await rows())[0].start_date_precision,null)
  const fresh={company:'Known Employer',role:'Engineer',sort_order:1,start_date:'2021-01-01',start_date_precision:'year',end_date:'2022-01-17',end_date_precision:'day'}
  await save({work_experience:[base,fresh]})
  let all=await rows();const known=all[1];assert.equal(known.start_date_precision,'year');assert.equal(known.end_date_precision,'day')
  // An older client can change other facts, but cannot erase date precision.
  const oldClient={id:known.id,company:'Known Employer renamed',role:'Engineer',sort_order:1,start_date:'2021-01-01',end_date:'2022-01-17'}
  await save({work_experience:[base,oldClient]});all=await rows();assert.equal(all[1].start_date_precision,'year');assert.equal(all[1].end_date_precision,'day')
  await save({work_experience:[base,{...oldClient,start_date_precision:null,end_date_precision:null}]});assert.equal((await rows())[1].start_date_precision,'year')
  // Collection union keys cannot null another row's unchanged precision/date.
  await save({work_experience:[{id:legacy.id,company:'Legacy Employer',role:'Coordinator',sort_order:0},{...oldClient,start_date_precision:'year',end_date_precision:'day'}]})
  all=await rows();assert.equal(all[0].start_text,'2021-11-01');assert.equal(all[0].start_date_precision,null)
  // Any compatibility error rolls parent and every child change back.
  for (const bad of [{...oldClient,start_date:'2020-01-01'},{company:'No precision',role:'New',sort_order:2,start_date:'2020-01-01'},{...oldClient,start_date_precision:'month',start_date:'2021-02-02'},{...oldClient,start_date_precision:'week'},{...oldClient,start_date:'01/01/2021',start_date_precision:'day'},{...oldClient,start_date:'2021-02-29',start_date_precision:'day'}]) {
    await assert.rejects(()=>save({work_experience:[base,bad]}, {...profile,full_name:'Must roll back'}))
    assert.equal((await asUser(db,owner,()=>db.query('select full_name from public.career_profiles'))).rows[0].full_name,profile.full_name)
    assert.equal((await rows())[1].company,'Known Employer renamed')
  }
  const conflict=await save({work_experience:[]},profile,'2000-01-01T00:00:00Z');assert.equal(conflict.status,'conflict');assert.equal((await rows()).length,2)
  await save({work_experience:[base,{...oldClient,start_date:null,end_date:null}]});all=await rows();assert.equal(all[1].start_text,null);assert.equal(all[1].start_date_precision,null);assert.equal(all[1].end_date_precision,null)
  // Month/year/day storage anchors remain distinct even if the SQL date collides.
  const certs=['year','month','day'].map((precision,i)=>({name:'Synthetic certificate '+i,sort_order:i,issue_date:'2021-01-01',issue_date_precision:precision,expiry_date:null,expiry_date_precision:null}))
  await save({certifications:certs});assert.deepEqual((await asUser(db,owner,()=>db.query('select issue_date_precision from public.profile_certifications order by sort_order'))).rows.map(r=>r.issue_date_precision),['year','month','day'])
  assert.equal((await asUser(db,other,()=>db.query('select * from public.profile_work_experience'))).rows.length,0,'owner isolation remains in force')
  console.log('PASS DATE-096 persistence: no legacy backfill; distinct precision; mixed old/new clients; atomic rollback; stale version; explicit clear; owner isolation')
} finally {await db.close()}
