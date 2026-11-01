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
  /** Explicit user confirmations from the canonical review, never format checks. */
  verifiedFieldCount?: number
  onEdit: (sectionId: string) => void
  onFix?: (field: string) => void
}
const SKILL_GROUPS = ['Not grouped', 'Technical', 'Functional', 'Management', 'Software & tools', 'Other'] as const

/** Evidence-based projection only. All factual edits use the canonical profile editor. */
export function CareerDiagnostic({ profile, originalProfile, review, checks = [], busy = false, verifiedFieldCount = 0, onEdit, onFix }: Props) {
  const sourceProfile = originalProfile ?? profile
  const diagnostic = useMemo(() => buildCareerDiagnostic(profile, review, checks), [profile, review, checks])
  const original = useMemo(() => buildCareerDiagnostic(originalProfile ?? profile, review), [originalProfile, profile, review])
  const [professionOverride, setProfessionOverride] = useState<Profession | null>(null)
  const profession = professionOverride ?? diagnostic.profession
  const [careerStage, setCareerStage] = useState('unspecified')
  const [skillGroups, setSkillGroups] = useState<Record<string, string>>({})
  const [findingFilter, setFindingFilter] = useState('all')
  const [expandedFinding, setExpandedFinding] = useState<string | null>(null)
  const [findingsOpen, setFindingsOpen] = useState(false)
  const [detailsOpen, setDetailsOpen] = useState(false)
  const [hydratedImport, setHydratedImport] = useState<string | null>(null)
  const [recoveryUnavailable, setRecoveryUnavailable] = useState(false)
  useEffect(() => {
    setProfessionOverride(null); setCareerStage('unspecified'); setSkillGroups({})
    setDetailsOpen(false); setFindingsOpen(false); setFindingFilter('all'); setExpandedFinding(null)
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
  const snapshotLabels: Record<string, string> = { employers: 'Employers', roles: 'Roles', skills: 'Skills', qualifications: 'Education', certificates: 'Training', projects: 'Projects' }
  const openFindings = (severity: string) => { setFindingFilter(severity); setDetailsOpen(true); setFindingsOpen(true) }
  return <section aria-labelledby="career-diagnostic-title" className="min-w-0 space-y-3">
    <div className="rounded-card border border-line bg-white p-4">
      <h2 id="career-diagnostic-title" className="type-section text-ink">Your career snapshot</h2>
      <p className="mt-2 break-words type-label font-semibold text-ink">{original.title || 'Professional title not identified'}</p>
      <p className="mt-1 type-caption text-ink-muted">{original.location || 'Location not recorded'} · Not yet user-verified</p>
      <dl className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-6">{Object.entries(original.snapshot).map(([key, count]) => <div key={key} className="min-w-0 rounded-ctl bg-canvas p-2.5"><dt className="type-caption text-ink-soft">{snapshotLabels[key] ?? key}</dt><dd className="mt-1 type-card font-semibold text-ink">{count}</dd></div>)}</dl>
    </div>

    <div aria-label="Diagnostic counts" className="grid grid-cols-3 gap-2">
      <button type="button" disabled={busy} onClick={() => openFindings('attention')} className="min-h-11 min-w-0 rounded-ctl border border-alert bg-alert-soft p-3 text-left text-alert"><span className="block type-card font-semibold">{unresolved.filter(finding => finding.severity === 'attention').length}</span><span className="mt-1 block type-caption">Needs attention</span></button>
      <button type="button" disabled={busy} onClick={() => openFindings('review')} className="min-h-11 min-w-0 rounded-ctl border border-gold/40 bg-gold-soft p-3 text-left text-gold-ink"><span className="block type-card font-semibold">{unresolved.filter(finding => finding.severity === 'review').length}</span><span className="mt-1 block type-caption">Needs review</span></button>
      <div className="min-w-0 rounded-ctl border border-ok bg-ok-soft p-3 text-ok"><p className="type-card font-semibold">{verifiedFieldCount}</p><p className="mt-1 type-caption">Verified by you</p></div>
    </div>

    <details open={detailsOpen} onToggle={event => setDetailsOpen(event.currentTarget.open)} className="rounded-card border border-line bg-white p-4">
      <summary className="min-h-11 cursor-pointer type-label font-semibold text-ink">Explore diagnostic details</summary>
      <div className="mt-3 space-y-3">
    <details open={findingsOpen} onToggle={event => setFindingsOpen(event.currentTarget.open)} className="rounded-card border border-line bg-white p-4">
      <summary className="min-h-11 cursor-pointer type-label font-semibold text-ink">Findings & suggested actions <span className="font-normal text-ink-muted">({unresolved.length})</span></summary>
      <label className="mt-2 block type-helper text-ink">Show findings<select className="ml-2 min-h-11 max-w-full rounded-ctl border border-line bg-white px-3" value={findingFilter} onChange={event => setFindingFilter(event.target.value)}><option value="all">All findings</option><option value="attention">Requires attention</option><option value="review">Needs review</option><option value="suggestion">Optional improvements</option></select></label>
      <div className="mt-3 space-y-3">{shown.map(finding => {
        const optionalWarning = checks.some(check => check.field === finding.field && check.status === 'attention' && check.blocking === false)
        return <article key={finding.id} data-diagnostic-field={finding.field} className={`min-w-0 rounded-ctl border p-3 ${finding.severity === 'attention' || optionalWarning ? 'border-alert bg-alert-soft' : 'border-line bg-canvas'}`}>
          <button type="button" className="min-h-11 w-full text-left" aria-expanded={expandedFinding === finding.id} aria-controls={`diagnostic-finding-${finding.id}`} onClick={() => setExpandedFinding(expandedFinding === finding.id ? null : finding.id)}><span className="block type-helper font-semibold text-ink">{finding.title}</span><span className="mt-1 block type-caption text-ink-soft">{FINDING_LABELS[finding.kind]}{finding.repaired ? ' · recovered, verify value' : ''}</span></button>
          {expandedFinding === finding.id ? <div id={`diagnostic-finding-${finding.id}`} className="break-words type-helper text-ink-soft">
            {optionalWarning ? <p className="mt-2 font-semibold text-alert">Optional warning · you can still save.</p> : null}
            <p className="mt-2">{finding.detected}</p>
            <p className="mt-2"><strong>Next:</strong> {finding.correction}</p>
            <Button className="mt-3" type="button" variant="secondary" size="sm" disabled={busy} onClick={() => fix(finding.field, finding.section)}>Review this field</Button>
            <details className="mt-2"><summary className="min-h-11 cursor-pointer py-2 text-ink">Why this matters & evidence</summary><p>{finding.why}</p>{finding.evidence ? <p className="mt-2 whitespace-pre-wrap">{redactImportText(finding.evidence)}</p> : null}</details>
          </div> : null}
        </article>
      })}</div>
      {!shown.length ? <p className="mt-3 type-helper text-ink-soft">No findings in this group.</p> : null}
    </details>

    <details className="rounded-card border border-line bg-white p-4">
      <summary className="min-h-11 cursor-pointer type-label font-semibold text-ink">Recorded field coverage</summary>
      <p className="mt-2 type-helper text-ink-soft">Recorded fields, not verified facts or ATS acceptance. Optional qualifications stay optional.</p>
      <div className="mt-3 grid gap-3 sm:grid-cols-2">{diagnostic.coverage.map(item => <div key={item.id} className="min-w-0">
        <button type="button" disabled={busy} onClick={() => onEdit(item.id)} className="flex min-h-11 w-full flex-wrap items-center justify-between gap-2 text-left type-helper text-ink"><span className="font-semibold">{item.title}</span><span>{item.captured}/{item.applicable} · {Math.round(item.captured / Math.max(item.applicable, 1) * 100)}%</span></button>
        <progress className="h-2 w-full accent-teal" max={Math.max(item.applicable, 1)} value={item.captured} aria-label={`${item.title}: ${item.captured} of ${item.applicable} recorded fields`} />
        <details className="mt-1 type-caption text-ink-muted"><summary className="min-h-11 cursor-pointer py-2">What this counts</summary><p>{item.rule}</p><p className="mt-2">{item.fields.join(' · ')}</p></details>
      </div>)}</div>
      {!profile.work_experience.length ? <p className="mt-3 type-helper text-ink-muted">No employment captured. Graduates do not need paid employment; check any internships or self-employed work.</p> : null}
    </details>

    <details className="rounded-card border border-line bg-white p-4">
      <summary className="min-h-11 cursor-pointer type-label font-semibold text-ink">Profession & career context</summary>
      <p className="mt-2 type-helper text-ink-soft">Change the suggested focus to tailor this review. These choices do not change saved career facts.</p>
      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <label className="min-w-0 type-helper text-ink">Profession focus<select className="mt-2 min-h-11 w-full rounded-ctl border border-line bg-white px-3 text-ink" value={profession} disabled={busy} onChange={event => setProfessionOverride(event.target.value as Profession)}>{Object.entries(PROFESSION_LABELS).map(([id, label]) => <option key={id} value={id}>{label}</option>)}</select></label>
        <label className="min-w-0 type-helper text-ink">Career stage / work context<select className="mt-2 min-h-11 w-full rounded-ctl border border-line bg-white px-3 text-ink" value={careerStage} disabled={busy} onChange={event => setCareerStage(event.target.value)}><option value="unspecified">Not specified</option><option value="graduate">Student / fresh graduate</option><option value="experienced">Experienced professional</option><option value="changer">Career changer</option><option value="freelance">Freelance / self-employed</option></select></label>
      </div>
      {recoveryUnavailable ? <p role="status" className="mt-3 type-helper text-gold-ink">Display choices cannot be retained in this browser. Keep this tab open.</p> : null}
      <p className="mt-3 type-helper text-ink-muted">Country context: {diagnostic.location || 'Unknown — neutral global profile'}. Visa and licensing eligibility are not assessed.</p>
      <ul className="mt-3 space-y-2">{(careerStage === 'graduate' ? [{ section: 'education', question: 'Are your education, internships, academic projects and practical training captured? Paid employment is not required.' }, { section: 'projects', question: 'Do you have an academic or personal project showing what you can do?' }] : PROFESSION_QUESTIONS[profession]).map(item => <li key={item.question} className="flex min-w-0 flex-col items-start gap-2 border-t border-line pt-3 type-helper text-ink-soft"><span>{item.question}</span><Button type="button" variant="ghost" size="sm" disabled={busy} onClick={() => onEdit(item.section)}>Review relevant details</Button></li>)}</ul>
      {careerStage === 'freelance' ? <p className="mt-3 type-helper text-ink-soft">Concurrent client work can be valid. Keep actual employer/client distinctions.</p> : careerStage === 'changer' ? <p className="mt-3 type-helper text-ink-soft">Keep previous roles. Explain the change with your summary and genuine transferable skills.</p> : null}
    </details>

    <details className="rounded-card border border-line bg-white p-4"><summary className="min-h-11 cursor-pointer type-label font-semibold text-ink">Original source text and extracted fields</summary><p className="mt-2 type-helper text-ink-muted">Reader output, not the PDF layout. Compare it with your private original.</p><div className="mt-3 grid min-w-0 gap-3 sm:grid-cols-2"><div className="min-w-0"><h3 className="type-helper font-semibold text-ink">Text read from your source</h3><pre className="mt-2 max-h-96 overflow-y-auto whitespace-pre-wrap break-words rounded-ctl bg-canvas p-3 font-sans type-helper text-ink">{review.sourceText ? redactImportText(review.sourceText) : 'No source text is available for this import.'}</pre></div><div className="min-w-0"><h3 className="type-helper font-semibold text-ink">Initial structured extraction</h3><dl className="mt-2 space-y-3 break-words rounded-ctl bg-canvas p-3 type-helper text-ink">{[['Name', sourceProfile.full_name], ['Title', original.title], ['Email', sourceProfile.email], ['Phone', sourceProfile.phone], ['Summary', sourceProfile.professional_summary]].map(([label, value]) => <div key={label}><dt className="font-semibold">{label}</dt><dd className="mt-1 whitespace-pre-wrap">{value ? redactImportText(value) : 'Not extracted'}</dd></div>)}</dl></div></div></details>

    {diagnostic.timeline.length ? <details className="rounded-card border border-line bg-white p-4"><summary className="min-h-11 cursor-pointer type-label font-semibold text-ink">Recorded career timeline</summary><ol className="mt-3 space-y-3 border-l-2 border-teal/30 pl-4">{diagnostic.timeline.map(job => <li key={job.index} className="min-w-0 break-words"><p className="type-helper font-semibold text-ink">{job.role} · {job.employer}</p><p className="mt-1 type-caption text-ink-soft">{job.dates}{job.months !== null ? ` · ${job.months} elapsed months between recorded boundaries` : ' · duration not calculated'}</p><Button className="mt-2" type="button" size="sm" variant="ghost" disabled={busy} onClick={() => fix(`work_experience.${job.index}.start_date`, 'experience')}>Verify role and dates</Button></li>)}</ol><p className="mt-3 type-helper text-ink-muted">An overlap needs review, not an assumption that it is wrong. No total experience is inferred.</p></details> : null}

    {initialSkills.length ? <details className="rounded-card border border-line bg-white p-4"><summary className="min-h-11 cursor-pointer type-label font-semibold text-ink">Skills captured from your resume</summary><p className="mt-2 type-helper text-ink-muted">Optional display groups, not proficiency claims.</p><div className="mt-3 grid min-w-0 gap-2 sm:grid-cols-2">{initialSkills.map((skill, i) => { const key = String(i); return <label key={key} className="min-w-0 rounded-ctl border border-line p-3 type-helper text-ink"><span className="block break-words font-semibold">{skill.name}</span><select className="mt-2 min-h-11 w-full rounded-ctl border border-line bg-white px-2" value={skillGroups[key] ?? 'Not grouped'} disabled={busy} onChange={event => setSkillGroups(previous => ({ ...previous, [key]: event.target.value }))}>{SKILL_GROUPS.map(group => <option key={group}>{group}</option>)}</select></label> })}</div><Button className="mt-3" type="button" variant="secondary" size="sm" disabled={busy} onClick={() => onEdit('skills')}>Edit profile skills</Button></details> : null}

    <details className="rounded-card border border-line bg-white p-4"><summary className="min-h-11 cursor-pointer type-label font-semibold text-ink">About these checks</summary><ul className="mt-2 list-disc space-y-2 pl-4 type-helper text-ink-muted"><li>Snapshot counts show named records captured by GCC Mentor, not an independent audit of the file.</li><li>Dates and durations use recorded boundaries. Uncertain dates are not guessed.</li><li>These checks do not change Gulf Profile Readiness or predict ATS acceptance.</li><li>We cannot determine an employer’s ATS decision. Tables, columns and decorative layouts are not automatically failures.</li><li>No page coordinates or layout faults are inferred without evidence.</li></ul></details>
      </div>
    </details>
  </section>
}
