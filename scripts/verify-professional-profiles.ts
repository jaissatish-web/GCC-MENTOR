import './resolve-paths'
import assert from 'node:assert/strict'
import * as React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { makeTemplateFixture } from './fixtures/templateFixture'
import { DEFAULT_SETUP, type LinkedInDraft } from '../lib/linkedin/types'
import { outputShape, checklistKeys } from '../lib/naukrigulf/model'
import { outputShape as linkedinShape } from '../lib/linkedin/model'
import { buildNaukrigulfInput, NAUKRIGULF_INSTRUCTIONS } from '../lib/ai/buildNaukrigulfPrompt'
import { validateLinkedIn } from '../lib/ai/validateLinkedIn'
import { PROFESSIONAL_PLATFORMS } from '../lib/professionalProfiles/config'
import { NAV_ITEMS, NAV_GROUPS } from '../components/layout/navItems'

;(globalThis as unknown as {React: unknown}).React = React
// Isolate the introduction from app-router session/navigation hooks for SSR checks.
const shell = require.resolve('../components/layout/PageShell')
require.cache[shell] = { id: shell, filename: shell, loaded: true, exports: { PageShell: ({children}: {children: React.ReactNode}) => React.createElement('main', null, children) } } as NodeModule
const { ProfileIntroduction } = require('../components/professional/ProfileIntroduction')
const { ProfilePreview } = require('../components/linkedin/ProfilePreview')
const { LinkedInWorkspace } = require('../components/linkedin/LinkedInWorkspace')
const profile = makeTemplateFixture().profile
const setup = {...DEFAULT_SETUP, targetRoles:'Engineer', experienceIds: profile.work_experience.map(e=>e.id)}
const output = {
  headlines: ['Engineering professional','Engineering professional','Engineering professional'],
  about: profile.professional_summary || 'Engineering professional',
  experience: profile.work_experience.map(e=>({id:e.id,description:e.description || e.role})),
  skills: profile.skills.slice(0,15).map(e=>e.name),
  advice: ['Keep actual skills visible.','Review job preferences.','Use a consistent CV.'],
}
assert.equal(outputShape(output,profile,setup.experienceIds),null)
assert.ok(outputShape({...output,about:'x'.repeat(2001)},profile,setup.experienceIds))
assert.equal(linkedinShape({...output,about:'x'.repeat(2001)},profile,setup.experienceIds),null)
assert.ok(outputShape({...output,skills:['Unverified skill']},profile,setup.experienceIds))
assert.ok(outputShape({...output,experience:[{id:'other-user',description:'text'}]},profile,setup.experienceIds))
assert.ok(checklistKeys(output,profile).includes('preferences'))
assert.ok(checklistKeys(output,profile).includes('resume'))
assert.equal(validateLinkedIn(profile,{...output,about:'I delivered 99999 projects.'}).valid,false)
const input = buildNaukrigulfInput({...profile,phone:'PRIVATE_PHONE',email:'private@example.test',professional_summary:'Reach private@example.test'},setup,null)
assert.ok(!input.includes('private@example.test'))
assert.ok(!input.includes('PRIVATE_PHONE'))
assert.ok(NAUKRIGULF_INSTRUCTIONS.includes('jobseeker profile'))
assert.ok(NAUKRIGULF_INSTRUCTIONS.includes('Never transfer') || NAUKRIGULF_INSTRUCTIONS.includes('never transfer'))
const draft = {setup,output,selected_headline:0,completed:[],skipped:[]} as unknown as LinkedInDraft
for(const platform of ['linkedin','naukrigulf'] as const) {
  const config=PROFESSIONAL_PLATFORMS[platform]
  const intro=renderToStaticMarkup(React.createElement(ProfileIntroduction,{platform}))
  assert.ok(intro.includes(`${config.home}/workspace`))
  assert.ok(intro.includes('Illustrative artwork'))
  assert.ok(intro.includes('useful daily check-in'))
  assert.ok(intro.includes('https://'))
  assert.ok(intro.includes('What you get') && intro.includes('where it goes'))
  assert.ok(!intro.includes('/professional-profile'))
  assert.ok(!intro.includes('rank #1') && !intro.includes('50,000'))
  const editor=renderToStaticMarkup(React.createElement(LinkedInWorkspace,{platform}))
  assert.ok(editor.includes(config.home) && !editor.includes('/professional-profile'))
  const preview=renderToStaticMarkup(React.createElement(ProfilePreview,{profile,draft,platform}))
  assert.ok(preview.includes(config.summary) && preview.includes(config.experience))
  assert.ok(preview.includes(`${platform}-preview`))
  if(platform==='naukrigulf') assert.ok(!preview.includes('Add profile section') && !preview.includes('LinkedIn’s'))
  assert.ok(NAV_ITEMS.some(item=>item.href===config.home))
  assert.equal(NAV_GROUPS.flatMap(g=>g.hrefs).filter(h=>h===config.home).length,1)
}
console.log('PASS: platform-specific limits, privacy, grounding, portal checklist, introductory pages, workspace return links, previews and navigation')
