import './resolve-paths'
import assert from 'node:assert/strict'
import * as React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { makeTemplateFixture } from './fixtures/templateFixture'
import { buildCareerProfileResume } from '../lib/careerProfileResume'
import { employmentStatusContext, hasUnknownEmploymentEnd } from '../lib/employmentStatus'
import { totalExperienceYears, gccExperience } from '../lib/experienceYears'
import { detectEmploymentGaps } from '../lib/employmentGaps'
import { calculateReadiness } from '../lib/readiness'
import { factSummary } from '../lib/optimizer/factSummary'
import { renderExperience } from '../lib/optimizer/v3/prompts'
import { derivedExperienceYears } from '../lib/ai/answerGrounding'
import { buildCoverLetterPrompt } from '../lib/ai/buildCoverLetterPrompt'
import { buildInterviewQaParts, gulfFactLine } from '../lib/ai/buildInterviewQaPrompt'
import { buildOptimizationPrompt } from '../lib/ai/buildOptimizationPrompt'
import { candidateFacts } from '../lib/linkedin/model'
import { DEFAULT_SETUP } from '../lib/linkedin/types'
import { profileToScoringText, scoringInputFromProfile } from '../lib/gulfReadiness/fromProfile'
import { buildJobMatchProfileInputFromFullProfile } from '../lib/jobMatch/profileAdapters'
import { computeDeterministicCategories } from '../lib/jobMatch/requirementMapping'
import { sortedWorkRoles } from '../lib/profileWorkNavigation'
import { WorkExperienceItem } from '../components/profile/WorkExperienceItem'
import type { StructuredJobProfile } from '../types/jobMatch'
;(globalThis as unknown as { React: unknown }).React = React
const base = makeTemplateFixture().profile
const role = {...base.work_experience[0],company:'Example Employer',role:'Controls Engineer',start_date:'2020-01-01',end_date:null,description:'Maintained control systems.',highlights:['Documented maintenance results.'],gcc_country:'saudi_arabia' as const,end_date_unconfirmed:true}
const unknown = {...base,professional_summary:null,work_experience:[role]}
const current = {...unknown,work_experience:[{...role,end_date_unconfirmed:false}]}
const ended = {...unknown,work_experience:[{...role,end_date:'2022-01-01'}]}
assert.ok(hasUnknownEmploymentEnd(role));assert.equal(hasUnknownEmploymentEnd(ended.work_experience[0]),false,'a supplied end date overrides a stale flag')
const doc=buildCareerProfileResume(unknown)
assert.equal(doc.experience[0].range,'Jan 2020 — End date not provided')
assert.equal(buildCareerProfileResume(current).experience[0].range,'Jan 2020 — Present')
assert.equal(buildCareerProfileResume(ended).experience[0].range,'Jan 2020 — Jan 2022')
assert.equal(doc.experience[0].entry.company,role.company);assert.ok(doc.experience[0].bullets.includes(role.description),'known responsibilities are preserved')
assert.equal(totalExperienceYears(unknown,new Date('2026-01-01')),null,'an unknown end does not become experience through today')
assert.ok((totalExperienceYears(current,new Date('2026-01-01'))??0)>=6)
assert.equal(gccExperience(unknown.work_experience,()=>null,new Date('2026-01-01')).durationUnconfirmed,true)
assert.ok(!gulfFactLine(unknown).includes('under one year'),'unknown duration is not classified as a short duration')
assert.equal(derivedExperienceYears(unknown,new Date('2026-01-01')).length,0)
assert.deepEqual(detectEmploymentGaps([role,{...role,company:'Other',start_date:'2024-01-01',end_date:'2025-01-01',end_date_unconfirmed:false}]),[])
assert.ok(calculateReadiness(unknown).missing.some(item=>item.field==='work_experience'),'deferred employment remains incomplete')
assert.ok(!calculateReadiness(current).missing.some(item=>item.field==='work_experience'),'confirmed current employment remains complete')
assert.ok(!factSummary(unknown).includes('currently at'));assert.ok(!factSummary(unknown).includes('years of experience'));assert.ok(factSummary(unknown).includes(role.company))
assert.ok(factSummary(current).includes('currently at'))
assert.ok(employmentStatusContext(unknown).includes('UNKNOWN'));assert.ok(!employmentStatusContext(unknown).includes('CURRENT ROLE'))
assert.ok(employmentStatusContext(current).includes('CURRENT ROLE'));assert.ok(employmentStatusContext(ended).includes('ENDED 2022-01'))
assert.ok(renderExperience(unknown).includes('End date not provided'));assert.ok(!renderExperience(unknown).includes('to present'))
const target={target_job_title:'Controls Engineer',target_company:null,target_industry:null,target_country:null}
assert.ok(buildCoverLetterPrompt(unknown,target).user.includes('End date not provided'))
assert.ok(buildOptimizationPrompt(unknown,target,'easy',{summary:true,experienceIds:[role.id]}).user.includes('End date not provided'))
assert.ok(buildInterviewQaParts(unknown,doc,target)[0].input.includes('End date not provided'))
assert.ok(candidateFacts(unknown,{...DEFAULT_SETUP,experienceIds:[role.id]}).experience[0].employmentStatus.startsWith('unconfirmed'))
assert.ok(!profileToScoringText(scoringInputFromProfile(unknown)).includes('Present'))
const job:StructuredJobProfile={job_title:'Controls Engineer',required_skills:['control systems'],preferred_skills:[],responsibilities:['maintenance'],required_experience_years:3,industry:null,gcc_experience_required:false,gcc_experience_preferred:false,target_countries:[],education_requirements:[],certification_requirements:[],driving_license_required:false}
assert.ok(computeDeterministicCategories(buildJobMatchProfileInputFromFullProfile(unknown),job).experience_level?.evidence[0].startsWith('Unconfirmed employment duration;'))
const editable={key:'unconfirmed',role:role.role,company:role.company,start_date:'2020-01',end_date:'',end_date_unconfirmed:true}
const html=renderToStaticMarkup(React.createElement(WorkExperienceItem,{role:editable,number:1,open:false,onToggle:()=>{},children:'Details'}))
assert.ok(html.includes('End date not provided'));assert.ok(!html.includes('Current role'));assert.ok(!html.includes('Present'))
assert.equal(sortedWorkRoles([editable,{...editable,key:'current',end_date_unconfirmed:false}])[0].key,'current')
console.log('PASS unknown employment: preserved facts, honest resume/UI dates, no current-tense/derived-duration claims, incomplete readiness, scoring and service context')
