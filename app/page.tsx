import type { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'
import { ArrowRight, ArrowUpRight, BriefcaseBusiness, Check, ClipboardCheck, FileSearch, FileText, FolderOpen, Globe2, HardHat, Layers, Mail, Mic, PlayCircle, Search, ShieldCheck, Target, UserRound, XCircle } from 'lucide-react'
import { AuthLinkCatcher } from '@/components/auth/AuthLinkCatcher'
import { LandingV2Nav } from '@/components/landing-v3/LandingV2Nav'
import { LandingFooter } from '@/components/landing-v3/LandingFooter'
import { DocumentOrbit, GccGlobe } from '@/components/landing-v3/lazy'
import { gccDestinations } from '@/components/landing-premium/gccDestinations'
import s from '@/components/landing-v3/landing-v2.module.css'

const TITLE = 'Gulf Career Preparation & Interview Coaching | GCC MENTOR'
const DESCRIPTION =
  'One profile for job-specific resumes, cover letters and voice interview practice. Prepare for Gulf opportunities. Start with your free GCC readiness assessment.'

export const metadata: Metadata = {
  title: { absolute: TITLE },
  description: DESCRIPTION,
  alternates: { canonical: '/' },
  openGraph: { title: TITLE, description: DESCRIPTION, url: '/' },
  twitter: { title: TITLE, description: DESCRIPTION },
}


const services = [
  ['Career Profile', 'One profile. Clear Gulf Profile Readiness.', '/profile', UserRound],
  ['ATS Job Match', 'Understand your fit for a specific role.', '/optimize/target', FileSearch],
  ['Optimize Resume', 'Present the right experience for each job.', '/optimize/target', FileText],
  ['Cover Letter', 'Make your relevance clear to the employer.', '/cover-letter', Mail],
  ['Interview Studio', 'Practise answers. Review useful feedback.', '/mock-interview', Mic],
  ['Resume Library', 'Keep every application ready to revisit.', '/dashboard/library', Layers],
] as const
const journey = [
  ['Bring a Job Description', 'Paste requirements from any job website.', BriefcaseBusiness],
  ['Analyze Requirements', 'Review ATS relevance, matching experience and gaps.', Search],
  ['Prepare Application', 'Optimize your resume and prepare a tailored cover letter.', FileText],
  ['Practice Interviews', 'Prepare technical, behavioral and HR answers.', Mic],
] as const
const benefits = ['Present genuine experience clearly', 'Prepare job-specific applications', 'Understand job requirements', 'Focus your interview practice', 'Reuse your career information']
const employers = ['Saudi Aramco', 'ADNOC', 'SABIC', 'PETRONAS', 'Technip Energies', 'Hyundai Engineering', 'Bechtel']

function StartLink() { return <Link href="/signup" className={s.primary}>Get Started Free <ArrowRight size={18} aria-hidden="true" /></Link> }
function Countries() { return <ul className={s.countries} aria-label="Six GCC countries">{gccDestinations.map(country => <li key={country.country}><Image src={country.src} width={28} height={21} unoptimized alt="" aria-hidden="true" /><span>{country.country === 'United Arab Emirates' ? 'UAE' : country.country}</span></li>)}</ul> }

export default function Home() {
  return <div className={s.page} data-marketing="white">
    <LandingV2Nav /><AuthLinkCatcher />
    <main id="main-content" tabIndex={-1}>
      <section className={s.hero} aria-labelledby="hero-title">
        <div className={s.heroInner}>
          <div className={s.heroCopy}>
            <span className={s.eyebrow}><HardHat size={16} aria-hidden="true" /> Built for Technical Professionals</span>
            <h1 id="hero-title">One Profile. Multiple <span>Gulf Opportunities.</span></h1>
            <p className={s.heroHeadline}>Right Gulf Job. Right Time. Right Preparation. Right Answers.</p>
            <p className={s.heroDescription}>Turn a job description into a focused resume, tailored cover letter and interview preparation — built from your real experience.</p>
            <div className={s.heroActions}><StartLink /><a href="#how-it-works" className={s.secondary}><PlayCircle size={20} aria-hidden="true" /> See How It Works</a></div>
            <ul className={s.trust}>{[[Target, 'Job-specific resumes'], [ShieldCheck, 'ATS preparation'], [Mic, 'Interview practice'], [Globe2, 'Gulf-focused']].map(([Icon, label]) => { const I = Icon as typeof Target; return <li key={String(label)}><I size={20} aria-hidden="true" /><span>{String(label)}</span></li> })}</ul>
          </div>
          <div className={s.heroMedia}><Image src="/landing/gulf-technical-hero.webp" alt="Illustrative engineer wearing safety equipment at an industrial refinery" fill priority sizes="(max-width: 767px) 100vw, 55vw" className={s.heroImage} /><div className={s.heroCountries}><Countries /></div></div>
        </div>
      </section>

      <section id="industries" className={s.industry} aria-labelledby="industries-title"><div className={s.wrap}><div className={s.employerStrip}><h2 id="industries-title">Gulf industry references</h2><ul>{employers.map(name => <li key={name}>{name}</li>)}</ul></div><p className={s.note}>Oil & Gas · Petrochemicals · EPC · Power · Industrial automation. Organization names are industry references only; no affiliation or endorsement is implied.</p></div></section>

      <div className={s.wrap}>
        <section id="challenges" className={s.problemSolution} aria-label="Application challenges and preparation"><div className={s.problem}><UserRound size={34} aria-hidden="true" /><div><h2>Not Getting Shortlisted?</h2><p>Strong experience can be hard to see in a weak application.</p><ul>{['Generic resumes', 'Missing relevant keywords', 'Unclear technical responsibilities', 'Poor job-description alignment', 'Weak application presentation', 'Inadequate interview preparation'].map(text => <li key={text}><XCircle size={14} aria-hidden="true" />{text}</li>)}</ul></div></div><ArrowRight className={s.bridge} aria-hidden="true" /><div className={s.solution}><Target size={40} aria-hidden="true" /><div><h2>Let’s Fix It.</h2><p>Present your genuine experience clearly. Prepare a focused application and practise explaining your strengths.</p></div></div></section>

        <section id="services" className={s.section} aria-labelledby="services-title"><div className={s.sectionHeading}><h2 id="services-title">Our Career Preparation Services</h2><p>From your Career Profile to your next interview.</p></div><ul className={s.services}>{services.map(([name, description, href, Icon]) => <li key={name}><Link href={href} aria-label={name === 'Optimize Resume' ? 'Optimize Resume for a New Job' : name}><span className={s.icon}><Icon size={27} aria-hidden="true" /></span><h3>{name}</h3><p>{description}</p><ArrowRight size={16} className={s.cardArrow} aria-hidden="true" /></Link></li>)}</ul><div className={s.moreServices}><Link href="/interview-qa">Interview Q&A <ArrowUpRight size={14} aria-hidden="true" /></Link><Link href="/linkedin-optimization">LinkedIn Optimization <ArrowUpRight size={14} aria-hidden="true" /></Link><Link href="/naukrigulf-optimization">NaukriGulf Optimization <ArrowUpRight size={14} aria-hidden="true" /></Link><Link href="/tools">Explore Free Tools <ArrowUpRight size={14} aria-hidden="true" /></Link></div></section>

        <section id="how-it-works" className={s.section} aria-labelledby="journey-title"><div className={s.sectionHeading}><h2 id="journey-title">How It Works</h2><p>From job requirements to interview readiness</p></div><ol className={s.journey}>{journey.map(([title, description, Icon], index) => <li key={title}><span className={s.icon}><Icon size={27} aria-hidden="true" /></span><div><span className={s.step}>Step {index + 1}</span><h3>{title}</h3><p>{description}</p></div></li>)}</ol><p className={s.note}>Create your Career Profile once. Bring a job description from LinkedIn, NaukriGulf, Indeed or a company website. Apply on the original website yourself.</p></section>

        <div className={s.visualGrid}><section id="templates" className={`${s.section} ${s.showcase}`} aria-labelledby="templates-title"><div className={s.showcaseHeading}><span className={s.icon}><FileText size={28} aria-hidden="true" /></span><div><h2 id="templates-title">Professional Resume Templates</h2><p>Real resume designs. Your experience, clearly presented.</p></div><Link href="/templates" className={s.textLink}>Explore designs <ArrowRight size={16} aria-hidden="true" /></Link></div><DocumentOrbit /><ul className={s.templateBenefits}><li><Check size={16} aria-hidden="true" /> Real template previews</li><li><FolderOpen size={16} aria-hidden="true" /> Multiple designs</li><li><ShieldCheck size={16} aria-hidden="true" /> Your experience, clearly presented</li></ul></section>

        <section id="markets" className={`${s.section} ${s.market}`} aria-labelledby="gulf-title"><div className={s.sectionHeading}><h2 id="gulf-title">Your Career Across the Gulf</h2><p>Prepare for opportunities across all six GCC countries.</p></div><GccGlobe compact presentation="showcase" /></section></div>

        <section id="about" className={`${s.section} ${s.founder}`} aria-labelledby="about-title"><div className={s.founderPortrait}><Image src="/landing/gulf-refinery-footer.webp" alt="Industrial refinery at night" fill sizes="(max-width: 767px) 100vw, 25vw" /><div><span aria-hidden="true">SKJ</span><strong>Satish Kumar Jaiswal</strong><small>Founder, GCC Mentor</small></div></div><div className={s.founderCopy}><span className={s.eyebrow}><UserRound size={15} aria-hidden="true" /> Meet the Founder</span><h2 id="about-title">Built by a Gulf Engineering Professional. For Technical Professionals.</h2><p>I’m <strong>Satish Kumar Jaiswal</strong>, an Instrumentation & Control professional with 15+ years across EPC, commissioning, Oil & Gas and petrochemical projects in the Middle East and Asia.</p><p>I built GCC Mentor to help technical professionals explain their real experience, prepare for specific job requirements and walk into interviews better prepared.</p><a href="https://sa.linkedin.com/in/jaissatish" target="_blank" rel="noopener noreferrer" className={s.secondary}>Verify My Background on LinkedIn <ArrowUpRight size={16} aria-hidden="true" /></a></div><aside className={s.founderFacts} aria-label="Founder experience"><div><BriefcaseBusiness aria-hidden="true" /><p><strong>15+ Years</strong><span>Gulf & international industrial experience</span></p></div><div><HardHat aria-hidden="true" /><p><strong>I&C | Commissioning | EPC</strong><span>Oil & Gas · Refinery · Petrochemical</span></p></div><div><ClipboardCheck aria-hidden="true" /><p><strong>Project exposure</strong><span>NEOM Green Hydrogen (KSA), ADNOC-related projects and NSRP Vietnam</span></p></div><small>Experience references do not imply project or employer endorsement.</small></aside></section>

        <section className={`${s.section} ${s.benefits}`} aria-labelledby="benefits-title"><h2 id="benefits-title">Key Benefits<br />for You</h2><ul>{benefits.map(text => <li key={text}><Check size={20} aria-hidden="true" />{text}</li>)}</ul></section>

        <section id="pricing" className={`${s.section} ${s.access}`} aria-labelledby="access-title"><div><h2 id="access-title">Start Free. Prepare at Your Pace.</h2><p>Start with a free account. See your available services and usage limits before you prepare.</p></div><div><StartLink /><p className={s.note}>Paid card checkout is not currently enabled.</p></div></section>
        <section id="faq" className={`${s.section} ${s.faq}`} aria-labelledby="faq-title"><h2 id="faq-title">A Few Things to Know</h2><details><summary>Does GCC Mentor find jobs or apply for me?</summary><p>You find the opportunity on your preferred job website. GCC Mentor helps you prepare your profile, resume, cover letter and interview answers. You review and submit your application yourself.</p></details><details><summary>Will this guarantee a job or an ATS pass?</summary><p>No. Scores and guidance support preparation. Employers decide whom to shortlist and hire, and ATS systems vary.</p></details><details><summary>Is my experience kept truthful?</summary><p>Preparation uses your Career Profile. Review all generated content and include only skills, experience and qualifications you can support.</p></details></section>
      </div>
      <section className={s.final} aria-labelledby="final-title"><div className={s.wrap}><h2 id="final-title">Get Ready for Your Next Gulf Opportunity</h2><p>Create your profile, prepare your application and practice interviews — all in one platform.</p><StartLink /></div></section>
    </main><LandingFooter />
  </div>
}
