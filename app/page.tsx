import type { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'
import { ArrowRight, ArrowUpRight, BookOpen, Check, ChevronRight, ClipboardCheck, FileText, FolderOpen, Headphones, Mail, Mic, ShieldCheck, Target, UserRound, Waves, Building2, Factory, HardHat, Droplets, BriefcaseBusiness, Rocket } from 'lucide-react'
import { AuthLinkCatcher } from '@/components/auth/AuthLinkCatcher'
import { PremiumNav } from '@/components/landing-v3/PremiumNav'
import { LandingFooter } from '@/components/landing-v3/LandingFooter'
import { DocumentOrbit, GccGlobe } from '@/components/landing-v3/lazy'
import { InterviewDemo } from '@/components/landing-v3/InterviewDemo'
import { services } from '@/components/landing-premium/data'
import { UniversalTheme } from '@/components/design-system/UniversalTheme'
import s from '@/components/landing-v3/premium.module.css'

const TITLE = 'Gulf Career Preparation & Interview Coaching | GCC MENTOR'
const DESCRIPTION = 'One profile for job-specific resumes, cover letters and interview practice. Prepare for Gulf opportunities using your real experience.'
export const metadata: Metadata = { title: { absolute: TITLE }, description: DESCRIPTION, alternates: { canonical: '/' }, openGraph: { title: TITLE, description: DESCRIPTION, url: '/' }, twitter: { title: TITLE, description: DESCRIPTION } }
const anchors = [['Preparation', '#services'], ['Templates', '#templates'], ['Interview', '#interview'], ['Plans', '#plans'], ['About & access', '#about'], ['FAQ', '#faq']] as const
const COUNTRIES = [['sa','Saudi Arabia'],['ae','UAE'],['qa','Qatar'],['om','Oman'],['kw','Kuwait'],['bh','Bahrain']] as const
const journey = [
  { title: 'Career Profile', text: 'Your experience, skills and goals', Icon: UserRound, href: '/profile' },
  { title: 'Job Package', text: 'Resume, cover letter and ATS analysis', Icon: FileText, href: '/optimize/target' },
  { title: 'Interview Preparation', text: 'Practise and improve your answers', Icon: Mic, href: '/interview-qa' },
]
const highlights = [
  { title: 'ATS analysis', text: 'Compare your resume with a job description', Icon: ClipboardCheck, href: '/optimize/target' },
  { title: 'Resume optimization', text: 'Present your real experience for the role', Icon: FileText, href: '/optimize/target' },
  { title: 'Cover letter', text: 'Introduce your relevance to the job', Icon: Mail, href: '/cover-letter' },
  { title: 'Interview preparation', text: 'Practise role-specific answers', Icon: Headphones, href: '/interview-qa' },
]
const industries = [ ['Oil & Gas',Droplets],['Construction',HardHat],['Engineering',Factory],['Operations',Waves],['Projects',Building2],['Corporate',BriefcaseBusiness] ] as const
const icons = { readiness: Target, match: ClipboardCheck, cv: FileText, letter: Mail, qa: BookOpen, interview: Mic, templates: FileText, reports: FolderOpen }
const CHALLENGES = ['Applying everywhere. No interview calls.', 'One generic CV for every job.', 'Unsure if my CV matches the role.', 'Good openings. Late applications.', 'My Gulf profile gets overlooked.', 'Interview nerves take over.', 'No clear preparation plan.']
const faq = [
  ['Is GCC Mentor suitable for non-engineering professionals?', 'Yes. Preparation follows your own profile and job description. Examples include engineering, QA/QC, HSE, construction, IT, healthcare, finance, logistics and administration.'],
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
          <h1 id="hero-title" className={s.heroTitle} data-uds="hero-title"><span className={s.mobileHeadline}>Your complete<br />career partner<br /><em>for the Gulf</em></span><span className={s.desktopHeadline}>Build a Gulf-ready<br />career with<br /><em>GCC MENTOR</em></span></h1>
          <p className={s.heroSub}>One Career Profile for your resume, applications and interview practice. Built around your real experience.</p>
          <div className={s.heroCtas}><Link href="/gulf-readiness-score" className={s.goldCta} data-uds="button-primary">Check my readiness <ArrowRight size={19} aria-hidden="true" /></Link><Link href="/templates" className={s.ghostCta} data-uds="button-secondary">Explore templates <ArrowRight size={19} aria-hidden="true" /></Link></div>
          <p className={s.freeNote} data-uds="helper"><Check size={15} aria-hidden="true" />See your score before signup.</p>
        </div></div>
      </section>
      <section className={s.countryBand} aria-label="GCC career destinations"><div className={s.inner}><ul className={s.countryGrid}>{COUNTRIES.map(([code,name])=><li key={code} className={s.countryCard}><Image src={`/landing/v2/flags/${code}.svg`} width={36} height={26} alt="" /><span className={s.countryName}>{name}</span></li>)}</ul></div></section>
      <section id="how-it-works" className={s.journeySection} data-uds="section" aria-labelledby="journey-title"><div className={s.inner}>
        <div className={s.sectionHeadCenter}><span className={s.kickerGold} data-uds="kicker">The GCC Mentor journey</span><h2 id="journey-title" className={s.sectionTitle} data-uds="marketing-title"><span className={s.mobileHeadline}>Your Gulf career journey</span><span className={s.desktopHeadline}>From your profile to a Gulf career</span></h2><p className={s.sectionLead}>A simple, guided journey to prepare for your next opportunity.</p></div>
        <ol className={s.journeyGrid}>{journey.map(({title,text,Icon,href},i)=><li key={title}><Link href={href} className={s.journeyCard}><span className={s.journeyIcon}><Icon size={28} aria-hidden="true" /></span><div><h3>{title}</h3><p>{text}</p></div><ChevronRight className={s.journeyArrow} size={20} aria-hidden="true" /></Link>{i<2&&<span className={s.journeyConnector} aria-hidden="true"><ArrowRight size={22}/></span>}</li>)}</ol>
      </div></section>
      <section id="services" className={s.servicesSection} data-uds="soft-section" aria-labelledby="services-title"><div className={s.inner}>
        <h2 id="services-title" className={s.sectionTitle} data-uds="marketing-title">Everything for your next application</h2>
        <div className={s.highlightGrid}>{highlights.map(({title,text,Icon,href})=><Link key={title} href={href} className={s.featureCard} data-uds="card"><span className={s.featureIcon} data-uds="icon"><Icon size={27} aria-hidden="true" /></span><div><h3>{title}</h3><p>{text}</p></div><ArrowRight className={s.featureArrow} size={21} aria-hidden="true" /></Link>)}</div>
        <details className={s.moreServices}><summary>Explore all preparation services <ChevronRight size={17} aria-hidden="true" /></summary><ul className={s.serviceLinks}>{services.map(([name,description,href,key])=>{const Icon=icons[key as keyof typeof icons];return <li key={name}><Link href={href}><Icon size={18} aria-hidden="true" /><span><strong>{name}</strong><small>{description}</small></span><ArrowUpRight size={16} aria-hidden="true"/></Link></li>})}</ul></details>
      </div></section>
      <section id="templates" className={s.resumeSection} data-uds="section" aria-labelledby="templates-title"><div className={s.resumeInner}>
        <div className={s.resumeCopy}><span className={s.kickerGold} data-uds="kicker">Your resume, your style</span><h2 id="templates-title" className={s.resumeTitle} data-uds="marketing-title">Your experience,<br /><em>well presented</em></h2><p>Professional resume designs built around your Career Profile.</p><ul className={s.resumeBenefits}><li><Check size={17}/>ATS-friendly layouts</li><li><Check size={17}/>Your verified experience</li><li><Check size={17}/>Photo and no-photo options</li></ul><Link href="/templates" className={s.resumeCta} data-uds="button-secondary">Explore all templates <ArrowRight size={18} aria-hidden="true" /></Link></div>
        <div className={s.heroVisual} data-uds="visual"><div className={s.visualLabel}><strong>Real resume templates</strong><span>Illustrative example</span></div><DocumentOrbit /><div className={s.visualFoot}><Link href="/templates">Find your resume style <ArrowRight size={16} aria-hidden="true" /></Link></div></div>
      </div></section>
      <section id="interview" className={s.interviewSection} data-uds="soft-section" aria-labelledby="interview-title"><div className={s.inner}>
        <div className={s.interviewHeading}><div><span className={s.kickerGold} data-uds="kicker">Sample demonstration</span><h2 id="interview-title" className={s.sectionTitle} data-uds="marketing-title">Practise your<br /><em>Gulf interview</em></h2></div><p className={s.sectionLead}>Role-based questions. Feedback you can learn from. Practise your own experience, then review what to improve.</p></div>
        <div className={s.demoBoundary} data-uds="website-widget"><InterviewDemo /></div>
      </div></section>
      <section id="industries" className={s.industriesSection} aria-labelledby="industries-title"><div className={s.inner}><h2 id="industries-title" className={s.sectionTitle} data-uds="marketing-title">Built for key Gulf industries</h2><p className={s.sectionLead}>Career preparation for technical, operational and professional roles.</p><ul className={s.industryGrid}>{industries.map(([name,Icon],i)=><li key={name} className={s.industryTile}><span className={s.industryPhoto} data-industry={i} role="img" aria-label={`${name} illustrative scene`} /><span className={s.industryLabel}><Icon size={19} aria-hidden="true" />{name}</span></li>)}</ul></div></section>
      <section id="markets" className={s.marketsSection} data-uds="section" aria-label="Explore the six Gulf markets"><div className={s.inner}><div className={s.sectionHeadCenter}><h2 className={s.sectionTitle} data-uds="marketing-title">Six Gulf markets.<br /><em>One preparation journey.</em></h2><p className={s.sectionLead}>Explore your next destination with the interactive GCC globe.</p></div><div className={s.globeBoundary} data-uds="website-widget"><GccGlobe compact /></div></div></section>
      <section id="about" className={s.founderSection} data-uds="section" aria-labelledby="about-title"><div className={s.inner}><div className={s.founderPanel}>
        <div className={s.founderScene}><Image src="/landing/v2/gulf-skyline.webp" alt="Illustrative Gulf skyline at sunset" fill sizes="(min-width:960px) 600px, 100vw" /></div>
        <div className={s.founderColumn}><h2 id="about-title" className={s.sectionTitle} data-uds="marketing-title">Built from Gulf<br />project experience</h2><div className={s.founderBox}><Image className={s.founderPortrait} src="/landing/v2/founder-satish.webp" alt="Satish Kumar Jaiswal, founder of GCC Mentor" width={88} height={88} /><div><h3>Satish Kumar Jaiswal</h3><span className={s.founderRole}>Founder, GCC Mentor</span></div></div><p>Approximately 15 years in instrumentation, commissioning and Gulf EPC projects.</p><a href="https://www.linkedin.com/in/jaissatish/" target="_blank" rel="noopener noreferrer" className={s.founderLink} data-uds="text-link">Connect on LinkedIn <ArrowUpRight size={16} aria-hidden="true" /></a></div>
      </div></div></section>
      <section id="plans" className={s.plansSection} data-uds="section" aria-labelledby="plans-title"><div className={s.inner}><div className={s.sectionHeadCenter}><h2 id="plans-title" className={s.sectionTitle} data-uds="marketing-title">Plans &amp; access</h2><p className={s.sectionLead}>Choose the preparation for your next step.</p></div><div className={s.accessCards}>
        <article className={s.accessCard}><span className={s.accessIcon}><Rocket size={27}/></span><div><h3>Free readiness</h3><p>Understand your preparation gaps.</p><Link href="/gulf-readiness-score" className={s.textLink}>Check my free readiness <ArrowRight size={16}/></Link></div></article>
        <article className={s.accessCard}><span className={s.accessIcon}><FileText size={27}/></span><div><h3>Career preparation</h3><p>Prepare your resume and cover letter.</p><Link href="/signup" className={s.textLink}>Create my account <ArrowRight size={16}/></Link></div></article>
        <article className={s.accessCard}><span className={s.accessIcon}><ShieldCheck size={27}/></span><div><h3>Your available services</h3><p>View your tools or redeem an access code.</p><Link href="/settings" className={s.textLink}>See my available services <ArrowRight size={16}/></Link></div></article>
      </div><div className={s.centerAction}><Link href="/settings" className={s.goldCta}>View available services <ArrowRight size={18}/></Link></div></div></section>
      <section id="faq" className={s.faqSection} data-uds="section" aria-labelledby="faq-title"><div className={s.inner}><h2 id="faq-title" className={s.sectionTitle} data-uds="marketing-title">Your questions, answered.</h2><div className={s.faqList}>{faq.map(([question,answer],index)=><details key={question} className={s.faqItem} id={index===faq.length-2?'privacy':undefined}><summary>{question}<span className={s.faqPlus} aria-hidden="true">+</span></summary><p>{answer}</p></details>)}</div>
        <details id="challenges" className={s.challengeDisclosure}><summary>Not getting shortlisted?</summary><ul>{CHALLENGES.map(text=><li key={text}>{text}</li>)}</ul><Link href="#how-it-works" className={s.textLink}>How it works <ArrowRight size={16}/></Link></details>
      </div></section>
      <section className={s.finalBand} data-uds="final" aria-labelledby="final-title"><Image src="/landing/v2/gulf-skyline.webp" alt="" fill sizes="100vw" /><div className={s.finalContent}><h2 id="final-title" className={s.finalTitle} data-uds="marketing-title">Prepare for your next<br /><em>Gulf opportunity.</em></h2><Link href="/gulf-readiness-score" className={s.goldCta} data-uds="button-primary">Check my readiness <ArrowRight size={19} aria-hidden="true" /></Link><small className={s.finalSmall}>Your real experience. Guided preparation.<br />Employment is not guaranteed.</small></div></section>
    </main><LandingFooter />
  </div></UniversalTheme>
}
