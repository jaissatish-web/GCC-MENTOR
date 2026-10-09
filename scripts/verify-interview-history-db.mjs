import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { createSupabaseLikeDb, applyMigrations, bootstrapOrder, createAuthUser, asService, asUser } from './db/supabaseStub.mjs'

const dir = new URL('../supabase/migrations/', import.meta.url).pathname
const migration = readFileSync(dir + '068_preserve_mock_interview_history.sql', 'utf8')
const db = await createSupabaseLikeDb()
try {
  await applyMigrations(db, dir, bootstrapOrder(dir).filter(f => !f.startsWith('068_')))
  const a = await createAuthUser(db, 'history-a@example.test'), b = await createAuthUser(db, 'history-b@example.test')
  const profile = (await db.query("insert into public.career_profiles(user_id,full_name,currently_in_gulf,phone,email) values($1,'Synthetic',false,'+10000000000','synthetic@example.test') returning id", [a])).rows[0].id
  const pkg = (await db.query("insert into public.packages(user_id,profile_id,target_job_title,optimization_level,field_visibility_snapshot,optimized_content,document_snapshot) values($1,$2,'Engineer','moderate','{}','{\"summary\":\"Preserve CV\"}','{\"header\":{\"name\":\"Preserve snapshot\"}}') returning id", [a, profile])).rows[0].id
  const ids = [], question = crypto.randomUUID()
  const report = { overall_score: 70, technical_score: 70, role_fit_score: 70, gulf_readiness_score: 70, answer_structure_score: 70, strengths: [], weak_points: [], risky_answers: [], improvement_plan: [], next_practice_questions: [] }
  for (let i = 0; i < 13; i++) {
    const id = crypto.randomUUID(); ids.push(id)
    const run = { id, input_mode: 'voice', status: 'in_progress', generated_at: `2026-10-${String(i + 1).padStart(2, '0')}T00:00:00Z`, mode: 'mixed', difficulty: 'standard', question_count: 5,
      questions: Array.from({ length: 5 }, (_, j) => ({ id: j ? crypto.randomUUID() : question, question: 'Question', answer: null })) }
    await asService(db, () => db.query('select public.voice_start_session($1,$2,$3,$4,$5,$6)', [pkg, a, JSON.stringify(run), '{}', 'fingerprint', 'rubric']))
  }
  await db.query("update public.voice_interview_sessions set status='completed', report=$2::jsonb,completed_at=now() where id=$1", [ids[0], JSON.stringify(report)])
  await db.query("insert into public.voice_interview_answers(session_id,question_id,audio_path,mime_type,saved_at,transcript,feedback) values($1,$2,$3,'audio/webm',now(),'Saved transcript','{\"feedback\":\"Saved feedback\",\"score\":7}')", [ids[0], question, `${a}/${ids[0]}/${question}.webm`])
  await db.query("update public.voice_interview_sessions set status='deleting' where id=$1", [ids[1]])
  // Migration must not restore a corrupt foreign-owner row into this user's CV.
  await db.query('update public.voice_interview_sessions set user_id=$2 where id=$1', [ids[2], b])
  const cvBefore = (await db.query('select optimized_content,document_snapshot,service_events from public.packages where id=$1', [pkg])).rows[0]
  assert.equal((await db.query('select cardinality(mock_interview_runs) n from public.packages where id=$1', [pkg])).rows[0].n, 10)
  await db.exec(migration)
  const runs = (await db.query('select mock_interview_runs from public.packages where id=$1', [pkg])).rows[0].mock_interview_runs
  assert.equal(runs.length, 11)
  const recovered = runs.find(r => r.id === ids[0])
  assert.equal(recovered.status, 'completed'); assert.deepEqual(recovered.final_report, report)
  assert.equal(recovered.questions[0].answer, 'Saved transcript'); assert.equal(recovered.questions[0].feedback, 'Saved feedback')
  assert.equal(recovered.resume_fingerprint, 'fingerprint')
  assert.ok(!runs.some(r => r.id === ids[1] || r.id === ids[2]))
  assert.deepEqual((await db.query('select optimized_content,document_snapshot,service_events from public.packages where id=$1', [pkg])).rows[0], cvBefore)
  await db.exec(migration)
  assert.equal((await db.query('select cardinality(mock_interview_runs) n from public.packages where id=$1', [pkg])).rows[0].n, 11, 'Recovery is idempotent')
  const append = uid => asService(db, () => db.query("select public.package_append_mock_run($1,$2,$3::jsonb,'{}') ok", [pkg, uid, JSON.stringify({ id: 'new-run', status: 'in_progress' })]))
  assert.equal((await append(b)).rows[0].ok, false)
  await append(a); await append(a)
  assert.equal((await db.query('select cardinality(mock_interview_runs) n from public.packages where id=$1', [pkg])).rows[0].n, 12, 'All future attempts retained; duplicate append creates no duplicate')
  assert.equal((await asUser(db, b, () => db.query('select id from public.packages where id=$1', [pkg]))).rows.length, 0)
  await assert.rejects(() => asUser(db, a, () => db.query("select public.package_append_mock_run($1,$2,'{}','{}')", [pkg, a])), /permission denied/)
  // Reverting the function definition does not delete any saved history.
  const old = readFileSync(dir + '065_keep_ten_per_package.sql', 'utf8').match(/CREATE OR REPLACE FUNCTION public\.package_append_mock_run[\s\S]*?\$\$;/)[0]
  await db.exec(old)
  assert.equal((await db.query('select cardinality(mock_interview_runs) n from public.packages where id=$1', [pkg])).rows[0].n, 12)
  await db.exec(migration)
  console.log('PASS: >10 attempts retained, old voice report/transcript recovered, deletions/foreign owners excluded, duplicate writes safe, CV snapshots untouched, migration repeat/rollback and owner RLS')
} finally { await db.close() }
