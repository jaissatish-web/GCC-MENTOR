'use client'
import { useState } from 'react'

export function Interviewer({ recording }: { recording: boolean }) {
  const [gender, setGender] = useState<'woman' | 'man'>('woman')
  return <div className="rounded-2xl border border-line bg-gradient-to-b from-teal-soft to-white p-4 sm:p-6">
    <div className="flex items-center justify-between gap-3"><span className="text-sm font-semibold text-teal">Your virtual interviewer</span>
      <label className="text-sm"><span className="sr-only">Interviewer appearance</span><select className="rounded border border-line bg-white p-2" value={gender} onChange={e => setGender(e.target.value as 'woman' | 'man')}><option value="woman">Woman</option><option value="man">Man</option></select></label></div>
    <svg viewBox="0 0 360 300" role="img" aria-label={`${gender === 'woman' ? 'Female' : 'Male'} animated interviewer`} className="mx-auto h-40 w-full sm:h-64 lg:h-80">
      <ellipse cx="180" cy="273" rx="122" ry="14" fill="#d6e8e3" />
      <g className="host-idle">
      {gender === 'woman' && <path d="M109 155C82 57 114 30 180 30S277 67 252 206H109Z" fill="#293644" />}
      <path d="M69 274V243Q77 190 148 185H212Q284 193 291 274" fill={gender === 'woman' ? '#176c67' : '#284961'} />
      <path d="M152 176V209L180 233L208 209V176" fill="#c88e6d" />
      <path d="M147 199L180 232L213 199L224 274H137Z" fill="#f9faf6" />
      <ellipse cx="180" cy="118" rx="62" ry="79" fill="#e7b794" />
      <path d={gender === 'woman' ? 'M116 119Q111 32 178 37Q247 26 246 122Q223 105 216 66Q178 115 116 119Z' : 'M116 99Q101 30 175 29Q252 25 246 106L222 70Q168 99 130 75Z'} fill="#293644" />
      <path d="M139 124Q149 119 158 124M203 124Q213 119 222 124" fill="none" stroke="#4f3b34" strokeWidth="4" strokeLinecap="round" />
      <g className="host-eyes"><circle cx="150" cy="132" r="4" fill="#263847" /><circle cx="211" cy="132" r="4" fill="#263847" /></g>
      <path d="M181 134L177 150L187 150" fill="none" stroke="#bc8669" strokeWidth="3" strokeLinecap="round" />
      <path d="M169 167Q181 175 193 167" fill="none" stroke="#864d49" strokeWidth="3" strokeLinecap="round" />
      <path d="M127 222L102 261M233 222L258 261" stroke="#ffffff30" strokeWidth="3" fill="none" />
      </g>
    </svg>
    <p aria-live="polite" className="mt-3 text-center text-sm text-ink-muted">{recording ? 'Your microphone session is active. Submit when ready.' : 'Read the question, then select Start speaking.'}</p>
    <p className="mt-2 text-center text-xs text-ink-muted">Animated practice host · no live interviewer or spoken questions</p>
    <style jsx>{`@keyframes host-idle{0%,100%{transform:translateY(0) rotate(-.5deg)}50%{transform:translateY(-3px) rotate(.5deg)}}@keyframes host-blink{0%,43%,47%,100%{transform:scaleY(1)}45%{transform:scaleY(.08)}}.host-idle{transform-origin:180px 275px;animation:host-idle 6s ease-in-out infinite}.host-eyes{transform-box:fill-box;transform-origin:center;animation:host-blink 5.5s infinite}@media(prefers-reduced-motion:reduce){.host-idle,.host-eyes{animation:none}}`}</style>
  </div>
}
