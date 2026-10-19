import AtsClassic from '@/components/templates/AtsClassic'
import type { GulfPremiumProps } from '@/components/templates/GulfPremium'
import { SAMPLE_RESUME_DOCUMENT } from '@/lib/sampleResume'
import { ResumeDocumentView } from '@/components/resume/ResumeDocumentView'
import Link from 'next/link'
import { ArrowRightIcon, CheckCircleIcon, DocumentTextIcon, EnvelopeIcon, GlobeAltIcon, ChatBubbleLeftRightIcon, ShieldCheckIcon } from '@heroicons/react/24/outline'
import s from './desk.module.css'

/** Public product preview; all actions use the existing preparation entry points. */
export function DeskHero() {
  return <section className={s.hero} aria-labelledby="hero-title"><div className={s.heroGrid}>
    <div className={s.heroCopy}><h1 id="hero-title">One opening.<br/><em>Prepare your next move.</em></h1><p className={s.heroLead}>Turn your real experience into a CV, cover letter and interview preparation for the job you want.</p><Link id="hero-readiness-cta" href="/gulf-readiness-score" className={s.primary}>Check my Gulf readiness <ArrowRightIcon aria-hidden="true"/></Link><a href="#services" className={s.secondary}>Explore preparation <ArrowRightIcon aria-hidden="true"/></a></div>
    <div className={s.heroProduct} aria-label="Example of a job preparation workspace"><span className={s.exampleLabel}>One job. One preparation workspace.</span><h2>Maintenance Engineer</h2><div className={s.previewGrid}><div className={s.resumePreview}><ResumeDocumentView reader={false}><AtsClassic {...({document:SAMPLE_RESUME_DOCUMENT} as GulfPremiumProps)}/></ResumeDocumentView></div><div className={s.previewRows}>{[{Icon:DocumentTextIcon,label:'CV',state:'Ready'},{Icon:EnvelopeIcon,label:'Cover letter',state:'Next'},{Icon:ChatBubbleLeftRightIcon,label:'Interview',state:'Prepare'}].map(({Icon,label,state})=><div key={label}><Icon aria-hidden="true"/><span>{label}</span><small>{state}</small><ArrowRightIcon aria-hidden="true"/></div>)}</div></div><div className={s.previewFoot}><CheckCircleIcon aria-hidden="true"/><span>One profile. Prepared for each opportunity.</span></div><span className={s.exampleNote}>Example preparation</span></div>
  </div><div className={s.marketTrust}><GlobeAltIcon aria-hidden="true"/><div><strong>Grounded in your Career Profile.</strong><p>Tailored for opportunities across the Gulf.</p></div></div><div className={s.heroCredibility}><p className={s.heroTrust}><ShieldCheckIcon aria-hidden="true"/>Based on your real experience. Reviewed by you.</p><a href="#about" className={s.founderTrust}>Built by a Gulf professional with 15 years of industry experience <ArrowRightIcon aria-hidden="true"/></a></div></section>
}
