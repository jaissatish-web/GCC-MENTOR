'use client'

import { useRouter } from 'next/navigation'
import { Suspense, useCallback, useEffect, useRef, useState } from 'react'
import { Button } from '@/components/ui/Button'
import { AppShell } from '@/components/layout/AppShell'
import { Toggle } from '@/components/ui/Toggle'
import { DEFAULT_FIELD_VISIBILITY } from '@/lib/fieldVisibility'
import type { FieldVisibility } from '@/types/careerProfile'

/**
 * Field visibility screen — screen 04b (TASK-025), route /profile/visibility.
 *
 * Conversion of the "04b · Field visibility & PII" screen in
 * design-reference/MVP Screens.dc.html (lines 673–718): a toggle per field,
 * each carrying country-context copy (the reason to show or hide, not just a
 * switch), a static PII footer note, and a single "Done" footer button.
 *
 * API contract (TASK-013, approved):
 *   - PUT /api/profile/visibility takes a PARTIAL map and MERGES it; there is
 *     no GET for visibility alone. We load current state from GET /api/profile
 *     (its `field_visibility` property), same as TASK-024's editor.
 *   - Key names differ from the career_profiles columns — it is `photo` not
 *     `photo_url`, `passport_validity` not `passport_validity_date`. The valid
 *     key set is exactly VALID_FIELD_KEYS in app/api/profile/visibility/route.ts
 *     (the keys of FieldVisibility). There is NO `professional_summary` key —
 *     the summary is core resume content and has no toggle — so none is built.
 *   - Defaults (true everywhere except `passport_type` and `date_of_birth`)
 *     apply when a key is absent, reused verbatim from DEFAULT_FIELD_VISIBILITY
 *     in lib/fieldVisibility.ts — the single shared source, imported by both
 *     this screen and the /profile editor so they cannot drift.
 *
 * BEHAVIOUR: toggles only update local state — nothing is written on flip.
 * "Done" batches the whole map into a single PUT and then returns to /profile
 * (the editor the user came from). Hiding a field never deletes data (TASK-013
 * write scope); the footer note states the encryption/logging/deletion facts.
 *
 * HINT COPY (contract #4): there is no per-country conventions table anywhere
 * in docs/ (identical gap already logged at docs/TASKS.md Unplanned #8 for a
 * different ticket), and the mockup's "Expected in KSA & Qatar" strings are
 * illustrative, not backed by data. Each field therefore carries ONE sensible
 * static hint explaining why a Gulf employer would expect it or not — new copy
 * for founder review, non-blocking (same standing as TASK-024's nudge strings).
 */

// Ordered list of the 15 valid visibility fields (== VALID_FIELD_KEYS in the
// visibility route), each with a label and a single static country-context hint.
// Edits here must stay in lockstep with the FieldVisibility type — every key
// present, no invented keys (there is intentionally no professional_summary).
const FIELDS: ReadonlyArray<{ key: keyof FieldVisibility; label: string; hint: string }> = [
  { key: 'photo', label: 'Photo', hint: 'Expected on most Gulf CVs — passport-style.' },
  { key: 'full_name', label: 'Full name', hint: 'Always shown.' },
  { key: 'nationality', label: 'Nationality', hint: 'Standard on Gulf CVs.' },
  { key: 'date_of_birth', label: 'Date of birth', hint: 'Some employers ask for it; safe to hide if unsure.' },
  { key: 'passport_type', label: 'Passport type (ECR / Non-ECR)', hint: 'Affects Gulf hiring for Indian nationals.' },
  { key: 'passport_validity', label: 'Passport validity date', hint: 'Visa processing needs a valid passport.' },
  { key: 'visa_status', label: 'Visa status', hint: 'Shows your current right-to-work status.' },
  { key: 'visa_transferable', label: 'Visa transferability', hint: 'A transferable visa appeals to many Gulf employers.' },
  { key: 'notice_period', label: 'Notice period', hint: 'Employers plan around your notice period.' },
  { key: 'current_location', label: 'Current location', hint: 'Helps employers gauge relocation.' },
  { key: 'phone', label: 'Phone', hint: 'Contact for interview calls.' },
  { key: 'whatsapp', label: 'WhatsApp', hint: 'The preferred contact channel across the Gulf.' },
  { key: 'email', label: 'Email', hint: 'Contact for interview calls and offers.' },
  { key: 'linkedin_url', label: 'LinkedIn URL', hint: 'Employers often check your profile.' },
  { key: 'additional_information', label: 'Additional information', hint: 'Whole block — languages, awards, the rest.' },
]

function VisibilityScreen() {
  const router = useRouter()
  const [vis, setVis] = useState<FieldVisibility | null>(null)
  const [loaded, setLoaded] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const didInit = useRef(false)

  // Load current visibility from GET /api/profile (there is no visibility-only
  // GET). Missing keys fall back to the shared defaults.
  useEffect(() => {
    if (didInit.current) return
    didInit.current = true

    fetch('/api/profile', { cache: 'no-store' })
      .then((res) => {
        if (res.status === 200) return res.json()
        if (res.status === 404) return null
        throw new Error(String(res.status))
      })
      .then((data) => {
        const stored = (data?.field_visibility ?? {}) as Partial<FieldVisibility>
        setVis({ ...DEFAULT_FIELD_VISIBILITY, ...stored })
        setLoaded(true)
      })
      .catch(() => {
        // Non-fatal pre-Supabase: fall back to defaults but surface a notice.
        setVis({ ...DEFAULT_FIELD_VISIBILITY })
        setLoadError('Could not load your saved visibility settings.')
        setLoaded(true)
      })
  }, [])

  const flip = useCallback((key: keyof FieldVisibility, value: boolean) => {
    setVis((v) => (v ? { ...v, [key]: value } : v))
  }, [])

  // Batch ALL toggles into a single PUT on "Done" — never one call per flip.
  const onDone = useCallback(async () => {
    if (!vis) return
    setSaveError(null)
    setSaving(true)
    try {
      const res = await fetch('/api/profile/visibility', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(vis),
      })
      if (!res.ok) {
        let msg = 'Could not save your visibility settings.'
        try {
          const body = await res.json()
          if (body?.error) msg = String(body.error)
        } catch {
          /* keep default */
        }
        setSaveError(msg)
        setSaving(false)
        return
      }
      // Return to the profile editor the user came from.
      router.push('/profile')
    } catch {
      setSaveError('Network error. Please check your connection and try again.')
      setSaving(false)
    }
  }, [vis, router])

  if (!loaded || !vis) {
    return (
      <main className="mx-auto flex min-h-dvh w-full max-w-5xl items-center justify-center bg-void">
        <p className="font-mono text-sm text-marble/55">Loading…</p>
      </main>
    )
  }

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-5xl flex-col bg-void">
      {/* Status bar */}
      <header className="flex h-11 items-center justify-between px-5 text-[12px] font-semibold text-marble">
        <span>9:41</span>
        <span className="tracking-[0.14em]">▮▮▮</span>
      </header>

      {/* Back + heading */}
      <div className="flex flex-col gap-2 px-5 pb-4 pt-1.5">
        <button
          type="button"
          aria-label="Go back"
          onClick={() => router.back()}
          className="flex size-11 items-center justify-center rounded-lg text-[20px] leading-none text-marble focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-midnight focus-visible:ring-offset-2"
        >
          ←
        </button>
        <h1 className="font-serif text-[27px] leading-tight text-marble">What appears on your CV</h1>
        <p className="text-[13px] leading-normal text-marble/70 [text-wrap:pretty]">
          Gulf employers expect some of these; others you may prefer to hide. Hiding a field never
          deletes it — the template closes the gap cleanly.
        </p>
      </div>

      {/* Toggles */}
      <div className="flex flex-1 flex-col gap-2 overflow-y-auto px-5">
        {FIELDS.map(({ key, label, hint }) => (
          <div
            key={key}
            className="flex items-center justify-between gap-3 rounded-xl border border-hairline/60 bg-surface px-4 py-3.5"
          >
            <div className="flex min-w-0 flex-col gap-0.5">
              <span className="text-[13px] font-semibold text-marble">{label}</span>
              <span className="text-[11px] leading-snug text-marble/60">{hint}</span>
            </div>
            <Toggle checked={vis[key]} onCheckedChange={(v) => flip(key, v)} aria-label={label} />
          </div>
        ))}
      </div>

      {/* Static PII footer note (mockup verbatim) + Done */}
      {saveError ? (
        <div className="mx-5 mt-3 rounded-xl border border-terracotta/30 bg-state-terra-bg px-3.5 py-3 text-[12px] text-state-terra-text">
          {saveError}
        </div>
      ) : null}
      <div className="flex flex-col gap-3 px-5 pb-6 pt-4">
        <div className="flex items-start gap-2.5 rounded-xl border border-hairline/60 bg-surface px-3.5 py-3">
          <span className="text-[13px] text-emerald">⌾</span>
          <p className="text-[11px] leading-snug text-marble/70">
            Passport and visa fields are encrypted. Every internal access is logged. You can delete
            your profile and all packages at any time from Settings.
          </p>
        </div>
        <Button variant="primary" className="w-full" disabled={saving} onClick={onDone}>
          {saving ? 'Saving…' : 'Done'}
        </Button>
      </div>
    </main>
  )
}

// Keep a Suspense boundary so any future useSearchParams can't trip the
// next.js CSR-bailout during static generation.
export default function ProfileVisibilityPage() {
  return (
    <AppShell>
      <Suspense>
        <VisibilityScreen />
      </Suspense>
    </AppShell>
  )
}
