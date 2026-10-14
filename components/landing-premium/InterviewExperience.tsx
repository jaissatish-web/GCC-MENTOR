'use client'
import dynamic from 'next/dynamic'
import Link from 'next/link'
import Image from 'next/image'
import { useEffect, useRef, useState } from 'react'
import { ArrowRight, Target, BookOpen, Mic, Check } from 'lucide-react'
import s from './premium.module.css'
const Demo=dynamic(()=>import('../landing-v3/InterviewDemo').then(m=>m.InterviewDemo),{ssr:false})
export function InterviewExperience(){
 const ref=useRef<HTMLDivElement>(null),[ready,setReady]=useState(false)
 useEffect(()=>{const io=new IntersectionObserver(es=>{if(es.some(e=>e.isIntersecting)){setReady(true);io.disconnect()}},{rootMargin:'240px'});if(ref.current)io.observe(ref.current);return()=>io.disconnect()},[])
 return <div className={s.interviewGrid}><div className={s.coachPitch}><figure className={s.coachPhoto}><Image src="/landing/service-mock-interview.png" alt="Interview preparation workspace" fill sizes="(min-width: 768px) 550px, calc(100vw - 32px)"/><figcaption><span>YOUR INTERVIEW. YOUR PROGRESS.</span><strong>Practise. Review. Improve.</strong></figcaption></figure><Link href="/mock-interview" className={s.textLink}>Start your interview preparation <ArrowRight size={17}/></Link></div><div ref={ref} className={s.interviewMount}>{ready?<Demo compact/>:<div className={s.demoPlaceholder}><Target size={32}/><p>Interview practice</p></div>}</div></div>
}
const steps=[
 {title:'Prepare',icon:BookOpen,heading:'Choose a relevant question',detail:'Use the target role and your own experience to prepare a clear answer.'},
 {title:'Practise',icon:Mic,heading:'Explain your own action',detail:'Practise the answer, then review clarity, relevance and supporting detail.'},
 {title:'Review',icon:Check,heading:'Choose your next improvement',detail:'Revisit feedback and compare saved sessions with matching resume and practice settings.'},
]
export function ProgressPreview(){
 const [selected,setSelected]=useState(0)
 const current=steps[selected],Icon=current.icon
 return <div className={s.progress}><div><span className={s.kicker}>YOUR PRACTICE JOURNEY</span><h3>Review the change. Choose your next focus.</h3><p>Prepare, practise and review. Keep each application’s interview preparation together.</p><div className={s.progressTabs} aria-label="Practice stages">{steps.map((step,i)=><button type="button" key={step.title} aria-pressed={selected===i} onClick={()=>setSelected(i)}>{step.title}</button>)}</div></div><div className={`${s.chart} ${s.practiceCycle}`}><div className={s.practiceIcons}>{steps.map((step,i)=>{const I=step.icon;return <span key={step.title} data-active={selected===i}><I size={27}/><b>{step.title}</b>{i<2?<ArrowRight size={16}/>:null}</span>})}</div><Icon size={30}/><h4 id="progress-title">{current.heading}</h4><p id="progress-description">{current.detail}</p><Link href="/mock-interview" className={s.textLink}>Open my interview workspace <ArrowRight size={17}/></Link></div></div>
}
