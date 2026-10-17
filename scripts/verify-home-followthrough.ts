import './resolve-paths'
import assert from 'node:assert/strict'
import { fetchHomePackages, homeReminders, nextActionWorkspace, reminderTiming } from '../lib/homeFollowThrough'
import type { PackageSummary } from '../lib/packageSummary'
import { loadHomeInterview, unfinishedInterviewWorkspace } from '../lib/homeInterview'
import type { NextAction } from '../lib/nextAction'

const job = (over: Partial<PackageSummary> = {}): PackageSummary => ({ id:'saved-job', tier:null, name:'Engineering application', target_job_title:'Engineer', target_company:'Example EPC', status:'saved', has_resume:true, cover_letter_count:1, qa_question_count:25, mock_in_progress:true, mock_completed_run_id:null, application_deadline:null, interview_date:null, ...over } as PackageSummary)
const now = new Date(2026, 9, 17, 10)
const at = (day: number, hour=12) => new Date(2026, 9, day, hour).toISOString()
const reminders = homeReminders([
  job({id:'tomorrow',application_deadline:'2026-10-18'}),
  job({id:'today',application_deadline:'2026-10-17',interview_date:at(17,14)}),
  job({id:'earlier',interview_date:at(17,8)}),
  job({id:'overdue',application_deadline:'2026-10-16'}),
  job({id:'stale',application_deadline:'2026-10-01',interview_date:at(16)}),
  job({id:'applied',status:'applied',application_deadline:'2026-10-18'}),
  ...(['rejected','withdrawn','offer','visa_processing'] as const).map(status=>job({id:status,status,application_deadline:'2026-10-18',interview_date:at(18)})),
  job({id:'raw',tier:'free',application_deadline:'2026-10-18'}),
  job({id:'invalid',application_deadline:'2026-02-31',interview_date:'invalid'}),
  job({id:'blank'}),
], now)
assert.equal(reminders.length,5)
assert.equal(reminders[0].id,'today-interview','Today’s upcoming interview stays above overdue reminders')
assert.equal(reminderTiming(reminders.find(r=>r.id==='overdue-deadline')!),'1 day overdue')
assert.equal(reminders.find(r=>r.id==='today-deadline')?.days,0,'A date-only deadline keeps the local calendar day')
assert.equal(reminderTiming(reminders.find(r=>r.id==='earlier-interview')!),'Earlier today')
assert.equal(reminderTiming(reminders.find(r=>r.id==='tomorrow-deadline')!),'Tomorrow')
assert.equal(reminderTiming({days:4,earlierToday:false}),'In 4 days')
assert.equal(reminderTiming({days:0,earlierToday:false}),'Today')
assert.equal(homeReminders([],now).length,0)
const encoded=job({id:'with% space'})
assert.equal(nextActionWorkspace({href:'/mock-interview?package=with%25%20space'} as NextAction,[encoded])?.id,encoded.id)
assert.equal(nextActionWorkspace({href:'/optimize/generate/with%25%20space'} as NextAction,[encoded])?.id,encoded.id)
assert.equal(nextActionWorkspace({href:'/profile'} as NextAction,[encoded]),null)

async function checkInterviews() {
  assert.equal(unfinishedInterviewWorkspace([job({id:'old',updated_at:'2026-10-15'}),job({id:'new',updated_at:'2026-10-17',mock_completed_run_id:'previous-report'}),job({id:'raw',tier:'free',updated_at:'2026-10-18'})])?.id,'new')
  assert.equal(unfinishedInterviewWorkspace([job({mock_in_progress:false})]),null)
  const calls: string[]=[]
  const runs = [
    {id:'older',status:'in_progress',generated_at:'2026-10-15',questions:[],input_mode:'text'},
    {id:'saved run',status:'in_progress',generated_at:'2026-10-17',questions:[{id:'q1',answer:'Saved answer'},{id:'q2',answer:null}],input_mode:'text'},
    {id:'completed',status:'completed',generated_at:'2026-10-18',questions:[]},
  ]
  const textFetch: typeof fetch = async(input,init)=>{calls.push(String(input));assert.ok(!init?.method || init.method==='GET');return Response.json({package:{mock_interview_runs:runs}})}
  const text=await loadHomeInterview('job space',textFetch)
  assert.equal(text?.saved,1);assert.equal(text?.total,2)
  assert.equal(text?.href,'/mock-interview?package=job%20space&run=saved%20run#interview-report')
  assert.equal(calls.length,1)
  const voiceFetch: typeof fetch = async(input,init)=>{
    assert.ok(!init?.method || init.method==='GET')
    return String(input).endsWith('/voice') ? Response.json({answers:[{question_id:'q1',saved_at:'2026-10-17'},{question_id:'q2',saved_at:null},{question_id:'old-question',saved_at:'2026-10-17'}]}) : Response.json({package:{mock_interview_runs:[{...runs[1],input_mode:'voice'}]}})
  }
  const voice=await loadHomeInterview('job',voiceFetch)
  assert.equal(voice?.saved,1);assert.ok(voice?.href.endsWith('&room=1'))
  const unavailable=await loadHomeInterview('job',async input=>String(input).endsWith('/voice')?new Response('',{status:503}):voiceFetch(input))
  assert.equal(unavailable?.saved,null);assert.ok(unavailable?.href.endsWith('&room=1'),'Unavailable recording progress must retain exact-room continuation without a false zero')
  assert.equal(await loadHomeInterview('job',async()=>Response.json({package:{mock_interview_runs:[runs[2]]}})),null)
  await assert.rejects(loadHomeInterview('job',async()=>new Response('',{status:503})))
}

async function checkPages() {
  const calls: string[]=[]
  const cursor={before:'2026-09-01T00:00:00Z',before_id:'00000000-0000-4000-8000-000000000001'}
  const fetcher: typeof fetch=async(input,init)=>{calls.push(String(input));assert.equal(init?.cache,'no-store');assert.ok(!init?.method||init.method==='GET');return Response.json(calls.length===1?{packages:Array.from({length:100},(_,i)=>job({id:'new-'+i})),next_cursor:cursor}:{packages:[job({id:'old-with-deadline',application_deadline:'2026-10-18'}),job({id:'profile',tier:'free'})],next_cursor:null})}
  const all=await fetchHomePackages(fetcher)
  assert.equal(all.length,101)
  assert.ok(calls[1].includes('before_id=') && calls[0].includes('limit=100'))
  assert.ok(homeReminders(all,now).some(r=>r.pkg.id==='old-with-deadline'),'An older workspace deadline cannot disappear behind the first page')
  await assert.rejects(fetchHomePackages(async()=>new Response('',{status:500})))
  await assert.rejects(fetchHomePackages(async()=>Response.json({packages:[],next_cursor:cursor})),/did not advance/)
  console.log('PASS: all summary pages, older reminders, failed/repeated cursors, date-only and interview time semantics, closed/applied jobs, overdue and invalid dates, saved-workspace routing')
}
void Promise.all([checkPages(),checkInterviews()]).catch(error=>{console.error(error);process.exitCode=1})
