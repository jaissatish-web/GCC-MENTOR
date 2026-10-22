/** Logical profile blocks reuse existing fields/categories; no schema migration. */
export interface CareerProfileBlock {
  id: string
  title: string
  description: string
  categoryNames?: readonly string[]
}

export const PROFILE_BLOCKS: readonly CareerProfileBlock[] = [
  { id: 'contact', title: 'Personal & Contact Details', description: 'How employers can reach you, plus optional personal details.' },
  { id: 'summary', title: 'Professional Summary / Career Objective', description: 'Your own introduction, experience or career direction.' },
  { id: 'experience', title: 'Work Experience', description: 'Employment, internships, apprenticeships, freelance or self-employed work.' },
  { id: 'education', title: 'Education & Qualifications', description: 'Your qualifications, institutions and stated study status.', categoryNames: ['Education Details'] },
  { id: 'skills', title: 'Skills & Tools', description: 'Technical, trade and business skills, software, systems and equipment.', categoryNames: ['Software & Systems'] },
  { id: 'training', title: 'Certifications & Training', description: 'Certificates, short courses and vocational or professional training.', categoryNames: ['Training'] },
  { id: 'licences', title: 'Professional Licences & Approvals', description: 'Relevant professional registrations, client approvals and driving licences.', categoryNames: ['Professional Licences & Approvals'] },
  { id: 'projects', title: 'Projects & Portfolio Work', description: 'Industrial, academic, research, software, design or freelance projects.', categoryNames: ['Projects'] },
  { id: 'languages', title: 'Languages', description: 'Languages and proficiency levels you have supplied.', categoryNames: ['Languages'] },
  { id: 'achievements', title: 'Achievements & Awards', description: 'Standalone recognitions and awards; keep job results with their job.', categoryNames: ['Awards & Achievements'] },
  { id: 'activities', title: 'Professional & Community Activities', description: 'Memberships, volunteering, leadership and relevant activities.', categoryNames: ['Professional & Community Activities'] },
  { id: 'research', title: 'Research, Publications & Intellectual Property', description: 'Research, publications, presentations and patents.', categoryNames: ['Research & Publications'] },
  { id: 'links', title: 'Professional Links', description: 'LinkedIn, GitHub, portfolio, website and other professional links.', categoryNames: ['Professional Links'] },
  { id: 'gulf', title: 'Gulf Preferences & Availability', description: 'Target roles/countries, relocation, notice period and preparation details.', categoryNames: ['Availability & Preferences'] },
]

/** Headings select presentation only; never rename a saved category or infer facts. */
export function profileBlockForCategory(name: string): string | null {
  const heading = name.trim().toLowerCase()
  if (!heading || heading === 'preparation details (private)' || heading === 'profile headline') return null
  if (/education details|study status|academic status/.test(heading)) return 'education'
  if (/licen[cs]|registration|approval|accreditation/.test(heading)) return 'licences'
  if (/publication|patent|intellectual property|research|conference|presentation/.test(heading)) return 'research'
  if (/project|portfolio work/.test(heading)) return 'projects'
  if (/language|linguistic/.test(heading)) return 'languages'
  if (/award|honou?r|achievement|scholarship/.test(heading)) return 'achievements'
  if (/member|affiliation|association|volunteer|community|leadership|extracurricular|activities/.test(heading)) return 'activities'
  if (/link|github|website|portfolio|social|online profile/.test(heading)) return 'links'
  if (/training|course|workshop|development|certificat/.test(heading)) return 'training'
  if (/software|system|tool|computer/.test(heading)) return 'skills'
  if (/availab|notice|relocat|salary|preference/.test(heading)) return 'gulf'
  return null
}
