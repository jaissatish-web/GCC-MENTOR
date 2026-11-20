'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useEffect, useState } from 'react'
import { ArrowRight, CheckCircle2, CircleAlert, Pause, Play, Sparkles } from 'lucide-react'
import { INTERVIEWERS, getInterviewer } from '@/lib/voice/interviewers'
import { useInView, useReducedMotion } from './hooks'
import s from './landing.module.css'

const stages = ['Practice', 'Question feedback', 'Progress']
const attempts = [46, 61, 74] as const
const question = 'How would you explain an achievement from your experience?'

/** Local synthetic learning example. No recording, service calls or saved results. */
export function InterviewDemo({ compact = false }: { compact?: boolean }) {
  const reduced = useReducedMotion()
  const { ref, visible } = useInView<HTMLDivElement>(0.1)
  const [index, setIndex] = useState(0)
  const [paused, setPaused] = useState(false)
  const [clock, setClock] = useState(0)
  const [length, setLength] = useState(10)
  const [mode, setMode] = useState('Mixed')
  const [hostId, setHostId] = useState('arab-man')
  const host = getInterviewer(hostId)
  const moving = visible && !reduced && !paused
  useEffect(() => {
    if (!moving || index !== 0) return
    const timer = window.setInterval(() => { if (!document.hidden) setClock(c=>c+1) }, 1000)
    return () => window.clearInterval(timer)
  }, [moving, index])
  return <div ref={ref} className={`${s.demo} ${compact ? s.compact : ''}`} data-motion={moving?'playing':'static'}>
    <div className={s.learning}>
      <div className={s.head}><span>Illustrative demonstration</span><button type="button" aria-pressed={paused} onClick={()=>setPaused(!paused)}>{paused?<Play size={15} aria-hidden="true"/>:<Pause size={15} aria-hidden="true"/>}{paused?'Resume demo':'Pause demo'}</button></div>
      <details className={s.settings}><summary>Adjust demo</summary><div className={s.options}>
        <label>Interviewer<select value={hostId} onChange={e=>setHostId(e.target.value)}>{INTERVIEWERS.map(person=><option key={person.id} value={person.id}>{person.name} · {person.label}</option>)}</select></label>
        <label>Session<select value={length} onChange={e=>setLength(Number(e.target.value))}><option value={5}>Quick · 5 questions</option><option value={10}>Standard · 10 questions</option><option value={15}>Deep · 15 questions</option></select></label>
        <label>Mode<select value={mode} onChange={e=>setMode(e.target.value)}>{['HR','Technical','Gulf readiness','Manager','Mixed'].map(m=><option key={m}>{m}</option>)}</select></label>
      </div></details>
      <div className={s.stage} role="region" aria-label={`${stages[index]} details`}>
        <div className={s.practiceIntro}><div className={s.portrait}><Image key={host.id} src={host.image} alt={`${host.name}, ${host.label}, virtual interviewer`} fill sizes="(min-width: 960px) 280px, (min-width: 600px) 45vw, 100vw" /><span>AI interviewer · {host.name}</span></div><div className={s.question}><span>Q · QUESTION {Math.min(4,length)} OF {length}</span><h3>{question}</h3><p>{mode} · {host.name}</p></div></div>
        <div className={s.answer}><strong>Your answer (structure)</strong><ol className={s.answerSteps}>{['Your responsibility', 'Your actions', 'Your result'].map(step => <li key={step}>{step}</li>)}</ol></div>
        <div className={s.wave} data-inactive={index!==0} aria-hidden="true">{Array.from({length:18},(_,i)=><i key={i} style={{height:8+(i*11%18),animationDelay:i*.06+'s',animationPlayState:moving&&index===0?'running':'paused'}} />)}<span>{clock%12<6?'Read the question':'Prepare your own answer'}</span></div>
        <p className={s.layoutNote}>Illustrative feedback layout</p>
        <div className={s.feedback}>
          <article><CheckCircle2 size={20} aria-hidden="true"/><div><h4>Strengths to build on</h4><p>Review what your answer explains clearly.</p></div></article>
          <article data-warning><CircleAlert size={20} aria-hidden="true"/><div><h4>Areas to improve</h4><p>Identify details that need a clearer explanation.</p></div></article>
          <article><Sparkles size={20} aria-hidden="true"/><div><h4>Suggested next practice</h4><p>Choose one focus from your question feedback.</p></div></article>
        </div>
        <div className={s.interviewTabs} role="group" aria-label="Interview stages">{stages.map((stage,i)=><button type="button" key={stage} aria-pressed={index===i} onClick={()=>setIndex(i)}>{stage}</button>)}</div>
        <button type="button" className={s.interviewAction} onClick={()=>setIndex(index===0?1:index===1?2:0)}>{index===0?'Review this answer':index===1?'See repeat-session progress':'Return to practice'}<ArrowRight size={16} aria-hidden="true"/></button>
        {index===1&&<div className={s.review}>
          <h3>Review each question and answer</h3><p>Revisit the question, your response, strengths and areas to improve. Use the feedback to choose your next practice focus.</p>
          <h4>A useful structure for your next answer</h4><p>Your responsibility → Your actions → Your result. Use examples you can explain from your own work.</p><p>Use only work you performed. This illustration does not assess your ability or predict an interview outcome.</p>
        </div>}
        {index===2&&<p className={s.review}>Practice. Review. Prepare. Repeat. Compare attempts for the same application and settings. Use each question’s feedback to choose your next focus.</p>}
        <Link href="/mock-interview" className={s.link}>Open mock interview <ArrowRight size={16} aria-hidden="true"/></Link>
      </div>
    </div>
    <figure className={s.progress} aria-labelledby="progress-title">
      <figcaption><h3 id="progress-title">See the pattern across attempts.</h3><span className={s.badge}>ILLUSTRATIVE DATA · NOT CUSTOMER RESULTS</span></figcaption>
      <p className={s.axis}>Answer-structure score / 100</p>
      <svg className={s.chart} viewBox="0 0 420 230" role="img" aria-labelledby="attempt-chart-title attempt-chart-desc"><title id="attempt-chart-title">Illustrative three-attempt progress</title><desc id="attempt-chart-desc">Attempt 1: 46. Attempt 2: 61. Attempt 3: 74. Synthetic answer-structure examples, not real results.</desc>
        {[0,25,50,75,100].map(v=><g key={v}><line x1="38" x2="402" y1={192-v*1.65} y2={192-v*1.65} stroke="#CBD5E1"/><text x="28" y={196-v*1.65} textAnchor="end">{v}</text></g>)}
        <polyline points="60,116.1 220,91.35 380,69.9" fill="none" stroke="currentColor" strokeWidth="3"/>
        {attempts.map((value,i)=><g key={value}><circle cx={60+i*160} cy={192-value*1.65} r="5" fill="currentColor"/><text x={60+i*160} y={178-value*1.65} textAnchor="middle" className={s.value}>{value}</text><text x={60+i*160} y="220" textAnchor="middle">Attempt {i+1}</text></g>)}
      </svg>
      <table className={s.attemptTable}><caption>Illustrative attempt values</caption><thead><tr><th scope="col">Attempt</th>{attempts.map((_,i)=><th key={i} scope="col">{i+1}</th>)}</tr></thead><tbody><tr><th scope="row">Score / 100</th>{attempts.map(v=><td key={v}>{v}</td>)}</tr></tbody></table>
      <p>Same application and settings. Not a hiring probability. These synthetic values explain the practice journey; they do not predict your improvement.</p>
      <div className={s.next}><CheckCircle2 size={20} aria-hidden="true"/><strong>Next practice: make your own contribution clear.</strong></div><Link href="/dashboard" className={s.link}>Open my saved progress <ArrowRight size={16} aria-hidden="true"/></Link>
    </figure>
  </div>
}
