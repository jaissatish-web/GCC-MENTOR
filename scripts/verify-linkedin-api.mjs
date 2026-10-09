import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
const require = createRequire(import.meta.url)
require('sucrase/register')
require('./resolve-paths.ts')
const stub = (path, exports) => {
  const id = require.resolve(path)
  require.cache[id] = { id, filename: id, loaded: true, exports }
}
let user = { id: 'owner', email: 'owner@example.test' }
let profile = require('./fixtures/templateFixture.ts').makeTemplateFixture()
  .profile
profile.user_id = 'owner'
let rows = new Map(),
  aiCalls = [],
  finishes = [],
  paused = false,
  rejectReview = false,
  race = false,
  profileRace = false,
  failWrite = false
const db = (service) => ({
  auth: { getUser: async () => ({ data: { user } }) },
  from(table) {
    const filters = []
    let patch, inserted
    const result = () => {
      if (table === 'career_profiles') {
        assert.ok(
          filters.some(
            ([key, value]) => key === 'user_id' && value === user.id,
          ),
        )
        return {
          data:
            profile && profile.user_id === user.id ? { id: profile.id } : null,
          error: null,
        }
      }
      assert.equal(table, 'linkedin_drafts')
      if (inserted) {
        assert.equal(service, true)
        if (rows.has(inserted.user_id))
          return { error: { code: '23505' }, data: null }
        if (failWrite) return { error: { code: 'XX' }, data: null }
        const row = {
          imported: null,
          setup: null,
          output: null,
          completed: [],
          skipped: [],
          selected_headline: 0,
          profile_fingerprint: null,
          ...inserted,
        }
        rows.set(row.user_id, row)
        return { data: structuredClone(row), error: null }
      }
      assert.ok(
        filters.some(([key, value]) => key === 'user_id' && value === user.id),
      )
      const row = rows.get(user.id)
      const matching =
        row && filters.every(([key, value]) => row[key] === value)
      if (patch && matching) {
        assert.equal(service, true)
        assert.ok(filters.some(([key]) => key === 'revision'))
        if (failWrite) return { error: { code: 'XX' }, data: null }
        Object.assign(row, patch)
      }
      return { data: matching ? structuredClone(row) : null, error: null }
    }
    const q = {
      select: () => q,
      eq: (key, value) => {
        filters.push([key, value])
        return q
      },
      insert: (value) => {
        inserted = value
        return q
      },
      update: (value) => {
        patch = value
        return q
      },
      maybeSingle: async () => result(),
    }
    return q
  },
})
stub('../lib/supabase/server.ts', { createClient: async () => db(false) })
stub('../lib/supabase/serviceAdmin.ts', {
  createServiceRoleClient: () => db(true),
})
stub('../lib/packages/profileLoader.ts', {
  loadCareerProfileFull: async (_client, id, userId) =>
    profile?.id === id && profile.user_id === userId
      ? structuredClone(profile)
      : null,
})
stub('../lib/ai/serviceGuard.ts', {
  reserveAiAction: async (options) =>
    paused
      ? { ok: false, status: 429, error: 'Daily limit.' }
      : {
          ok: true,
          finish: async (success) =>
            finishes.push({ action: options.action, success }),
        },
})
let generated
stub('../lib/ai/runTask.ts', {
  runAiTask: async (task) => {
    aiCalls.push(task)
    if (task.service === 'linkedin_review') {
      if (race) rows.get(user.id).revision = 'changed-in-another-tab'
      if (profileRace) profile.full_name = 'Updated during generation'
      return {
        value: {
          valid: !rejectReview,
          issues: rejectReview ? ['Unsupported claim'] : [],
        },
      }
    }
    assert.equal(task.grounding.mode, 'enforced')
    assert.ok(task.persona.includes('THIS candidate'))
    assert.equal(task.validateShape(generated), null)
    assert.equal(
      task.grounding.check(task.grounding.profile, generated).valid,
      true,
    )
    return { value: structuredClone(generated) }
  },
})
stub('../lib/resumeParse/pipeline.ts', {
  parseResume: async () => ({
    ok: true,
    draft: {
      full_name: profile.full_name,
      professional_summary: profile.professional_summary,
      work_experience: profile.work_experience,
    },
    report: { warnings: [] },
  }),
})
const { fingerprint } = require('../lib/linkedin/server.ts')
const { DEFAULT_SETUP } = require('../lib/linkedin/types.ts')
const { GET, PATCH } = require('../app/api/linkedin/route.ts')
const { POST: generate } = require('../app/api/linkedin/generate/route.ts')
const { POST: importProfile } = require('../app/api/linkedin/import/route.ts')
const request = (body, method = 'POST') =>
  new Request('https://fixture.test/api/linkedin', {
    method,
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  })
const setup = {
  ...DEFAULT_SETUP,
  targetRoles: 'Engineering',
  experienceIds: profile.work_experience.map((role) => role.id),
}
generated = {
  headlines: [
    profile.work_experience[0].role,
    profile.work_experience[0].role,
    profile.work_experience[0].role,
  ],
  about: profile.professional_summary,
  experience: profile.work_experience.map((role) => ({
    id: role.id,
    description:
      [role.description, ...(role.highlights ?? [])]
        .filter(Boolean)
        .join('\n') || role.role,
  })),
  skills: profile.skills.slice(0, 15).map((skill) => skill.name),
  advice: [
    'Review your genuine work.',
    'Emphasize saved strengths.',
    'Choose a professional photo.',
  ],
}
let body = { setup, revision: null, fingerprint: fingerprint(profile) }
user = null
assert.equal((await GET()).status, 401)
assert.equal((await generate(request(body))).status, 401)
assert.equal(
  (await importProfile(request({ text: 'x'.repeat(200) }))).status,
  401,
)
assert.equal((await PATCH(request({}, 'PATCH'))).status, 401)
assert.equal(aiCalls.length, 0)
user = { id: 'other' }
assert.equal((await generate(request(body))).status, 422)
assert.equal(rows.size, 0)
user = { id: 'owner' }
assert.equal(
  (
    await generate(
      request({ ...body, setup: { ...setup, experienceIds: ['other-owner'] } }),
    )
  ).status,
  400,
)
assert.equal(
  (await generate(request({ ...body, fingerprint: 'stale' }))).status,
  409,
)
paused = true
assert.equal((await generate(request(body))).status, 429)
assert.equal(aiCalls.length, 0)
paused = false
assert.equal((await generate(request(body))).status, 200)
assert.equal(rows.size, 1)
assert.equal(aiCalls.length, 2)
assert.deepEqual(finishes.at(-1), {
  action: 'linkedin_optimization',
  success: true,
})
const before = structuredClone(rows.get('owner'))
assert.equal((await generate(request(body))).status, 409)
assert.equal(rows.size, 1)
body.revision = before.revision
rejectReview = true
assert.equal((await generate(request(body))).status, 422)
assert.deepEqual(rows.get('owner'), before)
assert.equal(finishes.at(-1).success, false)
rejectReview = false
race = true
assert.equal((await generate(request(body))).status, 409)
assert.deepEqual(rows.get('owner').output, before.output)
assert.equal(finishes.at(-1).success, false)
race = false
const previousName = profile.full_name
profileRace = true
body.revision = rows.get('owner').revision
assert.equal((await generate(request(body))).status, 409)
assert.deepEqual(rows.get('owner').output, before.output)
assert.equal(finishes.at(-1).success, false)
assert.equal((await (await GET()).json()).stale, true)
profile.full_name = previousName
profileRace = false
body.revision = rows.get('owner').revision
failWrite = true
assert.equal((await generate(request(body))).status, 503)
assert.equal(finishes.at(-1).success, false)
failWrite = false
const current = structuredClone(rows.get('owner'))
assert.equal(
  (await PATCH(request({ ...current, revision: 'wrong' }, 'PATCH'))).status,
  409,
)
assert.equal(
  (await PATCH(request({ ...current, completed: ['other-task'] }, 'PATCH')))
    .status,
  400,
)
assert.equal(
  (
    await PATCH(
      request(
        { ...current, completed: ['about'], skipped: ['about'] },
        'PATCH',
      ),
    )
  ).status,
  400,
)
assert.equal(
  (await PATCH(request({ ...current, completed: ['about'] }, 'PATCH'))).status,
  200,
)
const marked = structuredClone(rows.get('owner'))
assert.equal(
  (
    await PATCH(
      request(
        {
          ...marked,
          output: {
            ...marked.output,
            about: marked.output.about + '\nUser edited.',
          },
        },
        'PATCH',
      ),
    )
  ).status,
  200,
)
assert.equal(rows.get('owner').completed.includes('about'), false)
assert.equal(
  (
    await importProfile(
      request({ revision: rows.get('owner').revision, text: 'x'.repeat(200) }),
    )
  ).status,
  200,
)
assert.deepEqual(
  rows.get('owner').output,
  marked.output.about === rows.get('owner').output.about
    ? marked.output
    : { ...marked.output, about: marked.output.about + '\nUser edited.' },
)
assert.equal(finishes.at(-1).action, 'profile_extraction')
const imported = rows.get('owner')
const importBody = {
  setup: { ...setup, source: 'paste' },
  revision: imported.revision,
  fingerprint: fingerprint(profile),
  importId: imported.imported.id,
  acknowledged: [],
}
assert.equal((await generate(request(importBody))).status, 422)
assert.equal(
  (await generate(request({ ...importBody, confirmImport: true }))).status,
  200,
)
user = { id: 'other' }
const ownGet = await GET()
assert.equal(ownGet.status, 422)
profile = { ...profile, user_id: 'other' }
assert.equal((await (await GET()).json()).draft, null)
console.log(
  'PASS: actual LinkedIn API auth/ownership, quotas, two-stage checks, failed/raced saves, no duplicates, editing/checklist, import confirmation and no Career Profile writes',
)
