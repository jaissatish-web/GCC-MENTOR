'use client'

import { useEffect, useMemo, useState } from 'react'
import { Button } from '@/components/ui/Button'
import { buildCareerDiagnostic, FINDING_LABELS, PROFESSION_LABELS, PROFESSION_QUESTIONS, type DiagnosticProfile, type Profession } from '@/lib/resumeParse/careerDiagnostic'
import { redactImportText, type ImportReview } from '@/lib/resumeParse/importReview'
import type { ReviewCheck } from '@/lib/resumeParse/reviewChecks'

interface Props {
  profile: DiagnosticProfile
  originalProfile?: DiagnosticProfile
  review: ImportReview
  checks?: ReviewCheck[]
  busy?: boolean
  onEdit: (sectionId: string) => void
  onFix?: (field: string) => void
}
const SKILL_GROUPS = ['Not grouped', 'Technical', 'Functional', 'Management', 'Software & tools', 'Other'] as const

/** Evidence-based projection only. All factual edits use the canonical profile editor. */
export function CareerDiagnostic({ profile, originalProfile, review, checks = [], busy = false, onEdit, onFix }: Props) {
  const sourceProfile = originalProfile ?? profile
  const diagnostic = useMemo(() => buildCareerDiagnostic(profile, review, checks), [profile, review, checks])
  const original = useMemo(() => buildCareerDiagnostic(originalProfile ?? profile, review), [originalProfile, profile, review])
  const [professionOverride, setProfessionOverride] = useState<Profession | null>(null)
  const profession = professionOverride ?? diagnostic.profession
  const [careerStage, setCareerStage] = useState('unspecified')
  const [skillGroups, setSkillGroups] = useState<Record<string, string>>({})
  const [findingFilter, setFindingFilter] = useState('all')
  const [expandedFinding, setExpandedFinding] = useState<string | null>(null)
  const [hydratedImport, setHydratedImport] = useState<string | null>(null)
  const [recoveryUnavailable, setRecoveryUnavailable] = useState(false)
  useEffect(() => {
    setProfessionOverride(null); setCareerStage('unspecified'); setSkillGroups({})
    try {
      const raw = sessionStorage.getItem('gcc-career-diagnostic-v2')
      const saved: unknown = raw ? JSON.parse(raw) : null
      if (saved && typeof saved === 'object') {
        const data = saved as Record<string, unknown>
        if (data.importId === review.id) {
          if (typeof data.profession === 'string' && Object.prototype.hasOwnProperty.call(PROFESSION_LABELS, data.profession)) setProfessionOverride(data.profession as Profession)
          if (typeof data.careerStage === 'string' && ['unspecified', 'graduate', 'experienced', 'changer', 'freelance'].includes(data.careerStage)) setCareerStage(data.careerStage)
          if (data.skillGroups && typeof data.skillGroups === 'object' && !Array.isArray(data.skillGroups)) setSkillGroups(Object.fromEntries(Object.entries(data.skillGroups).filter(([key, value]) => /^\d+$/.test(key) && typeof value === 'string' && SKILL_GROUPS.some(group => group === value))) as Record<string, string>)
        }
      }
    } catch { setRecoveryUnavailable(true) }
    setHydratedImport(review.id)
  }, [review.id])
  useEffect(() => {
    if (hydratedImport !== review.id) return
    // Only presentation choices are retained; no source text, profile facts or document URLs.
    try { sessionStorage.setItem('gcc-career-diagnostic-v2', JSON.stringify({ importId: review.id, profession: professionOverride, careerStage, skillGroups })) }
    catch { setRecoveryUnavailable(true) }
  }, [hydratedImport, review.id, professionOverride, careerStage, skillGroups])
  const unresolved = diagnostic.findings.filter(finding => !finding.repaired)
  const shown = diagnostic.findings.filter(finding => findingFilter === 'all' || finding.severity === findingFilter)
  const initialSkills = (originalProfile ?? profile).skills.filter(row => row.name?.trim())
  const fix = (field: string, section: string) => onFix ? onFix(field) : onEdit(section)
  return <section aria-labelledby="career-diagnostic-title" className="mt-5 min-w-0 space-y-5">
    <div className="rounded-card border border-line bg-white p-4 sm:p-5">
      <p className="type-helper font-semibold text-teal">Understand what was captured</p>
      <h2 id="career-diagnostic-title" className="mt-1 type-section text-ink">Your Career Diagnostic Report</h2>
      <p className="mt-2 type-helper text-ink-soft">Extracted information needs your review. These checks describe your data and our reading of it; they are not an ATS acceptance probability or a hiring decision.</p>
      <h3 className="mt-5 type-card text-ink">Initial extracted career snapshot</h3>
      <p className="mt-2 break-words type-body text-ink">{original.title || 'Professional title not identified'}</p>
      <p className="mt-1 type-helper text-ink-muted">{original.location || 'Current location not recorded'} · Not yet user-verified</p>
      <dl className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">{Object.entries(original.snapshot).map(([key, count]) => <div key={key} className="min-w-0 border-l-2 border-teal/30 pl-3"><dt className="type-helper capitalize text-ink-soft">{key}</dt><dd className="mt-1 type-card font-semibold text-ink">{count}</dd></div>)}</dl>
      <p className="mt-3 type-helper text-ink-muted">Counts describe named records captured by GCC Mentor, not an independent audit of the original file. Employment durations below use only recorded dates; uncertain dates are never guessed or summed into total experience.</p>
    </div>

    <div className="rounded-card border border-line bg-white p-4 sm:p-5">
      <h3 className="type-card text-ink">Make this review relevant to you</h3>
      <p className="mt-2 type-helper text-ink-soft">The suggested profession is a keyword-based starting point. Change it if it is wrong. These controls tailor questions for this review; use Edit profile details to save career facts.</p>
      <div className="mt-3 grid gap-4 sm:grid-cols-2">
        <label className="min-w-0 type-helper text-ink">Profession focus<select className="mt-2 min-h-11 w-full rounded-ctl border border-line bg-white px-3 text-ink" value={profession} disabled={busy} onChange={event => setProfessionOverride(event.target.value as Profession)}>{Object.entries(PROFESSION_LABELS).map(([id, label]) => <option key={id} value={id}>{label}</option>)}</select></label>
        <label className="min-w-0 type-helper text-ink">Career stage / work context<select className="mt-2 min-h-11 w-full rounded-ctl border border-line bg-white px-3 text-ink" value={careerStage} disabled={busy} onChange={event => setCareerStage(event.target.value)}><option value="unspecified">Not specified</option><option value="graduate">Student / fresh graduate</option><option value="experienced">Experienced professional</option><option value="changer">Career changer</option><option value="freelance">Freelance / self-employed</option></select></label>
      </div>
      {recoveryUnavailable ? <p role="status" className="mt-3 type-helper text-gold-ink">This browser cannot retain diagnostic display choices. Keep this tab open; factual edit recovery is handled separately by the profile review.</p> : null}
      <p className="mt-3 type-helper text-ink-muted">Country context: {diagnostic.location || 'Unknown — neutral global profile'}. No country-specific visa or licensing eligibility is assessed here.</p>
      <ul className="mt-3 space-y-2">{(careerStage === 'graduate' ? [{ section: 'education', question: 'Are your education, internships, academic projects and practical training captured? Paid employment is not required.' }, { section: 'projects', question: 'Do you have an academic or personal project showing what you can do?' }] : PROFESSION_QUESTIONS[profession]).map(item => <li key={item.question} className="flex min-w-0 flex-col items-start gap-2 border-t border-line pt-3 type-helper text-ink-soft"><span>{item.question}</span><Button type="button" variant="ghost" size="sm" disabled={busy} onClick={() => onEdit(item.section)}>Review relevant details</Button></li>)}</ul>
      {careerStage === 'freelance' ? <p className="mt-3 type-helper text-ink-soft">Concurrent client work can be valid. Keep employer/client distinctions and describe your actual self-employed work.</p> : careerStage === 'changer' ? <p className="mt-3 type-helper text-ink-soft">Keep your actual previous roles. Use your summary and genuine transferable skills to explain your change of direction.</p> : null}
    </div>

    <div className="rounded-card border border-line bg-white p-4 sm:p-5">
      <h3 className="type-card text-ink">Recorded field coverage</h3>
      <p className="mt-2 type-helper text-ink-soft">Each bar counts usable recorded fields out of the fields shown in its rule. It does not verify those facts, change Gulf Profile Readiness, or make optional qualifications mandatory.</p>
      <div className="mt-4 grid gap-4 sm:grid-cols-2">{diagnostic.coverage.map(item => <div key={item.id} className="min-w-0">
        <button type="button" disabled={busy} onClick={() => onEdit(item.id)} className="flex min-h-11 w-full flex-wrap items-center justify-between gap-2 text-left type-helper text-ink"><span className="font-semibold">{item.title}</span><span>{item.captured}/{item.applicable} fields · {Math.round(item.captured / Math.max(item.applicable, 1) * 100)}%</span></button>
        <progress className="h-2 w-full accent-teal" max={Math.max(item.applicable, 1)} value={item.captured} aria-label={`${item.title}: ${item.captured} of ${item.applicable} recorded fields`} />
        <details className="mt-1 type-helper text-ink-muted"><summary className="min-h-11 cursor-pointer py-2">What this counts</summary><p>{item.rule}</p><p className="mt-2">{item.fields.join(' · ')}</p></details>
      </div>)}</div>
      {!profile.work_experience.length ? <p className="mt-3 type-helper text-ink-muted">No employment records were captured. This can be appropriate for a fresh graduate; verify that internships or self-employed work were not missed.</p> : null}
      {!profile.education.length || !profile.certifications.length ? <p className="mt-2 type-helper text-ink-muted">Empty education, certifications and projects are omitted from their bars. Add them only when relevant and true.</p> : null}
    </div>

    <div className="rounded-card border border-line bg-white p-4 sm:p-5">
      <h3 className="type-card text-ink">Findings explorer</h3>
      <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">{[['attention', 'Requires attention'], ['review', 'Needs review'], ['suggestion', 'Optional improvement']].map(([key, label]) => <div key={key} className={`rounded-ctl border p-3 type-helper ${key === 'attention' ? 'border-alert/40 text-alert' : key === 'suggestion' ? 'border-teal/30 text-teal' : 'border-gold/40 text-gold-ink'}`}><p>{label}</p><p className="mt-1 font-semibold">{unresolved.filter(finding => finding.severity === key).length}</p></div>)}<div className="rounded-ctl border border-line p-3 type-helper text-ink-soft"><p>User confirmation</p><p className="mt-1">Tracked in guided review below</p></div></div>
      <label className="mt-4 block type-helper text-ink">Show findings<select className="ml-2 min-h-11 max-w-full rounded-ctl border border-line bg-white px-3" value={findingFilter} onChange={event => setFindingFilter(event.target.value)}><option value="all">All findings</option><option value="attention">Requires attention</option><option value="review">Needs review</option><option value="suggestion">Optional improvements</option></select></label>
      <div className="mt-3 space-y-3">{shown.map(finding => <article key={finding.id} className={`min-w-0 rounded-ctl border p-3 ${finding.severity === 'attention' ? 'border-alert/40 bg-alert-soft' : 'border-line bg-canvas'}`}>
        <button type="button" className="min-h-11 w-full text-left" aria-expanded={expandedFinding === finding.id} aria-controls={`diagnostic-finding-${finding.id}`} onClick={() => setExpandedFinding(expandedFinding === finding.id ? null : finding.id)}><span className="block type-helper font-semibold text-ink">{finding.title}</span><span className="mt-1 block type-helper text-ink-soft">{FINDING_LABELS[finding.kind]}{finding.repaired ? ' · recovered, verify value' : ''}</span></button>
        {expandedFinding === finding.id ? <div id={`diagnostic-finding-${finding.id}`} className="break-words type-helper text-ink-soft"><p className="mt-2"><strong>Detected:</strong> {finding.detected}</p><p className="mt-2"><strong>Why it matters:</strong> {finding.why}</p>{finding.evidence ? <p className="mt-2 whitespace-pre-wrap"><strong>Recorded evidence:</strong> {redactImportText(finding.evidence)}</p> : null}<p className="mt-2"><strong>Next action:</strong> {finding.correction}</p><Button className="mt-3" type="button" variant="secondary" size="sm" disabled={busy} onClick={() => fix(finding.field, finding.section)}>Review this field</Button></div> : null}
      </article>)}</div>
      {!shown.length ? <p className="mt-3 type-helper text-ink-soft">No findings in this group. Captured details still need your factual review.</p> : null}
      <p className="mt-4 type-helper text-ink-muted">We cannot determine an employer&apos;s ATS decision from this resume. Tables, columns and decorative layouts are not automatically failures. Without layout evidence, we do not claim specific layout faults or invent page highlights.</p>
    </div>

    <details className="rounded-card border border-line bg-white p-4 sm:p-5"><summary className="min-h-11 cursor-pointer type-card text-ink">Original source text and extracted fields</summary><p className="mt-2 type-helper text-ink-muted">This is the text our document reader obtained, not a reproduction of the PDF or DOCX layout. Compare it with your original private file. Missing source text cannot be recovered by this view.</p><div className="mt-4 grid min-w-0 gap-4 sm:grid-cols-2"><div className="min-w-0"><h4 className="type-label font-semibold text-ink">Text read from your source</h4><pre className="mt-2 max-h-96 overflow-y-auto whitespace-pre-wrap break-words rounded-ctl bg-canvas p-3 font-sans type-helper text-ink">{review.sourceText ? redactImportText(review.sourceText) : 'No source text is available for this import.'}</pre></div><div className="min-w-0"><h4 className="type-label font-semibold text-ink">Initial structured extraction</h4><dl className="mt-2 space-y-3 break-words rounded-ctl bg-canvas p-3 type-helper text-ink">{[['Name', sourceProfile.full_name], ['Title', original.title], ['Email', sourceProfile.email], ['Phone', sourceProfile.phone], ['Summary', sourceProfile.professional_summary]].map(([label, value]) => <div key={label}><dt className="font-semibold">{label}</dt><dd className="mt-1 whitespace-pre-wrap">{value ? redactImportText(value) : 'Not extracted'}</dd></div>)}</dl></div></div></details>

    {diagnostic.timeline.length ? <details className="rounded-card border border-line bg-white p-4 sm:p-5"><summary className="min-h-11 cursor-pointer type-card text-ink">Recorded career timeline</summary><ol className="mt-3 space-y-4 border-l-2 border-teal/30 pl-4">{diagnostic.timeline.map(job => <li key={job.index} className="min-w-0 break-words"><p className="type-label font-semibold text-ink">{job.role} · {job.employer}</p><p className="mt-1 type-helper text-ink-soft">{job.dates}{job.months !== null ? ` · ${job.months} elapsed months between recorded boundaries` : ' · duration not calculated'}</p><Button className="mt-2" type="button" size="sm" variant="ghost" disabled={busy} onClick={() => fix(`work_experience.${job.index}.start_date`, 'experience')}>Verify role and dates</Button></li>)}</ol><p className="mt-3 type-helper text-ink-muted">Dates remain in recorded order. Possible overlap means review, not a mistake. Durations exclude an assumed day and are not an experience score.</p></details> : null}

    {initialSkills.length ? <details className="rounded-card border border-line bg-white p-4 sm:p-5"><summary className="min-h-11 cursor-pointer type-card text-ink">Skills captured from your resume</summary><p className="mt-2 type-helper text-ink-muted">Group skills for your review. These display groups are optional and are not saved as proficiency claims. Use the profile editor to add, remove or correct a skill.</p><div className="mt-3 grid min-w-0 gap-3 sm:grid-cols-2">{initialSkills.map((skill, i) => { const key = String(i); return <label key={key} className="min-w-0 rounded-ctl border border-line p-3 type-helper text-ink"><span className="block break-words font-semibold">{skill.name}</span><select className="mt-2 min-h-11 w-full rounded-ctl border border-line bg-white px-2" value={skillGroups[key] ?? 'Not grouped'} disabled={busy} onChange={event => setSkillGroups(previous => ({ ...previous, [key]: event.target.value }))}>{SKILL_GROUPS.map(group => <option key={group}>{group}</option>)}</select></label> })}</div><Button className="mt-3" type="button" variant="secondary" size="sm" disabled={busy} onClick={() => onEdit('skills')}>Edit profile skills</Button></details> : null}
  </section>
}
