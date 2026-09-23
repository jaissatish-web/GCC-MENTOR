import {
  ChatBubbleLeftRightIcon,
  CheckIcon,
  DocumentTextIcon,
  EnvelopeIcon,
  QuestionMarkCircleIcon,
  ShieldCheckIcon,
  UserCircleIcon,
} from '@heroicons/react/24/outline'
import { cn } from '@/lib/utils'

/**
 * The hero's picture: one profile becoming one complete application.
 *
 * It replaces an illustration of an engineer, which said "Gulf" but not what
 * the product does. This says it in one look — a Career Profile on the left,
 * one target job in the middle, and everything prepared for that job on the
 * right — drawn from the same tokens as the real screens.
 *
 * Example data, labelled as such. Decorative for assistive tech: the headline
 * and the list beside it say the same thing in words.
 */
export function HeroPreview() {
  const docs = [
    { icon: DocumentTextIcon, label: 'Optimized CV', meta: 'ATS 49 → 78', done: true },
    { icon: EnvelopeIcon, label: 'Cover letter', meta: 'Professional tone', done: true },
    { icon: QuestionMarkCircleIcon, label: 'Interview Q&A', meta: '25 answers', done: true },
    { icon: ChatBubbleLeftRightIcon, label: 'Mock interview', meta: 'Practise next', done: false },
  ]
  return (
    <div aria-hidden="true" className="relative min-w-0">
      <div className="overflow-hidden rounded-card-lg border border-line bg-white shadow-m-3">
        {/* Window bar */}
        <div className="flex items-center justify-between gap-3 border-b border-line bg-canvas px-4 py-3">
          <span className="flex gap-1.5">
            <span className="size-2.5 rounded-full bg-line-strong" />
            <span className="size-2.5 rounded-full bg-line-strong" />
            <span className="size-2.5 rounded-full bg-line-strong" />
          </span>
          <span className="text-[12px] font-semibold text-ink-muted">Your application workspace</span>
          <span className="rounded-full bg-white px-2 py-0.5 text-[12px] font-bold uppercase tracking-[0.08em] text-ink-muted">
            Example
          </span>
        </div>

        <div className="grid gap-3 p-4 sm:grid-cols-[0.9fr_1.1fr] sm:p-5">
          {/* Source of truth */}
          <div className="flex flex-col gap-3 rounded-card border border-line bg-canvas p-4">
            <span className="flex items-center gap-2 text-[12px] font-bold uppercase tracking-[0.12em] text-teal">
              <UserCircleIcon className="size-4" />
              Career Profile
            </span>
            <div className="flex flex-col gap-2">
              {['6 roles · 14 years', '3 GCC projects', '22 skills', '4 certifications'].map((row) => (
                <span key={row} className="flex items-center gap-2 text-[13px] font-medium text-ink">
                  <span className="flex size-5 items-center justify-center rounded-full bg-ok text-white">
                    <CheckIcon className="size-3" />
                  </span>
                  {row}
                </span>
              ))}
            </div>
            <div className="mt-auto rounded-ctl bg-white p-3">
              <div className="flex items-baseline justify-between">
                <span className="text-[12px] font-semibold text-ink-soft">Gulf Readiness</span>
                <span className="font-mono text-[15px] font-bold text-teal">72</span>
              </div>
              <span className="mt-2 block h-1.5 overflow-hidden rounded-full bg-line">
                <span className="block h-full w-[72%] rounded-full bg-teal" />
              </span>
            </div>
          </div>

          {/* One target job, everything prepared for it */}
          <div className="flex flex-col gap-3">
            <div className="rounded-card bg-teal p-4 text-white">
              <span className="text-[12px] font-bold uppercase tracking-[0.12em] text-teal-soft">Target job</span>
              <p className="mt-1 font-display text-[18px] font-semibold leading-tight">Senior Instrumentation Engineer</p>
              <p className="mt-0.5 text-[12.5px] text-teal-soft">Job description added · Saudi Arabia</p>
            </div>
            <ul className="flex flex-col gap-2">
              {docs.map((d) => (
                <li key={d.label} className="flex items-center gap-3 rounded-ctl border border-line bg-white px-3 py-2.5">
                  <span
                    className={cn(
                      'flex size-8 shrink-0 items-center justify-center rounded-ctl',
                      d.done ? 'bg-teal-soft text-teal' : 'bg-canvas text-ink-muted',
                    )}
                  >
                    <d.icon className="size-[18px]" />
                  </span>
                  <span className="flex min-w-0 flex-1 flex-col">
                    <span className="truncate text-[13.5px] font-semibold text-ink">{d.label}</span>
                    <span className="truncate text-[12px] text-ink-muted">{d.meta}</span>
                  </span>
                  <span
                    className={cn(
                      'shrink-0 rounded-full px-2 py-0.5 text-[12px] font-bold uppercase tracking-[0.06em]',
                      d.done ? 'bg-ok-soft text-ok' : 'bg-gold-soft text-gold-ink',
                    )}
                  >
                    {d.done ? 'Ready' : 'Next'}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="flex items-center gap-2 border-t border-line bg-canvas px-4 py-3 text-[12.5px] font-medium text-ink-soft">
          <ShieldCheckIcon className="size-4 shrink-0 text-teal" />
          Checked against your Career Profile. Nothing new is added without your confirmation.
        </div>
      </div>
    </div>
  )
}
