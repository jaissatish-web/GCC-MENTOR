'use client'
import type { MatchScore } from '@/lib/optimizer/types'

/** Versioned report: mandatory screening remains visible regardless of the total. */
export function JobScoreDetails({ score, before }: { score: MatchScore; before?: MatchScore }) {
  const v2 = score.v2
  if (!v2) return null
  const unresolved = v2.screening.filter(item => item.importance === 'must' && item.status !== 'met')
  return <div className="flex min-w-0 flex-col gap-3 break-words">
    {unresolved.length ? <div role="note" className="rounded-ctl border border-gold/50 bg-gold-soft p-3 type-helper text-ink">
      <p className="font-semibold">Screening still needs attention</p>
      <p className="mt-1">A strong keyword match does not resolve these mandatory requirements.</p>
      <ul className="mt-2 list-disc space-y-1 pl-4">{unresolved.map((item, i) => <li key={`${item.term}:${i}`}>{item.term} — {item.status === 'unknown' ? 'not confirmed' : 'not met'}</li>)}</ul>
    </div> : null}
    <div className="grid gap-2 sm:grid-cols-2">
      {(['skills', 'responsibilities'] as const).map(key => {
        const part = v2.breakdown[key], original = before?.v2?.breakdown[key]
        if (!part.applicable) return null
        return <p key={key} className="rounded-ctl border border-line bg-canvas p-3 type-helper text-ink">
          <strong>{key === 'skills' ? 'Skills and tools covered' : 'Responsibilities covered'}</strong><span className="mt-1 block font-mono">{original ? `${original.matched ?? 0}/${original.total ?? 0} → ` : ''}{part.matched ?? 0}/{part.total ?? 0}</span>
        </p>
      })}
    </div>
    {v2.screening.length ? <details className="rounded-ctl border border-line bg-canvas p-3">
      <summary className="min-h-11 cursor-pointer type-helper font-semibold text-ink">View all screening requirements</summary>
      <ul className="space-y-1 type-helper text-ink-soft">{v2.screening.map((item, i) => <li key={`${item.term}:${i}`}>{item.term}: {item.status === 'met' ? 'met from recorded evidence' : item.status === 'unmet' ? 'not met' : 'not confirmed'} · {item.importance === 'must' ? 'required' : 'preferred'}</li>)}</ul>
    </details> : null}
    <details className="rounded-ctl border border-line bg-canvas p-3">
      <summary className="min-h-11 cursor-pointer type-helper font-semibold text-ink">Quality checks and verification</summary>
      <ul className="space-y-2 type-helper text-ink-soft">{v2.quality_checks.map(item => <li key={item.id} className="flex flex-wrap justify-between gap-2"><span className="min-w-0 flex-1 break-words">{item.label} — {item.status === 'passed' ? 'checked' : item.status === 'pending' ? 'not verified yet' : 'needs review'}{item.details?.map((detail, i) => <span key={i} className="mt-1 block text-ink-soft">{detail}</span>)}</span><span className="font-mono">{item.points}/{item.max}</span></li>)}</ul>
      <p className="mt-3 type-helper text-ink-muted">Only completed checks earn verification points. Editing the document invalidates checks bound to the previous version. Word readability is checked using the actual Word export. PDF readability is not certified by that check.</p>
    </details>
    {v2.applicableMaximum !== 100 ? <p className="type-helper text-ink-muted">Only applicable categories are scored: {v2.rawPoints.toFixed(1)} out of {v2.applicableMaximum} is scaled to 100. Categories absent from this job are not free points.</p> : null}
    <p className="type-helper text-ink-muted">This is GCC Mentor’s application-readiness estimate for this job, not an employer ATS result or an interview guarantee.</p>
  </div>
}
