import { needsClaimReview, CLAIM_REVIEW_MESSAGE } from '@/lib/optimizer/claimReview'
import { buildCareerProfileResume, isCareerProfileResume } from '@/lib/careerProfileResume'
import { createElement } from 'react'
import type { SupabaseClient } from '@supabase/supabase-js'
import { launchBrowser, waitForImages } from '@/lib/pdf/browser'
import { signedPhotoUrl } from '@/lib/storage/profilePhoto'
import { type GulfPremiumProps } from '@/components/templates/GulfPremium'
import { getTemplate } from '@/lib/templates'
import { readStyleOverrides } from '@/lib/resumeStyle'
import { applyLivePhotoToDocument, applyTargetTitleToDocument, buildResumeDocument, type ResumeDocument } from '@/lib/resumeDocument'
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
 * One package → the PDF the user downloads (moved out of
 * app/api/packages/[id]/pdf/route.ts on 2026-10-02 so the ATS file check
 * reads EXACTLY the file the download produces). The history comments that
 * explain each step live with the code below; behaviour is unchanged.
 *
 * Data: fixed fields LIVE from career_profiles + the five child tables,
 * optimized_content / skills_order / field_visibility_snapshot from the
 * package, the frozen document_snapshot when there is one. Everything scoped
 * to the caller's user_id — never the ids alone.
 */

const CHILD_TABLES = [
  'profile_work_experience',
  'profile_skills',
  'profile_certifications',
  'profile_education',
  'profile_additional_information',
] as const

export type RenderPackageResult =
  | {
      ok: true
      pdf: Uint8Array
      /** The document the template rendered (rebuilt from the profile for pre-snapshot packages). */
      document: ResumeDocument
      profile: CareerProfileFull
      pkg: Record<string, unknown> & { target_job_title: string; template_id?: string | null }
      templateId: string
    }
  | { ok: false; status: number; error: string; detail?: string }

export async function renderPackagePdf(opts: {
  supabase: SupabaseClient
  userId: string
  packageId: string
  /** Render in another template than the saved one (the file check compares designs). */
  templateId?: string | null
}): Promise<RenderPackageResult> {
  const { supabase, userId, packageId } = opts
  const { data: pkgRow, error: pkgError } = await supabase.from('packages').select('*').eq('id', packageId).eq('user_id', userId).maybeSingle()
  if (pkgError) {
    console.error('pdf: package lookup error user=' + userId + ' pkg=' + packageId, pkgError.message)
    return { ok: false, status: 500, error: 'Internal server error' }
  }
  if (!pkgRow) return { ok: false, status: 404, error: 'Package not found' }
  if (!isCareerProfileResume(pkgRow) && needsClaimReview(pkgRow.match_report)) return { ok: false, status: 409, error: CLAIM_REVIEW_MESSAGE, detail: `/optimize/preview/${packageId}` }

  const pkg = pkgRow as Record<string, unknown> & {
    tier?: string | null
    profile_id: string
    target_job_title: string
    template_id?: string | null
    optimized_content?: OptimizedContent | null
    skills_order?: string[] | null
    field_visibility_snapshot?: CareerProfileFull['field_visibility'] | null
    document_snapshot?: ResumeDocument | null
    style_overrides?: unknown
  }

  const { data: profileRow, error: profileError } = await supabase.from('career_profiles').select('*').eq('id', pkg.profile_id).eq('user_id', userId).maybeSingle()
  if (profileError) {
    console.error('pdf: profile lookup error user=' + userId + ' pkg=' + packageId, profileError.message)
    return { ok: false, status: 500, error: 'Internal server error' }
  }
  if (!profileRow) return { ok: false, status: 404, error: 'Profile not found' }

  const fetchChildren = async (table: (typeof CHILD_TABLES)[number]): Promise<unknown[]> => {
    const { data } = await supabase.from(table).select('*').eq('profile_id', pkg.profile_id)
    return (data as unknown[] | null) ?? []
  }
  const [work_experience, skills, certifications, education, additional_information] = await Promise.all(CHILD_TABLES.map(fetchChildren))
  const profile: CareerProfileFull = {
    ...(profileRow as CareerProfile),
    work_experience: work_experience as ProfileWorkExperience[],
    skills: skills as ProfileSkill[],
    certifications: certifications as ProfileCertification[],
    education: education as ProfileEducation[],
    additional_information: additional_information as ProfileAdditionalInformation[],
  }

  // The template renders <img src> fetched by Chrome, so the stored object
  // path must become a signed URL first or the photo comes out blank.
  const profileWithPhoto = { ...profile, photo_url: await signedPhotoUrl(profile.photo_url) }

  // Prefer the frozen document (migration 034). A photo uploaded after the
  // document was delivered is filled in first (applyLivePhotoToDocument), and
  // snapshots from before 2026-09-16 get their headline at render time.
  const optimizedContent = (pkg.optimized_content ?? { summary: { generated: '', source_profile_summary: '' }, experience_blocks: [] }) as OptimizedContent
  const raw = isCareerProfileResume(pkg)
  const snapshot = raw ? null : pkg.document_snapshot ?? null
  const withPhoto = snapshot ? applyLivePhotoToDocument(snapshot, profile.photo_url, pkg.field_visibility_snapshot ?? null) : null
  const withTitle = withPhoto ? applyTargetTitleToDocument(withPhoto, pkg.target_job_title ?? null) : null
  const documentForRender: ResumeDocument | null = raw ? buildCareerProfileResume(profileWithPhoto) : withTitle
    ? { ...withTitle, header: { ...withTitle.header, photoUrl: await signedPhotoUrl(withTitle.header.photoUrl) } }
    : null

  const props: GulfPremiumProps = {
    document: documentForRender,
    profile: profileWithPhoto,
    optimizedContent,
    skillsOrder: pkg.skills_order ?? [],
    fieldVisibility: pkg.field_visibility_snapshot ?? null,
    // The user's saved font/size/accent (TASK-152); anything unexpected falls back to template defaults.
    styleOverrides: readStyleOverrides(pkg.style_overrides),
  }

  try {
    // Dynamic import keeps react-dom/server out of the RSC bundler's static graph.
    const { renderToStaticMarkup } = await import('react-dom/server')
    const entry = getTemplate(opts.templateId ?? pkg.template_id)
    const bodyHtml = renderToStaticMarkup(createElement(entry.component, props))
    const fullHtml = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    html, body { margin: 0; padding: 0; background: #ffffff; }
    * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
    /* Page margins: 10mm top/bottom on EVERY page (= the template's 38px
       on-screen frame); horizontal framing stays on the element. The print
       rules release the on-screen min-height and the band header's negative
       top margin — see git history of the PDF route (2026-09-16) for why. */
    @page { size: A4; margin: 10mm 0; }
    @media print {
      #resume-render { padding-top: 0 !important; padding-bottom: 0 !important; min-height: 0 !important; }
      #resume-render > header { margin-top: 0 !important; }
      /* A design that fills the page (engine.tsx fillPage, 2026-10-04) keeps a
         rail, edge or tint to the foot of a one-page CV: 297mm less the two
         10mm margins is 277mm, and 1mm under it so rounding can never spill a
         blank page. A longer CV grows past it as before. */
      #resume-render[data-fill-page] { min-height: 276mm !important; }
    }
  </style>
</head>
<body>${bodyHtml}</body>
</html>`

    // lib/pdf/browser.ts: @sparticuz/chromium on serverless, local Chrome in dev.
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

    const document =
      documentForRender ??
      buildResumeDocument({
        profile,
        optimizedContent,
        skillsOrder: pkg.skills_order ?? [],
        fieldVisibility: pkg.field_visibility_snapshot ?? null,
        targetJobTitle: pkg.target_job_title ?? null,
      })
    return { ok: true, pdf, document, profile, pkg, templateId: entry.id }
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error)
    console.error('pdf: render failed user=' + userId + ' pkg=' + packageId, detail)
    return { ok: false, status: 500, error: 'PDF generation failed', detail }
  }
}
