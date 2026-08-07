import { NextRequest, NextResponse } from 'next/server'
import { createElement } from 'react'
import { createClient } from '@/lib/supabase/server'
import GulfPremium, { type GulfPremiumProps } from '@/components/templates/GulfPremium'
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
 * Pre-payment Full-CV preview image — TASK-033 (TASK-044's resolved Option B:
 * blurred/watermarked full CV).
 *
 * GET /api/packages/[id]/preview-image
 *
 * SECURITY-CRITICAL: the paid deliverable must never reach the browser before
 * payment in a way a user can recover. A CSS blur applied client-side in React
 * is NOT acceptable (devtools remove it in three clicks). This route renders
 * the REAL GulfPremium to an off-screen HTML string server-side, applies the
 * blur and watermark IN THE HTML BEFORE the Puppeteer screenshot, and serves
 * ONLY the resulting pre-blurred PNG. The client receives a raster image — it
 * can never extract the underlying unblurred text from it.
 *
 * Deliberately NOT is_paid-gated — this IS the pre-payment preview, so it must
 * render for an unpaid package. But it must never leak more than a blurred
 * raster: it returns an image/png only, never JSON with resume text.
 *
 * Auth + ownership mirror the PDF route: auth first (401), package loaded
 * scoped id = packageId AND user_id = caller (404, no leak). Data assembly
 * identical to the PDF/DOCX renderers: live profile + children, plus the
 * package's frozen optimized_content / skills_order / field_visibility_snapshot.
 */
const CHILD_TABLES = [
  'profile_work_experience',
  'profile_skills',
  'profile_certifications',
  'profile_education',
  'profile_additional_information',
] as const

const WATERMARK = '[Product Name] · Preview — Unlock to download'

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

  const { data: pkgRow, error: pkgError } = await supabase
    .from('packages')
    .select('*')
    .eq('id', packageId)
    .eq('user_id', user.id)
    .maybeSingle()

  if (pkgError) {
    console.error('preview-image: package lookup error user=' + user.id + ' pkg=' + packageId, pkgError.message)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
  if (!pkgRow) {
    return NextResponse.json({ error: 'Package not found' }, { status: 404 })
  }

  const pkg = pkgRow as {
    profile_id: string
    optimized_content?: OptimizedContent | null
    skills_order?: string[] | null
    field_visibility_snapshot?: CareerProfileFull['field_visibility'] | null
  }

  const { data: profileRow, error: profileError } = await supabase
    .from('career_profiles')
    .select('*')
    .eq('id', pkg.profile_id)
    .eq('user_id', user.id)
    .maybeSingle()

  if (profileError) {
    console.error('preview-image: profile lookup error user=' + user.id + ' pkg=' + packageId, profileError.message)
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
    const { renderToStaticMarkup } = await import('react-dom/server')
    const bodyHtml = renderToStaticMarkup(createElement(GulfPremium, props))

    // Blur + watermark applied HERE, before the screenshot — this is what makes
    // the served PNG safe. The watermark is tiled diagonally across the page.
    const watermarkSpans = Array.from({ length: 9 }, () => `<span>${WATERMARK}</span>`).join('')
    const fullHtml = `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<style>
  html, body { margin: 0; padding: 0; background: #ffffff; width: 794px; }
  #resume-render { filter: blur(7px); }
</style>
</head>
<body>
  ${bodyHtml}
  <div style="position:fixed; inset:0; pointer-events:none; display:flex; flex-wrap:wrap;
    justify-content:center; align-content:center; gap:28px; transform:rotate(-16deg);
    opacity:.55; z-index:10">
    ${watermarkSpans}
  </div>
</body>
</html>`

    const puppeteer = await import('puppeteer')
    const fs = await import('fs')

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
    try {
      const page = await browser.newPage()
      await page.setViewport({ width: 794, height: 1123 })
      await page.setContent(fullHtml, { waitUntil: 'domcontentloaded' })
      // Let fonts/layout settle so the blur + watermark are fully rendered.
      await new Promise((r) => setTimeout(r, 500))
      const rawImage = await page.screenshot({ type: 'png' })
      const imageBytes = new Uint8Array(rawImage)

      return new NextResponse(imageBytes, {
        headers: {
          'Content-Type': 'image/png',
          'Cache-Control': 'no-store',
        },
      })
    } finally {
      await browser.close()
    }
  } catch (error) {
    console.error(
      'preview-image: render failed user=' + user.id + ' pkg=' + packageId,
      error instanceof Error ? error.message : String(error)
    )
    return NextResponse.json({ error: 'Preview unavailable' }, { status: 500 })
  }
}
