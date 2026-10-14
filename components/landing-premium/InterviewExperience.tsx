'use client'
import dynamic from 'next/dynamic'
import Link from 'next/link'
import Image from 'next/image'
import { useEffect, useRef, useState } from 'react'
import { ArrowRight, Target } from 'lucide-react'
import s from './premium.module.css'
const Demo=dynamic(()=>import('../landing-v3/InterviewDemo').then(m=>m.InterviewDemo),{ssr:false})
export function InterviewExperience(){
 const ref=useRef<HTMLDivElement>(null),[ready,setReady]=useState(false)
 useEffect(()=>{const io=new IntersectionObserver(es=>{if(es.some(e=>e.isIntersecting)){setReady(true);io.disconnect()}},{rootMargin:'240px'});if(ref.current)io.observe(ref.current);return()=>io.disconnect()},[])
 return <div className={s.interviewGrid}><div className={s.coachPitch}><figure className={s.coachPhoto}><Image src="/landing/service-mock-interview.png" alt="Illustrative Gulf interview dashboard showing a virtual interviewer, feedback scores and a progress chart" fill sizes="(min-width: 768px) 550px, calc(100vw - 32px)"/><figcaption><span>YOUR INTERVIEW. YOUR PROGRESS.</span><strong>Practise. Review. Improve.</strong><small>Illustrative dashboard · sample scores</small></figcaption></figure><Link href="/mock-interview" className={s.textLink}>Start your interview preparation <ArrowRight size={17}/></Link></div><div ref={ref} className={s.interviewMount}>{ready?<Demo compact/>:<div className={s.demoPlaceholder}><Target size={32}/><p>Interview practice demonstration</p></div>}</div></div>
}
const scores=[{session:'1',structure:48,technical:60},{session:'2',structure:61,technical:69},{session:'3',structure:74,technical:78}]
export function ProgressPreview(){
 const [selected,setSelected]=useState(2)
 return <div className={s.progress}><div><span className={s.kicker}>ILLUSTRATIVE DATA · SAME RESUME & SETTINGS</span><h3>Review the change. Choose your next focus.</h3><p>Compare saved sessions with the same resume and practice settings. A trend can show progress or areas that still need work.</p><div className={s.progressTabs} aria-label="Sample practice sessions">{scores.map((v,i)=><button type="button" key={v.session} aria-pressed={selected===i} onClick={()=>setSelected(i)}>Session {v.session}</button>)}</div><p className={s.small}>AI practice feedback supports preparation. It is not an employer’s hiring decision.</p></div><div className={s.chart}><svg viewBox="0 0 360 210" role="img" aria-labelledby="progress-title progress-description"><title id="progress-title">Sample answer-structure scores across three matching practice sessions</title><desc id="progress-description">Illustrative scores: 48, 61 and 74 out of 100. These are not actual customer results.</desc>{[50,100,150].map((y,i)=><g key={y}><line x1="38" x2="335" y1={y} y2={y} stroke="#dbe4ef"/><text x="7" y={y+5}>{100-i*25}</text></g>)}<polyline points="65,154 180,128 295,102" fill="none" stroke="var(--ui-brand)" strokeWidth="4" strokeLinejoin="round"/>{scores.map((v,i)=><g key={v.session}><circle cx={65+i*115} cy={250-v.structure*2} r={i===selected?8:5} fill={i===selected?'rgb(var(--ui-accent-rgb))':'var(--ui-brand)'}/><text x={65+i*115} y="196" textAnchor="middle">Session {v.session}</text><text x={65+i*115} y={230-v.structure*2} textAnchor="middle">{v.structure}</text></g>)}</svg><div className={s.chartSummary}><span><b>{scores[selected].structure}/100</b>Answer structure</span><span><b>{scores[selected].technical}/100</b>Technical knowledge</span></div><p><Target size={17}/><span><strong>Next practice:</strong> Explain your own action and how you verified the result.</span></p></div></div>
}
