import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import { applyMigrations, asService, asUser, createAuthUser, createSupabaseLikeDb } from './db/supabaseStub.mjs'

const db = await createSupabaseLikeDb()
try {
  await applyMigrations(db, 'supabase/migrations')
  const owner = await createAuthUser(db, 'wallet@example.test')
  const stranger = await createAuthUser(db, 'stranger@example.test')
  const one = async (sql, args) => (await asService(db, () => db.query(sql, args))).rows[0]
  const grant = (source, reference, units, expires = null, user = owner) =>
    one('select public.grant_wallet_credits($1,$2,$3,$4,$5) as id', [user, source, reference, units, expires])
  const reserve = (operation, service = 'optimization', identity = 'test-object', user = owner) =>
    one('select * from public.reserve_wallet_credits($1,$2,$3,$4,120)', [user, service, operation, identity])
  const finish = (hold, result = null, user = owner) =>
    one('select public.finish_wallet_reservation($1,$2,$3) as status', [user, hold, result])
  const summary = () => asService(db, async () => (await db.query('select * from public.wallet_source_summary($1)', [owner])).rows)
  assert.equal((await reserve(randomUUID())).status, 'disabled')
  await db.exec('update public.credit_wallet_settings set enforcement_enabled = true')
  assert.deepEqual(await reserve(randomUUID()), {
    status: 'insufficient', reservation_id: null, cost: 3, available: 0, result_id: null,
  })

  const reward = randomUUID()
  const referral = await grant('referral', reward, 3)
  assert.equal((await grant('referral', reward, 3)).id, referral.id)
  await assert.rejects(grant('referral', reward, 5), /already used/)
  const expires = new Date(Date.now() + 86400_000).toISOString()
  const subscription = await grant('subscription', randomUUID(), 2, expires)
  await grant('purchase', randomUUID(), 1)
  const operation = randomUUID()
  const hold = await reserve(operation)
  assert.equal(hold.cost, 3)
  assert.equal(hold.available, 3)
  assert.equal((await reserve(operation)).status, 'busy')
  assert.equal((await reserve(operation, 'optimization', 'different job')).status, 'conflict')
  const allocation = await one("select units from public.credit_ledger where lot_id = $1 and kind = 'reserve'", [subscription.id])
  assert.equal(allocation.units, 2, 'expiring subscription credits are spent first')
  await db.exec("update public.credit_service_prices set units = 4 where service = 'optimization'")
  assert.equal((await reserve(operation)).cost, 3, 'active reservation retains old price')
  assert.equal((await reserve(randomUUID())).status, 'insufficient')
  assert.equal((await finish(hold.reservation_id, null, stranger)).status, 'missing')
  assert.equal((await finish(hold.reservation_id)).status, 'released')
  assert.equal((await finish(hold.reservation_id)).status, 'released')

  const paid = await reserve(randomUUID())
  const result = randomUUID()
  assert.equal((await finish(paid.reservation_id, result)).status, 'settled')
  assert.equal((await finish(paid.reservation_id, result)).status, 'settled')
  assert.equal((await finish(paid.reservation_id, randomUUID())).status, 'conflict')
  assert.equal((await reserve(randomUUID())).status, 'insufficient')
  let totals = await summary()
  assert.equal(totals.reduce((n, row) => n + row.used, 0), 4)
  assert.equal(totals.reduce((n, row) => n + row.reserved, 0), 0)
  const refund = () => one('select public.refund_wallet_reservation($1,$2) as units', [owner, paid.reservation_id])
  assert.equal((await refund()).units, 4)
  assert.equal((await refund()).units, 0)
  await db.query("update public.credit_lots set issued_at = now() - interval '2 days', expires_at = now() - interval '1 day' where id = $1", [subscription.id])
  totals = await summary()
  assert.equal(totals.find(row => row.source === 'subscription').expired, 2)
  assert.equal(totals.find(row => row.source === 'referral').available, 3)
  assert.equal(totals.find(row => row.source === 'purchase').available, 1)
  await asUser(db, owner, () => assert.rejects(db.query('select * from public.credit_ledger'), /permission denied/))
  await asUser(db, owner, () => assert.rejects(db.query('select * from public.wallet_source_summary($1)', [stranger]), /permission denied/))
  await asService(db, () => assert.rejects(db.query("update public.credit_ledger set kind = 'reverse'"), /permission denied/))
  console.log('Credit wallet passed: launch defaults, grant identity, expiry order, cost snapshot, reservation and refund idempotency, source balances and write isolation.')
} finally {
  await db.close()
}
