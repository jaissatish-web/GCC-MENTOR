import assert from 'node:assert/strict'

/** Tests using assessable fixtures must fail rather than silently coerce a pending score to zero. */
export function assertKnownScore(value: number | null | undefined): number {
  assert.equal(typeof value, 'number', 'fixture must produce a numeric, assessable score')
  assert.ok(Number.isFinite(value), 'fixture score must be finite')
  return value as number
}
