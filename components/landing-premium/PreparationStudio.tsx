'use client'
import Image from 'next/image'
import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'
import { ArrowRight, BookOpen, Check, FileText, Mic, Pause, Play, UserRound } from 'lucide-react'
import { PROFESSIONS } from '@/app/preparation-pack/catalog'
import s from './premium.module.css'
const previews = [
 { title: 'ATS CV', route: '/optimize/target', icon: FileText },
 { title: 'Cover letter', route: '/cover-letter', icon: FileText },
 { title: 'Interview Q&A', route: '/interview-qa', icon: BookOpen },
 { title: 'Mock interview', route: '/mock-interview', icon: Mic },
 { title: 'LinkedIn', route: '/linkedin-optimization', icon: UserRound },
 { title: 'NaukriGulf', route: '/naukrigulf-optimization', icon: UserRound },
] as const
const rolesByPath: readonly (readonly string[])[] = [
 ['Maintenance Engineer', 'Mechanical Commissioning Engineer', 'Facilities Engineer'],
 ['Control Systems Engineer', 'I&C Commissioning Engineer', 'Instrumentation Engineer'],
 ['Power Systems Engineer', 'Electrical Commissioning Engineer', 'Electrical Maintenance Engineer'],
 ['Site Engineer', 'Infrastructure Engineer', 'Construction Engineer'],
 ['Piping Engineer', 'Welding Inspector', 'Mechanical Completion Engineer'],
 ['Plant Operator', 'Production Engineer', 'Process Commissioning Engineer'],
 ['QA/QC Inspector', 'Supplier Quality Engineer', 'Project Quality Engineer'],
 ['Construction HSE Officer', 'Safety Specialist', 'Project HSE Manager'],
 ['Planning Engineer', 'Quantity Surveyor', 'Project Manager'],
 ['Software Engineer', 'Network Engineer', 'IT Support Specialist'],
 ['Registered Nurse', 'Healthcare Operations Coordinator', 'Service Quality Coordinator'],
 ['Financial Accountant', 'Cost Accountant', 'Finance Operations Analyst'],
 ['Recruitment Specialist', 'HR Specialist', 'Office Administrator'],
 ['Buyer', 'Warehouse Supervisor', 'Logistics Coordinator'],
 ['Guest Services Associate', 'Sales Executive', 'Branch Supervisor'],
 ['Teacher', 'Technical Instructor', 'Learning Programme Coordinator'],
]
const pictures = [
 { src: '/landing/ats-template-hd.webp', alt: 'ATS CV with a clear single-column professional layout' },
 { src: '/landing/service-cover-letter.png', alt: 'Preparing a focused cover letter for a Gulf job application' },
 { src: '/landing/service-interview-qa.png', alt: 'Preparing questions and answers before a job interview' },
 { src: '/landing/service-mock-interview.png', alt: 'Candidate practising an interview with an interviewer' },
 { src: '/professional/profile-hero-v1.webp', alt: 'Professional reviewing a career profile' },
 { src: '/landing/application-preparation-v1.webp', alt: 'Professional preparing a Gulf job application profile' },
] as const
export function PreparationStudio() {
 const [profession, setProfession] = useState(0), [job, setJob] = useState(0), [tab, setTab] = useState(0)
 const [playing, setPlaying] = useState(true)
 const root = useRef<HTMLDivElement>(null), manualUntil = useRef(0)
 const refs = useRef<Array<HTMLButtonElement | null>>([])
 const p = PROFESSIONS[profession], role = rolesByPath[profession][job], preview = previews[tab]
 useEffect(() => {
  if (!playing) return
  const motion = window.matchMedia('(prefers-reduced-motion: reduce)')
  const timer = window.setInterval(() => {
   const el = root.current
   if (!el || motion.matches || document.hidden || Date.now() < manualUntil.current || el.contains(document.activeElement) || el.matches(':hover')) return
   const bounds = el.getBoundingClientRect()
   if (bounds.bottom <= 0 || bounds.top >= window.innerHeight) return
   setTab(value => (value + 1) % previews.length)
   setJob(value => (value + 1) % 3)
   setProfession(value => (value + 1) % PROFESSIONS.length)
  }, 3000)
  return () => window.clearInterval(timer)
 }, [playing])
 return <div ref={root} className={s.studio} id="preparation-demo" onPointerDownCapture={() => { manualUntil.current = Date.now() + 12000 }}>
  <div className={s.studioBar}><label>Choose your profession<select value={profession} onChange={event => { setProfession(Number(event.target.value)); setJob(0) }}>{PROFESSIONS.map((item, i) => <option key={item.name} value={i}>{item.name}</option>)}</select></label><button type="button" className={s.rotationControl} aria-pressed={!playing} onClick={() => setPlaying(value => !value)}>{playing ? <Pause size={15}/> : <Play size={15}/>} {playing ? 'Pause preview' : 'Play preview'}</button></div>
  <div className={s.demoJobs} role="group" aria-label="Target job focus">{p.paths.map((path, i) => <button key={path} type="button" aria-pressed={job === i} onClick={() => setJob(i)}><span>{rolesByPath[profession][i]}</span><b>{path}</b>{job === i ? <Check size={16}/> : <ArrowRight size={16}/>}</button>)}</div>
  <div className={`${s.tabs} ${s.photoTabs}`} role="tablist" aria-label="Preparation output">{previews.map((item, i) => <button key={item.title} ref={element => { refs.current[i] = element }} type="button" role="tab" id={`prep-tab-${i}`} aria-selected={tab === i} aria-controls="prep-output" tabIndex={tab === i ? 0 : -1} onClick={() => setTab(i)} onKeyDown={event => {
   const next = event.key === 'ArrowRight' ? (i + 1) % previews.length : event.key === 'ArrowLeft' ? (i + previews.length - 1) % previews.length : event.key === 'Home' ? 0 : event.key === 'End' ? previews.length - 1 : null
   if (next !== null) { event.preventDefault(); setTab(next); refs.current[next]?.focus() }
  }}>{item.title}</button>)}</div>
  <div className={s.preparationPicturePanel} role="tabpanel" id="prep-output" aria-labelledby={`prep-tab-${tab}`} tabIndex={0}>
   <figure className={`${s.preparationPicture} ${tab === 0 ? s.preparationCv : ''}`}>{pictures.map((picture, index) => <Image key={picture.src} src={picture.src} alt={index === tab ? picture.alt : ''} aria-hidden={index !== tab} fill loading="eager" sizes="(min-width: 1200px) 1140px, calc(100vw - 64px)" style={{visibility: index === tab ? 'visible' : 'hidden'}}/>)}</figure>
   <div className={s.pictureCaption}><span><strong>{preview.title}</strong><small>{role}</small></span><Link href={preview.route} className={s.primary}>Open {preview.title} <ArrowRight size={17}/></Link></div>
  </div>
 </div>
}
