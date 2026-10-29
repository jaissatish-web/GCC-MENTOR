import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { PGlite } from '@electric-sql/pglite'

// Exercise the actual content seed, including legacy empty rows, reruns and drafts.
const db = new PGlite()
await db.exec(`CREATE TABLE site_content (
  slug text PRIMARY KEY, title text NOT NULL, body text NOT NULL DEFAULT '',
  published boolean NOT NULL DEFAULT false, updated_at timestamptz NOT NULL DEFAULT now()
); INSERT INTO site_content (slug,title) VALUES ('privacy','Privacy Policy');`)
const seed = await readFile(new URL('./seed-legal-policies.sql', import.meta.url), 'utf8')
await db.exec(seed)
let { rows } = await db.query('SELECT * FROM site_content ORDER BY slug')
assert.equal(rows.length, 5)
assert.deepEqual(rows.map(row => row.slug), ['cookies', 'disclaimer', 'privacy', 'refund', 'terms'])
for (const row of rows) {
  assert.equal(row.published, true)
  assert.ok(row.body.length > 2000, `${row.slug}: substantive content`)
  assert.equal(row.updated_at.toISOString(), '2026-10-29T00:00:00.000Z')
}
await db.exec(`UPDATE site_content SET body='Founder draft', published=false WHERE slug='privacy';`)
await db.exec(seed)
;({ rows } = await db.query("SELECT body,published FROM site_content WHERE slug='privacy'"))
assert.deepEqual(rows, [{ body: 'Founder draft', published: false }])
await db.close()
console.log('Legal seed: five policies, date, idempotency and founder draft preservation passed.')
