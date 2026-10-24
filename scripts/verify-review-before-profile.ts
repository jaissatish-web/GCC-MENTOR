import './resolve-paths'
import assert from 'node:assert/strict'
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
