import { NextRequest, NextResponse } from 'next/server'
import { launchBrowser, waitForImages } from '@/lib/pdf/browser'
import { signedPhotoUrl } from '@/lib/storage/profilePhoto'
import { createElement } from 'react'
import { createClient } from '@/lib/supabase/server'
import { type GulfPremiumProps } from '@/components/templates/GulfPremium'
import { getTemplate } from '@/lib/templates'
import type { ResumeDocument } from '@/lib/resumeDocument'
import type {
  CareerProfile,
  CareerProfileFull,
  ProfileAdditionalInformation,
  ProfileCertification,
  ProfileEducation,
  ProfileSkill,
  ProfileWorkExperience,
} from '@/types/careerProfile'
import type { OptimizedContent } from '@/types/package'

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

const CHILD_TABLES = [
  'profile_work_experience',
  'profile_skills',
  'profile_certifications',
  'profile_education',
  'profile_additional_information',
] as const

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
): Promise<NextResponse> {
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

  // Load the package scoped to BOTH id and the caller's user_id — never trust
  // the id alone (payment/ownership integrity). A row that doesn't match 404s.
  const { data: pkgRow, error: pkgError } = await supabase
    .from('packages')
    .select('*')
    .eq('id', packageId)
    .eq('user_id', user.id)
    .maybeSingle()

  if (pkgError) {
    console.error('pdf: package lookup error user=' + user.id + ' pkg=' + packageId, pkgError.message)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
  if (!pkgRow) {
    return NextResponse.json({ error: 'Package not found' }, { status: 404 })
  }

  // ---- is_paid gate: unconditional, read server-side from the row we loaded ----
  if (!pkgRow.is_paid) {
    return NextResponse.json(
      { error: 'Payment required to download this resume' },
      { status: 403 }
    )
  }

  const pkg = pkgRow as {
    profile_id: string
    target_job_title: string
    /** Optional until the column exists; getTemplate() falls back safely. */
    template_id?: string | null
    optimized_content?: OptimizedContent | null
    skills_order?: string[] | null
    field_visibility_snapshot?: CareerProfileFull['field_visibility'] | null
  }

  // ---- Load the LIVE profile (fixed fields) + all five child tables ----------
  // Scoped to BOTH id and user_id, same as the package lookup above. By
  // construction packages.profile_id already belongs to this caller (verified
  // at INSERT time in app/api/optimize/route.ts, Unplanned #5) — but that
  // invariant lives in a different ticket's app code, not a DB constraint or
  // RLS WITH CHECK. Never trust profile_id alone here either.
  const { data: profileRow, error: profileError } = await supabase
    .from('career_profiles')
    .select('*')
    .eq('id', pkg.profile_id)
    .eq('user_id', user.id)
    .maybeSingle()

  if (profileError) {
    console.error(
      'pdf: profile lookup error user=' + user.id + ' pkg=' + packageId,
      profileError.message
    )
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
  if (!profileRow) {
    return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
  }

  const fetchChildren = async (table: (typeof CHILD_TABLES)[number]): Promise<unknown[]> => {
    const { data } = await supabase.from(table).select('*').eq('profile_id', pkg.profile_id)
    return (data as unknown[] | null) ?? []
  }
  const [work_experience, skills, certifications, education, additional_information] =
    await Promise.all([
      fetchChildren('profile_work_experience'),
      fetchChildren('profile_skills'),
      fetchChildren('profile_certifications'),
      fetchChildren('profile_education'),
      fetchChildren('profile_additional_information'),
    ])

  const profile: CareerProfileFull = {
    ...(profileRow as CareerProfile),
    work_experience: work_experience as ProfileWorkExperience[],
    skills: skills as ProfileSkill[],
    certifications: certifications as ProfileCertification[],
    education: education as ProfileEducation[],
    additional_information: additional_information as ProfileAdditionalInformation[],
  }

  // The template renders <img src>, and Puppeteer fetches it over the network,
  // so the stored object path has to become a real signed URL before render or
  // the photo silently comes out blank in the delivered PDF.
  const profileWithPhoto = {
    ...profile,
    photo_url: await signedPhotoUrl(profile.photo_url),
  }

  // Prefer the frozen document (migration 034) so a paid PDF re-downloaded
  // months later is byte-for-byte the document that was bought. The photo is
  // stored as an object PATH, so it still has to be signed at render time —
  // the snapshot freezes WHICH photo, not a URL that would have expired.
  const snapshot = (pkgRow as { document_snapshot?: ResumeDocument | null }).document_snapshot ?? null
  const documentForRender: ResumeDocument | null = snapshot
    ? { ...snapshot, header: { ...snapshot.header, photoUrl: await signedPhotoUrl(snapshot.header.photoUrl) } }
    : null

  const props: GulfPremiumProps = {
    document: documentForRender,
    profile: profileWithPhoto,
    optimizedContent: (pkg.optimized_content ?? {
      summary: { generated: '', source_profile_summary: '' },
      experience_blocks: [],
    }) as OptimizedContent,
    skillsOrder: pkg.skills_order ?? [],
    fieldVisibility: pkg.field_visibility_snapshot ?? null,
  }

  try {
    // ---- Render the template to a static HTML string -------------------------
    // Dynamic import (not a top-level static import) keeps react-dom/server out
    // of Next.js's RSC bundler's static-import graph — the same reason the
    // pending reference route used require(); `await import()` preserves that
    // runtime-only behaviour without needing an ESLint rule that isn't loaded.
    const { renderToStaticMarkup } = await import('react-dom/server')
    // Resolved through the registry, never imported directly — this is what
    // makes "the resume reopens and downloads in the template it was saved
    // with" a data lookup instead of a code change. Unknown/absent ids fall
    // back to the default rather than throwing.
    const Template = getTemplate(pkg.template_id).component
    const bodyHtml = renderToStaticMarkup(createElement(Template, props))

    const fullHtml = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    html, body { margin: 0; padding: 0; background: #ffffff; }
    * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
    /*
     * PAGE MARGINS: the same on every page, and equal to the frame the
     * template already draws on screen.
     *
     * History, because this has now been wrong in both directions. It began as
     * 0 on page one and 14mm/12mm on every page after, which printed a band of
     * whitespace at each page break that has no counterpart on screen. Setting
     * every page to 0 removed that, but the template's own 38px of vertical
     * padding only applies ONCE, at the very start of the flow — so page two
     * began hard against the top edge of the paper, which is what the founder
     * reported.
     *
     * The fix is to move the VERTICAL frame out of the element and into the
     * page box, where it repeats on every sheet by definition:
     *
     *   @page margin      10mm top and bottom  (= 37.8px, the template's 38px)
     *   template padding  horizontal only, in print
     *
     * Horizontal framing stays on the element, so it is identical on screen
     * and in print, and left/right need no page margin at all.
     *
     * min-height is also released in print: the template floors itself at one
     * full A4 (1123px) for the on-screen sheet, but inside a page box that is
     * now 10mm shorter that floor would overflow and force a nearly empty
     * second page out of a one-page CV.
     */
    @page { size: A4; margin: 10mm 0; }
    @media print {
      #resume-render {
        padding-top: 0 !important;
        padding-bottom: 0 !important;
        min-height: 0 !important;
      }
    }
  </style>
</head>
<body>${bodyHtml}</body>
</html>`

    // ---- Launch Chrome, inject HTML, print to PDF ----------------------------
    // See lib/pdf/browser.ts: serverless gets @sparticuz/chromium, local dev
    // reuses an installed Chrome. This route used to import `puppeteer`
    // directly, which is why the download failed on every deployed request.
    const browser = await launchBrowser()

    let pdf: Uint8Array
    try {
      const page = await browser.newPage()
      await page.setViewport({ width: 794, height: 1123 })
      await page.setContent(fullHtml, { waitUntil: 'domcontentloaded' })
      // The profile photo comes from a signed URL over the network; without
      // this the PDF could be delivered with the photo missing while the
      // on-screen preview showed it.
      await waitForImages(page)

      pdf = await page.pdf({
        format: 'A4',
        printBackground: true,
        preferCSSPageSize: false,
      })
    } finally {
      // Always close, including on a render error — a leaked Chrome on a
      // long-running server is a slow memory leak, and on a lambda it delays
      // the response.
      await browser.close().catch(() => {})
    }

    const safeName =
      (pkg.target_job_title || 'resume')
        .replace(/[^a-zA-Z0-9\-_ ]/g, '')
        .replace(/\s+/g, '_')
        .trim() || 'resume'

    return new NextResponse(Buffer.from(pdf), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${safeName}.pdf"`,
      },
    })
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error)
    console.error('pdf: render failed user=' + user.id + ' pkg=' + packageId, detail)
    // The reason is returned, not just logged. This download is triggered by a
    // plain link, so a failure is a page the user is looking at — and the
    // previous bare "PDF generation failed" gave neither them nor us anything
    // to act on, which is why a launch failure that had been live in production
    // the whole time took a founder report and a code read to identify. Same
    // reasoning as the AI provider error in TASK-122.
    return NextResponse.json(
      {
        error: 'PDF generation failed',
        detail,
        hint: 'Send this whole message when reporting the problem — the detail line names the actual cause.',
      },
      { status: 500 }
    )
  }
}
