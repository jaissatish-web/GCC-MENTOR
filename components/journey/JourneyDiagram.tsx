'use client'

import { NAMES } from '@/lib/serviceLabels'

import { useState } from 'react'
import Link from 'next/link'
import { ArrowRight, BadgeCheck, BriefcaseBusiness, Check, CheckCircle2, ChevronDown, ClipboardList, FileText, FileUp, Keyboard, LayoutTemplate, Mail, MessageSquareText, Repeat2, Sparkles, Target, UserRound } from 'lucide-react'
import { JOBS } from './journeyExamples'
import { cn } from '@/lib/utils'
import s from './how-it-works.module.css'

const OUTPUTS = [
  { key: 'letter', title: 'Cover letters', badge: 'Multiple versions', icon: Mail, detail: 'A tailored introduction for this opening. Explore, review and save different versions.' },
  { key: 'qa', title: NAMES.interviewQa, badge: 'Multiple sets', icon: MessageSquareText, detail: 'Gulf-standard Q&A for your profile and this role. Prepare for relevant questions you may be asked.' },
  { key: 'mock', title: 'Mock interviews', badge: 'Multiple sessions', icon: ClipboardList, detail: 'Put your preparation into practice. Get guided feedback and find your next improvement.' },
]

export function JourneyDiagram() {
  const [selected, setSelected] = useState(1)
  const [expanded, setExpanded] = useState('mock')
  return <div className={s.journeyCanvas}>

    <section className={cn(s.flowCard, s.importCard)} data-ui-service="tailor">
      <div className={s.nodeHeading}><span className={s.iconTile}><FileUp aria-hidden="true" /></span><div><span className={s.stepLabel}>STEP 01</span><h3>Add your experience</h3></div></div>
      <div className={s.importOptions}>{[{ title: 'Upload PDF / DOCX', hint: 'Bring your old resume', icon: FileUp }, { title: 'Paste resume', hint: 'Use the text you have', icon: FileText }, { title: 'Type details', hint: 'Start with your experience', icon: Keyboard }].map(({ title, hint, icon: Icon }) => <div key={title} className={s.importOption}><Icon aria-hidden="true" size={20} /><strong>{title}</strong><span>{hint}</span></div>)}</div>
    </section>
    <div className={s.flowLine} aria-hidden="true" />
    <div className={s.reviewPill}><BadgeCheck aria-hidden="true" size={18} />Review & confirm your details</div>
    <div className={s.flowLine} aria-hidden="true" />

    <div className={s.foundation}>
    <div className={s.profileJunction}>
      <section className={cn(s.flowCard, s.profileCard)} data-ui-service="profile"><div className={s.nodeHeading}><span className={s.iconTile}><UserRound aria-hidden="true" /></span><div><span className={s.stepLabel}>STEP 02</span><h3>Career Profile</h3><p>Your confirmed experience. One trusted starting point.</p></div><CheckCircle2 aria-hidden="true" className={s.profileCheck} size={20} /></div></section>
      <div className={s.profileBranches} role="group" aria-label="LinkedIn and NaukriGulf use your Career Profile">
        <Link href="/linkedin-optimization" className={s.socialCard} data-ui-service="linkedin"><span className={s.iconTile}><UserRound aria-hidden="true" /></span><div><h4>{NAMES.linkedin}</h4><p>From your Career Profile to your professional story.</p></div><ArrowRight aria-hidden="true" size={16} /></Link>
        <Link href="/naukrigulf-optimization" className={s.socialCard} data-ui-service="naukrigulf"><span className={s.iconTile}><BriefcaseBusiness aria-hidden="true" /></span><div><h4>{NAMES.naukrigulf}</h4><p>From your Career Profile to Gulf recruiter visibility.</p></div><ArrowRight aria-hidden="true" size={16} /></Link>
      </div>
    </div>
    <div className={s.flowLine} aria-hidden="true" />
    <section className={cn(s.flowCard, s.targetCard)} data-ui-service="tailor">
      <div className={s.nodeHeading}><span className={s.iconTile}><Target aria-hidden="true" /></span><div><span className={s.stepLabel}>STEP 03</span><h3>Add a target job</h3><p>A new opening creates a new preparation journey.</p></div></div>
      <div className={s.inputExamples}><div><span>Job title</span><strong>e.g. Maintenance Engineer</strong></div><div><span>Job description</span><strong>Paste the opening here…</strong></div></div>
    </section>
    </div>
    <div className={s.flowLine} aria-hidden="true" />
    <div className={s.jobFork} role="group" aria-label="Explore a job branch">{JOBS.map((job, i) => <button key={job.title} type="button" aria-pressed={selected === i} onClick={() => setSelected(i)} className={cn(s.jobChoice, selected === i && s.jobChoiceActive)}><span className={s.branchNumber}>3.{i + 1}</span><span><strong>{job.title}</strong><small>{selected === i ? 'Journey expanded below' : 'Explore this job'}</small></span>{selected === i ? <Check size={17} aria-hidden="true" /> : <ChevronDown size={17} aria-hidden="true" />}</button>)}</div>
    <div className={s.flowLine} aria-hidden="true" />

    <section className={s.preparationArea} aria-label="Selected job preparation">
      <div className={s.activeJourney}><span className={s.activeDot} aria-hidden="true" /><span>3.{selected + 1} · {JOBS[selected].title}</span><span>PREPARATION PACK</span></div>
      <div className={s.cvNode} data-ui-service="tailor"><span className={s.iconTile}><FileText aria-hidden="true" /></span><div><h4>Optimized Resume</h4><p>Your experience, matched to this job description.</p></div><span className={s.cvSteps}><LayoutTemplate size={16} aria-hidden="true" /> Template <ArrowRight size={12} aria-hidden="true" /> Save <ArrowRight size={12} aria-hidden="true" /> Download</span></div>
      <div className={s.outputFork}>{OUTPUTS.map(({ key, title, badge, icon: Icon, detail }) => <section key={key} data-ui-service={key} className={cn(s.outputNode, expanded === key && s.outputOpen)}><button type="button" onClick={() => setExpanded(expanded === key ? '' : key)} aria-expanded={expanded === key} className={s.outputTrigger}><span className={s.iconTile}><Icon aria-hidden="true" /></span><span><strong>{title}</strong><small>{badge}</small></span><ChevronDown aria-hidden="true" size={16} /></button>{expanded === key ? <div className={s.outputBody}><p>{detail}</p>{key === 'qa' ? <span className={s.topicPill}>Technical · Safety · Role scenarios</span> : key === 'letter' ? <span className={s.topicPill}>Create · Review · Save versions</span> : <span className={s.topicPill}>Practise · Review · Build confidence</span>}</div> : null}</section>)}</div>
      {expanded === 'mock' ? <div className={s.improvementPanel} data-ui-service="mock"><div className={s.improvementHeading}><span className={s.iconTile}><Repeat2 aria-hidden="true" /></span><div><h4>Every practice is a step forward.</h4><p>Turn guided feedback into stronger answers.</p></div><Sparkles aria-hidden="true" size={20} /></div><ol className={s.improvementSteps}>{[{ title: 'Practise', detail: 'Try a session' }, { title: 'Guided review', detail: 'Understand feedback' }, { title: 'Improve', detail: 'Focus your next answer' }, { title: 'Repeat', detail: 'Practise again' }, { title: 'See progress', detail: 'Compare sessions' }].map((step, i) => <li key={step.title}><span>{i + 1}</span><div><strong>{step.title}</strong><small>{step.detail}</small></div>{i < 4 ? <ArrowRight aria-hidden="true" size={15} /> : null}</li>)}</ol></div> : null}
    </section>
    <p className={s.journeyFootnote}><CheckCircle2 aria-hidden="true" size={16} />Each job keeps its own description, CV and preparation history.</p>
    <p className={s.profileResumeNote}><FileText aria-hidden="true" size={16} />You can also preview and download your Career Profile Resume before targeting a job.</p>
  </div>
}
