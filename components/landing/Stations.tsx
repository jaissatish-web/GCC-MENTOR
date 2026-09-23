import { CheckCircleIcon } from '@heroicons/react/24/outline'
import { cn } from '@/lib/utils'
import { DIMENSION_LABELS } from '@/lib/gulfReadiness/config'

/**
 * Drawn previews of each journey step, for the landing page.
 *
 * WHY THESE ARE DRAWN AND NOT PHOTOGRAPHED. There is no honest photograph of
 * "a readiness score" — the options were stock images of people at laptops,
 * which say nothing about this product, or screenshots, which go stale the
 * moment a screen changes. These are built from the same tokens and shapes as
 * the real screens, so they show what the service looks like and move with the
 * design system.
 *
 * EVERY NUMBER IN HERE IS ILLUSTRATIVE, and each sheet carries an "Example"
 * tag saying so. No figure is aggregated from customer data. The readiness
 * dimensions are the engine's own labels, so the page cannot promise a
 * dimension the score does not measure.
 */

function Sheet({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div
      aria-hidden="true"
      className={cn('flex flex-col gap-4 rounded-card border border-line bg-white p-5 shadow-m-2', className)}
    >
      {children}
    </div>
  )
}

function Head({ label, tag = 'Example' }: { label: string; tag?: string }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-[12px] font-bold uppercase tracking-[0.14em] text-ink-muted">{label}</span>
      <span className="rounded-full bg-canvas px-2.5 py-1 text-[12px] font-bold uppercase tracking-[0.08em] text-ink-muted">
        {tag}
      </span>
    </div>
  )
}

function Bar({ label, v, tone }: { label: string; v: number; tone?: 'teal' | 'gold' }) {
  const t = tone ?? (v < 55 ? 'gold' : 'teal')
  return (
    <div className="flex items-center gap-3">
      <span className="w-[128px] shrink-0 text-[12px] leading-tight text-ink-soft">{label}</span>
      <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-line">
        <span className={cn('block h-full rounded-full', t === 'gold' ? 'bg-gold' : 'bg-teal')} style={{ width: `${v}%` }} />
      </span>
      <span className="w-7 shrink-0 text-right text-[12px] font-semibold tabular-nums text-ink-muted">{v}</span>
    </div>
  )
}

/** Career Profile — read from a CV once. */
export function ProfileVisual() {
  const rows = [
    { label: 'Personal & contact', sub: 'Name, location, visa and notice', done: true },
    { label: 'Work experience', sub: '4 roles read from your CV', done: true },
    { label: 'Education', sub: 'B.Tech, Mechanical', done: true },
    { label: 'Certifications', sub: 'Add the ones you hold', done: false },
  ]
  return (
    <Sheet>
      <Head label="Career Profile" />
      <div className="flex flex-col divide-y divide-line">
        {rows.map((r) => (
          <div key={r.label} className="flex items-center gap-3 py-2.5">
            <span
              className={cn(
                'flex size-7 shrink-0 items-center justify-center rounded-full text-[12px] font-bold',
                r.done ? 'bg-ok text-white' : 'border border-dashed border-line-strong text-ink-muted',
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
      <p className="text-[12px] leading-snug text-ink-soft">Built once. Every CV, letter and answer is written from it.</p>
    </Sheet>
  )
}

/** GCC Readiness — the six dimensions the engine really scores. */
export function ReadinessVisual() {
  const dims = [
    { label: DIMENSION_LABELS.gulf_market_position, v: 72 },
    { label: DIMENSION_LABELS.work_experience, v: 84 },
    { label: DIMENSION_LABELS.skills, v: 66 },
    { label: DIMENSION_LABELS.certifications, v: 48 },
    { label: DIMENSION_LABELS.resume_quality, v: 41 },
  ]
  const score = 64
  const R = 44
  const C = 2 * Math.PI * R
  return (
    <Sheet>
      <Head label="Gulf Readiness" />
      <div className="flex items-center gap-5">
        <svg viewBox="0 0 110 110" className="size-[92px] shrink-0 -rotate-90">
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
          <span className="font-display text-[34px] font-semibold leading-none tabular-nums text-ink">
            {score}
            <span className="text-[16px] text-ink-muted">/100</span>
          </span>
          <span className="text-[12.5px] text-ink-soft">Experienced, not yet in the Gulf</span>
        </div>
      </div>
      <div className="flex flex-col gap-2.5 border-t border-line pt-4">
        {dims.map((d) => (
          <Bar key={d.label} label={d.label} v={d.v} />
        ))}
      </div>
      <p className="rounded-ctl bg-gold-soft px-3 py-2 text-[12px] leading-snug text-gold-ink">
        Fix first: add measurable results, then list your certifications.
      </p>
    </Sheet>
  )
}

/** Target job — what the job asks for, against the profile. */
export function MatchVisual() {
  const found = ['DCS / PLC', 'Loop checks', 'Commissioning', 'HSE']
  const missing = ['SIL verification', 'HART']
  return (
    <Sheet>
      <Head label="Target job" />
      <div>
        <p className="font-display text-[18px] font-semibold leading-tight text-ink">Instrumentation Engineer</p>
        <p className="mt-0.5 text-[12.5px] text-ink-muted">Job description added · Qatar</p>
      </div>
      <div className="flex flex-col gap-2">
        <span className="text-[12px] font-semibold text-ink-soft">Already in your profile</span>
        <div className="flex flex-wrap gap-1.5">
          {found.map((k) => (
            <span key={k} className="rounded-full bg-ok-soft px-2.5 py-1 text-[12px] font-semibold text-ok">
              ✓ {k}
            </span>
          ))}
        </div>
        <span className="mt-1 text-[12px] font-semibold text-ink-soft">Asked for, not in your profile</span>
        <div className="flex flex-wrap gap-1.5">
          {missing.map((k) => (
            <span key={k} className="rounded-full border border-dashed border-gold bg-gold-soft px-2.5 py-1 text-[12px] font-semibold text-gold-ink">
              {k}
            </span>
          ))}
        </div>
      </div>
      <p className="text-[12px] leading-snug text-ink-soft">You decide whether a missing item is true for you. Nothing is added on its own.</p>
    </Sheet>
  )
}

/** Optimized CV — what the rewrite actually changes, with the score. */
export function OptimizerVisual() {
  return (
    <Sheet>
      <Head label="Optimized CV" />
      <div className="flex items-center gap-3 rounded-ctl border border-line bg-canvas px-3 py-2.5">
        <span className="text-[12px] font-semibold text-ink-muted">ATS score</span>
        <span className="font-mono text-[15px] text-ink-muted">49</span>
        <span aria-hidden="true" className="text-ink-muted">→</span>
        <span className="font-mono text-[18px] font-bold text-teal">78</span>
        <span className="ml-auto text-[12px] font-semibold text-ink-soft">Moderate</span>
      </div>
      <div className="rounded-ctl border border-line bg-canvas p-3.5">
        <span className="text-[12px] font-bold uppercase tracking-[0.12em] text-ink-muted">Your line</span>
        <p className="mt-1.5 text-[13px] leading-relaxed text-ink-soft">Handled instrument testing tasks at the plant site.</p>
      </div>
      <div className="rounded-ctl border border-teal/30 bg-teal-soft/50 p-3.5">
        <span className="text-[12px] font-bold uppercase tracking-[0.12em] text-teal">Written for this job</span>
        <p className="mt-1.5 text-[13px] font-medium leading-relaxed text-ink">
          Carried out <mark className="rounded bg-ok-soft px-0.5 text-ink">loop checks</mark> and{' '}
          <mark className="rounded bg-[#DCEAF7] px-0.5 font-semibold text-sec-status">commissioning</mark> of field instruments across the
          plant site.
        </p>
      </div>
      <p className="flex items-start gap-2 text-[12px] leading-snug text-ink-soft">
        <CheckCircleIcon className="mt-px size-4 shrink-0 text-teal" />
        Same employers, titles and dates. Only the wording changes.
      </p>
    </Sheet>
  )
}

/** Cover letter. */
export function LetterVisual() {
  const tones = ['Professional', 'Short', 'Technical', 'Explanatory']
  return (
    <Sheet>
      <Head label="Cover letter" />
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
      <p className="text-[12px] leading-snug text-ink-soft">Same job, same facts as the CV it goes with.</p>
    </Sheet>
  )
}

/** Interview Q&A. */
export function QaVisual() {
  return (
    <Sheet>
      <Head label="Interview Q&A" />
      <div className="flex flex-wrap gap-1.5">
        {['HR', 'Technical', 'Projects', 'Gulf work'].map((t) => (
          <span key={t} className="rounded-full border border-line px-2.5 py-1 text-[12px] font-semibold text-ink-soft">
            {t}
          </span>
        ))}
      </div>
      <div className="flex flex-col gap-2">
        <p className="rounded-card rounded-tl-none bg-canvas px-4 py-3 text-[13px] font-semibold leading-relaxed text-ink">
          Walk me through a commissioning package you owned from start to handover.
        </p>
        <p className="rounded-card rounded-tr-none border border-teal/20 bg-teal-soft px-4 py-3 text-[12.5px] leading-relaxed text-ink">
          Answer drawn from your CV: the scope, what you personally did, the standard you followed and the result.
        </p>
      </div>
      <p className="text-[12px] leading-snug text-ink-soft">Up to 25 questions, saved with this job.</p>
    </Sheet>
  )
}

/** Mock interview — the four dimensions the text report scores. */
export function MockVisual() {
  return (
    <Sheet>
      <Head label="Mock interview" />
      <div className="flex flex-col gap-2.5">
        <Bar label="Technical" v={72} tone="teal" />
        <Bar label="Role fit" v={68} tone="teal" />
        <Bar label="Gulf readiness" v={61} tone="gold" />
        <Bar label="Answer structure" v={54} tone="gold" />
      </div>
      <p className="rounded-ctl bg-canvas px-3 py-2 text-[12px] leading-snug text-ink-soft">
        Next time: open with the scope and your own role, then give one number.
      </p>
      <p className="text-[12px] leading-snug text-ink-muted">
        Feedback on written answers — preparation guidance, not a hiring prediction.
      </p>
    </Sheet>
  )
}
