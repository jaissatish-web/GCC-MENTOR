import type {GulfReadinessResult, DimensionResult, Recommendation} from './types'
import type {ProfileScoringInput} from './fromProfile'
import {COUNTRY_OPTIONS,type IntakeContext} from '@/lib/careerIntake/shared'

export interface PreparationCheck {
 key:string;label:string;status:'prepared'|'attention'|'unknown'|'context'|'not_applicable';detail:string;field?:string;scored:boolean
}
/** Awareness checklist. Career facts select applicable checks; age, country,
 * nationality, optional certificates and buying/using services never earn points. */
export function calculatePreparation(p:ProfileScoringInput,c:IntakeContext,today=new Date()):GulfReadinessResult {
 const checks:PreparationCheck[]=[]
 const add=(key:string,label:string,status:PreparationCheck['status'],detail:string,scored=false,field?:string)=>checks.push({key,label,status,detail,scored,field})
 const role=c.profession || p.work_experience?.[0]?.role || ''
 const known=(v:unknown)=>typeof v==='string'&&v.trim().length>0
 add('profession','Profession & career stage',role&&c.careerStage?'context':'unknown',role?`${role} · ${c.careerStage || 'career stage to confirm'}`:'Confirm your profession or career direction.',false,'target_job_title')
 add('location','Current location',c.currentLocation&&c.currentlyInGulf!==null?'context':'unknown',c.currentLocation||'Confirm where you are now.',false,'current_location')
 add('gulf_history','Gulf work history',c.hasGulfExperience===null?'unknown':'context',c.hasGulfExperience===null?'Confirm whether you have worked in the Gulf.':c.hasGulfExperience?'Previous Gulf employment declared':'First-time Gulf employment applicant',false,'additional_information')
 add('country','Target country',c.targetCountry?'context':'unknown',COUNTRY_OPTIONS.find(x=>x.value===c.targetCountry)?.label||c.targetCountry||'You can explore first and choose later.',false,'target_country')
 const qualificationConcern=c.noFormalQualification&&/engineer|nurs|doctor|physician|teacher|pharmac|dentist/i.test(role)
 const qualification=p.education?.filter(e=>known(e.degree))??[]
 add('qualification','Qualification or training',qualificationConcern?'attention':c.noFormalQualification?'context':qualification.length?'prepared':'unknown',qualificationConcern?'You declared no formal qualification. Check the qualification requirements for this profession before planning applications.':c.noFormalQualification?'No formal qualification declared. Check the actual training requirements for your intended role.':qualification.length?qualification.map(e=>e.degree).join(', '):'Tell us your education, trade training, ongoing study or no formal qualification. Requirements depend on the role.',!c.noFormalQualification||!!qualificationConcern,'education')
 const expiry=c.passportExpiry?new Date(c.passportExpiry+'T00:00:00Z'):null
 const validExpiry=expiry&&!Number.isNaN(expiry.getTime())&&expiry.toISOString().slice(0,10)===c.passportExpiry
 const passportStatus=c.passportStatus==='not_available'||c.passportStatus==='in_progress'?'attention':validExpiry?(expiry!>today?'prepared':'attention'):'unknown'
 add('passport','Passport & validity',passportStatus,validExpiry?`Expiry: ${c.passportExpiry}. Check the validity period required for your destination and route.`:c.passportStatus==='not_available'?'You said you do not yet have a passport.':c.passportStatus==='in_progress'?'Passport application or renewal is in progress.':'Confirm your passport status and expiry date; a mention in a CV is not a validity check.',true,'passport_validity_date')
 add('visa','Visa / residency situation',c.currentlyInGulf===false?'not_applicable':known(c.visaStatus)?'prepared':'unknown',c.currentlyInGulf===false?'Check the employer-sponsored entry route when relevant.':c.visaStatus||'Confirm your current status. This does not establish permission to work.',c.currentlyInGulf===true,'visa_status')
 add('availability','Joining availability',known(c.availability)?'prepared':'unknown',c.availability||'State your actual availability. Longer notice does not reduce readiness.',true,'notice_period')
 const regulated=/nurs|doctor|physician|pharmac|dentist|teacher|driver/i.test(role)||(/engineer/i.test(role)&&['saudi_arabia','generic_gulf'].includes(c.targetCountry))
 const driver=/driver/i.test(role)
 const licence=driver?(p.has_driving_license===true?'done':p.has_driving_license===false?'not_started':null):p.professional_licence
 add('registration',driver?'Driving licence':'Professional registration / licence',!regulated?'not_applicable':licence==='done'?'prepared':licence==='not_started'||licence==='in_progress'?'attention':'unknown',!regulated?'No specific registration rule has been assessed here. Confirm the actual role requirements with the employer.':licence==='done'?'You recorded this as completed; it is not independently verified.':'Check the registration or licence relevant to your profession and destination.',regulated,driver?'has_driving_license':'professional_licence')
 const resumeFacts=!!(p.work_experience?.length||p.education?.length||p.skills?.length)
 add('resume','Resume & template preparation',resumeFacts?'prepared':'unknown',resumeFacts?'Career information is available. Review accuracy, then choose a readable template.':'Add your career details to prepare a resume.',true,'work_experience')
 add('optimization','Resume improvement', 'context','Review missing career facts first. Job-specific optimisation is available when you later provide a job description. Using our service does not earn points.')
 add('dob','Date of birth',c.dateOfBirth?'context':'unknown',c.dateOfBirth?'Recorded privately; age is not scored.':'Optional to add later. Age is not scored.',false,'date_of_birth')
 const scored=checks.filter(x=>x.scored&&x.status!=='not_applicable')
 const done=scored.filter(x=>x.status==='prepared').length
 const unknown=checks.filter(x=>x.status==='unknown').length
 const finalScore=scored.length?Math.round(done/scored.length*100):0
 const needs=scored.filter(x=>x.status==='attention').length
 const scenario=c.currentlyInGulf===true?'currently_in_gulf':c.hasGulfExperience===true?'returner':c.careerStage==='fresher'?'fresher':'experienced'
 const label=unknown?'Initial preparation · details to confirm':needs?'Preparation steps to complete':'Basic preparation recorded'
 const dimensions:DimensionResult[]=scored.map(x=>({key:x.key==='qualification'?'education':x.key==='resume'?'resume_quality':'gulf_essentials',label:x.label,score:x.status==='prepared'?1:0,max:1,evidence:x.status==='prepared'?[x.detail]:[],gaps:x.status!=='prepared'?[x.detail]:[],confidence:x.status==='unknown'?'low':'medium'}))
 const recommendations:Recommendation[]=checks.filter(x=>x.status==='unknown'||x.status==='attention').map((x,i)=>({dimension:'gulf_essentials',title:`${x.status==='attention'?'Prepare':'Confirm'}: ${x.label}`,why:x.detail,impact:x.scored?'high':'medium',difficulty:'low',priority:checks.length-i,stage:x.key==='passport'||x.key==='registration'?'paperwork':'profile',field:x.field}))
 return {scenario,scenarioLabel:c.currentlyInGulf===true?'Currently in the Gulf':c.hasGulfExperience===true?'Gulf returner':c.careerStage==='fresher'?'Early career':'First-time Gulf applicant',finalScore,
  band:{key:finalScore>=75?'ready':finalScore>=50?'mid':'under_50',label,message:'Basic preparation awareness based on the information available. This is not a hiring or visa eligibility prediction.'},
  dimensions,strengths:checks.filter(x=>x.status==='prepared').map(x=>`${x.label}: ${x.detail}`),weaknesses:checks.filter(x=>x.status==='attention').map(x=>`${x.label}: ${x.detail}`),recommendations,confidence:unknown?'low':'medium',lowResumeSignal:!resumeFacts,
  verdict:{key:unknown||needs?'almost':'ready',label,message:'Confirm the unchecked items and follow the applicable preparation steps. Your Career Profile is assessed separately.',blockers:needs,pending:unknown},mustHaves:[],
  assessment:{version:'4.0',provisional:unknown>0,reasons:[`${done} of ${scored.length} applicable preparation items recorded; ${unknown} ${unknown===1?'detail':'details'} not checked. Unknown is not a confirmed failure.`],targetCountry:c.targetCountry||null,targetJobTitle:role||null},preparation:checks}
}
