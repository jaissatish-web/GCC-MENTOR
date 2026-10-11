import Image from 'next/image'
import Link from 'next/link'
import { ArrowDownRight, ArrowRight, Check, FileCheck2, Globe2, Mic, ShieldCheck, UserRound } from 'lucide-react'
import p from './premium.module.css'

/** Marketing only: no session state, live scores, recording or template renderer. */
export function PremiumHero() {
  return <section className={p.hero} aria-labelledby="hero-title">
    <div className={p.container}>
      <div className={p.heroGrid}>
        <div className={p.heroCopy}>
          <span className={p.eyebrow}><span aria-hidden="true" /> YOUR COMPLETE GULF CAREER PREPARATION PARTNER</span>
          <h1 id="hero-title">Your Gulf career starts with <span>better preparation.</span></h1>
          <p className={p.promise}>One Profile. Every Application.<br className={p.mobileBreak} /> Every Interview. Better Prepared.</p>
          <p className={p.description}>Build job-specific CVs and cover letters. Strengthen your LinkedIn and NaukriGulf profiles. Practise interviews, review your answers and improve — all from your real experience.</p>
          <div className={p.actions}>
            <Link href="/gulf-readiness-score" className={p.primary}>Check My Free GCC Readiness <ArrowRight size={18} aria-hidden="true" /></Link>
            <a href="#journey" className={p.secondary}>Explore How GCC Mentor Works <ArrowDownRight size={17} aria-hidden="true" /></a>
          </div>
          <p className={p.freeNote}><Check size={14} aria-hidden="true" /> No signup needed to see your readiness score</p>
          <div className={p.founderTrust}><ShieldCheck size={20} aria-hidden="true" /><p>Built by a Gulf engineering professional with approximately 15 years of industry experience.</p></div>
        </div>
        <div className={p.visualColumn}>
          <div className={p.photograph}>
            <Image src="/landing/gulf-candidates-v2.webp" alt="Illustrative Gulf engineering professionals in safety helmets reviewing a project together" fill priority sizes="(min-width: 1280px) 560px, (min-width: 960px) 45vw, (min-width: 600px) 80vw, calc(100vw - 32px)" className={p.photo} />
            <div className={p.photoShade} aria-hidden="true" />
            <span className={p.destination}><Globe2 size={15} aria-hidden="true" /> SIX GCC MARKETS. YOUR NEXT CHAPTER.</span>
            <svg className={p.routeAccent} viewBox="0 0 300 180" fill="none" aria-hidden="true"><path d="M12 162C45 28 175 2 278 30" /><path d="M55 175C80 85 168 30 290 52" /><circle cx="278" cy="30" r="4" /><circle cx="290" cy="52" r="3" /></svg>
            <div className={p.photoCaption}><span>GULF AMBITION / REAL EXPERIENCE</span><strong>Prepare for the opportunity.<br />Practise for the conversation.</strong></div>
          </div>
          <a href="#interview" className={p.coachingEntry}>
            <span className={p.coachingIcon}><Mic size={22} aria-hidden="true" /></span>
            <span className={p.coachingText}><small>PERSONALIZED MOCK INTERVIEW COACHING</small><strong>Practise. Review. Try again.</strong><span>Relevant questions. Useful feedback. Saved progress.</span></span>
            <ArrowRight size={20} aria-hidden="true" />
          </a>
        </div>
      </div>
      <div className={p.preparationRail} aria-label="Your connected career preparation journey">
        <div><UserRound size={20} aria-hidden="true" /><span><strong>One truthful profile</strong><small>Your experience is the foundation</small></span></div>
        <ArrowRight className={p.railArrow} size={18} aria-hidden="true" />
        <div><FileCheck2 size={20} aria-hidden="true" /><span><strong>Every application, prepared</strong><small>CV · Cover letter · Online profiles</small></span></div>
        <ArrowRight className={p.railArrow} size={18} aria-hidden="true" />
        <div><Mic size={20} aria-hidden="true" /><span><strong>Every interview, practised</strong><small>Q&A · Mock interview · Feedback</small></span></div>
      </div>
    </div>
  </section>
}
