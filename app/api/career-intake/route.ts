import { NextRequest, NextResponse } from 'next/server'
import { extractProfile, readResumeText } from '@/lib/resumeParse/pipeline'
import { isServicePaused } from '@/lib/ai/serviceGuard'
import { getClientIdentityHash,getAnonymousRateLimitStatus,incrementAnonymousRateLimit,LIMIT_ACTION_ANON_ATS_SCAN } from '@/lib/anonymousRateLimit'
import { buildImportReview } from '@/lib/resumeParse/importReview'
import { contextFromDraft } from '@/lib/careerIntake/shared'

/** One anonymous extraction feeds both scorecards and the first profile review.
 * No anonymous career data is stored server-side. Existing pause and daily limits apply. */
export async function POST(request:NextRequest) {
  const pause=await isServicePaused('anonymous_scan')
  if(pause.paused)return NextResponse.json({error:pause.message},{status:503})
  const identityHash=getClientIdentityHash(request)
  const limit=await getAnonymousRateLimitStatus({identityHash,action:LIMIT_ACTION_ANON_ATS_SCAN})
  if(!limit.allowed)return NextResponse.json({error:limit.message},{status:429})
  const body=await request.formData().catch(()=>null)
  if(!body)return NextResponse.json({error:'Please choose a resume or paste its text.'},{status:400})
  const file=body.get('file'),text=body.get('resume_text')
  let read
  if(file instanceof File){
    const ext=file.name.toLowerCase().split('.').pop()
    if(!['pdf','docx'].includes(ext??''))return NextResponse.json({error:'Choose a PDF or Word (.docx) resume.'},{status:400})
    if(file.size>(ext==='pdf'?4:2)*1024*1024)return NextResponse.json({error:'PDF files must be 4MB or smaller; Word files 2MB or smaller.'},{status:400})
    read=await readResumeText({kind:ext as 'pdf'|'docx',buffer:Buffer.from(await file.arrayBuffer())})
  }else if(typeof text==='string' && text.length<=20000){read=await readResumeText({kind:'text',text})}
  if(!read?.ok)return NextResponse.json({error:'We could not read this resume clearly. Try a fresh export or paste its text.',code:read?.code},{status:400})
  // Reserve the anonymous attempt before model work. Retry failures are explicitly
  // described as attempted reads; malformed uploads above never use an attempt.
  await incrementAnonymousRateLimit({identityHash,action:LIMIT_ACTION_ANON_ATS_SCAN})
  const parsed=await extractProfile(read.text,{route:'/api/career-intake',layout:read.layout})
  if(!parsed.ok)return NextResponse.json({error:'We could not finish this reading. Your resume has not been saved. Try again later or create a profile manually.',code:parsed.code},{status:502})
  parsed.report.review=buildImportReview(parsed.draft,parsed.draft,parsed.text,parsed.report.warnings)
  parsed.report.review.currentRoles=parsed.report.currentRoles??[]
  return NextResponse.json({success:true,intake:{version:1,draft:parsed.draft,resumeText:parsed.text,report:parsed.report,context:contextFromDraft(parsed.draft)}},{headers:{'Cache-Control':'no-store'}})
}
