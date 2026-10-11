import Link from 'next/link'
import { ArrowRight, Check, FileText, Globe2, Mail, MessagesSquare, ShieldCheck } from 'lucide-react'
import { AuthLinkCatcher } from '@/components/auth/AuthLinkCatcher'
import { AppFooter } from '@/components/layout/AppFooter'
import { LandingNav, PricingPreview, Faq } from './Sections'
import { DocumentOrbit } from './lazy'
import { ApplicationStudio } from './ApplicationStudio'
import { InterviewPreparation } from './InterviewPreparation'
import { AboutMentor, ApplicationBarriers, CandidateVoice, PrivacyControl } from './MarketingStory'
import s from './launch.module.css'
import p from './premium.module.css'
import { PremiumHero } from './PremiumHero'

const services = [
  { icon: Globe2, problem: '“Am I ready for the Gulf?”', title: 'Find your starting point.', body: 'Check your Gulf Readiness score and see which parts of your profile need attention.', result: 'Your score + areas to improve', href: '/gulf-readiness-score', action: 'Check my readiness' },
  { icon: FileText, problem: '“My CV doesn’t fit this job.”', title: 'Make your experience relevant.', body: 'Compare your profile with a job description. Review keywords and tailor your CV using experience you can support.', result: 'Job match + a tailored CV', href: '#templates', action: 'Explore resume styles' },
  { icon: Mail, problem: '“What should I say to the recruiter?”', title: 'Introduce yourself clearly.', body: 'Create a cover letter for the role, with the relevant experience from your profile and optimized CV.', result: 'A cover letter for this application', href: '/signup', action: 'Prepare my application' },
  { icon: MessagesSquare, problem: '“I struggle to explain my experience.”', title: 'Walk in with practice.', body: 'Prepare with role-specific Q&A. Try a mock interview and use the feedback to improve your answers.', result: 'Practice answers + interview feedback', href: '#interview', action: 'See interview preparation' },
]
const trustRules = [
  { icon: ShieldCheck, title: 'Your Career Profile is the foundation', body: 'Review the information extracted from your CV before using it.' },
  { icon: Check, title: 'You review and approve the changes', body: 'Keep suggestions only when you can support them with your real experience.' },
  { icon: FileText, title: 'Each application has its own purpose', body: 'Save separate CVs for separate target jobs and prepare for each interview.' },
]
export function LandingPage() {
  return <div className={s.page + ' ' + p.system + ' font-redesign-sans'}>
    <LandingNav />
    <div className="mx-auto max-w-[460px] px-4 empty:hidden"><AuthLinkCatcher /></div>
    <main id="main-content" tabIndex={-1}>
      <PremiumHero />
      <div className={s.marketBand} aria-label="Six GCC markets"><div className={s.wrap}><span>YOUR AMBITION HAS A DESTINATION</span><ul>{['Saudi Arabia', 'UAE', 'Qatar', 'Oman', 'Kuwait', 'Bahrain'].map(c => <li key={c}>{c}</li>)}</ul></div></div>
      <section id="templates" className={s.section + ' ' + s.templates + ' ' + p.orbitCompanion} aria-labelledby="templates-title"><div className={s.wrap + ' ' + s.sectionIntro}><div><span className={s.eyebrow}>50 RESUME TEMPLATES</span><h2 id="templates-title">Your next chapter.<br /><span>Beautifully presented.</span></h2></div><div><p>One truthful profile, presented for your next opportunity. Select a real template, swipe through the collection or open a complete preview.</p><Link href="/templates" className={p.orbitInvite}><FileText size={17} aria-hidden="true" />Your real experience. 50 ways to present it.</Link></div></div><DocumentOrbit className="mt-8" /><p className={s.wrap + ' ' + s.demoNote}>Previews use illustrative candidate data. Your resume uses the information you review and approve.</p></section>
      <InterviewPreparation />
      <ApplicationBarriers />
      <section id="services" className={s.section} aria-labelledby="services-title"><div className={s.wrap}><div className={s.sectionIntro}><div><span className={s.eyebrow}>FROM DOUBT TO A CLEAR NEXT STEP</span><h2 id="services-title">You bring the experience.<br /><span>We help you present it.</span></h2></div><p>Applying abroad comes with questions. Each part of GCC Mentor helps you tackle one of them.</p></div><div className={s.serviceGrid}>{services.map(({icon: Icon, ...item}, i) => <article key={item.title} className={s.serviceCard}><div className={s.serviceTop}><Icon size={24} aria-hidden="true" /><span>0{i + 1}</span></div><p className={s.problem}>{item.problem}</p><h3>{item.title}</h3><p>{item.body}</p><div className={s.serviceResult}><Check size={16} aria-hidden="true" />{item.result}</div><a href={item.href}>{item.action}<ArrowRight size={17} aria-hidden="true" /></a></article>)}</div></div></section>
      <section id="journey" className={s.section + ' ' + s.journey} aria-labelledby="journey-title"><div className={s.wrap}><div className={s.centerHead}><span className={s.eyebrow}>ONE PROFILE. MULTIPLE POSSIBILITIES.</span><h2 id="journey-title">Same experience.<br /><span>Different roles. Relevant applications.</span></h2><p>Build your profile once. For each suitable role, add its job description and prepare a separate application with the experience that matters.</p></div><ApplicationStudio /><ol className={s.steps}>{[['Build your foundation', 'Upload your existing CV or paste its text. Review the extracted information in your Career Profile.'], ['Give each application a target', 'Add a job description, check your match and review the suggested CV changes. Choose a template and save it in your library.'], ['Prepare for the conversation', 'Create the cover letter, study interview Q&A and practise with a mock interview. Repeat for your next target role.']].map(([title, body], i) => <li key={title}><span>0{i + 1}</span><div><h3>{title}</h3><p>{body}</p></div></li>)}</ol></div></section>

      <section className={s.section + ' ' + s.readiness} aria-labelledby="readiness-title"><div className={s.wrap + ' ' + s.readinessGrid}><div><span className={s.eyebrow}>NOT SURE WHERE TO BEGIN?</span><h2 id="readiness-title">Start with clarity.<br /><span>Check your Gulf Readiness.</span></h2><p>Your score is a preparation guide. Use it to understand your profile and what to improve before your next application.</p><Link href="/gulf-readiness-score" className={s.primary}>Check my readiness — free <ArrowRight size={18} aria-hidden="true" /></Link></div><div className={s.readinessVisual}><Globe2 size={48} strokeWidth={1.2} aria-hidden="true" /><strong>Know where you stand.</strong><span>Your profile → your score → your next steps</span><p>Readiness is a guide, not a prediction of hiring.</p></div></div></section>
      <section className={s.section} aria-labelledby="trust-title"><div className={s.wrap + ' ' + s.trustGrid}><div><span className={s.eyebrow}>GULF KNOWLEDGE. YOUR REAL STORY.</span><h2 id="trust-title">Built from Gulf experience.<br /><span>Grounded in yours.</span></h2><p>Founded by Satish Kumar Jaiswal, with 15+ years of engineering and commissioning experience, including Gulf projects. GCC Mentor brings practical career preparation into one connected workspace.</p></div><div className={s.trustRules}>{trustRules.map(({icon: Icon, title, body}) => <div key={title}><Icon size={22} aria-hidden="true" /><div><h3>{title}</h3><p>{body}</p></div></div>)}</div></div></section>
      <AboutMentor /><PrivacyControl /><CandidateVoice />
      <PricingPreview /><Faq />
      <section className={s.final} aria-labelledby="final-title"><div className={s.wrap}><span className={s.eyebrow}>YOUR EXPERIENCE IS THE STARTING POINT</span><h2 id="final-title">Give your Gulf ambition<br /><span>a clear next step.</span></h2><p>One profile. A focused application for each role. A better-prepared you.</p><Link href="/signup" className={s.primary}>Build my Career Profile <ArrowRight size={18} aria-hidden="true" /></Link><span className={s.finalNote}>Free to start · Review your data · Stay in control</span></div></section>
    </main><AppFooter />
  </div>
}
