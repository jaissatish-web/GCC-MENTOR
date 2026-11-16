'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ArrowRight, ChevronDown } from 'lucide-react'
import s from './concerns.module.css'

const concerns = [
  ["I've applied to so many jobs. Why am I not getting interview calls?", 'Your resume may not make the connection between your experience and the role clear enough.'],
  ["I have the skills, but my resume doesn't show them properly.", 'Important skills can get buried when responsibilities are listed without clear examples of your work.'],
  ['I get interviews, but I struggle to explain my experience.', 'Knowing the work and explaining it clearly are different skills. Focused practice helps you structure your answers.'],
  ["I keep changing my resume, but I don't know what actually improves.", 'Without a target role and specific feedback, edits can become guesswork instead of purposeful preparation.'],
] as const

function Concern({ index }: { index: number }) {
  const [title, explanation] = concerns[index]
  return <li className={s.concern}><span className={s.number} aria-hidden="true">0{index + 1}</span><div><h3>{title}</h3><p>{explanation}</p></div></li>
}

export function CandidateConcerns() {
  const [expanded, setExpanded] = useState(false)
  return <>
    <section id="challenges" className={s.section} aria-labelledby="challenges-title">
      <div className={s.inner}>
        <div className={s.intro}><span className={s.eyebrow}>Does this feel familiar?</span><h2 id="challenges-title">Applying for Gulf jobs but not getting shortlisted?</h2><p>You have the experience. You apply for relevant jobs. But you rarely hear back — and you&apos;re not sure what needs to change.</p></div>
        <div className={s.concerns}>
          <ul className={s.list}><Concern index={0} /><Concern index={1} /></ul>
          <button type="button" className={s.toggle} aria-expanded={expanded} aria-controls="more-candidate-concerns" onClick={() => setExpanded(!expanded)}>{expanded ? 'Show fewer concerns' : 'Two more concerns you may recognise'}<ChevronDown size={18} aria-hidden="true" /></button>
          <ul id="more-candidate-concerns" className={`${s.list} ${s.additional}`} data-expanded={expanded}><Concern index={2} /><Concern index={3} /></ul>
        </div>
      </div>
    </section>
    <section id="solutions" className={s.solution} aria-labelledby="solutions-title"><div className={s.solutionInner}>
      <div><span className={s.eyebrow}>A clearer way forward</span><h2 id="solutions-title">Your experience deserves better preparation.</h2><Link href="#how-it-works" className={s.link}>See your preparation journey <ArrowRight size={18} aria-hidden="true" /></Link></div>
      <div className={s.answer}><p><strong>Start with your Career Profile.</strong> Keep your real experience and skills in one reviewed record. ATS analysis helps you compare that experience with a target role and identify gaps.</p><p><strong>Prepare a relevant application.</strong> Build an Optimized Resume and Cover Letter that bring the right evidence forward. Use interview preparation to practise explaining it, review feedback and choose what to improve next.</p><small>Preparation supports your application. Employers decide whom to shortlist and hire.</small></div>
    </div></section>
  </>
}
