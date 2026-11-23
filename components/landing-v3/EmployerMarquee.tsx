'use client'

import { useState, type CSSProperties, type ReactNode } from 'react'
import Image from 'next/image'
import { Pause, Play } from 'lucide-react'
import s from './landing.module.css'

const countries = [
  ['sa', 'Saudi Arabia'], ['ae', 'UAE'], ['qa', 'Qatar'],
  ['om', 'Oman'], ['kw', 'Kuwait'], ['bh', 'Bahrain'],
] as const

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

/**
 * Optical balance. Every logo sits in the same 122x38 object-fit box, so the
 * box is equal but the marks are not: measured live on 17 Nov 2026 by drawing
 * each mark to a canvas and counting its actual ink coverage, they differ by
 * 5.5x. adani.webp carries 1.69x the median ink and qatarenergy.svg 0.31x, so
 * the wall reads as though some employers matter more than others.
 *
 * Each factor is sqrt(medianInk / logoInk) - the scale that equalises ink on
 * screen - then damped into a safe range. The cell has 12px of padding and the
 * mark fills most of the box, so beyond about 1.15 an upscale would collide
 * with the next cell. Shrink-only was rejected: it would leave the lighter
 * marks visibly undersized rather than balanced.
 *
 * Result: spread falls from 5.5x to 2.5x. It cannot reach 1.0 in one fixed box,
 * because the widest mark (maaden.svg, aspect 9.09) is already width-capped and
 * the most compact (qatarenergy.svg) would need 1.8x to reach the median. The
 * stronger fix - showing fewer marks - is proposed separately in
 * docs/plans/2026-11-17-landing-premium-and-design-consistency.md.
 *
 * Regenerate with analysis/logo-ink.mjs, then analysis/emit-scales.mjs.
 */
const OPTICAL_SCALE: Record<string, number> = {
  // heavy: scaled down
  'adani.webp': 0.78,
  'nmdc-energy.webp': 0.813,
  'wood.svg': 0.818,
  'technip-energies.webp': 0.82,
  'enoc.svg': 0.848,
  'fluor.png': 0.88,
  'aramco.webp': 0.885,
  'hyundai-ec.svg': 0.923,
  'mcdermott.svg': 0.925,
  'ccc.svg': 0.95,
  'kbr.svg': 1.028,
  // light: scaled up, capped by the cell
  'atkinsrealis.svg': 1.15,
  'maaden.svg': 1.15,
  'bechtel.svg': 1.15,
  'larsen-toubro.svg': 1.15,
  'saipem.svg': 1.15,
  'sabic.svg': 1.15,
  'worley.svg': 1.15,
  'qatarenergy-lng.png': 1.15,
  'qatarenergy.svg': 1.15,
  // samsung-ea.svg measures 1.00x and is left alone
}

function MarqueeRow({ label, direction, children }: {
  label: string
  direction: 'left' | 'right'
  children: (duplicate: boolean) => ReactNode
}) {
  return (
    <div className={s.strip} data-direction={direction}>
      <div className={`${s.track} ${direction === 'right' ? s.reverse : ''}`}>
        {[false, true].map(duplicate => (
          <ul key={String(duplicate)} className={s.group} aria-label={duplicate ? undefined : label} aria-hidden={duplicate || undefined}>
            {children(duplicate)}
          </ul>
        ))}
      </div>
    </div>
  )
}

function CompanyRow({ label, logos }: { label: string; logos: (typeof rows)[number] }) {
  return (
    <MarqueeRow label={label} direction="right">
      {duplicate => logos.map(([name, file]) => (
        <li key={name} className={`${s.tile} ${s.logo} ${['mcdermott.svg', 'maaden.svg', 'larsen-toubro.svg'].includes(file) ? s.reversed : ''}`}
          style={{ '--logo-scale': OPTICAL_SCALE[file] ?? 1 } as CSSProperties}>
          <Image src={`/landing/employers/${file}`} alt={duplicate ? '' : name} width={160} height={52} unoptimized loading="eager" />
        </li>
      ))}
    </MarqueeRow>
  )
}

export function EmployerMarquee() {
  const [paused, setPaused] = useState(false)
  return (
    <section id="employers" className={s.section} aria-labelledby="employers-title" data-paused={paused}>
      <div className={s.intro}>
        <h2 id="employers-title">Prepare for opportunities across the Gulf</h2>
        <button type="button" className={`${s.control} whitespace-nowrap`} aria-pressed={paused} aria-controls="employer-strips" onClick={() => setPaused(!paused)}>
          {paused ? <Play size={14} aria-hidden="true" /> : <Pause size={14} aria-hidden="true" />}
          {paused ? 'Resume scrolling' : 'Pause scrolling'}
        </button>
      </div>
      <div id="employer-strips" className={s.strips}>
        <CompanyRow label="Engineering and construction employers" logos={rows[0]} />
        <MarqueeRow label="GCC career destinations" direction="left">
          {() => [false, true].flatMap(repeat => countries.map(([code, name]) => (
            <li key={`${code}-${repeat}`} className={`${s.tile} ${s.countryCard}`} aria-hidden={repeat || undefined} data-repeat={repeat || undefined}>
              <Image src={`/landing/v2/flags/${code}.svg`} width={36} height={26} alt="" loading="eager" />
              <span className={s.countryName}>{name}</span>
            </li>
          )))}
        </MarqueeRow>
        <CompanyRow label="Energy and industrial employers" logos={rows[1]} />
      </div>
      <p className={s.disclaimer}>Company names and logos are shown for career-preparation reference only. GCC Mentor is not affiliated with or endorsed by these organizations.</p>
    </section>
  )
}
