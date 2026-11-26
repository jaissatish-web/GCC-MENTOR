import assert from 'node:assert/strict'
import { webcrypto } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { runInNewContext } from 'node:vm'
import { transform } from 'sucrase'

const operationIds = []
const settled = new Set()
async function fetch(_url, { headers }) {
  const operationId = headers.get('Idempotency-Key')
  operationIds.push(operationId)
  if (operationIds.length === 2) {
    return Response.json({ error: 'Could not read Career Profile.' }, { status: 503 })
  }
  if (operationIds.length === 3) {
    return Response.json({ error: 'Try again later.' }, { status: 429 })
  }
  if (operationIds.length === 4) {
    return Response.json({ code: 'operation_replay_unavailable' }, { status: 503 })
  }
  if (operationIds.length === 5) {
    return Response.json({ code: 'operation_busy' }, { status: 409 })
  }
  if (operationIds.length === 7) {
    return Response.json({ code: 'operation_released' }, { status: 409 })
  }
  settled.add(operationId)
  if (operationIds.length === 1) throw new Error('Connection lost after settlement')
  return Response.json({ letter: { id: 'saved-letter' } })
}

const source = readFileSync(new URL('../lib/credits/usePremiumRequest.ts', import.meta.url), 'utf8')
const exports = {}
runInNewContext(transform(source, { transforms: ['typescript', 'imports'] }).code, {
  exports,
  require: () => ({
    useCallback: callback => callback,
    useRef: current => ({ current }),
    useState: initial => [initial, () => {}],
  }),
  crypto: webcrypto,
  fetch,
  Headers,
})

const { request } = exports.usePremiumRequest()
const send = () => request('/cover-letter', { method: 'POST', body: '{"fixture":true}' })
await assert.rejects(send(), /Connection lost after settlement/)
assert.equal((await send()).response.status, 503)
assert.equal((await send()).response.status, 429)
assert.equal((await send()).response.status, 503)
assert.equal((await send()).response.status, 409)
assert.equal((await send()).payload.letter.id, 'saved-letter')
assert.equal(new Set(operationIds).size, 1)
assert.equal(settled.size, 1)
assert.equal((await send()).payload.code, 'operation_released')
assert.notEqual(operationIds[6], operationIds[0], 'a new request after successful replay gets a new identity')
await send()
assert.notEqual(operationIds[7], operationIds[6], 'a released operation allows a fresh attempt')
