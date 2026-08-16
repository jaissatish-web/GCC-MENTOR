import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { PACKAGE_STATUSES } from '@/lib/utils'
import { TEMPLATES, isTemplateId } from '@/lib/templates'
import type { OptimizedContent, Package, PackageStatus } from '@/types/package'

/**
 * Package API — TASK-035 (+ TASK-033 additions).
 *
 * GET    /api/packages/[id]  -> the caller's package (Library open / preview)
 * PUT    /api/packages/[id]  -> update packages.status (Library status dropdown)
 * PATCH  /api/packages/[id]  -> partial optimized_content edits (TASK-033
 *                               "Edit this text": summary.user_edited, or
 *                               experience_blocks[].user_edited_bullets)
 * DELETE /api/packages/[id]  -> hard-delete the package row (Library Delete)
 *
 * Auth first (401). Every read/write is scoped to id = packageId AND user_id =
 * caller in the SAME query, so a row belonging to another user matches nothing
 * and 404s — never a leak, never a cross-user write (RLS also applies).
 *
 * PATCH write scope: ONLY the `optimized_content` jsonb column via a
 * read-modify-write merge (PostgREST replaces a jsonb column wholesale). It
 * never touches is_paid, status or any other column. Hiding a field / deleting
 * is untouched here. Shape is validated before any write; only the keys
 * provided are merged (summary.user_edited and/or per-block
 * user_edited_bullets keyed by profile_experience_id), everything else in the
 * package's optimized_content is preserved.
 */
const VALID_STATUSES = PACKAGE_STATUSES.map((s) => s.value) as PackageStatus[]

export async function PUT(
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

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }
  const status = (body as { status?: unknown })?.status
  if (typeof status !== 'string' || !VALID_STATUSES.includes(status as PackageStatus)) {
    return NextResponse.json({ error: 'Invalid field: status' }, { status: 400 })
  }

  const { data: updated, error } = await supabase
    .from('packages')
    .update({ status: status as PackageStatus })
    .eq('id', packageId)
    .eq('user_id', user.id)
    .select('id')
    .maybeSingle()

  if (error) {
    console.error('packages status update error user=' + user.id + ' pkg=' + packageId, error.message)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
  if (!updated) {
    return NextResponse.json({ error: 'Package not found' }, { status: 404 })
  }

  return NextResponse.json({ ok: true })
}

export async function DELETE(
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

  const { data: deleted, error } = await supabase
    .from('packages')
    .delete()
    .eq('id', packageId)
    .eq('user_id', user.id)
    .select('id')
    .maybeSingle()

  if (error) {
    console.error('packages delete error user=' + user.id + ' pkg=' + packageId, error.message)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
  if (!deleted) {
    return NextResponse.json({ error: 'Package not found' }, { status: 404 })
  }

  return NextResponse.json({ ok: true })
}

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

  const { data: pkg, error } = await supabase
    .from('packages')
    .select('*')
    .eq('id', packageId)
    .eq('user_id', user.id)
    .maybeSingle()

  if (error) {
    console.error('packages get error user=' + user.id + ' pkg=' + packageId, error.message)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
  if (!pkg) {
    return NextResponse.json({ error: 'Package not found' }, { status: 404 })
  }

  return NextResponse.json({ package: pkg as Package })
}

export async function PATCH(
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

  // ---- Load the current package (owner-scoped) to read its optimized_content -
  const { data: pkg, error: loadErr } = await supabase
    .from('packages')
    .select('id, optimized_content')
    .eq('id', packageId)
    .eq('user_id', user.id)
    .maybeSingle()
  if (loadErr) {
    console.error('packages patch load error user=' + user.id + ' pkg=' + packageId, loadErr.message)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
  if (!pkg) {
    return NextResponse.json({ error: 'Package not found' }, { status: 404 })
  }

  // ---- Parse + validate the body (names the offending field only) ----------
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }
  if (typeof body !== 'object' || body === null || Array.isArray(body)) {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 })
  }
  const b = body as Record<string, unknown>

  interface BlockEdit {
    profile_experience_id: string
    user_edited_bullets: string[] | null
  }
  const blockEdits: BlockEdit[] = []
  const summaryEdit: { user_edited?: string | null } = {}

  if (b.summary !== undefined && b.summary !== null) {
    if (typeof b.summary !== 'object' || Array.isArray(b.summary)) {
      return NextResponse.json({ error: 'Invalid field: summary' }, { status: 400 })
    }
    const s = b.summary as Record<string, unknown>
    if (s.user_edited !== undefined && s.user_edited !== null && typeof s.user_edited !== 'string') {
      return NextResponse.json({ error: 'Invalid field: summary.user_edited' }, { status: 400 })
    }
    if (s.user_edited !== undefined) summaryEdit.user_edited = (s.user_edited as string) || null
  }

  if (b.experience_blocks !== undefined && b.experience_blocks !== null) {
    if (!Array.isArray(b.experience_blocks)) {
      return NextResponse.json({ error: 'Invalid field: experience_blocks' }, { status: 400 })
    }
    for (const item of b.experience_blocks) {
      if (typeof item !== 'object' || item === null) {
        return NextResponse.json({ error: 'Invalid field: experience_blocks' }, { status: 400 })
      }
      const e = item as Record<string, unknown>
      if (typeof e.profile_experience_id !== 'string' || e.profile_experience_id.trim() === '') {
        return NextResponse.json({ error: 'experience_blocks.profile_experience_id' }, { status: 400 })
      }
      const bullets = e.user_edited_bullets
      if (
        bullets !== null &&
        (!Array.isArray(bullets) || bullets.some((x) => typeof x !== 'string'))
      ) {
        return NextResponse.json(
          { error: 'experience_blocks.user_edited_bullets' },
          { status: 400 }
        )
      }
      blockEdits.push({
        profile_experience_id: e.profile_experience_id as string,
        user_edited_bullets: Array.isArray(bullets) ? (bullets as string[]) : null,
      })
    }
  }

  // ---- Template switch (TASK-138) ------------------------------------------
  // Presentation only. The template is resolved at RENDER time from this
  // column, and the document's content lives in optimized_content and
  // document_snapshot — neither of which is touched here. That is what makes
  // "changing template must NOT destroy resume content" true by construction
  // rather than by being careful.
  let templateUpdate: { template_id: string; template_version: number } | null = null
  if (b.templateId !== undefined) {
    if (!isTemplateId(b.templateId)) {
      return NextResponse.json({ error: 'Invalid field: templateId' }, { status: 400 })
    }
    const entry = TEMPLATES[b.templateId]
    if (!entry.available) {
      return NextResponse.json({ error: 'That template is not available yet.' }, { status: 400 })
    }
    // The VERSION is stamped from the registry at switch time, so the resume
    // records the template as it exists today. A later revision cannot then
    // restyle it retroactively (migration 035's whole purpose).
    templateUpdate = { template_id: entry.id, template_version: entry.version }
  }

  if (Object.keys(summaryEdit).length === 0 && blockEdits.length === 0 && !templateUpdate) {
    return NextResponse.json({ error: 'Nothing to update' }, { status: 400 })
  }

  // A template-only switch must not rewrite optimized_content: an untouched
  // read-modify-write would still overwrite the row with whatever was read,
  // which is a needless risk on a paid document.
  if (templateUpdate && Object.keys(summaryEdit).length === 0 && blockEdits.length === 0) {
    const { data: switched, error: switchErr } = await supabase
      .from('packages')
      .update(templateUpdate)
      .eq('id', packageId)
      .eq('user_id', user.id)
      .select('id')
      .maybeSingle()
    if (switchErr) {
      console.error('packages patch template switch failed user=' + user.id + ' pkg=' + packageId, switchErr.message)
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
    if (!switched) return NextResponse.json({ error: 'Package not found' }, { status: 404 })
    return NextResponse.json({ ok: true, ...templateUpdate })
  }

  // ---- Read-modify-write merge onto the existing optimized_content ---------
  const oc =
    (pkg.optimized_content as OptimizedContent | null) ?? {
      summary: { generated: '', source_profile_summary: '' },
      experience_blocks: [],
    }
  if (summaryEdit.user_edited !== undefined) {
    oc.summary.user_edited = summaryEdit.user_edited
  }
  for (const edit of blockEdits) {
    const block = oc.experience_blocks.find((x) => x.profile_experience_id === edit.profile_experience_id)
    if (block) block.user_edited_bullets = edit.user_edited_bullets
    // A profile_experience_id not on this package is silently ignored — never
    // fabricated into the document (same grounding-adjacent discipline as the
    // optimize route's buildOptimizedContent).
  }

  const { data: updated, error: updateErr } = await supabase
    .from('packages')
    .update({ optimized_content: oc, ...(templateUpdate ?? {}) })
    .eq('id', packageId)
    .eq('user_id', user.id)
    .select('id')
    .maybeSingle()

  if (updateErr) {
    console.error('packages patch update error user=' + user.id + ' pkg=' + packageId, updateErr.message)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
  if (!updated) {
    return NextResponse.json({ error: 'Package not found' }, { status: 404 })
  }

  return NextResponse.json({ ok: true })
}
