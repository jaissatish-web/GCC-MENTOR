'use client'

import { useState } from 'react'
import { cn } from '@/lib/utils'
import type { MatchReport } from '@/lib/optimizer/types'

/**
 * Suggested lines for missing requirements (Moderate / High), shown on the
 * package screen. Nothing here is on the CV until the user confirms it —
 * as drafted, or in their own words. docs/17_OPTIMIZER_ENGINE.md §6b.
 */

type Action = { id: string; action: 'confirm' | 'dismiss'; text?: string | null }

export function SuggestionsPanel({
  report,
  roleNames,
  onAction,
}: {
  report: MatchReport
  roleNames: Record<string, string>
  onAction: (actions: Action[]) => Promise<void>
}) {
  const pending = (report.suggestions ?? []).filter((s) => s.status === 'pending')
  const [editing, setEditing] = useState<string | null>(null)
  const [text, setText] = useState('')
  const [busy, setBusy] = useState<string | null>(null)
  if (pending.length === 0) return null

  const after = report.after?.total ?? report.before.total
  const projected = report.projected_with_suggestions ?? after
  const band = report.target_band
  const run = async (key: string, actions: Action[]) => {
    setBusy(key)
    try {
      await onAction(actions)
      setEditing(null)
    } finally {
      setBusy(null)
    }
  }

  return (
    <section className="flex flex-col gap-3 rounded-card border border-gold/50 bg-gold-soft/40 p-4 sm:p-5">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <p className="text-[12px] font-bold uppercase tracking-[0.12em] text-gold-ink">Boost your ATS score</p>
          <h2 className="font-display text-[18px] leading-tight text-ink">
            {pending.length} suggested line{pending.length === 1 ? '' : 's'} for what this job asks
          </h2>
        </div>
        <p className="text-[13px] text-ink">
          ATS score now <strong>{after}</strong> → up to <strong className="text-teal">{projected}</strong>
          {band ? <span className="text-ink-muted"> · level aim {band[0]}–{band[1]}</span> : null}
        </p>
      </div>
      <p className="text-[12.5px] leading-relaxed text-ink-soft">
        Your profile doesn&apos;t mention these yet. <strong className="text-ink">Add a line only if it is true for you</strong> — edit it
        into your own words if needed. Recruiters may ask about anything on your CV.
      </p>

      <ul className="flex flex-col gap-2">
        {pending.map((s) => {
          const where = s.block === 'summary' ? 'Summary' : s.block === 'skills' ? 'Skills' : roleNames[s.block] ?? 'Experience'
          const isEditing = editing === s.id
          return (
            <li key={s.id} className="flex flex-col gap-2 rounded-ctl border border-line bg-white p-3">
              <div className="flex flex-wrap items-center gap-2 text-[11.5px]">
                <span className="rounded-full bg-teal-soft px-2 py-0.5 font-semibold text-teal">{s.requirement}</span>
                <span className="text-ink-muted">→ {where}</span>
              </div>
              {isEditing ? (
                <textarea value={text} onChange={(e) => setText(e.target.value)} rows={3} className="field p-2.5 text-[13px]" aria-label="Edit suggested line" />
              ) : (
                <p className="text-[13px] leading-relaxed text-ink">{s.text}</p>
              )}
              <div className="flex flex-wrap gap-2">
                {isEditing ? (
                  <>
                    <button
                      type="button"
                      disabled={busy !== null || text.trim().length < 3}
                      onClick={() => void run(s.id, [{ id: s.id, action: 'confirm', text: text.trim() }])}
                      className="min-h-9 rounded-ctl bg-teal px-3 text-[12.5px] font-semibold text-white disabled:opacity-50"
                    >
                      {busy === s.id ? 'Adding…' : 'Add my version'}
                    </button>
                    <button type="button" onClick={() => setEditing(null)} className="min-h-9 rounded-ctl border border-line-strong bg-white px-3 text-[12.5px] font-semibold text-ink">
                      Cancel
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      type="button"
                      disabled={busy !== null}
                      onClick={() => void run(s.id, [{ id: s.id, action: 'confirm' }])}
                      className="min-h-9 rounded-ctl bg-teal px-3 text-[12.5px] font-semibold text-white disabled:opacity-50"
                    >
                      {busy === s.id ? 'Adding…' : '✓ I did this — add'}
                    </button>
                    <button
                      type="button"
                      disabled={busy !== null}
                      onClick={() => {
                        setEditing(s.id)
                        setText(s.text)
                      }}
                      className="min-h-9 rounded-ctl border border-line-strong bg-white px-3 text-[12.5px] font-semibold text-ink disabled:opacity-50"
                    >
                      ✎ Edit
                    </button>
                    <button
                      type="button"
                      disabled={busy !== null}
                      onClick={() => void run(s.id, [{ id: s.id, action: 'dismiss' }])}
                      className={cn('min-h-9 rounded-ctl px-3 text-[12.5px] font-semibold text-ink-muted hover:text-alert disabled:opacity-50')}
                    >
                      Not true for me
                    </button>
                  </>
                )}
              </div>
            </li>
          )
        })}
      </ul>
    </section>
  )
}
