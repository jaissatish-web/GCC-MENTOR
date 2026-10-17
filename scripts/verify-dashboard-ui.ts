import './resolve-paths'
import assert from 'node:assert/strict'
import * as React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { ActivityOverview, OverallProgress } from '../components/dashboard/ActivityOverview'
import { NAV_ITEMS, NAV_GROUPS, MOBILE_PRIMARY_ITEMS } from '../components/layout/navItems'
import { coveragePercent, dashboardNextAction, type DashboardOverview } from '../lib/dashboardOverview'
import { emptyStageCounts } from '../lib/packageSummary'
import { computeNextAction } from '../lib/nextAction'

;(globalThis as unknown as { React: typeof React }).React = React
const stats: DashboardOverview = { resume_count: 6, profile_resume_count: 1, optimized_resume_count: 5,
  target_job_count: 5, draft_resume_count: 0, cover_letter_count: 7, qa_set_count: 4,
  mock_interview_count: 2, mock_completed_count: 1, mock_in_progress_count: 1,
  average_mock_score: 78.5, resumes_with_letter: 4, resumes_with_qa: 3, resumes_with_mock: 1,
  stages: { ...emptyStageCounts(), saved: 1, interview: 4 } }
const render = (data: DashboardOverview | null, loading = false, error = false) => renderToStaticMarkup(React.createElement(ActivityOverview, { overview: data, loading, error, onRetry: () => {} }))
const html = render(stats)
for (const href of ['/dashboard/library','/cover-letter','/interview-qa','/mock-interview']) assert.ok(html.includes(`href="${href}"`))
assert.ok(html.includes('1 Career Profile · 5 optimized'))
assert.ok(html.includes('1 completed · 1 in progress'))
assert.ok(html.includes('grid-cols-2') && html.includes('lg:grid-cols-4'))
const pending = render(null, true)
assert.ok(pending.includes('aria-busy="true"') && pending.includes('—'))
assert.ok(!pending.includes('>0</span>'), 'Loading is never shown as a false zero')
const error = render(stats, false, true)
assert.ok(error.includes('role="alert"') && error.includes('Retry activity totals'))
assert.ok(!error.includes('1 Career Profile · 5 optimized'), 'Do not present stale totals as current after a failed retry')
const progress = renderToStaticMarkup(React.createElement(OverallProgress, { overview: stats }))
assert.equal((progress.match(/role="progressbar"/g) ?? []).length, 3)
assert.ok(progress.includes('78.5 / 100'))
assert.ok(progress.includes('aria-valuenow="67"'))
assert.ok(progress.includes('Manage in Resume Library'))
assert.equal(coveragePercent(0, 0), 0)
assert.equal(coveragePercent(10, 2), 100)
assert.equal(coveragePercent(1, 3), 33)
assert.ok(!NAV_ITEMS.some(item => item.label === 'Saved Jobs'))
assert.equal(NAV_ITEMS.find(item => item.label === 'LinkedIn Optimization')?.href, '/linkedin-optimization')
assert.ok(NAV_ITEMS.every(item => item.iconClass.startsWith('ui-nav-')))
assert.equal(new Set(NAV_ITEMS.map(item => item.iconClass)).size, NAV_ITEMS.length, 'Each service has its own centralized icon treatment')
assert.ok(MOBILE_PRIMARY_ITEMS.every(item => NAV_ITEMS.includes(item)))
assert.equal(NAV_GROUPS.flatMap(g => g.hrefs).length, NAV_ITEMS.length)
const rawAction = computeNextAction({ readiness_score: 90 }, [{ id:'private', name:'PRIVATE TITLE', target_job_title:'PRIVATE TITLE', target_company:null, has_resume:true, cover_letter_count:0, qa_question_count:0, mock_completed_run_id:null, is_paid:true } as never], 90)
const displayAction = dashboardNextAction(rawAction)
assert.ok(!displayAction.title.includes('PRIVATE'))
assert.equal(displayAction.href, rawAction.href)
assert.equal(displayAction.cta, rawAction.cta)
console.log('PASS: real overview rendering, mobile grid, count/error/loading states, progress semantics, consistent navigation and preserved CTA destination')

// Combined Home: real facts, useful deep links, and unavailable values never look like zeros.
const cssExtension = require.extensions['.css']
require.extensions['.css'] = (module: NodeModule) => { module.exports = {} }
const previewButton = require.resolve('../components/resume/CareerProfileResumeButton')
require.cache[previewButton] = { id: previewButton, filename: previewButton, loaded: true, exports: { CareerProfileResumeButton: () => React.createElement('button',null,'Preview CV') } } as NodeModule
const { HomeProfile, HomeScores, HomeSavedWork } = require('../components/dashboard/CareerHome')
const candidate = { full_name: 'Quality Candidate', photo_url: null, additional_information: [], target_job_title: null, current_location: null,
 work_experience: [{start_date:'2020-01',end_date:'2021-12',location:'Riyadh',role:'Engineer'}], education: [], skills: [{name:'Testing'}] }
const profileHtml = renderToStaticMarkup(React.createElement(HomeProfile,{profile:candidate,loading:false,error:false,score:64,gulf:{finalScore:55},missingLabels:['Work experience','Skills','Education']}))
assert.ok(profileHtml.includes('Quality Candidate') && profileHtml.includes('Your foundation for every job.'))
assert.ok(profileHtml.includes('Work experience, Skills + 1 more') && profileHtml.includes('Complete Career Profile'))
assert.ok(profileHtml.includes('aria-label="Profile completeness: 64 out of 100"'))
assert.ok(profileHtml.includes('aria-label="Gulf readiness: 55 out of 100"'))
assert.ok(!profileHtml.includes('15 years'),'Never hardcode the design mock data')
for(const href of ['/profile?view=details','/profile?view=settings','/profile?view=completeness','/optimize/target']) assert.ok(profileHtml.includes(`href="${href}"`))
assert.ok(profileHtml.includes('From one profile to each job workspace') && profileHtml.includes('cover letter, Q&amp;A and mock interview'))
assert.ok(profileHtml.includes('does not rewrite previously saved optimized resumes'))
assert.ok(profileHtml.includes('aria-controls="home-profile-details"') && profileHtml.includes('aria-expanded="false"') && profileHtml.includes('id="home-profile-details"') && profileHtml.includes(' hidden=""'), 'Returning users get a compact profile with an accessible explanation toggle')
const completeProfile = renderToStaticMarkup(React.createElement(HomeProfile,{profile:candidate,loading:false,error:false,score:100,gulf:{finalScore:55},missingLabels:[]}))
assert.ok(completeProfile.includes('aria-label="Profile completeness: 100 out of 100"') && completeProfile.includes('Review Career Profile'))
assert.ok(completeProfile.includes('href="/optimize/target"') && profileHtml.includes('href="/optimize/target"'), 'Completion is encouragement, never a new optimization gate')
assert.ok(!completeProfile.includes('Recent Job Workspace') && !completeProfile.includes('To prepare'), 'The shared foundation must not carry one workspace’s service status')
const failedProfile = renderToStaticMarkup(React.createElement(HomeProfile,{profile:null,loading:false,error:true,score:0,missingLabels:[]}))
assert.ok(failedProfile.includes('Try again') && !failedProfile.includes('aria-valuenow='), 'Failed loads cannot show zero or a completion claim')
const loadingProfile = renderToStaticMarkup(React.createElement(HomeProfile,{profile:null,loading:true,error:false}))
assert.ok(loadingProfile.includes('aria-busy="true"') && !loadingProfile.includes('aria-valuenow='))
const newProfile = renderToStaticMarkup(React.createElement(HomeProfile,{profile:null,loading:false,error:false}))
for(const href of ['/profile?import=upload','/profile?import=paste','/profile?view=details']) assert.ok(newProfile.includes(`href="${href}"`))
assert.ok(newProfile.includes('Create Career Profile') && newProfile.includes('source for every new job-specific resume'))
const unavailable = renderToStaticMarkup(React.createElement(HomeScores,{profile:null,score:0,missing:0,gulf:null,loading:false,error:true}))
assert.ok(unavailable.includes('Unavailable') && !unavailable.includes('0 percent'))
const saved = renderToStaticMarkup(React.createElement(HomeSavedWork,{overview:stats,loading:false,error:false,onRetry:()=>{}}))
assert.ok(saved.includes('>7<') && saved.includes('/interview-qa') && saved.includes('/mock-interview'))
const failedSaved = renderToStaticMarkup(React.createElement(HomeSavedWork,{overview:stats,loading:false,error:true,onRetry:()=>{}}))
assert.ok(!failedSaved.includes('>7<') && failedSaved.includes('role="alert"'))
assert.ok(!NAV_ITEMS.some(item=>item.href==='/profile'),'Home owns the profile overview')
const {HomeNextStep,HomeUpcomingDates,HomeDateNotice} = require('../components/dashboard/HomeFollowThrough')
const followJob = {id:'active-job',name:'My saved job',target_job_title:'Lead Engineer',target_company:'Example EPC',status:'saved',has_resume:true,cover_letter_count:1,qa_question_count:25,mock_in_progress:true,mock_completed_run_id:null,application_deadline:'2026-10-18',interview_date:null}
const followAction = {state:'job_needs_mock',href:'/mock-interview?package=active-job',title:'Practice',body:'Practice',cta:'Start mock interview'}
const continueHtml = renderToStaticMarkup(React.createElement(HomeNextStep,{action:followAction,packages:[followJob],ready:true,error:false,onRetry:()=>{}}))
assert.ok(continueHtml.includes('Continue your interview') && continueHtml.includes('My saved job'))
assert.ok(continueHtml.includes('Mock interview: In progress') && continueHtml.includes('href="/mock-interview?package=active-job"'))
const returningPractice = renderToStaticMarkup(React.createElement(HomeNextStep,{action:{...followAction,state:'add_next_job'},packages:[{...followJob,created_at:'2026-10-01',updated_at:'2026-10-17',mock_completed_run_id:'earlier-report'}],ready:true,error:false,onRetry:()=>{}}))
assert.ok(returningPractice.includes('Continue your interview') && returningPractice.includes('Mock interview: In progress'), 'An earlier report cannot conceal a newer unfinished attempt')
const missingLetter = renderToStaticMarkup(React.createElement(HomeNextStep,{action:{...followAction,state:'job_needs_letter',href:'/cover-letter?package=active-job',cta:'Write cover letter'},packages:[{...followJob,cover_letter_count:0}],ready:true,error:false,onRetry:()=>{}}))
assert.ok(missingLetter.includes('Continue your interview') && missingLetter.includes('Next suggested step') && missingLetter.includes('href="/cover-letter?package=active-job"'),'Unfinished interview is primary even with a missing cover letter, which remains a secondary action')
const otherJob = renderToStaticMarkup(React.createElement(HomeNextStep,{action:{...followAction,state:'job_needs_qa',href:'/interview-qa?package=other-job',cta:'Prepare answers'},packages:[{...followJob,updated_at:'2026-10-17'},{...followJob,id:'other-job',target_job_title:'Other role',mock_in_progress:false}],ready:true,error:false,onRetry:()=>{}}))
assert.ok(otherJob.includes('Next suggested step · Other role') && otherJob.includes('href="/mock-interview?package=active-job"'),'Secondary actions for a different workspace must identify that job')
const firstHtml = renderToStaticMarkup(React.createElement(HomeNextStep,{action:computeNextAction(null,[],0),packages:[],ready:true,error:false,onRetry:()=>{}}))
assert.ok(firstHtml.includes('Start here') && firstHtml.includes('href="/profile?import=upload"'))
const dateProps={packages:[followJob],loading:false,error:false,onRetry:()=>{},now:new Date(2026,9,17,10)}
const datesHtml=renderToStaticMarkup(React.createElement(HomeUpcomingDates,dateProps))
assert.ok(datesHtml.includes('<details id="home-reminders"') && datesHtml.includes('<summary') && !datesHtml.includes(' open=""'), 'Reminders are a native, initially collapsed disclosure')
assert.ok(datesHtml.includes('1 reminder') && datesHtml.includes('id="home-reminder-list"'))
assert.ok(datesHtml.includes('Tomorrow') && datesHtml.includes('href="/package/active-job?tab=tracker"'))
const noticeHtml=renderToStaticMarkup(React.createElement(HomeDateNotice,{packages:[followJob],ready:true,now:dateProps.now}))
assert.ok(noticeHtml.includes('Application deadline') && noticeHtml.includes('Tomorrow') && noticeHtml.includes('href="#home-reminder-list"'))
assert.equal(renderToStaticMarkup(React.createElement(HomeDateNotice,{packages:[followJob],ready:false,now:dateProps.now})), '')
const failedDates=renderToStaticMarkup(React.createElement(HomeUpcomingDates,{...dateProps,error:true}))
assert.ok(failedDates.includes('role="alert"') && !failedDates.includes('Tomorrow') && !failedDates.includes('No upcoming dates'))
const loadingDates=renderToStaticMarkup(React.createElement(HomeUpcomingDates,{...dateProps,loading:true}))
assert.ok(loadingDates.includes('Checking your saved dates') && !loadingDates.includes('Tomorrow'))
if(cssExtension) require.extensions['.css']=cssExtension; else delete require.extensions['.css']
console.log('PASS: combined dashboard facts, deep links, unknown scores, stale-count protection and single Home navigation')

for (const value of [0, 49, 50, 55, 69, 70, 95, 100]) {
 const html=renderToStaticMarkup(React.createElement(HomeScores,{profile:candidate,score:value,missing:0,gulf:{finalScore:value},loading:false,error:false}))
 assert.equal((html.match(new RegExp(`aria-valuenow="${value}"`,'g')) ?? []).length,2)
 assert.ok(html.includes(`width:${value}%`))
 assert.ok(!html.includes('<circle'))
}
assert.ok(!unavailable.includes('aria-valuenow='))
console.log('PASS: readiness bars preserve scores at red/yellow/green boundaries and unknown values')
