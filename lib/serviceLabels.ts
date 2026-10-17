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
  careerProfile: 'Career Profile',
  resume: 'Resume',
  gccReadiness: 'GCC Readiness',
  resumeTemplates: 'Resume Templates',
  targetJob: 'Job You’re Applying For',
  jobTitle: 'Job Title You’re Applying For',
  jobDescription: 'Job description',
  optimizedCv: 'Optimized Resume',
  atsScore: 'ATS score',
  level: 'Optimization level',
  coverLetter: 'Cover letter',
  interviewQa: 'Interview Q&A',
  mockInterview: 'Mock interview',
  library: 'Resume Library',
} as const

export const CTA = {
  addTargetJob: 'Add Job Details',
  chooseLevel: 'Next: choose level',
  optimizeCv: 'Optimize Resume for This Job',
  viewOptimizedCv: 'View Optimized Resume',
  editCv: 'Edit Resume',
  downloadPdf: 'Download PDF',
  seeChanges: 'Review and edit changes',
  writeCoverLetter: 'Write cover letter',
  prepareInterviewQa: 'Prepare interview Q&A',
  startMockInterview: 'Start mock interview',
  viewTargetJob: 'View Job Details',
} as const

/** What each service reads, said the same way on every screen. */
export const USES = {
  coverLetter: 'Written from your optimized resume and this job.',
  interviewQa: 'Questions and answers from your optimized resume and this job.',
  mockInterview: 'Interview questions from your optimized resume and this job.',
  optimizedCv: 'Written for this job, only from facts in your Career Profile.',
} as const
