'use client'

import Link from 'next/link'
import {IntakeQuestions} from '@/components/gulfReadiness/IntakeQuestions'
import {applyIntakeAnswers,intakeProfileReadiness,INTAKE_KEY,type CareerIntake} from '@/lib/careerIntake/shared'
import {calculatePreparation} from '@/lib/gulfReadiness/preparation'
import { ArrowUpTrayIcon, ClipboardDocumentIcon, CheckCircleIcon } from '@heroicons/react/24/outline'
import { useRef, useState, useEffect, type ChangeEvent, type DragEvent } from 'react'
import { buttonVariants } from '@/components/ui/Button'
import { ScorecardResult } from '@/components/gulfReadiness/ScorecardResult'
import { saveHandoff,clearHandoff } from '@/lib/gulfReadiness/handoff'
import type { FunnelAnswers, GulfReadinessResult } from '@/lib/gulfReadiness/types'
import { ProcessingOrbit, ProcessingSteps } from '@/components/ui/Processing'
import { SCAN_NOTES } from '@/lib/processingNotes'

/** One resume extraction feeds both scorecards and the signup draft.
 * Guest facts remain in this tab until the user signs in and confirms them.
 */
type Step = 'upload' | 'intake' | 'analyzing' | 'result'

const MAX_TEXT = 20000
const MIN_TEXT = 50

const ANALYZE_STEPS = ['Reading your resume', 'Organising your career history', 'Finding details to confirm']

const Shell = ({ children, wide }: { children: React.ReactNode; wide?: boolean }) => (
  <main className="min-h-dvh bg-canvas text-ink">
    <header className="border-b border-line bg-canvas/95">
      <div className="page-gutter mx-auto flex min-h-[64px] max-w-[1100px] flex-wrap items-center justify-between gap-2 py-2 sm:min-h-[72px] sm:px-8">
        <Link href="/" className="flex items-center gap-2.5">
          <span className="font-display flex h-9 w-9 items-center justify-center rounded-ctl bg-teal text-lg text-white">G</span>
          <span className="font-bold tracking-wide">GCC MENTOR</span>
        </Link>
        {/* 44px tall and emerald, like "Log in" everywhere else. It was a 20px
            grey line, easy to miss for the returning user it exists for. */}
        <Link
          href="/login"
          className="inline-flex min-h-11 items-center rounded-ctl px-2.5 text-sm font-semibold text-teal hover:bg-teal-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal"
        >
          Log in
        </Link>
      </div>
    </header>
    <div className={`page-gutter mx-auto py-8 sm:px-8 sm:py-12 lg:py-16 ${wide ? 'max-w-[820px]' : 'max-w-[600px]'}`}>{children}</div>
  </main>
)

export default function GulfReadinessScorePage() {
  const fileInput = useRef<HTMLInputElement>(null)
  const intakeBusy = useRef(false)
  const [intake,setIntake]=useState<CareerIntake|null>(null)
  const keepIntake=(value:CareerIntake)=>{setIntake(value);try{sessionStorage.setItem(INTAKE_KEY,JSON.stringify(value))}catch{/* Browser-only draft persistence is unavailable. */}}
  useEffect(()=>{
    try{
      const stored=JSON.parse(sessionStorage.getItem(INTAKE_KEY)??'null')
      if(stored?.version===1&&['work_experience','education','skills','additional_information'].every(key=>Array.isArray(stored.draft?.[key]))&&stored.context&&typeof stored.resumeText==='string'){
        setIntake(stored)
        const handoff=JSON.parse(sessionStorage.getItem('gulf_readiness_handoff')??'null')
        if(handoff?.result?.preparation){setResult(handoff.result);setStep('result')}else setStep('intake')
      }
    }catch{/* Start normally when a draft is unavailable or malformed. */}
  },[])
  const [step, setStep] = useState<Step>('upload')
  const [file, setFile] = useState<File | null>(null)
  const [pasteMode, setPasteMode] = useState(false)
  const [resumeText, setResumeText] = useState('')
  const [dragging, setDragging] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<GulfReadinessResult | null>(null)

  const chooseFile = (next: File | null) => {
    setError(null)
    if (!next) return
    const lower = next.name.toLowerCase()
    if (!/\.(pdf|docx)$/.test(lower)) { setFile(null); return setError('Choose a PDF or Word (.docx) file.') }
    const maxMb = lower.endsWith('.docx') ? 2 : 4
    if (next.size > maxMb * 1024 * 1024) { setFile(null); return setError(`Your ${maxMb === 2 ? 'Word' : 'PDF'} resume must be ${maxMb}MB or smaller. Choose a smaller file or paste its text.`) }
    setFile(next)
    setPasteMode(false)
  }

  const startQuestions = async () => {
    if(intakeBusy.current)return
    setError(null)
    if (!pasteMode && !file) return setError('Choose a PDF or Word (.docx) resume to continue.')
    if (pasteMode && resumeText.trim().length < MIN_TEXT) return setError('Paste at least 50 characters of resume text to continue.')
    if (pasteMode && resumeText.length > MAX_TEXT) return setError('Pasted resume text must be 20,000 characters or fewer.')
    intakeBusy.current=true;setStep('analyzing')
    const body=new FormData()
    if(!pasteMode&&file)body.append('file',file);else body.append('resume_text',resumeText.trim())
    try{
      const response=await fetch('/api/career-intake',{method:'POST',body})
      const payload=await response.json()
      if(!response.ok||!payload.intake)throw new Error(payload.error||'We could not read your resume. Please retry.')
      clearHandoff();setResult(null);keepIntake(payload.intake);setStep('intake')
    }catch(e){setError(e instanceof Error?e.message:'Could not read the resume.');setStep('upload')}
    finally{intakeBusy.current=false}
  }
  const finishIntake=()=>{
    if(!intake)return
    const draft=applyIntakeAnswers(intake.draft,intake.context)
    const updated={...intake,draft}
    const c=intake.context
    const computed=calculatePreparation({...draft,education:draft.education,skills:draft.skills,work_experience:draft.work_experience.map(w=>({...w,highlights:w.highlights??[]}))},c)
    const answers:FunnelAnswers={hasGulfExperience:c.hasGulfExperience===true,currentlyInGulf:c.currentlyInGulf===true,hasProfessionalExperience:c.careerStage==='experienced',targetCountry:c.targetCountry,targetJobTitle:c.profession}
    try{sessionStorage.setItem(INTAKE_KEY,JSON.stringify(updated))}catch{/* Result remains visible; handoff warns that storage may be unavailable. */}
    saveHandoff({answers,result:computed,resumeText:intake.resumeText})
    setIntake(updated);setResult(computed);setStep('result')
  }

  // ---- steps ----------------------------------------------------------------
  if (step === 'upload') {
    return (
      <Shell>
        <div className="text-center">
          <p className="text-[12px] font-bold uppercase tracking-[0.2em] text-gold-ink type-caption">Free Gulf readiness score</p>
          <h1 className="mt-3 type-title text-ink">How Gulf-ready is your career?</h1>
          <p className="mt-3 type-body text-ink-soft">
            Upload your resume to see your strengths and preparation gaps. See your score before signup.
          </p>
        </div>

        <div className="mt-6 rounded-card border border-line bg-white p-4 sm:p-6">
          <div role="group" aria-label="Resume input method" className="grid grid-cols-2 gap-2 rounded-ctl bg-canvas p-1">
            {[{ paste: false, label: 'Upload resume', Icon: ArrowUpTrayIcon }, { paste: true, label: 'Paste text', Icon: ClipboardDocumentIcon }].map(({ paste, label, Icon }) => <button
              key={label} type="button" aria-pressed={pasteMode === paste} aria-controls="resume-input-panel"
              onClick={() => { setPasteMode(paste); setDragging(false); setError(null) }}
              className={`flex min-h-12 min-w-0 items-center justify-center gap-2 rounded-ctl border px-2 py-3 text-sm font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal ${pasteMode === paste ? 'border-teal bg-teal text-white' : 'border-transparent bg-transparent text-ink-soft hover:bg-teal-soft'}`}>
              <Icon className="size-4 shrink-0" aria-hidden="true" /><span>{label}</span>
            </button>)}
          </div>

          <div id="resume-input-panel">
          {pasteMode ? (
            <div id="resume-paste" className="mt-5">
              <label htmlFor="readiness-resume-text" className="field-label">Paste your resume text</label>
              <p id="resume-text-hint" className="mt-1 text-sm leading-relaxed text-ink-soft type-helper">Include your experience, skills and education. Use 50–20,000 characters.</p>
              <textarea id="readiness-resume-text" value={resumeText}
                onChange={(event) => { setResumeText(event.target.value); if (error) setError(null) }}
                maxLength={MAX_TEXT} rows={8} placeholder="Paste your resume here…"
                aria-invalid={Boolean(error)} aria-describedby={`resume-text-hint resume-text-count${error ? ' resume-input-error' : ''}`}
                style={{ height: 240, minHeight: 200, maxHeight: 320 }} className="field mt-3 w-full resize-y overflow-y-auto p-3.5 font-normal" />
              <p id="resume-text-count" className="mt-1 text-right text-xs text-ink-muted type-caption">{resumeText.length.toLocaleString()} / {MAX_TEXT.toLocaleString()} characters</p>
            </div>
          ) : (
            <div id="resume-upload" className="mt-5">
              <div className={`rounded-card border-2 border-dashed px-4 py-6 text-center transition-colors sm:p-7 ${dragging ? 'border-gold bg-gold-soft' : 'border-line-strong bg-canvas/40'}`}
                onDragOver={(event: DragEvent) => { event.preventDefault(); setDragging(true) }}
                onDragLeave={() => setDragging(false)}
                onDrop={(event: DragEvent) => { event.preventDefault(); setDragging(false); chooseFile(event.dataTransfer.files[0] ?? null) }}>
                <input ref={fileInput} id="readiness-resume-file" type="file" accept=".pdf,.docx" className="sr-only" tabIndex={-1} aria-label="Upload resume file"
                  aria-describedby={`resume-upload-hint${error ? ' resume-input-error' : ''}`} aria-invalid={Boolean(error)}
                  onChange={(event: ChangeEvent<HTMLInputElement>) => { chooseFile(event.target.files?.[0] ?? null); event.target.value = '' }} />
                {file ? <CheckCircleIcon className="mx-auto size-8 text-ok" aria-hidden="true" /> : <ArrowUpTrayIcon className="mx-auto size-8 text-teal" aria-hidden="true" />}
                <h2 className="mt-3 break-words font-display type-card text-ink">{file ? file.name : 'Choose your resume'}</h2>
                <p id="resume-upload-hint" className="mt-2 text-sm text-ink-soft type-helper">PDF up to 4MB · Word (.docx) up to 2MB</p>
                <button type="button" onClick={() => fileInput.current?.click()} className={buttonVariants({ variant: 'secondary', size: 'sm' }) + ' mt-4'}>{file ? 'Change file' : 'Choose a file'}</button>
                <p className="mt-3 text-xs text-ink-muted type-caption">Or drag and drop here.</p>
              </div>
            </div>
          )}
          </div>
          {error ? <p id="resume-input-error" role="alert" className="mt-3 rounded-ctl border border-alert bg-alert-soft px-4 py-3 text-sm text-alert type-helper">{error}</p> : null}
          <button type="button" onClick={startQuestions} className={buttonVariants({ variant: 'primary' }) + ' mt-4 w-full'}>Continue</button>
          <p className="mt-4 text-center text-sm"><Link href="/signup" className="text-teal underline">No resume? Create your free Career Profile</Link></p>
          <p className="mt-4 text-center text-xs leading-relaxed text-ink-muted type-caption">We read your resume to extract career details. Your draft stays in this tab until signup; no profile is saved. Each reading uses one daily scan.</p>
        </div>
      </Shell>
    )
  }

  if(step==='intake'&&intake)return <Shell><IntakeQuestions intake={intake} onChange={keepIntake} onFinish={finishIntake} onBack={()=>setStep('upload')}/></Shell>

  if (step === 'analyzing') {
    return (
      <Shell>
        {/* All three steps used to pulse at once, so the screen never looked
            like it was getting anywhere. They now advance in order and hold on
            the last until the score arrives. */}
        <div className="flex flex-col items-center gap-6 py-12 text-center">
          <ProcessingOrbit size={168} />
          <div>
            <p className="text-[12px] font-bold uppercase tracking-[0.2em] text-gold-ink type-caption">Building your scorecard</p>
            <h1 className="mt-3 type-title">Reading your career details</h1>
          </div>
          <div className="w-full max-w-sm text-left">
            <ProcessingSteps steps={ANALYZE_STEPS} stepMs={1600} notes={SCAN_NOTES} />
          </div>
        </div>
      </Shell>
    )
  }

  // result
  return (
    <Shell wide>
      <div className="mb-6 text-center">
        <p className="text-[12px] font-bold uppercase tracking-[0.2em] text-gold-ink type-caption">Your Gulf readiness</p>
        <h1 className="mt-3 type-title">Here&rsquo;s where your career stands</h1>
      </div>
      {intake ? <section className="mb-5 rounded-card border border-line bg-white p-5"><div className="flex items-center justify-between gap-3"><div><p className="text-sm font-semibold text-teal">Profile Readiness · initial career draft</p><p className="mt-2 text-sm text-ink-soft">{intake.draft.work_experience.length} {intake.draft.work_experience.length===1?'role':'roles'} · {intake.draft.skills.length} {intake.draft.skills.length===1?'skill':'skills'} · {intake.draft.education.length} {intake.draft.education.length===1?'qualification':'qualifications'}</p></div><span className="font-mono text-3xl font-bold text-teal">{intakeProfileReadiness(intake.draft,intake.context).score}<span className="text-sm text-ink-muted">%</span></span></div><p className="mt-3 text-sm text-ink-soft">Review your extracted details before saving your Career Profile.</p><p className="mt-2 text-sm text-ink-muted">{intakeProfileReadiness(intake.draft,intake.context).missing.length} career sections or details to complete. Full details unlock with your free account.</p><button type="button" className="mt-2 min-h-11 text-sm font-semibold text-teal" onClick={()=>{clearHandoff();setStep('intake')}}>Edit my preparation answers</button></section> : null}
      {result ? <ScorecardResult result={result} locked /> : null}
    </Shell>
  )
}
