/**
 * ONE NAME PER THING, ONE VERB PER ACTION (founder decision 2026-09-17).
 *
 * Users met "Build the CV", "Build my Gulf CV", "Optimize for …", "Open
 * workspace", "Write the letter", "Generate Q&A", "Prepare Q&A" and "Start
 * mock" for the same five actions, and could not tell whether two buttons did
 * the same thing. Every screen now takes its names and button labels from here,
 * so a word means the same action everywhere.
 *
 * Client-safe: no imports.
 */

export const NAMES = {
  targetJob: 'Target job',
  jobTitle: 'Job title',
  jobDescription: 'Job description',
  optimizedCv: 'Optimized CV',
  atsScore: 'ATS score',
  level: 'Optimization level',
  coverLetter: 'Cover letter',
  interviewQa: 'Interview Q&A',
  mockInterview: 'Mock interview',
  library: 'Resume Library',
} as const

export const CTA = {
  addTargetJob: 'Add target job',
  chooseLevel: 'Next: choose level',
  optimizeCv: 'Optimize CV',
  viewOptimizedCv: 'View optimized CV',
  editCv: 'Edit CV',
  downloadPdf: 'Download PDF',
  seeChanges: 'Review and edit changes',
  writeCoverLetter: 'Write cover letter',
  prepareInterviewQa: 'Prepare interview Q&A',
  startMockInterview: 'Start mock interview',
  viewTargetJob: 'View target job',
} as const

/** What each service reads, said the same way on every screen. */
export const USES = {
  coverLetter: 'Written from your optimized CV and this target job.',
  interviewQa: 'Questions and answers from your optimized CV and this target job.',
  mockInterview: 'Interview questions from your optimized CV and this target job.',
  optimizedCv: 'Written for this target job, only from facts in your Career Profile.',
} as const
