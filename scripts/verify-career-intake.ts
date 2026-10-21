import './resolve-paths'
import assert from 'node:assert/strict'
import {contextFromDraft,applyIntakeAnswers,intakeProfileReadiness,contextFromProfile,missingContact} from '../lib/careerIntake/shared'
import {calculatePreparation} from '../lib/gulfReadiness/preparation'
import {categoryFact} from '../lib/profileCategories'
import {calculateReadiness,deriveCategory} from '../lib/readiness'
import type {CareerProfileDraft} from '../types/careerProfile'
const draft:CareerProfileDraft={full_name:'Synthetic Person',email:'test@example.com',phone:'+919876543210',current_location:'Mumbai',date_of_birth:'1990-01-01',notice_period:'90 days',work_experience:[{company:'Example',role:'Engineer',start_date:'2020-01-01',end_date:null,description:'Commissioned and maintained control systems.',highlights:[],sort_order:0}],education:[{degree:'BTech',institution:'Example Institute',sort_order:0}],skills:[{name:'PLC',sort_order:0}],certifications:[],additional_information:[]}
const c={...contextFromDraft(draft),currentlyInGulf:false,hasGulfExperience:false,targetCountry:'generic_gulf',passportStatus:'available' as const,passportExpiry:'2030-01-01'}
assert.equal(missingContact(draft).length,0,'known contact details are not asked again')
const changed={...c,currentLocation:'Dubai',currentlyInGulf:true,hasGulfExperience:false,dateOfBirth:'1991-01-01',availability:'30 days',visaStatus:'Visit visa'}
const merged=applyIntakeAnswers(draft,changed)
assert.ok(merged.additional_information.filter(x=>x.category_name==='Preparation details (private)').every(x=>x.show_on_resume===false))
assert.equal(categoryFact({label:'Passport preparation',value:'not_available',category_name:'Preparation details (private)'}),'','intake bookkeeping is not resume or AI prompt content')
assert.equal(merged.current_location,'Dubai');assert.equal(merged.date_of_birth,'1991-01-01')
assert.equal(merged.work_experience[0].role,'Engineer','target/awareness does not rewrite past jobs')
const restored=contextFromProfile({...merged,currently_in_gulf:true,target_country:changed.targetCountry,target_job_title:changed.profession})
assert.equal(restored.hasGulfExperience,false);assert.equal(restored.currentlyInGulf,true,'location independent of Gulf employment')
assert.deepEqual(applyIntakeAnswers(merged,changed),merged,'answers do not duplicate metadata on repeated application')
assert.equal(intakeProfileReadiness(draft,c).score,100,'complete applicable history does not require certificates or visa')
const ready=calculateReadiness({...draft,currently_in_gulf:false,work_experience:draft.work_experience.map(w=>({...w,start_date:w.start_date!}))})
assert.equal(ready.score,100);assert.ok(!ready.missing.some(x=>['target_company','visa_status','certifications'].includes(x.field)))
assert.equal(deriveCategory({currently_in_gulf:false,work_experience:[{company:'Example',role:'Engineer',start_date:'2010-01-01',end_date:'2020-01-01'}]}),'experienced_not_in_gulf','career break is not Gulf returner')
const today=new Date('2026-10-21T00:00:00Z')
const a=calculatePreparation(draft,c,today)
assert.equal(a.preparation?.length,12)
assert.equal(calculatePreparation({...draft,education:[]},{...c,noFormalQualification:true},today).preparation?.find(x=>x.key==='qualification')?.status,'attention','qualification concerns remain visible for engineering')
const b=calculatePreparation({...draft,certifications:[{name:'NEBOSH'},{name:'IOSH'}],has_driving_license:true,arabic_level:'fluent'},{...c,dateOfBirth:'1970-01-01'},today)
assert.equal(a.finalScore,b.finalScore,'age, language, unrelated certificate and optional driving licence do not change preparation')
const missing=calculatePreparation(draft,{...c,passportExpiry:'',passportStatus:'not_available'},today)
assert.equal(missing.preparation?.find(x=>x.key==='passport')?.status,'attention')
assert.equal(calculatePreparation(draft,{...c,passportExpiry:'',passportStatus:''},today).preparation?.find(x=>x.key==='passport')?.status,'unknown')
assert.equal(applyIntakeAnswers(draft,{...c,passportStatus:'not_available',passportExpiry:''}).passport_validity_date,undefined)
const nurse=calculatePreparation(draft,{...c,profession:'Nurse',targetCountry:'uae'},today)
assert.equal(nurse.preparation?.find(x=>x.key==='registration')?.status,'unknown')
assert.equal(calculatePreparation(draft,{...c,profession:'Accountant',targetCountry:'uae'},today).preparation?.find(x=>x.key==='registration')?.status,'not_applicable')
assert.equal(a.finalScore,JSON.parse(JSON.stringify(a)).finalScore,'signup snapshot is unchanged')
const noDegree:CareerProfileDraft={...draft,education:[],work_experience:[],professional_summary:'Practical training in wiring and maintenance.'}
assert.equal(intakeProfileReadiness(noDegree,{...c,careerStage:'fresher',noFormalQualification:true}).score,100,'no formal qualification is a clarified fact, not a fake qualification')
assert.ok(intakeProfileReadiness({...draft,work_experience:[]},{...c,careerStage:'experienced'}).missing.some(x=>x.field==='work_experience'),'experienced applicant with missed jobs does not become a complete fresher')
console.log('PASS shared intake: explicit answer reuse, no duplicate contact prompts, scenario independence, applicable completeness, awareness and snapshot parity')
