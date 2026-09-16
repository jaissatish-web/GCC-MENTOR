import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { PACKAGE_STATUSES } from '@/lib/utils'
import { emptyStageCounts, type PackageListPage, type PackageSummary } from '@/lib/packageSummary'
import type { Package, PackageStatus } from '@/types/package'

/**
 * Library list — GET /api/packages. The caller's own jobs only (auth first,
 * explicit user filter, and owner RLS underneath). Newest first.
 *
 * `?view=summary` (audit M08, 2026-09-15; migration 055) — what every screen
 * now uses. One page of small rows: identity, stage, tracker fields and flags
 * for what each job has, never the documents. Parameters:
 *   limit      1-100, default 20
 *   before,
 *   before_id  keyset cursor from the previous page's `next_cursor`
 *   q          search role, name, company and country — IN THE DATABASE, so it
 *              finds jobs that are not on the current page
 *   stage      one application stage
 *   resume=1   only jobs whose CV is built (the service pickers)
 *   counts=1   also return per-stage counts and the total across ALL jobs
 * The full package, for the job a screen opens, is GET /api/packages/[id].
 *
 * NO `view` — the previous full-row response, kept for one release so a browser
 * tab still running the old app does not break mid-deploy. Capped at the newest
 * 100 jobs. Nothing in the current app calls it; remove it after the next release.
 */

const STAGES = new Set<string>(PACKAGE_STATUSES.map((s) => s.value))
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const LEGACY_CAP = 100

export async function GET(request: NextRequest): Promise<NextResponse> {
  const supabase = await createClient()
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const params = request.nextUrl.searchParams

  if (params.get('view') !== 'summary') {
    const { data, error } = await supabase
      .from('packages')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(LEGACY_CAP)
    if (error) {
      console.error('packages list error user=' + user.id, error.message)
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
    return NextResponse.json({ packages: (data as Package[] | null) ?? [] })
  }

  const limit = Math.min(Math.max(Number.parseInt(params.get('limit') ?? '20', 10) || 20, 1), 100)
  const before = params.get('before')
  const beforeId = params.get('before_id')
  const cursorValid = before && beforeId && UUID_RE.test(beforeId) && !Number.isNaN(new Date(before).getTime())
  const q = (params.get('q') ?? '').trim().slice(0, 100)
  const stage = params.get('stage')
  if (stage && !STAGES.has(stage)) {
    return NextResponse.json({ error: 'Invalid field: stage' }, { status: 400 })
  }

  // One extra row tells us whether another page exists.
  const { data, error } = await supabase.rpc('list_package_summaries', {
    p_limit: limit + 1,
    p_before_created: cursorValid ? before : null,
    p_before_id: cursorValid ? beforeId : null,
    p_query: q || null,
    p_stage: stage || null,
    p_only_with_resume: params.get('resume') === '1',
  })
  if (error) {
    console.error('packages summary list error user=' + user.id, error.message)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }

  const rows = ((data as PackageSummary[] | null) ?? []).map((r) => ({ ...r, status: r.status as PackageStatus }))
  const page = rows.slice(0, limit)
  const last = page[page.length - 1]
  const body: PackageListPage = {
    packages: page,
    next_cursor: rows.length > limit && last ? { before: last.created_at, before_id: last.id } : null,
  }

  if (params.get('counts') === '1') {
    // Only the stage column — a few bytes per job — for the whole list.
    const { data: stages, error: countError } = await supabase.from('packages').select('status').eq('user_id', user.id)
    if (countError) {
      console.error('packages stage count error user=' + user.id, countError.message)
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
    const counts = emptyStageCounts()
    for (const row of (stages as Array<{ status: PackageStatus }> | null) ?? []) {
      if (row.status in counts) counts[row.status] += 1
    }
    body.counts = counts
    body.total = (stages ?? []).length
  }

  return NextResponse.json(body)
}
