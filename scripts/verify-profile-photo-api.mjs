/** Actual upload handler with an isolated storage/session fixture; no live user writes. */
import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
const require = createRequire(import.meta.url)
require('sucrase/register')
require('./resolve-paths.ts')
let user = { id: 'owner' }
let profile = { id: 'profile', user_id: 'owner', photo_url: null }
let failUpdate = false
const objects = new Map()
const removed = []
const session = {
  auth: { getUser: async () => ({ data: { user } }) },
  from(table) {
    assert.equal(table, 'career_profiles')
    const filters = []
    let update
    const result = () => {
      assert.ok(filters.some(([key, value]) => key === 'user_id' && value === user.id))
      const own = profile && filters.every(([key, value]) => profile[key] === value)
      if (update && own && !failUpdate) Object.assign(profile, update)
      return { data: own ? { ...profile } : null, error: update && failUpdate ? { message: 'fixture update failure' } : null }
    }
    const q = {
      select: () => q,
      update: (value) => { update = value; return q },
      eq: (key, value) => { filters.push([key, value]); return q },
      maybeSingle: async () => result(),
      then: (resolve, reject) => Promise.resolve(result()).then(resolve, reject),
    }
    return q
  },
  storage: { from(bucket) {
    assert.equal(bucket, 'profile-photos')
    return {
      upload: async (path, file, options) => {
        assert.ok(path.startsWith('owner/'))
        assert.equal(options.upsert, false)
        objects.set(path, file)
        return { error: null }
      },
      remove: async (paths) => { for (const path of paths) { objects.delete(path); removed.push(path) } return { error: null } },
      createSignedUrl: async (path) => ({ data: { signedUrl: `https://fixture.test/${path}?signed=1` }, error: null }),
    }
  } },
}
const id = require.resolve('../lib/supabase/server.ts')
require.cache[id] = { id, filename: id, loaded: true, exports: { createClient: async () => session } }
const { POST } = require('../app/api/profile/photo/route.ts')
const { validatePhoto } = require('../lib/storage/profilePhoto.ts')
const image = (type = 'image/png', bytes = [137, 80, 78, 71]) => new File([Uint8Array.from([...bytes, ...Array(120).fill(0)])], 'photo.png', { type })
const upload = (file) => { const body = new FormData(); if (file) body.set('photo', file); return POST(new Request('http://localhost/api/profile/photo', { method: 'POST', body })) }
user = null
assert.equal((await upload(image())).status, 401)
assert.equal(objects.size, 0)
user = { id: 'owner' }
assert.equal((await upload()).status, 400)
assert.equal((await upload(image('image/svg+xml'))).status, 400)
assert.equal((await upload(image('image/png', [1, 2, 3, 4]))).status, 400)
assert.ok(await validatePhoto(new File([new Uint8Array(5 * 1024 * 1024 + 1)], 'large.png', { type: 'image/png' })))
assert.equal(await validatePhoto(image('image/jpeg', [255, 216, 255])), null)
assert.equal(await validatePhoto(image('image/webp', [82, 73, 70, 70, 0, 0, 0, 0, 87, 69, 66, 80])), null)
profile.user_id = 'other'
assert.equal((await upload(image())).status, 404)
assert.equal(objects.size, 0)
profile.user_id = 'owner'
const first = await upload(image())
assert.equal(first.status, 200)
assert.ok((await first.json()).photoUrl.startsWith('https://fixture.test/owner/'))
const firstPath = profile.photo_url
assert.ok(firstPath.startsWith('owner/'))
assert.equal((await upload(image())).status, 200)
assert.notEqual(profile.photo_url, firstPath)
assert.ok(removed.includes(firstPath))
assert.equal(objects.size, 1)
const savedPath = profile.photo_url
failUpdate = true
assert.equal((await upload(image())).status, 500)
assert.equal(profile.photo_url, savedPath)
assert.equal(objects.size, 1) // failed write cleaned the new orphan, kept the previous photo
console.log('PASS: actual photo API auth, ownership, formats/magic bytes/size, first upload, replacement, signed display and failed-save cleanup')
