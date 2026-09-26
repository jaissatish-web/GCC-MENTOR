import assert from 'node:assert/strict'
import { createSupabaseLikeDb, applyMigrations, createAuthUser, asUser, asService, asAnon } from './db/supabaseStub.mjs'
const db = await createSupabaseLikeDb()
let checks = 0
function check(value, message) { assert.ok(value, message); checks++; console.log('PASS', message) }
async function denied(fn) { try { await fn(); return false } catch { return true } }
try {
  await applyMigrations(db, new URL('../supabase/migrations', import.meta.url).pathname)
  const a = await createAuthUser(db, 'voice-a@example.test'); const b = await createAuthUser(db, 'voice-b@example.test')
  const profile = (await db.query("insert into public.career_profiles(user_id,full_name,currently_in_gulf,phone,email) values($1,'Synthetic candidate',false,'+10000000000','synthetic@example.test') returning id", [a])).rows[0].id
  const pkg = (await db.query("insert into public.packages(user_id,profile_id,target_job_title,optimization_level,field_visibility_snapshot) values($1,$2,'Engineer','moderate','{}') returning id", [a,profile])).rows[0].id
  const runId = crypto.randomUUID()
  const questions = Array.from({length:5},(_,i)=>({id:crypto.randomUUID(),question:`Question ${i}`,answer:null}))
  const run = {id:runId,input_mode:'voice',status:'in_progress',mode:'mixed',difficulty:'standard',question_count:5,questions}
  const start = async user => (await asService(db,()=>db.query('select public.voice_start_session($1,$2,$3,$4,$5,$6) ok',[pkg,user,JSON.stringify(run),'{}','fingerprint','voice-v1']))).rows[0].ok
  check(await start(b)===false,'start refuses another owner')
  check(await start(a)===true,'session and package run created together')
  check((await asUser(db,a,()=>db.query('select * from public.voice_interview_sessions'))).rows.length===1,'owner can read own session')
  check((await asUser(db,b,()=>db.query('select * from public.voice_interview_sessions'))).rows.length===0,'another user cannot read session')
  check(await denied(()=>asAnon(db,()=>db.query('select * from public.voice_interview_sessions'))),'anonymous session read denied')
  check(await denied(()=>asUser(db,a,()=>db.query("update public.voice_interview_sessions set status='completed'"))),'owner cannot forge completion')
  check(await denied(()=>asUser(db,a,()=>db.query('select public.voice_claim_review(null,null)'))),'owner cannot invoke privileged worker')
  check(await denied(()=>asUser(db,a,()=>db.query('select public.voice_request_review($1,$2)',[runId,a]))),'owner cannot bypass review API')
  check((await asService(db,()=>db.query('select public.voice_claim_review(null,null) r'))).rows[0].r===null,'worker never claims an unrequested recording session')
  check(await denied(()=>asService(db,()=>db.query('select public.voice_request_review($1,$2)',[runId,a]))),'review refuses missing recordings')
  for(const q of questions){
    const path=`${a}/${runId}/${q.id}.webm`
    await asService(db,()=>db.query('select public.voice_prepare_answer($1,$2,$3,$4,$5)',[runId,a,q.id,'audio/webm',path]))
    await asService(db,()=>db.query('select public.voice_accept_answer($1,$2,$3,$4,$5)',[runId,a,q.id,2000,5]))
  }
  check((await asUser(db,b,()=>db.query('select * from public.voice_interview_answers'))).rows.length===0,'another user cannot read answers')
  check((await asUser(db,a,()=>db.query('select * from public.voice_interview_answers'))).rows.length===5,'owner reads all saved answers')
  check((await db.query('select count(*)::int n from public.voice_interview_answers where transcript is not null or feedback is not null')).rows[0].n===0,'recording does not transcribe or grade')
  check((await asService(db,()=>db.query('select public.voice_request_review($1,$2) s',[runId,a]))).rows[0].s==='queued','explicit review queues complete interview')
  check((await asService(db,()=>db.query('select public.voice_request_review($1,$2) s',[runId,a]))).rows[0].s==='queued','duplicate review does not create another job')
  check((await asService(db,()=>db.query('select public.voice_claim_review($1,$2) r',[b,runId]))).rows[0].r===null,'worker owner filter prevents cross-user claims')
  const claim=(await asService(db,()=>db.query('select public.voice_claim_review($1,$2) r',[a,runId]))).rows[0].r
  check(claim.status==='processing'&&claim.lease_token,'worker receives exclusive lease')
  check((await asService(db,()=>db.query('select public.voice_claim_review($1,$2) r',[a,runId]))).rows[0].r===null,'second worker cannot claim active lease')
  check(await denied(()=>asService(db,()=>db.query('select public.voice_mark_deleting($1,$2)',[runId,a]))),'delete refuses active review')
  check(await denied(()=>asService(db,()=>db.query('select public.voice_prepare_answer($1,$2,$3,$4,$5)',[runId,a,questions[0].id,'audio/webm',`${a}/${runId}/new.webm`]))),'recordings frozen after review request')
  await db.query("update public.voice_interview_sessions set lease_until=now()-interval '1 second',attempts=5 where id=$1",[runId])
  check((await asService(db,()=>db.query('select public.voice_claim_review($1,$2) r',[a,runId]))).rows[0].r===null,'crash retries are bounded')
  check((await asService(db,()=>db.query('select public.voice_request_review($1,$2) s',[runId,a]))).rows[0].s==='queued','explicit retry recovers exhausted lease')
  check((await db.query("select public from storage.buckets where id='mock-interview-audio'")).rows[0].public===false,'audio bucket is private')
  check(await denied(()=>asUser(db,a,()=>db.query("insert into storage.objects(bucket_id,name) values('mock-interview-audio',$1)",[`${a}/${runId}/rogue.webm`]))),'client cannot bypass bounded signed uploads')
  await asService(db,()=>db.query('select public.voice_mark_deleting($1,$2)',[runId,a]))
  check((await db.query('select array_length(mock_interview_runs,1) n from public.packages where id=$1',[pkg])).rows[0].n===null,'delete removes run from package history')
  check((await asService(db,()=>db.query('select public.voice_claim_review($1,$2) r',[a,runId]))).rows[0].r===null,'deleted session cannot be reviewed')
  await asService(db,()=>db.query('select public.voice_delete_session($1,$2)',[runId,a]))
  check((await db.query('select count(*)::int n from public.voice_audio_cleanup')).rows[0].n===5,'hard delete queues all audio paths for expiry cleanup')
  check(await denied(()=>asUser(db,a,()=>db.query('select * from public.voice_audio_cleanup'))),'cleanup queue is server-only')
  const grants=(await db.query("select count(*)::int n from information_schema.routine_privileges where routine_name like 'voice_%' and grantee in ('PUBLIC','anon','authenticated')")).rows[0].n
  check(grants===0,'catalogue has no client grants on privileged voice RPCs')
  console.log(`${checks} voice database checks passed`)
} catch (e) { console.error(e.message); process.exitCode=1 } finally { await db.close() }
