import type { Metadata } from 'next'
import Link from 'next/link'
import { ArrowRight, ArrowUpRight, BookOpen, Check, ClipboardCheck, FileText, FolderOpen, Mail, Mic, ShieldCheck, Target } from 'lucide-react'
import { AuthLinkCatcher } from '@/components/auth/AuthLinkCatcher'
import { PremiumNav } from '@/components/landing-v3/PremiumNav'
import { LandingFooter } from '@/components/landing-v3/LandingFooter'
import { DocumentOrbit, GccGlobe } from '@/components/landing-v3/lazy'
import { InterviewDemo } from '@/components/landing-v3/InterviewDemo'
import { PERSONAS } from '@/components/landing-v3/personas'
import { profiles, services } from '@/components/landing-premium/data'
import s from '@/components/landing-v3/premium.module.css'

/**
 * GCC Mentor landing — Design B · “Navy & Gold Trust”.
 *
 * Visual language: navy #0B1F3A is identity/trust (hero gradient
 * 150deg #0B1F3A → #123049 → #1A3D63); gold #C9962E carries the ONE
 * primary CTA per screen with ink text #8A6114 (never white on gold);
 * white cards on light canvas #F4F6F8; muted secondary text #8FA3BC.
 * Visual layer only — seeds, services and destinations stay untouched.
 *
 * Data reuse: the professions row and sector strip are grounded in
 * PERSONAS (six fictional example sectors) and PROFESSION_EXAMPLES via
 * the `profiles` export (12 demonstrated sectors, blue-collar included).
 */
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

const STATS = [
  ['9.9M+', 'Indians working in the GCC'],
  ['6', 'Gulf markets covered'],
  ['50+', 'ATS resume templates'],
  ['0', 'invented facts, ever'],
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
  const personaSectors = [...new Set(PERSONAS.map(persona => persona.sector))].join(', ')
  return (
    <div className={`${s.system} font-redesign-sans`}>
      <PremiumNav anchors={anchors} />
      <AuthLinkCatcher />
      <main id="main-content" tabIndex={-1}>
        {/* ── Hero · navy gradient, one gold primary, professions, trust ── */}
        <section className={s.heroNavy} aria-labelledby="hero-title">
          <div className={s.heroInner}>
            <span className={s.kickerGold}>Your Gulf career preparation partner</span>
            <h1 id="hero-title" className={s.heroTitle}>Serious about your next <span>Gulf career chapter?</span></h1>
            <p className={s.heroSub}>A complete preparation room for every profession — ATS-optimized resume, tailored cover letter, interview practice and a free GCC readiness score. Built only from your real experience. Nothing invented, ever.</p>
            <div className={s.heroCtas}>
              <Link href="/gulf-readiness-score" className={s.goldCta}>Check my free GCC Readiness <ArrowRight size={18} aria-hidden="true" /></Link>
              <Link href="/templates" className={s.ghostCta}>Explore 50+ templates <ArrowUpRight size={16} aria-hidden="true" /></Link>
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
        </section>

        {/* ── Country picks · six GCC cards with a reason + hover lift ── */}
        <section aria-label="GCC career destinations" className={s.countryBand}>
          <div className={s.inner}>
            <div className={s.sectionHead}>
              <span className={s.kickerGold}>Six Gulf markets</span>
              <h2 className={s.sectionTitle}>One preparation plan, <span>six countries.</span></h2>
              <p className={s.sectionLead}>Roles move between markets — your Career Profile and preparation move with them, ready for every GCC opening.</p>
            </div>
            <ul className={s.countryGrid}>
              {COUNTRIES.map(country => (
                <li key={country.name} className={s.countryCard}>
                  <span className={s.countryFlag} aria-hidden="true">{country.flag}</span>
                  <b className={s.countryName}>{country.name}</b>
                  <span className={s.countryReason}>{country.reason}</span>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* ── Preparation services ── */}
        <section id="services" className={`${s.section} ${s.softSection}`} aria-labelledby="services-title">
          <div className={s.inner}>
            <div className={s.sectionHead}>
              <span className={s.kickerGold}>What you get</span>
              <h2 id="services-title" className={s.sectionTitle}>All the tools for <span>your next move</span></h2>
              <p className={s.sectionLead}>One Career Profile. A plan for every opening. Example candidates already span {personaSectors.toLowerCase()} — one profile each.</p>
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
            <p className={s.sectorLine}>Prepared for professionals across <b>{profiles.length} example sectors</b>: {profiles.map(profile => profile.department).join(' · ')}</p>
          </div>
        </section>

        {/* ── Templates ── */}
        <section id="templates" className={s.section} aria-labelledby="templates-title">
          <div className={`${s.inner} ${s.splitSection}`}>
            <div className={s.sectionHead}>
              <span className={s.kickerGold}>Real templates · your career story</span>
              <h2 id="templates-title" className={s.sectionTitle}>50+ resume templates. <span>Your career, clearly presented.</span></h2>
              <p className={s.sectionLead}>Choose a single-column ATS layout or a professional recruiter-ready design.</p>
              <Link href="/templates" className={s.textLink}>Explore all templates <ArrowRight size={16} aria-hidden="true" /></Link>
            </div>
            <DocumentOrbit />
          </div>
        </section>

        {/* ── Interview practice ── */}
        <section id="interview" className={`${s.section} ${s.softSection}`} aria-labelledby="interview-title">
          <div className={`${s.inner} ${s.splitSection}`}>
            <div className={s.sectionHead}>
              <span className={s.kickerGold}>Job-specific questions · practical coaching</span>
              <h2 id="interview-title" className={s.sectionTitle}>Practise your interview. <span>Know what to improve.</span></h2>
              <p className={s.sectionLead}>Prepare relevant examples, review incomplete answers and learn a better structure for your next attempt.</p>
            </div>
            <InterviewDemo />
          </div>
        </section>

        {/* ── GCC markets globe ── */}
        <section id="markets" className={s.section} aria-label="Explore the six Gulf markets">
          <div className={s.inner}>
            <div className={`${s.sectionHead} ${s.sectionHeadCenter}`}>
              <span className={s.kickerGold}>Where preparation meets opportunity</span>
              <h2 className={s.sectionTitle}>Six Gulf markets. <span>One Career Profile.</span></h2>
              <p className={s.sectionLead}>From Riyadh to Manama — roles, employers and location guidance across all six GCC countries.</p>
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
                <p className={s.navyLead}>GCC Mentor brings practical industry experience to a guided career-preparation workspace — helping professionals present their real experience and prepare with purpose.</p>
                <div className={s.founderBox}>
                  <span className={s.monogram} aria-hidden="true">SKJ</span>
                  <div>
                    <h3>Satish Kumar Jaiswal</h3>
                    <span className={s.founderRole}>Founder, GCC Mentor</span>
                    <p>Approximately 15 years in instrumentation, commissioning and Gulf EPC/industrial projects. Built around practical application preparation and clear, experience-based interview answers.</p>
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
                    <p>Use your resume and career answers to understand your preparation gaps.</p>
                    <Link href="/gulf-readiness-score" className={s.btnNavyOutline}>Check my free readiness <ArrowRight size={14} aria-hidden="true" /></Link>
                  </div>
                </article>
                <article className={s.accessCard}>
                  <span className={s.accessIcon}><FileText size={19} aria-hidden="true" /></span>
                  <div>
                    <span className={s.accessTag}>With an account</span>
                    <h3>Career Preparation</h3>
                    <p>Prepare applications, use templates and practise interviews with your available service access.</p>
                    <Link href="/signup" className={s.btnNavyOutline}>Create my account <ArrowRight size={14} aria-hidden="true" /></Link>
                  </div>
                </article>
                <article className={s.accessCard}>
                  <span className={s.accessIcon}><ShieldCheck size={19} aria-hidden="true" /></span>
                  <div>
                    <span className={s.accessTag}>Your service access</span>
                    <h3>Your Available Services</h3>
                    <p>See which tools you can use and how many preparations are available. Have an access code? Redeem it in Settings.</p>
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
              <p className={s.sectionLead}>Preparation guidance, grounded in your real experience.</p>
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
            <p className={s.finalLead}>Understand your readiness, prepare job-specific applications and practise interviews — all in one place.</p>
            <Link href="/gulf-readiness-score" className={s.whiteCta}>Check my free GCC Readiness <ArrowRight size={18} aria-hidden="true" /></Link>
            <small className={s.finalSmall}>Your real experience · Guided preparation · Employment is not guaranteed</small>
          </div>
        </section>
      </main>
      <LandingFooter />
    </div>
  )
}