'use client'

import { useEffect, useRef, useState, type ReactNode } from 'react'
import { ArrowLeft, ChevronRight, BarChart3, FileCheck2, Sparkles, Target, ShieldCheck, Lightbulb, MessagesSquare, MessageSquare } from 'lucide-react'
import { CoachingCards } from './CoachingCards'
import { InterviewAnswerCards } from './InterviewAnswerCards'
import type { MockInterviewFinalReport, MockInterviewRun } from '@/types/package'

type ScoreKey = 'technical' | 'role_fit' | 'gulf_readiness' | 'answer_structure'

const SCORE_ROWS: Array<{ key: ScoreKey; label: string; field: keyof MockInterviewFinalReport }> = [
  { key: 'technical', label: 'Technical command', field: 'technical_score' },
  { key: 'role_fit', label: 'Role fit', field: 'role_fit_score' },
  { key: 'gulf_readiness', label: 'Gulf readiness', field: 'gulf_readiness_score' },
  { key: 'answer_structure', label: 'Answer structure', field: 'answer_structure_score' },
]

function statusFor(score: number) {
  if (score >= 85) return { label: 'Strongly prepared', note: 'Polish and maintain', color: '#2D7A62' }
  if (score >= 70) return { label: 'Interview ready', note: 'Targeted refinement', color: '#0F5A55' }
  if (score >= 50) return { label: 'Developing', note: 'Focused practice needed', color: '#9A681C' }
  return { label: 'Foundation stage', note: 'Rebuild core answers', color: '#A34536' }
}

function escapeXml(value: string) {
  return value.replace(/[<>&'"]/g, char => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', "'": '&apos;', '"': '&quot;' })[char]!)
}

function cardSvg(run: MockInterviewRun) {
  const report = run.final_report!
  const score = Math.max(0, Math.min(100, Math.round(report.overall_score)))
  const status = statusFor(score)
  const ref = run.id.replaceAll('-', '').slice(0, 10).toUpperCase()
  const date = new Date(run.completed_at ?? run.generated_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
  const statusWords = status.label.split(' ')
  const statusLabel = statusWords.length > 1
    ? `<text text-anchor="middle" fill="#102E2D" font-family="Georgia,serif" font-size="22" font-weight="700"><tspan x="760" y="358">${escapeXml(statusWords[0])}</tspan><tspan x="760" y="384">${escapeXml(statusWords.slice(1).join(' '))}</tspan></text>`
    : `<text x="760" y="378" text-anchor="middle" fill="#102E2D" font-family="Georgia,serif" font-size="23" font-weight="700">${escapeXml(status.label)}</text>`
  const scores = SCORE_ROWS.map(row => ({ label: row.label, value: Number(report[row.field]) }))
  const bars = scores.map((item, index) => {
    const y = 680 + index * 68
    return `<text x="110" y="${y}" fill="#DCE8E5" font-family="Arial,sans-serif" font-size="24">${escapeXml(item.label)}</text><rect x="440" y="${y - 20}" width="430" height="14" rx="7" fill="#244E4B"/><rect x="440" y="${y - 20}" width="${Math.round(430 * item.value / 100)}" height="14" rx="7" fill="#D6B36A"/><text x="922" y="${y}" text-anchor="end" fill="#FFFFFF" font-family="Arial,sans-serif" font-size="25" font-weight="700">${item.value}</text>`
  }).join('')
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1080" height="1080" viewBox="0 0 1080 1080"><rect width="1080" height="1080" rx="42" fill="#0B302F"/><rect x="42" y="42" width="996" height="996" rx="28" fill="none" stroke="#D6B36A" stroke-width="2"/><path d="M82 180H998" stroke="#335A56"/><text x="82" y="112" fill="#FFFFFF" font-family="Georgia,serif" font-size="40" font-weight="700">GCC MENTOR</text><text x="82" y="150" fill="#AFCBC5" font-family="Arial,sans-serif" font-size="18" letter-spacing="3">INTERVIEW READINESS RECORD</text><text x="998" y="112" text-anchor="end" fill="#D6B36A" font-family="Arial,sans-serif" font-size="18">PRACTICE ASSESSMENT</text><rect x="82" y="230" width="916" height="350" rx="24" fill="#F5F0E7"/><text x="118" y="285" fill="#63716D" font-family="Arial,sans-serif" font-size="20">PREPARATION SCORE</text><text x="118" y="440" fill="#102E2D" font-family="Georgia,serif" font-size="160" font-weight="700">${score}</text><text x="335" y="437" fill="#63716D" font-family="Arial,sans-serif" font-size="32">/100</text><line x1="530" y1="275" x2="530" y2="535" stroke="#D8D0C2"/><circle cx="760" cy="370" r="102" fill="none" stroke="#DED5C5" stroke-width="18"/><circle cx="760" cy="370" r="102" fill="none" stroke="${status.color}" stroke-width="18" stroke-linecap="round" stroke-dasharray="${score * 6.41} 641" transform="rotate(-90 760 370)"/><circle cx="760" cy="370" r="72" fill="#FFFFFF"/>${statusLabel}<text x="760" y="515" text-anchor="middle" fill="#63716D" font-family="Arial,sans-serif" font-size="17">${escapeXml(status.note)}</text><text x="110" y="625" fill="#D6B36A" font-family="Arial,sans-serif" font-size="18" letter-spacing="2">SCORE PROFILE</text>${bars}<path d="M82 978H998" stroke="#335A56"/><text x="82" y="1018" fill="#AFCBC5" font-family="Arial,sans-serif" font-size="17">Assessment ref ${ref} · ${date}</text><text x="998" y="1018" text-anchor="end" fill="#AFCBC5" font-family="Arial,sans-serif" font-size="17">AI-guided practice · Not an employer decision</text></svg>`
}

async function cardPng(run: MockInterviewRun): Promise<File> {
  const svgUrl = URL.createObjectURL(new Blob([cardSvg(run)], { type: 'image/svg+xml' }))
  try {
    const image = new Image()
    image.src = svgUrl
    await image.decode()
    const canvas = document.createElement('canvas')
    canvas.width = 1080; canvas.height = 1080
    canvas.getContext('2d')!.drawImage(image, 0, 0)
    const blob = await new Promise<Blob>((resolve, reject) => canvas.toBlob(value => value ? resolve(value) : reject(new Error('Could not create share card.')), 'image/png', 0.94))
    return new File([blob], 'gcc-mentor-interview-readiness.png', { type: 'image/png' })
  } finally { URL.revokeObjectURL(svgUrl) }
}

function ShareMenu({ run }: { run: MockInterviewRun }) {
  const [message, setMessage] = useState('')
  const score = run.final_report!.overall_score
  const shareText = `I completed a GCC MENTOR interview practice assessment and scored ${score}/100. Practice result—not an employer assessment.`

  function openSocial(target: 'whatsapp' | 'facebook' | 'telegram') {
    const encodedText = encodeURIComponent(shareText)
    const encodedUrl = encodeURIComponent(window.location.href)
    const urls = {
      whatsapp: `https://wa.me/?text=${encodedText}%20${encodedUrl}`,
      facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`,
      telegram: `https://t.me/share/url?url=${encodedUrl}&text=${encodedText}`,
    }
    window.open(urls[target], '_blank', 'noopener,noreferrer')
  }

  async function shareAnywhere() {
    setMessage('')
    try {
      const file = await cardPng(run)
      if (navigator.share && (!navigator.canShare || navigator.canShare({ files: [file] }))) {
        await navigator.share({ title: 'My GCC MENTOR interview readiness', text: shareText, files: [file] })
        return
      }
      setMessage('Use a social link below, or download the card to share in any app.')
    } catch (error) {
      if ((error as DOMException)?.name !== 'AbortError') setMessage('Sharing was unavailable. Download the card or choose a social app below.')
    }
  }
  async function download() {
    const file = await cardPng(run)
    const url = URL.createObjectURL(file)
    const link = document.createElement('a'); link.href = url; link.download = file.name; link.click()
    setTimeout(() => URL.revokeObjectURL(url), 1000)
  }
  async function copyLink() {
    await navigator.clipboard.writeText(window.location.href)
    setMessage('Report link copied. The recipient must sign in to view the private report.')
  }
  return <details className="relative">
    <summary className="inline-flex min-h-11 cursor-pointer list-none items-center gap-2 rounded-ctl border border-[#D6B36A]/60 bg-white/10 px-4 text-[13px] font-bold text-white transition-colors hover:bg-white/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F0D9A4] [&::-webkit-details-marker]:hidden">
      <svg className="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><path d="m8.6 10.5 6.8-4M8.6 13.5l6.8 4"/></svg>
      Share result
    </summary>
    <div className="absolute right-0 z-20 mt-2 w-[260px] rounded-card border border-line bg-white p-2 text-ink shadow-m-3">
      <button type="button" onClick={() => void shareAnywhere()} className="flex min-h-11 w-full items-center rounded-ctl px-3 text-left text-[13px] font-semibold hover:bg-teal-soft">Share card to any app</button>
      <button type="button" onClick={() => openSocial('whatsapp')} className="flex min-h-11 w-full items-center rounded-ctl px-3 text-left text-[13px] font-semibold hover:bg-teal-soft">WhatsApp</button>
      <button type="button" onClick={() => openSocial('facebook')} className="flex min-h-11 w-full items-center rounded-ctl px-3 text-left text-[13px] font-semibold hover:bg-teal-soft">Facebook</button>
      <button type="button" onClick={() => openSocial('telegram')} className="flex min-h-11 w-full items-center rounded-ctl px-3 text-left text-[13px] font-semibold hover:bg-teal-soft">Telegram</button>
      <button type="button" onClick={() => void copyLink()} className="flex min-h-11 w-full items-center rounded-ctl px-3 text-left text-[13px] font-semibold hover:bg-teal-soft">Copy private report link</button>
      <button type="button" onClick={() => void download()} className="flex min-h-11 w-full items-center rounded-ctl px-3 text-left text-[13px] font-semibold hover:bg-teal-soft">Download PNG card</button>
      <p className="px-3 py-2 text-[11px] leading-relaxed text-ink-muted">Instagram is available through “Share card to any app” on supported phones.</p>
      {message ? <p role="status" className="rounded-ctl bg-canvas px-3 py-2 text-[11px] leading-relaxed text-ink-muted">{message}</p> : null}
    </div>
  </details>
}

function ListSection({ title, intro, items, tone = 'neutral', ordered = false }: { title: string; intro?: string; items: string[]; tone?: 'neutral' | 'positive' | 'warning'; ordered?: boolean }) {
  if (!items.length) return null
  const accent = tone === 'positive' ? 'bg-ok' : tone === 'warning' ? 'bg-gold' : 'bg-teal'
  const List = ordered ? 'ol' : 'ul'
  return <section className="rounded-card border border-line bg-white p-4 shadow-m-1 sm:p-5">
    <div className="flex items-center gap-3"><span className={`h-8 w-1 rounded-full ${accent}`} /><div><h3 className="font-display text-[18px] font-semibold text-ink">{title}</h3>{intro ? <p className="mt-0.5 text-[12px] text-ink-muted">{intro}</p> : null}</div></div>
    <List className="mt-4 space-y-3">
      {items.map((item, index) => <li key={`${index}-${item}`} className="flex gap-3 text-[13px] leading-relaxed text-ink-soft"><span className="mt-0.5 font-mono text-[11px] font-semibold text-teal">{ordered ? String(index + 1).padStart(2, '0') : '•'}</span><span>{item}</span></li>)}
    </List>
  </section>
}

type ReportView = 'overview' | 'assessment' | 'scores' | 'strengths' | 'gaps' | 'care' | 'plan' | 'practice' | 'answers'

export function InterviewReport({ run, answers }: { run: MockInterviewRun; answers?: ReactNode }) {
  const [view, setView] = useState<ReportView>('overview')
  const heading = useRef<HTMLHeadingElement>(null)
  useEffect(() => { if (view !== 'overview') heading.current?.focus() }, [view])
  const report = run.final_report
  if (!report) return null
  const status = statusFor(report.overall_score)
  const completed = new Date(run.completed_at ?? run.generated_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
  const sections = [
    { id: 'assessment', title: 'Your assessment', intro: 'Where you stand and your first priority', icon: FileCheck2, color: 'bg-teal-soft text-teal' },
    { id: 'scores', title: 'Score breakdown', intro: 'Understand all four skill areas', icon: BarChart3, color: 'bg-blue-soft text-blue' },
    { id: 'answers', title: 'Your answers', intro: `${run.questions.length} question cards · explore one at a time`, icon: MessageSquare, color: 'bg-violet-50 text-violet-700' },
    { id: 'strengths', title: 'Your strengths', intro: `${report.strengths.length} signals to build on`, icon: Sparkles, color: 'bg-teal-soft text-teal' },
    { id: 'gaps', title: 'Improve these areas', intro: `${report.weak_points.length} opportunities to practise`, icon: Target, color: 'bg-gold-soft text-gold-text' },
    { id: 'plan', title: 'Your practice plan', intro: 'Small actions for the next interview', icon: Lightbulb, color: 'bg-gold-soft text-gold-text' },
    { id: 'care', title: 'Answers to handle carefully', intro: `${report.risky_answers.length} points to check before an interview`, icon: ShieldCheck, color: 'bg-alert-soft text-alert' },
    { id: 'practice', title: 'Next challenge', intro: `${report.next_practice_questions.length} questions to rehearse`, icon: MessagesSquare, color: 'bg-cyan-50 text-cyan-800' },
  ] as const
  const active = sections.find(section => section.id === view)
  const summary = report.executive_summary || `${status.label}. Focus next on ${report.weak_points[0] || 'specific evidence and clear examples'}.`
  return <section id="interview-report" className="space-y-4" aria-label="Interview result explorer">
    <div className="ui-card rounded-card border border-teal/20 bg-[#0C302F] p-4 text-white sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-xs text-[#B8D5CF]">YOUR PRACTICE RESULT</p><h2 className="mt-1 type-section">{status.label}</h2><p className="mt-2 text-sm text-[#DCE8E5]">{run.mode.replaceAll('_', ' ')} · {run.difficulty} · {completed}</p></div><ShareMenu run={run} /></div>
      <div className="mt-5 flex items-center gap-4"><div className="relative grid size-20 shrink-0 place-items-center"><svg viewBox="0 0 80 80" className="absolute inset-0 size-full -rotate-90" aria-hidden="true"><circle cx="40" cy="40" r="34" fill="none" stroke="#335A56" strokeWidth="6" /><circle cx="40" cy="40" r="34" fill="none" stroke="#D6B36A" strokeWidth="6" strokeDasharray={`${report.overall_score * 2.136} 213.6`} strokeLinecap="round" /></svg><span className="text-2xl font-semibold">{report.overall_score}</span></div><div><p>Overall score · {report.overall_score}/100</p><p className="mt-1 text-sm text-[#B8D5CF]">{status.note}. Open a card to explore your feedback.</p></div></div>
    </div>
    {view === 'overview' ? <div className="space-y-3"><h3 className="type-card">Choose what to explore</h3><div className="grid grid-cols-2 gap-3 lg:grid-cols-3" aria-label="Result cards">
      {sections.map(section => <button key={section.id} type="button" onClick={() => setView(section.id)} className="group ui-card min-w-0 rounded-card border border-line bg-white p-4 text-left transition-colors hover:border-teal hover:bg-teal-soft/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal">
        <span className={`grid size-11 place-items-center rounded-xl ${section.color}`}><section.icon size={22} aria-hidden="true" /></span><span className="mt-4 block type-card">{section.title}</span><span className="mt-2 block type-helper text-ink-muted">{section.intro}</span><span className="mt-4 flex items-center justify-between text-sm text-teal">Explore<ChevronRight size={17} aria-hidden="true" /></span>
      </button>)}
    </div></div> : <div className="space-y-4">
      <button type="button" onClick={() => setView('overview')} className="inline-flex min-h-11 items-center gap-2 text-teal hover:underline"><ArrowLeft size={17} aria-hidden="true" />Back to result cards</button>
      <h2 ref={heading} tabIndex={-1} className="type-section outline-none">{active?.title}</h2>
      {view === 'assessment' && <div className="ui-card rounded-card border border-line bg-white p-4"><h3 className="type-card">Where you stand now</h3><p className="mt-3 whitespace-pre-wrap text-ink-soft">{summary}</p><div className="mt-4 border-t border-line pt-4"><h3 className="type-card text-gold-text">Work on this first</h3><p className="mt-3 whitespace-pre-wrap text-ink-soft">{report.priority_focus || report.improvement_plan[0] || 'Build one clear situation–action–result example.'}</p></div></div>}
      {view === 'scores' && <div className="grid gap-3 sm:grid-cols-2">{SCORE_ROWS.map(row => <article key={row.key} className="ui-card rounded-card border border-line bg-white p-4"><div className="flex items-start justify-between gap-3"><h3 className="type-card">{row.label}</h3><span className="text-teal">{Number(report[row.field])}/100</span></div><div className="mt-4 h-2 overflow-hidden rounded-full bg-line"><div className="h-full rounded-full bg-teal" style={{ width: `${Number(report[row.field])}%` }} /></div><p className="mt-4 text-ink-soft">{report.score_explanations?.[row.key] || 'Use the answer feedback to build specific evidence for this area.'}</p></article>)}</div>}
      {view === 'strengths' && (report.strengths.length ? <ListSection title="Strongest signals" items={report.strengths} tone="positive" /> : <p className="ui-card rounded-card border border-line bg-white p-4">No specific strengths were identified in this attempt. Use the practice plan to build your next examples.</p>)}
      {view === 'gaps' && (report.weak_points.length ? <ListSection title="Where to focus" items={report.weak_points} tone="warning" /> : <p>No specific gaps were identified in this report.</p>)}
      {view === 'care' && (report.risky_answers.length ? <ListSection title="Check these points" items={report.risky_answers} tone="warning" /> : <p>No specific caution points were identified in this report.</p>)}
      {view === 'plan' && (report.improvement_plan.length ? <CoachingCards items={report.improvement_plan} title="Your improvement plan" /> : <p>No practice actions were saved for this attempt.</p>)}
      {view === 'practice' && (report.next_practice_questions.length ? <CoachingCards items={report.next_practice_questions} title="Questions to practise next" /> : <p>No follow-up questions were saved for this attempt.</p>)}
      {view === 'answers' && (answers ?? <InterviewAnswerCards run={run} />)}
    </div>}
    <p className="text-xs text-ink-muted">AI-guided practice feedback, not an employer assessment or hiring prediction. All content comes from this saved interview.</p>
  </section>
}
