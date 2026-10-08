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
assert.ok(NAV_ITEMS.every(item => item.iconClass.includes('bg-') && item.iconClass.includes('text-')))
assert.equal(new Set(NAV_ITEMS.map(item => item.iconClass)).size, NAV_ITEMS.length)
assert.ok(MOBILE_PRIMARY_ITEMS.every(item => NAV_ITEMS.includes(item)))
assert.equal(NAV_GROUPS.flatMap(g => g.hrefs).length, NAV_ITEMS.length)
const rawAction = computeNextAction({ readiness_score: 90 }, [{ id:'private', name:'PRIVATE TITLE', target_job_title:'PRIVATE TITLE', target_company:null, has_resume:true, cover_letter_count:0, qa_question_count:0, mock_completed_run_id:null, is_paid:true } as never], 90)
const displayAction = dashboardNextAction(rawAction)
assert.ok(!displayAction.title.includes('PRIVATE'))
assert.equal(displayAction.href, rawAction.href)
assert.equal(displayAction.cta, rawAction.cta)
console.log('PASS: real overview rendering, mobile grid, count/error/loading states, progress semantics, colored navigation and preserved CTA destination')
