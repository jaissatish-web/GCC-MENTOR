'use client'
import {useState} from 'react'
import type {CareerIntake,IntakeContext} from '@/lib/careerIntake/shared'
import {COUNTRY_OPTIONS,missingContact,applyIntakeAnswers} from '@/lib/careerIntake/shared'
import {buttonVariants} from '@/components/ui/Button'
export function IntakeQuestions({intake,onChange,onFinish,onBack}:{intake:CareerIntake;onChange:(v:CareerIntake)=>void;onFinish:()=>void;onBack:()=>void}){
 const [page,setPage]=useState(0)
 const [educationMissing]=useState(()=>!intake.draft.education.length)
 const [contactFields]=useState(()=>missingContact(intake.draft))
 const c=intake.context
 const hasClarifications=contactFields.length>0||educationMissing||!intake.draft.date_of_birth||!intake.draft.notice_period||(c.currentlyInGulf===true&&!intake.draft.visa_status)
 const totalPages=hasClarifications?3:2
 const patch=(v:Partial<IntakeContext>)=>onChange({...intake,context:{...c,...v}})
 const select=(id:string,label:string,value:string,choices:Array<{value:string;label:string}>,change:(v:string)=>void)=><div><label htmlFor={id} className="field-label">{label}</label><select id={id} value={value} onChange={e=>change(e.target.value)} className="field mt-2 w-full">{choices.map(x=><option key={x.value} value={x.value}>{x.label}</option>)}</select></div>
 const input=(id:string,label:string,value:string,change:(v:string)=>void,type='text')=><div><label htmlFor={id} className="field-label">{label}</label><input id={id} type={type} maxLength={type==='text'?160:undefined} value={value} onChange={e=>change(e.target.value)} className="field mt-2 w-full"/></div>
 const bool=[{value:'yes',label:'Yes'},{value:'no',label:'No'},{value:'',label:'Not sure yet'}]
 const choice=(label:string,value:string,change:(v:string)=>void)=><fieldset><legend className="field-label">{label}</legend><div className="mt-2 grid grid-cols-3 gap-2">{bool.map(item=><button key={item.label} type="button" aria-pressed={value===item.value} onClick={()=>change(item.value)} className={`min-h-11 rounded-ctl border px-2 py-3 text-sm font-semibold ${value===item.value?'border-teal bg-teal text-white':'border-line bg-white text-ink'}`}>{item.label}</button>)}</div></fieldset>
 return <div>
  <p className="text-xs font-semibold uppercase tracking-wider text-teal">Your resume is read · quick check {page+1} of {totalPages}</p>
  <h1 className="mt-3 type-title">{page===0?'Your situation today':page===1?'Your Gulf preparation':'Fill only what we could not read'}</h1>
  <p className="mt-3 text-sm text-ink-soft">We found {intake.draft.work_experience.length} {intake.draft.work_experience.length===1?'role':'roles'}, {intake.draft.skills.length} {intake.draft.skills.length===1?'skill':'skills'} and {intake.draft.education.length} {intake.draft.education.length===1?'qualification':'qualifications'}. Information already captured is reused for both scorecards.</p>
  <form className="mt-5 space-y-5 rounded-card border border-line bg-white p-5 sm:p-6" onSubmit={e=>{e.preventDefault();if(page<totalPages-1)setPage(page+1);else onFinish()}}>
   {page===0?<>
    {input('intake-location','Current location',c.currentLocation,v=>patch({currentLocation:v}))}
    {choice('Are you currently in a GCC country?',c.currentlyInGulf===null?'':c.currentlyInGulf?'yes':'no',v=>patch({currentlyInGulf:v===''?null:v==='yes'}))}
    {choice('Have you worked in a GCC country?',c.hasGulfExperience===null?'':c.hasGulfExperience?'yes':'no',v=>patch({hasGulfExperience:v===''?null:v==='yes'}))}
    {select('intake-stage','Career stage',c.careerStage,[{value:'',label:'Choose when ready'},{value:'experienced',label:'I have professional work experience'},{value:'fresher',label:'Fresher / entering professional work'}],v=>patch({careerStage:v as IntakeContext['careerStage']}))}
   </>:page===1?<>
    {input('intake-profession','Profession or latest role',c.profession,v=>patch({profession:v}))}
    {select('intake-country','Target Gulf country',c.targetCountry,[{value:'',label:'Not sure yet'},...COUNTRY_OPTIONS],v=>patch({targetCountry:v}))}
    {select('intake-passport','Passport preparation',c.passportStatus,[{value:'',label:'Not checked yet'},{value:'available',label:'I have a passport'},{value:'in_progress',label:'Application or renewal in progress'},{value:'not_available',label:'I do not have one yet'}],v=>patch({passportStatus:v as IntakeContext['passportStatus'],...(v!=='available'?{passportExpiry:''}:{})}))}
    {c.passportStatus==='available'?input('intake-expiry','Passport expiry date',c.passportExpiry,v=>patch({passportExpiry:v}),'date'):null}
   </>:<>
    {contactFields.map(key=>input('intake-'+key,{full_name:'Your full name',email:'Contact email',phone:'Phone with country code'}[key],intake.draft[key]??'',v=>onChange({...intake,draft:{...intake.draft,[key]:v}}),key==='email'?'email':key==='phone'?'tel':'text'))}
    {educationMissing?<div className="space-y-3"><label className="flex min-h-11 items-center gap-3 text-sm text-ink"><input type="checkbox" checked={!!c.noFormalQualification} onChange={e=>patch({noFormalQualification:e.target.checked})}/>I have no formal qualification to add</label>{!c.noFormalQualification?input('intake-qualification','Qualification or trade training · add if applicable',intake.draft.education[0]?.degree??'',v=>onChange({...intake,draft:{...intake.draft,education:v.trim()?[{degree:v,sort_order:0}]:[]}})):null}</div>:null}
    {!intake.draft.date_of_birth?input('intake-dob','Date of birth · optional, age is not scored',c.dateOfBirth,v=>patch({dateOfBirth:v}),'date'):null}
    {!intake.draft.notice_period?input('intake-availability','Joining availability · optional',c.availability,v=>patch({availability:v})):null}
    {c.currentlyInGulf===true&&!intake.draft.visa_status?input('intake-visa','Visa / residency status · optional',c.visaStatus,v=>patch({visaStatus:v})):null}
    <p className="rounded-ctl bg-teal-soft p-3 text-sm text-ink-soft">You can leave uncertain details for later. Your result will show what is not checked. After signup, review the complete career history before saving.</p>
   </>}
   <div className="flex flex-col gap-2 sm:flex-row-reverse"><button type="submit" className={buttonVariants({variant:'primary'})}>{page===totalPages-1?'See my two readiness results':'Continue'}</button><button type="button" className={buttonVariants({variant:'ghost'})} onClick={()=>page?setPage(page-1):onBack()}>{page?'Back':'Back to resume'}</button></div>
  </form>
 </div>
}
