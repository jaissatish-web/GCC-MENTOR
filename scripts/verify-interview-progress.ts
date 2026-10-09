import './resolve-paths'
import assert from 'node:assert/strict'
import { comparableAttempts, interviewProgress, orderedAttempts, type InterviewAttempt } from '../lib/interviewProgress'

export function attempt(index: number, score: number): InterviewAttempt {
  return { id: `attempt-${index}`, generated_at: new Date(Date.UTC(2026, 9, index)).toISOString(), completed_at: null,
    input_mode: 'voice', resume_fingerprint: 'frozen-resume', rubric_version: 'voice-v1', mode: 'mixed', difficulty: 'standard', question_count: 5, status: 'completed',
    final_report: { overall_score: score, technical_score: score, role_fit_score: score, gulf_readiness_score: score, answer_structure_score: score,
      strengths: [], weak_points: [], risky_answers: [], improvement_plan: ['Practise a specific example.'], next_practice_questions: [] } }
}
const first = attempt(1, 50), second = attempt(2, 65), third = attempt(3, 60)
assert.equal(interviewProgress([]), null)
assert.equal(interviewProgress([first])!.previousNumber, null)
assert.equal(interviewProgress([first, second])!.metrics[0].delta, 15)
assert.equal(interviewProgress([first, second, third])!.metrics[0].delta, -5)
assert.equal(interviewProgress([first, second, third])!.metrics[0].fromFirst, 10)
assert.equal(interviewProgress([third, first, second], second.id)!.metrics[0].delta, 15, 'Opening an earlier report never includes future attempts')
assert.equal(interviewProgress([first, second], 'missing'), null)
for (const patch of [{ mode: 'hr' }, { difficulty: 'challenging' }, { question_count: 10 }, { resume_fingerprint: 'updated-cv' }, { rubric_version: 'voice-v2' }, { input_mode: 'text' }]) {
  assert.equal(comparableAttempts(first, { ...second, ...patch } as InterviewAttempt), false)
  assert.equal(interviewProgress([first, { ...second, ...patch } as InterviewAttempt])!.previousNumber, null)
}
assert.equal(comparableAttempts({ ...first, resume_fingerprint: undefined }, { ...second, resume_fingerprint: undefined }), false)
assert.equal(interviewProgress([first, { ...second, status: 'in_progress' }])!.selectedId, first.id)
assert.equal(interviewProgress([{ ...first, final_report: { ...first.final_report!, overall_score: NaN } }]), null)
assert.equal(interviewProgress([{ ...first, final_report: { ...first.final_report!, gulf_readiness_score: 120 } }]), null)
assert.equal(interviewProgress(Array.from({ length: 15 }, (_, i) => attempt(i + 1, 60)))!.totalAttempts, 15)
const unsorted = [third, first, second]
assert.deepEqual(orderedAttempts(unsorted).map(r => r.id), [first.id, second.id, third.id])
assert.equal(unsorted[0], third, 'History ordering is read-only')
console.log('PASS: all score dimensions, honest decreases, first/previous deltas, selected-report cutoff, strict comparison identity, malformed scores, empty/unfinished/15-attempt history')
