import Link from 'next/link'
import { ArrowRight, FileText } from 'lucide-react'
import { AuthLinkCatcher } from '@/components/auth/AuthLinkCatcher'
import { AppFooter } from '@/components/layout/AppFooter'
import { LandingNav, PricingPreview, Faq } from './Sections'
import { DocumentOrbit, GccGlobe } from './lazy'
import { ApplicationStudio } from './ApplicationStudio'
import { InterviewPreparation } from './InterviewPreparation'
import { AboutMentor, PrivacyControl } from './MarketingStory'
import { ApplicationChallenges, ReadinessPreview, SupportingServices, TruthfulComparison } from './JourneyDemos'
import { PremiumHero } from './PremiumHero'
import s from './launch.module.css'
import p from './premium.module.css'

export function LandingPage() {
  return <div className={s.page + ' ' + p.system + ' font-redesign-sans'}>
    <LandingNav /><div className="mx-auto max-w-[460px] px-4 empty:hidden"><AuthLinkCatcher /></div>
    <main id="main-content" tabIndex={-1}>
      <PremiumHero />
      <div className={s.marketBand} aria-label="Six GCC markets"><div className={s.wrap}><span>YOUR AMBITION HAS A DESTINATION</span><ul>{['Saudi Arabia','UAE','Qatar','Oman','Kuwait','Bahrain'].map(c=><li key={c}>{c}</li>)}</ul></div></div>
      <section id="templates" className={s.section + ' ' + s.templates + ' ' + p.orbitCompanion} aria-labelledby="templates-title"><div className={s.wrap + ' ' + s.sectionIntro}><div><span className={s.eyebrow}>50 REAL RESUME TEMPLATES</span><h2 id="templates-title">Your next chapter.<br /><span>Beautifully presented.</span></h2></div><div><p>Select a real design from the rotating collection. Open a complete preview and choose the presentation that fits your application.</p><Link href="/templates" className={p.orbitInvite}><FileText size={17} aria-hidden="true" />Your real experience. 50 ways to present it.</Link></div></div><DocumentOrbit className="mt-8" /><p className={s.wrap + ' ' + s.demoNote}>Illustrative candidate data. Single-column ATS formats suit many parsing workflows; decorative layouts may parse differently. Preview and choose for the application.</p></section>
      <ApplicationChallenges /><ReadinessPreview />
      <section id="journey" className={s.section + ' ' + s.journey} aria-labelledby="journey-title"><div className={s.wrap}><div className={s.centerHead}><span className={s.eyebrow}>BUILD ONCE. PREPARE FOR EACH ROLE.</span><h2 id="journey-title">One Career Profile. Multiple Opportunities. Complete Preparation.</h2><p>Add each target job description to the same reviewed professional background. Save a separate application and preparation history for every opportunity.</p></div><ApplicationStudio /><TruthfulComparison /></div></section>
      <SupportingServices /><InterviewPreparation />
      <section id="markets" className={s.section} aria-labelledby="markets-title"><div className={s.wrap}><GccGlobe /></div></section>
      <AboutMentor /><PrivacyControl /><PricingPreview /><Faq />
      <section className={s.final} aria-labelledby="final-title"><div className={s.wrap}><span className={s.eyebrow}>YOUR EXPERIENCE IS THE STARTING POINT</span><h2 id="final-title">Your Next Gulf Opportunity Deserves Better Preparation.</h2><p>Start with your real experience. Build stronger applications. Practice interviews. Learn from every attempt.</p><div className="flex flex-wrap items-center justify-center gap-3"><Link href="/gulf-readiness-score" className={s.primary}>Check My Free GCC Readiness <ArrowRight size={18} aria-hidden="true" /></Link><a href="#services" className={s.secondary}>Explore GCC Mentor Services</a></div></div></section>
    </main><AppFooter />
  </div>
}
