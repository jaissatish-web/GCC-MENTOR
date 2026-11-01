import './resolve-paths'
import assert from 'node:assert/strict'
import * as React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { ReviewSectionContent } from '../components/profile/ReviewSectionContent'
import { ResumeAcceptanceReview, type AcceptanceSection } from '../components/profile/ResumeAcceptanceReview'
import { importReviewPlan, rebaseImportField } from '../lib/resumeParse/reviewPlan'
import { resumeReviewChecks, type ReviewCheckEditor } from '../lib/resumeParse/reviewChecks'
import {currentRoleFingerprint} from '../lib/resumeParse/importReview'
import { calculateReadiness } from '../lib/readiness'
import { scoreProfileReadiness } from '../lib/gulfReadiness/fromProfile'
import type { ImportReview } from '../lib/resumeParse/importReview'
const review: ImportReview = {version:1,id:'review',sourceText:'',createdAt:'',wordingStatus:'not_needed',changes:[],imported:{roles:0,skills:0,qualifications:0,certificates:0}}
const editor: ReviewCheckEditor = {full_name:'Example Person',email:'person@example.com',phone:'+919876543210',professional_summary:'',skills:[],work_experience:[],education:[],certifications:[]}
const clean = resumeReviewChecks(review,editor,()=>null)
assert.equal(importReviewPlan(clean,{}).blocking.length,0,'fresher can proceed without fabricated jobs, skills or qualifications')
assert.ok(importReviewPlan(clean,{}).later.some(c=>c.field==='skills'),'optional missing skills remain outstanding')
const bad = resumeReviewChecks(review,{...editor,email:'invalid',work_experience:[{company:'',role:'Engineer',start_date:'',description:'',highlights:''}],skills:[{name:''}],certifications:[{name:'',issue_date:'',expiry_date:''}]},()=>null)
for(const field of ['email','work_experience.0.company','work_experience.0.start_date','skills.0.name','certifications.0.name']) assert.ok(importReviewPlan(bad,{}).blocking.some(c=>c.field===field),field+' remains in the essential issue grouping')
const warning={id:'warning',field:'full_name',kind:'check' as const,label:'Name',before:'',after:'',reason:'Please verify extracted name'}
const uncertain=resumeReviewChecks({...review,changes:[warning]},editor,()=>null)
const flag=uncertain.find(c=>c.field==='full_name')!
assert.equal(importReviewPlan(uncertain,{[flag.id]:flag.value}).blocking.length,0)
const changed=resumeReviewChecks({...review,changes:[warning]},{...editor,full_name:'Different Person'},()=>null)
assert.equal(importReviewPlan(changed,{[flag.id]:flag.value}).blocking.length,1,'changing a verified value requires another verification')
const base={currently_in_gulf:true,...editor}
const invalidContact=calculateReadiness({...base,email:'invalid',phone:'123'})
const validContact=calculateReadiness(base)
assert.ok(validContact.score>invalidContact.score)
assert.ok(invalidContact.missing.some(c=>c.field==='email')&&invalidContact.missing.some(c=>c.field==='phone'))
const answers={hasGulfExperience:true,currentlyInGulf:true} as const
assert.ok(scoreProfileReadiness({email:'person@example.com',phone:'+919876543210'},answers).finalScore>scoreProfileReadiness({email:'invalid',phone:'123'},answers).finalScore)
const incompleteWork = {...base, work_experience:[{company:'Example EPC',role:'Engineer',start_date:'2020-01',description:'',highlights:[]}] }
assert.ok(calculateReadiness(incompleteWork).missing.some(item=>item.field==='work_experience'),'empty activities must remain an actionable readiness gap')
assert.ok(!calculateReadiness({...incompleteWork,work_experience:[{...incompleteWork.work_experience[0],description:'Commissioned control systems.'}]}).missing.some(item=>item.field==='work_experience'))
const draftForMerge={work_experience:[{company:'New EPC',role:'Engineer',start_date:'2020-01'}],education:[],certifications:[]} as unknown as import('../types/careerProfile').CareerProfileDraft
const mergedForReview={work_experience:[{company:'Old EPC',role:'Engineer',start_date:'2010-01-01'},{company:'New EPC',role:'Engineer',start_date:'2020-01-01'}],education:[],certifications:[]} as unknown as import('../types/careerProfile').CareerProfileFull
assert.equal(rebaseImportField('work_experience.0.company',draftForMerge,mergedForReview),'work_experience.1.company','notes must follow the newly merged job')
assert.equal(rebaseImportField('work_experience.0.company',draftForMerge,{...mergedForReview,work_experience:[]}), 'work_experience','ambiguous or removed role must not point at unrelated data')
const currentEditor={...editor,work_experience:[{company:'Example',role:'Engineer',start_date:'2020-01',end_date:'',description:'Testing',highlights:''}]}
const currentCheck=resumeReviewChecks(review,currentEditor,()=>null).find(c=>c.field.endsWith('current_status'))!
assert.ok(currentCheck,'missing end date needs explicit current status')
assert.ok(!resumeReviewChecks({...review,currentRoles:[currentRoleFingerprint(currentEditor.work_experience[0])]},currentEditor,()=>null).some(c=>c.field.endsWith('current_status')),'explicit current role is reused without asking again')
const deferPlan = importReviewPlan(resumeReviewChecks(review,{...editor,full_name:'',email:'',phone:'',work_experience:[{company:'',role:'Engineer',start_date:'',description:'',highlights:''}]},()=>null),{})
assert.equal(deferPlan.invalid.length,0,'missing essential facts are safe to defer without verification or invented data')
assert.ok(deferPlan.outstanding.some(c=>c.field==='full_name'),'deferred gaps remain visible')
assert.ok(importReviewPlan(bad,{}).invalid.some(c=>c.field==='email'),'malformed supplied values must be corrected or cleared')
assert.equal(importReviewPlan(uncertain,{}).invalid.length,0,'uncertain extraction may be deferred without marking it verified')
console.log('PASS explicit import review: required vs optional, uncertain facts, changed-value invalidation, valid-data profile and Gulf scoring')


// Render the real review UI: supplied analysis stays read-only and choosing a
// pending import never becomes an implicit save during presentation.
;(globalThis as unknown as { React: typeof React }).React = React
const suggestion = { id:'summary-wording', field:'professional_summary', label:'Professional summary', kind:'wording' as const,
  before:'I commission control systems.', after:'I commission control systems safely.', reason:'Existing supplied wording suggestion.', suggested:true, restorable:true }
const sectionTitles = ['Professional Summary','Experience','Skills','Certifications','Education','Projects','Languages']
const acceptanceSections: AcceptanceSection[] = sectionTitles.map((title,index) => ({
  id:`review-${index}`,title,content:index === 0 ? suggestion.before : `Extracted ${title}`,
  status:index === 2 ? 'attention' : 'complete',changes:index === 0 ? [suggestion] : [],
}))
let uiCallbackCalls = 0
const uiProps: React.ComponentProps<typeof ResumeAcceptanceReview> = {
  sections:acceptanceSections,review:{...review,wordingStatus:'checked',changes:[suggestion]},score:73.25,
  strengths:['Source strength: grounded technical evidence.'],improvements:['Source improvement: add missing dates.'],
  currentValue:change=>change.before,onChoose:()=>{uiCallbackCalls++},onEdit:()=>{uiCallbackCalls++},
  confirmed:false,onConfirm:()=>{uiCallbackCalls++},busy:false,onSave:()=>{uiCallbackCalls++},profileExists:false,
}
const renderAcceptance = (overrides: Partial<typeof uiProps> = {}) => renderToStaticMarkup(React.createElement(ResumeAcceptanceReview,{...uiProps,...overrides}))
const acceptanceMarkup = renderAcceptance()
for (const title of sectionTitles) assert.ok(acceptanceMarkup.includes(`>${title}</span>`),`Compact cards keep navigation to the ${title} section`)
assert.ok(acceptanceMarkup.includes('data-review-phase="diagnostic"'),'Initial view is diagnostic only')
assert.ok(!acceptanceMarkup.includes('data-review-card') && !acceptanceMarkup.includes('improvement-summary-title') && !acceptanceMarkup.includes('resume-final-preview-title'),'Other phase bodies are absent initially')
assert.ok(acceptanceMarkup.includes('value="73.25"') && acceptanceMarkup.includes('>73.25/100</span>'),'Supplied score is displayed without recalculation or rounding')
for (const value of [...uiProps.strengths!,...uiProps.improvements!]) assert.ok(acceptanceMarkup.includes(value),'Existing analysis finding is preserved: '+value)
assert.ok(acceptanceMarkup.includes('Review details'),'Diagnostic-first screen has an explicit review start')
assert.ok(!acceptanceMarkup.includes('id="review-content-'),'No section is expanded before the user starts review')
assert.ok(!acceptanceMarkup.includes('>Save Career Profile</button>'),'Save is unavailable until final verification')
assert.ok(!renderAcceptance({confirmed:true}).includes('>Save Career Profile</button>'),'A stale confirmation alone cannot skip final verification')
assert.ok(!acceptanceMarkup.includes(suggestion.after),'Suggestions remain within the applicable guided section')
const noAnalysisMarkup = renderAcceptance({score:undefined,strengths:[],improvements:[],review:{...review,wordingStatus:'unavailable'},sections:acceptanceSections.map(section=>({...section,changes:[]}))})
assert.ok(!noAnalysisMarkup.includes('data-analysis-score'),'Unavailable analysis does not create a placeholder score card')
assert.ok(!noAnalysisMarkup.includes('aria-label="Current resume analysis score"'),'Missing analysis has no misleading scored progress bar')
assert.ok(!noAnalysisMarkup.includes('>Strengths</h3>') && !noAnalysisMarkup.includes('>Improvements</h3>'),'Unavailable findings do not create empty explanatory cards')
assert.ok(noAnalysisMarkup.includes('Writing suggestions unavailable'),'An unavailable wording pass is visible without blocking extracted data')
assert.ok(renderAcceptance({score:0}).includes('value="0"'),'An actual supplied zero score is not confused with unavailable analysis')
const unsafeText = '<strong>candidate supplied text</strong>'
const escapedMarkup = renderAcceptance({sections:[{...acceptanceSections[0],content:unsafeText,changes:[{...suggestion,after:unsafeText}]}],strengths:[unsafeText],improvements:[unsafeText],currentValue:()=>suggestion.before})
assert.ok(escapedMarkup.includes('&lt;strong&gt;candidate supplied text&lt;/strong&gt;'),'Candidate and model strings render as escaped text')
assert.ok(!escapedMarkup.includes(unsafeText),'Raw extracted or suggested HTML cannot create elements')
assert.equal(uiCallbackCalls,0,'Rendering the review does not call edits, choices, confirmation or save callbacks')
console.log('PASS diagnostic-first acceptance UI: section navigation, unchanged analysis, honest unavailable states, gated review/save and escaped text; interactive safety covered by browser regression')

// Structured cards preserve full evidence, escape candidate text and redact IDs.
const displayGroups = [{title:'Synthetic employer',fields:[{label:'Role',value:'<script>not executable</script>'},{label:'Passport number',value:'A12345678'},{label:'Responsibilities',value:'Original responsibility. '.repeat(30)}]}]
const displaySnapshot = JSON.stringify(displayGroups)
const structuredMarkup = renderToStaticMarkup(React.createElement(ReviewSectionContent,{content:'original fallback',groups:displayGroups}))
assert.ok(structuredMarkup.includes('data-review-display-group') && structuredMarkup.includes('<dl'),'Facts use labeled entry cards')
assert.ok(structuredMarkup.includes('&lt;script&gt;not executable&lt;/script&gt;') && !structuredMarkup.includes('<script>'),'Structured values stay escaped')
assert.ok(!structuredMarkup.includes('A12345678') && structuredMarkup.includes('[number removed]'),'Sensitive numbers stay redacted with split labels')
assert.ok(structuredMarkup.includes('Read full responsibilities') && structuredMarkup.includes('Original responsibility. '.repeat(30)),'Full long facts remain available without a long initial paragraph')
assert.ok(!structuredMarkup.includes('<a '),'Stored text never becomes a clickable unsafe URL')
assert.equal(JSON.stringify(displayGroups),displaySnapshot,'Display projection never mutates candidate facts')
console.log('PASS compact structured facts: cards, full evidence, escaped text, privacy and immutability')
