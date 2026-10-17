import assert from 'node:assert/strict'
import { formatTrackerDate } from '../lib/trackerDates'

const previous = process.env.TZ
try {
  for (const zone of ['UTC', 'America/Los_Angeles', 'Asia/Riyadh', 'Asia/Kolkata', 'Pacific/Auckland']) {
    process.env.TZ = zone
    assert.equal(formatTrackerDate('2026-10-17'), '17 Oct 2026', `Calendar deadline shifted in ${zone}`)
    assert.equal(formatTrackerDate('2026-10-17', true), '17 Oct 2026')
    assert.equal(formatTrackerDate('invalid'), '')
    assert.equal(formatTrackerDate(''), '')
  }
  process.env.TZ = 'America/Los_Angeles'
  assert.match(formatTrackerDate('2026-10-17T00:30:00Z', true), /16 Oct 2026.*17:30.*(?:GMT-7|PDT)/)
  process.env.TZ = 'Asia/Riyadh'
  assert.match(formatTrackerDate('2026-10-17T23:30:00Z', true), /18 Oct 2026.*02:30.*(?:GMT\+3|AST)/)
  process.env.TZ = 'America/New_York'
  assert.match(formatTrackerDate('2026-11-01T05:30:00Z', true), /01:30.*(?:GMT-4|EDT)/)
  assert.match(formatTrackerDate('2026-11-01T06:30:00Z', true), /01:30.*(?:GMT-5|EST)/)
  console.log('Tracker dates preserve calendar days and show local interview times, years and DST offsets.')
} finally {
  if (previous === undefined) delete process.env.TZ
  else process.env.TZ = previous
}
