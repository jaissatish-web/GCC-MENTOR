import './resolve-paths'
import { buildMockInterviewReportPrompt } from '../lib/ai/buildMockInterviewPrompt'
import { normalizeMockInterviewReport, validateMockInterviewReport } from '../lib/ai/validateMockInterview'
import type { MockInterviewRun } from '../types/package'

const run = {
  id: '11111111-1111-4111-8111-111111111111', input_mode: 'voice', generated_at: new Date().toISOString(), completed_at: null,
  target_job_title: 'Project Engineer', target_company: null, target_country: 'saudi_arabia', mode: 'technical', difficulty: 'standard',
  question_count: 1, current_index: 0, status: 'completed', opening_note: 'Practice interview', final_report: null,
  questions: [{ id: '22222222-2222-4222-8222-222222222222', category: 'technical', focus: 'Troubleshooting', question: 'Explain a fault.', ideal_answer_points: ['Situation', 'Action', 'Result'], answer: 'I isolated the loop and restored service.', feedback: 'Partly there.', better_answer: 'A better answer.', follow_up: null, score: 6, answered_at: new Date().toISOString() }],
} satisfies MockInterviewRun

const prompt = buildMockInterviewReportPrompt(run)
if (!prompt.input.includes('executive_summary') || !prompt.input.includes('score_explanations') || !prompt.instructions.includes('success check')) throw new Error('Detailed report contract is missing')

const output = {
  overall_score: 68, technical_score: 72, role_fit_score: 65, gulf_readiness_score: 60, answer_structure_score: 70,
  executive_summary: 'Developing preparation with a useful troubleshooting example, but limited evidence and Gulf context. Add a measurable result first.',
  priority_focus: 'Add measurable outcomes to each example.',
  score_explanations: { technical: 'The method was relevant but brief.', role_fit: 'The example fits the role but lacks scope.', gulf_readiness: 'No client or site context was stated.', answer_structure: 'The answer had an action but no clear result.' },
  strengths: ['Relevant isolation method'], weak_points: ['No measurable result'], risky_answers: [],
  improvement_plan: ['Add the result, because interviewers need evidence; success check: every answer ends with an outcome.'],
  next_practice_questions: ['What measurable result followed your troubleshooting?'],
}
const failures = validateMockInterviewReport(output)
if (failures.length) throw new Error(failures.join('; '))
const normalized = normalizeMockInterviewReport(output)
if (normalized.executive_summary !== output.executive_summary || normalized.score_explanations?.technical !== output.score_explanations.technical) throw new Error('Detailed report fields were not preserved')
if (!validateMockInterviewReport({ ...output, executive_summary: '' }).includes('executive_summary: expected string')) throw new Error('Missing executive assessment was accepted')
console.log('Detailed mock interview report contract passed')
