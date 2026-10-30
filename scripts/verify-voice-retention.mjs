/** Actual backlog worker/orchestrator/cron with synthetic storage and database. */
import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
const require = createRequire(import.meta.url)
require('sucrase/register')
require('./resolve-paths.ts')
const NOW = Date.parse('2026-10-30T12:00:00Z')
const old = new Date(NOW - 5 * 86400000).toISOString()
const future = new Date(NOW + 86400000).toISOString()
let db
function database({ expired = 0, cleanup = 0, sessions = 0, answersPerSession = 2 } = {}) {
  const state = { voice_interview_answers: [], voice_audio_cleanup: [], voice_interview_sessions: [], maintenance_runs: [],
    anonymous_analysis_sessions: [{ expires_at: old }], anonymous_rate_limits: [{ window_start: '2026-08-01' }],
    rate_limit_reservations: [{ expires_at: old }], job_analyses: [{ expires_at: old }] }
  for (let i = 0; i < expired; i++) state.voice_interview_answers.push({ session_id: 'active-' + i % 10, question_id: '' + i, audio_path: 'expired/' + i, audio_delete_after: old, audio_deleted_at: null, transcript: 'keep transcript', feedback: { score: 5 } })
  for (let i = 0; i < cleanup; i++) state.voice_audio_cleanup.push({ audio_path: 'queued/' + i, delete_after: old })
  for (let i = 0; i < sessions; i++) {
    const id = 'deleting-' + String(i).padStart(4, '0')
    state.voice_interview_sessions.push({ id, user_id: 'owner-' + i, status: 'deleting', completed_at: old })
    for (let j = 0; j < answersPerSession; j++) state.voice_interview_answers.push({ session_id: id, audio_path: id + '/' + j, audio_delete_after: future, audio_deleted_at: null })
  }
  const events = [], removed = [], rpcCalls = []
  const api = { state, events, removed, rpcCalls, failStorage: false, missingStorage: false, failMark: false, failStart: false, failFinish: false, failOperational: false, missingBucket: false, failQueueDelete: false,
    from(table) {
      let op = 'select', patch, head = false, maximum = Infinity
      const predicates = [], orders = []
      const matching = () => state[table].filter(row => predicates.every(f => f(row))).sort((a, b) => { for (const key of orders) { const c = String(a[key]).localeCompare(String(b[key])); if (c) return c } return 0 })
      const result = () => {
        if (table === 'maintenance_runs' && op === 'insert' && api.failStart) return { error: { message: 'synthetic start failure' }, data: null }
        if (table === 'maintenance_runs' && op === 'update' && api.failFinish) return { error: { message: 'synthetic finish failure' } }
        if (table === 'voice_audio_cleanup' && op === 'delete' && api.failQueueDelete) return { error: { message: 'synthetic queue failure' } }
        if (table === 'voice_interview_answers' && op === 'update' && api.failMark) return { error: { message: 'synthetic marker failure' } }
        if (op === 'insert') { const row = { id: 'run-' + state[table].length, ...patch }; state[table].push(row); return { data: row, error: null } }
        const matches = matching()
        if (head) return { count: matches.length, data: null, error: null }
        const rows = matches.slice(0, maximum)
        if (op === 'update') { assert.ok(predicates.length, 'all updates scoped'); events.push({ op: 'mark', table }); rows.forEach(row => Object.assign(row, patch)) }
        if (op === 'delete') { assert.ok(predicates.length, 'all deletes scoped'); state[table] = state[table].filter(row => !rows.includes(row)) }
        return { data: rows.map(row => ({ ...row })), error: null }
      }
      const q = {
        select(_cols, opts) { head = !!opts?.head; return q },
        is(k, v) { predicates.push(row => (row[k] ?? null) === v); return q },
        eq(k, v) { predicates.push(row => row[k] === v); return q },
        in(k, v) { predicates.push(row => v.includes(row[k])); return q },
        lt(k, v) { predicates.push(row => row[k] < v); return q },
        lte(k, v) { predicates.push(row => row[k] <= v); return q },
        gt(k, v) { predicates.push(row => row[k] > v); return q },
        order(k) { orders.push(k); return q }, limit(n) { assert.ok(n <= 2000, 'every work read bounded'); maximum = n; return q },
        update(value) { op = 'update'; patch = value; return q }, delete() { op = 'delete'; return q }, insert(value) { op = 'insert'; patch = value; return q },
        single: async () => result(), then: (yes, no) => Promise.resolve().then(result).then(yes, no),
      }
      return q
    },
    storage: { from(bucket) { assert.equal(bucket, 'mock-interview-audio'); return { async remove(paths) {
      assert.ok(paths.length <= 2000); events.push({ op: 'remove', paths });
      if (api.missingBucket) return { error: { statusCode: '404', message: 'Bucket not found' } }
      if (api.failStorage) return { error: { statusCode: '503', message: 'synthetic unavailable' } }
      removed.push(...paths)
      return { data: [], error: api.missingStorage ? { statusCode: '404', message: 'Object not found' } : null }
    } } } },
    async rpc(name, args) {
      rpcCalls.push({ name, args })
      if (name === 'purge_expired_operational_data') {
        if (api.failOperational) return { error: { message: 'synthetic RPC failure' } }
        const summary = {}
        for (const [table, key] of [['anonymous_analysis_sessions', 'anonymous_sessions_deleted'], ['anonymous_rate_limits', 'anonymous_rate_limit_rows_deleted'], ['rate_limit_reservations', 'stale_reservations_deleted'], ['job_analyses', 'job_analyses_deleted']]) { summary[key] = state[table].length; state[table] = [] }
        return { data: summary, error: null }
      }
      assert.equal(name, 'voice_delete_session')
      const row = state.voice_interview_sessions.find(s => s.id === args.p_session_id && s.user_id === args.p_user_id)
      if (!row) return { data: false, error: null }
      for (const answer of state.voice_interview_answers.filter(a => a.session_id === row.id)) state.voice_audio_cleanup.push({ audio_path: answer.audio_path, delete_after: future })
      state.voice_interview_sessions = state.voice_interview_sessions.filter(s => s !== row)
      state.voice_interview_answers = state.voice_interview_answers.filter(a => a.session_id !== row.id)
      return { data: true, error: null }
    },
  }
  return api
}
for (const [path, exports] of [
  ['../lib/voice/server.ts', { voiceAdmin: () => db }],
  ['../lib/supabase/serviceAdmin.ts', { createServiceRoleClient: () => db }],
]) { const id = require.resolve(path); require.cache[id] = { id, filename: id, loaded: true, exports } }
const { purgeDeletedVoiceSessions, VoiceRetentionError } = require('../lib/voice/retention.ts')
const { runRetention } = require('../lib/admin/retention.ts')
const cron = require('../app/api/cron/retention/route.ts')

db = database({ expired: 250, cleanup: 250, sessions: 25 })
let summary = await purgeDeletedVoiceSessions({ db, now: () => NOW })
assert.equal(summary.voice_expired_audio_before, 250)
assert.equal(summary.voice_expired_audio_after, 0)
assert.equal(summary.voice_cleanup_before, 250)
assert.equal(summary.voice_cleanup_after, 0)
assert.equal(summary.voice_deleting_sessions_before, 25)
assert.equal(summary.voice_deleting_sessions_after, 0)
assert.equal(summary.voice_items_processed, 575)
assert.ok(db.state.voice_interview_answers.every(a => a.transcript === 'keep transcript' && a.feedback.score === 5))
assert.ok(db.state.voice_audio_cleanup.every(q => q.delete_after === future), 'new delayed queue survives session cascade')
assert.equal(db.events[0].op, 'remove')
assert.equal(db.events[1].op, 'mark', 'metadata only advances after storage succeeds')

db = database({ expired: 2100 })
summary = await purgeDeletedVoiceSessions({ db, now: () => NOW, maxItems: 99999 })
assert.equal(summary.voice_items_processed, 2000)
assert.equal(summary.voice_expired_audio_after, 100)
assert.equal(summary.voice_item_limit_reached, 1)

db = database({ sessions: 1, answersPerSession: 2001 })
summary = await purgeDeletedVoiceSessions({ db, now: () => NOW })
assert.equal(summary.voice_items_processed, 0)
assert.equal(summary.voice_deleting_sessions_deferred, 1)
assert.equal(db.removed.length, 0, 'an oversized session cannot overrun the item cap')
assert.equal(db.state.voice_interview_sessions.length, 1)

db = database({ expired: 1 }); let clock = NOW
summary = await purgeDeletedVoiceSessions({ db, now: () => { clock += 100; return clock }, budgetMs: 1 })
assert.equal(summary.voice_time_limit_reached, 1)
assert.equal(db.removed.length, 0)

db = database({ expired: 1 }); db.failStorage = true
await assert.rejects(purgeDeletedVoiceSessions({ db, now: () => NOW }), error => error instanceof VoiceRetentionError && error.summary.voice_expired_audio_after === 1)
assert.equal(db.state.voice_interview_answers[0].audio_deleted_at, null)

db = database({ expired: 1 }); db.failMark = true
await assert.rejects(purgeDeletedVoiceSessions({ db, now: () => NOW }), /mark/)
assert.equal(db.state.voice_interview_answers[0].audio_deleted_at, null, 'marker failure remains retryable')

db = database({ expired: 1 }); db.missingBucket = true
await assert.rejects(purgeDeletedVoiceSessions({ db, now: () => NOW }), /storage removal/); assert.equal(db.state.voice_interview_answers[0].audio_deleted_at, null)
db = database({ cleanup: 1 }); db.failQueueDelete = true
await assert.rejects(purgeDeletedVoiceSessions({ db, now: () => NOW }), /delayed voice cleanup/); assert.equal(db.state.voice_audio_cleanup.length, 1)

db = database({ expired: 1 }); db.missingStorage = true
assert.equal((await purgeDeletedVoiceSessions({ db, now: () => NOW })).voice_expired_audio_after, 0)

db = database({ expired: 2, cleanup: 2 })
let result = await runRetention('admin')
assert.equal(result.ok, true)
assert.equal(db.state.maintenance_runs.length, 1)
assert.equal(db.state.maintenance_runs[0].ok, true)
assert.equal(result.summary.anonymous_sessions_deleted, 1)
assert.equal(result.summary.job_analyses_before, 1)
assert.equal(result.summary.job_analyses_after, 0)
assert.equal(result.summary.voice_expired_audio_removed, 2)

db = database({ expired: 1 }); db.failStorage = true
result = await runRetention('cron')
assert.equal(result.ok, false)
assert.equal(db.state.maintenance_runs.length, 1)
assert.equal(db.state.maintenance_runs[0].ok, false, 'no earlier operational-only success record')
assert.match(db.state.maintenance_runs[0].error, /^voice:/)
assert.equal(result.summary.anonymous_sessions_deleted, 1)

db = database(); db.failStart = true
assert.equal((await runRetention('cron')).ok, false)
assert.equal(db.rpcCalls.length, 0)
db = database(); db.failFinish = true
assert.equal((await runRetention('cron')).ok, false)
db = database(); db.failOperational = true
assert.equal((await runRetention('admin')).ok, false)
assert.equal(db.state.maintenance_runs[0].ok, false)
assert.match(db.state.maintenance_runs[0].error, /^operational:/)

const secretBefore = process.env.CRON_SECRET
try {
  delete process.env.CRON_SECRET
  db = database()
  assert.equal((await cron.GET(new Request('http://test/api/cron/retention'))).status, 503)
  process.env.CRON_SECRET = 'synthetic-cron-secret'
  assert.equal((await cron.GET(new Request('http://test/api/cron/retention', { headers: { authorization: 'Bearer wrong' } }))).status, 401)
  assert.equal(db.state.maintenance_runs.length, 0)
  assert.equal((await cron.GET(new Request('http://test/api/cron/retention', { headers: { authorization: 'Bearer synthetic-cron-secret' } }))).status, 200)
  assert.equal(db.state.maintenance_runs.length, 1)
  db = database({ expired: 1 }); db.failStorage = true
  assert.equal((await cron.GET(new Request('http://test/api/cron/retention', { headers: { authorization: 'Bearer synthetic-cron-secret' } }))).status, 500)
  assert.equal(cron.maxDuration, 180)
} finally { if (secretBefore === undefined) delete process.env.CRON_SECRET; else process.env.CRON_SECRET = secretBefore }
console.log('PASS voice retention: multi-batch backlog, 2000-item and time caps, scoped deletes, missing objects, storage/marker failures, one all-step audit log and fail-closed cron')
