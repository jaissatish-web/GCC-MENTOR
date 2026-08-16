import { NextResponse } from 'next/server'
import { createElement } from 'react'
import { createClient } from '@/lib/supabase/server'
import { launchBrowser, waitForImages } from '@/lib/pdf/browser'
import { signedPhotoUrl } from '@/lib/storage/profilePhoto'
import { getTemplate } from '@/lib/templates'
import { buildResumeDocument } from '@/lib/resumeDocument'
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
 * FREE CV download — the user's own Career Profile as a PDF (TASK-134).
 *
 * Founder decision 2026-08-16: someone who types their career history in by
 * hand can download a real, clean Gulf-format CV for nothing. What is paid for
 * is the AI OPTIMIZATION — the rewritten summary and achievement bullets aimed
 * at a specific role — not the act of putting your own facts on a page.
 *
 * WHY A SEPARATE ROUTE. Every existing download hangs off a `packages` row and
 * is gated on is_paid, correctly: those deliver paid work. A free download must
 * not weaken that gate, so it does not touch it. This route renders straight
 * from the profile and cannot return a paid package's content — there is no
 * package id in it to ask for.
 *
 * WHAT MAKES IT HONEST. optimizedContent is empty, so the summary is the user's
 * own text and the experience bullets are their own highlights. Nothing here is
 * model-written, so the grounding rule cannot be violated: there is no
 * generation step to violate it.
 */

export const runtime = 'nodejs'
export const maxDuration = 60

const CHILD_TABLES = [
  'profile_work_experience',
  'profile_skills',
  'profile_certifications',
  'profile_education',
  'profile_additional_information',
] as const

export async function GET(): Promise<NextResponse> {
  const supabase = await createClient()
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data: profileRow, error: profileError } = await supabase
    .from('career_profiles')
    .select('*')
    .eq('user_id', user.id)
    .maybeSingle()

  if (profileError) {
    console.error('resume pdf: profile lookup failed user=' + user.id, profileError.message)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
  if (!profileRow) {
    return NextResponse.json(
      { error: 'Create your Career Profile before downloading a CV.' },
      { status: 404 },
    )
  }

  const profileId = (profileRow as CareerProfile).id
  const fetchChildren = async (table: (typeof CHILD_TABLES)[number]): Promise<unknown[]> => {
    const { data } = await supabase.from(table).select('*').eq('profile_id', profileId)
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

  // A CV with no name and no history is not a document — refuse rather than
  // hand someone an empty sheet and let them think the feature is broken.
  if (!profile.full_name?.trim() && profile.work_experience.length === 0) {
    return NextResponse.json(
      { error: 'Add your name and at least one role before downloading a CV.' },
      { status: 400 },
    )
  }

  // No optimized content: this is the user's own profile, not a generated
  // resume. buildResumeDocument falls back to the profile's own summary and
  // each role's own highlights.
  const emptyOptimized: OptimizedContent = {
    summary: { generated: '', source_profile_summary: '' },
    experience_blocks: [],
  } as OptimizedContent

  const document = buildResumeDocument({
    profile,
    optimizedContent: emptyOptimized,
    skillsOrder: [],
    // The user's live visibility choices apply — this document IS live, unlike
    // a purchased package, which is frozen at its own snapshot.
    fieldVisibility: profile.field_visibility ?? null,
  })

  try {
    const { renderToStaticMarkup } = await import('react-dom/server')
    const Template = getTemplate(null).component
    const bodyHtml = renderToStaticMarkup(
      createElement(Template, {
        profile,
        optimizedContent: emptyOptimized,
        skillsOrder: [],
        fieldVisibility: profile.field_visibility ?? null,
        document: { ...document, header: { ...document.header, photoUrl: await signedPhotoUrl(document.header.photoUrl) } },
      }),
    )

    const fullHtml = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    html, body { margin: 0; padding: 0; background: #ffffff; }
    * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
    /* Identical page framing to the paid PDF route — see its comment for the
       reasoning. Kept in step deliberately: a free CV and a paid one must sit
       on the page the same way, or the paid one looks like a different
       product for the wrong reason. */
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

    const browser = await launchBrowser()
    let pdf: Uint8Array
    try {
      const page = await browser.newPage()
      await page.setViewport({ width: 794, height: 1123 })
      await page.setContent(fullHtml, { waitUntil: 'domcontentloaded' })
      await waitForImages(page)
      pdf = await page.pdf({ format: 'A4', printBackground: true, preferCSSPageSize: false })
    } finally {
      await browser.close().catch(() => {})
    }

    const safeName =
      (profile.full_name || 'my')
        .replace(/[^a-zA-Z0-9\-_ ]/g, '')
        .replace(/\s+/g, '_')
        .trim() || 'my'

    return new NextResponse(Buffer.from(pdf), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${safeName}_CV.pdf"`,
      },
    })
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error)
    console.error('resume pdf: render failed user=' + user.id, detail)
    return NextResponse.json({ error: 'PDF generation failed', detail }, { status: 500 })
  }
}
