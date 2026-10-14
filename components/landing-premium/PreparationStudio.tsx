'use client'
import Image from 'next/image'
import Link from 'next/link'
import { useRef, useState } from 'react'
import { ArrowRight, BookOpen, Check, FileText, Mic, ShieldCheck, UserRound } from 'lucide-react'
import { PROFESSIONS, professionRole } from '@/app/preparation-pack/catalog'
import s from './premium.module.css'
const previews = [
 {title:'ATS CV',route:'/optimize/target',image:'/landing/ats-template-hd.webp'},
 {title:'Cover letter',route:'/cover-letter',image:'/landing/service-cover-letter.png'},
 {title:'Interview Q&A',route:'/interview-qa',image:'/landing/service-interview-qa.png'},
 {title:'Mock interview',route:'/mock-interview',image:'/landing/interview-practice-v1.webp'},
 {title:'LinkedIn',route:'/linkedin-optimization',image:'/professional/profile-hero-v1.webp'},
 {title:'NaukriGulf',route:'/naukrigulf-optimization',image:'/landing/application-preparation-v1.webp'},
] as const
/** Job and profession changes update sample outputs; no customer data or AI calls. */
export function PreparationStudio() {
 const [profession,setProfession]=useState(0),[job,setJob]=useState(0),[tab,setTab]=useState(0)
 const refs=useRef<Array<HTMLButtonElement|null>>([])
 const p=PROFESSIONS[profession],role=professionRole(p,3),focus=p.paths[job],preview=previews[tab]
 const question=job===0?p.question:job===1?`What would you check before starting ${focus.toLowerCase()} work?`:`How would you prioritize and report your ${focus.toLowerCase()} responsibilities?`
 return <div className={s.studio} id="preparation-demo">
  <div className={s.studioBar}><span><i/>YOUR PREPARATION PACK <small>One profile. A pack for each job.</small></span><label>Choose your profession<select value={profession} onChange={e=>{setProfession(Number(e.target.value));setJob(0)}}>{PROFESSIONS.map((item,i)=><option key={item.name} value={i}>{item.name}</option>)}</select></label></div>
  <div className={s.flowStrip} aria-label="Preparation workflow"><span><UserRound size={18}/>Your Career Profile</span><ArrowRight size={17}/><span><FileText size={18}/>Target job description</span><ArrowRight size={17}/><span><ShieldCheck size={18}/>Your preparation pack</span></div>
  <div className={s.demoJobs} role="group" aria-label="Target job focus">{p.paths.map((path,i)=><button key={path} type="button" aria-pressed={job===i} onClick={()=>setJob(i)}><span>JOB {i+1}</span><b>{path}</b>{job===i?<Check size={16}/>:<ArrowRight size={16}/>}</button>)}</div>
  <div className={`${s.tabs} ${s.photoTabs}`} role="tablist" aria-label="Preparation output">{previews.map((item,i)=><button key={item.title} ref={el=>{refs.current[i]=el}} type="button" role="tab" data-kind={i} id={`prep-tab-${i}`} aria-selected={tab===i} aria-controls="prep-output" tabIndex={tab===i?0:-1} onClick={()=>setTab(i)} onKeyDown={e=>{
   const next=e.key==='ArrowRight'?(i+1)%previews.length:e.key==='ArrowLeft'?(i+previews.length-1)%previews.length:e.key==='Home'?0:e.key==='End'?previews.length-1:null
   if(next!==null){e.preventDefault();setTab(next);refs.current[next]?.focus()}
  }}>{item.title}</button>)}</div>
  <div className={s.demoOutput} role="tabpanel" id="prep-output" aria-labelledby={`prep-tab-${tab}`} tabIndex={0}>
   <div className={s.demoVisual}><div className={s.demoPhoto}><Image src={preview.image} alt={tab===0?'Professional single-column resume template':`${preview.title} preparation workspace`} fill sizes="(max-width: 767px) 90vw, 550px"/></div></div>
   <div className={s.demoContext}><span className={s.kicker}>{focus}</span><h3>{preview.title} for {role}</h3>
    {tab===0?<><p>Same facts. A CV focused on this job.</p><div className={s.demoSkills}>{[p.skills[job],...p.skills.filter((_,i)=>i!==job)].map(skill=><span key={skill}>{skill}</span>)}</div><div className={s.demoQuestion}><BookOpen size={20}/><span>{question}</span></div></>:null}
    {tab===1?<div className={s.demoLetter}><b>Dear Hiring Team,</b><p>I am interested in your {role} opportunity focused on {focus.toLowerCase()}.</p><p>My experience in {p.skills.join(', ').toLowerCase()} provides relevant examples to discuss against your requirements.</p></div>:null}
    {tab===2?<><div className={s.demoQuestion}><BookOpen size={21}/><span>{question}</span></div><div className={s.demoAnswer}><span>Situation</span><ArrowRight size={14}/><span>Your action</span><ArrowRight size={14}/><span>Result</span></div><p>Build an answer from your own {focus.toLowerCase()} experience.</p></>:null}
    {tab===3?<><div className={s.demoQuestion}><Mic size={21}/><span>“Tell me about your experience in {focus.toLowerCase()}.”</span></div><div className={s.demoAnswer}><span>Practise</span><ArrowRight size={14}/><span>Review</span><ArrowRight size={14}/><span>Try again</span></div></>:null}
    {tab===4||tab===5?<><p>Make your professional background easier to understand.</p><div className={s.demoHeadline}><UserRound size={20}/><b>{role} · {p.skills[job]}</b></div><div className={s.demoSkills}>{p.skills.map(skill=><span key={skill}>{skill}</span>)}</div><small>Profile guidance. You review and update your own account.</small></>:null}
   </div>
  </div>
  <div className={s.studioFoot}><span><ShieldCheck size={16}/>Your profile · your target job</span><Link href={preview.route}>Open {preview.title} preparation <ArrowRight size={16}/></Link></div>
 </div>
}
