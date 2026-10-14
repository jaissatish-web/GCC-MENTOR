'use client'
import { useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { ArrowRight, BriefcaseBusiness, Check, ClipboardCheck, FileText, FolderOpen, Mail, Mic, ShieldCheck, UserRound, BookOpen, MapPin, Sparkles, Circle, ArrowDown, GraduationCap, ChevronDown, AudioLines } from 'lucide-react'
import { LEVELS, PROFESSIONS, OUTPUTS, professionRole } from './catalog'
import { JourneyResume } from './JourneyResume'
import s from './explorer.module.css'
type Output = (typeof OUTPUTS)[number]['id']
const ICONS = [ClipboardCheck, FileText, Mail, BookOpen, Mic, FolderOpen]
const LABELS = ['Job match','Tailored CV','Cover letter','Interview Q&A','Mock interview','Review & improve']
const JOB_IMAGES = ['/landing/hero-plant-night.jpg','/landing/service-optimized-resume.png','/landing/founder-refinery-night.jpg']
const SERVICE_IMAGES: Record<Output,string> = {match:'/landing/service-readiness.png',cv:'/landing/service-optimized-resume.png',letter:'/landing/service-cover-letter.png',qa:'/landing/service-interview-qa.png',mock:'/landing/interview-practice-v1.webp',review:'/landing/service-mock-interview.png'}
function StageHeading({number,title,hint}:{number:number;title:string;hint:string}) {return <div className={s.stageHeading}><span>{number}</span><div><h2>{title}</h2><p>{hint}</p></div></div>}
export function PreparationExplorer() {
 const [profession,setProfession]=useState(0)
 const [level,setLevel]=useState(3)
 const [job,setJob]=useState(0)
 const [output,setOutput]=useState<Output>('cv')
 const p=PROFESSIONS[profession],role=professionRole(p,level),focus=p.paths[job]
 const active=OUTPUTS.find(item=>item.id===output)!,outputIndex=OUTPUTS.findIndex(item=>item.id===output)
 return <div className={s.page}>
  <header className={s.header}><Link href="/" className={s.logo} aria-label="GCC Mentor — return to main landing page"><span>G</span><div>GCC MENTOR<small>PREPARE FOR YOUR NEXT CHAPTER</small></div></Link><span className={s.demoBadge}>Service demo</span></header>
  <section className={s.hero} aria-labelledby="explorer-title"><Image src="/landing/hero-gcc-engineer.png" alt="Illustrative Gulf professional with a skyline" fill priority sizes="(max-width: 1200px) 100vw, 1200px"/><div className={s.heroCopy}><span>ONE PROFILE. MULTIPLE CAREER PATHS.</span><h1 id="explorer-title">Gulf Opportunity<br/>Journey</h1><p>Complete preparation.<br/>You apply.</p></div></section>
  <main className={s.main}>
   <section className={s.stage} aria-labelledby="profile-title"><StageHeading number={1} title="Your profile" hint="Choose where your journey starts."/><div className={s.rail} aria-hidden="true"><Circle className={s.travelDot}/><ArrowDown className={s.railArrow}/></div>
    <div className={s.profileGrid}><div className={s.profile}><div className={s.portrait}><Image src="/landing/hero-gcc-engineer.png" alt="Illustrative profile portrait" fill sizes="100px"/></div><div className={s.profileDetails}><h3 id="profile-title" aria-live="polite">{role}</h3><span className={s.family}>{p.name}</span><div className={s.controls}><label><Sparkles size={15}/>Discipline<div className={s.selectWrap}><select value={profession} onChange={e=>{setProfession(Number(e.target.value));setJob(0)}}>{PROFESSIONS.map((item,i)=><option key={item.name} value={i}>{item.name}</option>)}</select><ChevronDown size={18}/></div></label><label><BriefcaseBusiness size={15}/>Career level<div className={s.selectWrap}><select value={level} onChange={e=>setLevel(Number(e.target.value))}>{LEVELS.map((item,i)=><option key={item} value={i}>{item}</option>)}</select><ChevronDown size={18}/></div></label></div></div></div><div className={s.profileFacts}><span><UserRound/>Your experience</span><span><GraduationCap/>Skills & certifications</span><span><ShieldCheck/>Your reviewed facts</span><span><MapPin/>Saudi · UAE · Qatar + more</span><Link href="/gulf-readiness-score">Check GCC readiness <ArrowRight size={14}/></Link></div></div>
   </section>
   <section className={s.stage} aria-labelledby="opportunities-title"><StageHeading number={2} title="Your opportunities" hint="One profile. Different job descriptions."/><div className={s.rail} aria-hidden="true"><Circle className={s.travelDot}/><ArrowDown className={s.railArrow}/></div><h3 id="opportunities-title" className={s.microHint}>Choose a path. Each gets its own preparation pack.</h3>
    <div className={s.jobs}>{p.paths.map((path,i)=><button key={path} className={s.job} data-tone={i} type="button" aria-pressed={job===i} aria-controls="job-pack" onClick={()=>setJob(i)}><div className={s.jobPhoto}><Image src={profession===10?'/landing/who-any-profession.jpg':profession>8?SERVICE_IMAGES[(['cv','qa','mock'] as Output[])[i]]:JOB_IMAGES[i]} alt="" fill sizes="(max-width: 640px) 30vw, 330px"/>{job===i?<span className={s.selectedMark}><Check size={18}/></span>:null}</div><div className={s.jobText}><BriefcaseBusiness size={23}/><h3>{path}</h3><ArrowRight size={16}/></div><span className={s.jobHint}>Job description {i+1}</span></button>)}</div>
   </section>
   <section className={s.stage} id="job-pack" aria-labelledby="pack-title"><StageHeading number={3} title="Your application pack" hint="One target job. Its own CV, letter and interview preparation."/><div className={s.rail} aria-hidden="true"><Circle className={s.travelDot}/><ArrowDown className={s.railArrow}/></div><h3 id="pack-title" className={s.selectedRole} aria-live="polite">{role} <span>· {focus}</span></h3>
    <div className={s.outputs}>{OUTPUTS.map((item,i)=>{const Icon=ICONS[i];return <button type="button" key={item.id} className={s.output} aria-pressed={output===item.id} aria-controls="sample-output" data-active={output===item.id} onClick={()=>setOutput(item.id)}><Icon size={25}/><span>{LABELS[i]}</span></button>})}</div>
    <div key={`${profession}-${job}-${output}`} id="sample-output" className={s.sample}>
     <div className={s.sampleVisual}>{output==='cv'?<JourneyResume profession={profession} role={role} focus={focus}/>:<div className={s.outputPhoto}><Image src={SERVICE_IMAGES[output]} alt={`Illustrative ${LABELS[outputIndex]} preparation scene`} fill sizes="(max-width: 640px) 90vw, 520px"/></div>}<span className={s.sampleBadge}>Fictional sample · application {job+1}</span></div>
     <div className={s.sampleDetails}><span className={s.eyebrow}>{focus}</span><h3>{LABELS[outputIndex]} for {role}</h3>
      {output==='cv'||output==='qa'?<><div className={s.question}><BookOpen size={23}/><p>{p.question}</p></div><div className={s.answer}><UserRound size={24}/><div><b>Your own example</b><div className={s.answerSteps}><span>Situation</span><ArrowRight size={13}/><span>Action</span><ArrowRight size={13}/><span>Result</span></div><small>Use facts and outcomes you can support.</small></div></div><div className={s.skills}>{p.skills.map(skill=><span key={skill}>{skill}</span>)}</div></>:null}
      {output==='match'?<div className={s.checks}><span><Check/>{p.skills[job]}</span><span><ClipboardCheck/>Compare your experience with the actual JD</span><span><ArrowRight/>Review missing requirements</span></div>:null}
      {output==='letter'?<div className={s.letter}><b>Dear Hiring Team,</b><p>My experience in {p.skills[job].toLowerCase()} → your {focus.toLowerCase()} role.</p><span>Your background → employer needs → clear introduction</span></div>:null}
      {output==='mock'?<><div className={s.question}><Mic/><p>“Tell me about your experience in {focus.toLowerCase()}.”</p></div><div className={s.answerSteps}><span>Answer</span><ArrowRight size={13}/><span>Feedback</span><ArrowRight size={13}/><span>Try again</span></div></>:null}
      {output==='review'?<div className={s.checks}><span><Check/>Answer clarity</span><span><Check/>Relevant examples</span><span><ArrowRight/>Your next practice step</span></div>:null}
      <Link href={active.href} className={s.serviceLink}>{output==='match'?'Add an actual job description':`Open ${LABELS[outputIndex].toLowerCase()}`} <ArrowRight size={16}/></Link>
     </div>
    </div>
   </section>
   <section className={`${s.stage} ${s.lastStage}`} aria-labelledby="interview-title"><StageHeading number={4} title="Your interview" hint="Practise with relevant questions."/><div className={s.interviewGrid}><div className={s.interviewPhoto}><Image src="/landing/interview-practice-v1.webp" alt="Illustrative interview practice scene" fill sizes="(max-width: 640px) 90vw, 550px"/><div className={s.interviewOverlay}><Mic size={20}/><span>Sample practice</span><span className={s.movingAudio} aria-hidden="true"><AudioLines/></span></div></div><div className={s.interviewDetails}><h3 id="interview-title">Mock interview for {focus.toLowerCase()}</h3><div className={s.question}><BookOpen/><p>{p.question}</p></div><div className={s.checks}><span><Check/>Structure your answers</span><span><Sparkles/>Review your feedback</span><span><ArrowRight/>Prepare a stronger example</span></div><Link href="/mock-interview" className={s.serviceLink}>Start interview practice <ArrowRight size={16}/></Link></div></div><p className={s.motionNote}>Animated demonstration · no audio plays or recording starts.</p></section>
   <div className={s.final}><Link href="/profile" className={s.primary}><FileText size={22}/>Build my Career Profile <ArrowRight size={19}/></Link><div className={s.extras}><Link href="/linkedin-optimization">LinkedIn profile guidance <ArrowRight size={15}/></Link><Link href="/naukrigulf-optimization">NaukriGulf profile guidance <ArrowRight size={15}/></Link></div><p>Example paths, not live vacancies. We prepare; you apply through the employer&apos;s channel.</p></div>
  </main>
 </div>
}
