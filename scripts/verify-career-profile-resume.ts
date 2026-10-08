import './resolve-paths'
import assert from 'node:assert/strict'
import * as React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { buildCareerProfileResume, isCareerProfileResume, CAREER_RESUME_BADGE } from '../lib/careerProfileResume'
import { buildResumeDocument } from '../lib/resumeDocument'
import { availableTemplates, getTemplate } from '../lib/templates'
import { makeTemplateFixture, makeLongTemplateFixture } from './fixtures/templateFixture'

;(globalThis as unknown as { React: unknown }).React = React
const fixture = makeTemplateFixture()
const profile = fixture.profile
const raw = buildCareerProfileResume(profile)
assert.equal(raw.summary, profile.professional_summary?.trim())
assert.equal(raw.header.displayName, profile.full_name)
const duties = buildCareerProfileResume({ ...profile, work_experience: [{ ...profile.work_experience[0], description: 'Own duty;', highlights: ['Own result!'] }] })
assert.deepEqual(duties.experience[0].bullets, ['Own duty;', 'Own result!'])
assert.equal(isCareerProfileResume({ tier: 'free' }), true)
assert.equal(isCareerProfileResume({ tier: null }), false)
const optimized = buildResumeDocument({ ...fixture, fieldVisibility: profile.field_visibility })
const frozen = JSON.stringify(optimized)
const changed = {
  ...profile, full_name: 'Updated Candidate', professional_summary: 'Updated own words',
  skills: [{ ...profile.skills[0], name: 'Updated skill' }],
  work_experience: [{ ...profile.work_experience[0], role: 'Updated role', highlights: ['Updated duty'] }],
  education: [{ ...profile.education[0], degree: 'Updated degree' }],
}
const latest = buildCareerProfileResume(changed)
assert.equal(latest.header.displayName, 'Updated Candidate')
assert.equal(latest.summary, 'Updated own words')
assert.ok(JSON.stringify(latest).includes('Updated duty'))
assert.ok(JSON.stringify(latest).includes('Updated skill'))
assert.ok(JSON.stringify(latest).includes('Updated degree'))
assert.equal(JSON.stringify(optimized), frozen)
const hidden = buildCareerProfileResume({ ...profile, field_visibility: { ...profile.field_visibility, email: false, photo: false, full_name: false } })
assert.equal(hidden.header.displayName, '')
assert.equal(hidden.header.showPhoto, false)
assert.ok(!hidden.header.contactItems?.some((i) => i.kind === 'email'))
const partial = { ...profile, professional_summary: null, work_experience: [], skills: [], certifications: [], education: [], additional_information: [], photo_url: null }
assert.equal(buildCareerProfileResume(partial).summary, '')
const templates = availableTemplates()
assert.equal(templates.length, 50)
for (const template of templates) {
  for (const candidate of [profile, changed, partial, { ...profile, photo_url: null }, makeLongTemplateFixture().profile]) {
    const document = buildCareerProfileResume(candidate)
    const html = renderToStaticMarkup(React.createElement(getTemplate(template.id).component, {
      profile: candidate, document, optimizedContent: { summary: { generated: '', source_profile_summary: '' }, experience_blocks: [] },
      skillsOrder: [], fieldVisibility: candidate.field_visibility,
      styleOverrides: { font: 'sans', accent: 'navy' },
    }))
    assert.ok(html.includes('resume-render'), template.id)
    assert.ok(!html.includes(CAREER_RESUME_BADGE), template.id + ': UI badge must never print')
    assert.ok(!html.includes('undefined'), template.id + ': no missing-value leakage')
  }
}
console.log('PASS: raw data, synchronization, visibility, partial/long profiles and 250 renders across all 50 templates')
