'use client'
import dynamic from 'next/dynamic'
import Link from 'next/link'
import Image from 'next/image'
import { useEffect, useRef, useState } from 'react'
import { ArrowRight, Target, Mic, Activity, Wrench, Compass, Globe2, ListChecks, RotateCcw, FileCheck2 } from 'lucide-react'
import s from './premium.module.css'
import { INTERVIEW_METRICS } from '@/lib/interviewProgress'
import { SavedProgressPreview } from './SavedProgressPreview'
const Demo=dynamic(()=>import('../landing-v3/InterviewDemo').then(m=>m.InterviewDemo),{ssr:false})
export function InterviewExperience(){
 const ref=useRef<HTMLDivElement>(null),[ready,setReady]=useState(false)
 useEffect(()=>{const io=new IntersectionObserver(es=>{if(es.some(e=>e.isIntersecting)){setReady(true);io.disconnect()}},{rootMargin:'240px'});if(ref.current)io.observe(ref.current);return()=>io.disconnect()},[])
 return <div className={s.interviewGrid}><div className={s.coachPitch}><figure className={s.coachPhoto}><Image src="/landing/service-mock-interview.png" alt="Interview preparation workspace" fill sizes="(min-width: 768px) 550px, calc(100vw - 32px)"/><figcaption><span>YOUR INTERVIEW. YOUR PROGRESS.</span><strong>Practise. Review. Improve.</strong></figcaption></figure><Link href="/mock-interview" className={s.textLink}>Start your interview preparation <ArrowRight size={17}/></Link></div><div ref={ref} className={s.interviewMount}>{ready?<Demo compact/>:<div className={s.demoPlaceholder}><Target size={32}/><p>Interview practice</p></div>}</div></div>
}
const feedbackAreas = {
 overall_score: { icon: Activity, hint: 'Your complete picture', heading: 'See the whole report', detail: 'Review your overall result alongside the four focused areas. Use the feedback to decide what to practise next.', colour: '#94e0ce' },
 technical_score: { icon: Wrench, hint: 'Explain your expertise', heading: 'Make your technical thinking clear', detail: 'Review technical feedback, then practise explaining your approach with examples from your own work.', colour: '#a8caff' },
 role_fit_score: { icon: Compass, hint: 'Connect experience to the role', heading: 'Show why your experience fits', detail: 'Use role-fit feedback to connect your responsibilities and experience to the position you are preparing for.', colour: '#d0bcff' },
 gulf_readiness_score: { icon: Globe2, hint: 'Prepare for the Gulf context', heading: 'Review your Gulf readiness', detail: 'Use Gulf-readiness feedback to identify what needs more preparation for your target role and market.', colour: '#f5ce8c' },
 answer_structure_score: { icon: ListChecks, hint: 'Give your answer a clear shape', heading: 'Build a clearer answer', detail: 'Review answer-structure feedback. Practise explaining the situation, your action and the result with supporting detail.', colour: '#a9dfef' },
}
export function ProgressPreview(){
 const [selected,setSelected]=useState<typeof INTERVIEW_METRICS[number]['key']>('answer_structure_score')
 const current=feedbackAreas[selected], Icon=current.icon
 return <div className={s.progressExperience}>
  <div className={s.progressIntro}>
   <span className={s.kicker}>FEEDBACK INTO YOUR NEXT STEP</span>
   <h3>Know what to work on.<br/>Make every practice count.</h3>
   <p>Know your strengths, choose your next focus and compare your saved practice sessions.</p>
   <ol className={s.progressSequence}>
    <li><span><Mic size={20}/></span><div><strong>Practise for your target role</strong><small>Bring your real experience into each answer.</small></div></li>
    <li><span><FileCheck2 size={20}/></span><div><strong>Review your feedback</strong><small>See strengths and areas to work on.</small></div></li>
    <li><span><RotateCcw size={20}/></span><div><strong>Compare matching sessions</strong><small>Review changes and choose your next focus.</small></div></li>
   </ol>
   <Link href="/mock-interview" className={s.primary}>Start my interview preparation <ArrowRight size={18}/></Link><SavedProgressPreview/>
  </div>
  <div className={s.feedbackMap}>
   <div className={s.mapHeader}><span><Activity size={17}/> YOUR FEEDBACK MAP</span><small>Explore the five areas</small></div>
   <div className={s.feedbackBranches}>
    <div className={s.reportNode}><div><FileCheck2 size={29}/></div><strong>Your interview</strong><small>Completed report</small><span>5 feedback areas</span></div>
    <svg className={s.branchLines} viewBox="0 0 100 300" preserveAspectRatio="none" aria-hidden="true"><path d="M0 150 H35 M35 30 V270 M35 30 H100 M35 90 H100 M35 150 H100 M35 210 H100 M35 270 H100"/><path className={s.flowSignal} d={`M0 150 H35 V${30 + INTERVIEW_METRICS.findIndex(metric=>metric.key===selected)*60} H100`}/></svg>
    <div className={s.metricNodes} aria-label="Interview feedback areas">{INTERVIEW_METRICS.map(({key,label})=>{const area=feedbackAreas[key], I=area.icon;return <button key={key} type="button" aria-pressed={selected===key} aria-controls="preparation-focus" onClick={()=>setSelected(key)} style={{'--metric-colour':area.colour} as React.CSSProperties}><I size={19}/><span><strong>{label}</strong><small>{area.hint}</small></span><ArrowRight size={15}/></button>})}</div>
   </div>
   <div className={s.focusConnector} aria-hidden="true"><span/><ArrowRight size={17}/><span>YOUR NEXT FOCUS</span></div>
   <div id="preparation-focus" className={s.focusCard} aria-live="polite" aria-atomic="true"><span className={s.focusIcon}><Icon size={23}/></span><div><h4>{current.heading}</h4><p>{current.detail}</p></div></div>
   <div className={s.compareStrip}><RotateCcw size={20}/><div><strong>Practise again → compare your reports</strong><small>Same resume, rubric, input mode and practice settings.</small></div></div>
   <p className={s.mapFootnote}>Your saved reports supply the scores and improvement plan. Changes can go up or down.</p>
  </div>
 </div>
}

