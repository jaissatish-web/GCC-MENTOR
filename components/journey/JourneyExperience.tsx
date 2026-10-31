'use client'

import { useId, useState } from 'react'
import { ArrowDown, MessageSquare, Repeat2, UserRound } from 'lucide-react'
import s from './how-it-works.module.css'

import { JOBS, SERVICES, type Service } from './journeyExamples'
export { JourneyDiagram } from './JourneyDiagram'

const control = 'field min-h-11 w-full min-w-0 max-w-full'
const text = 'mt-2 type-helper text-ink-soft'

function PracticeLoop() {
  return <div className={s.practiceLoop}>
    <p className="flex items-center gap-2 type-label font-semibold text-teal"><Repeat2 aria-hidden="true" className="size-4" /> Mock interview improvement cycle</p>
    <ol className="mt-2 flex flex-wrap gap-2 type-caption text-ink">{['Practise', 'Guided review', 'Improve', 'Repeat', 'Compare progress'].map((step, i) => <li key={step} className="rounded-ctl bg-white px-2 py-2">{i + 1}. {step}</li>)}</ol>
    <p className="mt-2 type-caption text-ink-soft">Use feedback to choose your next practice focus and build confidence.</p>
  </div>
}

export function JourneySimulation() {
  const id = useId()
  const [jobIndex, setJobIndex] = useState(1)
  const [service, setService] = useState<Service>('mock')
  const [version, setVersion] = useState(0)
  const [session, setSession] = useState(5)
  const [notice, setNotice] = useState('')
  const job = JOBS[jobIndex]
  const count = service === 'letters' ? job.letters : service === 'qa' ? job.sets : service === 'mock' ? job.sessions : 1
  const selectedService = SERVICES.find(item => item.key === service)!
  function changeJob(value: number) {
    setJobIndex(value); setVersion(0); setSession(JOBS[value].sessions - 1); setNotice('')
  }
  return <div className={s.simulation}>
    <div className="rounded-card border border-gold/40 bg-gold/10 p-3"><h2 className="type-card font-semibold text-ink">Explore a sample user’s journey</h2><p className="mt-1 type-helper text-ink-soft">Fictional sample data. Explore freely; your account and credits stay unchanged.</p></div>
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">{[['1', 'Career Profile'], [String(JOBS.length), 'target jobs'], [String(JOBS.reduce((n, j) => n + j.letters, 0)), 'cover letters'], [String(JOBS.reduce((n, j) => n + j.sessions, 0)), 'mock sessions']].map(([n, label]) => <div key={label} className="rounded-ctl border border-line bg-white p-3"><strong className="block type-section text-teal">{n}</strong><span className="type-caption text-ink-soft">{label}</span></div>)}</div>
    <details className={s.details}><summary><UserRound aria-hidden="true" className="size-4" /> Sample Career Profile · Reviewed</summary><div className="rounded-ctl bg-white p-3 type-helper text-ink-soft">An instrumentation professional with experience in calibration, maintenance and commissioning. This one profile supports all three target jobs, plus LinkedIn and NaukriGulf profile content.</div></details>
    <section className={s.node} data-ui-service="library">
      <label htmlFor={`${id}-job`} className="type-label font-semibold text-ink">Choose a target job</label>
      <select id={`${id}-job`} className={`${control} mt-2`} value={jobIndex} onChange={event => changeJob(Number(event.target.value))}>{JOBS.map((item, i) => <option key={item.title} value={i}>3.{i + 1} · {item.title}</option>)}</select>
      <details className={s.details}><summary>View saved job title and description</summary><dl className="space-y-2 type-helper"><div><dt className="font-semibold text-ink">Job title</dt><dd className="text-ink-soft">{job.title}</dd></div><div><dt className="font-semibold text-ink">Job description</dt><dd className="text-ink-soft">{job.description}</dd></div></dl></details>
      <div className="mt-2 rounded-ctl bg-teal-soft p-3"><p className="type-caption font-semibold text-teal">Selected CV</p><p className="mt-1 type-helper text-ink">3.{jobIndex + 1} · {job.title} · Optimized Resume</p><p className="mt-1 type-caption text-ink-soft">All preparation below belongs to this CV and its saved job description.</p></div>
    </section>
    <section className={s.node} data-ui-service={service === 'letters' ? 'letter' : service === 'qa' ? 'qa' : service === 'mock' ? 'mock' : 'tailor'}>
      <label htmlFor={`${id}-service`} className="type-label font-semibold text-ink">Explore preparation for this CV</label>
      <select id={`${id}-service`} className={`${control} mt-2`} value={service} onChange={event => { setService(event.target.value as Service); setVersion(0); setNotice('') }}>{SERVICES.map(item => <option key={item.key} value={item.key}>{item.title} · {item.key === 'letters' ? `${job.letters} versions` : item.key === 'qa' ? `${job.sets} sets` : item.key === 'mock' ? `${job.sessions} sessions` : '1 CV'}</option>)}</select>
      <h3 className="mt-4 type-card font-semibold text-teal">{selectedService.title}</h3>
      <p className={text}>{selectedService.detail}</p>
      {service === 'mock' ? <>
        <label htmlFor={`${id}-session`} className="mt-4 block type-label font-semibold text-ink">Choose a practice session</label>
        <select id={`${id}-session`} className={`${control} mt-2`} value={session} onChange={event => { setSession(Number(event.target.value)); setNotice('') }}>{Array.from({ length: job.sessions }, (_, i) => <option key={i} value={i}>Session {i + 1}{i === job.sessions - 1 ? ' · Latest review' : ''}</option>)}</select>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          <div className="rounded-ctl border border-line bg-white p-3"><h4 className="flex items-center gap-2 type-label font-semibold"><MessageSquare aria-hidden="true" className="size-4 text-teal" /> Guided review · Session {session + 1}</h4><p className={text}>Sample question: {jobIndex === 2 ? 'How would you organize functional testing before handover?' : jobIndex === 0 ? 'How would you verify an instrument calibration?' : 'How would you troubleshoot an unstable transmitter signal?'}</p><p className="mt-3 type-caption font-semibold text-ink">Your sample answer</p><p className="mt-1 type-helper text-ink-soft">{session < 2 ? 'I would check the instrument and test the signal.' : 'I would confirm safe working conditions, check the supply and connections, test the signal and document the findings.'}</p><div className="mt-3 rounded-ctl bg-gold/10 p-3"><p className="type-caption font-semibold text-ink">Suggested improvement</p><p className="mt-1 type-helper text-ink-soft">{session < 2 ? 'Describe your checks in order, including safety and how you verify the result.' : 'Add a specific example and explain how you confirmed the fault was resolved.'}</p></div></div>
          <SampleProgress sessions={job.sessions} selected={session} jobIndex={jobIndex} />
        </div>
        <PracticeLoop />
        <button type="button" className="mt-3 min-h-11 rounded-ctl bg-teal px-4 py-2 type-helper font-semibold text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal focus-visible:ring-offset-2" onClick={() => { setSession(Math.min(session + 1, job.sessions - 1)); setNotice(session < job.sessions - 1 ? 'Showing the next saved sample session. Compare the answer and feedback.' : 'You reached the latest sample session. In your workspace, start another mock interview to practise your next improvement.') }}>Simulate practise again</button>
        <p role="status" className="mt-2 type-helper text-teal">{notice}</p>
      </> : service === 'cv' ? <div className="mt-3 rounded-ctl border border-line bg-white p-3"><h4 className="type-label font-semibold">Sample CV · {job.title}</h4><p className={text}>Profile experience → job-match review → optimized wording → template selection → save → PDF / DOCX.</p><p className="mt-2 type-caption text-ink-muted">Your Optimized Resume is created through Optimize Resume for a New Job. This guide shows the journey.</p></div> : <>
        <label htmlFor={`${id}-version`} className="mt-4 block type-label font-semibold text-ink">{service === 'letters' ? 'Choose a cover letter version' : 'Choose a Q&A set'}</label>
        <select id={`${id}-version`} value={version} className={`${control} mt-2`} onChange={event => setVersion(Number(event.target.value))}>{Array.from({ length: count }, (_, i) => <option key={i} value={i}>{service === 'letters' ? 'Version' : 'Set'} {i + 1} · {job.title}</option>)}</select>
        <div className="mt-3 rounded-ctl border border-line bg-white p-3">{service === 'letters' ? <><h4 className="type-label font-semibold">Sample cover letter · Version {version + 1}</h4><p className={text}>Dear Hiring Manager,</p><p className={text}>I am applying for the {job.title} position. My experience in {['instrument calibration and safe plant maintenance', 'fault diagnosis and preventive maintenance', 'functional testing and commissioning handover'][version % 3]} relates to the responsibilities described in your opening.</p><p className="mt-2 type-caption text-ink-muted">Illustrative excerpt. Review each tailored letter before sending.</p></> : <><h4 className="type-label font-semibold">Gulf-standard Q&A · Set {version + 1}</h4><p className={text}>Focus: {['Technical fundamentals', 'Safety and troubleshooting', 'Practical site scenarios', 'Teamwork and handover'][version % 4]}</p><p className="mt-3 type-helper font-semibold text-ink">{['How do you verify a calibration result?', 'What safety checks come before troubleshooting?', 'How do you investigate an intermittent fault?', 'How do you hand over unresolved technical issues?'][version % 4]}</p><p className={text}>Suggested answer approach: explain the situation, describe your checks and give a relevant example from your confirmed experience.</p><p className="mt-3 type-caption text-ink-muted">These are relevant preparation topics, not a guarantee of the questions an interviewer will ask.</p></>}</div>
      </>}
    </section>
    <p className="type-caption text-ink-muted"><ArrowDown aria-hidden="true" className="mr-1 inline size-4" /> Switch jobs to explore a separate CV, cover letters, Q&A sets and mock interview history.</p>
  </div>
}

function SampleProgress({ sessions, selected, jobIndex }: { sessions: number; selected: number; jobIndex: number }) {
  const structure = Array.from({ length: sessions }, (_, i) => 36 + i * 8 + jobIndex * 2)
  const technical = Array.from({ length: sessions }, (_, i) => 42 + i * 6 + jobIndex)
  const x = (i: number) => 32 + i * 248 / (sessions - 1)
  const y = (value: number) => 132 - value
  return <figure className="min-w-0 rounded-ctl border border-line bg-white p-3"><figcaption className="type-label font-semibold text-ink">Sample progress across mock interviews</figcaption><div className="mt-2 flex flex-wrap gap-3 type-caption"><span className={s.chartStructure}>Answer structure</span><span className={s.chartTechnical}>Technical coverage</span></div><svg viewBox="0 0 310 165" className="mt-3 w-full" role="img" aria-label={`Fictional mock interview progress across ${sessions} sessions. Selected session ${selected + 1}: answer structure ${structure[selected]}, technical coverage ${technical[selected]} out of 100.`}>{[0, 50, 100].map(value => <g key={value}><line x1="32" x2="280" y1={y(value)} y2={y(value)} stroke="currentColor" className="text-line" /><text x="3" y={y(value) + 4} fontSize="10" fill="currentColor" className="text-ink-muted">{value}</text></g>)}{[structure, technical].map((values, series) => <g key={series} className={series === 0 ? s.chartStructure : s.chartTechnical}><polyline points={values.map((v, i) => `${x(i)},${y(v)}`).join(' ')} fill="none" stroke="currentColor" strokeWidth="2" />{values.map((v, i) => <circle key={i} cx={x(i)} cy={y(v)} r={i === selected ? 5 : 3} fill="currentColor" />)}</g>)}{structure.map((_, i) => <text key={i} x={x(i)} y="152" textAnchor="middle" fontSize="10" fill="currentColor" className="text-ink-soft">{i + 1}</text>)}</svg><p className="type-caption text-ink-soft">Session {selected + 1}: structure {structure[selected]}/100 · technical coverage {technical[selected]}/100.</p><p className="mt-2 type-caption text-ink-muted">Illustrative feedback scores for this sample journey.</p></figure>
}
