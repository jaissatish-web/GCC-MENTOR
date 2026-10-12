'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useEffect, useState, type CSSProperties } from 'react'
import { ArrowRight, Upload, Check, FileText, Mail, BookOpen, Mic, ShieldCheck, Pause, Play, RotateCcw, Sparkles } from 'lucide-react'
import { PROFESSION_EXAMPLES } from './professionExamples'
import s from './product.module.css'
import h from './career-hero.module.css'

const candidates = ['Ahmed Khan', 'Yusuf Ali', 'Faisal Khan', 'Omar Siddiqui', 'Zain Ahmed', 'Aisha Rahman', 'Fatima Noor']
const jobs = [
  { country: 'Saudi Arabia', flag: '🇸🇦', color: '#087f5b', brief: 'Experience & role skills' },
  { country: 'UAE', flag: '🇦🇪', color: '#2864ba', brief: 'Projects & collaboration' },
  { country: 'Qatar', flag: '🇶🇦', color: '#844487', brief: 'Quality & documentation' },
] as const
const outputs = [
  { label: 'Optimized CV', icon: FileText },
  { label: 'Cover letter', icon: Mail },
  { label: 'Q&A sets', icon: BookOpen },
  { label: 'Mock sessions', icon: Mic },
] as const
const practice = [
  { label: 'First practice', action: 'Explain the situation', feedback: 'Your example needs context. Describe the problem and your responsibility.' },
  { label: 'Review & retry', action: 'Make your contribution clear', feedback: 'Explain the action you personally took, using a real example from your experience.' },
  { label: 'Prepare again', action: 'Add evidence of the result', feedback: 'Describe how you checked the outcome. Keep your answer clear, specific and truthful.' },
] as const

/** Marketing demo only: fictional jobs, local state and no generation or recording. */
export function CareerJourneyHero() {
  const [profession, setProfession] = useState(0)
  const [job, setJob] = useState(0)
  const [session, setSession] = useState(0)
  const [questionSet, setQuestionSet] = useState(0)
  // Animation starts only after the visitor's motion preference is known.
  const [playing, setPlaying] = useState(false)
  useEffect(() => {
    const motion = window.matchMedia('(prefers-reduced-motion: reduce)')
    setPlaying(!motion.matches)
    const update = () => setPlaying(!motion.matches)
    motion.addEventListener('change', update)
    return () => motion.removeEventListener('change', update)
  }, [])
  useEffect(() => {
    if (!playing) return
    const timer = window.setInterval(() => {
      if (!document.hidden) setJob(current => (current + 1) % jobs.length)
    }, 5500)
    return () => window.clearInterval(timer)
  }, [playing])
  const profile = PROFESSION_EXAMPLES[profession]
  const candidate = candidates[profession]
  const selected = jobs[job]
  function chooseJob(index: number) { setJob(index); setPlaying(false) }
  return <section className={h.hero} aria-labelledby="hero-title">
    <div className={s.wrap}>
      <div className={h.intro}>
        <div>
          <span className={s.eyebrow}>GULF JOBS TAKE MORE THAN LUCK. PREPARATION + A PLAN.</span>
          <h1 id="hero-title">Your Gulf dream.<br /><em>A plan for every opportunity.</em></h1>
          <p><strong>One Career Profile. Multiple job descriptions.</strong> A specific optimized CV and cover letter for each job — plus repeat Q&A and mock interviews to practise, improve and prepare.</p>
          <span className={h.ambition}>Aim for better-paying Gulf roles with preparation built around your real experience.</span>
          <div className={h.actions}><Link href="/gulf-readiness-score" className={s.primary}>Check My Free GCC Readiness <ArrowRight size={18} aria-hidden="true" /></Link><span><Check size={15} aria-hidden="true" /> See your score before signup</span></div>
        </div>
        <div className={h.photo}>
          <Image src="/landing/gulf-candidates-v2.webp" alt="Illustrative Gulf professionals in safety helmets reviewing a project" fill priority sizes="(min-width: 900px) 280px, 160px" />
          <span>MORE THAN LUCK.<br />PREPARATION + A PLAN.</span>
        </div>
      </div>

      <div className={h.workspace}>
        <div className={h.toolbar}><span><i aria-hidden="true" /> ONE PROFILE. A PLAN FOR EACH JOB.</span><div className={h.controls}><label>Explore a profession<select value={profession} onChange={e => { setProfession(Number(e.target.value)); setPlaying(false) }}>{PROFESSION_EXAMPLES.map((p, i) => <option key={p.department} value={i}>{p.department}</option>)}</select></label><button type="button" className={h.motion} aria-label={playing ? 'Pause hero animation' : 'Play hero animation'} aria-pressed={playing} onClick={() => setPlaying(!playing)}>{playing ? <Pause size={15} /> : <Play size={15} />}<span>{playing ? 'Pause' : 'Play'}</span></button></div></div>
        <div className={h.flow}>
          <div className={h.source}>
            <h2 className={h.step}><b>1</b> One Career Profile</h2>
            <Link href="/gulf-readiness-score" className={h.upload}><Upload size={18} aria-hidden="true" /><span>Upload your CV once <small>Your experience, organized</small></span><ArrowRight size={15} aria-hidden="true" /></Link>
            <div className={h.profile}>
              <div className={h.identity}><span className={h.avatar}>{candidate.split(' ').map(n => n[0]).join('')}</span><div><strong>{candidate}</strong><small>{profile.role}</small></div></div>
              <ul>{['Experience & projects', 'Skills & certifications', 'GCC experience & availability'].map(t => <li key={t}><Check size={14} aria-hidden="true" />{t}</li>)}</ul>
              <div className={h.ready}><ShieldCheck size={17} aria-hidden="true" /> Your real facts, reused for every job</div>
            </div>
            <span className={h.sourceNote}>No starting from scratch.<br />Review your profile once, then target more jobs.</span>
          </div>
          <div className={h.branches} aria-hidden="true"><svg viewBox="0 0 70 300" preserveAspectRatio="none"><path d="M0 150 C35 150 20 50 70 50" /><path d="M0 150 H70" /><path d="M0 150 C35 150 20 250 70 250" /><path className={h.activeRoute} d={job === 0 ? 'M0 150 C35 150 20 50 70 50' : job === 1 ? 'M0 150 H70' : 'M0 150 C35 150 20 250 70 250'} /></svg></div>
          <div className={h.applications}>
            <div className={h.branchHead}><h2 className={h.step}><b>2</b> Multiple job descriptions</h2><h2 className={h.step}><b>3</b> A separate pack for each job</h2></div>
            <div className={h.jobRows} aria-label="Example job-specific application packs">{jobs.map((j, index) => <button type="button" key={j.country} className={h.jobRow} aria-pressed={job === index} onClick={() => chooseJob(index)} style={{ '--job-color': j.color } as CSSProperties}>
              <span className={h.jobDetails}><span className={h.jobMeta}><span aria-hidden="true">{j.flag}</span> {j.country} <small>JOB {index + 1}</small></span><strong>{profile.role}</strong><span className={h.jd}><FileText size={13} aria-hidden="true" /> JD {index + 1} · {j.brief}</span></span>
              <ArrowRight className={h.rowArrow} size={19} aria-hidden="true" />
              <span className={h.rowOutputs}>{outputs.map(({ label, icon: Icon }, output) => <span key={label} className={h.document} data-output={output}><Icon size={20} aria-hidden="true" /><strong>{label}</strong><small>{output < 2 ? `For job ${index + 1}` : 'Repeat & improve'}</small></span>)}</span>
            </button>)}</div>
            <p className={h.sameJob}><Sparkles size={16} aria-hidden="true" /> Each pack follows that job’s description. Your experience stays the same.</p>
          </div>
        </div>
        <div className={h.practice} style={{ '--job-color': selected.color } as CSSProperties}>
          <div className={h.practiceHeading}><span className={h.practiceIcon}><RotateCcw size={22} aria-hidden="true" /></span><div><span className={h.practiceEyebrow}>PREPARE FOR THIS PARTICULAR JOB</span><strong>{profile.role} · {selected.country}</strong><small>Practise → review feedback → try again → better prepared</small></div><span className={h.demo}>Fictional product demo</span></div>
          <div className={h.practiceGrid}>
            <div className={h.study}><span className={h.practiceLabel}><BookOpen size={16} aria-hidden="true" /> Multiple Q&A sets</span><div className={h.sessions} aria-label="Example Q&A sets">{[0, 1, 2].map(i => <button type="button" key={i} aria-pressed={questionSet === i} onClick={() => { setQuestionSet(i); setPlaying(false) }}>Set {i + 1}<Check size={12} aria-hidden="true" /></button>)}</div><p>{questionSet === 0 ? profile.question : questionSet === 1 ? profile.nextQuestion : 'How does your experience relate to this job description?'}</p></div>
            <div className={h.rehearse}><span className={h.practiceLabel}><Mic size={16} aria-hidden="true" /> Multiple mock interviews</span><div className={h.sessions} aria-label="Example mock interview sessions">{practice.map((p, i) => <button type="button" key={p.label} aria-pressed={session === i} onClick={() => { setSession(i); setPlaying(false) }}>Practice {i + 1}</button>)}</div><p>{practice[session].label} · {practice[session].action}</p></div>
            <div className={h.feedback}><span className={h.practiceLabel}><Sparkles size={16} aria-hidden="true" /> Your next improvement</span><p>{practice[session].feedback}</p><a href="#interview">Explore interview coaching <ArrowRight size={14} aria-hidden="true" /></a></div>
          </div>
        </div>
        <div className={h.workspaceFoot}><span><ShieldCheck size={15} aria-hidden="true" /> One truthful profile. Separate preparation for every application.</span><a href="#services">Explore all services <ArrowRight size={15} aria-hidden="true" /></a></div>
      </div>
      <div className={h.trust}><span><b>6</b> Gulf destinations</span><span><b>50</b> CV templates</span><span>Mechanical · Electrical · Instrumentation · Civil · IT · Finance · Healthcare & more</span><p><ShieldCheck size={16} aria-hidden="true" /> Founded by Satish Kumar Jaiswal · approximately 15 years of industry experience</p></div>
    </div>
  </section>
}
