'use client'

import { useState } from 'react'
import { Check, MessageCircle, Pause, Play, Target, TrendingUp } from 'lucide-react'
import { useAutoStep, useInView, useReducedMotion } from './hooks'
import s from './launch.module.css'
const stages = ['Practise', 'Review', 'Improve']
export function InterviewDemo() {
  const reduced = useReducedMotion()
  const { ref, visible } = useInView<HTMLDivElement>(0.2)
  const [paused, setPaused] = useState(false)
  const [focused, setFocused] = useState(false)
  const { index, choose, manual, resume } = useAutoStep(3, 6500, visible && !paused && !focused && !reduced)
  return <div ref={ref} className={s.interviewDemo} data-motion={visible && !paused && !manual && !focused && !reduced ? 'playing' : 'paused'} onMouseEnter={() => setFocused(true)} onMouseLeave={() => setFocused(false)} onFocusCapture={() => setFocused(true)} onBlurCapture={(e) => { if (!e.currentTarget.contains(e.relatedTarget)) setFocused(false) }}>
    <div className={s.demoInterviewHead}><span><MessageCircle size={18} aria-hidden="true" />AI mock interview</span><span className={s.exampleChip}>Interactive example</span></div>
    <div className={s.interviewStagePicker} aria-label="Explore the practice cycle">{stages.map((label, i) => <button type="button" key={label} aria-pressed={index === i} onClick={() => choose(i)}><span>0{i + 1}</span>{label}</button>)}</div>
    <div className={s.demoStage} key={index}>
      {index === 0 ? <><div className={s.interviewerOrb} aria-hidden="true"><MessageCircle size={36} /></div><span className={s.miniLabel}>A QUIET PLACE TO PRACTISE</span><h3>“Tell me about a difficult situation you handled at work.”</h3><div className={s.answerBubble}><strong>Your practice answer</strong><p>“I explained the situation and my responsibility. Next, I need to make my action and the result clearer.”</p></div><p className={s.demoFootnote}>Read the question. Think it through. Practise explaining your experience.</p></> : index === 1 ? <><span className={s.miniLabel}>AI-GUIDED · HR-STYLE REVIEW</span><h3>Understand your answer.</h3><div className={s.demoReview}><Check size={21} aria-hidden="true" /><div><strong>What worked</strong><p>You explained the situation and your responsibility.</p></div></div><div className={s.demoReview}><Target size={21} aria-hidden="true" /><div><strong>What to strengthen</strong><p>Describe your action clearly. Include a result you can support with your experience.</p></div></div><div className={s.answerBubble}><strong>Structure to practise</strong><p>Situation → your action → the result</p></div></> : <><span className={s.miniLabel}>YOUR NEXT IMPROVEMENT</span><h3>One focus. Another practice.</h3><div className={s.demoReview}><TrendingUp size={22} aria-hidden="true" /><div><strong>Make your contribution clear</strong><p>Try the question again. Explain what you personally did and why it mattered.</p></div></div><div className={s.demoScoreBars}>{[52,64,72].map((score,i)=><div key={score}><span>Practice {i+1}</span><div><span style={{width:score+'%'}} /></div><b>{score}/100</b></div>)}</div><p className={s.demoFootnote}>Illustrative scores, not customer results. Real practice scores can rise or fall; compare the same resume and interview settings.</p></>}
    </div>
    <button className={s.interviewPlay} type="button" aria-pressed={paused || manual} onClick={() => { if (paused || manual) { setPaused(false); resume() } else setPaused(true) }}>{paused || manual ? <Play size={15} aria-hidden="true" /> : <Pause size={15} aria-hidden="true" />}{paused || manual ? 'Play walkthrough' : 'Pause walkthrough'}</button>
  </div>
}
