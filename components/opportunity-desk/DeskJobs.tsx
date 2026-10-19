import Link from 'next/link'
import { ArrowRightIcon, PlusIcon, DocumentTextIcon } from '@heroicons/react/24/outline'
import { cvReady, letterCount, qaReady, mockDone, type PackageSummary } from '@/lib/packageSummary'
import { isCareerProfileResume } from '@/lib/careerProfileResume'
import s from './desk.module.css'

/** Display existing saved flags only. Never treats preparation as a hiring score. */
export function DeskJobs({ packages, loading, error }: { packages: PackageSummary[]; loading: boolean; error: boolean }) {
  const jobs = packages.filter(pkg => !isCareerProfileResume(pkg)).slice(0, 3)
  return <section className={s.jobs} aria-labelledby="desk-jobs-title"><div className={s.sectionHeading}><h2 id="desk-jobs-title">Your jobs</h2><Link href="/optimize/target"><PlusIcon aria-hidden="true"/>Add job</Link></div>
    {loading ? <p role="status" className={s.muted}>Loading your saved preparations…</p> : error ? <p role="alert" className={s.muted}>Your jobs could not be loaded. <Link href="/dashboard/library">Open your library</Link></p> : jobs.length ? <div className={s.jobList}>{jobs.map(pkg => {const ready=[cvReady(pkg),letterCount(pkg)>0,qaReady(pkg),mockDone(pkg)];return <Link key={pkg.id} href={`/package/${encodeURIComponent(pkg.id)}`} className={s.jobRow}><span className={s.icon}><DocumentTextIcon aria-hidden="true"/></span><span className={s.jobCopy}><strong>{pkg.target_job_title || pkg.name || 'Saved preparation'}</strong><span className={s.prepTicks} aria-label={`${ready.filter(Boolean).length} of 4 preparation items saved`}>{ready.map((done,i)=><span key={i} data-ready={done}/>)}</span><small>{!ready[0]?'Job details saved':!ready[1]?'CV saved · Cover letter next':!ready[2]?'CV & letter saved · Interview Q&A next':!ready[3]?'Interview Q&A saved · Mock practice next':'CV, letter, Q&A and mock report saved'}</small></span><ArrowRightIcon aria-hidden="true"/></Link>})}</div> : <div className={s.empty}><h3>Your next opportunity starts here.</h3><p>Add a job to keep its resume and preparation together.</p><Link href="/optimize/target">Add your first job <ArrowRightIcon aria-hidden="true"/></Link></div>}
    {jobs.length ? <Link href="/dashboard/library" className={s.textLink}>View all saved work <ArrowRightIcon aria-hidden="true"/></Link> : null}
  </section>
}
