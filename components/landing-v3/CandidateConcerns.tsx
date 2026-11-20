'use client'

import { useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { BriefcaseBusiness, CheckCircle2, ChevronRight, CircleAlert, ClipboardCheck, FileCheck2, FileText, ListChecks, MessageCircle, Mic, Send, Target, UserRound } from 'lucide-react'
import s from './landing.module.css'

const concerns = [
  {
    id: 'applications', Icon: Send,
    quote: "I've applied to so many Gulf jobs. Why no interview calls?",
    explanation: 'The same resume may miss what each vacancy asks for.',
    service: 'Job-specific package + Cover Letter',
    title: 'Prepare for one vacancy.',
    rows: [
      { Icon: ListChecks, label: 'Review the requirements', detail: 'Identify what this particular vacancy asks for.' },
      { Icon: FileCheck2, label: 'Prepare a relevant package', detail: 'Bring forward experience that supports this role.' },
      { Icon: MessageCircle, label: 'Explain your relevance', detail: 'Use a Cover Letter grounded in your actual work.' },
    ],
    note: 'A relevant application starts with the role, not another generic edit.',
  },
  {
    id: 'experience', Icon: BriefcaseBusiness,
    quote: "I've done this work for years. My resume doesn't show it.",
    explanation: 'Bring forward relevant responsibilities, skills, projects and real achievements.',
    service: 'Career Profile + Optimized Resume',
    title: 'Make your actual work visible.',
    rows: [
      { Icon: UserRound, label: 'Review your Career Profile', detail: 'Confirm your responsibilities, projects and skills.' },
      { Icon: ClipboardCheck, label: 'Find the relevant evidence', detail: 'Describe your own actions and verified results.' },
      { Icon: FileCheck2, label: 'Prepare your Optimized Resume', detail: 'Change the emphasis for the role, while keeping your facts.' },
    ],
    note: 'Better presentation, grounded in what you actually did.',
  },
  {
    id: 'fit', Icon: Target,
    quote: "The job looks right. Am I really qualified?",
    explanation: 'Check confirmed experience, missing evidence and genuine gaps.',
    service: 'ATS Job Match + gap analysis',
    title: 'Understand your fit before you tailor.',
    rows: [
      { Icon: CheckCircle2, label: 'Confirmed experience', detail: 'Supported by your Career Profile' },
      { Icon: CircleAlert, label: 'Missing evidence', detail: 'Review and add details only if true' },
      { Icon: FileText, label: 'Qualification gap', detail: "Do not claim a skill or licence you don't hold" },
    ],
    note: 'A gap stays a gap. Your facts stay yours.',
  },
  {
    id: 'interview', Icon: Mic,
    quote: 'I know my job. I struggle to explain it in interviews.',
    explanation: 'Practise your responsibilities, actions, technical reasoning and results.',
    service: 'Interview Q&A + mock interview feedback',
    title: 'Explain the work you know.',
    rows: [
      { Icon: MessageCircle, label: 'Prepare relevant Q&A', detail: 'Use questions connected to your experience and target role.' },
      { Icon: Mic, label: 'Practise a clear answer', detail: 'Explain your responsibility, actions, reasoning and results.' },
      { Icon: ClipboardCheck, label: 'Review actionable feedback', detail: 'See what worked, what is missing and what to practise next.' },
    ],
    note: 'Practise explaining your experience, without inventing an answer.',
  },
] as const

export function CandidateConcerns() {
  const [selected, setSelected] = useState('fit')
  const current = concerns.find(concern => concern.id === selected) ?? concerns[2]

  return <section id="challenges" className={s.concernsSection} aria-labelledby="challenges-title">
    <div className={s.concernsInner}>
      <div className={s.concernsIntro}>
        <h2 id="challenges-title">You have the experience. So why aren&apos;t <span>Gulf recruiters calling?</span></h2>
        <p>You&apos;ve worked hard, built real skills and gained valuable experience. But when you apply for Gulf opportunities, your resume may not be showing employers what you can actually do.</p>
      </div>
      <div className={s.workspace}>
        <div className={s.concerns}>
          <h3 id="concern-choices-title" className={s.columnTitle}>Which feels familiar?</h3>
          <ul className={s.list} aria-labelledby="concern-choices-title">
            {concerns.map(({ id, Icon, quote, explanation, service }) => <li key={id}>
              <button type="button" data-concern-choice={id} className={s.choice} aria-pressed={selected === id} aria-controls="preparation-response" aria-labelledby={`concern-${id}`} aria-describedby={`concern-service-${id}`} onClick={() => setSelected(id)}>
                <Icon className={s.concernIcon} size={28} strokeWidth={1.6} aria-hidden="true" />
                <span className={s.choiceCopy}><strong id={`concern-${id}`}>{quote}</strong><span className={s.reason}>{explanation}</span><span id={`concern-service-${id}`} className={s.service}>{service}</span></span>
                <ChevronRight className={s.chevron} size={18} aria-hidden="true" />
              </button>
            </li>)}
          </ul>
        </div>
        <section id="solutions" className={s.solution} aria-labelledby="solutions-title">
          <h2 id="solutions-title" className={s.columnTitle}>Your experience deserves better preparation.</h2>
          <div id="preparation-response" className={s.response} aria-labelledby="preparation-response-title" aria-describedby="preparation-example-note">
            <p id="preparation-example-note" className={s.example}>Illustrative example, not a real assessment</p>
            <div className={s.responseGrid}>
              <Image className={s.document} src="/landing/v3/preparation-evidence.webp" alt="" width={320} height={320} sizes="(min-width:1024px) 160px, 100px" />
              <div className={s.responseCopy}>
                <h3 id="preparation-response-title">{current.title}</h3>
                <p className={s.selectedReason}>{current.explanation}</p>
                <ul className={s.evidence}>{current.rows.map(({ Icon, label, detail }) => <li key={label}><Icon size={23} strokeWidth={1.7} aria-hidden="true" /><div><strong>{label}</strong><span>{detail}</span></div></li>)}</ul>
              </div>
            </div>
            <p className={s.responseService}>{current.service}</p>
            <p className={s.responseNote}>{current.note}</p>
          </div>
          <p className={s.announcement} role="status" aria-live="polite" aria-atomic="true">Preparation focus: {current.service}</p>
          <div className={s.concernsAction}><Link href="#how-it-works" className={s.concernsCta}>See how it works </Link><small>Preparation supports your application. Employers decide whom to shortlist and hire.</small></div>
        </section>
      </div>
    </div>
  </section>
}
