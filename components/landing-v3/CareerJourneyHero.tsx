'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useState } from 'react'
import { ArrowRight, Upload, Check, FileText, Mail, BookOpen, Mic, ShieldCheck, Globe2 } from 'lucide-react'
import { PROFESSION_EXAMPLES } from './professionExamples'
import s from './product.module.css'
import h from './career-hero.module.css'

const destinations = [
  { name: 'Saudi Arabia', flag: '🇸🇦', city: 'Riyadh · Dammam', color: '#087f5b' },
  { name: 'UAE', flag: '🇦🇪', city: 'Dubai · Abu Dhabi', color: '#2864ba' },
  { name: 'Qatar', flag: '🇶🇦', city: 'Doha', color: '#844487' },
  { name: 'Oman', flag: '🇴🇲', city: 'Muscat · Sohar', color: '#a66519' },
  { name: 'Kuwait', flag: '🇰🇼', city: 'Kuwait City', color: '#127e92' },
  { name: 'Bahrain', flag: '🇧🇭', city: 'Manama', color: '#a7405c' },
] as const
const candidates = ['Ahmed Khan', 'Yusuf Ali', 'Faisal Khan', 'Omar Siddiqui', 'Zain Ahmed', 'Aisha Rahman', 'Fatima Noor']
const services = [
  { title: 'Job-specific CV', detail: 'Your facts, tailored to the JD', icon: FileText, href: '#services', color: 'green' },
  { title: 'Cover letter', detail: 'A relevant introduction', icon: Mail, href: '#services', color: 'blue' },
  { title: 'Interview Q&A', detail: 'Study for your target role', icon: BookOpen, href: '#services', color: 'purple' },
  { title: 'Mock interview', detail: 'Practise, review and improve', icon: Mic, href: '#interview', color: 'gold' },
] as const

/** Fictional, browser-local demonstration. No candidate data or live job listings. */
export function CareerJourneyHero() {
  const [profession, setProfession] = useState(0)
  const [country, setCountry] = useState(0)
  const profile = PROFESSION_EXAMPLES[profession]
  const candidate = candidates[profession]
  const destination = destinations[country]
  return <section className={h.hero} aria-labelledby="hero-title">
    <div className={s.wrap}>
      <div className={h.intro}>
        <div>
          <span className={s.eyebrow}>YOUR COMPLETE GULF CAREER PLATFORM</span>
          <h1 id="hero-title">One Career Profile.<br /><em>Every Gulf application, prepared.</em></h1>
          <p>Upload your CV once. Prepare job-specific resumes, cover letters, interview Q&A and mock interviews — all from your real experience.</p>
          <div className={h.actions}><Link href="/gulf-readiness-score" className={s.primary}>Check My Free GCC Readiness <ArrowRight size={18} aria-hidden="true" /></Link><span><Check size={15} aria-hidden="true" /> See your score before signup</span></div>
        </div>
        <div className={h.photo}>
          <Image src="/landing/gulf-candidates-v2.webp" alt="Illustrative Gulf professionals in safety helmets reviewing a project" fill priority sizes="(min-width: 900px) 320px, 160px" />
          <span>YOUR EXPERIENCE.<br />YOUR NEXT CHAPTER.</span>
        </div>
      </div>

      <div className={h.workspace}>
        <div className={h.toolbar}><span><i aria-hidden="true" /> ONE PROFILE → MANY APPLICATIONS</span><label>Explore your profession<select value={profession} onChange={e => setProfession(Number(e.target.value))}>{PROFESSION_EXAMPLES.map((p, i) => <option key={p.department} value={i}>{p.department}</option>)}</select></label></div>
        <div className={h.flow}>
          <div className={h.source}>
            <h2 className={h.step}><b>1</b> Upload & build your profile</h2>
            <Link href="/gulf-readiness-score" className={h.upload}><span><FileText size={21} aria-hidden="true" /> CV</span><strong>Start with your existing CV</strong><Upload size={18} aria-hidden="true" /></Link>
            <div className={h.profile}>
              <div className={h.identity}><span className={h.avatar}>{candidate.split(' ').map(n => n[0]).join('')}</span><div><strong>{candidate}</strong><small>{profile.role}</small></div></div>
              <span className={h.sample}>Fictional candidate · product demo</span>
              <ul>{['Experience & projects', 'Skills & certifications', 'GCC experience & availability'].map(t => <li key={t}><Check size={15} aria-hidden="true" />{t}</li>)}</ul>
              <div className={h.ready}><ShieldCheck size={18} aria-hidden="true" /><span>Your facts stay the foundation</span></div>
            </div>
          </div>
          <div className={h.connector} aria-hidden="true"><ArrowRight size={24} /></div>
          <div className={h.targets}>
            <h2 className={h.step}><b>2</b> Choose your target job</h2>
            <p className={h.hint}>One profile, separate applications. Pick a Gulf market.</p>
            <div className={h.destinations} aria-label="Example target countries">{destinations.map((d, i) => <button type="button" key={d.name} aria-pressed={country === i} onClick={() => setCountry(i)} style={{ '--market-color': d.color } as React.CSSProperties}><span className={h.flag} aria-hidden="true">{d.flag}</span><span><strong>{d.name}</strong><small>{d.city}</small></span><ArrowRight size={15} aria-hidden="true" /></button>)}</div>
            <div className={h.targetJob} aria-live="polite" aria-atomic="true"><Globe2 size={18} aria-hidden="true" /><span><small>EXAMPLE TARGET APPLICATION</small><strong>{profile.role} · {destination.name}</strong></span></div>
          </div>
          <div className={h.connector} aria-hidden="true"><ArrowRight size={24} /></div>
          <div className={h.pack}>
            <h2 className={h.step}><b>3</b> Prepare your application pack</h2>
            <p className={h.hint}>Your profile + each job description power all four tools.</p>
            <div className={h.outputs}>{services.map(({ title, detail, icon: Icon, href, color }) => <a key={title} href={href} className={h.output} data-color={color}><span className={h.serviceIcon}><Icon size={24} aria-hidden="true" /></span><strong>{title}</strong><small>{detail}</small><ArrowRight size={15} className={h.outputArrow} aria-hidden="true" /></a>)}</div>
            <span className={h.connected}><Check size={15} aria-hidden="true" /> Saved together for each application</span>
          </div>
        </div>
        <div className={h.workspaceFoot}><span><ShieldCheck size={15} aria-hidden="true" /> Your own experience. A clearer application.</span><a href="#services">Explore sample outputs <ArrowRight size={15} aria-hidden="true" /></a></div>
      </div>
      <div className={h.trust}><span><b>6</b> Gulf destinations</span><span><b>50</b> CV templates</span><span>Engineering · IT · Finance · Healthcare & more</span><p><ShieldCheck size={16} aria-hidden="true" /> Founded by Satish Kumar Jaiswal · approximately 15 years of industry experience</p></div>
    </div>
  </section>
}
