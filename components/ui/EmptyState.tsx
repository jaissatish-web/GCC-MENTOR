import * as React from 'react'
import { cn } from '@/lib/utils'

/**
 * EmptyState — what a list says when it has nothing in it.
 *
 * WHY THIS EXISTS. The app had **nine different phrasings** and no component:
 * "No packages yet", "No resumes yet", "No activity yet", "No bullets yet",
 * "No versions yet", "No promo codes created yet", "No service packages created
 * yet", "No credits granted to this user yet", "No access recorded yet". Nine
 * ways to say one thing, at five different sizes and weights.
 *
 * **And almost none of them offered the action that would fill the space.**
 * That is the real defect. An empty list is not an error state — for a new user
 * it is the FIRST state, and on the resume library it is the first thing they
 * ever see. A dead end there is a lost user; a button there is onboarding.
 *
 * So `action` is a first-class prop rather than something a call site remembers
 * to add, and the copy rules are in the API:
 *
 *   title  — what is not here, in the user's words ("No resumes yet")
 *   body   — one line on what will appear, or why it is empty
 *   action — the thing that fills it. Omit ONLY where the user genuinely
 *            cannot act, such as an audit log with nothing recorded.
 *
 * `tone="inline"` is for a small region inside a populated page — a panel in a
 * sidebar, a sub-list. `tone="page"` is for a whole screen with nothing on it.
 */
export interface EmptyStateProps extends React.HTMLAttributes<HTMLDivElement> {
  title: string
  body?: string
  /** Usually a <Button> or a <Link> styled as one. */
  action?: React.ReactNode
  tone?: 'page' | 'inline'
}

const EmptyState = React.forwardRef<HTMLDivElement, EmptyStateProps>(
  ({ className, title, body, action, tone = 'page', ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        'flex flex-col items-center rounded-bp-lg border border-dashed border-edge-strong bg-white text-center font-redesign-sans',
        tone === 'page' ? 'gap-2 px-6 py-10' : 'gap-1.5 px-4 py-6',
        className,
      )}
      {...props}
    >
      {/* A quiet placeholder mark. Deliberately abstract: a literal icon per
          empty list would be nine more decisions and nine more inconsistencies. */}
      <span
        aria-hidden="true"
        className={cn(
          'rounded-bp bg-paper',
          tone === 'page' ? 'mb-1 size-9' : 'mb-0.5 size-7',
        )}
      />
      <p className={cn('font-semibold text-graphite', tone === 'page' ? 'text-[15px]' : 'text-[13px]')}>
        {title}
      </p>
      {/* ink-700, not ink-400. Measured 2026-09-08: ink-400 (#6B7A8D) is
          4.38:1 on white, 4.15:1 on the page ground and 3.86:1 on an inset
          surface — it fails 4.5:1 everywhere it is used. A new component should
          not be born failing the standard, so this one uses ink-700 (7.71:1).
          The token itself is a wider problem, recorded in 14_OPEN_ITEMS.md. */}
      {body ? (
        <p className={cn('max-w-[34ch] text-graphite-soft', tone === 'page' ? 'text-[13px]' : 'text-[12px]')}>
          {body}
        </p>
      ) : null}
      {action ? <div className={tone === 'page' ? 'mt-2' : 'mt-1.5'}>{action}</div> : null}
    </div>
  ),
)
EmptyState.displayName = 'EmptyState'

export { EmptyState }
