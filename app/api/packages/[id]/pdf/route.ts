import { NextRequest, NextResponse } from 'next/server'
import { createElement } from 'react'
import { createClient } from '@/lib/supabase/server'
import GulfPremium, {
  type GulfPremiumProps,
} from '@/components/templates/GulfPremium'
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

  const props: GulfPremiumProps = {
    profile,
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
    const bodyHtml = renderToStaticMarkup(createElement(GulfPremium, props))

    const fullHtml = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    html, body { margin: 0; padding: 0; background: #ffffff; }
    * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
    @page :first { size: A4; margin: 0; }
    @page { size: A4; margin: 14mm 0 12mm 0; }
  </style>
</head>
<body>${bodyHtml}</body>
</html>`

    // ---- Launch Puppeteer, inject HTML, print to PDF -------------------------
    const puppeteer = await import('puppeteer')
    const fs = await import('fs')

    // Prefer Puppeteer's own cached Chrome, then fall back to system Chrome.
    let resolvedExecutable: string | undefined
    try {
      const candidate = (puppeteer as unknown as { executablePath: () => string }).executablePath?.()
      if (candidate && fs.existsSync(candidate)) resolvedExecutable = candidate
    } catch {
      /* ignore */
    }
    if (!resolvedExecutable) {
      const systemCandidates = [
        'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
        'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
        '/usr/bin/google-chrome',
        '/usr/bin/google-chrome-stable',
        '/usr/bin/chromium-browser',
        '/usr/bin/chromium',
      ]
      resolvedExecutable = systemCandidates.find((p) => fs.existsSync(p))
    }

    const browser = await (puppeteer.default ?? puppeteer).launch({
      headless: true,
      ...(resolvedExecutable ? { executablePath: resolvedExecutable } : {}),
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
    })

    const page = await browser.newPage()
    await page.setViewport({ width: 794, height: 1123 })
    await page.setContent(fullHtml, { waitUntil: 'domcontentloaded' })

    const pdf = await page.pdf({
      format: 'A4',
      printBackground: true,
      preferCSSPageSize: false,
    })

    await browser.close()

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
    console.error(
      'pdf: render failed user=' + user.id + ' pkg=' + packageId,
      error instanceof Error ? error.message : String(error)
    )
    return NextResponse.json({ error: 'PDF generation failed' }, { status: 500 })
  }
}
