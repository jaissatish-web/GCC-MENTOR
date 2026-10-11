'use client'

import { useState } from 'react'
import { Check, ChevronLeft, ChevronRight, FileText, Mail, MessagesSquare, Pause, Play, UserRound } from 'lucide-react'
import { useAutoStep, useInView, useReducedMotion } from './hooks'
import s from './launch.module.css'

const jobs = [
  { title: 'Commissioning Engineer', country: 'Saudi Arabia', focus: 'Loop checks · Start-up · Handover', question: 'How do you prepare a system for commissioning?', opening: 'I am applying for the Commissioning Engineer role. My commissioning experience includes loop checks, start-up support and system handover.' },
  { title: 'Maintenance Engineer', country: 'United Arab Emirates', focus: 'Troubleshooting · Reliability · Maintenance', question: 'Talk me through how you diagnose an instrument fault.', opening: 'I am applying for the Maintenance Engineer role. My relevant experience includes troubleshooting, preventive maintenance and improving equipment reliability.' },
  { title: 'Project Engineer', country: 'Qatar', focus: 'Coordination · Documentation · Delivery', question: 'How do you coordinate work across project teams?', opening: 'I am applying for the Project Engineer role. My project experience includes coordinating teams, maintaining documentation and supporting delivery.' },
]

export function ApplicationStudio() {
  const reduced = useReducedMotion()
  const { ref, visible } = useInView<HTMLDivElement>(0.15)
  const [paused, setPaused] = useState(false)
  const [hovering, setHovering] = useState(false)
  const { index, choose, manual, resume } = useAutoStep(jobs.length, 7000, visible && !paused && !hovering && !reduced)
  const job = jobs[index]
  const toggle = () => { if (paused || manual) { setPaused(false); resume() } else setPaused(true) }
  return <div ref={ref} className={s.studio} onMouseEnter={() => setHovering(true)} onMouseLeave={() => setHovering(false)} onFocusCapture={() => setHovering(true)} onBlurCapture={(e) => { if (!e.currentTarget.contains(e.relatedTarget)) setHovering(false) }}>
    <div className={s.studioSource}><span className={s.studioAvatar}><UserRound size={26} aria-hidden="true" /></span><div><span className={s.miniLabel}>YOUR FOUNDATION</span><strong>One Career Profile</strong><p>Your real experience. Reviewed by you.</p></div><span className={s.exampleChip}>Illustrative demo</span></div>
    <div className={s.studioConnector} aria-hidden="true"><span /><span /><span /></div>
    <div className={s.jobPicker} aria-label="Choose an example job description">
      {jobs.map((j, i) => <button type="button" key={j.title} aria-pressed={index === i} onClick={() => choose(i)}><span>JD 0{i + 1} · {j.country}</span><strong>{j.title}</strong></button>)}
    </div>
    <div className={s.studioPack} key={job.title}>
      <div className={s.packHeader}><div><span className={s.miniLabel}>YOUR APPLICATION FOR THIS JOB</span><h3>{job.title}</h3></div><span><Check size={15} aria-hidden="true" />Same profile · new focus</span></div>
      <div className={s.packDocuments}>
        <article className={s.miniDocument}><span className={s.documentLabel}><FileText size={18} aria-hidden="true" />Job-specific CV</span><div className={s.documentName}>AARAV MEHTA</div><strong>{job.title}</strong><p>{job.focus}</p><div className={s.documentLines} aria-hidden="true"><span /><span /><span /></div><b>Relevant experience</b><p>Highlights drawn from the reviewed Career Profile, aligned with this job description.</p><span className={s.documentStamp}>Choose your resume template</span></article>
        <article className={s.miniDocument}><span className={s.documentLabel}><Mail size={18} aria-hidden="true" />Individual cover letter</span><b>Dear Hiring Manager,</b><p>{job.opening}</p><div className={s.documentLines} aria-hidden="true"><span /><span /></div><p>Kind regards,<br /><strong>Aarav Mehta</strong></p><span className={s.documentStamp}>Written for this application</span></article>
        <article className={s.preparationDocument}><span className={s.documentLabel}><MessagesSquare size={18} aria-hidden="true" />Interview preparation</span><span className={s.miniLabel}>A QUESTION TO PRACTISE</span><h4>{job.question}</h4><ul>{['Role-specific Q&A', 'Mock interview practice', 'AI-guided answer review', 'Your next improvement steps'].map(t => <li key={t}><Check size={16} aria-hidden="true" />{t}</li>)}</ul><a href="#interview">Explore guided practice →</a></article>
      </div>
    </div>
    <div className={s.demoControls}><button type="button" aria-label="Previous application example" onClick={() => choose((index + jobs.length - 1) % jobs.length)}><ChevronLeft size={18} aria-hidden="true" /></button><button type="button" onClick={toggle} aria-pressed={paused || manual}>{paused || manual ? <Play size={16} aria-hidden="true" /> : <Pause size={16} aria-hidden="true" />}{paused || manual ? 'Play examples' : 'Pause examples'}</button><button type="button" aria-label="Next application example" onClick={() => choose((index + 1) % jobs.length)}><ChevronRight size={18} aria-hidden="true" /></button></div>
    <p className={s.demoNote}>Sample profile and documents. Each application uses your approved facts and its own job description. No applications are submitted from this demo.</p>
  </div>
}
