'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useRef, useState, type KeyboardEvent } from 'react'
import {
  ArrowDown, ArrowRight, AudioLines, BarChart3, BookOpen, Check, CircleAlert, ClipboardCheck,
  FileText, ListChecks, MessageCircle, Mic, Pause, Play, Settings2, Sparkles, Target, Video,
} from 'lucide-react'
import { getInterviewer } from '@/lib/voice/interviewers'
import { useInView, useReducedMotion } from './hooks'
import s from './interview-showcase.module.css'

const interviewer = getInterviewer('arab-man')
const tabs = [
  { id: 'feedback', label: 'Feedback', icon: Sparkles },
  { id: 'guide', label: 'Answer Guide', icon: BookOpen },
  { id: 'progress', label: 'Progress', icon: BarChart3 },
] as const
const feedback = [
  { title: 'What worked', detail: 'The sample opens directly with the handover issue.', icon: Check },
  { title: 'What was unclear', detail: 'It skips what changed after the issue was addressed.', icon: CircleAlert },
  { title: 'Relevant experience', detail: 'The example connects team coordination to handover.', icon: ClipboardCheck },
  { title: 'What to improve', detail: 'Separate your own actions from the team’s work.', icon: ListChecks },
  { title: 'Next attempt', detail: 'Name one action you took and the outcome you observed.', icon: Sparkles },
] as const
const guide = [
  ['Start directly', 'The handover issue was [the issue you observed].'],
  ['Explain the situation', 'It mattered because [the practical impact].'],
  ['Describe your actions', 'I was responsible for [your part]. I [the action you took].'],
  ['Explain the outcome', 'The result or lesson was [what you can verify].'],
  ['Close clearly', 'That experience taught me [what you would apply next time].'],
] as const
const benefits = [
  { title: 'Job-Specific Questions', detail: 'Practice questions based on your resume, experience, and target job.', icon: Target },
  { title: 'Right Answer Structure', detail: 'Learn how to start, explain your experience, and conclude your answer effectively.', icon: MessageCircle },
  { title: 'Technical & Experience Rounds', detail: 'Prepare for technical, practical, project-based, and professional interview questions.', icon: Settings2 },
  { title: 'Communication & Confidence', detail: 'Improve answer clarity, professional communication, and interview readiness.', icon: AudioLines },
] as const
const journey = [
  { title: 'Your Resume & Target Job', icon: FileText },
  { title: 'Practice Mock Interview', icon: Mic },
  { title: 'Review Feedback', icon: ClipboardCheck },
  { title: 'Improve & Re-practice', icon: BarChart3 },
  { title: 'Face Your Interview with Confidence', icon: Target },
] as const
const attempts = [46, 61, 74] as const
const lastScore = attempts[2]
const chartX = [57, 157, 257] as const
const chartY = (score: number) => 122 - score

function ProgressChart() {
  const points = attempts.map((score, index) => `${chartX[index]},${chartY(score)}`).join(' ')
  return (
    <figure className={s.chartCard} id="interview-attempt-chart" aria-labelledby="interview-chart-heading">
      <figcaption>
        <h3 id="interview-chart-heading">Your Interview Progress</h3>
        <p>Illustrative example — not customer results.</p>
      </figcaption>
      <div className={s.chartBody}>
        <div className={s.plot}>
          <p>Overall score / 100</p>
          <svg viewBox="0 0 290 151" role="img" aria-labelledby="interview-plot-title interview-plot-description">
            <title id="interview-plot-title">Illustrative overall interview scores</title>
            <desc id="interview-plot-description">Attempt 1 scored 46, attempt 2 scored 61 and attempt 3 scored 74, all out of 100.</desc>
            <defs>
              <linearGradient id="interview-plot-fill" x2="0" y2="1" gradientUnits="objectBoundingBox">
                <stop stopColor="#a7e7d8" stopOpacity=".76" />
                <stop offset="1" stopColor="#e7f3f0" stopOpacity=".25" />
              </linearGradient>
            </defs>
            {[0, 25, 50, 75, 100].map(value => (
              <g key={value} className={s.chartGrid}>
                <line x1="31" x2="284" y1={chartY(value)} y2={chartY(value)} />
                <text x="24" y={chartY(value) + 4} textAnchor="end">{value}</text>
              </g>
            ))}
            <polygon points={`${chartX[0]},122 ${points} ${chartX[2]},122`} fill="url(#interview-plot-fill)" />
            <polyline points={points} fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
            {attempts.map((score, index) => (
              <g key={score}>
                <circle cx={chartX[index]} cy={chartY(score)} r="4.5" fill="currentColor" stroke="white" strokeWidth="1.5" />
                <text className={s.chartValue} x={chartX[index]} y={chartY(score) - 9} textAnchor="middle">{score}</text>
                <text x={chartX[index]} y="143" textAnchor="middle">Attempt {index + 1}</text>
              </g>
            ))}
          </svg>
        </div>
        <div className={s.scoreSummary}>
          <div className={s.scoreRing} aria-hidden="true">
            <svg viewBox="0 0 40 40"><circle cx="20" cy="20" r="17" fill="none" stroke="#dbece8" strokeWidth="3" /><circle cx="20" cy="20" r="17" fill="none" stroke="currentColor" strokeWidth="3" pathLength="100" strokeDasharray={`${lastScore} 100`} strokeLinecap="round" transform="rotate(-90 20 20)" /></svg>
            <strong>{lastScore}<small>/100</small></strong>
          </div>
          <p>Latest sample</p>
          <p><strong>+{lastScore - attempts[0]} points</strong><br />since attempt 1</p>
        </div>
      </div>
      <div className={s.chartData}>
        <table className={s.attemptTable}>
          <caption>Sample overall interview scores</caption>
          <thead><tr><th scope="col">Attempt</th>{attempts.map((score, index) => <th key={score} scope="col">{index + 1}</th>)}</tr></thead>
          <tbody><tr><th scope="row">Score out of 100</th>{attempts.map(score => <td key={score}>{score}</td>)}</tr></tbody>
        </table>
      </div>
      <p className={s.recommendation}><Target size={16} aria-hidden="true" /><span><strong>Next practice</strong> Explain your individual contribution more clearly.</span></p>
    </figure>
  )
}

/** The public sample plays a visual waveform using local data. */
export function InterviewDemo() {
  const [activeTab, setActiveTab] = useState(0)
  const [paused, setPaused] = useState(false)
  const reducedMotion = useReducedMotion()
  const { ref, visible } = useInView<HTMLDivElement>(0.15)
  const tabRefs = useRef<Array<HTMLButtonElement | null>>([])
  const moving = visible && !reducedMotion && !paused

  function onTabKey(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    let next: number
    switch (event.key) {
      case 'ArrowRight': next = (index + 1) % tabs.length; break
      case 'ArrowLeft': next = (index + tabs.length - 1) % tabs.length; break
      case 'Home': next = 0; break
      case 'End': next = tabs.length - 1; break
      default: return
    }
    event.preventDefault()
    setActiveTab(next)
    tabRefs.current[next]?.focus()
  }

  return (
    <section id="interview" className={s.section} aria-labelledby="interview-title">
      <div className={s.inner} data-interview-inner>
        <header className={s.heading}>
          <span className={s.label}><Video size={17} aria-hidden="true" />AI Mock Interview</span>
          <h2 id="interview-title">Right Preparation. <span>Clearer Answers.</span></h2>
          <p>Prepare for the job you applied for, practice with AI, receive personalized feedback, and build the confidence to face your client interview.</p>
        </header>

        <div className={s.editorialPhoto} data-interview-photo>
          <Image src="/landing/interview-practice-v1.webp" alt="A professional preparing for an interview at her laptop overlooking a Gulf city" fill sizes="(min-width: 1440px) 330px, (min-width: 1200px) 21vw, 1px" />
          <span><Check size={18} aria-hidden="true" />Prepare for your client interview</span>
        </div>

        <div className={s.device} data-interview-device>
          <div className={s.screen}>
            <div className={s.deviceBar}><Video size={15} aria-hidden="true" /><strong>AI Mock Interview</strong><span>Illustrative demonstration</span></div>
            <div className={s.practice} ref={ref} data-interview-practice data-motion={moving ? 'playing' : 'static'}>
              <div className={s.portrait}>
                <Image src={interviewer.image} alt={`${interviewer.name}, the AI interviewer`} fill sizes="(min-width: 1200px) 380px, (min-width: 768px) 52vw, calc(100vw - 48px)" />
                <span className={s.interviewer}><i aria-hidden="true" />AI interviewer <strong>{interviewer.name}</strong></span>
                <span className={s.questionCount}>Question 4 of 10</span>
              </div>
              <div className={s.question}>
                <span aria-hidden="true">Q</span>
                <div><p>Sample question for an operations supervisor</p><h3>Tell me about a time you resolved a handover issue. What did you do, and what changed?</h3></div>
              </div>
              <div className={s.voice}>
                <span className={s.mic}><Mic size={17} aria-hidden="true" /></span>
                <span className={s.wave} aria-hidden="true">{Array.from({ length: 18 }, (_, index) => <i key={index} style={{ height: 5 + (index * 11 % 16), animationDelay: `${index * -0.083}s` }} />)}</span>
                <span className={s.voiceLabel}>Sample voice waveform<br /><small>Recording inactive</small></span>
                <button className={s.motionButton} type="button" aria-label={paused ? 'Play demo motion' : 'Pause demo motion'} onClick={() => setPaused(value => !value)}>
                  {paused ? <Play size={17} aria-hidden="true" /> : <Pause size={17} aria-hidden="true" />}
                </button>
              </div>
            </div>

            <div className={s.mentor}>
              <div className={s.tabs} role="tablist" aria-label="Mentor-style interview review">
                {tabs.map(({ id, label, icon: Icon }, index) => (
                  <button key={id} ref={element => { tabRefs.current[index] = element }} id={`interview-tab-${id}`} aria-controls={`interview-panel-${id}`}
                    role="tab" type="button" aria-selected={activeTab === index} tabIndex={activeTab === index ? 0 : -1}
                    onClick={() => setActiveTab(index)} onKeyDown={event => onTabKey(event, index)}>
                    <Icon size={15} aria-hidden="true" />{label}
                  </button>
                ))}
              </div>
              <div className={s.panels}>
                <div role="tabpanel" id="interview-panel-feedback" aria-labelledby="interview-tab-feedback" hidden={activeTab !== 0} tabIndex={0}>
                  <p className={s.panelNote}>Sample outline for a handover issue and team coordination. The outcome is missing.</p>
                  <ul className={s.feedback}>{feedback.map(({ title, detail, icon: Icon }) => (
                    <li key={title}><span className={s.feedbackIcon}><Icon size={15} aria-hidden="true" /></span><div><strong>{title}</strong><p>{detail}</p></div></li>
                  ))}</ul>
                </div>
                <div role="tabpanel" id="interview-panel-guide" aria-labelledby="interview-tab-guide" hidden={activeTab !== 1} tabIndex={0}>
                  <p className={s.panelNote}>Illustrative answer guide. Fill in the details from your own experience.</p>
                  <ol className={s.guide}>{guide.map(([label, example]) => <li key={label}><strong>{label}</strong><p>{example}</p></li>)}</ol>
                </div>
                <div role="tabpanel" id="interview-panel-progress" aria-labelledby="interview-tab-progress" hidden={activeTab !== 2} tabIndex={0}>
                  <p className={s.panelNote}>Compare completed attempts for the same application and interview settings.</p>
                  <ul className={s.feedback}>
                    <li><span className={s.feedbackIcon}><BookOpen size={15} aria-hidden="true" /></span><div><strong>Answer structure</strong><p>Review how clearly you organized your examples.</p></div></li>
                    <li><span className={s.feedbackIcon}><Settings2 size={15} aria-hidden="true" /></span><div><strong>Technical knowledge</strong><p>Review the technical understanding shown in your answers.</p></div></li>
                    <li><span className={s.feedbackIcon}><BarChart3 size={15} aria-hidden="true" /></span><div><strong>Overall performance</strong><p>Use your completed reports to compare practice attempts.</p></div></li>
                  </ul>
                  <a className={s.chartLink} href="#interview-attempt-chart">See the sample progress chart <ArrowDown size={15} aria-hidden="true" /></a>
                </div>
              </div>
            </div>
          </div>
        </div>

        <ProgressChart />

        <ul className={s.benefits} aria-label="Mock interview benefits">
          {benefits.map(({ title, detail, icon: Icon }) => (
            <li key={title}><span className={s.featureIcon}><Icon size={22} aria-hidden="true" /></span><div><h3>{title}</h3><p>{detail}</p></div></li>
          ))}
        </ul>

        <div className={s.journey}>
          <h3>Your Interview Preparation Journey</h3>
          <ol>{journey.map(({ title, icon: Icon }, index) => (
            <li key={title}><span className={s.featureIcon}><Icon size={21} aria-hidden="true" /></span><strong>{title}</strong>{index < journey.length - 1 && <ArrowRight className={s.stepArrow} size={16} aria-hidden="true" />}</li>
          ))}</ol>
        </div>

        <div className={s.cta}>
          <p>Practice. Get personalized feedback. Improve. Walk into your interview better prepared.</p>
          <Link href="/mock-interview"><Play size={17} aria-hidden="true" />Try AI Mock Interview Now<ArrowRight size={17} aria-hidden="true" /></Link>
        </div>
      </div>
    </section>
  )
}
