import { NextRequest, NextResponse } from 'next/server'
import { Packer } from 'docx'
import { createClient } from '@/lib/supabase/server'
import { buildResumeDocument } from '@/lib/resumeDocument'
import { buildResumeDocx } from '@/lib/resumeDocx'
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
 * Package → DOCX download — TASK-032.
 *
 * "Same data, different format, not a second content pipeline." This route does
 * NOT re-derive anything the document says — it consumes the SAME pure module as
 * the PDF renderer (lib/resumeDocument.ts `buildResumeDocument`), then hands the
 * result to lib/resumeDocx.ts (`buildResumeDocx`) for layout. Any fix to the visa
 * folding, the visibility decisions, the summary precedence, the skills ordering,
 * or the date-range "Present" handling lands in BOTH formats at once and can
 * never silently drift.
 *
 * Uses the already-present dependency `docx` (^9.0.2 in package.json) — nothing
 * was installed for this ticket.
 *
 * Structure mirrors app/api/packages/[id]/pdf/route.ts exactly (contract #3):
 *   - GET, auth first (401 if absent)
 *   - package loaded scoped to id = packageId AND user_id = caller (404, no
 *     existence leak)
 *   - **is_paid gate** identical to the PDF route — this is the same paid
 *     deliverable in a different format. Read server-side from the loaded row,
 *     never a client flag; false → 403 "Payment required to download this
 *     resume".
 *   - live profile + all five child tables loaded scoped to BOTH
 *     id = pkg.profile_id AND user_id = caller
 *   - optimized_content / skills_order / field_visibility_snapshot (the
 *     SNAPSHOT, not the profile's current toggles) come from the package.
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

  // Load the package scoped to BOTH id and the caller's user_id.
  const { data: pkgRow, error: pkgError } = await supabase
    .from('packages')
    .select('*')
    .eq('id', packageId)
    .eq('user_id', user.id)
    .maybeSingle()

  if (pkgError) {
    console.error('docx: package lookup error user=' + user.id + ' pkg=' + packageId, pkgError.message)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
  if (!pkgRow) {
    return NextResponse.json({ error: 'Package not found' }, { status: 404 })
  }

  // NO PAYMENT GATE while the locks are off (founder decision 2026-08-17). Auth
  // and ownership above are unchanged. When the lock returns it belongs here,
  // and it must make the same decision as the PDF route.
  //
  // Note this route has no UI caller: the Word download was withdrawn because
  // its output did not match the screen. See docs/14_OPEN_ITEMS.md.

  const pkg = pkgRow as {
    profile_id: string
    target_job_title: string
    optimized_content?: OptimizedContent | null
    skills_order?: string[] | null
    field_visibility_snapshot?: CareerProfileFull['field_visibility'] | null
  }

  // ---- Load the LIVE profile, scoped to BOTH id and caller (contract #3) ----
  const { data: profileRow, error: profileError } = await supabase
    .from('career_profiles')
    .select('*')
    .eq('id', pkg.profile_id)
    .eq('user_id', user.id)
    .maybeSingle()

  if (profileError) {
    console.error(
      'docx: profile lookup error user=' + user.id + ' pkg=' + packageId,
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

  // ---- Shared, render-agnostic derivation (the whole point of TASK-032) -----
  const doc = buildResumeDocument({
    profile,
    optimizedContent: (pkg.optimized_content ?? {
      summary: { generated: '', source_profile_summary: '' },
      experience_blocks: [],
    }) as OptimizedContent,
    skillsOrder: pkg.skills_order ?? [],
    fieldVisibility: pkg.field_visibility_snapshot ?? null,
  })

  try {
    const wordDoc = buildResumeDocx(doc)
    const buffer = await Packer.toBuffer(wordDoc)
    const bytes = new Uint8Array(buffer)

    const safeName =
      (pkg.target_job_title || 'resume')
        .replace(/[^a-zA-Z0-9\-_ ]/g, '')
        .replace(/\s+/g, '_')
        .trim() || 'resume'

    return new NextResponse(bytes, {
      headers: {
        'Content-Type':
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'Content-Disposition': `attachment; filename="${safeName}.docx"`,
      },
    })
  } catch (error) {
    console.error(
      'docx: build failed user=' + user.id + ' pkg=' + packageId,
      error instanceof Error ? error.message : String(error)
    )
    return NextResponse.json({ error: 'DOCX generation failed' }, { status: 500 })
  }
}
