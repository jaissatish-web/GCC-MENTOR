import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createServiceRoleClient } from '@/lib/supabase/serviceAdmin'
import { getAnalysisById } from '@/lib/optimizer/analysisStore'

/**
 * POST /api/optimize/confirm-skills (2026-09-17) — docs/17_OPTIMIZER_ENGINE.md §2.
 *
 * Body: { analysisId, profileId, terms: string[] }
 *
 * The honest way to close a gap. The match report lists requirements the
 * profile does not state; the user ticks the ones they GENUINELY have, and they
 * are added to their Career Profile's skills. From then on they are the user's
 * own stated facts — the evidence map, the summary and the skills section may
 * use them, and the score counts them. Nothing is added that the user did not
 * explicitly confirm, and only terms from this analysis's own requirement list
 * are accepted, so the endpoint cannot be used to write arbitrary text.
 */

const MAX_TERMS = 15

export async function POST(request: NextRequest): Promise<NextResponse> {
  const supabase = await createClient()
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()
  if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let body: Record<string, unknown>
  try {
    const raw = await request.json()
    if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) throw new Error('shape')
    body = raw as Record<string, unknown>
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }
  const analysisId = typeof body.analysisId === 'string' ? body.analysisId.trim() : ''
  const profileId = typeof body.profileId === 'string' ? body.profileId.trim() : ''
  const terms = Array.isArray(body.terms) ? body.terms.filter((t): t is string => typeof t === 'string') : []
  if (!analysisId) return NextResponse.json({ error: 'Invalid field: analysisId' }, { status: 400 })
  if (!profileId) return NextResponse.json({ error: 'Invalid field: profileId' }, { status: 400 })
  if (terms.length === 0 || terms.length > MAX_TERMS) return NextResponse.json({ error: 'Invalid field: terms' }, { status: 400 })

  // Ownership: the profile through the user's own session (RLS), the analysis
  // by user id. Neither id is trusted alone.
  const { data: profile, error: profileError } = await supabase
    .from('career_profiles')
    .select('id')
    .eq('id', profileId)
    .eq('user_id', user.id)
    .maybeSingle()
  if (profileError) return NextResponse.json({ error: 'Could not read your profile. Please try again.' }, { status: 503 })
  if (!profile) return NextResponse.json({ error: 'Profile not found' }, { status: 404 })

  const analysis = await getAnalysisById(user.id, analysisId)
  if (!analysis) return NextResponse.json({ error: 'Analysis not found' }, { status: 404 })

  const allowed = new Map(analysis.targetProfile.keywords.map((k) => [k.term.toLowerCase(), k.term]))
  const accepted = [...new Set(terms.map((t) => allowed.get(t.trim().toLowerCase())).filter((t): t is string => !!t))]
  if (accepted.length === 0) return NextResponse.json({ error: 'None of these are requirements of this job.' }, { status: 400 })

  const db = createServiceRoleClient()
  const { data: existing, error: readError } = await db
    .from('profile_skills')
    .select('name, sort_order')
    .eq('profile_id', profileId)
  if (readError) return NextResponse.json({ error: 'Could not read your skills. Please try again.' }, { status: 503 })

  const have = new Set((existing ?? []).map((s) => String(s.name).trim().toLowerCase()))
  let next = Math.max(-1, ...(existing ?? []).map((s) => Number(s.sort_order) || 0)) + 1
  const rows = accepted.filter((t) => !have.has(t.toLowerCase())).map((name) => ({ profile_id: profileId, name, sort_order: next++ }))

  if (rows.length > 0) {
    const { error: insertError } = await db.from('profile_skills').insert(rows)
    if (insertError) {
      console.error('confirm-skills: insert failed user=' + user.id, insertError.message)
      return NextResponse.json({ error: 'Could not add these skills. Please try again.' }, { status: 500 })
    }
    // Bump the profile so an editor open in another tab sees a newer version
    // and cannot silently save over the added skills.
    await db.from('career_profiles').update({ updated_at: new Date().toISOString() }).eq('id', profileId).eq('user_id', user.id)
  }
  // Counts only — never skill names (docs/RULES.md §3).
  console.log('confirm-skills: user=' + user.id + ' added=' + rows.length)
  return NextResponse.json({ added: rows.map((r) => r.name) })
}
