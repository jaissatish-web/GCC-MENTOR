import Link from 'next/link'
import { ArrowRight, Check, TrendingUp } from 'lucide-react'
import s from './launch.module.css'
import { InterviewDemo } from './InterviewDemo'

export function InterviewPreparation() {
  return <section id="interview" className={s.section + ' ' + s.interview} aria-labelledby="interview-title">
    <div className={s.wrap}>
      <div className={s.twoColumn}>
        <div>
          <span className={s.eyebrow}>YOUR GUIDED INTERVIEW PREPARATION</span>
          <h2 id="interview-title">Practice Before the Real Interview.<br /><span>Improve After Every Attempt.</span></h2>
          <p className={s.lead}>Practise questions based on your optimized resume and target job. Speak your answers, review question-level feedback and choose what to work on before your next session.</p>
          <ul className={s.coachingBenefits}>
            <li><Check size={18} aria-hidden="true" /><span>Prepare with role-specific Q&A and HR or technical interview practice.</span></li>
            <li><Check size={18} aria-hidden="true" /><span>Get AI-guided feedback on your answers, with stronger wording to practise.</span></li>
            <li><Check size={18} aria-hidden="true" /><span>Follow your improvement plan and compare saved practice results.</span></li>
          </ul>
          <Link href="/signup" className={s.primary}>Start my interview preparation <ArrowRight size={18} aria-hidden="true" /></Link>
          <p className={s.coachingNote}>Your experience stays the foundation. Practice is a place to learn, not a pass-or-fail hiring decision.</p>
        </div>
        <InterviewDemo />
      </div>
      <ol className={s.practiceLoop} aria-label="Guided preparation cycle">
        {[['Prepare', 'Choose your role and practise relevant questions.'], ['Review', 'Explore your answers, feedback and stronger examples.'], ['Improve', 'Choose one focus from your improvement plan.'], ['Repeat & compare', 'Try again and see what changed in your saved scores.']].map(([title, body], i) => <li key={title}><span>0{i + 1}</span><h3>{title}</h3><p>{body}</p></li>)}
      </ol>
      <div className={s.realProgress}><TrendingUp size={22} aria-hidden="true" /><div><h3>Your progress is more than one score.</h3><p>Review overall performance, technical answers, role fit, Gulf readiness and answer structure. See what improved, what still needs attention and your next moves — across comparable saved practices.</p></div></div>
    </div>
  </section>
}
