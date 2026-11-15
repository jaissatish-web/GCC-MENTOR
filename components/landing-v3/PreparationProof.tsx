'use client'

import Link from 'next/link'
import { useState } from 'react'
import { ArrowRight, CheckCircle2, CircleAlert, FileText, UserRound } from 'lucide-react'
import s from './proof.module.css'

// One local, synthetic record. This demonstration never reads or writes user data.
const profile = { name: 'Example candidate', role: 'Instrumentation Commissioning Engineer', evidence: 'Loop checks', gap: 'Offshore commissioning' }
const previews = [
  ['Optimized Resume', 'Relevant experience', 'Loop-check experience from the confirmed Career Profile, presented for the Instrumentation Commissioning Engineer role. Offshore commissioning remains unconfirmed and is excluded.'],
  ['Cover Letter', 'A relevant introduction', 'I am applying for the Instrumentation Commissioning Engineer role. My confirmed loop-check experience is relevant to the stated requirement.'],
  ['Interview Q&A', 'Practise your own experience', 'How would you explain the loop checks you personally carried out? Structure your answer around your responsibility, checks and verified result.'],
] as const

export function PreparationProof() {
  return <div className={s.proof}>
    <article className={s.panel} aria-labelledby="profile-example-title">
      <span className={s.label}>Illustrative profile</span>
      <div className={s.profile}><UserRound size={38} aria-hidden="true" /><div><h3 id="profile-example-title">Career Profile <small>(Example)</small></h3><p>{profile.role}</p></div></div>
      <dl className={s.facts}><div><dt>Professional summary</dt><dd>Experience in instrumentation and loop checks.</dd></div><div><dt>Confirmed skill</dt><dd>{profile.evidence}</dd></div></dl>
      <p className={s.confirmed}><CheckCircle2 size={18} aria-hidden="true" />User-confirmed facts</p><p className={s.note}>Missing information stays visible. Review and confirm before you prepare. These facts are confirmed by the user, not independently verified.</p>
    </article>
    <article className={s.panel} aria-labelledby="analysis-example-title">
      <span className={s.label}>Illustrative job analysis</span><h3 id="analysis-example-title">See the requirement. Understand the gap.</h3>
      <p className={s.note}>Target job: {profile.role}</p>
      <ul className={s.requirements}><li><CheckCircle2 size={20} aria-hidden="true" /><div><strong>Requirement: loop checks</strong><span>Evidence found in profile</span></div></li><li data-gap><CircleAlert size={20} aria-hidden="true" /><div><strong>Requirement: offshore commissioning</strong><span>Not confirmed — review the gap</span></div></li></ul>
      <p className={s.note}>A gap is not added as experience.</p>
    </article>
  </div>
}

export function JobPackagePreview() {
  const [selected, setSelected] = useState(0)
  return <div className={s.package} data-job-package>
    <h2 id="templates-title">One job. A connected preparation package.</h2>
    <div className={s.tabs} role="group" aria-label="Package previews">{previews.map(([label], i)=><button key={label} type="button" aria-pressed={selected===i} aria-controls="package-preview" onClick={()=>setSelected(i)}>{label}</button>)}</div>
    <div id="package-preview" className={s.preview} role="region" aria-label={previews[selected][0]}>
      <span className={s.label}>Illustrative preview · Same profile + target job</span>
      <p className={s.context}>{profile.name} · {profile.role}</p>
      <div className={s.previewBody}><FileText size={28} aria-hidden="true" /><div><h3>{previews[selected][1]}</h3><p>{previews[selected][2]}</p></div></div>
      <p className={s.confirmed}><CheckCircle2 size={18} aria-hidden="true" />Your Career Profile remains unchanged.</p>
      <p className={s.note}>Every preview uses the same confirmed facts. No unsupported experience is added.</p>
    </div>
    <Link className={s.cta} href="/templates">Browse designs — sign-in required <ArrowRight size={17} aria-hidden="true" /></Link>
  </div>
}
