/** VISUAL-010 content/customization regression. Uses existing fixtures only.
 * node -r sucrase/register scripts/verify-visual-templates.ts
 * Synthetic persona mutations below are test inputs, never gallery data.
 */
import './resolve-paths'
import * as React from 'react'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import assert from 'node:assert/strict'
import { availableTemplates, getTemplate, isTemplateId } from '../lib/templates'
import { SAMPLE_RESUME_DOCUMENT } from '../lib/sampleResume'
import { buildResumeDocument, type ResumeDocument } from '../lib/resumeDocument'
import { buildCareerProfileResume } from '../lib/careerProfileResume'
import { resolvePackageResumeDocument } from '../lib/packageResumeDocument'
import { CATEGORY_POSITIONS } from '../lib/profileCategories'
import { ACCENT_OPTIONS, FONT_OPTIONS, SIZE_OPTIONS, INK_OPTIONS, HIGHLIGHT_OPTIONS, HEADER_OPTIONS, parseStyleOverrides, type ResumeStyleOverrides } from '../lib/resumeStyle'
import { makeTemplateFixture, makeLongTemplateFixture } from './fixtures/templateFixture'
import type { ProfileAdditionalInformation } from '../types/careerProfile'

;(globalThis as unknown as { React: unknown }).React = React
const IDS = ['executive_navy', 'emerald_professional', 'royal_blue_modern', 'graphite_executive', 'teal_horizon', 'burgundy_prestige', 'industrial_pro', 'golden_executive', 'sapphire_edge', 'modern_skyline']
const PERSONAS = ['Professional Driver', 'Mechanical Technician', 'Instrumentation Engineer', 'Electrical Engineer', 'HSE Officer', 'Civil Engineer', 'Project Manager', 'Administrative Professional', 'Fresh Graduate', 'Senior Professional']
const textOf = (html: string) => html.replace(/<[^>]*>/g, ' ').replace(/&amp;/g, '&').replace(/&#x27;|&#39;/g, "'").replace(/&quot;/g, '"').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/\s+/g, ' ').trim()
const normalize = (s: string) => s.replace(/\s+/g, ' ').trim()
const includes = (text: string, expected: string, context: string) => {
  if (expected.trim()) assert(text.includes(normalize(expected)), `${context}: missing ${expected.slice(0, 100)}`)
}
function freeze<T>(input: T): T {
  if (input && typeof input === 'object' && !Object.isFrozen(input)) {
    Object.freeze(input)
    for (const value of Object.values(input)) freeze(value)
  }
  return input
}
let renders = 0
function render(id: string, document: ResumeDocument, styleOverrides?: ResumeStyleOverrides): string {
  const html = renderToStaticMarkup(createElement(getTemplate(id).component!, { document, styleOverrides } as never))
  renders++
  assert(!/style="[^"]*(undefined|NaN|\[object Object\])/.test(html), `${id}: invalid style`)
  assert(!/\bundefined\b|\bNaN\b|\[object Object\]/.test(textOf(html)), `${id}: invalid visible value`)
  return html
}
function contentIntact(html: string, document: ResumeDocument, context: string) {
  const text = textOf(html)
  // Two-tone names may insert markup between words, but never change the name.
  includes(text, document.header.displayName, context)
  includes(text, document.header.targetJobTitle, context)
  for (const item of document.header.contactItems ?? []) includes(text, item.text, context)
  includes(text, document.summary, context)
  let lastRole = -1
  for (const item of document.experience) {
    includes(text, item.entry.role, context)
    const roleIndex = text.indexOf(normalize(item.entry.role), lastRole + 1)
    assert(roleIndex > lastRole, `${context}: employment order changed`)
    lastRole = roleIndex
    includes(text, item.companyLine, context)
    includes(text, item.range, context)
    for (const bullet of item.bullets) includes(text, bullet, context)
  }
  for (const skill of document.skills) includes(text, skill.name, context)
  for (const item of document.education) { includes(text, item.line, context); includes(text, item.years, context) }
  for (const item of document.certifications) includes(text, item.display, context)
  // Legacy additional rows in these fixtures have no category-prefix cleanup.
  for (const item of document.additional.filter(i => !i.entry.category_name)) includes(text, item.display, context)
}
const styles: ResumeStyleOverrides[] = [
  ...Object.keys(FONT_OPTIONS).map(font => ({ font } as ResumeStyleOverrides)),
  ...Object.keys(SIZE_OPTIONS).map(size => ({ size } as ResumeStyleOverrides)),
  ...Object.keys(ACCENT_OPTIONS).map(accent => ({ accent } as ResumeStyleOverrides)),
  ...Object.keys(INK_OPTIONS).map(ink => ({ ink } as ResumeStyleOverrides)),
  ...Object.keys(HIGHLIGHT_OPTIONS).map(highlight => ({ highlight } as ResumeStyleOverrides)),
  ...Object.keys(HEADER_OPTIONS).map(header => ({ header } as ResumeStyleOverrides)),
  { lines: false }, { showPhoto: false }, { photo: 0 }, { photo: 100 },
  { ink: 'black', highlight: 'none', lines: false, header: 'bold', size: 'large', font: 'serif', accent: 'plum' },
]
assert.equal(availableTemplates().length, 63, 'expected 53 originals plus 10 additions')
const sourceSample = JSON.stringify(SAMPLE_RESUME_DOCUMENT)
const oldMarkup = render('gulf_premium', SAMPLE_RESUME_DOCUMENT)
const base = makeTemplateFixture()
const frozen = freeze(buildResumeDocument({ profile: base.profile, optimizedContent: base.optimizedContent, skillsOrder: base.skillsOrder }))
const frozenJson = JSON.stringify(frozen)
for (const id of IDS) {
  assert(isTemplateId(id), `${id}: not accepted by saved-template validator`)
  const entry = getTemplate(id)
  assert.equal(entry.id, id, `${id}: silently falls back`)
  assert(entry.available && entry.styleable && entry.allowsPhoto, `${id}: missing first-class capabilities`)
  assert.equal(entry.version, 1)
  assert(entry.description.includes('ATS'), `${id}: missing direct-share/ATS guidance`)
  assert(entry.recommendedFor.some(s => /direct|recruiter|reference/i.test(s)), `${id}: missing purpose metadata`)
  for (const persona of PERSONAS) {
    const fixture = persona === 'Senior Professional' ? makeLongTemplateFixture() : makeTemplateFixture()
    const p = fixture.profile
    // Test-only role labels ensure designs never depend on engineering wording.
    p.target_job_title = persona
    if (p.work_experience.length) p.work_experience[0].role = persona
    if (persona === 'Fresh Graduate') {
      p.work_experience = []; p.certifications = []; p.photo_url = null
      fixture.optimizedContent.experience_blocks = []
    }
    if (persona === 'Administrative Professional') {
      p.additional_information = []; p.certifications = []; p.photo_url = null
    }
    if (persona === 'Professional Driver') {
      const licence = makeLongTemplateFixture().profile.certifications.at(-1)!
      p.certifications = [licence]
      p.work_experience = p.work_experience.slice(0, 1)
    }
    if (persona === 'Project Manager') {
      p.professional_summary = (p.professional_summary + ' ').repeat(8).trim()
      fixture.optimizedContent.summary.generated = p.professional_summary
      const project = { ...p.additional_information[0], id: 'project-test', label: 'Project', value: p.work_experience[0].description!.repeat(20) }
      p.additional_information.push(project)
    }
    if (persona === 'Electrical Engineer') {
      p.full_name = 'TÜV García — مهندس'
      p.skills = makeLongTemplateFixture().profile.skills
    }
    for (const doc of [buildCareerProfileResume(p), buildResumeDocument({ profile: p, optimizedContent: fixture.optimizedContent, skillsOrder: fixture.skillsOrder })]) {
      const before = JSON.stringify(doc)
      contentIntact(render(id, doc), doc, `${id}/${persona}`)
      assert.equal(JSON.stringify(doc), before, `${id}/${persona}: mutated candidate facts`)
      for (const showPhoto of [true, false]) {
        const html = render(id, doc, { showPhoto })
        const want = showPhoto && doc.header.showPhoto && Boolean(doc.header.photoUrl) ? 1 : 0
        assert.equal((html.match(/<img\b/g) ?? []).length, want, `${id}/${persona}: photo toggle`)
      }
    }
  }
  for (const style of styles) {
    assert(!('error' in parseStyleOverrides(style)), `${id}: existing style rejected`)
    const html = render(id, frozen, style)
    contentIntact(html, frozen, `${id}/${JSON.stringify(style)}`)
    if (style.font) includes(html, FONT_OPTIONS[style.font].stack.replaceAll('"', '&quot;'), `${id}: chosen font`)
    if (style.accent) assert(html.toLowerCase().includes(ACCENT_OPTIONS[style.accent].hex.toLowerCase()), `${id}: chosen accent`)
    if (style.showPhoto === false) assert(!html.includes('<img'), `${id}: photo hidden`)
  }
  // Canonical sample rendered without a data mutation or substitute dataset.
  contentIntact(render(id, SAMPLE_RESUME_DOCUMENT), SAMPLE_RESUME_DOCUMENT, `${id}/shared sample`)
  // Old frozen snapshots lack contactItems: every preexisting identity line survives.
  const legacy = structuredClone(frozen); delete legacy.header.contactItems
  const legacyText = textOf(render(id, legacy))
  for (const line of [legacy.header.identityPrimary, legacy.header.identityContact, legacy.header.identityGulf]) includes(legacyText, line, `${id}/legacy snapshot`)
  // Snapshot resolution preserves frozen prose even when current profile facts change.
  const changedProfile = { ...base.profile, professional_summary: 'Updated profile summary' }
  const resolved = resolvePackageResumeDocument({ document_snapshot: frozen, target_job_title: frozen.header.targetJobTitle, optimized_content: null }, changedProfile)
  assert.equal(resolved.summary, frozen.summary, `${id}: frozen summary changed`)
  contentIntact(render(id, resolved), resolved, `${id}/frozen saved resume`)
  // Categories can move at every supported anchor, remain ordered within a group,
  // and be hidden. These transformations never enter production sample data.
  for (const position of CATEGORY_POSITIONS) {
    const p = structuredClone(base.profile)
    p.additional_information = [0, 1].map((n) => ({ ...base.profile.additional_information[0],
      id: `visible-${n}`, category_id: 'qa-visible', category_name: 'QA Specialist Section',
      category_order: 1, category_position: position, label: `QA Item ${n}`, value: `Supplied category text ${n}`, show_on_resume: true,
    })) as ProfileAdditionalInformation[]
    p.additional_information.push({ ...p.additional_information[0], id: 'hidden', category_id: 'qa-hidden', category_name: 'Hidden QA Section', label: 'Hidden QA Item', value: 'Hidden QA Value', show_on_resume: false })
    const doc = buildResumeDocument({ profile: p, optimizedContent: base.optimizedContent })
    const html = render(id, doc); const text = textOf(html)
    includes(text, 'QA Specialist Section', `${id}/${position}`)
    assert(text.indexOf('Supplied category text 0') < text.indexOf('Supplied category text 1'), `${id}/${position}: category item order`)
    assert(!text.includes('Hidden QA'), `${id}/${position}: hidden category leaked`)
    const titleAt = text.indexOf('QA Specialist Section')
    const anchor = position === 'after_summary' ? doc.summary : position === 'after_experience' ? doc.experience.at(-1)!.bullets.at(-1)! : position === 'after_education' ? doc.education.at(-1)!.line : position === 'after_skills' ? doc.skills.at(-1)!.name : position === 'after_certifications' ? doc.certifications.at(-1)!.display : null
    if (anchor) assert(titleAt > text.indexOf(normalize(anchor)), `${id}/${position}: section before anchor`)
  }
  const minimal: ResumeDocument = { ...structuredClone(frozen), summary: '', experience: [], skills: [], certifications: [], education: [], additional: [] }
  const minimalHtml = render(id, minimal)
  assert.equal((minimalHtml.match(/<section\b/g) ?? []).length, 0, `${id}: empty section forced into resume`)
  console.log(`PASS ${id}: 10 personas × profile/optimized, photo toggles, ${styles.length} style variants, sample, legacy/frozen snapshots, 6 category anchors, missing optional sections`)
}
assert.equal(JSON.stringify(frozen), frozenJson, 'template switching mutated frozen document')
assert.equal(JSON.stringify(SAMPLE_RESUME_DOCUMENT), sourceSample, 'template switching mutated shared sample')
assert.equal(render('gulf_premium', SAMPLE_RESUME_DOCUMENT), oldMarkup, 'switch back changed original template')
console.log(`PASS VISUAL-010: ${renders} content-preserving renders; all supplied facts retained; no production data changed. This is synthetic renderer evidence, not live authenticated save/download verification.`)
