import { downloadFileName } from '@/lib/downloadName'
import { NextRequest, NextResponse } from 'next/server'
import { renderPackagePdf } from '@/lib/pdf/renderPackage'
import { createClient } from '@/lib/supabase/server'
import { appendPackageEventAtomic } from '@/lib/packages/serverWrites'
// No access helper is imported while the locks are off — the route does not gate.
// See lib/resumeKind.ts for the rule to restore.

/**
 * Package → PDF download — TASK-030.
 *
 * Renders ONE `packages` row through the single MVP template (GulfPremium,
 * TASK-031) and returns a downloadable PDF. Built with the setContent approach
 * from reference/pdf-route.reference.ts (render the component to a static HTML
 * string with renderToStaticMarkup, then page.setContent() it into Puppeteer) —
 * NOT the reference/resume-render.reference.tsx navigation approach (that would
 * need auth cookies forwarded into Puppeteer, navigation timeouts, and a second
 * route with its own auth story). GulfPremium.tsx commits to exactly this: it is
 * written with inline styles only, no Tailwind, specifically for
 * renderToStaticMarkup + a bare HTML page.
 *
 * AUTH + OWNERSHIP (contract #2): auth first (401); then the package is loaded
 * scoped to id = packageId AND user_id = caller in one query (same pattern as
 * app/api/optimize/route.ts). A package belonging to another user matches no row
 * and 404s — existence is never leaked.
 *
 * is_paid GATE (contract #3): this route hands out the actual paid deliverable,
 * so the payment check is as serious as auth. is_paid:false → 403, no bypass
 * (we never trust a client-supplied flag; the server reads is_paid from the row
 * we loaded). The payment screen (/optimize/pay/[packageId]) is not built yet
 * (TASK-042, blocked), so we only return a clear error — no dead link.
 *
 * DATA ASSEMBLY (contract #4, per GulfPremium's documented contract):
 *   - Fixed fields are read LIVE from career_profiles + all five child tables
 *     (profile_id comes from the package row) — "edit once, reflects everywhere".
 *   - optimized_content comes from the package's JSONB — FROZEN at generation.
 *   - skills_order comes from the package.
 *   - field visibility comes from the package's field_visibility_snapshot — the
 *     SNAPSHOT, not the profile's current toggles, so the document renders as it
 *     looked at generation time.
 */

// Chrome needs the Node runtime, and a cold lambda spends real time unpacking
// the Chromium binary before it renders anything — well past Vercel's 10s
// default. 60s is the ceiling on the current plan.
export const runtime = 'nodejs'
export const maxDuration = 60

export async function GET(request: NextRequest, props0: { params: Promise<{ id: string }> }): Promise<NextResponse> {
  const params = await props0.params;
  const supabase = await createClient()
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const packageId = params.id
  if (typeof packageId !== 'string' || packageId.trim() === '') {
    return NextResponse.json({ error: 'Invalid package id' }, { status: 400 })
  }

  // Everything from the package lookup to the printed PDF lives in
  // lib/pdf/renderPackage.ts (2026-10-02), shared with the ATS file check so
  // the check reads exactly this file. NO PAYMENT GATE while the locks are off
  // (founder decision 2026-08-17); when it returns it belongs here, gating the
  // AI-written text, decided from the loaded row — never a client flag.
  const r = await renderPackagePdf({ supabase, userId: user.id, packageId })
  if (!r.ok) {
    // The reason is returned, not just logged: this download is a plain link,
    // so a failure is a page the user is looking at (TASK-122 reasoning).
    return NextResponse.json(
      r.detail ? { error: r.error, detail: r.detail, hint: 'Send this whole message when reporting the problem — the detail line names the actual cause.' } : { error: r.error },
      { status: r.status },
    )
  }

  // Service history (migration 050), de-duplicated: a re-download within ten
  // minutes adds no second event, and a failure never blocks the download.
  await appendPackageEventAtomic({
    packageId,
    userId: user.id,
    type: 'pdf_downloaded',
    label: 'PDF downloaded',
    dedupeSeconds: 600,
  }).catch((e) => console.error('pdf: history event not recorded pkg=' + packageId, e instanceof Error ? e.message : String(e)))

  const safeName = downloadFileName(r.profile.full_name, r.pkg.target_job_title)
  return new NextResponse(Buffer.from(r.pdf), {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${safeName}.pdf"`,
    },
  })
}
