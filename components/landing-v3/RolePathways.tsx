'use client'
import { useState } from 'react'
import { ArrowUpRight, Check, FileText, Mail, MessagesSquare, UserRound } from 'lucide-react'
import s from './launch.module.css'
const paths = [
  { label: 'Engineering', name: 'Aarav Mehta', experience: '8 years · Engineering & project delivery', skills: ['Commissioning', 'Maintenance', 'Project coordination'], roles: ['Commissioning Engineer', 'Maintenance Engineer', 'Project Engineer'] },
  { label: 'Finance', name: 'Sara Khan', experience: '6 years · Accounting & financial reporting', skills: ['Financial reporting', 'Reconciliation', 'Budgeting'], roles: ['Senior Accountant', 'Financial Analyst', 'Accounts Supervisor'] },
  { label: 'IT & Software', name: 'Rohan Sharma', experience: '5 years · Software & application delivery', skills: ['Full-stack development', 'APIs', 'Application support'], roles: ['Software Engineer', 'Full-stack Developer', 'Application Engineer'] },
]
export function RolePathways() {
  const [selected, setSelected] = useState(0)
  const profile = paths[selected]
  return <div className={s.pathway}>
    <div className={s.tabs} role="tablist" aria-label="Explore a sample career">
      {paths.map((p, i) => <button key={p.label} id={'career-tab-' + i} type="button" role="tab" aria-selected={selected === i} aria-controls="career-example" tabIndex={selected === i ? 0 : -1} onClick={() => setSelected(i)} onKeyDown={(e) => { if (['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(e.key)) { e.preventDefault(); const n = e.key === 'Home' ? 0 : e.key === 'End' ? paths.length - 1 : (selected + (e.key === 'ArrowRight' ? 1 : -1) + paths.length) % paths.length; setSelected(n); document.getElementById('career-tab-' + n)?.focus() } }}>{p.label}</button>)}
    </div>
    <div id="career-example" role="tabpanel" aria-labelledby={'career-tab-' + selected} className={s.pathGrid}>
      <div className={s.profileCard}>
        <span className={s.miniLabel}>01 / YOUR SOURCE OF TRUTH</span>
        <div className={s.profileIdentity}><span className={s.avatar}><UserRound aria-hidden="true" /></span><div><strong>{profile.name}</strong><p>{profile.experience}</p></div></div>
        <div className={s.profileDivider} />
        <span className={s.miniLabel}>ONE CAREER PROFILE</span>
        <div className={s.skills}>{profile.skills.map(x => <span key={x}><Check size={14} aria-hidden="true" />{x}</span>)}</div>
        <p className={s.sourceNote}>Your experience stays the foundation. Each job description guides what to highlight.</p>
      </div>
      <div className={s.pathArrow} aria-hidden="true">↗</div>
      <div className={s.roleCards}>{profile.roles.map((role, i) => <div key={role} className={s.roleCard}><div><span className={s.miniLabel}>TARGET ROLE 0{i + 1}</span><ArrowUpRight size={19} aria-hidden="true" /></div><h3>{role}</h3><p>Tailored to the job description</p><ul aria-label={'Application materials for ' + role}><li><FileText size={14} aria-hidden="true" />CV</li><li><Mail size={14} aria-hidden="true" />Letter</li><li><MessagesSquare size={14} aria-hidden="true" />Practice</li></ul></div>)}</div>
    </div>
    <p className={s.demoNote}>Illustrative profiles and roles. Suitability depends on your experience and each job’s requirements.</p>
  </div>
}
