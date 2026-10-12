import Image from 'next/image'
import Link from 'next/link'
import { ArrowRight, Check, Mic } from 'lucide-react'
import { AuthLinkCatcher } from '@/components/auth/AuthLinkCatcher'
import { LandingFooter } from './LandingFooter'
import { PremiumNav } from './PremiumNav'
import { DocumentOrbit, GccGlobe } from './lazy'
import { InterviewDemo } from './InterviewDemo'
import { ProductHero, ProductShowcase, CompactReadiness, CompactClosing } from './ProductExperience'
import p from './premium.module.css'
import s from './product.module.css'
const anchors = [['Product','#services'],['Templates','#templates'],['Interview coaching','#interview'],['Gulf markets','#markets'],['About & access','#about']] as const
export function LandingPage() {
 return <div className={p.system+' '+s.page+' font-redesign-sans'}>
  <PremiumNav anchors={anchors}/><div className="mx-auto max-w-[460px] px-4 empty:hidden"><AuthLinkCatcher/></div>
  <main id="main-content" tabIndex={-1}>
   <ProductHero/>
   <ProductShowcase/>
   <section id="templates" className={s.section+' '+s.orbitSection} aria-labelledby="templates-title"><div className={s.wrap+' '+s.sectionHead}><div><span className={s.eyebrow}>YOUR EXPERIENCE, BEAUTIFULLY PRESENTED</span><h2 id="templates-title">50 real templates. Find your fit.</h2></div><Link href="/templates">Explore all templates <ArrowRight size={17}/></Link></div><DocumentOrbit/><p className={s.orbitNote}>Select a design · Swipe to rotate · Open the complete page. Fictional candidate data.</p></section>
   <section id="interview" className={s.section+' '+s.interviewSection} aria-labelledby="interview-title"><div className={s.wrap}><div className={s.sectionHead}><div><span className={s.eyebrow}>PERSONALIZED MOCK INTERVIEW COACHING</span><h2 id="interview-title">Practice. Get feedback. Go again.</h2></div><p>Try the voice interface, explore question-level feedback and compare practice sessions.</p></div><div className={s.interviewLayout}><div className={s.interviewPitch}><div className={s.coachingPhoto}><Image src="/landing/interview-practice-v1.webp" alt="AI-generated illustration of a professional practising a video interview" fill sizes="(min-width: 900px) 420px, calc(100vw - 32px)"/></div><Mic size={28} aria-hidden="true"/><h3>A preparation cycle,<br/>built around your role.</h3><p>Your optimized CV and target job guide the questions. Your answers guide the feedback.</p><div className={s.interviewStats}><span><b>5 / 10 / 15</b>questions per session</span><span><b>5 modes</b>HR · Technical · Gulf · Manager · Mixed</span></div><ul><li><Check size={17}/>Review transcripts and stronger answers</li><li><Check size={17}/>See practical question-level recommendations</li><li><Check size={17}/>Compare saved sessions for the same application</li></ul><Link href="/signup" className={s.primary}>Start my interview preparation <ArrowRight size={17}/></Link><p className={s.note}>Illustrative demonstration. No microphone access.</p></div><div className={s.interviewPanel}><InterviewDemo compact/></div></div></div></section>
   <CompactReadiness/>
   <section id="markets" className={s.section+' '+s.markets} aria-labelledby="markets-title"><div className={s.wrap}><GccGlobe compact/></div></section>
   <CompactClosing/>
  </main><LandingFooter/>
 </div>
}
