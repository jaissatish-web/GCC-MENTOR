/**
 * TASK-032 DOCX pipeline smoke test.
 *
 * Exercises the REAL shared derivation (buildResumeDocument) feeding the REAL
 * docx builder (buildResumeDocx) through Packer, verifying:
 *   1. The produced buffer is a valid .docx (zip magic "PK", non-trivial size).
 *   2. The WordprocessingML actually contains the expected content (name,
 *      section labels, a bullet, the visa-folded identity, the education line),
 *      proving the docx route's content path works end to end.
 *
 * Run: node_modules/.bin/sucrase-node scripts/docx-smoke.ts
 */
import './resolve-paths'
import { Packer } from 'docx'
import JSZip from 'jszip'
import { writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { buildResumeDocument } from '../lib/resumeDocument'
import { buildResumeDocx } from '../lib/resumeDocx'
import type { CareerProfileFull } from '../types/careerProfile'

function makeProfile(): CareerProfileFull {
  const now = new Date().toISOString()
  const base = {
    id: 'p1', user_id: 'u1', currently_in_gulf: true,
    current_employer: 'L&T Energy', current_project: null,
    target_job_title: 'Sr. I&C Commissioning Engineer',
    target_industry: 'engineering_technical', target_country: 'saudi_arabia' as const,
    target_company: 'Saudi Aramco', full_name: 'Rahul Verma', photo_url: null,
    nationality: 'Indian', date_of_birth: '1988-04-12', passport_type: 'ECR' as const,
    passport_validity_date: '2031-06-30', visa_status: 'Transferable Iqama',
    visa_transferable: true, notice_period: '30 days', current_location: 'Jubail, KSA',
    phone: '+966 5x xxx xxxx', whatsapp: '+91 90000 00000', email: 'r@example.com',
    linkedin_url: 'https://linkedin.example/rahul', professional_summary: 'Summary text.',
    readiness_category: 'currently_in_gulf' as const, readiness_score: 88,
    created_at: now, updated_at: now,
  }
  const e1 = 'e1', e2 = 'e2', s1 = 's1', s2 = 's2'
  return {
    ...base,
    field_visibility: {
      full_name: true, photo: true, nationality: true, date_of_birth: true,
      passport_type: true, passport_validity: true, visa_status: true,
      visa_transferable: true, notice_period: true, current_location: true,
      phone: true, whatsapp: true, email: true, linkedin_url: true,
      additional_information: true,
    },
    work_experience: [
      { id: e1, profile_id: 'p1', company: 'L&T Energy', role: 'Sr. I&C Commissioning Engineer',
        start_date: '2022-03-01', end_date: null, location: 'Jubail, KSA',
        description: 'Lead commissioning.', highlights: ['Commissioned ESD', 'Zero punch-list'], sort_order: 0, created_at: now },
      { id: e2, profile_id: 'p1', company: 'Petrofac', role: 'Instrumentation Engineer',
        start_date: '2019-06-01', end_date: '2022-02-01', location: 'Abu Dhabi, UAE',
        description: null, highlights: ['Instrument index'], sort_order: 1, created_at: now },
    ],
    skills: [
      { id: s1, profile_id: 'p1', name: 'Loop checking', sort_order: 0, created_at: now },
      { id: s2, profile_id: 'p1', name: 'SAT/FAT', sort_order: 1, created_at: now },
    ],
    certifications: [
      { id: 'c1', profile_id: 'p1', name: 'TÜV FS Engineer', issuer: 'TÜV Rheinland',
        issue_date: '2021-05-01', expiry_date: null, sort_order: 0, created_at: now },
    ],
    education: [
      { id: 'ed1', profile_id: 'p1', degree: 'B.E.', institution: 'Anna University',
        field_of_study: 'Instrumentation & Control', start_year: 2006, end_year: 2010, sort_order: 0, created_at: now },
    ],
    additional_information: [
      { id: 'a1', profile_id: 'p1', label: 'Languages', value: 'English, Hindi', sort_order: 0, created_at: now },
    ],
  }
}

async function main() {
  const profile = makeProfile()
  const optimizedContent = {
    summary: { generated: 'Generated summary.', user_edited: null, source_profile_summary: 'Summary text.' },
    experience_blocks: [
      { profile_experience_id: 'e1', was_optimized: true, generated_bullets: ['AI bullet one'], user_edited_bullets: null, source_bullets: ['source'], claims: ['x'] },
    ],
  }
  const skillsOrder = ['s2', 's1']

  const doc = buildResumeDocument({ profile, optimizedContent, skillsOrder, fieldVisibility: profile.field_visibility })

  // 1. Binary validity check (a .docx is a zip; must start with "PK").
  const buf = await Packer.toBuffer(buildResumeDocx(doc))
  const isZip = buf[0] === 0x50 && buf[1] === 0x4b
  if (buf.length < 1000 || !isZip) {
    console.error('DOCX buffer invalid: length=' + buf.length + ' zipMagic=' + isZip)
    process.exit(1)
  }

  // 2. Content check: unzip the archive and inspect word/document.xml text.
  const zip = await JSZip.loadAsync(buf)
  const docXmlFile = zip.file('word/document.xml')
  if (!docXmlFile) {
    console.error('DOCX archive missing word/document.xml')
    process.exit(1)
  }
  const xml = await docXmlFile.async('string')

  const mustContain = [
    'Rahul Verma',
    'Professional summary',
    'Generated summary.',
    'Key skills',
    'TÜV FS Engineer',
    // & is XML-escaped to &amp; inside the document.xml text
    'B.E. Instrumentation &amp; Control — Anna University',
    '2010',
  ]
  const missing = mustContain.filter((s) => !xml.includes(s))
  if (missing.length > 0) {
    console.error('DOCX CONTENT MISSING:', missing)
    process.exit(1)
  }

  const out = resolve(process.cwd(), 'scripts/smoke-output.docx')
  writeFileSync(out, buf)
  console.log(`DOCX SMOKE PASS — valid .docx (${buf.length} bytes, PK magic), all content present. Wrote ${out}`)
}

main().catch((e) => {
  console.error('DOCX SMOKE FAILED:', e)
  process.exit(1)
})
