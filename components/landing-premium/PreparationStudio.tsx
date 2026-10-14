'use client'
import Image from 'next/image'
import Link from 'next/link'
import { useRef, useState } from 'react'
import { ArrowRight, BookOpen, Check, FileText, Mic, ShieldCheck, UserRound } from 'lucide-react'
import { PROFESSIONS } from '@/app/preparation-pack/catalog'
import s from './premium.module.css'
const previews = [
 { title: 'ATS CV', route: '/optimize/target', icon: FileText },
 { title: 'Cover letter', route: '/cover-letter', icon: FileText },
 { title: 'Interview Q&A', route: '/interview-qa', icon: BookOpen },
 { title: 'Mock interview', route: '/mock-interview', icon: Mic },
 { title: 'LinkedIn', route: '/linkedin-optimization', icon: UserRound },
 { title: 'NaukriGulf', route: '/naukrigulf-optimization', icon: UserRound },
] as const
const rolesByPath: readonly (readonly string[])[] = [
 ['Maintenance Engineer', 'Mechanical Commissioning Engineer', 'Facilities Engineer'],
 ['Control Systems Engineer', 'I&C Commissioning Engineer', 'Instrumentation Engineer'],
 ['Power Systems Engineer', 'Electrical Commissioning Engineer', 'Electrical Maintenance Engineer'],
 ['Site Engineer', 'Infrastructure Engineer', 'Construction Engineer'],
 ['Piping Engineer', 'Welding Inspector', 'Mechanical Completion Engineer'],
 ['Plant Operator', 'Production Engineer', 'Process Commissioning Engineer'],
 ['QA/QC Inspector', 'Supplier Quality Engineer', 'Project Quality Engineer'],
 ['Construction HSE Officer', 'Safety Specialist', 'Project HSE Manager'],
 ['Planning Engineer', 'Quantity Surveyor', 'Project Manager'],
 ['Software Engineer', 'Network Engineer', 'IT Support Specialist'],
 ['Registered Nurse', 'Healthcare Operations Coordinator', 'Service Quality Coordinator'],
 ['Financial Accountant', 'Cost Accountant', 'Finance Operations Analyst'],
 ['Recruitment Specialist', 'HR Specialist', 'Office Administrator'],
 ['Buyer', 'Warehouse Supervisor', 'Logistics Coordinator'],
 ['Guest Services Associate', 'Sales Executive', 'Branch Supervisor'],
 ['Teacher', 'Technical Instructor', 'Learning Programme Coordinator'],
]
export function PreparationStudio() {
 const [profession, setProfession] = useState(0), [job, setJob] = useState(0), [tab, setTab] = useState(0)
 const refs = useRef<Array<HTMLButtonElement | null>>([])
 const p = PROFESSIONS[profession], role = rolesByPath[profession][job], focus = p.paths[job], preview = previews[tab], Icon = preview.icon
 const question = job === 0 ? p.question : job === 1 ? `What would you check before starting ${focus.toLowerCase()} work?` : `How would you prioritize and report your ${focus.toLowerCase()} responsibilities?`
 return <div className={s.studio} id="preparation-demo">
  <div className={s.studioBar}><span><i/>YOUR PREPARATION PACK <small>One profile. A pack for each job.</small></span><label>Choose your profession<select value={profession} onChange={event => { setProfession(Number(event.target.value)); setJob(0) }}>{PROFESSIONS.map((item, i) => <option key={item.name} value={i}>{item.name}</option>)}</select></label></div>
  <div className={s.flowStrip} aria-label="Preparation workflow"><span><UserRound size={18}/>Your Career Profile</span><ArrowRight size={17}/><span><FileText size={18}/>Target job description</span><ArrowRight size={17}/><span><ShieldCheck size={18}/>Your preparation pack</span></div>
  <div className={s.demoJobs} role="group" aria-label="Target job focus">{p.paths.map((path, i) => <button key={path} type="button" aria-pressed={job === i} onClick={() => setJob(i)}><span>{rolesByPath[profession][i]}</span><b>{path}</b>{job === i ? <Check size={16}/> : <ArrowRight size={16}/>}</button>)}</div>
  <div className={`${s.tabs} ${s.photoTabs}`} role="tablist" aria-label="Preparation output">{previews.map((item, i) => <button key={item.title} ref={element => { refs.current[i] = element }} type="button" role="tab" id={`prep-tab-${i}`} aria-selected={tab === i} aria-controls="prep-output" tabIndex={tab === i ? 0 : -1} onClick={() => setTab(i)} onKeyDown={event => {
   const next = event.key === 'ArrowRight' ? (i + 1) % previews.length : event.key === 'ArrowLeft' ? (i + previews.length - 1) % previews.length : event.key === 'Home' ? 0 : event.key === 'End' ? previews.length - 1 : null
   if (next !== null) { event.preventDefault(); setTab(next); refs.current[next]?.focus() }
  }}>{item.title}</button>)}</div>
  <div className={`${s.demoOutput} ${s.productOutput}`} role="tabpanel" id="prep-output" aria-labelledby={`prep-tab-${tab}`} tabIndex={0}>
   <div className={s.outputDocument}>
    <div className={s.documentBar}><Icon size={18}/><span>{preview.title}</span><span>{tab < 2 ? 'Application document' : 'Prepare with purpose'}</span></div>
    {tab === 0 ? <div className={s.cvProduct}><div className={s.resumePhoto}><Image src="/landing/ats-template-hd.webp" alt="Single-column CV with professional summary, experience, skills and education" fill sizes="(min-width: 768px) 260px, 240px" className="object-contain"/></div><ul>{['Clear professional summary', 'Relevant experience first', 'Skills aligned to the role', 'Readable single-column layout'].map(text => <li key={text}><Check size={16}/>{text}</li>)}</ul></div> : null}
    {tab === 1 ? <div className={s.letterPreview}><span>YOUR NAME · {role.toUpperCase()}</span><h4>Application for {role}</h4><p>Dear Hiring Team,</p><p>I am interested in your {role} opportunity focused on {focus.toLowerCase()}.</p><p>My background in {p.skills.join(', ').toLowerCase()} provides relevant experience to discuss against your requirements.</p><p>I would welcome the opportunity to explain how my experience fits the role.</p><p>Kind regards,<br/>Your name</p></div> : null}
    {tab === 2 || tab === 3 ? <div className={s.answerPreview}><span className={s.kicker}>{tab === 2 ? 'A QUESTION FOR THIS ROLE' : 'YOUR INTERVIEW PREPARATION'}</span><h4>{tab === 2 ? question : `Tell me about your experience in ${focus.toLowerCase()}.`}</h4><ol>{(tab === 2 ? [['Situation', 'Choose a relevant challenge from your experience.'], ['Your action', 'Explain your responsibility and the steps you took.'], ['Result', 'Describe the outcome you can support with facts.']] : [['Practise', 'Answer using an example from your own career.'], ['Review', 'Understand strengths and missing detail.'], ['Prepare again', 'Use feedback to choose your next focus.']]).map(([title, detail]) => <li key={title}><strong>{title}</strong><p>{detail}</p></li>)}</ol></div> : null}
    {tab === 4 || tab === 5 ? <div className={s.profilePreview}><span className={s.kicker}>YOUR PROFESSIONAL HEADLINE</span><h4>{role} · {p.skills[job]}</h4><span className={s.kicker}>{tab === 4 ? 'ABOUT YOUR EXPERIENCE' : 'PROFILE SUMMARY'}</span><p>Present your background in {focus.toLowerCase()}, supported by {p.skills.join(', ').toLowerCase()}.</p><span className={s.kicker}>RELEVANT SKILLS</span><div className={s.demoSkills}>{p.skills.map(skill => <span key={skill}>{skill}</span>)}</div><p className={s.profileNote}>Review the guidance and update your own {preview.title} account.</p></div> : null}
   </div>
   <div className={s.demoContext}><span className={s.kicker}>{focus}</span><h3>{preview.title} for<br/>{role}</h3><p>{tab === 0 ? 'Keep your facts. Make relevant experience easier to find.' : tab === 1 ? 'Explain your fit for this opening with a focused cover letter.' : tab === 2 ? 'Prepare relevant examples before the interview.' : tab === 3 ? 'Practise your answer and understand what to improve.' : 'Make your professional background easier for recruiters to understand.'}</p><ul className={s.outputBenefits}>{(tab === 0 ? ['Your real experience', 'Job-relevant structure', 'Your choice of 50+ templates'] : tab === 1 ? ['A clear introduction', 'Experience linked to the role', 'Ready for your review'] : tab === 2 ? ['Questions for the target role', 'A clear answer structure', 'Examples from your own work'] : tab === 3 ? ['Guided interview practice', 'Feedback on your answers', 'Saved reports for your next step'] : ['Clear role positioning', 'Relevant skills and experience', 'Guidance you control']).map(text => <li key={text}><Check size={17}/>{text}</li>)}</ul><Link href={preview.route} className={s.primary}>Open {preview.title} preparation <ArrowRight size={17}/></Link></div>
  </div>
  <div className={s.studioFoot}><span><ShieldCheck size={16}/>Your profile · Your target job · Your review</span><span>Different opening? Prepare a separate pack.</span></div>
 </div>
}
