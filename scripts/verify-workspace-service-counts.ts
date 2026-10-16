import './resolve-paths'
import assert from 'node:assert/strict'
import { workspaceServiceCounts } from '../lib/workspaceServiceCounts'
import type { Package, PackageServiceEvent, PackageServiceEventType } from '../types/package'

const events = (type: PackageServiceEventType, length: number): PackageServiceEvent[] => Array.from({ length }, (_, i) => ({ id: `${type}-${i}`, type, at: '2026-10-16T00:00:00Z', label: type }))
// Contents are irrelevant to usage: only saved item counts are inspected.
const saved = <T>(length: number): T[] => Array.from({ length }, () => ({} as T))
assert.deepEqual(workspaceServiceCounts({}), { coverLetters: 0, qaSets: 0, mockInterviews: 0 })
assert.deepEqual(workspaceServiceCounts({
  cover_letters: saved<Package['cover_letters'][number]>(3),
  interview_question_sets: saved<NonNullable<Package['interview_question_sets']>[number]>(2),
  mock_interview_runs: saved<Package['mock_interview_runs'][number]>(4),
}), { coverLetters: 3, qaSets: 2, mockInterviews: 4 })
const latestQa = { questions: [{}] } as Package['interview_questions']
assert.equal(workspaceServiceCounts({ interview_questions: latestQa }).qaSets, 1, 'Legacy latest-only Q&A still counts')
assert.equal(workspaceServiceCounts({ interview_questions: latestQa, interview_question_sets: saved<NonNullable<Package['interview_question_sets']>[number]>(3) }).qaSets, 3, 'Latest set is not counted twice')
const history = workspaceServiceCounts({
  service_events: [...events('cover_letter_generated', 5), ...events('qa_generated', 6), ...events('mock_interview_started', 4), ...events('mock_interview_completed', 3)],
  cover_letters: saved<Package['cover_letters'][number]>(2),
  mock_interview_runs: saved<Package['mock_interview_runs'][number]>(2),
})
assert.deepEqual(history, { coverLetters: 5, qaSets: 6, mockInterviews: 4 }, 'Use lifetime history when older outputs were trimmed; do not add completions to starts')
assert.equal(workspaceServiceCounts({ service_events: events('mock_interview_completed', 2) }).mockInterviews, 2, 'Legacy completed sessions are a lower bound')
assert.deepEqual(workspaceServiceCounts({}), { coverLetters: 0, qaSets: 0, mockInterviews: 0 }, 'Another empty workspace never inherits these counts')
console.log('PASS workspace counts: zero, saved history, legacy outputs, lifetime usage, no double counting and workspace isolation')
