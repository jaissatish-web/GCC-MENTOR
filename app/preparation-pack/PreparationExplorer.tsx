'use client'
import { useState } from 'react'
import Link from 'next/link'
import { ArrowDown, ArrowRight, BriefcaseBusiness, Check, ClipboardCheck, FileText, FolderOpen, Mail, Mic, ShieldCheck, UserRound, BookOpen } from 'lucide-react'
import { LEVELS, PROFESSIONS, OUTPUTS, professionRole } from './catalog'
import s from './explorer.module.css'
type Output = (typeof OUTPUTS)[number]['id']
const ICONS = [ClipboardCheck, FileText, Mail, BookOpen, Mic, FolderOpen]
const LABELS = ['Job match', 'Tailored CV', 'Cover letter', 'Interview Q&A', 'Mock interview', 'Review & improve']
/** Small native vector/document visuals: never screenshots or customer results. */
function PackVisual({ kind, large = false }: { kind: Output; large?: boolean }) {
 return <div className={`${s.visual} ${large ? s.large : ''}`} aria-hidden="true">
  {kind==='match'?<div className={s.matchVisual}><div className={s.matchCircle}><Check size={large?32:20}/></div><div className={s.matchChecks}><span><Check/>Experience</span><span><Check/>Skills</span><span><span className={s.gapDot}/>Review gaps</span></div></div>:null}
  {kind==='cv'?<div className={s.paper}><div className={s.paperHead}><span className={s.avatar}><UserRound/></span><div><i/><i/></div></div><b/><i/><i/><i/><b/><i/><i/><div className={s.paperChips}><span/><span/><span/></div></div>:null}
  {kind==='letter'?<div className={s.letterVisual}><div className={s.paper}><b/><i/><i/><i/><i/><i/><span className={s.signature}/></div><span className={s.envelope}><Mail size={large?34:23}/></span></div>:null}
  {kind==='qa'?<div className={s.chat}><div><BookOpen size={large?24:17}/><span>Q</span><i/></div><div><Check size={large?22:15}/><span>A</span><i/></div><div><span>Q</span><i/></div></div>:null}
  {kind==='mock'?<div className={s.mockVisual}><div className={s.interviewer}><UserRound size={large?42:27}/><span/></div><div className={s.wave}>{[14,26,36,22,42,28,18,32,22].map((h,i)=><i key={i} style={{height:h,animationDelay:`${i*0.12}s`}}/>)}</div><span className={s.micBadge}><Mic size={large?20:14}/></span></div>:null}
  {kind==='review'?<div className={s.reviewVisual}><div className={s.chart}><i/><i/><i/><i/></div><span className={s.reviewCheck}><Check size={large?24:17}/></span><div className={s.reviewArrow}><ArrowRight/></div></div>:null}
 </div>
}
export function PreparationExplorer() {
 const [profession, setProfession] = useState(0)
 const [level, setLevel] = useState(3)
 const [job, setJob] = useState(0)
 const [output, setOutput] = useState<Output>('cv')
 const p = PROFESSIONS[profession]
 const role = professionRole(p, level)
 const active = OUTPUTS.find(o=>o.id===output)!
 const outputIndex = OUTPUTS.findIndex(o=>o.id===output)
 return <div className={s.page}>
  <header className={s.header}><Link href="/" className={s.logo} aria-label="GCC Mentor — return to main landing page"><span>G</span><div>GCC MENTOR<small>PREPARE FOR YOUR NEXT CHAPTER</small></div></Link><span className={s.demoBadge}>Visual service demo</span></header>
  <main className={s.main}>
   <section className={s.intro} aria-labelledby="explorer-title"><span className={s.eyebrow}>SEE YOUR GULF PREPARATION JOURNEY</span><h1 id="explorer-title">One profile. <em>Many opportunities.</em></h1><p>Choose your profession. Follow the arrows.</p><div className={s.controls}><label>Your discipline<select value={profession} onChange={e=>{setProfession(Number(e.target.value));setJob(0)}}>{PROFESSIONS.map((item,i)=><option key={item.name} value={i}>{item.name}</option>)}</select></label><label>Your career level<select value={level} onChange={e=>setLevel(Number(e.target.value))}>{LEVELS.map((item,i)=><option key={item} value={i}>{item}</option>)}</select></label></div></section>
   <section className={s.journey} aria-label="One Career Profile branches into separate job preparation packs">
    <div className={s.stageLabel}><span>1</span> YOUR STARTING POINT</div>
    <div className={s.profile}><div className={s.profileAvatar}><UserRound size={37}/><span><Check size={13}/></span></div><div className={s.profileIdentity}><span className={s.eyebrow}>ONE CAREER PROFILE</span><h2>{role}</h2><div className={s.profileFields}><span><BriefcaseBusiness size={14}/>Experience</span><span><ShieldCheck size={14}/>Skills</span><span><FileText size={14}/>Qualifications</span></div></div><div className={s.profileDocuments} aria-hidden="true"><FileText/><FileText/><FileText/></div></div>
    <div className={s.profileActions}><span><ShieldCheck size={16}/>Your real experience</span><Link href="/gulf-readiness-score">GCC readiness <ArrowRight size={14}/></Link></div>
    <div className={s.flow}><span/><ArrowDown size={20}/><small>Reuse your profile</small></div>
    <div className={s.stageLabel}><span>2</span> CHOOSE A JOB PATH</div>
    <div className={s.jobs}>{p.paths.map((path,i)=><button key={path} type="button" data-tone={i} aria-pressed={job===i} aria-controls="job-pack" className={s.job} onClick={()=>setJob(i)}><span className={s.jobNumber}>JOB {i+1}<span>{job===i?<Check size={14}/>:<ArrowRight size={14}/>}</span></span><div className={s.jobIcon}><BriefcaseBusiness size={27}/></div><h3>{path}</h3><span className={s.jdTag}><FileText size={13}/>Different job description</span><div className={s.jobMini} aria-hidden="true"><i/><i/><i/></div></button>)}</div>
    <div className={s.flow}><span/><ArrowDown size={20}/><small>Different JD → different pack</small></div>
    <div id="job-pack" className={s.pack} data-tone={job}><div className={s.packHead}><div><div className={s.stageLabel}><span>3</span> YOUR JOB-SPECIFIC PACK</div><h2 aria-live="polite">{p.paths[job]}</h2></div><span className={s.applicationBadge}>Application {job+1}</span></div>
     <div className={s.outputs}>{OUTPUTS.map((item,i)=>{const Icon=ICONS[i];return <button key={item.id} type="button" className={s.output} aria-pressed={output===item.id} aria-controls="sample-output" data-active={output===item.id} onClick={()=>setOutput(item.id)}><PackVisual kind={item.id}/><span className={s.outputLabel}><Icon size={17}/>{LABELS[i]}</span><span className={s.outputHint}>{['Find your fit','Your facts, this job','Make the introduction','Prepare your answers','Practise your interview','Your next improvement'][i]}</span></button>})}</div>
     <div id="sample-output" className={s.preview}><div className={s.previewArt}><PackVisual kind={output} large/><span className={s.sampleBadge}>Illustrative sample</span></div><div className={s.previewContent}><span className={s.eyebrow}>APPLICATION {job+1} · {p.paths[job]}</span><h3 aria-live="polite">{LABELS[outputIndex]}</h3>
      {output==='match'?<div className={s.evidence}><span><Check size={16}/>{p.skills[job]}</span><span><ClipboardCheck size={16}/>Compare with the actual JD</span></div>:null}
      {output==='cv'?<div className={s.cvSample}><b>{role}</b><span className={s.focusStrip}>{p.paths[job]}</span><div className={s.skillChips}>{[p.skills[job],...p.skills.filter((_,i)=>i!==job)].map(skill=><span key={skill}>{skill}</span>)}</div><small>Same experience. Relevant skills first.</small></div>:null}
      {output==='letter'?<div className={s.letterSample}><span>Dear Hiring Team,</span><b>{role}</b><span>My experience → your {p.paths[job].toLowerCase()} role</span><div className={s.letterLines} aria-hidden="true"><i/><i/><i/></div></div>:null}
      {output==='qa'?<><p className={s.question}>{p.question}</p><div className={s.answerSteps}><span>Situation</span><ArrowRight size={14}/><span>Your action</span><ArrowRight size={14}/><span>Result</span></div></>:null}
      {output==='mock'?<><p className={s.question}>“Tell me about your experience in {p.paths[job].toLowerCase()}.”</p><div className={s.answerSteps}><span>Answer</span><ArrowRight size={14}/><span>Feedback</span><ArrowRight size={14}/><span>Try again</span></div><small>Animated demo · no audio or recording</small></>:null}
      {output==='review'?<><div className={s.evidence}><span><Check size={16}/>Answer clarity</span><span><Check size={16}/>Relevant examples</span><span><ArrowRight size={16}/>Next practice step</span></div><small>Illustrative chart, not a score prediction</small></>:null}
      <Link href={active.href} className={s.serviceLink}>{output==='match'?'Add a real job description':`Open ${LABELS[outputIndex].toLowerCase()}`} <ArrowRight size={16}/></Link>
     </div></div>
    </div>
    <div className={s.flow}><span/><ArrowDown size={20}/></div>
    <div className={s.finish}><div className={s.stageLabel}><span>4</span> REVIEW · APPLY · PRACTISE AGAIN</div><div className={s.finishVisual}><div><FileText/><span>Your CV</span></div><ArrowRight/><div><ShieldCheck/><span>Your review</span></div><ArrowRight/><div><BriefcaseBusiness/><span>Employer application</span></div></div><p>You submit through the employer&apos;s channel.</p><Link href="/profile" className={s.primary}>Build my Career Profile <ArrowRight size={18}/></Link></div>
   </section>
   <div className={s.extras}><span>Prepare your online presence too</span><Link href="/linkedin-optimization">LinkedIn <ArrowRight size={14}/></Link><Link href="/naukrigulf-optimization">NaukriGulf <ArrowRight size={14}/></Link></div>
   <footer className={s.footnote}>Example paths, not live vacancies. Account and service access may be required.</footer>
  </main>
 </div>
}
