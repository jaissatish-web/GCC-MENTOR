import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { insertPackageForUser } from '@/lib/packages/serverWrites'
import { CAREER_RESUME_NAME } from '@/lib/careerProfileResume'
import { CAREER_RESUME_SUMMARY_SELECT, careerProfileResumeSummary } from '@/lib/careerProfileResumeSummary'
import type { Package } from '@/types/package'
import { getTemplate } from '@/lib/templates'

/** Idempotent creation. The existing partial unique index arbitrates concurrent clicks. */
export async function POST(): Promise<NextResponse> {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  try {
    const respond = (row: unknown) => NextResponse.json({
      package: { id: (row as Package).id, name: (row as Package).name, template_id: (row as Package).template_id, tier: 'free' },
      summary: careerProfileResumeSummary(row as Package),
    })
    const find = () => supabase.from('packages').select(CAREER_RESUME_SUMMARY_SELECT)
      .eq('user_id', user.id).eq('tier', 'free').maybeSingle()
    const existing = await find()
    if (existing.error) throw new Error('Resume lookup failed')
    if (existing.data) return respond(existing.data)

    // No profile ID or user ID is accepted from the client.
    const { data: profile, error } = await supabase.from('career_profiles').select('id')
      .eq('user_id', user.id).maybeSingle()
    if (error) throw new Error('Profile lookup failed')
    if (!profile) return NextResponse.json({ package: null, needs_profile: true })
    const template = getTemplate(null)
    const result = await insertPackageForUser({
      userId: user.id,
      row: {
        profile_id: profile.id, tier: 'free', name: CAREER_RESUME_NAME,
        target_job_title: CAREER_RESUME_NAME, target_country: null, target_industry: null,
        target_company: null, job_description: null, optimization_level: 'easy', status: 'saved',
        template_id: template.id, template_version: template.version,
        optimized_content: null, document_snapshot: null, skills_order: [],
        field_visibility_snapshot: {}, is_paid: false, generation_count: 0,
      },
      select: CAREER_RESUME_SUMMARY_SELECT,
    })
    if (result.row) return respond(result.row)
    // A competing request may have won the unique-index race. Read, never upsert:
    // upsert could reset a user's saved name, template or styles.
    const winner = await find()
    if (winner.error || !winner.data) throw new Error('Resume creation failed')
    return respond(winner.data)
  } catch {
    return NextResponse.json({ error: 'Could not open your Career Profile Resume. Please try again.' }, { status: 500 })
  }
}
