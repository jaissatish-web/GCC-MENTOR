'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ArrowRight, Network, Pause, Play } from 'lucide-react'
import { JourneyDiagram } from '@/components/journey/JourneyDiagram'
import s from '@/components/journey/how-it-works.module.css'

/** The same journey as the in-app guide, embedded in the public page. */
export function LandingJourney() {
  const [paused, setPaused] = useState(false)
  return <div id="how-it-works" className={`${s.experience} ${s.embedded} ${paused ? s.paused : ''}`}>
    <header className={s.editorialHero}>
      <span className={s.heroKicker}><Network size={14} aria-hidden="true" /> YOUR GULF CAREER, CONNECTED</span>
      <h2 id="journey-title" className={s.editorialTitle}>One profile. <em>Multiple possibilities.</em></h2>
      <p className={s.editorialDescription}>Follow the branches. Select a job and explore your preparation.</p>
      <button type="button" className={s.motionControl} aria-pressed={paused} onClick={() => setPaused(value => !value)}>
        {paused ? <Play size={16} aria-hidden="true" /> : <Pause size={16} aria-hidden="true" />}
        {paused ? 'Resume animation' : 'Pause animation'}
      </button>
    </header>
    <JourneyDiagram />
    <div className={s.journeyAction}><Link href="/profile">Build my Career Profile <ArrowRight size={17} aria-hidden="true" /></Link></div>
  </div>
}
