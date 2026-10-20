'use client'
import Image from 'next/image'
import { Check } from 'lucide-react'
import { INTERVIEWERS, type InterviewerId } from '@/lib/voice/interviewers'

export function InterviewerPicker({ value, onChange, disabled }: { value: InterviewerId; onChange: (id: InterviewerId) => void; disabled?: boolean }) {
  return <fieldset disabled={disabled} className="space-y-3">
    <legend className="type-card">Choose your interviewer <span className="type-helper font-normal text-ink-muted">· {INTERVIEWERS.length} available</span></legend>
    <p className="type-helper text-ink-muted">Choose any host below. Questions are in English; portraits do not speak.</p>
    <div className="grid grid-cols-2 gap-3 min-[480px]:grid-cols-3 lg:grid-cols-6">
      {INTERVIEWERS.map(host => <button key={host.id} type="button" aria-pressed={value === host.id} onClick={() => onChange(host.id)} className={`group relative overflow-hidden rounded-2xl border-2 bg-white text-left transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal focus-visible:ring-offset-2 disabled:opacity-60 ${value === host.id ? 'border-teal shadow-[0_7px_24px_rgba(12,103,98,.2)]' : 'border-line hover:border-teal/60'}`}>
        <div className="relative aspect-[4/5] overflow-hidden bg-teal-soft"><Image src={host.image} alt="" fill sizes="(max-width: 479px) 45vw, (max-width: 1023px) 28vw, 150px" className="object-contain object-center" /></div>
        <div className="p-3"><span className="block type-label text-ink">{host.name}</span><span className="mt-1 block type-caption text-ink-muted">{host.region} · English</span></div>
        {value === host.id && <span aria-hidden="true" className="absolute right-2 top-2 grid size-6 place-items-center rounded-full bg-teal text-white"><Check size={15} /></span>}
      </button>)}
    </div>
  </fieldset>
}
