'use client'

import Link from 'next/link'
import { useState } from 'react'
import { ArrowRight, Award, BriefcaseBusiness, CheckCircle2, CircleAlert, GraduationCap, Target, UserRound, Wrench } from 'lucide-react'
import s from './proof.module.css'

const fields = [['Work experience', BriefcaseBusiness], ['Skills', Wrench], ['Education', GraduationCap], ['Achievements', Award], ['Career goals', Target]] as const
const requirements = [['Relevant experience', 'Evidence found', false], ['Required skills', 'Review your evidence', true], ['Qualifications', 'Areas to review', true]] as const
const previews = [
  { label: 'Optimized Resume', title: 'Clear structure. Relevant emphasis.', description: 'Your confirmed experience, prepared for this job.', sections: ['Experience', 'Skills', 'Education'] },
  { label: 'Cover Letter', title: 'A focused introduction to your application.', description: 'Connect your real experience to this job.', sections: ['Introduction', 'Relevant experience', 'Closing'] },
  { label: 'Interview Q&A', title: 'How does your experience relate to this role?', description: 'Prepare questions. Structure answers. Identify areas to improve.' },
] as const

/** Marketing anatomy only: no synthetic person, assessment or generated document. */
export function PreparationProof() {
  return <div className={s.proof}>
    <article className={s.panel} aria-labelledby="profile-example-title">
      <div className={s.profile}><UserRound size={27} aria-hidden="true" /><h3 id="profile-example-title">Career Profile</h3></div>
      <ul className={s.facts}>{fields.map(([label, Icon]) => <li key={label} data-profile-field><Icon size={19} aria-hidden="true" /><strong>{label}</strong><span className={s.placeholder} aria-hidden="true"><i /><i /></span></li>)}</ul>
      <p className={s.confirmed}><CheckCircle2 size={18} aria-hidden="true" />Reviewed and confirmed by you</p>
      <p className={s.note}>Your master record. You review the facts; they are not independently verified.</p>
    </article>
    <article className={`${s.panel} ${s.analysis}`} aria-labelledby="analysis-example-title">
      <h3 id="analysis-example-title">ATS Job Match</h3>
      <p className={s.label}>MARKETING ILLUSTRATION · NOT A REAL ASSESSMENT</p>
      <div className={s.columnLabels} aria-hidden="true"><span>Job requirements</span><span>Your Career Profile</span></div>
      <ul className={s.requirements}>{requirements.map(([label, status, review]) => <li key={label} data-requirement-row data-gap={review || undefined}><strong>{label}</strong><span>{review ? <CircleAlert size={18} aria-hidden="true" /> : <CheckCircle2 size={18} aria-hidden="true" />}{status}</span></li>)}</ul>
      <p className={s.note}>Understand the requirements. Review your evidence. A gap is not added as experience.</p>
    </article>
  </div>
}

function DocumentOutline({ sections }: { sections: readonly string[] }) {
  return <div className={s.paper} aria-label="Illustrative document structure">{sections.map(label => <div key={label}><strong>{label}</strong><span aria-hidden="true"><i /><i /><i /></span></div>)}</div>
}

export function JobPackagePreview() {
  const [selected, setSelected] = useState(0)
  const preview = previews[selected]
  return <div className={s.package} data-job-package>
    <h2 id="templates-title">One job. A connected preparation package.</h2>
    <div className={s.tabs} role="group" aria-label="Package previews">{previews.map(({ label }, i) => <button key={label} type="button" aria-pressed={selected === i} aria-controls="package-preview" onClick={() => setSelected(i)}>{label}</button>)}</div>
    <div id="package-preview" className={s.preview} role="region" aria-label={preview.label}>
      <p className={s.label}>Illustrative preparation preview</p>
      {'sections' in preview ? <div className={s.previewBody}><DocumentOutline sections={preview.sections} /><div><h3>{preview.title}</h3><p>{preview.description}</p><p className={s.context}>Your Career Profile + job requirements</p></div></div>
        : <div className={s.qa}><p>{preview.description}</p><div><b aria-hidden="true">Q</b><h3>{preview.title}</h3></div><div><b aria-hidden="true">A</b><p><small>Answer framework</small>Your responsibility → Your actions → Your result</p></div><p className={s.note}>Preparation focus: use examples you can explain from your own work.</p></div>}
      <p className={s.confirmed}><CheckCircle2 size={18} aria-hidden="true" />Your Career Profile stays unchanged.</p>
      <p className={s.note}>Review before you use. No unsupported experience is added.</p>
    </div>
    <Link className={s.cta} href="/templates">Browse designs — sign-in required <ArrowRight size={17} aria-hidden="true" /></Link>
  </div>
}
