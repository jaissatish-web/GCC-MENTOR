import { AlertCircle, CheckCircle2, Info, MailCheck } from 'lucide-react'
import { cn } from '@/lib/utils'

/**
 * One shape for every auth message — error, success, info, and the "check
 * your inbox" state — so a notification reads the same on every screen.
 * Errors are announced (role=alert); the rest are polite (role=status).
 */
const TONES = {
  error: { box: 'border-alert/35 bg-alert-soft', icon: AlertCircle, iconCls: 'text-alert', title: 'text-alert' },
  success: { box: 'border-ok/30 bg-ok-soft', icon: CheckCircle2, iconCls: 'text-ok', title: 'text-ok' },
  info: { box: 'border-line bg-canvas', icon: Info, iconCls: 'text-teal', title: 'text-ink' },
  mail: { box: 'border-teal/30 bg-teal-soft/60', icon: MailCheck, iconCls: 'text-teal', title: 'text-ink' },
} as const

export function Notice({
  tone,
  title,
  children,
  className,
}: {
  tone: keyof typeof TONES
  title?: string
  children: React.ReactNode
  className?: string
}) {
  const t = TONES[tone]
  const Icon = t.icon
  return (
    <div role={tone === 'error' ? 'alert' : 'status'} className={cn('flex gap-3 rounded-[14px] border px-3.5 py-3', t.box, className)}>
      <Icon className={cn('mt-0.5 size-5 shrink-0', t.iconCls)} aria-hidden="true" />
      <div className="min-w-0 text-[14px] leading-relaxed text-ink-soft">
        {title ? <p className={cn('font-semibold', t.title)}>{title}</p> : null}
        <div className={title ? 'mt-0.5' : undefined}>{children}</div>
      </div>
    </div>
  )
}
