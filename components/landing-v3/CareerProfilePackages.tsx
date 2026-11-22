'use client'

import Image from 'next/image'
import { useId, useState } from 'react'
import {
  Award, BriefcaseBusiness, CirclePlus, FileSearch, Files, FileText, GraduationCap,
  Mail, MessagesSquare, Mic, Settings2, ShieldCheck, Target, Wrench,
} from 'lucide-react'
import { useInView } from './hooks'
import s from './CareerProfilePackages.module.css'

const assetPath = '/landing/v3/job-packages'

const profileFields = [
  ['Work Experience', BriefcaseBusiness],
  ['Skills & Competencies', Settings2],
  ['Education & Certifications', GraduationCap],
  ['Achievements', Award],
  ['Career Goals', Target],
] as const

const packages = [
  { role: 'Senior Mechanical Engineer', image: 'senior', tone: 'amber' },
  { role: 'Mechanical Commissioning Engineer', image: 'commissioning', tone: 'blue' },
  { role: 'Mechanical Maintenance Engineer', image: 'maintenance', tone: 'violet' },
] as const

const services = [
  { label: 'ATS Job Match', short: 'ATS Job Match', tone: 'cyan', Icon: FileSearch, copy: 'Compare the job description with your confirmed profile. See what matches, what needs evidence and where genuine gaps remain.' },
  { label: 'Optimized Resume', short: 'Resume', tone: 'blue', Icon: FileText, copy: 'Emphasize the experience and skills most relevant to this role. Your career facts stay the same.' },
  { label: 'Cover Letter', short: 'Cover Letter', tone: 'amber', Icon: Mail, copy: 'Prepare a dedicated letter linking your real experience to this opportunity.' },
  { label: 'Interview Q&A', short: 'Q&A', tone: 'violet', Icon: MessagesSquare, copy: 'Prepare for role-relevant questions and practise answering with examples from your own work.' },
  { label: 'Mock Interview', short: 'Mock Interview', tone: 'mint', Icon: Mic, copy: 'Simulate an interview for this job, review feedback and choose what to improve in your next practice.' },
] as const

const benefits = [
  ['Same profile, multiple roles', Files],
  ['Job-specific applications', Target],
  ['Interview practice with feedback', Mic],
  ['Grounded in your confirmed experience', ShieldCheck],
] as const

function PackageCard({ job, index }: { job: typeof packages[number]; index: number }) {
  const id = useId()
  const [selected, setSelected] = useState<number | null>(null)
  const service = selected === null ? null : services[selected]

  return <li className={s.packageItem} data-career-package>
    <svg className={s.arrow} viewBox="0 0 24 14" fill="none" aria-hidden="true">
      <path d="M1 7h20m-5-5 5 5-5 5" pathLength="1" />
    </svg>
    <article className={s.job} data-tone={job.tone} aria-labelledby={`${id}-role`}>
      <div className={s.jobIdentity}>
        <Image src={`${assetPath}/${job.image}.webp`} alt="" width={216} height={80} sizes="(min-width: 1200px) 146px, 96px" />
        <div>
          <p className={s.jobNumber}>Job Package {index + 1}</p>
          <h3 id={`${id}-role`}>{job.role}</h3>
        </div>
      </div>
      <ul className={s.serviceGrid} aria-label={`Preparation for ${job.role}`}>
        {services.map(({ label, short, tone, Icon }, serviceIndex) =>
          <li key={label}>
            <button type="button" className={s.service} data-tone={tone} aria-label={label}
              aria-expanded={selected === serviceIndex} aria-controls={`${id}-detail`}
              onClick={() => setSelected(selected === serviceIndex ? null : serviceIndex)}
              onKeyDown={event => { if (event.key === 'Escape') setSelected(null) }}>
              <Icon size={21} aria-hidden="true" />
              <span className={s.fullLabel}>{label}</span>
              <span className={s.shortLabel}>{short}</span>
            </button>
          </li>,
        )}
      </ul>
      <div id={`${id}-detail`} className={s.detail} hidden={!service}>
        {service && <p><strong>{service.label}</strong> {service.copy}</p>}
      </div>
    </article>
  </li>
}

export function CareerProfilePackages() {
  const { ref, seen, visible } = useInView<HTMLDivElement>(0.04)

  return <div className={s.story}>
    <header className={s.heading}>
      <p className={s.eyebrow}>How GCC Mentor Works</p>
      <h2 id="services-title" data-uds="marketing-title">One Career Profile. <span>Multiple job opportunities in your field.</span></h2>
      <p className={s.lead}>Create your Career Profile once. Then prepare a tailored resume, cover letter, interview Q&amp;A and mock interview practice for each target Gulf job—based on your real experience and the job description.</p>
      <p className={s.statement}>Different jobs. Different requirements. One trusted source of career information.</p>
    </header>
    <div ref={ref} className={s.workflow} data-career-workflow data-seen={seen} data-visible={visible}>
      <article className={s.profile} aria-labelledby="career-package-profile">
        <div className={s.profileIntro}>
          <Image src={`${assetPath}/profile.webp`} alt="" width={180} height={131} sizes="(min-width: 1024px) 104px, 65px" />
          <div>
            <h3 id="career-package-profile">Career Profile <span>Create Once</span></h3>
            <p>Your master career record, reviewed and confirmed by you.</p>
          </div>
        </div>
        <ul className={s.facts}>
          {profileFields.map(([label, Icon]) => <li key={label} data-profile-field><Icon size={16} aria-hidden="true" />{label}</li>)}
        </ul>
      </article>
      <aside className={s.example}>
        <Wrench size={20} aria-hidden="true" />
        <div>
          <p><strong>Illustrative example: Mechanical Engineering.</strong> Your job packages reflect your own professional background.</p>
          <p>Choose a target Gulf job and paste its job description. Each role uses the same Career Profile.</p>
        </div>
      </aside>
      <ol className={s.packages} aria-label="Job packages from the same Career Profile">
        {packages.map((job, index) => <PackageCard key={job.role} job={job} index={index} />)}
      </ol>
      <div className={s.extension}>
        <CirclePlus size={26} aria-hidden="true" />
        <div className={s.extensionCopy}>
          <h3>Add Next Job Optimization</h3>
          <p>Prepare another job-specific package using the same Career Profile.</p>
        </div>
        <ul className={s.nextJobs} role="list">
          <li>Job Package 4</li><li>Job Package 5</li><li>More opportunities</li>
        </ul>
        <p className={s.usage}>Usage depends on your plan and available credits.</p>
      </div>
    </div>
    <ul className={s.benefits} aria-label="Preparation benefits">
      {benefits.map(([label, Icon]) => <li key={label}><Icon size={17} aria-hidden="true" /><span>{label}</span></li>)}
    </ul>
    <p className={s.accuracy}>One generic resume may miss what each employer is looking for. GCC Mentor helps you tailor your application without changing the facts. Employers make hiring decisions.</p>
  </div>
}
