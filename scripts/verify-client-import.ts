import './resolve-paths'
import assert from 'node:assert/strict'
import { requestResumeImport, uploadResumeFile } from '../lib/resumeParse/clientImport'

async function main() {
  const realFetch = globalThis.fetch
  let uploads = 0
  let uploaded: File | null = null
  globalThis.fetch = async (_url, init) => {
    uploads++
    uploaded = (init?.body as FormData).get('file') as File
    return Response.json({ draft: { full_name: 'Test Person' }, report: { warnings: [] } })
  }
  try {
    const file = new File(['%PDF-test'], 'resume.pdf')
    const result = await requestResumeImport(() => uploadResumeFile(file))
    assert.equal(result.ok, true)
    assert.equal(uploads, 1)
    assert.notEqual(uploaded, file, 'request must use buffered bytes, not the picker handle')
    assert.equal((uploaded as File | null)?.name, file.name)
    assert.equal(await (uploaded as File | null)?.text(), '%PDF-test')

    const unreadable = new File(['resume'], 'resume.pdf')
    unreadable.arrayBuffer = async () => { throw new DOMException('Unavailable provider handle', 'NotReadableError') }
    const unavailable = await requestResumeImport(() => uploadResumeFile(unreadable))
    assert.equal(unavailable.ok, false)
    if (!unavailable.ok) {
      assert.match(unavailable.error, /Download the resume to your device/)
      assert.equal(unavailable.checkSaved, false)
    }
    const partial = new File(['resume'], 'resume.pdf')
    partial.arrayBuffer = async () => new ArrayBuffer(1)
    for (const refused of [partial, new File([], 'empty.pdf'), new File(['x'], 'old.doc'), new File(['x'], 'photo.jpg'), new File([new Uint8Array(2 * 1024 * 1024 + 1)], 'large.docx')]) {
      assert.equal((await requestResumeImport(() => uploadResumeFile(refused))).ok, false)
    }
    assert.equal(uploads, 1, 'unreadable/invalid files must never start extraction')
  } finally {
    globalThis.fetch = realFetch
  }

  const disconnected = await requestResumeImport(async () => { throw new TypeError('Failed to fetch') })
  assert.equal(disconnected.ok, false)
  if (!disconnected.ok) assert.equal(disconnected.checkSaved, true)

  const lostBody = new Response('{}')
  lostBody.json = async () => { throw new TypeError('Connection lost while receiving JSON') }
  const interrupted = await requestResumeImport(async () => lostBody)
  assert.equal(interrupted.ok, false)
  if (!interrupted.ok) assert.equal(interrupted.checkSaved, true)

  const expired = await requestResumeImport(async () => new Response('Unauthorized', { status: 401 }))
  assert.equal(expired.ok, false)
  if (!expired.ok) {
    assert.match(expired.error, /sign in again/)
    assert.equal(expired.checkSaved, false)
  }
  const huge = await requestResumeImport(async () => new Response('Platform body limit', { status: 413 }))
  assert.equal(huge.ok, false)
  if (!huge.ok) assert.match(huge.error, /too large/)
  const timeout = await requestResumeImport(async () => new Response('Platform timeout', { status: 504 }))
  assert.equal(timeout.ok, false)
  if (!timeout.ok) assert.equal(timeout.checkSaved, true)

  const recreation = { limit: 2, used: 2, remaining: 0, resetsOnLabel: 'next month' }
  const limit = await requestResumeImport(async () => Response.json({ code: 'RECREATE_LIMIT', error: 'Monthly limit reached', recreation }, { status: 429 }))
  assert.equal(limit.ok, false)
  if (!limit.ok) {
    assert.equal(limit.error, 'Monthly limit reached')
    assert.deepEqual(limit.recreation, recreation)
    assert.equal(limit.checkSaved, false)
  }
  const scanned = await requestResumeImport(async () => Response.json({ error: 'Upload a text PDF instead.', code: 'PDF_SCANNED' }, { status: 422 }))
  assert.equal(scanned.ok, false)
  if (!scanned.ok) assert.equal(scanned.error, 'Upload a text PDF instead.')
  console.log('PASS buffered file upload, inaccessible/partial/invalid file refusal, dropped response recovery, HTTP errors, and quota handling')
}

main().catch((error) => { console.error(error); process.exitCode = 1 })
