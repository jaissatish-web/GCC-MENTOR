import { PROFESSION_EXAMPLES } from '../landing-v3/professionExamples'
export type DemoProfile = { department: string; role: string; country: string; name: string; initials: string; focus: string; source: string; original: string; targeted: string; summary: string; skills: readonly string[]; question: string; answer: string }
const extra = (department: string, role: string, skills: string[], question: string, answer: string): DemoProfile => ({ department, role, country: 'Saudi Arabia', name: 'Sam Ali', initials: 'SA', focus: skills.join(' · '), source: `Practical experience in ${skills.join(', ').toLowerCase()}.`, original: `Helped with ${skills[0].toLowerCase()} and kept records for the team.`, targeted: `Supported ${skills[0].toLowerCase()}, coordinated ${skills[1].toLowerCase()} and maintained ${skills[2].toLowerCase()} for the team.`, summary: `${role} with practical experience in ${skills.join(', ').toLowerCase()}.`, skills, question, answer })
export const profiles: DemoProfile[] = [...PROFESSION_EXAMPLES,
 extra('QA/QC', 'QA/QC Inspector', ['Quality inspections','Inspection coordination','Quality records'], 'How would you handle an inspection that does not meet approved requirements?', 'Record the finding against the approved requirements. Inform the responsible team, follow the nonconformance process and verify the corrective evidence before closure.'),
 extra('HSE', 'Safety Officer', ['Safety inspections','Team coordination','Safety records'], 'How would you respond to an unsafe condition on site?', 'Follow the approved stop-work and escalation procedure. Explain the hazard, communicate with the responsible team and verify controls before work resumes.'),
 extra('Construction & Maintenance', 'Site Supervisor', ['Site inspections','Work coordination','Handover records'], 'How would you coordinate an unexpected equipment failure during plant operations?', 'Follow the site safety and escalation procedure. Explain how you would coordinate authorized teams, review the failure records and confirm the required checks before restart.'),
 extra('Logistics', 'Logistics Coordinator', ['Shipment tracking','Delivery coordination','Transport records'], 'How would you manage a delayed shipment?', 'Confirm the shipment status and the cause of delay. Communicate the impact, coordinate an approved alternative and document the updated delivery plan.'),
 extra('Administration', 'Office Administrator', ['Office support','Team coordination','Document records'], 'How would you prioritize competing requests?', 'Clarify deadlines and business impact. Agree priorities with the responsible team, keep stakeholders informed and document follow-up.'),
]
export const services = [
 ['GCC Readiness','Understand your preparation gaps.','/gulf-readiness-score','readiness'],
 ['ATS Job Match','Compare your resume with a job description.','/optimize/target','match'],
 ['Resume Optimization','Present your real experience for the role.','/optimize/target','cv'],
 ['Cover Letter','Introduce your relevance to this job.','/cover-letter','letter'],
 ['Interview Q&A','Prepare role-specific answer structures.','/interview-qa','qa'],
 ['Mock Interview','Practise and review your next step.','/mock-interview','interview'],
 ['Resume Templates','Choose from 50+ real resume designs.','/templates','templates'],
 ['Saved Reports','Revisit applications and preparation.','/dashboard/library','reports'],
 ['LinkedIn Optimization','Present your professional story from your profile.','/linkedin-optimization','linkedin'],
 ['NaukriGulf Optimization','Prepare your profile for Gulf recruiter visibility.','/naukrigulf-optimization','naukrigulf'],
] as const
export const problems = [
 ['Late applications','The shortlist may already be moving.','Reuse your Career Profile to prepare for an active vacancy. Applying early can help; selection still depends on employer criteria.'],
 ['One generic resume','Your relevant experience is hard to spot.','Match your resume to each job description, with terminology supported by your actual work.'],
 ['ATS filtering','Required skills may not be clear.','Use ATS Job Match to identify relevant gaps and improve structure. A match score does not guarantee shortlisting.'],
 ['Weak cover letter','Your introduction does not explain the fit.','Prepare a letter that connects the same profile and resume to the target vacancy.'],
 ['Unfamiliar Gulf requirements','You are unsure what to prepare.','Use GCC readiness and destination guidance to review your preparation gaps. Confirm employer-specific requirements.'],
 ['Interview nerves','Your experience is difficult to explain.','Practise role-specific questions and review transcript-based feedback on your answer clarity and structure.'],
 ['What, how and when to speak','Answers may be incomplete or too long.','Study suggested structures, explain your own action and verified result, and practise being concise.'],
 ['No preparation plan','You do not know what to work on next.','Use feedback and saved comparable sessions to choose your next practice focus.'],
] as const
