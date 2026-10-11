/** Guide copy describes existing services; eligibility and plan checks stay on their pages. */
export const GUIDE_SERVICES: Record<string, { purpose: string; outputs: string; uses: string }> = {
  '/dashboard': { purpose: 'See your next step and progress.', outputs: 'Your profile status, readiness and saved job preparation.', uses: 'Your saved profile and CVs.' },
  '/profile': { purpose: 'Build the source for your CVs and preparation.', outputs: 'Contact details, experience, education, skills and import corrections.', uses: 'Upload a PDF/DOCX, paste your resume, or enter your details.' },
  '/dashboard/library': { purpose: 'Return to everything you prepared for each CV.', outputs: 'Saved CVs, documents, preparation and application progress.', uses: 'Your Career Profile CV and job-tailored CVs.' },
  '/templates': { purpose: 'Find the layout that suits your application.', outputs: 'Browse layouts, then apply a template to your CV in its design screen.', uses: 'Your saved CV; templates format your content.' },
  '/cover-letter': { purpose: 'Prepare a letter consistent with your background.', outputs: 'A cover letter to review, edit and download.', uses: 'Select a saved Career Profile CV or job-tailored CV.' },
  '/optimize': { purpose: 'Tailor your CV to a specific vacancy.', outputs: 'Job-match findings and a CV to review, edit and format.', uses: 'Your saved Career Profile and the job description.' },
  '/interview-qa': { purpose: 'Understand the questions you may face.', outputs: 'Practice questions and suggested answers to review.', uses: 'A saved CV; job-specific preparation uses its target job.' },
  '/mock-interview': { purpose: 'Practise answering and learn from feedback.', outputs: 'A practice session, answer review and improvement feedback.', uses: 'Choose a saved CV and the practice options available to you.' },
  '/naukrigulf-optimization': { purpose: 'Prepare clearer content for your Gulf job profile.', outputs: 'Headline options, profile summary, employment descriptions and skills to copy.', uses: 'Your real background. Review the content, then paste it into NaukriGulf yourself.' },
  '/linkedin-optimization': { purpose: 'Help recruiters understand your professional background.', outputs: 'Headline options, About text, experience descriptions and skills to copy.', uses: 'Your real background. Review the content, then update LinkedIn yourself.' },
  '/settings': { purpose: 'Manage your account and data.', outputs: 'Account preferences, plan information and data controls.', uses: 'Your signed-in account.' },
}
