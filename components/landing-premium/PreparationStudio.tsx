'use client'
import Image from 'next/image'
import Link from 'next/link'
import { useRef, useState } from 'react'
import { ArrowRight, FileText, ShieldCheck, UserRound } from 'lucide-react'
import { profiles } from './data'
import s from './premium.module.css'

const previews = [
 { title: 'ATS CV', route: '/optimize/target', image: '/landing/service-optimized-resume.png', alt: 'A professionally presented CV on a laptop and printed resume in a Gulf workspace' },
 { title: 'Cover letter', route: '/cover-letter', image: '/landing/service-cover-letter.png', alt: 'A cover letter and matching CV presented together on a laptop in a Gulf workspace' },
 { title: 'Interview Q&A', route: '/interview-qa', image: '/landing/service-interview-qa.png', alt: 'Question and answer preparation cards on a laptop beside career documents' },
 { title: 'Mock interview', route: '/mock-interview', image: '/landing/service-mock-interview.png', alt: 'A candidate preparing for a virtual mock interview on a laptop' },
 { title: 'LinkedIn', route: '/linkedin-optimization', image: '/professional/profile-hero-v1.webp', alt: 'Professionals preparing their online career profiles for Gulf opportunities' },
 { title: 'NaukriGulf', route: '/naukrigulf-optimization', image: '/landing/application-preparation-v1.webp', alt: 'A professional preparing a Gulf job application and career documents' },
] as const

/** Illustrative service photos, never represented as generated customer outputs. */
export function PreparationStudio() {
 const [role, setRole] = useState(0)
 const [tab, setTab] = useState(0)
 const refs = useRef<Array<HTMLButtonElement | null>>([])
 const p = profiles[role]
 const preview = previews[tab]
 return <div className={s.studio} id="preparation-demo">
  <div className={s.studioBar}><span><i/>YOUR PREPARATION PACK <small>Explore the services</small></span><label>Choose your profession<select value={role} onChange={e => setRole(Number(e.target.value))}>{profiles.map((profile, i) => <option key={profile.department} value={i}>{profile.department}</option>)}</select></label></div>
  <div className={s.flowStrip} aria-label="Preparation workflow"><span><FileText size={18}/>Target job description</span><ArrowRight size={17}/><span><UserRound size={18}/>Your Career Profile</span><ArrowRight size={17}/><span><ShieldCheck size={18}/>Preparation pack</span></div>
  <div className={`${s.tabs} ${s.photoTabs}`} role="tablist" aria-label="Preparation output">{previews.map((item, i) => <button key={item.title} ref={el => { refs.current[i] = el }} type="button" role="tab" data-kind={i} id={`prep-tab-${i}`} aria-selected={tab === i} aria-controls="prep-output" tabIndex={tab === i ? 0 : -1} onClick={() => setTab(i)} onKeyDown={e => {
   const next = e.key === 'ArrowRight' ? (i + 1) % previews.length : e.key === 'ArrowLeft' ? (i + previews.length - 1) % previews.length : e.key === 'Home' ? 0 : e.key === 'End' ? previews.length - 1 : null
   if (next !== null) { e.preventDefault(); setTab(next); refs.current[next]?.focus() }
  }}>{item.title}</button>)}</div>
  <div className={s.photoOutput} role="tabpanel" id="prep-output" aria-labelledby={`prep-tab-${tab}`} tabIndex={0}>
   <figure className={s.servicePhoto}>
    <Image key={preview.image} src={preview.image} alt={preview.alt} fill sizes="(max-width: 767px) 100vw, (max-width: 1200px) 90vw, 1180px" />
    <figcaption><span>{preview.title}</span><small>{p.department} · {p.country}</small></figcaption>
   </figure>
  </div>
  <div className={s.studioFoot}><span><ShieldCheck size={16}/>Illustrative service photos</span><Link href={preview.route}>Open {preview.title} preparation <ArrowRight size={16}/></Link></div>
 </div>
}
