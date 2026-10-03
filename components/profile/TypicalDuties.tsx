'use client'

import { useState } from 'react'
import { cn } from '@/lib/utils'

/**
 * "Typical duties — tick what you really did" for a job listed with no duties
 * (2026-10-03, launch audit I1). Gulf CVs often list a job as title, employer
 * and dates only; recruiters skip those, and the optimizer has nothing true to
 * write from. Ticking is faster than typing on a phone, and only ticked lines
 * are added — to the editor, so the user still reviews and saves them.
 */
export function TypicalDuties({ role, onAdd }: { role: string; onAdd: (lines: string[]) => void }) {
  const [state, setState] = useState<'idle' | 'loading' | 'ready' | 'added'>('idle')
  const [duties, setDuties] = useState<string[]>([])
  const [ticked, setTicked] = useState<Set<number>>(() => new Set())
  const [error, setError] = useState<string | null>(null)

  async function load() {
    setState('loading')
    setError(null)
    try {
      const res = await fetch('/api/profile/typical-duties', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ title: role }),
      })
      const payload = await res.json().catch(() => ({}))
      if (!res.ok || !Array.isArray(payload?.duties)) {
        setError((payload?.error as string | undefined) ?? 'Could not load typical duties. Please try again.')
        setState('idle')
        return
      }
      setDuties(payload.duties as string[])
      setTicked(new Set())
      setState('ready')
    } catch {
      setError('Could not reach the server. Check your connection and try again.')
      setState('idle')
    }
  }

  if (state === 'added') {
    return (
      <p role="status" className="rounded-ctl border border-teal/30 bg-teal-soft px-3.5 py-3 text-[13px] text-teal">
        Added to this job below. Change any wording you like, then press <strong>Save</strong> to keep them.
      </p>
    )
  }

  return (
    <div className="flex flex-col gap-3 rounded-ctl border border-gold/50 bg-gold-soft px-3.5 py-3">
      <p className="text-[13px] leading-relaxed text-ink">
        <strong>No duties listed for this job.</strong> Recruiters skip jobs without them, and your tailored CV is written from these
        lines. See the typical duties of a {role} and tick only what you really did.
      </p>
      {error ? (
        <p role="alert" className="text-[12.5px] text-alert">
          {error}
        </p>
      ) : null}
      {state !== 'ready' ? (
        <button
          type="button"
          onClick={() => void load()}
          disabled={state === 'loading'}
          className="min-h-11 w-fit rounded-ctl border border-teal/40 bg-white px-4 text-[13.5px] font-semibold text-teal disabled:opacity-60"
        >
          {state === 'loading' ? 'Loading typical duties…' : 'Suggest typical duties'}
        </button>
      ) : (
        <>
          <fieldset className="flex flex-col gap-1.5">
            <legend className="sr-only">Typical duties of a {role}</legend>
            {duties.map((d, i) => (
              <label
                key={d}
                className={cn(
                  'flex min-h-11 cursor-pointer items-start gap-3 rounded-ctl border bg-white px-3 py-2.5 text-[13.5px] leading-snug text-ink',
                  ticked.has(i) ? 'border-teal' : 'border-line',
                )}
              >
                <input
                  type="checkbox"
                  checked={ticked.has(i)}
                  onChange={() =>
                    setTicked((s) => {
                      const next = new Set(s)
                      if (next.has(i)) next.delete(i)
                      else next.add(i)
                      return next
                    })
                  }
                  className="mt-0.5 size-5 shrink-0 accent-teal"
                />
                <span>{d}</span>
              </label>
            ))}
          </fieldset>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              disabled={ticked.size === 0}
              onClick={() => {
                onAdd(duties.filter((_, i) => ticked.has(i)))
                setState('added')
              }}
              className="min-h-11 rounded-ctl bg-teal px-4 text-[13.5px] font-semibold text-white disabled:opacity-50"
            >
              {ticked.size === 0 ? 'Tick what you did' : `Add ${ticked.size} dut${ticked.size === 1 ? 'y' : 'ies'} to this job`}
            </button>
            <span className="text-[12px] text-ink-muted">Only tick what you really did — an interviewer can ask about any line.</span>
          </div>
        </>
      )}
    </div>
  )
}
