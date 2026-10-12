import { FileCheck2, ShieldCheck, UserCheck } from 'lucide-react'
import s from './product.module.css'

const guarantees = [
  { icon: ShieldCheck, title: 'No invented experience', body: "We don't add qualifications, achievements, or experience you haven't provided." },
  { icon: FileCheck2, title: 'Grounded in your Career Profile', body: 'CV content is checked against your saved professional information.' },
  { icon: UserCheck, title: 'You stay in control', body: 'Review and correct your information before using your final CV.' },
] as const

export function GroundingGuarantee() {
  return <section id="grounding-guarantee" className={s.section} aria-labelledby="grounding-title">
    <div className={s.wrap}>
      <div className={s.sectionHead}><div><h2 id="grounding-title">The Grounding Guarantee</h2><p>Your real experience. Professionally presented. Nothing invented.</p></div></div>
      <ul className="mt-7 grid gap-3 sm:grid-cols-3 lg:mt-9 lg:gap-5">
        {guarantees.map(({ icon: Icon, title, body }) => <li key={title} className="relative flex gap-4 rounded-card border border-line bg-canvas p-5 sm:flex-col">
          <span aria-hidden="true" className="flex size-11 shrink-0 items-center justify-center rounded-full bg-teal text-white"><Icon className="size-5" /></span>
          <div><h3 className="mt-1 type-card text-ink">{title}</h3><p className="mt-2 type-helper text-ink-soft">{body}</p></div>
        </li>)}
      </ul>
    </div>
  </section>
}
