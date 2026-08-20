import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { PACKAGE_STATUSES } from '@/lib/utils'
import { TEMPLATES, isTemplateId } from '@/lib/templates'
import { applyContentEditsToDocument } from '@/lib/resumeDocument'
import { parseStyleOverrides, type ResumeStyleOverrides } from '@/lib/resumeStyle'
import type { ResumeDocument } from '@/lib/resumeDocument'
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
 * PATCH write scope: `optimized_content` via a read-modify-write merge
 * (PostgREST replaces a jsonb column wholesale), and — only when that content
 * actually changed — `document_snapshot`, so the frozen document the renderers
 * read stays in step with the edit (TASK-145). Plus the metadata columns the
 * later sections below add: `name`, `status`, `template_id`/`template_version`.
 * It never touches is_paid. Shape is validated before any write; only the keys
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
    .select('id, profile_id, optimized_content, document_snapshot')
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

  // ---- Rename (TASK-139) ----------------------------------------------------
  // The user's own label for this resume. Trimmed, length-capped, and an empty
  // string clears it back to "never named" rather than storing a blank — so the
  // Library falls back to the target job title instead of showing a nameless
  // row.
  // ---- Style overrides (TASK-152, migration 037) ----------------------------
  // Presentation only, and validated against the frozen allow-list in
  // lib/resumeStyle.ts before any write — these values end up inside inline
  // style attributes in HTML that Puppeteer renders to produce the paid PDF, so
  // the request carries KEYS and the CSS comes from the table, never from the
  // client. An unknown key is rejected rather than defaulted.
  const metaUpdate: {
    name?: string | null
    status?: PackageStatus
    style_overrides?: ResumeStyleOverrides | null
  } = {}
  if (b.styleOverrides !== undefined) {
    const parsedStyle = parseStyleOverrides(b.styleOverrides)
    if ('error' in parsedStyle) {
      return NextResponse.json({ error: `Invalid field: ${parsedStyle.error}` }, { status: 400 })
    }
    metaUpdate.style_overrides = parsedStyle.value
  }
  if (b.name !== undefined) {
    if (b.name !== null && typeof b.name !== 'string') {
      return NextResponse.json({ error: 'Invalid field: name' }, { status: 400 })
    }
    const trimmed = typeof b.name === 'string' ? b.name.trim() : ''
    if (trimmed.length > 120) {
      return NextResponse.json({ error: 'Name must be 120 characters or fewer.' }, { status: 400 })
    }
    metaUpdate.name = trimmed === '' ? null : trimmed
  }
  if (b.status !== undefined) {
    if (typeof b.status !== 'string' || !VALID_STATUSES.includes(b.status as PackageStatus)) {
      return NextResponse.json({ error: 'Invalid field: status' }, { status: 400 })
    }
    metaUpdate.status = b.status as PackageStatus
  }

  const hasMeta = Object.keys(metaUpdate).length > 0

  if (
    Object.keys(summaryEdit).length === 0 &&
    blockEdits.length === 0 &&
    !templateUpdate &&
    !hasMeta
  ) {
    return NextResponse.json({ error: 'Nothing to update' }, { status: 400 })
  }

  // Metadata-only changes (rename, status, template) never touch the document.
  // Rewriting optimized_content for a rename would put a paid resume's words
  // through a read-modify-write for no reason at all.
  if (Object.keys(summaryEdit).length === 0 && blockEdits.length === 0) {
    const { data: metaRow, error: metaErr } = await supabase
      .from('packages')
      .update({ ...(templateUpdate ?? {}), ...metaUpdate })
      .eq('id', packageId)
      .eq('user_id', user.id)
      .select('id, name, status, template_id, template_version, style_overrides')
      .maybeSingle()
    if (metaErr) {
      console.error('packages patch meta failed user=' + user.id + ' pkg=' + packageId, metaErr.message)
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
    if (!metaRow) return NextResponse.json({ error: 'Package not found' }, { status: 404 })
    return NextResponse.json({ ok: true, package: metaRow })
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
  // A block may legitimately not exist yet: a resume that was never optimized
  // has an empty (or null) optimized_content, and /package/[id]/edit lets its
  // wording be edited anyway — the user's own text, saved as user_edited_bullets
  // (2026-08-19). Before this, such an edit was silently dropped.
  //
  // THE GROUNDING GUARD IS PRESERVED, and is why the profile is read here: a
  // block is created ONLY for a profile_experience_id that genuinely belongs to
  // this package's own profile. An id from anywhere else is still ignored, never
  // fabricated into the document — same discipline as the optimize route's
  // buildOptimizedContent.
  const missingBlockIds = blockEdits
    .filter((e) => !oc.experience_blocks.some((x) => x.profile_experience_id === e.profile_experience_id))
    .map((e) => e.profile_experience_id)

  if (missingBlockIds.length > 0) {
    const { data: entries, error: entriesErr } = await supabase
      .from('profile_work_experience')
      .select('id, highlights')
      .eq('profile_id', pkg.profile_id as string)
      .in('id', missingBlockIds)
    if (entriesErr) {
      console.error(
        'packages patch experience lookup error user=' + user.id + ' pkg=' + packageId,
        entriesErr.message,
      )
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
    const rows = (entries as Array<{ id: string; highlights: string[] | null }> | null) ?? []
    for (const row of rows) {
      oc.experience_blocks.push({
        profile_experience_id: row.id,
        // FALSE, and that matters: the model never touched this block. It is
        // what keeps hasGeneratedContent() honest and stops a hand-edited
        // resume from being labelled as AI-optimized.
        was_optimized: false,
        generated_bullets: null,
        user_edited_bullets: null,
        // The "before" side stays the profile's real highlights, never invented.
        source_bullets: row.highlights ?? [],
        claims: [],
      })
    }
  }

  for (const edit of blockEdits) {
    const block = oc.experience_blocks.find((x) => x.profile_experience_id === edit.profile_experience_id)
    if (block) block.user_edited_bullets = edit.user_edited_bullets
    // Still silently ignored when the id is not this profile's — see above.
  }

  // KEEP THE FROZEN DOCUMENT IN STEP WITH THE EDIT (TASK-145).
  //
  // document_snapshot (migration 034) is what the resume screen and the PDF
  // route actually render — they prefer it over the live profile so a paid
  // document cannot change underneath its buyer. It was written once, at
  // generation, and nothing rewrote it afterwards, so every text edit made here
  // was saved to optimized_content and then silently ignored by both renderers.
  //
  // Only the summary and the bullets are re-applied — the two things a user can
  // edit. Every fixed field stays exactly as delivered, which is the promise
  // migration 034 makes and this must not weaken. Packages generated before 034
  // have no snapshot and are left alone: they render from the live profile, as
  // they always have.
  const existingSnapshot = pkg.document_snapshot as ResumeDocument | null
  const snapshotUpdate = existingSnapshot
    ? { document_snapshot: applyContentEditsToDocument(existingSnapshot, oc) }
    : {}

  const { data: updated, error: updateErr } = await supabase
    .from('packages')
    .update({ optimized_content: oc, ...snapshotUpdate, ...(templateUpdate ?? {}) })
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
