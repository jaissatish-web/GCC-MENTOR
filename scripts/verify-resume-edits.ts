/**
 * Per-resume edits of every field (2026-09-17). No network, no database.
 *
 *   node_modules/.bin/sucrase-node scripts/verify-resume-edits.ts
 */

import './resolve-paths'
import { sanitizeEditedDocument, withSyncedIdentity, ResumeEditError } from '../lib/resumeEdits'
import type { ResumeDocument } from '../lib/resumeDocument'

let failures = 0
function check(name: string, cond: boolean) {
  if (cond) console.log(`  PASS  ${name}`)
  else {
    console.error(`  FAIL  ${name}`)
    failures++
  }
}

const existing: ResumeDocument = {
  header: {
    showPhoto: true,
    photoUrl: 'user/photo.jpg',
    displayName: 'Asha Rao',
    targetJobTitle: 'Electrical Engineer',
    hasAnyIdentity: true,
    identityPrimary: 'Indian · Dubai',
    identityContact: '+971500000000 · asha@example.com',
    identityGulf: '',
    hasHeaderText: true,
    contactItems: [
      { kind: 'nationality', text: 'Indian' },
      { kind: 'location', text: 'Dubai' },
      { kind: 'phone', text: '+971500000000' },
      { kind: 'email', text: 'asha@example.com' },
    ],
  },
  summary: 'Electrical engineer.',
  experience: [
    {
      entry: { id: 'r1', role: 'Electrical Engineer', company: 'Acme', sort_order: 0 } as ResumeDocument['experience'][number]['entry'],
      bullets: ['Tested LV panels'],
      range: 'Jan 2020 — Present',
      companyLine: 'Acme · Dubai',
    },
  ],
  skills: [{ id: 's1', profile_id: 'p', name: 'AutoCAD', sort_order: 0, created_at: '' }],
  certifications: [{ entry: { id: 'c1' } as ResumeDocument['certifications'][number]['entry'], display: 'NEBOSH IGC' }],
  education: [{ entry: { id: 'e1' } as ResumeDocument['education'][number]['entry'], line: 'B.E. Electrical', years: '2014—2018' }],
  additional: [],
}

const edited = JSON.parse(JSON.stringify(existing)) as ResumeDocument
edited.header.displayName = 'Asha R.'
edited.header.targetJobTitle = 'Senior Electrical Engineer'
edited.header.photoUrl = 'https://evil.example/x.jpg'
edited.experience[0].entry.role = 'Senior Electrical Engineer'
edited.experience[0].range = 'Jan 2019 — Present'
edited.experience[0].companyLine = 'Acme Power · Abu Dhabi'
edited.experience[0].bullets = ['Tested LV and MV panels', '   ', 'Commissioned substations']
edited.experience.push({
  entry: { id: 'role-new-abc', role: 'Site Engineer', company: 'Beta', sort_order: 1 } as ResumeDocument['experience'][number]['entry'],
  bullets: ['Supervised cabling'],
  range: '2016 — 2018',
  companyLine: 'Beta · Sharjah',
})
edited.skills = [
  { id: 'skill-new-1', profile_id: '', name: 'ETAP', sort_order: 0, created_at: '' },
  { id: 's1', profile_id: 'p', name: 'AutoCAD', sort_order: 1, created_at: '' },
]
edited.certifications = []
edited.education[0].years = '2013—2017'
edited.additional = [{ entry: { id: 'info-new-1' } as ResumeDocument['additional'][number]['entry'], display: 'Languages: English, Hindi' }]
;(edited as unknown as Record<string, unknown>).evil = '<script>'

const out = sanitizeEditedDocument(edited, existing)
check('name and headline are editable', out.header.displayName === 'Asha R.' && out.header.targetJobTitle === 'Senior Electrical Engineer')
check('the stored photo is kept; an edited photo URL is ignored', out.header.photoUrl === 'user/photo.jpg' && out.header.showPhoto === true)
check('role title, dates and company line are editable', out.experience[0].entry.role === 'Senior Electrical Engineer' && out.experience[0].range === 'Jan 2019 — Present' && out.experience[0].companyLine === 'Acme Power · Abu Dhabi')
check('blank activities are dropped, others kept in order', JSON.stringify(out.experience[0].bullets) === JSON.stringify(['Tested LV and MV panels', 'Commissioned substations']))
check('a role can be added', out.experience.length === 2 && out.experience[1].entry.role === 'Site Engineer')
check('skills can be added and reordered', out.skills.map((s) => s.name).join() === 'ETAP,AutoCAD' && out.skills[1].sort_order === 1)
check('a whole section can be emptied', out.certifications.length === 0)
check('education years are editable', out.education[0].years === '2013—2017')
check('additional information can be added', out.additional[0].display === 'Languages: English, Hindi')
check('unknown top-level fields are not stored', !('evil' in (out as unknown as Record<string, unknown>)))

const hostile = JSON.parse(JSON.stringify(existing)) as ResumeDocument
hostile.summary = 'x'.repeat(10_000) + String.fromCharCode(7)
hostile.experience[0].entry.id = '../../etc/passwd'
hostile.header.contactItems = [{ kind: 'bogus' as never, text: 'hello' }]
const safe = sanitizeEditedDocument(hostile, existing)
check('long text is capped', safe.summary.length <= 4000)
check('control characters are stripped', !safe.summary.includes(String.fromCharCode(7)))
check('an unsafe id is replaced with a generated one', /^role-/.test(safe.experience[0].entry.id))
check('an unknown contact kind is coerced to a known one', safe.header.contactItems?.[0].kind === 'location')

let threw = false
try {
  sanitizeEditedDocument('not a document', existing)
} catch (e) {
  threw = e instanceof ResumeEditError
}
check('a non-object document is rejected', threw)

const synced = withSyncedIdentity({
  ...existing,
  header: { ...existing.header, contactItems: [{ kind: 'location', text: 'Doha' }, { kind: 'email', text: 'a@b.co' }] },
})
check('identity lines follow edited contact items', synced.header.identityPrimary === 'Doha' && synced.header.identityContact === 'a@b.co' && synced.header.identityGulf === '')
const legacy = { ...existing, header: { ...existing.header, contactItems: undefined } }
check('documents without contact items keep their lines', withSyncedIdentity(legacy).header.identityPrimary === 'Indian · Dubai')

console.log(failures === 0 ? '\nAll resume-edit checks passed' : `\n${failures} check(s) failed`)
process.exit(failures === 0 ? 0 : 1)
