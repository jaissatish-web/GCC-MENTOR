'use client'

import { useState } from 'react'
import { CheckCircleIcon, ExclamationTriangleIcon, ArrowRightIcon } from '@heroicons/react/24/outline'
import { Button, buttonVariants } from '@/components/ui/Button'
import { cn, GULF_COUNTRIES } from '@/lib/utils'
import { resumeReviewChecks, REVIEW_CATEGORIES, reviewCategory, type ReviewCheckEditor } from '@/lib/resumeParse/reviewChecks'
import { importReviewPlan } from '@/lib/resumeParse/reviewPlan'
import { currentImportValue, applyImportChange } from '@/lib/resumeParse/reviewEditor'
import { redactImportText, type ImportReview } from '@/lib/resumeParse/importReview'
import { ImportComparison } from './ImportComparison'
import type { MissingItem } from '@/lib/readiness'

export interface ResumeReviewData extends ReviewCheckEditor {
  currently_in_gulf: boolean
  nationality: string
  current_location: string
  notice_period: string
  visa_status: string
  visa_transferable: boolean | null
  passport_type: string
  passport_validity_date: string
  date_of_birth: string
  whatsapp: string
  linkedin_url: string
  target_job_title: string
  target_industry: string
  target_company: string
  target_country: string
  skills: Array<{ key: string; name: string }>
  work_experience: Array<{ key: string; company: string; role: string; start_date: string; end_date: string; location: string; description: string; highlights: string; gcc_country: string }>
  education: Array<{ key: string; degree: string; institution: string; field_of_study: string; start_year: string; end_year: string }>
  certifications: Array<{ key: string; name: string; issuer: string; issue_date: string; expiry_date: string }>
  additional_information: Array<{ key: string; label: string; value: string }>
}

export function ResumeReviewPage<T extends ResumeReviewData>({ value, review, existing, busy, error, score, missing, onChange, onConfirm, cannotConfirm = false }: {
  value: T; review: ImportReview; existing: boolean; busy: boolean; error: string | null
  cannotConfirm?: boolean
  score: number; missing: MissingItem[]; onChange: (next: T) => void; onConfirm: () => void
}) {
  const [verified, setVerified] = useState<Record<string, string>>({})
  const [confirmed, setConfirmed] = useState(false)
  const [continueLater, setContinueLater] = useState(false)
  const checks = resumeReviewChecks(review, value, change => currentImportValue(value, change))
  const plan = importReviewPlan(checks, verified)
  const byField = new Map(checks.map(c => [c.field, c]))
  const ready = !cannotConfirm && plan.blocking.length === 0 && confirmed && (!missing.length && !plan.later.length || continueLater)
  const update = (patch: Partial<T>) => { onChange({ ...value, ...patch }); setConfirmed(false) }
  const jump = (field: string) => {
    const target = document.getElementById(`review-field-${field}`) ?? document.getElementById(`review-field-${field.replace(/\.date_order$/, field.startsWith('education') ? '.start_year' : '.start_date')}`) ?? document.getElementById(`review-section-${REVIEW_CATEGORIES.some(c=>c.id===field)?field:reviewCategory(field)}`)
    if (!target) return
    let parent: HTMLElement | null = target
    while (parent) { if (parent instanceof HTMLDetailsElement) parent.open = true; parent = parent.parentElement }
    target.scrollIntoView({ behavior: 'smooth', block: 'center' })
    if (target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement || target instanceof HTMLSelectElement) target.focus({ preventScroll: true })
  }
  const field = (path: string, label: string, text: string, onValue: (v: string) => void, options?: { multiline?: boolean; type?: string; helper?: string; choices?: Array<{value: string;label: string}> }) => {
    const check = byField.get(path)
    const attention = check?.status === 'attention' && !(check.confirmable && verified[check.id] === check.value)
    const id = `review-field-${path}`
    const styling = cn('field w-full', attention && '!border-alert focus:ring-alert')
    return <div key={path} className={cn('min-w-0', options?.multiline && 'sm:col-span-2')}>
      <label htmlFor={id} className="mb-1.5 flex items-center gap-1.5 type-label font-semibold text-ink">{label}{attention ? <ExclamationTriangleIcon aria-hidden="true" className="size-4 shrink-0 text-alert" /> : text.trim() ? <CheckCircleIcon aria-hidden="true" className="size-4 shrink-0 text-ok" /> : null}</label>
      {options?.multiline ? <textarea id={id} value={text} rows={4} disabled={busy} onChange={e => onValue(e.target.value)} className={styling} aria-invalid={attention || undefined} aria-describedby={`${id}-help`} /> : options?.choices ? <select id={id} value={text} disabled={busy} onChange={e => onValue(e.target.value)} className={styling} aria-invalid={attention || undefined} aria-describedby={`${id}-help`}>{options.choices.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}</select> : <input id={id} type={options?.type ?? 'text'} value={text} placeholder={label.endsWith('*') ? 'Enter this required detail' : 'Not captured · optional'} disabled={busy} onChange={e => onValue(e.target.value)} className={styling} aria-invalid={attention || undefined} aria-describedby={`${id}-help`} />}
      <div id={`${id}-help`} className={cn('mt-1 type-helper', attention ? 'text-alert' : 'text-ink-muted')}>{attention ? check.reason : options?.helper ?? ''}</div>
      {attention && check.confirmable && <button type="button" disabled={busy} className={cn(buttonVariants({variant:'secondary',size:'sm'}),'mt-2')} onClick={() => setVerified(previous => ({...previous,[check.id]:check.value}))}>{check.value ? 'I checked this · it is correct' : 'Not in my resume / not applicable'}</button>}
    </div>
  }
  const scalar = (key: keyof T & string, label: string, options?: Parameters<typeof field>[4]) => field(key, label, String(value[key] ?? ''), v => update({[key]:v} as Partial<T>), options)
  const section = (id: string, title: string, children: React.ReactNode, count?: number) => <details id={`review-section-${id}`} open={id === 'contact' || id === 'employment'} className="rounded-card border border-line bg-white"><summary className="flex min-h-14 cursor-pointer items-center justify-between gap-3 px-4 py-3 type-section font-semibold text-ink sm:px-5"><span>{title}</span>{count !== undefined && <span className="type-helper font-normal text-ink-muted">{count} {count === 1 ? 'entry' : 'entries'}</span>}</summary><div className="grid gap-4 border-t border-line p-4 sm:grid-cols-2 sm:p-5">{children}</div></details>
  const remove = (list: 'work_experience' | 'education' | 'certifications' | 'additional_information', index: number) => update({[list]:value[list].filter((_,i) => i !== index)} as Partial<T>)
  const key = () => crypto.randomUUID()
  return <main data-ui-service="profile" className="mx-auto w-full max-w-5xl bg-canvas px-3 py-5 sm:px-6 sm:py-8">
    <ol className="mb-5 grid grid-cols-3 gap-2 type-caption text-ink-muted" aria-label="Create profile steps"><li>✓ Uploaded</li><li aria-current="step" className="font-semibold text-teal">2 · Review</li><li>3 · Profile</li></ol>
    <div className="mb-5"><h1 className="type-title font-semibold text-ink">Review your details</h1><p className="mt-2 max-w-2xl type-body text-ink-soft">Check what we read, correct anything missing, then {existing ? 'update' : 'create'} your Career Profile. Your {existing ? 'saved profile has not changed' : 'profile has not been created yet'}.</p></div>
    <section className="mb-5 rounded-card border border-teal/20 bg-white p-4 sm:p-5" aria-label="Review progress">
      <div role="status" aria-live="polite" className="flex flex-wrap items-center justify-between gap-3"><h2 className="type-section font-semibold text-ink">{plan.blocking.length ? `${plan.blocking.length} to correct or verify` : 'Ready for your final check'}</h2><span className="type-helper text-ok">{plan.passed} basic checks passed / verified</span></div>
      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">{REVIEW_CATEGORIES.filter(c=>c.id!=='other').map(category=>{const list=checks.filter(c=>c.category===category.id&&c.status!=='optional');const good=list.filter(c=>c.status==='passed'||c.confirmable&&verified[c.id]===c.value).length;return <button type="button" key={category.id} onClick={()=>jump(list.find(c=>c.status==='attention')?.field??category.id)} className="min-h-14 text-left"><span className="block type-helper font-semibold text-ink">{category.label}</span><span className="mt-1 block type-caption text-ink-muted">{list.length ? `${good} / ${list.length} checks` : 'Add if applicable'}</span><span className="mt-2 flex h-2 overflow-hidden rounded-full bg-canvas" aria-hidden="true"><span className="bg-ok" style={{width:list.length?`${good/list.length*100}%`:'0%'}}/><span className="bg-alert" style={{width:list.length?`${(list.length-good)/list.length*100}%`:'0%'}}/></span></button>})}</div>
      {plan.blocking.length>0&&<div className="mt-4 flex flex-wrap gap-2">{plan.blocking.map(check=><button type="button" key={check.id} onClick={()=>jump(check.field)} className="min-h-11 rounded-ctl bg-alert-soft px-3 py-2 text-left type-helper font-medium text-alert">! {check.title} →</button>)}</div>}
      <details className="mt-3 type-helper text-ink-muted"><summary className="min-h-11 cursor-pointer py-2">Why might a detail be missing?</summary><p>Formatting, missing source information or extraction errors can affect reading. Some employer ATS systems may also miss or misread these details; their results can differ. Confirm your actual information rather than guessing.</p></details>
    </section>
    <fieldset disabled={busy} className="min-w-0 space-y-4">
      {section('contact','Contact & personal details',<>
        {scalar('full_name','Full name *')}{scalar('email','Email *',{type:'email'})}{scalar('phone','Phone with country code *',{type:'tel'})}{scalar('whatsapp','WhatsApp',{type:'tel'})}{scalar('current_location','Current location')}{scalar('nationality','Nationality')}{scalar('linkedin_url','LinkedIn profile',{type:'url'})}{scalar('date_of_birth','Date of birth',{type:'date'})}
      </>)}
      {section('employment','Employment history',<>
        {value.work_experience.map((job,i)=><details key={job.key} open={i === 0} className="min-w-0 rounded-ctl border border-line p-3 sm:col-span-2 sm:p-4"><summary className="min-h-11 cursor-pointer type-label font-semibold text-ink"><span>{job.role || `Role ${i+1}`}</span><span className="mt-1 block type-helper font-normal text-ink-soft">{job.company || 'Employer to confirm'} · {job.start_date || 'Date to confirm'} — {job.end_date || 'Current'}</span></summary><div className="my-3"><button type="button" className={buttonVariants({variant:'ghost',size:'sm'})} onClick={()=>remove('work_experience',i)}>Remove this role</button></div><div className="grid gap-4 sm:grid-cols-2">{(['company','role','start_date','end_date','location','description','highlights'] as const).map(k=>field(`work_experience.${i}.${k}`,({company:'Employer *',role:'Job title *',start_date:'Start date *',end_date:'End date',location:'Location',description:'Responsibilities',highlights:'Achievements · one per line'})[k],job[k],v=>update({work_experience:value.work_experience.map((row,n)=>n===i?{...row,[k]:v}:row)} as Partial<T>),{multiline:k==='description'||k==='highlights',type:k==='start_date'||k==='end_date'?'month':undefined,helper:k==='end_date'?'Leave blank only if this is your current role.':k==='start_date'?'Use the actual month/year from your resume.':undefined} ))}</div>{byField.get(`work_experience.${i}.date_order`)?.status==='attention'&&<p role="alert" className="mt-2 type-helper text-alert">The end date is before the start date. Check both dates.</p>}</details>)}
        {!value.work_experience.length&&<p className="type-helper text-ink-muted sm:col-span-2">No roles captured. If you have work experience, add it here. Fresh graduates can leave this empty.</p>}
        <button type="button" className={buttonVariants({variant:'secondary',size:'sm'})} onClick={()=>update({work_experience:[...value.work_experience,{key:key(),company:'',role:'',start_date:'',end_date:'',location:'',description:'',highlights:'',gcc_country:''}]} as Partial<T>)}>+ Add a role</button>
      </>,value.work_experience.length)}
      {section('education','Education',<>
        {value.education.map((edu,i)=><article key={edu.key} className="min-w-0 rounded-ctl border border-line p-3 sm:col-span-2"><div className="mb-3 flex items-center justify-between gap-2"><h3 className="type-label font-semibold text-ink">Qualification {i+1}</h3><button type="button" className={buttonVariants({variant:'ghost',size:'sm'})} onClick={()=>remove('education',i)}>Remove</button></div><div className="grid gap-4 sm:grid-cols-2">{(['degree','institution','field_of_study','start_year','end_year'] as const).map(k=>field(`education.${i}.${k}`,({degree:'Qualification *',institution:'Institution',field_of_study:'Field of study',start_year:'Start year',end_year:'Completion year'})[k],edu[k],v=>update({education:value.education.map((row,n)=>n===i?{...row,[k]:v}:row)} as Partial<T>)))}</div></article>)}
        <button type="button" className={buttonVariants({variant:'secondary',size:'sm'})} onClick={()=>update({education:[...value.education,{key:key(),degree:'',institution:'',field_of_study:'',start_year:'',end_year:''}]} as Partial<T>)}>+ Add qualification</button>
      </>,value.education.length)}
      {section('writing','Skills & professional summary',<>
        {scalar('professional_summary','Professional summary',{multiline:true})}
        <div className="sm:col-span-2"><div className="grid gap-3 sm:grid-cols-2">{value.skills.map((skill,i)=><div key={skill.key} className="flex min-w-0 items-end gap-2"><div className="min-w-0 flex-1">{field(`skills.${i}.name`,`Skill ${i+1}`,skill.name,v=>update({skills:value.skills.map((row,n)=>n===i?{...row,name:v}:row)} as Partial<T>))}</div><button type="button" aria-label={`Remove skill ${i+1}`} className={buttonVariants({variant:'ghost',size:'sm'})} onClick={()=>update({skills:value.skills.filter((_,n)=>n!==i)} as Partial<T>)}>×</button></div>)}</div><button type="button" className={cn(buttonVariants({variant:'secondary',size:'sm'}),'mt-3')} onClick={()=>update({skills:[...value.skills,{key:key(),name:''}]} as Partial<T>)}>+ Add skill</button></div>
        {review.changes.filter(c=>c.suggested).map(change=><details key={change.id} className="rounded-ctl bg-teal-soft/30 p-3 sm:col-span-2"><summary className="min-h-11 cursor-pointer type-label font-medium text-teal">Optional improvement · {change.label}</summary><ImportComparison change={change} applied={currentImportValue(value,change)===change.after} compact/><p className="mt-2 type-helper text-ink-soft">{change.reason}</p><div className="mt-3 flex flex-wrap gap-2"><button type="button" disabled={![change.before,change.after].includes(currentImportValue(value,change) ?? '')} className={buttonVariants({variant:'secondary',size:'sm'})} onClick={()=>{onChange(applyImportChange(value,change,change.after,key));setConfirmed(false)}}>Use suggestion</button><button type="button" disabled={![change.before,change.after].includes(currentImportValue(value,change) ?? '')} className={buttonVariants({variant:'ghost',size:'sm'})} onClick={()=>{onChange(applyImportChange(value,change,change.before,key));setConfirmed(false)}}>Keep original</button></div></details>)}
      </>)}
      {section('other','Certificates & additional details',<>
        {value.certifications.map((cert,i)=><article key={cert.key} className="min-w-0 rounded-ctl border border-line p-3 sm:col-span-2"><div className="mb-3 flex items-center justify-between gap-2"><h3 className="type-label font-semibold text-ink">Certificate {i+1}</h3><button type="button" className={buttonVariants({variant:'ghost',size:'sm'})} onClick={()=>remove('certifications',i)}>Remove</button></div><div className="grid gap-4 sm:grid-cols-2">{(['name','issuer','issue_date','expiry_date'] as const).map(k=>field(`certifications.${i}.${k}`,({name:'Certificate name *',issuer:'Issuer',issue_date:'Issue date',expiry_date:'Expiry date'})[k],cert[k],v=>update({certifications:value.certifications.map((row,n)=>n===i?{...row,[k]:v}:row)} as Partial<T>),{type:k==='issue_date'||k==='expiry_date'?'month':undefined}))}</div></article>)}
        <button type="button" className={buttonVariants({variant:'secondary',size:'sm'})} onClick={()=>update({certifications:[...value.certifications,{key:key(),name:'',issuer:'',issue_date:'',expiry_date:''}]} as Partial<T>)}>+ Add certificate</button>
        {value.additional_information.map((entry,i)=><div key={entry.key} className="grid gap-3 rounded-ctl border border-line p-3 sm:col-span-2 sm:grid-cols-2">{field(`additional_information.${i}.label`,'Detail label',entry.label,v=>update({additional_information:value.additional_information.map((row,n)=>n===i?{...row,label:v}:row)} as Partial<T>))}{field(`additional_information.${i}.value`,'Detail value',entry.value,v=>update({additional_information:value.additional_information.map((row,n)=>n===i?{...row,value:v}:row)} as Partial<T>))}<button type="button" className={buttonVariants({variant:'ghost',size:'sm'})} onClick={()=>remove('additional_information',i)}>Remove detail</button></div>)}
      </>)}
      {section('gulf','Gulf application details',<>
        <div className="sm:col-span-2">{field('currently_in_gulf','Are you currently in the Gulf?',String(value.currently_in_gulf),v=>update({currently_in_gulf:v==='true'} as Partial<T>),{choices:[{value:'false',label:'No'},{value:'true',label:'Yes'}],helper:'Confirm your current situation; your resume may describe an earlier location.'})}</div>
        {scalar('target_job_title','Target job title')}{scalar('target_industry','Target industry')}{scalar('target_company','Target company')}{scalar('target_country','Target country',{choices:[{value:'',label:'Choose when ready'},...GULF_COUNTRIES]})}{scalar('visa_status','Visa status')}{scalar('notice_period','Notice period')}{scalar('passport_validity_date','Passport valid until',{type:'date'})}{scalar('passport_type','Passport category',{choices:[{value:'',label:'Not specified'},{value:'ECR',label:'ECR'},{value:'Non-ECR',label:'Non-ECR'}]})}
        {field('visa_transferable','Is your visa transferable?',value.visa_transferable===null?'':String(value.visa_transferable),v=>update({visa_transferable:v===''?null:v==='true'} as Partial<T>),{choices:[{value:'',label:'Not answered / not applicable'},{value:'true',label:'Yes'},{value:'false',label:'No'}]})}
      </>)}
    </fieldset>
    {plan.blocking.filter(c=>!documentField(c.field)).map(check=><div key={check.id} className="mt-4 rounded-card border border-line bg-white p-4"><p className="type-label font-semibold text-ink">{check.title}</p><p className="mt-1 type-helper text-ink-soft">{check.reason}</p>{check.confirmable&&<button type="button" className={cn(buttonVariants({variant:'secondary',size:'sm'}),'mt-3')} disabled={busy} onClick={()=>setVerified(previous=>({...previous,[check.id]:check.value}))}>{check.value?'I checked this detail':'Not in my resume / not applicable'}</button>}</div>)}
    {review.sourceText&&<details className="mt-4 rounded-card border border-line bg-white p-4"><summary className="min-h-11 cursor-pointer type-label font-medium text-teal">Compare original resume text</summary><pre className="mt-3 whitespace-pre-wrap break-words font-sans type-helper text-ink-soft">{redactImportText(review.sourceText)}</pre></details>}
    <section className="mt-5 rounded-card border border-teal/30 bg-white p-4 sm:p-5" aria-label="Confirm reviewed details">
      <h2 className="type-section font-semibold text-ink">{existing?'Confirm your updated details':'Create your Career Profile'}</h2>
      <p className="mt-2 type-helper text-ink-soft">Profile completeness: {score}%. Gulf Readiness is assessed separately using your experience and application details. Missing information stays marked “Update needed” after creation.</p>
      {(missing.length>0||plan.later.length>0)&&<label className="mt-4 flex min-h-11 items-start gap-3 rounded-ctl bg-gold-soft p-3 type-helper text-ink"><input type="checkbox" className="mt-1 size-4 shrink-0" disabled={busy} checked={continueLater} onChange={e=>setContinueLater(e.target.checked)}/><span>I will complete the remaining optional details later. My readiness scores will reflect the information provided.</span></label>}
      <label className="mt-4 flex min-h-11 items-start gap-3 type-label text-ink"><input type="checkbox" className="mt-1 size-4 shrink-0" disabled={busy} checked={confirmed} onChange={e=>setConfirmed(e.target.checked)}/><span>I reviewed these details and confirm they accurately describe my background.</span></label>
      {error&&<p role="alert" className="mt-3 type-helper text-alert">{error}</p>}{cannotConfirm&&<button type="button" className={buttonVariants({variant:'secondary',size:'sm'})} onClick={()=>window.location.reload()}>Reload to check saved profile</button>}
      {plan.blocking.length>0&&<p className="mt-3 type-helper text-alert">Correct or verify {plan.blocking.length} flagged detail{plan.blocking.length===1?'':'s'} to continue.</p>}
      <Button className="mt-4 w-full sm:w-auto" disabled={!ready} busy={busy} busyLabel="Saving your profile…" onClick={onConfirm}>{existing?'Confirm & Update Career Profile':'Confirm & Create Career Profile'}<ArrowRightIcon className="size-4" aria-hidden="true"/></Button>
      <p className="mt-3 type-caption text-ink-muted">Your original extracted draft is kept separately until you confirm. Corrections on this page are saved to your profile only when you press the button.</p>
    </section>
  </main>
}

function documentField(path: string): boolean {
  return /^(full_name|email|phone|whatsapp|nationality|current_location|linkedin_url|date_of_birth|passport_validity_date|passport_type|visa_status|notice_period|visa_transferable|target_job_title|target_country|professional_summary)$/.test(path) || /^work_experience\.\d+\.(company|role|start_date|end_date|location|description|highlights)$/.test(path) || /^skills\.\d+\.name$/.test(path) || /^education\.\d+\.(degree|institution|field_of_study|start_year|end_year)$/.test(path) || /^certifications\.\d+\.(name|issuer|issue_date|expiry_date)$/.test(path)
}
