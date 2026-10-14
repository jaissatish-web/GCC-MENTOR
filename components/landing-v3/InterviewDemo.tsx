'use client'

import Image from 'next/image'
import { useEffect, useId, useRef, useState } from 'react'
import { ArrowRight, Check, Mic, MessageCircle, Target, Volume2, CircleAlert, Sparkles } from 'lucide-react'
import { INTERVIEWERS, getInterviewer } from '@/lib/voice/interviewers'
import { useInView, useReducedMotion } from './hooks'
import s from './interview.module.css'
const stages = ['Practice', 'Question feedback', 'Progress']
const metrics = [['Technical knowledge',60,78],['Role fit',64,80],['Gulf readiness',55,72],['Answer structure',48,74]] as const
const reviews = [
  ['Confidence & clarity', 'Be more specific', 'State your responsibility and action clearly. This is an answer-clarity cue, not a measurement of vocal confidence.'],
  ['Speaking & delivery', 'Pace example: 118 words/min', 'Keep a steady pace. Pause between the problem, action and result. The example transcript has one filler.'],
  ['Grammar', 'Correction needed', '“Then we find” → “Then we found.” Use past tense consistently for a past event.'],
  ['Technical detail', 'Evidence missing', 'The cause, checks and result are not explained. There is not enough technical detail to judge correctness.'],
  ['Resume & job fit', 'Connect your experience', 'Use an example supported by your optimized CV and explain how it relates to the target role.'],
  ['Answer correctness', 'Partly demonstrated', 'Reviewing records and involving the team are relevant steps. Explain how you verified the corrective action.'],
] as const
export function InterviewDemo({ compact = false }: { compact?: boolean }) {
  const reduced = useReducedMotion()
  const { ref, visible } = useInView<HTMLDivElement>(0.1)
  const [index,setIndex] = useState(0)
  const [expanded, setExpanded] = useState(false)
  const [interacted, setInteracted] = useState(false)
  const stageRef = useRef<HTMLDivElement>(null)
  const stageId = useId()
  const [clock,setClock] = useState(0)
  const [length,setLength] = useState(10)
  const [mode,setMode] = useState('Mixed')
  const [hostId,setHostId] = useState<string>('arab-man')
  const host = getInterviewer(hostId)
  const answering = clock % 12 >= 5
  const moving = visible && !reduced
  useEffect(() => {
    if (!visible || reduced || interacted) return
    const timer = window.setInterval(() => { if (!document.hidden) setIndex(i => (i + 1) % 3) }, index === 1 ? 40000 : 18000)
    return () => window.clearInterval(timer)
  }, [visible, reduced, index, hostId, interacted])
  useEffect(() => {
    if (!visible || index !== 0 || reduced) return
    const timer = window.setInterval(() => { if (!document.hidden) setClock(c => c + 1) }, 1000)
    return () => window.clearInterval(timer)
  }, [visible, index, reduced])
  function choose(next:number) { setInteracted(true); setIndex(next); setClock(0); stageRef.current?.scrollTo({ top: 0 }) }
  return <div ref={ref} className={s.demo + (compact ? ' ' + s.compact : '') + (expanded ? ' ' + s.expanded : '')} data-motion={moving?'playing':'static'}>
    <div className={s.head}><span><Mic size={17} aria-hidden="true" />Voice mock interview</span><b>Illustrative demo</b></div>
    <div className={s.tabs} aria-label="Interview demonstration stages">{stages.map((t,i)=><button type="button" key={t} aria-pressed={index===i} onClick={()=>choose(i)}>{t}</button>)}</div>
    <div className={s.previewControls}>
      <button type="button" aria-expanded={expanded} aria-controls={stageId} onClick={() => { setInteracted(true); setExpanded(value => !value); stageRef.current?.scrollTo({ top: 0 }) }}>{expanded ? 'Collapse preview' : 'Expand preview'}</button>
      <a href="#main-content" onClick={event => { const target = document.getElementById('main-content'); if (target) { event.preventDefault(); setExpanded(false); choose(0); target.scrollIntoView({ behavior: reduced ? 'instant' : 'smooth', block: 'start' }) } }}>Back to landing page ↑</a>
    </div>
    <p className={s.scrollHint}>Scroll inside to explore · Use the tabs to return to practice</p>
    <div ref={stageRef} id={stageId} className={s.stage} tabIndex={0} role="region" aria-label={`${stages[index]} preview — scroll for details`}>
      {index===0?<>
        <div className={s.options}><label>Interviewer<select value={hostId} onChange={e=>{setHostId(e.target.value);setClock(0)}}>{INTERVIEWERS.map(person=><option key={person.id} value={person.id}>{person.name} · {person.label}</option>)}</select></label><label>Session<select value={length} onChange={e=>setLength(Number(e.target.value))}><option value={5}>Quick · 5 questions</option><option value={10}>Standard · 10 questions</option><option value={15}>Deep · 15 questions</option></select></label><label>Mode<select value={mode} onChange={e=>setMode(e.target.value)}>{['HR','Technical','Gulf readiness','Manager','Mixed'].map(m=><option key={m}>{m}</option>)}</select></label></div>
        <div className={s.interviewer}><div className={s.portrait} data-speaking={!answering}><Image key={host.id} src={host.image} alt={`${host.name}, ${host.label}, virtual interviewer illustration`} fill sizes="112px" className="object-cover" /></div><div><span>YOUR VIRTUAL INTERVIEWER</span><h3>{host.name}</h3><p>{mode} mode · Question {Math.min(4,length)} of {length}</p><b>{host.label}</b></div></div>
        <div className={s.turnSteps} aria-label="Practice flow"><span data-active={!answering}><Volume2 size={15}/>1. Listen</span><ArrowRight size={14}/><span data-active={answering}><Mic size={15}/>2. Answer</span><ArrowRight size={14}/><span><MessageCircle size={15}/>3. Review</span></div>
        <div className={s.question}><span>CURRENT QUESTION</span><h3>Describe a problem you solved in your role.</h3></div>
        <div className={s.turnStatus} data-answering={answering}>{answering?<Mic size={22}/>:<Volume2 size={22}/>}<div><strong>{answering?'Your turn — answer the question':'Interviewer speaking — listen to the question'}</strong><small>{answering?'Recording indicator · simulated answer':'Wait for the question, then explain your own example'}</small></div></div>
        <div className={s.wave} data-answering={answering} aria-hidden="true">{Array.from({length:25},(_,i)=><i key={i} style={{height:12+(i*17%35)+'px',animationDelay:i*.06+'s',animationPlayState:moving?'running':'paused'}} />)}</div>
        <div className={s.answer}><strong>Example spoken answer</strong><p>“I checked the records and spoke with the team, then we find the cause. I documented the corrective action.”</p></div><button type="button" className={s.action} onClick={()=>choose(1)}>Review this answer <ArrowRight size={15}/></button><p className={s.note}>Sample demonstration · Explore voice interview preparation</p><a href="#hero-readiness-cta" className={s.note} onClick={event => { const target = document.getElementById('hero-readiness-cta'); if (target) { event.preventDefault(); target.scrollIntoView({ behavior: reduced ? 'instant' : 'smooth', block: 'center' }) } }}>Explore GCC Mentor →</a>
      </>:index===1?<>
        <span className={s.label}>QUESTION 4 · ANSWER REVIEW</span><h3>See what worked. Know what to improve.</h3>
        <div className={s.reviewQuestion}><strong>Question</strong><p>Describe a problem you solved in your role.</p></div>
        <div className={s.verdictGrid}><div className={s.correct}><Check size={18}/><strong>What is right</strong><p>You reviewed records, involved the team and documented the correction.</p></div><div className={s.correction}><CircleAlert size={18}/><strong>What needs correction</strong><p>Past tense is inconsistent. Your own action, the cause and verification are unclear.</p></div></div>
        <div className={s.reviewGrid} aria-label="What we review for each answer">{reviews.map(([title,status,detail],i)=><div key={title} className={s.reviewItem} data-warning={i===2||i===3}><span><b>{i+1}</b><strong>{title}</strong></span><small>{status}</small><p>{detail}</p></div>)}</div>
        <div className={s.betterAnswer}><span><Sparkles size={18}/><strong>Suggested corrected answer</strong></span><p>“I reviewed the records and spoke with the team to understand the issue. I documented the corrective action.”</p><small>Then add your real responsibility, checks, cause and verified result. Only include work you actually performed.</small></div>
        <div className={s.nextSteps}><Target size={18}/><div><strong>Your next practice</strong><ol><li>Explain your own action and the checks you performed.</li><li>Add a verified result. Keep past tense consistent.</li><li>Try the question again and compare your next report.</li></ol></div></div>
        <p className={s.note}>Illustrative coaching categories. Transcript and duration support clarity, grammar and pace guidance; no accent, emotion or acoustic-confidence analysis.</p><button type="button" className={s.action} onClick={()=>choose(2)}>See repeat-session progress <ArrowRight size={15}/></button>
      </>:<><span className={s.label}>SAME APPLICATION · COMPARABLE SETTINGS</span><h3>Practice. Review. Prepare. Repeat.</h3><div className={s.overall}><span>Overall evaluation</span><strong>58 → 76</strong><b>Illustrative scores / 100</b></div><svg viewBox="0 0 320 110" role="img" aria-label="Illustrative overall scores: practice one 58, practice two 68, practice three 76" className={s.chart}><path d="M24 85H296M24 52H296M24 19H296" stroke="#e1e9e4" fill="none"/><path d="M24 83 L160 52 L296 27" fill="none" stroke="#C9962E" strokeWidth="3"/>{[[24,83],[160,52],[296,27]].map(([x,y],i)=><g key={x}><circle cx={x} cy={y} r="5" fill="#7250a0"/><text x={x} y={y-12} textAnchor="middle" fill="#7250a0" fontSize="12">{[58,68,76][i]}</text></g>)}</svg><div className={s.legend}><span>First practice</span><span>After review</span><span>Next practice</span></div><div className={s.metrics}>{metrics.map(([label,before,after])=><div key={label}><span>{label}</span><b>{before} → {after}</b><div><i style={{width:after+'%'}}/></div></div>)}</div><div className={s.answer}><strong>Your next improvement plan</strong><p>Practise explaining your own action and verification steps. Try another relevant question set and compare saved reports.</p></div><p className={s.note}>Demonstration data, not customer results. Real scores can rise or fall. Compare the same optimized resume and settings.</p><button type="button" className={s.action} onClick={()=>choose(0)}>Try the practice demo again <ArrowRight size={15}/></button></>}
    </div>
  </div>
}
