'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/Button'
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

export function InterviewReport({ run }: { run: MockInterviewRun }) {
  const report = run.final_report
  if (!report) return null
  const status = statusFor(report.overall_score)
  const ref = run.id.replaceAll('-', '').slice(0, 10).toUpperCase()
  const completed = new Date(run.completed_at ?? run.generated_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
  const fallbackSummary = `${status.label}. Your strongest signals are ${report.strengths.slice(0, 2).join(' and ').toLowerCase() || 'still emerging'}. Your first priority is ${report.weak_points[0]?.toLowerCase() || 'to add specific evidence and results to each answer'}.`
  const scoreFallback: Record<ScoreKey, string> = {
    technical: 'Measures how clearly your answers demonstrate role knowledge, methods and problem-solving evidence.',
    role_fit: 'Measures how directly your experience and examples match the target role.',
    gulf_readiness: 'Measures how clearly your answers address Gulf workplace, client and site expectations.',
    answer_structure: 'Measures whether answers are focused, specific and easy for an interviewer to follow.',
  }

  return <div className="mt-5 space-y-5">
    <section className="overflow-hidden rounded-card border border-[#C7A96A] bg-[#0C302F] text-white shadow-m-3">
      <div className="flex flex-wrap items-start justify-between gap-4 border-b border-white/15 px-5 py-4 sm:px-7">
        <div><p className="font-display text-[22px] font-semibold">GCC MENTOR</p><p className="mt-0.5 text-[10px] font-semibold tracking-[0.16em] text-[#B8D5CF]">INTERVIEW READINESS RECORD</p></div>
        <ShareMenu run={run} />
      </div>
      <div className="grid gap-6 px-5 py-6 sm:grid-cols-[1fr_230px] sm:px-7 sm:py-8">
        <div>
          <p className="text-[11px] font-semibold tracking-[0.12em] text-[#D6B36A]">PRACTICE ASSESSMENT</p>
          <div className="mt-3 flex items-end gap-2"><strong className="font-display text-7xl leading-none sm:text-8xl">{report.overall_score}</strong><span className="pb-2 text-lg text-[#B8D5CF]">/100</span></div>
          <p className="mt-3 max-w-[520px] text-[13px] leading-relaxed text-[#DCE8E5]">AI-guided preparation feedback based on this interview. It is not an employer assessment or hiring prediction.</p>
        </div>
        <div className="flex items-center gap-4 rounded-card border border-white/15 bg-white/[0.06] p-4 sm:flex-col sm:justify-center sm:text-center">
          <div className="grid size-20 shrink-0 place-items-center rounded-full border-[7px] border-[#D6B36A] bg-[#153E3B] font-display text-2xl font-semibold">{report.overall_score}</div>
          <div><p className="font-display text-[20px] font-semibold">{status.label}</p><p className="mt-1 text-[11px] text-[#B8D5CF]">{status.note}</p></div>
        </div>
      </div>
      <div className="grid gap-2 border-t border-white/15 bg-black/10 px-5 py-3 text-[10px] text-[#AFCBC5] sm:grid-cols-3 sm:px-7">
        <span>Assessment ref {ref}</span><span className="sm:text-center">{run.mode.replaceAll('_', ' ')} · {run.difficulty}</span><span className="sm:text-right">Completed {completed}</span>
      </div>
    </section>

    <section className="rounded-card border border-line bg-[#F4EFE4] p-4 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3"><div><p className="text-[11px] font-bold text-gold-text">EXECUTIVE ASSESSMENT</p><h3 className="mt-1 font-display text-[24px] font-semibold text-ink">Where you stand now</h3></div><span className="rounded-full bg-white px-3 py-1.5 text-[11px] font-bold text-teal shadow-m-1">{status.label}</span></div>
      <p className="mt-4 text-[14px] leading-7 text-ink-soft">{report.executive_summary || fallbackSummary}</p>
      <div className="mt-4 border-t border-[#D6B36A]/50 pt-4"><p className="text-[11px] font-bold text-gold-text">WORK ON THIS FIRST</p><p className="mt-1 text-[13px] font-semibold leading-relaxed text-ink">{report.priority_focus || report.improvement_plan[0] || 'Build one clear situation–action–result example for the weakest answer.'}</p></div>
    </section>

    <section>
      <div className="mb-3"><h3 className="font-display text-[21px] font-semibold text-ink">Score diagnosis</h3><p className="mt-1 text-[12px] text-ink-muted">What each score says about this interview and why it matters.</p></div>
      <div className="grid gap-3 sm:grid-cols-2">
        {SCORE_ROWS.map(row => {
          const value = Number(report[row.field])
          return <article key={row.key} className="rounded-card border border-line bg-white p-4 shadow-m-1">
            <div className="flex items-center justify-between gap-3"><h4 className="text-[13px] font-bold text-ink">{row.label}</h4><strong className="font-mono text-lg text-teal">{value}</strong></div>
            <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-line"><div className="h-full rounded-full bg-teal" style={{ width: `${value}%` }} /></div>
            <p className="mt-3 text-[12px] leading-relaxed text-ink-muted">{report.score_explanations?.[row.key] || scoreFallback[row.key]}</p>
          </article>
        })}
      </div>
    </section>

    <div className="grid gap-4 sm:grid-cols-2">
      <ListSection title="Strongest signals" intro="What already works in your answers" items={report.strengths} tone="positive" />
      <ListSection title="Where you lose marks" intro="Specific gaps reducing your impact" items={report.weak_points} tone="warning" />
    </div>
    <ListSection title="Answers that need care" intro="Claims, gaps or wording to correct before a real interview" items={report.risky_answers} tone="warning" />
    <ListSection title="Your improvement plan" intro="Complete these in order, then repeat the interview" items={report.improvement_plan} ordered />
    <ListSection title="Questions to practise next" intro="Use specific examples and say the answers aloud" items={report.next_practice_questions} ordered />
  </div>
}
