import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { createSupabaseLikeDb, createAuthUser, asUser, asService, asAnon } from './db/supabaseStub.mjs'
const db = await createSupabaseLikeDb()
try {
  await db.exec(readFileSync('supabase/migrations/20261011155749_resume_import_reviews.sql', 'utf8'))
  const a = await createAuthUser(db, 'import-a@example.com'), b = await createAuthUser(db, 'import-b@example.com')
  await asService(db, () => db.query('insert into public.resume_import_reviews(user_id,review) values ($1,$2)', [a, { version: 1, sourceText: 'private original' }]))
  await asUser(db, a, async () => {
    assert.equal((await db.query('select * from public.resume_import_reviews')).rows.length, 1)
    await assert.rejects(db.query("update public.resume_import_reviews set review='{}'"), /permission denied/)
    await assert.rejects(db.query('insert into public.resume_import_reviews(user_id,review) values ($1,$2)', [a, { version: 1 }]), /permission denied/)
  })
  await asUser(db, b, async () => {
    assert.equal((await db.query('select * from public.resume_import_reviews')).rows.length, 0)
    assert.equal((await db.query('delete from public.resume_import_reviews returning user_id')).rows.length, 0)
  })
  await asAnon(db, () => assert.rejects(db.query('select * from public.resume_import_reviews'), /permission denied/))
  await asUser(db, a, async () => assert.equal((await db.query('delete from public.resume_import_reviews returning user_id')).rows.length, 1))
  console.log('PASS import review DB: owner read/delete, no cross-user access, no public access, server-only evidence writes')
} finally { await db.close() }
