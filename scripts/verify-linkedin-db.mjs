import assert from 'node:assert/strict'
import {
  createSupabaseLikeDb,
  applyMigrations,
  createAuthUser,
  asUser,
  asService,
  asAnon,
} from './db/supabaseStub.mjs'
const db = await createSupabaseLikeDb()
try {
  await applyMigrations(db, 'supabase/migrations')
  const owner = await createAuthUser(db, 'linkedin-owner@example.test')
  const other = await createAuthUser(db, 'linkedin-other@example.test')
  await asService(db, () =>
    db.query('insert into linkedin_drafts (user_id) values ($1)', [owner]),
  )
  assert.equal(
    (await asUser(db, owner, () => db.query('select * from linkedin_drafts')))
      .rows.length,
    1,
  )
  assert.equal(
    (await asUser(db, other, () => db.query('select * from linkedin_drafts')))
      .rows.length,
    0,
  )
  await assert.rejects(
    () => asAnon(db, () => db.query('select * from linkedin_drafts')),
    /permission denied/,
  )
  await assert.rejects(
    () =>
      asUser(db, owner, () =>
        db.query('update linkedin_drafts set selected_headline=1'),
      ),
    /permission denied/,
  )
  await assert.rejects(
    () => asUser(db, owner, () => db.query('delete from linkedin_drafts')),
    /permission denied/,
  )
  await assert.rejects(
    () =>
      asUser(db, other, () =>
        db.query('insert into linkedin_drafts(user_id) values ($1)', [other]),
      ),
    /permission denied/,
  )
  await assert.rejects(
    () =>
      asService(db, () =>
        db.query('insert into linkedin_drafts(user_id) values ($1)', [owner]),
      ),
    /duplicate key/,
  )
  await assert.rejects(
    () =>
      asService(db, () =>
        db.query('update linkedin_drafts set selected_headline=3'),
      ),
    /check constraint/,
  )
  const revision = (await db.query('select revision from linkedin_drafts'))
    .rows[0].revision
  assert.equal(
    (
      await asService(db, () =>
        db.query(
          'update linkedin_drafts set selected_headline=1 where user_id=$1 and revision=$2 returning *',
          [owner, '11111111-1111-4111-8111-111111111111'],
        ),
      )
    ).rows.length,
    0,
  )
  assert.equal(
    (await db.query('select revision from linkedin_drafts')).rows[0].revision,
    revision,
  )
  assert.equal(
    (
      await db.query(
        "select daily_limit_per_user from ai_service_controls where action='linkedin_optimization'",
      )
    ).rows[0].daily_limit_per_user,
    5,
  )
  await db.query('delete from auth.users where id=$1', [owner])
  assert.equal((await db.query('select * from linkedin_drafts')).rows.length, 0)
  console.log(
    'PASS: real SQL migration, owner-only RLS, public write denial, one-per-user constraint, revision matching, service quota and account deletion cascade',
  )
} finally {
  await db.close()
}
