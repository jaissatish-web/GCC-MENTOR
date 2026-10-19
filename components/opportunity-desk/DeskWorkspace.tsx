import Link from 'next/link'
import { ArrowRightIcon, CheckCircleIcon, DocumentTextIcon, EnvelopeIcon, QuestionMarkCircleIcon, ChatBubbleLeftRightIcon, InformationCircleIcon, ChevronDownIcon } from '@heroicons/react/24/outline'
import type { Package } from '@/types/package'
import s from './desk.module.css'

type NextStep = { title: string; body: string; cta: string; href: string }
/** Presentation of the existing workspace's next step and saved-output flags. */
export function DeskWorkspace({pkg,next,cvReady,letterReady,qaReady,mockReady,onViewResume}:{pkg:Package;next:NextStep;cvReady:boolean;letterReady:boolean;qaReady:boolean;mockReady:boolean;onViewResume:()=>void}) {
  const id=encodeURIComponent(pkg.id)
  const rows=[{label:'Cover letter',ready:letterReady,Icon:EnvelopeIcon,href:`/cover-letter?package=${id}`},{label:'Interview Q&A',ready:qaReady,Icon:QuestionMarkCircleIcon,href:`/interview-qa?package=${id}`},{label:'Mock interview',ready:mockReady,Icon:ChatBubbleLeftRightIcon,href:`/mock-interview?package=${id}`}]
  return <div className={s.workspaceOverview}><p className={s.statusLine}><CheckCircleIcon aria-hidden="true"/>{cvReady ? 'CV ready. ' : 'Job details saved. '}{next.title === 'Application package complete' ? 'Your preparation is saved.' : `${next.cta} next.`}</p>
    <section className={s.nextAction} aria-label="Next preparation action"><DocumentTextIcon aria-hidden="true"/><div><h2>{!cvReady?'Prepare your resume for this role':!letterReady?'Introduce your fit for this role':!qaReady?'Prepare your interview answers':!mockReady?'Put your preparation into practice':'Ready for your next opportunity'}</h2><p>{next.body}</p><Link href={next.href} className={s.primary}>{next.cta}<ArrowRightIcon aria-hidden="true"/></Link></div></section>
    <section aria-labelledby="desk-application-title"><h2 id="desk-application-title" className={s.listTitle}>For this application</h2><div className={s.serviceList}><button type="button" className={s.serviceRow} onClick={onViewResume}><span className={s.icon}><DocumentTextIcon aria-hidden="true"/></span><span>Optimized CV</span><small>{cvReady?'Ready · View':'Profile-based preview'}</small><ArrowRightIcon aria-hidden="true"/></button>{rows.map(({label,ready,Icon,href})=><Link href={href} key={label} className={s.serviceRow}><span className={s.icon}><Icon aria-hidden="true"/></span><span>{label}</span><small>{ready?'Saved':label==='Mock interview'?'Practise':'Prepare'}</small><ArrowRightIcon aria-hidden="true"/></Link>)}</div></section>
    <details className={s.resultsDisclosure}><summary>Job details<ChevronDownIcon className="size-4" aria-hidden="true"/></summary><div><p className={s.muted}>{pkg.target_company || pkg.target_job_title}</p><p className="mt-2 whitespace-pre-wrap type-helper">{pkg.job_description || 'No job description was provided. Preparation uses your saved target title.'}</p></div></details>
    <p className={s.sourceNote}><InformationCircleIcon aria-hidden="true"/>Uses your Career Profile and this job&apos;s saved details.</p>
  </div>
}
