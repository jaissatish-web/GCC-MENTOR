import type { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'
import { ArrowUpRight, BookOpen, Check, ChevronRight, ClipboardCheck, FileText, FolderOpen, Headphones, Mail, Mic, ShieldCheck, Target, Waves, Building2, Factory, HardHat, Droplets, BriefcaseBusiness, Rocket } from 'lucide-react'
import { AuthLinkCatcher } from '@/components/auth/AuthLinkCatcher'
import { PremiumNav } from '@/components/landing-v3/PremiumNav'
import { LandingFooter } from '@/components/landing-v3/LandingFooter'
import { DocumentOrbit } from '@/components/landing-v3/lazy'
import { InterviewDemo } from '@/components/landing-v3/InterviewDemo'
import { CareerProfilePackages } from '@/components/landing-v3/CareerProfilePackages'
import { CandidateConcerns } from '@/components/landing-v3/CandidateConcerns'
import { EmployerMarquee } from '@/components/landing-v3/EmployerMarquee'
import { services } from '@/components/landing-premium/data'
import { UniversalTheme } from '@/components/design-system/UniversalTheme'
import s from '@/components/landing-v3/landing.module.css'

const TITLE = 'Gulf Career Preparation & Interview Coaching | GCC MENTOR'
const DESCRIPTION = 'One profile for job-specific resumes, cover letters and interview practice. Prepare for Gulf opportunities using your real experience.'
export const metadata: Metadata = { title: { absolute: TITLE }, description: DESCRIPTION, alternates: { canonical: '/' }, openGraph: { title: TITLE, description: DESCRIPTION, url: '/', images: [{ url: '/landing/v2/hero-gulf.webp', width: 1586, height: 992, alt: 'GCC Mentor, grounded Gulf career preparation' }] }, twitter: { card: 'summary_large_image', title: TITLE, description: DESCRIPTION, images: ['/landing/v2/hero-gulf.webp'] } }
const anchors = [['Preparation', '#services'], ['Templates', '#templates'], ['Interview', '#interview'], ['Access', '#plans'], ['About', '#about'], ['FAQ', '#faq']] as const
const industries = [ ['Oil & Gas',Droplets,'oil-gas'],['Construction',HardHat,'construction'],['Engineering',Factory,'engineering'],['Operations',Waves,'operations'],['Projects',Building2,'projects'],['Corporate',BriefcaseBusiness,'corporate'] ] as const
const icons = { readiness: Target, match: ClipboardCheck, cv: FileText, letter: Mail, qa: BookOpen, interview: Mic, templates: FileText, reports: FolderOpen }
const faq = [
  ['Who is GCC Mentor for?', 'Preparation follows your own profile and job description. Examples include engineering, QA/QC, HSE, construction, IT, healthcare, finance, logistics and administration.'],
  ['Can I prepare for a LinkedIn or NaukriGulf job?', 'Yes. Copy the job description and use your Career Profile to prepare a relevant resume, cover letter and interview material. You review and update those profiles yourself; GCC Mentor does not automatically import jobs or submit applications.'],
  ['Can I use one Career Profile for multiple applications?', 'Yes. Import or build your profile, check the facts, and prepare separate applications for different job descriptions.'],
  ['Does resume optimization invent experience?', 'It is grounded in your Career Profile and the job description. It improves structure and emphasis. Review the output against your real experience; unsupported qualifications should not be added.'],
  ['Can I practise interviews multiple times?', 'Yes, subject to the current service access and usage limits. Save study sets, practise again and use feedback to choose your next focus.'],
  ['Which GCC countries are covered?', 'Saudi Arabia, the UAE, Qatar, Oman, Kuwait and Bahrain. Confirm licensing, visa and documentation requirements with the employer or relevant authority.'],
  ['Is my information private?', 'Your signed-in workspace uses account-based access controls. Relevant profile and job information is sent to configured AI providers for requested services. Settings → Delete my data removes your Career Profile and saved packages.'],
  ['Does GCC Mentor guarantee a Gulf job?', 'No. It supports career preparation and guidance. Employers decide whom to shortlist and hire. Readiness and AI practice scores are not hiring probabilities.'],
] as const

export default function Home() {
  return <UniversalTheme><div className={`${s.system} font-redesign-sans`} data-marketing="white" data-website-ui>
    <PremiumNav anchors={anchors} /><AuthLinkCatcher />
    <main id="main-content" tabIndex={-1}>
      <section className={s.heroNavy} data-uds="hero" aria-labelledby="hero-title">
        <div className={s.heroImage}><Image src="/landing/v2/hero-gulf.webp" alt="Illustration of an industrial professional overlooking a Gulf skyline" fill priority sizes="(min-width:960px) 75vw, 100vw" /></div>
        <div className={s.heroInner} data-uds="inner"><div className={s.heroCopy}>
          <h1 id="hero-title" className={s.heroTitle} data-uds="hero-title">Prepare for the<br className={s.desktopHeadline} /> Gulf job you want.</h1>
          <p className={s.heroSub}>One Career Profile. Job-specific resumes, cover letters and interview practice, grounded in your real experience.</p>
          <div className={s.heroCtas}><Link href="/gulf-readiness-score" className={s.goldCta} data-uds="button-primary">Check my readiness </Link><Link href="#services" className={s.ghostCta} data-uds="button-secondary">See how it works </Link></div>
          <p className={s.freeNote} data-uds="helper"><Check size={15} aria-hidden="true" />Start before signup.</p>
        </div></div>
      </section>
      <EmployerMarquee />
      <CandidateConcerns />
      <section id="about" className={s.founderSection} data-uds="section" aria-labelledby="about-title"><div className={s.inner}><div className={s.founderPanel}>
        <span className={s.founderKicker}>Built by a Gulf professional</span>
        <h2 id="about-title" className={s.sectionTitle} data-uds="marketing-title">Built with real Gulf industry experience.</h2>
        <div className={s.founderContent}>
          <div className={s.founderIdentity}><Image className={s.founderPortrait} src="/landing/v2/founder-satish.webp" alt="Satish Kumar Jaiswal, founder of GCC Mentor" width={400} height={400} sizes="(min-width:960px) 184px, 104px" /><div><h3>Satish Kumar Jaiswal</h3><span className={s.founderRole}>Founder, GCC Mentor</span></div></div>
          <div className={s.founderExperience}><h3>15+ years of Instrumentation &amp; Controls experience</h3><p>EPC and industrial project execution, commissioning and technical project environments.</p><p className={s.founderExposure}>Professional exposure to NEOM and ADNOC environments.</p><p className={s.founderDisclaimer}>Experience references only. No platform affiliation or endorsement.</p><p className={s.founderMotivation}>GCC Mentor was created to help professionals present their real experience clearly, understand job requirements and prepare with greater confidence for Gulf career opportunities.</p><a href="https://www.linkedin.com/in/jaissatish/" target="_blank" rel="noopener noreferrer" className={s.founderLink} data-uds="text-link">View professional background <ArrowUpRight size={16} aria-hidden="true" /></a></div>
        </div>
      </div></div></section>
      <section id="services" className={s.servicesSection} data-uds="soft-section" aria-labelledby="services-title"><div className={s.inner}>
        <CareerProfilePackages />
        <details className={s.moreServices}><summary>Explore all preparation services <ChevronRight size={17} aria-hidden="true" /></summary><ul className={s.serviceLinks}>{services.map(([name,description,href,key])=>{const Icon=icons[key as keyof typeof icons];return <li key={name}><Link href={href}><Icon size={18} aria-hidden="true" /><span><strong>{href==='/templates'?'Resume designs, sign-in required':name}</strong><small>{href==='/templates'?'Browse the full design library after signing in.':description}</small></span><ArrowUpRight size={16} aria-hidden="true"/></Link></li>})}</ul></details>
      </div></section>
      <section id="templates" className={s.resumeSection} data-uds="section" aria-labelledby="templates-title"><div className={s.resumeInner}>
        <div className={s.heroVisual} data-uds="visual"><div className={s.visualLabel}><h2 id="templates-title">Real resume designs</h2><span>Sample template content, not a customer resume</span></div><DocumentOrbit /><div className={s.visualFoot}><Link href="/templates">Browse designs, sign-in required </Link></div></div>
      </div></section>
      <InterviewDemo />
      <section id="industries" className={s.industriesSection} aria-labelledby="industries-title">
        <div className={s.inner}>
          <h2 id="industries-title" className={s.sectionTitle} data-uds="marketing-title">Preparation across industries and career stages</h2>
          <p className={s.sectionLead}>Prepare from your own experience, whatever your profession or career stage.</p>
        </div>
        <ul className={s.industryGrid}>
          {industries.map(([name, Icon, file], index) => (
            <li key={name} className={s.industryTile}>
              <span className={file === 'operations' ? `${s.industryPhoto} ${s.industryPortrait}` : s.industryPhoto} data-industry={index}>
                <Image src={`/landing/v2/industries/${file}.webp`} alt="" fill sizes="(min-width:960px) 17vw, (min-width:600px) 33vw, 50vw" />
              </span>
              <span className={s.industryLabel}><Icon size={19} aria-hidden="true" />{name}</span>
            </li>
          ))}
        </ul>
      </section>
      <div className={s.lowerGrid}>
      <section id="plans" className={s.plansSection} data-uds="section" aria-labelledby="plans-title"><div className={s.inner}><div className={s.sectionHeadCenter}><h2 id="plans-title" className={s.sectionTitle} data-uds="marketing-title">Start with clarity</h2><p className={s.sectionLead}>Understand access before you begin.</p></div><div className={s.accessCards}>
        <article className={s.accessCard}><span className={s.accessIcon}><Rocket size={27}/></span><div><h3>Free readiness</h3><p>Start before signup.</p><Link href="/gulf-readiness-score" className={s.textLink}>Check my readiness</Link></div></article>
        <article className={s.accessCard}><span className={s.accessIcon}><FileText size={27}/></span><div><h3>Your workspace</h3><p>Create a free Career Profile and use free readiness and job matching tools.</p><Link href="/signup" className={s.textLink}>Create my account</Link></div></article>
        <article className={s.accessCard}><span className={s.accessIcon}><ShieldCheck size={27}/></span><div><h3>Invite professionals. Earn credits.</h3><p>Qualified referrals earn credits for premium resumes, cover letters and interview preparation.</p><Link href="/settings/referrals" className={s.textLink}>Referral &amp; Credits</Link></div></article>
      </div><p className={s.accessNote}>Premium AI services use credits or approved service allowances.</p></div></section>
      <section id="faq" className={s.faqSection} data-uds="section" aria-labelledby="faq-title"><div className={s.inner}><h2 id="faq-title" className={s.sectionTitle} data-uds="marketing-title">Your questions, answered.</h2><div className={s.faqList}>{faq.map(([question,answer],index)=><details key={question} className={s.faqItem} id={index===faq.length-2?'privacy':undefined}><summary>{question}<span className={s.faqPlus} aria-hidden="true">+</span></summary><p>{answer}</p></details>)}</div>
      </div></section>
      </div>
      <section className={s.finalBand} data-uds="final" aria-labelledby="final-title"><Image src="/landing/v2/gulf-skyline.webp" alt="" fill sizes="100vw" /><div className={s.finalContent}><h2 id="final-title" className={s.finalTitle} data-uds="marketing-title">Your experience. Better prepared.</h2><Link href="/gulf-readiness-score" className={s.goldCta} data-uds="button-primary">Check my readiness </Link><small className={s.finalSmall}>Right Gulf Job. Right Time. Right Preparation. Right Answers.<br />Employment is not guaranteed.</small></div></section>
    </main><LandingFooter />
  </div></UniversalTheme>
}
