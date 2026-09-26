'use client'
import { useCallback, useEffect, useRef, useState } from 'react'
import { Button } from '@/components/ui/Button'

export function Interviewer({ question, recording }: { question: string; recording: boolean }) {
  const [gender, setGender] = useState<'woman' | 'man'>('woman')
  const [speaking, setSpeaking] = useState(false)
  const [notice, setNotice] = useState('')
  const utterance = useRef<SpeechSynthesisUtterance | null>(null)
  const read = useCallback(() => {
    if (!('speechSynthesis' in window)) { setNotice('Audio playback is unavailable in this browser. The full question is shown below.'); return }
    window.speechSynthesis.cancel()
    const speech = new SpeechSynthesisUtterance(question); utterance.current = speech
    speech.lang = 'en-US'; speech.rate = 0.92
    // System voice selection varies by device; avatar appearance is independent of voice gender.
    const voice = window.speechSynthesis.getVoices().find(v => v.lang.startsWith('en'))
    if (voice) speech.voice = voice
    speech.onstart = () => { setSpeaking(true); setNotice('') }
    speech.onend = () => setSpeaking(false)
    speech.onerror = () => { setSpeaking(false); setNotice('Could not play the audio. Tap Listen again or read the question.') }
    window.speechSynthesis.speak(speech)
  }, [question])
  useEffect(() => { read(); return () => { window.speechSynthesis?.cancel() } }, [read])
  useEffect(() => { if (recording) { window.speechSynthesis?.cancel(); setSpeaking(false) } }, [recording])
  return <div className="rounded-2xl border border-line bg-gradient-to-b from-teal-soft to-white p-4 sm:p-6">
    <div className="flex items-center justify-between gap-3"><span className="text-sm font-semibold text-teal">Your virtual interviewer</span>
      <label className="text-sm"><span className="sr-only">Interviewer appearance</span><select className="rounded border border-line bg-white p-2" value={gender} onChange={e => setGender(e.target.value as 'woman' | 'man')}><option value="woman">Woman</option><option value="man">Man</option></select></label></div>
    <svg viewBox="0 0 360 300" role="img" aria-label={`${gender === 'woman' ? 'Female' : 'Male'} animated interviewer${speaking ? ', speaking' : ''}`} className="mx-auto h-40 w-full sm:h-64 lg:h-80">
      <ellipse cx="180" cy="273" rx="122" ry="14" fill="#d6e8e3" />
      {gender === 'woman' && <path d="M109 155C82 57 114 30 180 30S277 67 252 206H109Z" fill="#293644" />}
      <path d="M69 274V243Q77 190 148 185H212Q284 193 291 274" fill={gender === 'woman' ? '#176c67' : '#284961'} />
      <path d="M152 176V209L180 233L208 209V176" fill="#c88e6d" />
      <path d="M147 199L180 232L213 199L224 274H137Z" fill="#f9faf6" />
      <ellipse cx="180" cy="118" rx="62" ry="79" fill="#e7b794" />
      <path d={gender === 'woman' ? 'M116 119Q111 32 178 37Q247 26 246 122Q223 105 216 66Q178 115 116 119Z' : 'M116 99Q101 30 175 29Q252 25 246 106L222 70Q168 99 130 75Z'} fill="#293644" />
      <path d="M139 124Q149 119 158 124M203 124Q213 119 222 124" fill="none" stroke="#4f3b34" strokeWidth="4" strokeLinecap="round" />
      <circle cx="150" cy="132" r="4" fill="#263847" /><circle cx="211" cy="132" r="4" fill="#263847" />
      <path d="M181 134L177 150L187 150" fill="none" stroke="#bc8669" strokeWidth="3" strokeLinecap="round" />
      <ellipse cx="181" cy="169" rx="14" ry={speaking ? 9 : 3} fill="#864d49" className={speaking ? 'voice-mouth' : ''} />
      <path d="M127 222L102 261M233 222L258 261" stroke="#ffffff30" strokeWidth="3" fill="none" />
    </svg>
    <div className="flex flex-wrap justify-center gap-2"><Button type="button" variant="secondary" onClick={read} disabled={recording}>Listen{speaking ? ' again' : ' to question'}</Button>{speaking && <Button type="button" variant="ghost" onClick={() => { window.speechSynthesis.cancel(); setSpeaking(false) }}>Stop audio</Button>}</div>
    <p aria-live="polite" className="mt-3 text-center text-sm text-ink-muted">{notice || (recording ? 'Listening to your recorded answer.' : speaking ? 'Reading your question…' : 'Animated host · questions read aloud on your device.')}</p>
    <style jsx>{`@keyframes voice-talk{0%,100%{transform:scaleY(.35)}50%{transform:scaleY(1)}}.voice-mouth{transform-box:fill-box;transform-origin:center;animation:voice-talk .25s infinite alternate}@media(prefers-reduced-motion:reduce){.voice-mouth{animation:none}}`}</style>
  </div>
}
