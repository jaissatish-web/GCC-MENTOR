import Image from 'next/image'
import Link from 'next/link'
import { ArrowRight, Check, Compass, LockKeyhole, MessageCircle, ShieldCheck, Trash2, UserRound } from 'lucide-react'
import s from './launch.module.css'

export function ApplicationBarriers() {
  const obstacles = [
    ['One generic CV for every role', 'Relevant experience gets buried.', 'Match your profile to each job and make the relevant skills easier to find.'],
    ['Duties without a clear story', 'Your contribution is hard to understand.', 'Present the responsibilities and results you can support with your real experience.'],
    ['Preparation stops at the CV', 'Interview answers remain unpractised.', 'Follow the application with Q&A, mock interview practice and feedback.'],
  ]
  return <section className={s.section + ' ' + s.barriers} aria-labelledby="barriers-title">
    <div className={s.wrap}>
      <div className={s.sectionIntro}><div><span className={s.eyebrow}>THE APPLICATION GAP</span><h2 id="barriers-title">Good experience can<br /><span>still get overlooked.</span></h2></div><p>It can feel like you keep applying without moving forward. These are preparation gaps GCC Mentor helps you work on — hiring also depends on eligibility, competition and the employer.</p></div>
      <div className={s.barrierLayout}><div className={s.barrierPhoto}><Image src="/landing/pain-applying-laptop.jpg" alt="A candidate preparing an application on a laptop" fill sizes="(min-width: 1024px) 35vw, 100vw" className={s.storyPhoto} /><div><span>FROM “WHERE DO I START?”</span><strong>To a plan you can follow.</strong></div></div><div className={s.barrierRows}>{obstacles.map(([title, pain, solution], i) => <article key={title}><span className={s.barrierNumber}>0{i + 1}</span><div><h3>{title}</h3><p>{pain}</p><div className={s.solutionLine}><Check size={17} aria-hidden="true" /><span>{solution}</span></div></div></article>)}</div></div>
    </div>
  </section>
}

export function AboutMentor() {
  return <section id="about" className={s.section + ' ' + s.about} aria-labelledby="about-title"><div className={s.wrap + ' ' + s.aboutGrid}>
    <div className={s.founderPanel}><Image src="/landing/founder-refinery-night.jpg" alt="An industrial facility at night, representing the Gulf project environment" fill sizes="(min-width: 1024px) 40vw, 100vw" className={s.storyPhoto} /><div className={s.founderOverlay}><span className={s.eyebrow}>THE EXPERIENCE BEHIND GCC MENTOR</span><strong>15+ years.<br />Real project experience.</strong><div className={s.founderIdentity}><span>SKJ</span><div><b>Satish Kumar Jaiswal</b><p>Founder · Instrumentation & Controls</p></div></div><p>Engineering and commissioning experience, including major Gulf projects.</p></div></div>
    <div><span className={s.eyebrow}>WHO WE ARE. WHY WE BUILT THIS.</span><h2 id="about-title">A Gulf career platform.<br /><span>With a mentor’s mindset.</span></h2><p className={s.lead}>Your Gulf ambition deserves a preparation plan you can understand and work through.</p><p>GCC Mentor connects your Career Profile, job matching, resume preparation, cover letters and interview practice. You build from the experience you already have and prepare for the role you actually want. For engineering, construction, finance, IT, healthcare and more.</p><div className={s.whyUs}>{[[Compass, 'Guidance at every stage', 'Know what to do next, from reviewing your profile to practising your answers.'], [ShieldCheck, 'Your facts stay the foundation', 'Review suggestions and keep only what is true for you.'], [UserRound, 'You remain in charge', 'Choose the role, approve your application and decide when to send it.']].map(([Icon, title, body]) => { const I = Icon as typeof Compass; return <div key={String(title)}><I size={22} aria-hidden="true" /><div><h3>{String(title)}</h3><p>{String(body)}</p></div></div> })}</div><a href="#journey" className={s.secondary}>Explore the guided journey <ArrowRight size={17} aria-hidden="true" /></a></div>
  </div></section>
}

export function PrivacyControl() {
  const items = [
    { icon: LockKeyhole, title: 'A personal workspace', body: 'Your Career Profile and saved applications sit in your signed-in workspace, with account-based access controls.' },
    { icon: Check, title: 'Review before you use', body: 'Check extracted profile details and suggested changes. Your final application should reflect experience you can stand behind.' },
    { icon: UserRound, title: 'You decide when to send', body: 'Download your application and choose where to apply. GCC Mentor does not submit it to employers for you.' },
    { icon: Trash2, title: 'Delete your profile data', body: 'Use Settings → Delete my data to permanently remove your Career Profile and saved packages. Your login remains active.' },
  ]
  return <section id="privacy" className={s.section + ' ' + s.privacy} aria-labelledby="privacy-title"><div className={s.wrap}><div className={s.centerHead}><span className={s.eyebrow}>YOUR CAREER. YOUR INFORMATION. YOUR CONTROL.</span><h2 id="privacy-title">Prepare with confidence.<br /><span>Stay in control of your data.</span></h2><p>You should understand what happens to your information, and have a clear way to manage it.</p></div><div className={s.privacyGrid}>{items.map(({ icon: Icon, title, body }) => <article key={title}><Icon size={25} aria-hidden="true" /><h3>{title}</h3><p>{body}</p></article>)}</div><div className={s.processingNote}><ShieldCheck size={21} aria-hidden="true" /><p><strong>Clear about AI processing.</strong> When you use an AI service, relevant profile and job information is sent to the configured AI providers to generate the result. This is different from publishing your CV or sending it to a recruiter. Deleting your profile data does not close your login or remove every operational record.</p></div></div></section>
}

export function CandidateVoice() {
  return <section className={s.section} aria-labelledby="voices-title"><div className={s.wrap + ' ' + s.voiceGrid}><div><span className={s.eyebrow}>BUILT AROUND THE JOB SEEKER</span><h2 id="voices-title">Your questions.<br /><span>Our reason to keep improving.</span></h2><p>Whether you’re moving to the Gulf, returning or already working there, preparation should feel clear and useful.</p></div><div className={s.voiceCards}>{['How do I show my experience for this role?', 'How do I prepare for the client interview?', 'Can I control and delete my profile data?'].map(question => <div key={question}><MessageCircle size={21} aria-hidden="true" /><span>{question}</span></div>)}<p className={s.demoNote}>Common preparation questions — not customer testimonials.</p><div className={s.feedbackInvite}><strong>Already used GCC Mentor?</strong><p>Tell us what helped and what we should improve. Customer stories are published only with permission.</p><a href="mailto:jaissatish@gmail.com?subject=My%20GCC%20Mentor%20feedback">Share my experience <ArrowRight size={16} aria-hidden="true" /></a></div></div></div></section>
}
