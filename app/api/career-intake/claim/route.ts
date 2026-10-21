import {NextRequest,NextResponse} from 'next/server'
import {createClient} from '@/lib/supabase/server'
import {normalizeDraft} from '@/lib/ai/extractionPrompt'
import {savePendingDraft} from '@/lib/pendingDraft'
import {applyIntakeAnswers,contextFromDraft} from '@/lib/careerIntake/shared'
import type {IntakeContext} from '@/lib/careerIntake/shared'
import {buildImportReview} from '@/lib/resumeParse/importReview'
import type {ParseReport} from '@/lib/resumeParse/pipeline'
/** First profile only. Returning users keep the normal quota-controlled import. */
export async function POST(request:NextRequest){
 const client=await createClient();const {data:{user}}=await client.auth.getUser()
 if(!user)return NextResponse.json({error:'Please sign in.'},{status:401})
 const {data:profile,error}=await client.from('career_profiles').select('full_name').eq('user_id',user.id).maybeSingle()
 if(error)return NextResponse.json({error:'We could not check your saved profile. Please retry.'},{status:503})
 if(profile?.full_name?.trim())return NextResponse.json({error:'Use the existing profile import to preserve your saved information and monthly limits.',code:'EXISTING_PROFILE'},{status:409})
 const raw=await request.text().catch(()=>'');if(raw.length>300000)return NextResponse.json({error:'Reading too large.'},{status:413})
 let body;try{body=JSON.parse(raw)}catch{return NextResponse.json({error:'Invalid reading.'},{status:400})}
 if(!body||typeof body!=='object'||Array.isArray(body))return NextResponse.json({error:'Invalid reading.'},{status:400})
 let draft=normalizeDraft(body.draft)
 const text=typeof body.resumeText==='string'?body.resumeText.slice(0,30000):''
 if(!draft||text.length<50)return NextResponse.json({error:'The reading is unavailable. Upload or paste your resume again.'},{status:400})
 const base=contextFromDraft(draft)
 const incoming=body.context&&typeof body.context==='object'?body.context:{}
 const context={...base}
 for(const key of ['currentLocation','targetCountry','profession','passportExpiry','dateOfBirth','visaStatus','availability'] as const)if(typeof incoming[key]==='string')context[key]=incoming[key].trim().slice(0,160)
 for(const key of ['currentlyInGulf','hasGulfExperience'] as const)if(typeof incoming[key]==='boolean')context[key]=incoming[key]
 if(['available','in_progress','not_available',''].includes(incoming.passportStatus))context.passportStatus=incoming.passportStatus
 if(['experienced','fresher',''].includes(incoming.careerStage))context.careerStage=incoming.careerStage
 context.noFormalQualification=incoming.noFormalQualification===true
 draft=applyIntakeAnswers(draft,context)
 // Client data is user-owned input, not trusted AI/verification evidence.
 const warnings=Array.isArray(body.report?.warnings)?body.report.warnings.filter((x:unknown):x is {field:string;message:string}=>!!x&&typeof x==='object'&&typeof (x as {field?:unknown}).field==='string'&&typeof (x as {message?:unknown}).message==='string').slice(0,100):[]
 const review=buildImportReview(draft,draft,text,warnings)
 review.currentRoles=Array.isArray(body.report?.currentRoles)?body.report.currentRoles.filter((x:unknown)=>typeof x==='string'&&x.length<500).slice(0,100):[]
 const report:ParseReport={version:'v2',ms:0,attempts:0,repaired:false,inputTokens:0,outputTokens:0,host:null,layout:[],warnings,currentRoles:review.currentRoles,review}
 await savePendingDraft(client,user.id,draft,'paste',report)
 return NextResponse.json({success:true,draft,report},{headers:{'Cache-Control':'no-store'}})
}
