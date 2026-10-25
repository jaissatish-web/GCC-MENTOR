import type { Metadata } from 'next'
import Link from 'next/link'
import { ArrowRight, ArrowUpRight, BookOpen, Check, ClipboardCheck, FileText, FolderOpen, Mail, Mic, ShieldCheck, Target } from 'lucide-react'
import { AuthLinkCatcher } from '@/components/auth/AuthLinkCatcher'
import { PremiumNav } from '@/components/landing-v3/PremiumNav'
import { LandingFooter } from '@/components/landing-v3/LandingFooter'
import { DocumentOrbit, GccGlobe } from '@/components/landing-v3/lazy'
import { InterviewDemo } from '@/components/landing-v3/InterviewDemo'
import { services } from '@/components/landing-premium/data'
import s from '@/components/landing-v3/premium.module.css'

/** White editorial landing: presentation-only, preserving service destinations,
 * native disclosures, actual resume previews and the interactive GCC globe. */
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

const anchors = [['Preparation', '#services'], ['Templates', '#templates'], ['Interview', '#interview'], ['About & access', '#about']] as const

/** Six professions row — engineering/healthcare/IT are backed by PERSONAS and
 *  PROFESSION_EXAMPLES; trades, teaching and logistics extend the row visually
 *  so the page never reads “engineers only”. */
const PROFESSIONS = [
  { icon: '👷', label: 'Engineering' },
  { icon: '🩺', label: 'Healthcare' },
  { icon: '💻', label: 'IT & Finance' },
  { icon: '🧰', label: 'Trades' },
  { icon: '🧑‍🏫', label: 'Teaching' },
  { icon: '🚚', label: 'Logistics' },
] as const

const COUNTRIES = [
  { flag: '🇸🇦', name: 'Saudi Arabia', reason: 'Largest expat volume' },
  { flag: '🇦🇪', name: 'UAE', reason: 'Fastest growing' },
  { flag: '🇶🇦', name: 'Qatar', reason: 'Energy & infra' },
  { flag: '🇴🇲', name: 'Oman', reason: 'Oil & gas' },
  { flag: '🇰🇼', name: 'Kuwait', reason: 'Oil services' },
  { flag: '🇧🇭', name: 'Bahrain', reason: 'Finance hub' },
] as const

/** Gulf job-seeker pain points — the #challenges disclosure the landing
 *  contract (verify-mobile-layout) requires; plain language for every
 *  profession, blue-collar included. */
const CHALLENGES = [
  'Applying everywhere. No interview calls.',
  'One generic CV for every job.',
  'Unsure if my CV matches the role.',
  'Good openings. Late applications.',
  'My Gulf profile gets overlooked.',
  'Interview nerves take over.',
  'No clear preparation plan.',
] as const

/** The three-step journey — the #how-it-works disclosure content. */
const HOW_IT_WORKS = [
  ['Build your Career Profile', 'One place holds your real experience, your skills and your Gulf readiness — nothing invented.'],
  ['Prepare for an opening', 'Get a job-specific resume, a tailored cover letter and ATS feedback from the same profile.'],
  ['Practise until ready', 'Answer interview questions in your own words, see what to improve, and walk in prepared.'],
] as const

const STATS = [
  ['6', 'Gulf markets covered'],
  ['50+', 'ATS resume templates'],
  ['1', 'Career Profile'],
] as const

const icons = { readiness: Target, match: ClipboardCheck, cv: FileText, letter: Mail, qa: BookOpen, interview: Mic, templates: FileText, reports: FolderOpen }

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
  return (
    <div className={`${s.system} font-redesign-sans`} data-marketing="white">
      <PremiumNav anchors={anchors} />
      <AuthLinkCatcher />
      <main id="main-content" tabIndex={-1}>
        {/* One primary action, a real resume visual and concise product context. */}
        <section className={s.heroNavy} aria-labelledby="hero-title">
          <div className={s.heroInner}>
            <div className={s.heroCopy}>
            <span className={s.kickerGold}>Your Gulf career preparation partner</span>
            <h1 id="hero-title" className={s.heroTitle}>Your next Gulf opportunity. <span>Better prepared.</span></h1>
            <p className={s.heroSub}>One profile for your resume, applications and interview practice. Built around your real experience.</p>
            <div className={s.heroCtas}>
              <Link href="/gulf-readiness-score" className={s.goldCta}>Check my readiness <ArrowRight size={18} aria-hidden="true" /></Link>
              <Link href="/templates" className={s.ghostCta}>Explore templates <ArrowUpRight size={16} aria-hidden="true" /></Link>
            </div>
            <p className={s.freeNote}><Check size={15} aria-hidden="true" />See your score before signup.</p>
            <ul className={s.profRow} aria-label="Professions GCC Mentor prepares for">
              {PROFESSIONS.map(profession => (
                <li key={profession.label} className={s.profItem}>
                  <span className={s.profPic} aria-hidden="true">{profession.icon}</span>
                  <span>{profession.label}</span>
                </li>
              ))}
            </ul>
            <dl className={s.statRow}>
              {STATS.map(([value, label]) => (
                <div key={label} className={s.statItem}>
                  <dt><b>{value}</b></dt>
                  <dd>{label}</dd>
                </div>
              ))}
            </dl>
            </div>
            <div className={s.heroVisual}>
              <div className={s.visualLabel}><strong>Your experience, well presented</strong><span>Real templates</span></div>
              <DocumentOrbit />
              <div className={s.visualFoot}><Link href="/templates">Find your resume style <ArrowRight size={16} aria-hidden="true" /></Link></div>
            </div>
          </div>
        </section>

        {/* ── Country picks · six GCC cards with a reason + hover lift ── */}
        <section aria-label="GCC career destinations" className={s.countryBand}>
          <div className={s.inner}>
            <div className={s.sectionHead}>
              <span className={s.kickerGold}>Prepared for all six Gulf markets</span>
            </div>
            <ul className={s.countryGrid}>
              {COUNTRIES.map(country => (
                <li key={country.name} className={s.countryCard}>
                  <span className={s.countryFlag} aria-hidden="true">{country.flag}</span>
                  <b className={s.countryName}>{country.name}</b>
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section id="challenges" className={s.challenges} aria-labelledby="challenges-title">
          <div className={s.inner}>
            <details className={s.faqItem}>
              <summary><span id="challenges-title">Not getting shortlisted?</span><span className={s.faqPlus} aria-hidden="true">+</span></summary>
              <ul className={s.challengeList}>{CHALLENGES.map(challenge => <li key={challenge}><span aria-hidden="true">!</span>{challenge}</li>)}</ul>
            </details>
            <details id="how-it-works" className={s.faqItem}>
              <summary><span>How it works</span><span className={s.faqPlus} aria-hidden="true">+</span></summary>
              <div className={s.journeyGrid}>{HOW_IT_WORKS.map(([step, detail], index) => <article key={step}><span>{index + 1}</span><h3>{step}</h3><p>{detail}</p></article>)}</div>
            </details>
          </div>
        </section>

        {/* ── Preparation services ── */}
        <section id="services" className={`${s.section} ${s.softSection}`} aria-labelledby="services-title">
          <div className={s.inner}>
            <div className={s.sectionHead}>
              <span className={s.kickerGold}>What you get</span>
              <h2 id="services-title" className={s.sectionTitle}>All the tools for <span>your next move</span></h2>
              <p className={s.sectionLead}>Choose the preparation you need for your next application.</p>
            </div>
            <ul className={s.featureGrid}>
              {services.map(([name, description, href, key]) => {
                const Icon = icons[key as keyof typeof icons]
                return (
                  <li key={name}>
                    <Link href={href} className={s.featureCard}>
                      <span className={s.featureIcon}><Icon size={21} aria-hidden="true" /></span>
                      <h3>{name}</h3>
                      <p>{description}</p>
                      <ArrowRight size={15} className={s.featureArrow} aria-hidden="true" />
                    </Link>
                  </li>
                )
              })}
            </ul>
          </div>
        </section>

        {/* ── Templates ── */}
        <section id="templates" className={s.section} aria-labelledby="templates-title">
          <div className={`${s.inner} ${s.splitSection}`}>
            <div className={s.sectionHead}>
              <span className={s.kickerGold}>Your resume, your style</span>
              <h2 id="templates-title" className={s.sectionTitle}>A resume that <span>represents you.</span></h2>
              <p className={s.sectionLead}>Explore 50+ designs using the same Career Profile.</p>
              <Link href="/templates" className={s.textLink}>Explore all templates <ArrowRight size={16} aria-hidden="true" /></Link>
            </div>
            <div className={s.templateChoices}>
              {[['ATS layouts', 'Clear structure for online applications.'], ['Professional designs', 'A polished presentation of your experience.'], ['Photo options', 'Choose a design that suits your application.']].map(([title, detail]) => <Link href="/templates" className={s.templateChoice} key={title}><FileText size={28} aria-hidden="true" /><div><strong>{title}</strong><span>{detail}</span></div><span aria-hidden="true">→</span></Link>)}
            </div>
          </div>
        </section>

        {/* ── Interview practice ── */}
        <section id="interview" className={`${s.section} ${s.softSection}`} aria-labelledby="interview-title">
          <div className={`${s.inner} ${s.splitSection}`}>
            <div className={s.sectionHead}>
              <span className={s.kickerGold}>Practise with purpose</span>
              <h2 id="interview-title" className={s.sectionTitle}>Practise your interview. <span>Know what to improve.</span></h2>
              <p className={s.sectionLead}>Practise relevant questions. See what worked and what to improve.</p>
            </div>
            <InterviewDemo />
          </div>
        </section>

        {/* ── GCC markets globe ── */}
        <section id="markets" className={s.section} aria-label="Explore the six Gulf markets">
          <div className={s.inner}>
            <div className={`${s.sectionHead} ${s.sectionHeadCenter}`}>
              <span className={s.kickerGold}>Explore your next destination</span>
            </div>
            <GccGlobe compact />
          </div>
        </section>

        {/* ── About & access · navy band ── */}
        <section id="about" className={s.section} aria-labelledby="about-title">
          <div className={`${s.inner} ${s.navyBand}`}>
            <div className={s.founderGrid}>
              <div className={s.founderColumn}>
                <span className={s.kickerGold}>Built from practical industry experience</span>
                <h2 id="about-title" className={s.navyTitle}>Gulf experience. <br />A practical preparation approach.</h2>
                <p className={s.navyLead}>A practical approach to presenting your experience and preparing for Gulf opportunities.</p>
                <div className={s.founderBox}>
                  <span className={s.monogram} aria-hidden="true">SKJ</span>
                  <div>
                    <h3>Satish Kumar Jaiswal</h3>
                    <span className={s.founderRole}>Founder, GCC Mentor</span>
                    <p>Approximately 15 years in instrumentation, commissioning and Gulf EPC projects.</p>
                    <a href="https://www.linkedin.com/in/jaissatish/" target="_blank" rel="noopener noreferrer" className={s.founderLink}>Connect on LinkedIn <ArrowUpRight size={15} aria-hidden="true" /></a>
                  </div>
                </div>
              </div>
              <div className={s.accessCards}>
                <article className={s.accessCard}>
                  <span className={s.accessIcon}><Target size={19} aria-hidden="true" /></span>
                  <div>
                    <span className={s.accessTag}>Before signup</span>
                    <h3>Free GCC Readiness</h3>
                    <p>Understand your preparation gaps.</p>
                    <Link href="/gulf-readiness-score" className={s.btnNavyOutline}>Check my free readiness <ArrowRight size={14} aria-hidden="true" /></Link>
                  </div>
                </article>
                <article className={s.accessCard}>
                  <span className={s.accessIcon}><FileText size={19} aria-hidden="true" /></span>
                  <div>
                    <span className={s.accessTag}>With an account</span>
                    <h3>Career Preparation</h3>
                    <p>Prepare your applications and practise interviews.</p>
                    <Link href="/signup" className={s.btnNavyOutline}>Create my account <ArrowRight size={14} aria-hidden="true" /></Link>
                  </div>
                </article>
                <article className={s.accessCard}>
                  <span className={s.accessIcon}><ShieldCheck size={19} aria-hidden="true" /></span>
                  <div>
                    <span className={s.accessTag}>Your service access</span>
                    <h3>Your Available Services</h3>
                    <p>View your available tools or redeem an access code.</p>
                    <Link href="/settings" className={s.textLink}>See my available services <ArrowRight size={14} aria-hidden="true" /></Link>
                  </div>
                </article>
              </div>
            </div>
          </div>
        </section>

        {/* ── FAQ ── */}
        <section id="faq" className={s.section} aria-labelledby="faq-title">
          <div className={s.inner}>
            <div className={s.sectionHead}>
              <span className={s.kickerGold}>Know what to expect</span>
              <h2 id="faq-title" className={s.sectionTitle}>Your questions, <span>answered.</span></h2>
            </div>
            <div className={s.faqList}>
              {faq.map(([question, answer], index) => (
                <details key={question} className={s.faqItem} id={index === faq.length - 2 ? 'privacy' : undefined}>
                  <summary>{question}<span className={s.faqPlus} aria-hidden="true">+</span></summary>
                  <p>{answer}</p>
                </details>
              ))}
            </div>
          </div>
        </section>

        {/* ── Final · white-on-navy reprise of the single action ── */}
        <section className={s.finalBand} aria-labelledby="final-title">
          <div className={s.inner}>
            <span className={s.kickerGold}>Your next Gulf chapter</span>
            <h2 id="final-title" className={s.finalTitle}>Start preparing for your next <br />Gulf opportunity today.</h2>
            <p className={s.finalLead}>Start with your free readiness check. Build from there.</p>
            <Link href="/gulf-readiness-score" className={s.whiteCta}>Check my readiness <ArrowRight size={18} aria-hidden="true" /></Link>
            <small className={s.finalSmall}>Your real experience · Guided preparation · Employment is not guaranteed</small>
          </div>
        </section>
      </main>
      <LandingFooter />
    </div>
  )
}