/** Guide copy describes existing services; eligibility and plan checks stay on their pages. */
export const GUIDE_SERVICES: Record<string, { purpose: string; outputs: string; uses: string }> = {
  '/dashboard': { purpose: 'See your next step and progress.', outputs: 'Your profile status, readiness and saved job preparation.', uses: 'Your saved profile and resumes.' },
  '/profile': { purpose: 'Build the source for your resumes and preparation.', outputs: 'Contact details, experience, education, skills and import corrections.', uses: 'Upload a PDF/DOCX, paste your resume, or enter your details.' },
  '/dashboard/library': { purpose: 'Return to everything you prepared for each resume.', outputs: 'Saved resumes, documents, preparation and application progress.', uses: 'Your Profile Resume and optimized resumes.' },
  '/templates': { purpose: 'Find the layout that suits your application.', outputs: 'Browse layouts, then apply a template to your resume in its design screen.', uses: 'Your saved resume; templates format your content.' },
  '/cover-letter': { purpose: 'Prepare a letter consistent with your background.', outputs: 'A cover letter to review, edit and download.', uses: 'Select a saved Profile Resume or optimized resume.' },
  '/optimize': { purpose: 'Optimize your resume for a specific job.', outputs: 'Job-match findings and a resume to review, edit and format.', uses: 'Your saved Career Profile and the job description.' },
  '/interview-qa': { purpose: 'Understand the questions you may face.', outputs: 'Practice questions and suggested answers to review.', uses: 'A saved resume; job-specific preparation uses the job description.' },
  '/mock-interview': { purpose: 'Practise answering and learn from feedback.', outputs: 'A practice session, answer review and improvement feedback.', uses: 'Choose a saved resume and the practice options available to you.' },
  '/naukrigulf-optimization': { purpose: 'Prepare clearer content for your Gulf job profile.', outputs: 'Headline options, profile summary, employment descriptions and skills to copy.', uses: 'Your real background. Review the content, then paste it into NaukriGulf yourself.' },
  '/linkedin-optimization': { purpose: 'Help recruiters understand your professional background.', outputs: 'Headline options, About text, experience descriptions and skills to copy.', uses: 'Your real background. Review the content, then update LinkedIn yourself.' },
  '/settings': { purpose: 'Manage your account and data.', outputs: 'Account preferences, plan information and data controls.', uses: 'Your signed-in account.' },
}
