/**
 * TASK-032 no-regression verifier for the GulfPremium refactor.
 *
 * Iterates ALL 2^15 = 32768 field_visibility permutations on a rich full
 * fixture, renders the REAL GulfPremium component to static HTML, and records
 * a per-permutation md5. Run twice:
 *   node_modules/.bin/sucrase-node scripts/verify-resume.ts          -> verifies
 *   node_modules/.bin/sucrase-node scripts/verify-resume.ts --golden  -> captures
 *
 * This is the strongest possible check that the derivation→module refactor did
 * not change rendered output: if any permutation emits different HTML (a
 * dangling separator, an orphan label, a changed string, a visa-folding
 * difference, a nul leak — anything), one of the 32768 hashes flips and the
 * verify PASS turns into a FAIL with the exact permutation index.
 *
 * GulfPremium.tsx uses Next's automatic JSX runtime (no React import), so under
 * sucrase we inject a global `React` before rendering — same as the load test.
 */
import './resolve-paths'
import { createElement } from 'react'
import * as React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { createHash } from 'node:crypto'
import { writeFileSync, existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import GulfPremium from '../components/templates/GulfPremium'
import type { CareerProfileFull, FieldVisibility } from '../types/careerProfile'
import type { OptimizedContent } from '../types/package'

;(globalThis as unknown as { React: unknown }).React = React

// Rich fixture: every field populated so every render branch (all three
// identity lines, visa folding, summary, multi-bullet experience, skills with
// ids, certifications with issue dates, education with years, additional) is
// exercised under every visibility combination.
function makeFixture(): {
  profile: CareerProfileFull
  optimizedContent: OptimizedContent
  skillsOrder: string[]
} {
  const now = new Date().toISOString()
  const base = {
    id: 'p-00000000-0000-0000-0000-000000000001',
    user_id: 'u-00000000-0000-0000-0000-000000000002',
    currently_in_gulf: true,
    current_employer: 'L&T Energy',
    current_project: null,
    target_job_title: 'Sr. I&C Commissioning Engineer',
    target_industry: 'engineering_technical',
    target_country: 'saudi_arabia' as const,
    target_company: 'Saudi Aramco',
    full_name: 'Rahul Verma',
    photo_url: 'https://example.com/photo.jpg',
    nationality: 'Indian',
    date_of_birth: '1988-04-12',
    passport_type: 'ECR' as const,
    passport_validity_date: '2031-06-30',
    visa_status: 'Transferable Iqama',
    visa_transferable: true,
    notice_period: '30 days',
    current_location: 'Jubail, KSA',
    phone: '+966 5x xxx xxxx',
    whatsapp: '+91 90000 00000',
    email: 'rahul.verma@example.com',
    linkedin_url: 'https://linkedin.example/rahulverma',
    professional_summary:
      'Instrumentation & Control commissioning engineer with 12+ years delivering upstream and downstream projects for Aramco- and ADNOC-standard megaprojects across the Gulf.',
    readiness_category: 'currently_in_gulf' as const,
    readiness_score: 88,
    has_driving_license: null,
    driving_license_country: null,
    driving_license_category: null,
    driving_license_validity_date: null,
    created_at: now,
    updated_at: now,
  }

  const people = [
    '00000000-0000-0000-0000-000000000010',
    '00000000-0000-0000-0000-000000000011',
    '00000000-0000-0000-0000-000000000012',
    '00000000-0000-0000-0000-000000000013',
    '00000000-0000-0000-0000-000000000014',
    '00000000-0000-0000-0000-000000000015',
  ]

  const profile: CareerProfileFull = {
    ...base,
    field_visibility: {
      full_name: true,
      photo: true,
      nationality: true,
      date_of_birth: true,
      passport_type: true,
      passport_validity: true,
      visa_status: true,
      visa_transferable: true,
      notice_period: true,
      current_location: true,
      phone: true,
      whatsapp: true,
      email: true,
      linkedin_url: true,
      additional_information: true,
    },
    work_experience: [
      {
        id: people[0],
        profile_id: base.id,
        company: 'L&T Energy',
        role: 'Sr. I&C Commissioning Engineer',
        start_date: '2022-03-01',
        end_date: null,
        location: 'Jubail, KSA',
        description: 'Lead commissioning of ESD, F&G and DCS systems.',
        highlights: ['Commissioned ESD and F&G logic', 'Oversaw 40+ field engineers', 'Cut loop-check rework'],
        sort_order: 0,
        created_at: now,
        gcc_country: 'saudi_arabia',
      },
      {
        id: people[1],
        profile_id: base.id,
        company: 'Petrofac',
        role: 'Instrumentation Engineer',
        start_date: '2019-06-01',
        end_date: '2022-02-01',
        location: 'Abu Dhabi, UAE',
        description: 'Design and site support for EPC projects.',
        highlights: ['Instrument index for 2,000+ instruments', 'Supported FAT/SAT to ADNOC standards'],
        sort_order: 1,
        created_at: now,
        gcc_country: 'uae',
      },
    ],
    skills: [
      { id: people[2], profile_id: base.id, name: 'Loop checking', sort_order: 0, created_at: now },
      { id: people[3], profile_id: base.id, name: 'SAT/FAT', sort_order: 1, created_at: now },
      { id: people[4], profile_id: base.id, name: 'AutoCAD', sort_order: 2, created_at: now },
      { id: people[5], profile_id: base.id, name: 'DCS / ESD', sort_order: 3, created_at: now },
    ],
    certifications: [
      {
        id: people[0],
        profile_id: base.id,
        name: 'TÜV Functional Safety (FS Engineer)',
        issuer: 'TÜV Rheinland',
        issue_date: '2021-05-01',
        expiry_date: null,
        sort_order: 0,
        created_at: now,
      },
    ],
    education: [
      {
        id: people[1],
        profile_id: base.id,
        degree: 'B.E.',
        institution: 'Anna University',
        field_of_study: 'Instrumentation & Control',
        start_year: 2006,
        end_year: 2010,
        sort_order: 0,
        created_at: now,
      },
    ],
    additional_information: [
      {
        id: people[2],
        profile_id: base.id,
        label: 'Languages',
        value: 'English, Hindi, Arabic (basic)',
        sort_order: 0,
        created_at: now,
      },
      {
        id: people[3],
        profile_id: base.id,
        label: 'Award',
        value: 'Aramco HSE Recognition 2023',
        sort_order: 1,
        created_at: now,
      },
    ],
  }

  const optimizedContent = {
    summary: {
      generated: 'Generated summary line for the target.',
      user_edited: null,
      source_profile_summary: base.professional_summary,
    },
    experience_blocks: [
      {
        profile_experience_id: people[0],
        was_optimized: true,
        generated_bullets: ['AI-generated bullet one', 'AI-generated bullet two'],
        user_edited_bullets: null,
        source_bullets: ['source bullet'],
        claims: ['claim'],
      },
    ],
  }

  const skillsOrder = [
    people[3],
    people[2],
    people[5],
    people[4],
  ]

  return { profile, optimizedContent, skillsOrder }
}

const KEYS: (keyof FieldVisibility)[] = [
  'full_name',
  'photo',
  'nationality',
  'date_of_birth',
  'passport_type',
  'passport_validity',
  'visa_status',
  'visa_transferable',
  'notice_period',
  'current_location',
  'phone',
  'whatsapp',
  'email',
  'linkedin_url',
  'additional_information',
]
const N = KEYS.length
const COMBOS = 1 << N

function md5(s: string): string {
  return createHash('md5').update(s).digest('hex')
}

function main() {
  const goldenPath = resolve(process.cwd(), 'scripts/resume.golden.txt')
  const capture = process.argv.includes('--golden')
  const { profile, optimizedContent, skillsOrder } = makeFixture()

  const hashes: string[] = []
  for (let mask = 0; mask < COMBOS; mask++) {
    const fv: Partial<FieldVisibility> = {}
    for (let b = 0; b < N; b++) if (mask & (1 << b)) fv[KEYS[b]] = true
    const out = renderToStaticMarkup(
      createElement(GulfPremium, {
        profile,
        optimizedContent,
        skillsOrder,
        fieldVisibility: fv,
      })
    )
    hashes.push(md5(out))
  }

  if (capture) {
    writeFileSync(goldenPath, hashes.join('\n') + '\n')
    console.log(`CAPTURED golden baseline: ${COMBOS} permutation hashes -> ${goldenPath}`)
    return
  }

  if (!existsSync(goldenPath)) {
    console.error('No golden baseline found. Run with --golden first (pre-refactor).')
    process.exit(2)
  }
  const golden = readFileSync(goldenPath, 'utf-8').trim().split('\n')
  if (golden.length !== COMBOS) {
    console.error(`Golden has ${golden.length} lines, expected ${COMBOS}. Re-capture with --golden.`)
    process.exit(2)
  }
  let mismatches = 0
  let first = -1
  for (let i = 0; i < COMBOS; i++) {
    if (golden[i] !== hashes[i]) {
      mismatches++
      if (first === -1) first = i
    }
  }
  if (mismatches === 0) {
    console.log(`VERIFY PASS — all ${COMBOS} permutations produce byte-identical HTML (no output change).`)
  } else {
    console.error(
      `VERIFY FAIL — ${mismatches}/${COMBOS} permutations differ. First mismatch at mask ${first} (${KEYS.map((k, b) => (first & (1 << b)) && k).filter(Boolean).join(',') || 'none'}).`
    )
    process.exit(1)
  }
}

main()
