'use client'
import Link from 'next/link'
import {LockClosedIcon} from '@heroicons/react/24/outline'
import {useState} from 'react'
import type {GulfReadinessResult} from '@/lib/gulfReadiness/types'
import {buttonVariants} from '@/components/ui/Button'
const STATUS={prepared:'Prepared',attention:'Needs attention',unknown:'Not checked',context:'Recorded',not_applicable:'Not applicable'}
export function PreparationReport({result,locked,onFix}:{result:GulfReadinessResult;locked:boolean;onFix?:(field:string)=>void}){
 const [expanded,setExpanded]=useState(false)
 const checks=result.preparation??[]
 const coreChecks=checks.filter(c=>c.scored||c.status==='attention')
 const contextChecks=checks.filter(c=>!coreChecks.includes(c))
 const next=checks.filter(c=>c.status==='unknown'||c.status==='attention')
 return <div className="space-y-5">
  <section className="rounded-card border border-teal/30 bg-white p-5 sm:p-7">
   <div className="flex items-start justify-between gap-4"><div><p className="text-sm font-semibold text-teal">Gulf Readiness · basic preparation</p><h2 className="mt-2 type-card font-semibold text-ink">{result.verdict.label}</h2></div><p className="shrink-0 font-mono text-3xl font-bold text-teal">{result.finalScore}<span className="text-sm text-ink-muted">/100</span></p></div>
   <div role="progressbar" aria-label="Gulf preparation" aria-valuemin={0} aria-valuemax={100} aria-valuenow={result.finalScore} className="mt-4 h-2 overflow-hidden rounded-full bg-canvas"><div className="h-full bg-teal" style={{width:`${result.finalScore}%`}}/></div>
   <p className="mt-3 text-sm text-ink-soft">{result.assessment?.reasons[0]}</p>
   <p className="mt-2 text-sm text-ink-muted">{result.assessment?.provisional?'Provisional assessment. ':''}This checks preparation, not your chance of being hired or visa eligibility. Age, nationality and using our services do not earn points.</p>
  </section>
  <section className="rounded-card border border-line bg-white p-5"><h3 className="type-card font-semibold text-ink">Your preparation checklist</h3><ul className="mt-4 divide-y divide-line">{coreChecks.map(c=><li key={c.key} className="py-3"><div className="flex items-start justify-between gap-3"><span className="text-sm font-semibold text-ink">{c.label}</span><span className={`shrink-0 rounded-full px-2 py-1 text-xs font-semibold ${c.status==='prepared'?'bg-teal-soft text-teal':c.status==='attention'?'bg-alert-soft text-alert':'bg-canvas text-ink-soft'}`}>{STATUS[c.status]}</span></div><p className="mt-1 text-sm text-ink-soft">{c.detail}</p>{onFix&&c.field&&(c.status==='attention'||c.status==='unknown')?<button type="button" onClick={()=>onFix(c.field!)} className="mt-1 min-h-11 text-sm font-semibold text-teal">Update Career Profile →</button>:null}</li>)}</ul></section>
  <details className="rounded-card border border-line bg-white p-5"><summary className="min-h-11 cursor-pointer text-sm font-semibold text-teal">Your situation & other preparation details ({contextChecks.length})</summary><ul className="mt-3 space-y-3">{contextChecks.map(c=><li key={c.key}><div className="flex justify-between gap-3 text-sm"><strong>{c.label}</strong><span className="text-ink-muted">{STATUS[c.status]}</span></div><p className="mt-1 text-sm text-ink-soft">{c.detail}</p>{onFix&&c.field&&c.status==='unknown'?<button type="button" onClick={()=>onFix(c.field!)} className="min-h-11 text-sm font-semibold text-teal">Update Career Profile →</button>:null}</li>)}</ul></details>
  {next.length?<section className="rounded-card border border-line bg-white p-5"><h3 className="type-card font-semibold text-ink">Start with these details</h3><ol className="mt-3 list-decimal space-y-3 pl-5">{(locked?next.slice(0,1):expanded?next:next.slice(0,3)).map(c=><li key={c.key} className="text-sm text-ink-soft"><strong className="text-ink">{c.label}</strong><p className="mt-1">{c.detail}</p></li>)}</ol>{!locked&&next.length>3?<button type="button" aria-expanded={expanded} onClick={()=>setExpanded(!expanded)} className="mt-3 min-h-11 text-sm font-semibold text-teal">{expanded?'Show top three':`See all ${next.length} next steps`}</button>:null}</section>:null}
  {locked?<section className="rounded-card border border-teal/30 bg-gold-soft/40 p-5 text-center"><LockClosedIcon aria-hidden="true" className="mx-auto mb-2 h-6 w-6 text-teal"/><h3 className="type-card font-semibold text-ink">Unlock your complete Career Profile</h3><p className="mx-auto mt-2 max-w-lg text-sm text-ink-soft">Your full career history, section-by-section gaps and correction tools are included with a free account. Review unclear details and save your Career Profile. Your resume and answers come with you in this tab.</p><Link href="/signup" className={buttonVariants({variant:'purchase'})+' mt-4'}>Unlock my details & create my profile</Link><p className="mt-2 text-xs text-ink-muted">Same assessment after signup. No job description needed. Browser storage must remain available.</p></section>:null}
 </div>
}
