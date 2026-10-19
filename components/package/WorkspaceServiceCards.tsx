import Link from 'next/link'
import { ArrowRightIcon, ChatBubbleLeftRightIcon, EnvelopeIcon, QuestionMarkCircleIcon } from '@heroicons/react/24/outline'
import { workspaceServiceCounts } from '@/lib/workspaceServiceCounts'
import type { Package } from '@/types/package'
import s from '@/components/opportunity-desk/desk.module.css'

/** Existing service destinations and lifetime counts, presented as a quiet list. */
export function WorkspaceServiceCards({pkg,practiceOnly=false}:{pkg:Package;practiceOnly?:boolean}) {
  const counts=workspaceServiceCounts(pkg),id=encodeURIComponent(pkg.id)
  const services=[{label:'Cover letters',count:counts.coverLetters,unit:'letters generated',Icon:EnvelopeIcon,href:`/cover-letter?package=${id}`},{label:'Interview Q&A',count:counts.qaSets,unit:'sets generated',Icon:QuestionMarkCircleIcon,href:`/interview-qa?package=${id}`},{label:'Mock interviews',count:counts.mockInterviews,unit:'sessions started',Icon:ChatBubbleLeftRightIcon,href:`/mock-interview?package=${id}`}]
  return <section aria-label="Services for this workspace"><h2 className={s.listTitle}>{practiceOnly?'Interview preparation':'Services for this workspace'}</h2><p className={s.muted}>Practise with the resume and job details saved in this workspace.</p><div className={`${s.serviceList} mt-4`}>{services.filter(item=>!practiceOnly||item.label!=='Cover letters').map(({label,count,unit,Icon,href})=><Link key={label} href={href} className={s.serviceRow} aria-label={`${label}: ${count} for this workspace`}><span className={s.icon}><Icon aria-hidden="true"/></span><span>{label}</span><small>{count?`${count} ${unit}`:'Start preparing'}</small><ArrowRightIcon aria-hidden="true"/></Link>)}</div></section>
}
