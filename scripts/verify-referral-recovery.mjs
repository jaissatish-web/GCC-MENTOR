import assert from 'node:assert/strict'
import { PGlite } from '@electric-sql/pglite'
import { applyMigrations, asUser, bootstrapOrder, createAuthUser, createSupabaseLikeDb } from './db/supabaseStub.mjs'

const directory = 'supabase/migrations'
const order = bootstrapOrder(directory)
const baseline = order.filter(file => Number(file.slice(0, 3)) <= 74)
const release = order.filter(file => Number(file.slice(0, 3)) >= 75 && Number(file.slice(0, 3)) <= 80)
assert.equal(release.length, 6)

const db = await createSupabaseLikeDb()
let restored
try {
  await applyMigrations(db, directory, baseline)
  const owner = await createAuthUser(db, 'recovery-owner@example.test')
  const stranger = await createAuthUser(db, 'recovery-stranger@example.test')
  const { rows: [profile] } = await db.query(
    "insert into public.career_profiles(user_id, full_name, currently_in_gulf, phone, email) values ($1,'Recovery Fixture',false,'+15550101010','recovery-owner@example.test') returning id",
    [owner],
  )
  const { rows: [job] } = await db.query(
    "insert into public.packages(user_id, profile_id, target_job_title, target_industry, optimization_level, field_visibility_snapshot) values ($1,$2,'Quality Engineer','Engineering','easy','{}') returning id",
    [owner, profile.id],
  )
  const snapshot = connection => connection.query(
    'select (select to_jsonb(p) from public.career_profiles p where p.id = $1) as profile, (select to_jsonb(j) from public.packages j where j.id = $2) as package',
    [profile.id, job.id],
  ).then(result => result.rows[0])
  const legacyState = await snapshot(db)
  const checkLegacyAccess = async connection => {
    assert.equal((await asUser(connection, owner, () => connection.query('select id from public.packages where id = $1', [job.id]))).rows.length, 1)
    assert.equal((await asUser(connection, stranger, () => connection.query('select id from public.packages where id = $1', [job.id]))).rows.length, 0)
  }

  const backup = await db.dumpDataDir()
  restored = await PGlite.create({ loadDataDir: backup })
  assert.deepEqual(await snapshot(restored), legacyState)
  await checkLegacyAccess(restored)

  await db.exec('begin')
  await applyMigrations(db, directory, release)
  assert.deepEqual(await snapshot(db), legacyState)
  await db.exec('rollback')
  assert.equal((await db.query("select to_regclass('public.credit_ledger') as relation")).rows[0].relation, null)
  assert.equal((await db.query("select count(*)::int as count from pg_trigger where tgname like 'capture%referral%'")).rows[0].count, 0)
  assert.deepEqual(await snapshot(db), legacyState)
  await checkLegacyAccess(db)

  await db.exec('begin')
  await applyMigrations(db, directory, release)
  await db.exec('commit')
  assert.equal((await db.query('select enabled from public.referral_program_settings')).rows[0].enabled, false)
  assert.equal((await db.query('select enforcement_enabled from public.credit_wallet_settings')).rows[0].enforcement_enabled, false)
  assert.deepEqual(await snapshot(db), legacyState)
  await checkLegacyAccess(db)
  console.log('Recovery passed: restored a pre-release archive, rolled back all six migrations in one transaction, and verified legacy data and access after a committed additive rollout.')
} finally {
  await restored?.close()
  await db.close()
}
