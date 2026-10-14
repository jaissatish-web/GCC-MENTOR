import './resolve-paths'
import assert from 'node:assert/strict'
import * as React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { Packer } from 'docx'
import JSZip from 'jszip'
import { makeQualitySample, SAMPLE_PROFESSIONS } from '../lib/resumeQualitySamples'
import { buildCareerProfileResume } from '../lib/careerProfileResume'
import { normalizeDraft } from '../lib/ai/extractionPrompt'
import { checkDraft } from '../lib/resumeParse/check'
import { prepass } from '../lib/resumeParse/prepass'
import { profileHeadline, setProfileHeadline, resolveProfileHeadline, isHeadlineEntry } from '../lib/resumeHeadline'
import { sanitizeEditedDocument } from '../lib/resumeEdits'
import { resolvePackageResumeDocument } from '../lib/packageResumeDocument'
import { mergeDraftIntoProfile } from '../lib/profileMerge'
import { buildResumeDocx } from '../lib/resumeDocx'
import { availableTemplates, getTemplate } from '../lib/templates'
import { makeTemplateFixture } from './fixtures/templateFixture'

;(globalThis as unknown as { React: unknown }).React = React
const ids = ['ats_professional', 'gcc_professional', 'senior_professional']
const textOf = (s: string) => s.replace(/<[^>]+>/g, ' ').replace(/&amp;/g, '&').replace(/&#x27;|&#39;/g, "'").replace(/&quot;/g, '"').replace(/\s+/g, ' ').trim()
const norm = (s: string) => s.normalize('NFKC').replace(/[^\p{L}\p{N}]/gu, '').toLowerCase()
let cases = 0, renders = 0

async function main() {
  for (let profession = 0; profession < 20; profession++) for (let pattern = 0; pattern < 5; pattern++) for (let variation = 0; variation < 20; variation++) {
    const profile = makeQualitySample(profession, pattern, variation)
    const before = JSON.stringify(profile)
    const doc = buildCareerProfileResume(profile)
    const headline = profileHeadline(profile.additional_information)!
    assert.equal(doc.header.targetJobTitle, headline.show_on_resume === false ? '' : headline.value)
    assert.equal(doc.experience.length, profile.work_experience.length)
    assert.equal(doc.skills.length, profile.skills.length)
    assert.equal(doc.additional.some(a => isHeadlineEntry(a.entry)), false)
    assert.equal(doc.additional.some(a => a.entry.category_name === 'Projects'), variation !== 15)
    assert.equal(doc.header.contactItems?.some(c => c.kind === 'email'), variation !== 17)
    for (const id of ids) {
      const html = renderToStaticMarkup(React.createElement(getTemplate(id).component, {
        document: doc, profile, optimizedContent: { summary: { generated: '', source_profile_summary: '' }, experience_blocks: [] },
      }))
      const text = norm(textOf(html))
      assert.ok(text.startsWith(norm(profile.full_name)), `${id}: name first`)
      assert.ok(!/undefined|NaN|\[object Object\]/.test(html))
      for (const role of doc.experience) {
        for (const line of [role.entry.role, role.companyLine, role.range, ...role.bullets]) assert.ok(text.includes(norm(line)), `${id}: lost experience`)
      }
      for (const item of [...doc.education.map(e => e.line), ...doc.certifications.map(c => c.display), ...doc.skills.map(s => s.name), ...doc.additional.map(a => a.display)]) assert.ok(text.includes(norm(item)), `${id}: lost section content`)
      if (variation === 15) assert.ok(!text.includes(norm('Project Delta')), 'hidden projects leaked')
      renders++
    }
    assert.equal(JSON.stringify(profile), before, 'render must not mutate source data')
    // Every other existing design receives one varied profile per profession.
    if (pattern === 2 && variation === 0) for (const t of availableTemplates().filter(t => !ids.includes(t.id))) {
      const html = renderToStaticMarkup(React.createElement(t.component!, { document: doc, profile, optimizedContent: { summary: { generated: '', source_profile_summary: '' }, experience_blocks: [] } }))
      assert.ok(html.includes('resume-render') && !/undefined|NaN/.test(html)); renders++
    }
    // Actual Word bytes, across every profession (not just the document object).
    if (pattern === 2 && variation === 2) {
      const bytes = await Packer.toBuffer(buildResumeDocx(doc))
      const zip = await JSZip.loadAsync(bytes)
      const xml = await zip.file('word/document.xml')!.async('string')
      const words = norm(textOf(xml))
      for (const line of [doc.header.displayName, doc.header.targetJobTitle, ...doc.skills.map(s => s.name), ...doc.experience.flatMap(e => e.bullets), ...doc.additional.map(a => a.display)]) assert.ok(words.includes(norm(line)), 'Word lost source content')
    }
    cases++
  }
  const fixture = makeTemplateFixture()
  const parsed = normalizeDraft({ full_name: 'Candidate', professional_headline: 'Mechanical Engineer', additional_information: [{ label: 'Languages', value: 'English' }] })!
  assert.equal(profileHeadline(parsed.additional_information)?.value, 'Mechanical Engineer')
  const source = 'Candidate\nMechanical Engineer\nLanguages: English'
  assert.equal(profileHeadline(checkDraft(parsed, source, prepass(source)).draft.additional_information)?.value, 'Mechanical Engineer')
  assert.equal(profileHeadline(checkDraft(parsed, 'Candidate\nAccountant', prepass('Candidate\nAccountant')).draft.additional_information), undefined)
  const profile = { ...fixture.profile, additional_information: setProfileHeadline(fixture.profile.additional_information, 'My reviewed headline', true, () => '20000000-0000-4000-8000-000000000001') }
  assert.equal(resolveProfileHeadline(profile), 'My reviewed headline')
  const merged = mergeDraftIntoProfile(profile, parsed)
  assert.equal(profileHeadline(merged.profile.additional_information)?.value, 'My reviewed headline')
  assert.equal(merged.profile.additional_information.filter(isHeadlineEntry).length, 1)
  const cleared = { ...profile, additional_information: setProfileHeadline(profile.additional_information, '', true, () => 'unused') }
  assert.equal(buildCareerProfileResume(cleared).header.targetJobTitle, '')
  const frozen = buildCareerProfileResume(profile)
  const edited = sanitizeEditedDocument({ ...frozen, header: { ...frozen.header, targetJobTitle: '' } }, frozen)
  const saved = { target_job_title: 'A different vacancy', document_snapshot: edited, optimized_content: fixture.optimizedContent }
  assert.equal(resolvePackageResumeDocument(saved, { ...profile, full_name: 'Changed master profile' }).header.targetJobTitle, '')
  assert.equal(resolvePackageResumeDocument(saved, { ...profile, full_name: 'Changed master profile' }).header.displayName, profile.full_name)
  const legacy = resolvePackageResumeDocument({ target_job_title: 'Package title', optimized_content: fixture.optimizedContent }, { ...profile, target_job_title: null })
  assert.equal(legacy.header.targetJobTitle, 'Package title')
  console.log(`PASS: ${cases} synthetic profiles, ${SAMPLE_PROFESSIONS.length} professions, ${renders} template renders, 20 Word exports; headline grounding, merge preservation, hidden sections, blank edits and frozen-document consistency`)
}
main().catch(error => { console.error(error); process.exitCode = 1 })
