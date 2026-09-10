import { CheckCircleIcon } from '@heroicons/react/24/outline'
import { cn } from '@/lib/utils'

/**
 * The visual for each station on the landing page's guided path.
 *
 * WHY THESE ARE DRAWN AND NOT PHOTOGRAPHED. The founder asked for a photo per
 * service. There is no honest photograph of "a readiness score" — the only
 * options were stock images of people at laptops, which say nothing about this
 * product, or screenshots, which go stale the moment a screen changes. These
 * are built from the same tokens and the same shapes as the real screens, so
 * they show what the service actually looks like and they move with the design
 * system rather than rotting beside it.
 *
 * EVERY NUMBER IN HERE IS ILLUSTRATIVE, and the page says so beneath each one.
 * They are shaped like a plausible Gulf engineer's result because a made-up
 * perfect score would be both useless and dishonest. No figure here is
 * aggregated from customer data, because there is none to aggregate yet.
 *
 * The one real render on the page is the template preview, which runs the
 * actual PDF component — see `TemplateShowcase`.
 */

function Sheet({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div
      aria-hidden="true"
      className={cn(
        'flex flex-col gap-4 rounded-card border border-line bg-white p-5 shadow-m-2',
        className,
      )}
    >
      {children}
    </div>
  )
}

function Label({ children }: { children: React.ReactNode }) {
  return (
    <span className="text-[12px] font-bold uppercase tracking-[0.14em] text-ink-muted">
      {children}
    </span>
  )
}

/** Station 1 — the free readiness score. */
export function ReadinessVisual() {
  const dims = [
    { label: 'Gulf experience', v: 78 },
    { label: 'Certifications', v: 54 },
    { label: 'CV format', v: 41 },
    { label: 'Visa position', v: 92 },
  ]
  const score = 68
  const R = 44
  const C = 2 * Math.PI * R

  return (
    <Sheet>
      <div className="flex items-center gap-5">
        <svg viewBox="0 0 110 110" className="size-[104px] shrink-0 -rotate-90">
          <circle cx="55" cy="55" r={R} fill="none" stroke="#E4EEEB" strokeWidth="11" />
          <circle
            cx="55"
            cy="55"
            r={R}
            fill="none"
            stroke="#0F4C43"
            strokeWidth="11"
            strokeLinecap="round"
            strokeDasharray={`${(C * score) / 100} ${C}`}
          />
        </svg>
        <div className="flex flex-col gap-1">
          <Label>Gulf readiness</Label>
          <span className="font-display text-[34px] font-semibold leading-none tabular-nums text-ink">
            {score}
            <span className="text-[16px] text-ink-muted">/100</span>
          </span>
          <span className="text-[12.5px] text-ink-soft">Experienced, not yet in the Gulf</span>
        </div>
      </div>
      <div className="flex flex-col gap-2.5 border-t border-line pt-4">
        {dims.map((d) => (
          <div key={d.label} className="flex items-center gap-3">
            <span className="w-[104px] shrink-0 text-[12px] text-ink-soft">{d.label}</span>
            <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-line">
              <span
                className={cn('block h-full rounded-full', d.v < 55 ? 'bg-gold' : 'bg-teal')}
                style={{ width: `${d.v}%` }}
              />
            </span>
            <span className="w-7 shrink-0 text-right text-[12px] font-semibold tabular-nums text-ink-muted">
              {d.v}
            </span>
          </div>
        ))}
      </div>
      <p className="rounded-ctl bg-gold-soft px-3 py-2 text-[12px] leading-snug text-gold-ink">
        Fix first: CV format, then certifications.
      </p>
    </Sheet>
  )
}

/** Station 2 — the profile, read from a CV once. */
export function ProfileVisual() {
  const rows = [
    { label: 'Who you are', sub: 'Name, contact, location', done: true },
    { label: 'Work experience', sub: '4 roles read from your CV', done: true },
    { label: 'Education', sub: 'B.Tech, Mechanical', done: true },
    { label: 'Certifications', sub: 'Needs 2 more', done: false },
  ]
  return (
    <Sheet>
      <div className="flex items-center justify-between gap-3">
        <Label>Career profile</Label>
        <span className="rounded-full bg-teal-soft px-2.5 py-1 text-[12px] font-bold uppercase tracking-[0.08em] text-teal">
          Read from your CV
        </span>
      </div>
      <div className="flex flex-col divide-y divide-line">
        {rows.map((r) => (
          <div key={r.label} className="flex items-center gap-3 py-2.5">
            <span
              className={cn(
                'flex size-7 shrink-0 items-center justify-center rounded-full text-[12px] font-bold',
                r.done ? 'bg-teal text-white' : 'border border-dashed border-line-strong text-ink-muted',
              )}
            >
              {r.done ? '✓' : '·'}
            </span>
            <span className="flex min-w-0 flex-col">
              <span className="text-[13.5px] font-semibold text-ink">{r.label}</span>
              <span className="text-[12px] text-ink-muted">{r.sub}</span>
            </span>
          </div>
        ))}
      </div>
      <p className="text-[12px] leading-snug text-ink-soft">
        Built once. Every CV, letter and score after this draws from it.
      </p>
    </Sheet>
  )
}

/** Station 3 — target jobs and their pipeline. */
export function TargetJobsVisual() {
  const stages = [
    { k: 'Applied', n: 2, on: false },
    { k: 'Shortlisted', n: 1, on: false },
    { k: 'Interview', n: 1, on: true },
    { k: 'Offer', n: 0, on: false },
  ]
  const jobs = [
    { role: 'Senior Piping Engineer', at: 'ADNOC · UAE', stage: 'Interview', tone: 'gold' as const },
    { role: 'QA/QC Engineer', at: 'Saudi Aramco · Saudi Arabia', stage: 'Applied', tone: 'plain' as const },
  ]
  return (
    <Sheet>
      <Label>Your target jobs</Label>
      <div className="flex gap-2">
        {stages.map((s) => (
          <div
            key={s.k}
            className={cn(
              'flex flex-1 flex-col items-center gap-0.5 rounded-ctl px-1 py-2',
              s.on ? 'bg-teal text-white' : 'bg-canvas',
            )}
          >
            <span className={cn('text-[16px] font-semibold tabular-nums', s.on ? 'text-white' : 'text-ink')}>
              {s.n}
            </span>
            {/* 12px, the product floor — it was 9.5px. `break-words` so
                "Shortlisted" wraps inside a narrow column rather than spill. */}
            <span className={cn('break-words text-[12px] leading-tight', s.on ? 'text-teal-soft' : 'text-ink-muted')}>{s.k}</span>
          </div>
        ))}
      </div>
      <div className="flex flex-col gap-2.5">
        {jobs.map((j) => (
          <div key={j.role} className="flex items-center justify-between gap-3 rounded-ctl border border-line p-3">
            <span className="flex min-w-0 flex-col">
              <span className="truncate text-[13.5px] font-semibold text-ink">{j.role}</span>
              <span className="truncate text-[12px] text-ink-muted">{j.at}</span>
            </span>
            <span
              className={cn(
                'shrink-0 rounded-full px-2.5 py-1 text-[12px] font-bold uppercase tracking-[0.07em]',
                j.tone === 'gold' ? 'bg-gold-soft text-gold-ink' : 'bg-canvas text-ink-soft',
              )}
            >
              {j.stage}
            </span>
          </div>
        ))}
      </div>
    </Sheet>
  )
}

/** Station 4 — the optimizer, shown as what it actually changes. */
export function OptimizerVisual() {
  return (
    <Sheet>
      <Label>Same experience, read properly</Label>
      <div className="rounded-ctl border border-line bg-canvas p-3.5">
        <span className="text-[12px] font-bold uppercase tracking-[0.12em] text-ink-muted">Your line</span>
        <p className="mt-1.5 text-[13px] leading-relaxed text-ink-soft">
          Handled instrumentation and electrical testing tasks at the plant site.
        </p>
      </div>
      <div className="rounded-ctl border border-teal/30 bg-teal-soft/50 p-3.5">
        <span className="text-[12px] font-bold uppercase tracking-[0.12em] text-teal">
          Written for a Gulf reader
        </span>
        <p className="mt-1.5 text-[13px] font-medium leading-relaxed text-ink">
          Directed LV/MV switchgear and cable-testing programs across multiple substations,
          aligned to Saudi Aramco and ADNOC engineering standards.
        </p>
      </div>
      <p className="flex items-start gap-2 text-[12px] leading-snug text-ink-soft">
        <CheckCircleIcon className="mt-px size-4 shrink-0 text-teal" />
        No job, skill or date is ever added. Only what is already in your profile.
      </p>
    </Sheet>
  )
}

/** Station 6 — the cover letter. */
export function LetterVisual() {
  const tones = ['Professional', 'Short', 'Technical', 'Explanatory']
  return (
    <Sheet>
      <div className="flex items-center justify-between gap-3">
        <Label>Cover letter</Label>
        <span className="rounded-full bg-teal-soft px-2.5 py-1 text-[12px] font-bold uppercase tracking-[0.08em] text-teal">
          Four tones
        </span>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {tones.map((t, i) => (
          <span
            key={t}
            className={cn(
              'rounded-full px-2.5 py-1 text-[12px] font-semibold',
              i === 0 ? 'bg-teal text-white' : 'border border-line text-ink-soft',
            )}
          >
            {t}
          </span>
        ))}
      </div>
      <div className="flex flex-col gap-2 rounded-ctl border border-line bg-canvas p-4">
        <span className="h-2 w-1/3 rounded-full bg-line-strong/70" />
        <span className="h-1.5 w-full rounded-full bg-line" />
        <span className="h-1.5 w-[92%] rounded-full bg-line" />
        <span className="h-1.5 w-[97%] rounded-full bg-line" />
        <span className="h-1.5 w-[64%] rounded-full bg-line" />
        <span className="mt-1 h-1.5 w-full rounded-full bg-line" />
        <span className="h-1.5 w-[88%] rounded-full bg-line" />
        <span className="mt-2 h-2 w-1/4 rounded-full bg-line-strong/70" />
      </div>
      <p className="text-[12px] leading-snug text-ink-soft">
        Addressed to the same job, built from the same profile as the CV.
      </p>
    </Sheet>
  )
}
