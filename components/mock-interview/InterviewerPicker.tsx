'use client'
import Image from 'next/image'
import { INTERVIEWERS, type InterviewerId } from '@/lib/voice/interviewers'

export function InterviewerPicker({ value, onChange, disabled }: { value: InterviewerId; onChange: (id: InterviewerId) => void; disabled?: boolean }) {
  return <fieldset disabled={disabled} className="space-y-3">
    <legend className="field-label">Choose your interviewer</legend>
    <p className="text-sm text-ink-muted">Choose a British, South Asian or Gulf Arab host. All questions are shown in English; portraits do not speak. Your choice stays with this interview.</p>
    <div className="grid grid-cols-3 gap-2 sm:grid-cols-6 sm:gap-3">
      {INTERVIEWERS.map(host => <button key={host.id} type="button" aria-pressed={value === host.id} onClick={() => onChange(host.id)} className={`group relative overflow-hidden rounded-2xl border-2 bg-white text-left transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal focus-visible:ring-offset-2 disabled:opacity-60 ${value === host.id ? 'border-teal shadow-[0_7px_24px_rgba(12,103,98,.2)]' : 'border-line hover:border-teal/60'}`}>
        <div className="relative aspect-[4/5] overflow-hidden bg-teal-soft"><Image src={host.image} alt="" fill sizes="(max-width: 640px) 32vw, 160px" className="object-cover object-top transition-transform duration-500 group-hover:scale-105" /></div>
        <div className="p-2"><span className="block text-xs font-bold text-ink sm:text-sm">{host.name}</span><span className="block text-[10px] leading-tight text-ink-muted sm:text-xs">{host.region} · English</span></div>
        {value === host.id && <span aria-hidden="true" className="absolute right-1.5 top-1.5 rounded-full bg-teal px-2 py-1 text-[10px] font-bold text-white">✓</span>}
      </button>)}
    </div>
  </fieldset>
}
