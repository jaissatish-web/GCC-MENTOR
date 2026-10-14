import assert from 'node:assert/strict'
import { fileURLToPath } from 'node:url'
import { createSupabaseLikeDb, applyMigrations, createAuthUser, asUser, asAnon } from './db/supabaseStub.mjs'
const db=await createSupabaseLikeDb()
async function denied(fn){try{await fn();return false}catch{return true}}
try{
  await applyMigrations(db,fileURLToPath(new URL('../supabase/migrations',import.meta.url)))
  const owner=await createAuthUser(db,'category-owner@example.test')
  const other=await createAuthUser(db,'category-other@example.test')
  const category=crypto.randomUUID()
  const entry={label:'Experion',value:'Commissioning support',level:'Advanced',sort_order:0,category_id:category,category_name:'Control Systems',category_order:0,category_position:'after_skills',show_on_resume:true}
  const save=(user,profile,rows,version=null)=>asUser(db,user,()=>db.query('select public.save_career_profile($1::jsonb,$2::jsonb,$3::timestamptz) result',[JSON.stringify(profile),JSON.stringify({additional_information:rows}),version]))
  await save(owner,{full_name:'Synthetic owner',currently_in_gulf:false,phone:'+10000000000',email:'owner@example.test'},[entry,{...entry,label:'',value:'',level:null,sort_order:1}])
  const rows=(await asUser(db,owner,()=>db.query('select * from public.profile_additional_information order by sort_order'))).rows
  assert.equal(rows.length,2);assert.equal(rows[0].category_name,'Control Systems');assert.equal(rows[0].level,'Advanced')
  assert.equal((await asUser(db,other,()=>db.query('select * from public.profile_additional_information'))).rows.length,0)
  const anonymous=await asAnon(db,()=>db.query('select * from public.profile_additional_information'))
  assert.equal(anonymous.rows.length,0)
  await save(owner,{full_name:'Synthetic owner'},[{...rows[0],value:'Reviewed commissioning support',show_on_resume:false}])
  const saved=(await asUser(db,owner,()=>db.query('select * from public.profile_additional_information'))).rows
  assert.equal(saved.length,1);assert.equal(saved[0].id,rows[0].id);assert.equal(saved[0].show_on_resume,false)
  await save(other,{full_name:'Synthetic other',currently_in_gulf:false,phone:'+10000000001',email:'other@example.test'},[{...entry,category_id:crypto.randomUUID()}])
  const otherRow=(await asUser(db,other,()=>db.query('select * from public.profile_additional_information'))).rows[0]
  assert.ok(await denied(()=>save(owner,{full_name:'Must roll back'},[{...otherRow,category_name:'Attack'}])))
  assert.equal((await asUser(db,owner,()=>db.query('select full_name from public.career_profiles'))).rows[0].full_name,'Synthetic owner')
  assert.equal((await asUser(db,owner,()=>db.query('select count(*)::int n from public.profile_additional_information'))).rows[0].n,1)
  assert.equal((await save(owner,{full_name:'Stale tab'},saved,'2000-01-01T00:00:00Z')).rows[0].result.status,'conflict')
  assert.ok(await denied(()=>save(owner,{full_name:'Bad position'},[{...saved[0],category_position:'illegal'}])))
  const headline={label:'Professional headline',value:'Senior Electrical Engineer',sort_order:0,category_id:crypto.randomUUID(),category_name:'Resume headline',category_order:0,category_position:'end',show_on_resume:true}
  await save(owner,{full_name:'Synthetic owner'},[headline])
  const header=(await asUser(db,owner,()=>db.query('select * from public.profile_additional_information'))).rows[0]
  assert.equal(header.value,'Senior Electrical Engineer')
  await save(owner,{full_name:'Synthetic owner'},[{...header,value:'',show_on_resume:false}])
  const cleared=(await asUser(db,owner,()=>db.query('select * from public.profile_additional_information'))).rows[0]
  assert.equal(cleared.id,header.id);assert.equal(cleared.value,'');assert.equal(cleared.show_on_resume,false)
  await asUser(db,owner,()=>db.query('delete from public.career_profiles'))
  assert.equal((await asUser(db,owner,()=>db.query('select * from public.profile_additional_information'))).rows.length,0)
  assert.equal((await asUser(db,other,()=>db.query('select * from public.profile_additional_information'))).rows.length,1)
  console.log('Category atomic save, stable IDs, placeholders, ownership, anon denial, rollback, stale tabs, constraints and hard-delete checks passed')
}catch(error){console.error(error);process.exitCode=1}finally{await db.close()}
