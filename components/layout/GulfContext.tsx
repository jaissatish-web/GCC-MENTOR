import { cn } from '@/lib/utils'

/** Shared regional identity for UI only; never rendered inside a CV. */
export function GulfContext({ className, children }: { className?: string; children?: React.ReactNode }) {
  return (
    <div className={cn('gulf-context', className)}>
      <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" className="size-4 shrink-0" stroke="currentColor" strokeWidth="1.5">
        <path d="M4 21V10c0-4 4-7 8-9 4 2 8 5 8 9v11M8 21V11c0-2 2-4 4-6 2 2 4 4 4 6v10M2 21h20" />
      </svg>
      <span>{children ?? 'Your Gulf career workspace'}</span>
    </div>
  )
}
