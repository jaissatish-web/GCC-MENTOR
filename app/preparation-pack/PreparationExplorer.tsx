'use client'
import { useRef, useState } from 'react'
import Link from 'next/link'
import { ArrowDown, ArrowRight, BriefcaseBusiness, Check, ClipboardCheck, FileText, FolderOpen, GitBranch, Mail, Mic, ShieldCheck, Sparkles, UserRound, BookOpen } from 'lucide-react'
import { LEVELS, PROFESSIONS, OUTPUTS, professionRole } from './catalog'
import s from './explorer.module.css'
const ICONS = [ClipboardCheck, FileText, Mail, BookOpen, Mic, FolderOpen]
export function PreparationExplorer() {
 const [profession, setProfession] = useState(0)
 const [level, setLevel] = useState(3)
 const [job, setJob] = useState(0)
 const [output, setOutput] = useState<(typeof OUTPUTS)[number]['id']>('cv')
 const previewRef = useRef<HTMLElement>(null)
 const chooseOutput = (branch: number, service: (typeof OUTPUTS)[number]['id']) => {
  setJob(branch)
  setOutput(service)
  previewRef.current?.focus({ preventScroll: true })
  previewRef.current?.scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' })
 }
 const p = PROFESSIONS[profession]
 const role = professionRole(p, level)
 const focus = p.paths[job]
 const active = OUTPUTS.find(o => o.id === output)!
 const chooseProfession = (value: number) => { setProfession(value); setJob(0) }
 return <div className={s.page}>
  <header className={s.header}><Link href="/" className={s.logo} aria-label="GCC Mentor — return to main landing page"><span>G</span><div>GCC MENTOR<small>PREPARE FOR YOUR NEXT CHAPTER</small></div></Link><span className={s.badge}>Interactive service demo</span></header>
  <main className={s.main}>
   <section className={s.intro} aria-labelledby="explorer-title"><span className={s.eyebrow}>YOUR PROFESSION. YOUR NEXT GULF OPPORTUNITY.</span><h1 id="explorer-title">One profile.<br/><em>A preparation pack for every job.</em></h1><p>See how your real experience becomes a focused application and an interview practice plan—each time you choose a different job description.</p><div className={s.controls}><label>Choose your discipline<select value={profession} onChange={e => chooseProfession(Number(e.target.value))}>{PROFESSIONS.map((item,i)=><option key={item.name} value={i}>{item.name}</option>)}</select></label><label>Choose your career level<select value={level} onChange={e=>setLevel(Number(e.target.value))}>{LEVELS.map((item,i)=><option key={item} value={i}>{item}</option>)}</select></label></div><p className={s.selection} role="status"><BriefcaseBusiness size={18}/> Exploring <strong>{role}</strong> · Saudi Arabia, UAE, Qatar, Oman, Kuwait & Bahrain</p><p className={s.note}>Illustrative roles and sample content—not live vacancies or generated customer results. Eligibility depends on your experience and the employer&apos;s requirements.</p></section>
   <section className={s.tree} aria-labelledby="tree-title"><h2 id="tree-title" className={s.treeTitle}><GitBranch size={21}/> Follow your application branches</h2>
    <div className={s.root}><div className={s.rootIcon}><UserRound size={26}/></div><div><span className={s.eyebrow}>01 · BUILD ONCE, REVIEW YOUR FACTS</span><h3>Your Career Profile</h3><p>{role} · employment, projects, skills, education and certifications</p><div className={s.chips}>{p.skills.map(skill=><span key={skill}>{skill}</span>)}</div></div><Link href="/profile" className={s.rootLink}>Build my profile <ArrowRight size={17}/></Link></div>
    <div className={s.support}><ShieldCheck size={18}/><span><strong>GCC readiness:</strong> review destination and preparation gaps before targeting a job.</span><Link href="/gulf-readiness-score">Check readiness <ArrowRight size={15}/></Link></div>
    <div className={s.connector}><ArrowDown size={23}/><span>Same profile · different job descriptions · separate preparation packs</span></div>
    <div className={s.branches}>{p.paths.map((path,i)=><article key={`${p.name}-${path}`} className={s.branch} data-tone={i}>
     <button type="button" className={s.jobButton} aria-pressed={job===i} onClick={()=>setJob(i)}><span className={s.branchLabel}>JOB PATH {i+1} <span>{job===i?'SELECTED':'EXPLORE'}</span></span><BriefcaseBusiness size={23}/><h3>{role}</h3><p>{path}</p><span className={s.jobHint}>Example role focus · choose an actual JD to start</span></button>
     <div className={s.down}><ArrowDown size={18}/><span>Read this job&apos;s requirements</span></div>
     <div className={s.jd}><b>Target job description</b><ul><li>Relevant experience in {path.toLowerCase()}</li><li>{p.skills[i]} and clear delivery records</li><li>Coordination, quality and role-specific requirements</li></ul></div>
     <div className={s.down}><ArrowDown size={18}/><span>Prepare this application</span></div>
     <div className={s.outputs}>{OUTPUTS.map((item,k)=>{const Icon=ICONS[k];return <button key={item.id} type="button" aria-pressed={job===i&&output===item.id} aria-controls="sample-output" onClick={()=>chooseOutput(i,item.id)} className={s.output} data-active={job===i&&output===item.id}><Icon size={19}/><span><b>{item.label}</b><small>{item.short}</small></span><ArrowRight size={16}/></button>})}</div>
     <div className={s.branchFoot}><Check size={16}/> Your facts stay consistent. This pack stays job-specific.</div>
    </article>)}</div>
   </section>
   <section ref={previewRef} id="sample-output" tabIndex={-1} className={s.preview} aria-labelledby="preview-title"><div className={s.previewHead}><div><span className={s.eyebrow}>SELECT A BLOCK ABOVE TO EXPLORE ITS OUTPUT</span><h2 id="preview-title" aria-live="polite">{active.label} <span>· Job path {job+1}</span></h2><p>{role} · {focus}</p></div><span className={s.badge}>Illustrative sample</span></div>
    <div className={s.previewGrid}><div className={s.sample}>
     {output==='match'?<><h3>What the job asks for → what your profile shows</h3><div className={s.matchRow}><Check size={18}/><span>{p.skills[job]}<small>Highlight this only when supported by your profile.</small></span></div><div className={s.matchRow}><ClipboardCheck size={18}/><span>Employer-specific systems, credentials and experience<small>Review gaps against the actual JD. A match score does not guarantee a shortlist.</small></span></div></>:null}
     {output==='cv'?<><span className={s.documentTag}>CV · APPLICATION {job+1}</span><h3>Example Candidate</h3><b>{role} · {focus}</b><hr/><h4>Professional summary</h4><p>Professional with experience in {p.skills.join(', ').toLowerCase()}. For this application, the CV prioritizes relevant {focus.toLowerCase()} experience.</p><h4>Experience emphasis</h4><p>Sample wording: “Supported {p.skills[job].toLowerCase()} activities, coordinated with the responsible teams and maintained delivery records.”</p><h4>Relevant skills</h4><div className={s.chips}>{[p.skills[job],...p.skills.filter((_,i)=>i!==job)].map(skill=><span key={skill}>{skill}</span>)}</div><small>Use wording only when it reflects your actual work. No new qualification or achievement is added.</small></>:null}
     {output==='letter'?<><span className={s.documentTag}>COVER LETTER · APPLICATION {job+1}</span><h3>Dear Hiring Team,</h3><p>I am interested in your {role} opportunity focused on {focus.toLowerCase()}. My background in {p.skills.join(', ').toLowerCase()} provides relevant experience to discuss against your requirements.</p><p>I would welcome the opportunity to explain my responsibilities and relevant examples from my work.</p><small>The real letter uses your reviewed profile and target job. You check the employer, role and claims before sending.</small></>:null}
     {output==='qa'?<><span className={s.documentTag}>INTERVIEW STUDY · APPLICATION {job+1}</span><h3>{p.question}</h3><h4>Build your answer from your own example</h4><ol><li>Explain the situation and your responsibility in {focus.toLowerCase()}.</li><li>Describe what you personally checked, decided and coordinated.</li><li>State the outcome you can substantiate and what you learned.</li></ol><p>Follow-up: What evidence or records supported your decision?</p><small>Role-specific study support; review technical and regulated requirements with authoritative sources.</small></>:null}
     {output==='mock'?<><span className={s.documentTag}>PRACTICE · APPLICATION {job+1}</span><h3>You are interviewing for {role}</h3><div className={s.interviewPrompt}><Mic size={24}/><p>“Tell me about your most relevant experience in {focus.toLowerCase()}.”</p></div><ol><li>Answer with your own responsibilities and examples.</li><li>Practise follow-up questions based on the target role.</li><li>Review feedback, improve your answer and try again.</li></ol><small>This demo does not record audio or generate an interview. Open the service to begin a real session.</small></>:null}
     {output==='review'?<><span className={s.documentTag}>REVIEW → IMPROVE → PRACTISE AGAIN</span><h3>Keep the next step clear</h3><ul><li>Review answer clarity, relevant examples and missing detail.</li><li>Revisit your CV, study material and completed sessions.</li><li>Compare sessions when their resume, rubric and practice settings match.</li></ul><p>Your next action: prepare a clearer example of {p.skills[job].toLowerCase()} for this role.</p><small>Illustrative review actions, not a predicted interview score or hiring result.</small></>:null}
    </div><aside className={s.action}><Sparkles size={26}/><h3>Make this your real preparation pack</h3><p>Import or build your profile. Add an actual job description from an employer, recruiter or job portal. Review your outputs, then apply through the employer&apos;s chosen channel.</p><Link href={active.href} className={s.primary}>{output === 'match' ? 'Add a job description' : `Open ${active.label.toLowerCase()}`} <ArrowRight size={18}/></Link><p className={s.note}>Account and service access may be required. GCC Mentor prepares your application materials; it does not submit applications for you.</p></aside></div>
   </section>
   <section className={s.finish}><FolderOpen size={26}/><div><h2>Three jobs. Three packs. One trusted profile.</h2><p>Repeat this flow for another job description. Keep each job&apos;s resume, letter and interview preparation separate.</p></div><Link className={s.primary} href="/profile">Start with my Career Profile <ArrowRight size={18}/></Link></section>
   <div className={s.extra}><span>Also prepare your professional presence</span><Link href="/linkedin-optimization">LinkedIn <ArrowRight size={15}/></Link><Link href="/naukrigulf-optimization">NaukriGulf <ArrowRight size={15}/></Link></div>
  </main>
 </div>
}
