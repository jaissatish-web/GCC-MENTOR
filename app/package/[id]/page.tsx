'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Suspense, useEffect, useRef, useState } from 'react'
import GulfPremium from '@/components/templates/GulfPremium'
import { AppShell } from '@/components/layout/AppShell'
import type { CareerProfileFull } from '@/types/careerProfile'
import type { OptimizedContent, Package } from '@/types/package'

/**
 * Results & download — screen 10 (TASK-033), route /package/[id].
 *
 * POST-payment results screen. SECURITY: if `is_paid` is false when this loads
 * (someone navigated here directly without paying), we redirect to
 * /optimize/pay/[id] and show nothing — the real deliverable is NEVER rendered
 * for an unpaid load.
 *
 * When paid: renders the paid user's OWN full resume inline via the single
 * template (GulfPremium) and offers the actions from Step 10: Download PDF /
 * Word (the existing is_paid-gated GET /api/packages/[id]/pdf and /docx
 * routes, TASK-030/032), Share to WhatsApp (a wa.me link, no backend), and
 * "Edit text" → back to the Changes tab of this package
 * (/optimize/preview/[id]). A repeat-purchase prompt appears after a download,
 * per docs/DASHBOARD_LIBRARY.md: "Applying somewhere else? Your profile is
 * saved — next one takes a minute."
 */

function PackageScreenInner({ id }: { id: string }) {
  const router = useRouter()
  const [pkg, setPkg] = useState<Package | null>(null)
  const [profile, setProfile] = useState<CareerProfileFull | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [downloaded, setDownloaded] = useState(false)
  const didInit = useRef(false)

  useEffect(() => {
    if (didInit.current) return
    didInit.current = true
    Promise.all([
      fetch(`/api/packages/${encodeURIComponent(id)}`, { cache: 'no-store' }).then((r) =>
        r.ok ? r.json() : null
      ),
      fetch('/api/profile', { cache: 'no-store' }).then((r) => (r.ok ? r.json() : null)),
    ])
      .then(([pkgData, profileData]) => {
        const p = pkgData?.package as Package | undefined
        if (!p) {
          setError('Package not found.')
          return
        }
        // Security gate: never show the real deliverable to an unpaid load.
        if (!p.is_paid) {
          router.replace(`/optimize/pay/${encodeURIComponent(id)}`)
          return
        }
        setPkg(p)
        setProfile(profileData as CareerProfileFull | null)
      })
      .catch(() => setError('Could not load this package.'))
  }, [id, router])

  if (error) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-marble px-5">
        <p className="text-sm text-state-terra-text">{error}</p>
      </div>
    )
  }

  if (!pkg) {
    // While checking is_paid we show nothing but a loader — never content.
    return (
      <div className="flex min-h-dvh items-center justify-center bg-marble">
        <p className="font-mono text-sm text-ink-muted">Loading…</p>
      </div>
    )
  }

  const firstName = profile ? profile.full_name.trim().split(/\s+/)[0] || 'there' : 'there'
  const pdfUrl = `/api/packages/${encodeURIComponent(id)}/pdf`
  const docxUrl = `/api/packages/${encodeURIComponent(id)}/docx`
  const whatsappText = encodeURIComponent(`Here is my optimized Gulf CV: ${pkg.target_job_title}`)
  const waUrl = `https://wa.me/?text=${whatsappText}`

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-5xl flex-col bg-marble">
      {/* Status bar */}
      <header className="flex h-11 items-center justify-between px-5 text-[12px] font-semibold text-midnight">
        <span>9:41</span>
        <span className="tracking-[0.14em]">▮▮▮</span>
      </header>

      <div className="flex flex-col gap-3 px-5 pb-6 pt-1.5">
        <button
          type="button"
          aria-label="Go back"
          onClick={() => router.back()}
          className="flex size-11 items-center justify-center rounded-lg text-[20px] leading-none text-midnight focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-midnight focus-visible:ring-offset-2"
        >
          ←
        </button>

        <span className="self-start rounded-[5px] bg-state-emerald-bg px-2 py-1 text-[9px] font-semibold uppercase tracking-wider text-emerald">
          ✓ Unlocked &amp; saved to Library
        </span>
        <h1 className="font-serif text-[27px] leading-tight text-midnight">Your Gulf CV is ready, {firstName}</h1>

        {/* Actions */}
        <div className="mt-1 flex flex-wrap gap-2">
          <a
            href={pdfUrl}
            onClick={() => setDownloaded(true)}
            className="min-h-11 rounded-lg bg-midnight px-4 py-3 text-[12.5px] font-bold text-marble focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-midnight focus-visible:ring-offset-2"
          >
            Download PDF
          </a>
          <a
            href={docxUrl}
            onClick={() => setDownloaded(true)}
            className="min-h-11 rounded-lg border border-line-strong bg-white px-4 py-3 text-[12.5px] font-semibold text-midnight focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-midnight focus-visible:ring-offset-2"
          >
            Word (.docx)
          </a>
          <a
            href={waUrl}
            target="_blank"
            rel="noreferrer"
            className="min-h-11 rounded-lg border border-line-strong bg-white px-4 py-3 text-[12.5px] font-semibold text-midnight focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-midnight focus-visible:ring-offset-2"
          >
            Share to WhatsApp
          </a>
          <Link
            href={`/optimize/preview/${encodeURIComponent(id)}`}
            className="min-h-11 rounded-lg border border-line-strong bg-white px-4 py-3 text-[12.5px] font-semibold text-emerald focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald focus-visible:ring-offset-2"
          >
            Edit text
          </Link>
        </div>

        {downloaded ? (
          <div className="rounded-xl border border-state-emerald-line bg-state-emerald-bg px-3.5 py-3 text-[12.5px] text-emerald">
            Applying somewhere else? Your profile is saved — next one takes a minute.
          </div>
        ) : null}

        {/* Inline full resume preview (paid owner's own document) */}
        {profile ? (
          <div className="mt-1 overflow-hidden rounded-2xl border border-line bg-white">
            <GulfPremium
              profile={profile}
              optimizedContent={(pkg.optimized_content ?? {
                summary: { generated: '', source_profile_summary: '' },
                experience_blocks: [],
              }) as OptimizedContent}
              skillsOrder={pkg.skills_order ?? []}
              fieldVisibility={pkg.field_visibility_snapshot ?? null}
            />
          </div>
        ) : null}
      </div>
    </main>
  )
}

export default function PackagePage({ params }: { params: { id: string } }) {
  const id = params.id
  return (
    <AppShell>
      <Suspense>
        <PackageScreenInner id={id} />
      </Suspense>
    </AppShell>
  )
}
