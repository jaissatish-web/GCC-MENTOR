'use client'

import { useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { ArrowRight, ChartNoAxesColumn, Check, CircleAlert, ClipboardCheck, FileCheck2, FileText, Info, ListChecks, Mail, MessageCircle, Mic, UserRound, X } from 'lucide-react'
import s from './landing.module.css'

const concerns = [
  {
    id: 'applications', Icon: Mail,
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
    id: 'experience', Icon: FileCheck2,
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
    id: 'fit', Icon: ChartNoAxesColumn,
    quote: "The job looks right. Am I really qualified?",
    explanation: 'Check confirmed experience, missing evidence and genuine gaps.',
    service: 'ATS Job Match + gap analysis',
    title: 'Understand your fit before you tailor.',
    rows: [
      { Icon: Check, tone: 'confirmed', label: 'Confirmed experience', detail: 'Supported by your Career Profile' },
      { Icon: CircleAlert, tone: 'review', label: 'Missing evidence', detail: 'Review and add details only if true' },
      { Icon: X, tone: 'gap', label: 'Qualification gap', detail: "Do not claim a skill or licence you don't hold" },
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

const fitExample = [
  { requirement: 'Customer service experience', status: 'Confirmed', tone: 'confirmed' },
  { requirement: 'Team scheduling', status: 'Evidence needed', tone: 'review' },
  { requirement: 'Required licence', status: 'Qualification gap', tone: 'gap' },
] as const

export function CandidateConcerns() {
  const [selected, setSelected] = useState('fit')
  const current = concerns.find(concern => concern.id === selected) ?? concerns[2]

  return (
    <section id="challenges" className={s.concernsSection} aria-labelledby="challenges-title">
      <div className={s.concernsInner}>
        <div className={s.concernsIntro}>
          <h2 id="challenges-title">You have the experience. So why aren&apos;t <span>Gulf recruiters calling?</span></h2>
          <p>You&apos;ve worked hard, built real skills and gained valuable experience. But when you apply for Gulf opportunities, your resume may not be showing employers what you can actually do.</p>
        </div>
        <h3 id="concern-choices-title" className={s.columnTitle}>Which feels familiar?</h3>
        <ul className={s.concernList} aria-labelledby="concern-choices-title">
          {concerns.map(({ id, Icon, quote, service }) => (
            <li key={id}>
              <button type="button" data-concern-choice={id} className={s.concernChoice} aria-pressed={selected === id} aria-controls="preparation-response" aria-labelledby={`concern-${id}`} aria-describedby={`concern-service-${id}`} onClick={() => setSelected(id)}>
                <span className={s.concernProblem}>
                  <Image src={`/landing/v3/concern-${id}.webp`} alt="" width={240} height={160} sizes="(min-width: 768px) 116px, 72px" />
                  <span id={`concern-${id}`}>{quote}</span>
                </span>
                <span className={s.concernConnector} aria-hidden="true"><ArrowRight size={14} /></span>
                <span className={s.concernService}>
                  <Icon size={22} strokeWidth={1.7} aria-hidden="true" />
                  <span id={`concern-service-${id}`}>{service}</span>
                </span>
              </button>
            </li>
          ))}
        </ul>
        <section id="solutions" aria-labelledby="solutions-title">
          <h2 id="solutions-title" className={s.preparationBanner}>Your experience deserves better preparation.</h2>
          <div id="preparation-response" className={s.response} aria-labelledby="preparation-response-title" aria-describedby="preparation-example-note">
            <div className={s.responseGrid}>
              <div>
                <h3 id="preparation-response-title">{current.title}</h3>
                <p className={s.selectedReason}>{current.explanation}</p>
                <ul className={s.evidence}>
                  {current.rows.map(row => (
                    <li key={row.label} data-tone={'tone' in row ? row.tone : undefined}>
                      <span className={s.evidenceIcon}><row.Icon size={17} strokeWidth={2} aria-hidden="true" /></span>
                      <div><strong>{row.label}</strong><span>{row.detail}</span></div>
                    </li>
                  ))}
                </ul>
              </div>
              <div className={s.fitExample}>
                <p id="preparation-example-note" className={s.example}>Illustrative example, not a real assessment.</p>
                <p className={s.responseService}><current.Icon size={19} aria-hidden="true" />{current.service}</p>
                {current.id === 'fit' ? (
                  <ul className={s.fitRequirements} aria-label="Sample job requirements">
                    {fitExample.map(({ requirement, status, tone }) => (
                      <li key={requirement} data-tone={tone}><span>{requirement}</span><span className={s.fitStatus}>{status}</span></li>
                    ))}
                  </ul>
                ) : (
                  <Image className={s.preparationDocument} src="/landing/v3/preparation-evidence.webp" alt="" width={320} height={320} sizes="136px" />
                )}
              </div>
            </div>
            <p className={s.responseNote}><Info size={16} aria-hidden="true" />{current.note}</p>
          </div>
          <p className={s.announcement} role="status" aria-live="polite" aria-atomic="true">Preparation focus: {current.service}</p>
          <div className={s.concernsAction}><Link href="#services" className={s.concernsCta}>See how it works </Link><small>Preparation supports your application. Employers decide whom to shortlist and hire.</small></div>
        </section>
      </div>
    </section>
  )
}
