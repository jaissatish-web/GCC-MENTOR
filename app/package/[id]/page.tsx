'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Suspense, useEffect, useRef, useState } from 'react'
import { getTemplate } from '@/lib/templates'
import { ResumeDocumentView } from '@/components/resume/ResumeDocumentView'
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
      <div className="flex min-h-dvh items-center justify-center bg-bg px-5">
        <p className="text-sm text-terra">{error}</p>
      </div>
    )
  }

  if (!pkg) {
    // While checking is_paid we show nothing but a loader — never content.
    return (
      <div className="flex min-h-dvh items-center justify-center bg-bg">
        <p className="font-mono text-sm text-ink-400">Loading…</p>
      </div>
    )
  }

  const Template = getTemplate((pkg as { template_id?: string | null }).template_id).component
  const firstName = profile ? profile.full_name.trim().split(/\s+/)[0] || 'there' : 'there'
  const pdfUrl = `/api/packages/${encodeURIComponent(id)}/pdf`
  const docxUrl = `/api/packages/${encodeURIComponent(id)}/docx`
  const whatsappText = encodeURIComponent(`Here is my optimized Gulf CV: ${pkg.target_job_title}`)
  const waUrl = `https://wa.me/?text=${whatsappText}`

  return (
    // Wider than the old max-w-5xl: at 1024px, minus a 300px action rail and
    // padding, the document column was narrower than the template's own 794px
    // page, so the resume was being scaled down harder than it needed to be —
    // or, before ResumeDocumentView existed, clipped outright.
    <main className="mx-auto flex min-h-dvh w-full max-w-[1240px] flex-col bg-bg font-redesign-sans">
      <div className="flex flex-col gap-3 px-5 pb-4 pt-1.5">
        <button
          type="button"
          aria-label="Go back"
          onClick={() => router.back()}
          className="flex size-11 items-center justify-center rounded-radius-md text-[20px] leading-none text-ink-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-redesign-gold focus-visible:ring-offset-2"
        >
          ←
        </button>

        <span className="self-start rounded-[5px] bg-forest-tint px-2 py-1 text-[9px] font-semibold uppercase tracking-wider text-forest">
          ✓ Unlocked &amp; saved to Library
        </span>
        <h1 className="font-serif text-[27px] leading-tight text-ink-900">Your Gulf CV is ready, {firstName}</h1>
      </div>

      {/* lg two-column (PAGE_SPECS §C): left = document preview, right = actions/status
          rail. Below lg single column — actions first (as built), then the preview.
          DOM order keeps actions first so mobile matches the current layout; lg order
          utilities route the preview left and the actions rail right. */}
      <div className="flex w-full flex-col gap-4 px-5 pb-8 lg:flex-row lg:gap-6">
        {/* Actions rail — DOM first (mobile), routes right on lg. Sticky at lg
            so the download buttons stay reachable while reading a long CV
            instead of scrolling away at the top of the page. */}
        <div className="flex flex-col gap-3 lg:order-2 lg:w-[300px] lg:shrink-0 lg:sticky lg:top-5 lg:self-start">
          <div className="flex flex-col gap-2">
            <a
              href={pdfUrl}
              onClick={() => setDownloaded(true)}
              className="inline-flex min-h-11 w-full items-center justify-center rounded-radius-md bg-surface-light px-4 py-3 text-[12.5px] font-bold text-ink-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-redesign-gold focus-visible:ring-offset-2"
            >
              Download PDF
            </a>
            <a
              href={docxUrl}
              onClick={() => setDownloaded(true)}
              className="inline-flex min-h-11 w-full items-center justify-center rounded-radius-md border border-line-light/70 bg-surface-light px-4 py-3 text-[12.5px] font-semibold text-ink-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-redesign-gold focus-visible:ring-offset-2"
            >
              Word (.docx)
            </a>
            <a
              href={waUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex min-h-11 w-full items-center justify-center rounded-radius-md border border-line-light/70 bg-surface-light px-4 py-3 text-[12.5px] font-semibold text-ink-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-redesign-gold focus-visible:ring-offset-2"
            >
              Share to WhatsApp
            </a>
            <Link
              href={`/optimize/preview/${encodeURIComponent(id)}`}
              className="inline-flex min-h-11 w-full items-center justify-center rounded-radius-md border border-line-light/70 bg-surface-light px-4 py-3 text-[12.5px] font-semibold text-forest focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-forest focus-visible:ring-offset-2"
            >
              Edit text
            </Link>
          </div>
          {downloaded ? (
            <div className="rounded-radius-lg border border-forest/40 bg-forest-tint px-3.5 py-3 text-[12.5px] text-forest">
              Applying somewhere else? Your profile is saved — next one takes a minute.
            </div>
          ) : null}
        </div>

        {/* The document itself — left on lg. Presented as a page on a desk:
            neutral backdrop, the full A4 sheet scaled to fit the column, top to
            bottom, nothing clipped. Previously this was the raw 794px template
            inside an `overflow-hidden` box narrower than itself, which cut the
            right-hand side off the user's own resume. */}
        {profile ? (
          <div className="rounded-radius-lg bg-surface-2-light p-3 sm:p-5 lg:order-1 lg:flex-1 lg:min-w-0">
            <ResumeDocumentView>
              {/* Registry lookup, not a hard-coded import: the screen must show
                  the same template the PDF and Word routes resolve, or "what
                  you see is what downloads" stops being true the moment a
                  second template exists. */}
              <Template
                profile={profile}
                optimizedContent={(pkg.optimized_content ?? {
                  summary: { generated: '', source_profile_summary: '' },
                  experience_blocks: [],
                }) as OptimizedContent}
                skillsOrder={pkg.skills_order ?? []}
                fieldVisibility={pkg.field_visibility_snapshot ?? null}
              />
            </ResumeDocumentView>
            <p className="mt-3 text-center text-[11.5px] text-ink-400">
              This is exactly what downloads as your PDF.
            </p>
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
