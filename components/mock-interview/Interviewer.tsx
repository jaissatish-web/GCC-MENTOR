'use client'
import Image from 'next/image'
import { getInterviewer, type InterviewerId } from '@/lib/voice/interviewers'

export function Interviewer({ interviewerId, recording }: { interviewerId?: InterviewerId; recording: boolean }) {
  const host = getInterviewer(interviewerId)
  return <div className="relative h-full min-h-0 overflow-hidden rounded-[24px] bg-[#102d36] md:rounded-[32px]">
    <Image src={host.image} alt={`${host.name}, your ${host.label} virtual interviewer`} fill priority sizes="(max-width: 767px) 100vw, 55vw" className="object-contain object-center" />
    <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#081d23]/85 via-transparent to-[#071d25]/25" />
    <div className="absolute left-4 top-4 flex items-center gap-2 rounded-full border border-white/30 bg-[#09272c]/65 px-3 py-1.5 text-xs font-semibold text-white backdrop-blur-lg sm:left-6 sm:top-6">
      <span className="relative flex size-2"><span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-300 opacity-70 motion-reduce:animate-none" /><span className="relative size-2 rounded-full bg-emerald-300" /></span>
      Practice room
    </div>
    <div className="absolute bottom-4 left-4 right-4 flex items-end justify-between gap-2 text-white sm:bottom-6 sm:left-6">
      <div><p className="font-display text-2xl leading-tight sm:text-3xl">{host.name}</p><p className="text-xs text-white/80 sm:text-sm">Virtual interviewer · {host.label}</p></div>
      {recording && <span className="rounded-full bg-red-500/90 px-3 py-1 text-xs font-bold">● Recording</span>}
    </div>
  </div>
}
