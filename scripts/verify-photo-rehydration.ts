/**
 * Assertions for showing a photo uploaded AFTER the CV was built.
 *
 *   node_modules/.bin/sucrase-node scripts/verify-photo-rehydration.ts
 *
 * The bug this guards (founder report, 2026-09-16): buildResumeDocument freezes
 * the header, so a CV built before the photo upload keeps `photoUrl: null` and
 * `showPhoto: false` in its document_snapshot (migration 034) for good. Both
 * renderers prefer the snapshot, so no later upload and no template switch ever
 * brought the photo back.
 *
 * Photo replacement now uses the live Career Profile photo (2026-10-08),
 * without changing delivered wording, mutating snapshots or unhiding fields.
 */

import './resolve-paths'
import { applyLivePhotoToDocument, type ResumeDocument } from '../lib/resumeDocument'
import type { FieldVisibility } from '../types/careerProfile'

let failures = 0
function check(name: string, cond: boolean) {
  if (cond) console.log(`  PASS  ${name}`)
  else {
    console.error(`  FAIL  ${name}`)
    failures++
  }
}

const VISIBLE = { photo: true } as unknown as Partial<FieldVisibility>
const HIDDEN = { photo: false } as unknown as Partial<FieldVisibility>

function doc(photoUrl: string | null, showPhoto: boolean): ResumeDocument {
  return {
    header: { photoUrl, showPhoto },
  } as unknown as ResumeDocument
}

const SIGNED = 'https://example.supabase.co/storage/v1/object/sign/profile-photos/u/a.jpg?token=x'
const PATH = 'user-id/photo.jpg'

console.log('\nA snapshot with no photo gets the live one')
const filled = applyLivePhotoToDocument(doc(null, false), PATH, VISIBLE)
check('photoUrl is filled in', filled.header.photoUrl === PATH)
check('showPhoto is turned on', filled.header.showPhoto === true)
check('a signed URL passes through untouched', applyLivePhotoToDocument(doc(null, false), SIGNED, VISIBLE).header.photoUrl === SIGNED)

console.log('\nPhoto replacement preserves the delivered content')
const delivered = doc('delivered.jpg', true)
const kept = applyLivePhotoToDocument(delivered, PATH, VISIBLE)
check('the preview and PDF get the latest photo', kept.header.photoUrl === PATH)
check('the original snapshot photo is untouched', delivered.header.photoUrl === 'delivered.jpg')
check('only the header is copied', Object.keys(kept).length === Object.keys(delivered).length)
const full = { ...delivered, summary: ['Frozen wording'], sections: [{ title: 'Frozen jobs' }] } as unknown as ResumeDocument
const replaced = applyLivePhotoToDocument(full, PATH, VISIBLE)
check('all non-photo content retains the same references', Object.keys(full).filter((key) => key !== 'header').every((key) => replaced[key as keyof ResumeDocument] === full[key as keyof ResumeDocument]))
check('a hidden delivered photo stays hidden', applyLivePhotoToDocument(doc('old.jpg', false), PATH, VISIBLE).header.showPhoto === false)

console.log('\nNothing is invented')
check('no live photo leaves the document alone', applyLivePhotoToDocument(doc(null, false), null, VISIBLE).header.showPhoto === false)
check('an empty string is not a photo', applyLivePhotoToDocument(doc(null, false), '', VISIBLE).header.photoUrl === null)
check('undefined is not a photo', applyLivePhotoToDocument(doc(null, false), undefined, VISIBLE).header.photoUrl === null)

console.log('\nVisibility is obeyed')
check('hidden photo may have a source but never prints', applyLivePhotoToDocument(doc(null, false), PATH, HIDDEN).header.showPhoto === false)
check('hidden field stays hidden after replacement', applyLivePhotoToDocument(delivered, PATH, HIDDEN).header.showPhoto === false)
check('photo hidden leaves showPhoto false', applyLivePhotoToDocument(doc(null, false), PATH, HIDDEN).header.showPhoto === false)
// visible() treats an absent key as visible ("hidden only when explicitly
// false"), so a profile that has never touched visibility still gets its photo.
check('absent visibility still shows the photo', applyLivePhotoToDocument(doc(null, false), PATH, null).header.photoUrl === PATH)
check('empty visibility object still shows the photo', applyLivePhotoToDocument(doc(null, false), PATH, {}).header.photoUrl === PATH)

console.log('\nThe input document is not mutated')
const original = doc(null, false)
applyLivePhotoToDocument(original, PATH, VISIBLE)
check('original still has no photo', original.header.photoUrl === null)
check('original still has showPhoto false', original.header.showPhoto === false)

if (failures > 0) {
  console.error(`\n${failures} check(s) failed`)
  process.exit(1)
}
console.log('\nAll photo-rehydration checks passed')
