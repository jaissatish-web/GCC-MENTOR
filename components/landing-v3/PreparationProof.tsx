'use client'

import Link from 'next/link'
import { useState } from 'react'
import { CheckCircle2 } from 'lucide-react'
import s from './landing.module.css'

const previews = [
  { label: 'Optimized Resume', title: 'Clear structure. Relevant emphasis.', description: 'Your confirmed experience, prepared for this job.', sections: ['Experience', 'Skills', 'Education'] },
  { label: 'Cover Letter', title: 'A focused introduction to your application.', description: 'Connect your real experience to this job.', sections: ['Introduction', 'Relevant experience', 'Closing'] },
  { label: 'Interview Q&A', title: 'How does your experience relate to this role?', description: 'Prepare questions. Structure answers. Identify areas to improve.' },
] as const

function DocumentOutline({ sections }: { sections: readonly string[] }) {
  return <div className={s.paper} aria-label="Illustrative document structure">{sections.map(label => <div key={label}><strong>{label}</strong><span aria-hidden="true"><i /><i /><i /></span></div>)}</div>
}

export function JobPackagePreview() {
  const [selected, setSelected] = useState(0)
  const preview = previews[selected]
  return <div className={s.package} data-job-package>
    <h2 id="templates-title">One job. A connected preparation package.</h2>
    <div className={s.proofTabs} role="group" aria-label="Package previews">{previews.map(({ label }, i) => <button key={label} type="button" aria-pressed={selected === i} aria-controls="package-preview" onClick={() => setSelected(i)}>{label}</button>)}</div>
    <div id="package-preview" className={s.preview} role="region" aria-label={preview.label}>
      <p className={s.label}>Illustrative preparation preview</p>
      {'sections' in preview ? <div className={s.previewBody}><DocumentOutline sections={preview.sections} /><div><h3>{preview.title}</h3><p>{preview.description}</p><p className={s.context}>Your Career Profile + job requirements</p></div></div>
        : <div className={s.qa}><p>{preview.description}</p><div><b aria-hidden="true">Q</b><h3>{preview.title}</h3></div><div><b aria-hidden="true">A</b><p><small>Answer framework</small>Your responsibility → Your actions → Your result</p></div><p className={s.note}>Preparation focus: use examples you can explain from your own work.</p></div>}
      <p className={s.confirmed}><CheckCircle2 size={18} aria-hidden="true" />Your Career Profile stays unchanged.</p>
      <p className={s.note}>Review before you use. No unsupported experience is added.</p>
    </div>
    <Link className={s.proofCta} href="/templates">Browse designs, sign-in required </Link>
  </div>
}
