'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useEffect, useState, type CSSProperties } from 'react'
import { ArrowRight, Upload, Check, FileText, Mail, BookOpen, Mic, ShieldCheck, RotateCcw, Sparkles } from 'lucide-react'
import { PROFESSION_EXAMPLES } from './professionExamples'
import s from './product.module.css'
import h from './career-hero.module.css'

const candidates = ['Ahmed Khan', 'Yusuf Ali', 'Faisal Khan', 'Omar Siddiqui', 'Zain Ahmed', 'Aisha Rahman', 'Fatima Noor']
const jobs = [
  { country: 'Saudi Arabia', flag: '🇸🇦', color: '#087f5b', brief: 'Experience & role skills' },
  { country: 'UAE', flag: '🇦🇪', color: '#2864ba', brief: 'Projects & collaboration' },
  { country: 'Qatar', flag: '🇶🇦', color: '#844487', brief: 'Quality & documentation' },
  { country: 'Oman', flag: '🇴🇲', color: '#a66519', brief: 'Inspection & quality records' },
] as const
// Target requirements describe fictional JDs, never additional candidate facts.
const roleTargets = [
  [
    ['Mechanical Lead', 'Team coordination & delivery', 'How would you coordinate a mechanical team around competing project priorities?'],
    ['Mechanical Maintenance Engineer', 'Equipment reliability & maintenance', 'How would you investigate recurring equipment failures?'],
    ['Mechanical Commissioning Engineer', 'Testing & startup readiness', 'How would you verify mechanical equipment is ready for commissioning?'],
    ['Mechanical QA/QC Engineer', 'Inspections & quality records', 'How would you handle a mechanical inspection that does not meet the approved requirements?'],
  ],
  [
    ['Electrical Supervisor', 'Site supervision & installation', 'How would you supervise electrical installation work against approved drawings?'],
    ['Electrical Maintenance Engineer', 'Fault finding & reliability', 'How would you investigate a recurring electrical fault?'],
    ['Electrical Testing Engineer', 'Testing & energization readiness', 'What would you verify before an electrical testing activity?'],
    ['Electrical QA/QC Engineer', 'Inspections & test records', 'How would you document an electrical installation nonconformance?'],
  ],
  [
    ['Instrumentation Supervisor', 'Field supervision & coordination', 'How would you supervise instrument installation and coordinate with the site team?'],
    ['Control Systems Engineer', 'DCS integration & troubleshooting', 'How would you investigate a control-system signal discrepancy?'],
    ['Instrumentation Commissioning Engineer', 'Loop checks & startup readiness', 'How would you verify a completed instrument loop check?'],
    ['Instrumentation QA/QC Engineer', 'Inspections & handover records', 'How would you handle an instrument inspection with missing evidence?'],
  ],
  [
    ['Construction Manager', 'Site teams & project delivery', 'How would you coordinate construction teams around project priorities?'],
    ['Civil Site Engineer', 'Site execution & drawing reviews', 'What would you do when site work differs from an approved drawing?'],
    ['Civil Planning Engineer', 'Schedules & progress tracking', 'How would you investigate a delay against a construction schedule?'],
    ['Civil QA/QC Engineer', 'Inspections & quality records', 'How would you document a construction inspection nonconformance?'],
  ],
  [
    ['Software Team Lead', 'Team coordination & delivery', 'How would you coordinate a software team around competing priorities?'],
    ['Backend Engineer', 'APIs & application reliability', 'How would you investigate an API that fails intermittently?'],
    ['Software QA Engineer', 'Testing & release quality', 'How would you prioritize tests for a release?'],
    ['Application Support Engineer', 'Issue diagnosis & support', 'How would you investigate a production application incident?'],
  ],
  [
    ['Senior Accountant', 'Reconciliations & reporting', 'How would you investigate an unexplained account balance?'],
    ['Financial Analyst', 'Analysis & business reporting', 'How would you explain a significant financial variance?'],
    ['Cost Accountant', 'Cost records & controls', 'How would you investigate an unexpected cost increase?'],
    ['Internal Auditor', 'Controls & supporting evidence', 'How would you document a control finding with sufficient evidence?'],
  ],
  [
    ['Staff Nurse', 'Patient care & documentation', 'How do you respond when a patient’s condition changes?'],
    ['Charge Nurse', 'Team coordination & handovers', 'How would you coordinate care priorities across your team?'],
    ['Clinical Educator', 'Training & clinical practice', 'How would you explain a clinical procedure to a colleague?'],
    ['Quality Nurse', 'Quality review & patient safety', 'How would you document and escalate a patient safety concern?'],
  ],
] as const
const additionalProfiles = [
  { department: 'Technicians & Trades', role: 'Technical professional', name: 'Imran Ali', targets: [['Maintenance Technician','Fault finding & maintenance'],['Workshop Supervisor','Work allocation & quality'],['Field Service Technician','Site support & service'],['Installation Technician','Installation & handover']] },
  { department: 'HSE & Safety', role: 'HSE professional', name: 'Bilal Ahmed', targets: [['Safety Officer','Site safety & inspections'],['HSE Supervisor','Team supervision & controls'],['HSE Engineer','Risk assessments & procedures'],['HSE Coordinator','Records & safety coordination']] },
  { department: 'HR & Recruitment', role: 'HR professional', name: 'Sara Khan', targets: [['HR Officer','Employee records & support'],['Recruitment Specialist','Hiring coordination'],['HR Coordinator','People operations'],['HR Supervisor','Team supervision']] },
  { department: 'Logistics & Supply Chain', role: 'Logistics professional', name: 'Hamza Ali', targets: [['Logistics Coordinator','Shipment coordination'],['Warehouse Supervisor','Stock control & team supervision'],['Supply Chain Analyst','Planning & reporting'],['Transport Supervisor','Transport operations']] },
  { department: 'Procurement', role: 'Procurement professional', name: 'Usman Khan', targets: [['Procurement Officer','Purchasing & records'],['Buyer','Supplier quotes & purchasing'],['Contracts Coordinator','Contracts & documentation'],['Procurement Supervisor','Team coordination']] },
  { department: 'Hospitality & Customer Service', role: 'Hospitality professional', name: 'Maryam Noor', targets: [['Guest Relations Officer','Guest service'],['Front Office Supervisor','Team supervision'],['Customer Service Executive','Customer support'],['Hospitality Coordinator','Service coordination']] },
  { department: 'Sales & Marketing', role: 'Commercial professional', name: 'Farhan Ahmed', targets: [['Sales Executive','Customer relationships'],['Business Development Executive','Opportunity development'],['Marketing Coordinator','Campaign coordination'],['Sales Supervisor','Sales team supervision']] },
  { department: 'Administration', role: 'Administration professional', name: 'Ayesha Ali', targets: [['Administrator','Office operations'],['Document Controller','Document records'],['Office Coordinator','Team support'],['Administration Supervisor','Office supervision']] },
  { department: 'Other professions — your role too', role: 'Experienced professional', name: 'Ahmed Rahman', targets: [['Specialist','Role-specific skills'],['Supervisor','Team supervision'],['Coordinator','Planning & coordination'],['Team Lead','Delivery & leadership']] },
] as const
const heroProfiles = [...PROFESSION_EXAMPLES, ...additionalProfiles]
const branchPaths = [
  'M0 150 C35 150 20 35 70 35',
  'M0 150 C35 150 30 110 70 110',
  'M0 150 C35 150 30 185 70 185',
  'M0 150 C35 150 20 260 70 260',
] as const
const outputs = [
  { label: 'Job-Matched CV', icon: FileText },
  { label: 'Tailored Cover Letter', icon: Mail },
  { label: 'Interview Q&A', icon: BookOpen },
  { label: 'Mock Interview Practice', icon: Mic },
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
  const profile = heroProfiles[profession]
  const candidate = profession < PROFESSION_EXAMPLES.length ? candidates[profession] : additionalProfiles[profession - PROFESSION_EXAMPLES.length].name
  const selected = jobs[job]
  const targets = profession < PROFESSION_EXAMPLES.length ? roleTargets[profession] : additionalProfiles[profession - PROFESSION_EXAMPLES.length].targets.map(([title, focus]) => [title, focus, `How would you explain your ${focus.toLowerCase()} experience for a ${title} role?`])
  const target = targets[job]
  function chooseJob(index: number) { setJob(index) }
  return <section className={h.hero} aria-labelledby="hero-title">
    <div className={s.wrap}>
      <div className={h.intro}>
        <div>
          <span className={s.eyebrow}>YOUR GULF CAREER PREPARATION PARTNER</span>
          <h1 id="hero-title">Your Next Gulf Career Move<br /><em>Starts With Better Preparation.</em></h1>
          <p>Whether you’re aiming for your first Gulf job, a better position, or a promotion, GCC Mentor helps you prepare a job-matched CV, cover letter, interview Q&A and guided practice—all from one profile.</p>
          <span className={h.ambition}>Know your gaps. Prepare. Practise. Track your improvement.</span>
          <div className={h.actions}><Link id="hero-readiness-cta" href="/gulf-readiness-score" className={s.primary}>Check My Free GCC Readiness <ArrowRight size={18} aria-hidden="true" /></Link><span><Check size={15} aria-hidden="true" /> See your score before signup.</span></div>
        </div>
        <div className={h.photo}>
          <Image src="/landing/gulf-candidates-v2.webp" alt="Illustrative Gulf professionals in safety helmets reviewing a project" fill priority sizes="(min-width: 900px) 280px, 160px" />
          <span>YOUR REAL EXPERIENCE.<br />JOB-SPECIFIC PREPARATION.</span>
        </div>
      </div>

      <div className={h.workspace}>
        <div className={h.toolbar}><span><i aria-hidden="true" /> CAREER PROFILE + TARGET JOB → PREPARATION PACK</span><div className={h.controls}><label>Explore a profession<select value={profession} onChange={e => { setProfession(Number(e.target.value)) }}>{heroProfiles.map((p, i) => <option key={p.department} value={i}>{p.department}</option>)}</select></label></div></div>
        <p className={h.quickStart}><strong>Found a Gulf Job? Get Ready to Apply. Get Ready to Interview.</strong><span>Found a job <ArrowRight size={12} aria-hidden="true" /> Match CV <ArrowRight size={12} aria-hidden="true" /> Cover letter <ArrowRight size={12} aria-hidden="true" /> Interview Q&A <ArrowRight size={12} aria-hidden="true" /> Practise</span></p><p className={h.scopeNote}>Engineering, HSE, IT, healthcare, finance, logistics, administration & more. Explore examples below; use your own role and job description.</p>
        <div className={h.flow}>
          <div className={h.source}>
            <h2 className={h.step}><b>1</b> Your Career Profile</h2>
            <Link href="/gulf-readiness-score" className={h.upload}><Upload size={18} aria-hidden="true" /><span>Upload your CV once <small>Your experience, organized</small></span><ArrowRight size={15} aria-hidden="true" /></Link>
            <div className={h.profile}>
              <div className={h.identity}><span className={h.avatar}>{candidate.split(' ').map(n => n[0]).join('')}</span><div><strong>{candidate}</strong><small>{profile.role}</small></div></div>
              <ul>{['Experience & projects', 'Skills & certifications', 'GCC experience & availability'].map(t => <li key={t}><Check size={14} aria-hidden="true" />{t}</li>)}</ul>
              <div className={h.ready}><ShieldCheck size={17} aria-hidden="true" /> Your real facts, reused for every job</div>
            </div>
            <span className={h.sourceNote}>Same experience. Different roles.<br />Target suitable jobs without starting from scratch.</span>
          </div>
          <div className={h.branches} aria-hidden="true"><svg viewBox="0 0 70 300" preserveAspectRatio="none"><defs><marker id="hero-route-arrow" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto" markerUnits="strokeWidth"><path d="M0 0 L6 3 L0 6 Z" fill="#c9962e" stroke="none"/></marker></defs>{branchPaths.map(path => <path key={path} d={path} markerEnd="url(#hero-route-arrow)" />)}<path className={h.activeRoute} d={branchPaths[job]} markerEnd="url(#hero-route-arrow)" /></svg></div>
          <div className={h.applications}>
            <div className={h.branchHead}><h2 className={h.step}><b>2</b> Choose a target job</h2><h2 className={h.step}><b>3</b> Complete preparation pack</h2></div>
            <label className={h.mobileJobChoice}>Target job<select value={job} onChange={e => chooseJob(Number(e.target.value))}>{jobs.map((j, i) => <option key={j.country} value={i}>{j.country} · {targets[i][0]}</option>)}</select></label><div className={h.jobRows} aria-label="Example job-specific application packs">{jobs.map((j, index) => <button type="button" key={j.country} className={h.jobRow} aria-pressed={job === index} onClick={() => chooseJob(index)} style={{ '--job-color': j.color } as CSSProperties}>
              <span className={h.jobDetails}><span className={h.jobMeta}><span aria-hidden="true">{j.flag}</span> {j.country} <small>JOB {index + 1}</small></span><strong>{targets[index][0]}</strong><span className={h.jd}><FileText size={13} aria-hidden="true" /> JD {index + 1} · {targets[index][1]}</span></span>
              <ArrowRight className={h.rowArrow} size={19} aria-hidden="true" />
              <span className={h.mobilePackArrow}><ArrowRight size={15} aria-hidden="true"/> This job’s preparation pack</span><span className={h.rowOutputs}>{outputs.map(({ label, icon: Icon }, output) => <span key={label} className={h.document} data-output={output}><Icon size={20} aria-hidden="true" /><strong>{label}</strong><small>{output < 2 ? `For job ${index + 1}` : 'Repeat & improve'}</small></span>)}</span>
            </button>)}</div>
            <p className={h.sameJob}><Sparkles size={16} aria-hidden="true" /> Your Real Experience. Job-Specific Preparation. Nothing Invented.</p>
          </div>
        </div>
        <div className={h.practice} style={{ '--job-color': selected.color } as CSSProperties}>
          <div className={h.practiceHeading}><span className={h.practiceIcon}><RotateCcw size={22} aria-hidden="true" /></span><div><span className={h.practiceEyebrow}>PREPARE FOR THIS PARTICULAR JOB</span><strong>{target[0]} · {selected.country}</strong><small>Practise → Feedback → Improve → Track Progress</small></div><span className={h.demo}>Illustrative practice</span></div>
          <div className={h.practiceGrid}>
            <div className={h.study}><span className={h.practiceLabel}><BookOpen size={16} aria-hidden="true" /> Job-specific Q&A</span><div className={h.sessions} aria-label="Example Q&A sets">{[0, 1, 2].map(i => <button type="button" key={i} aria-pressed={questionSet === i} onClick={() => { setQuestionSet(i) }}>Set {i + 1}<Check size={12} aria-hidden="true" /></button>)}</div><p>{questionSet === 0 ? target[2] : questionSet === 1 ? `Which real example demonstrates your ${target[1].toLowerCase()} experience?` : `How does your experience match the ${target[0]} job description?`}</p></div>
            <div className={h.rehearse}><span className={h.practiceLabel}><Mic size={16} aria-hidden="true" /> Review your practice</span><div className={h.sessions} aria-label="Example mock interview sessions">{practice.map((p, i) => <button type="button" key={p.label} aria-pressed={session === i} onClick={() => { setSession(i) }}>Practice {i + 1}</button>)}</div><p>{practice[session].label} · {practice[session].action}</p><small className={h.progressNote}>Compare saved sessions with the same resume and practice settings.</small></div>
            <div className={h.feedback}><span className={h.practiceLabel}><Sparkles size={16} aria-hidden="true" /> Answer structure feedback</span><p>{practice[session].feedback}</p><a href="#interview">Explore interview coaching <ArrowRight size={14} aria-hidden="true" /></a></div>
          </div>
        </div>
        <div className={h.workspaceFoot}><span><ShieldCheck size={15} aria-hidden="true" /> Sample data shown for demonstration purposes.</span><a href="#services">Explore all services <ArrowRight size={15} aria-hidden="true" /></a></div>
      </div>
      <div className={h.trust}><span><b>6</b> Gulf destinations</span><span><b>50</b> CV templates</span><span>Mechanical · Electrical · Instrumentation · Civil · IT · Finance · Healthcare & more</span><p><ShieldCheck size={16} aria-hidden="true" /> Founded by Satish Kumar Jaiswal · approximately 15 years of industry experience</p></div>
    </div>
  </section>
}
