'use client'

import { useState } from 'react'
import Image from 'next/image'
import { Pause, Play } from 'lucide-react'
import s from './employer-marquee.module.css'

// Local, sourced artwork only; names are references, never partnership claims.
const rows = [
  [
    ['Bechtel', 'bechtel.svg'], ['Worley', 'worley.svg'], ['Wood', 'wood.svg'],
    ['Fluor', 'fluor.png'], ['Technip Energies', 'technip-energies.webp'],
    ['Saipem', 'saipem.svg'], ['KBR', 'kbr.svg'], ['AtkinsRéalis', 'atkinsrealis.svg'],
    ['Hyundai E&C', 'hyundai-ec.svg'], ['Samsung E&A', 'samsung-ea.svg'], ['CCC', 'ccc.svg'],
  ],
  [
    ['Saudi Aramco', 'aramco.webp'], ['QatarEnergy', 'qatarenergy.svg'], ['SABIC', 'sabic.svg'],
    ['L&T', 'larsen-toubro.svg'], ['McDermott', 'mcdermott.svg'], ['ENOC', 'enoc.svg'],
    ['NMDC Energy', 'nmdc-energy.webp'], ['Ma’aden', 'maaden.svg'], ['Adani', 'adani.webp'],
    ['QatarEnergy LNG', 'qatarenergy-lng.png'],
  ],
] as const

export function EmployerMarquee() {
  const [paused, setPaused] = useState(false)
  return <section id="employers" className={s.section} aria-labelledby="employers-title" data-paused={paused}>
    <div className={s.intro}>
      <h2 id="employers-title">Prepare Confidently for Leading Gulf Employers</h2>
      <p>Build a stronger resume, improve ATS readiness and prepare for interviews for top EPC, PMC, construction, oil &amp; gas and energy companies across the Gulf.</p>
      <button type="button" className={s.control} aria-pressed={paused} aria-controls="employer-strips" aria-label={paused ? 'Resume logo animation' : 'Pause logo animation'} onClick={() => setPaused(!paused)}>
        {paused ? <Play size={14} aria-hidden="true" /> : <Pause size={14} aria-hidden="true" />}
        {paused ? 'Resume logos' : 'Pause logos'}
      </button>
    </div>
    <div id="employer-strips" className={s.strips}>
      {rows.map((logos, row) => <div key={row} className={s.strip} data-direction={row === 0 ? 'left' : 'right'}>
        <div className={`${s.track} ${row === 1 ? s.reverse : ''}`}>
          {[false, true].map(duplicate => <ul key={String(duplicate)} className={s.group} aria-label={duplicate ? undefined : row === 0 ? 'Engineering and construction employers' : 'Energy and industrial employers'} aria-hidden={duplicate || undefined}>
            {logos.map(([name, file]) => <li key={name} className={s.logo}>
              <Image src={`/landing/employers/${file}`} alt={duplicate ? '' : name} width={160} height={52} unoptimized loading="eager" className={['mcdermott.svg', 'maaden.svg', 'larsen-toubro.svg'].includes(file) ? s.monochrome : undefined} />
            </li>)}
          </ul>)}
        </div>
      </div>)}
    </div>
    <p className={s.disclaimer}>Company names and logos are shown for career-preparation reference only. GCC Mentor is not affiliated with or endorsed by these organizations.</p>
  </section>
}
