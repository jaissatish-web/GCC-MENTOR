import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { PACKAGE_STATUSES } from '@/lib/utils'
import type { PackageStatus } from '@/types/package'

/**
 * Package mutation — TASK-035.
 *
 * PUT    /api/packages/[id]  -> update packages.status (Library status dropdown)
 * DELETE /api/packages/[id]  -> hard-delete the package row (Library Delete)
 *
 * Auth first (401). Every write is scoped to id = packageId AND user_id =
 * caller in the SAME query, so a row belonging to another user matches nothing
 * and 404s — never a leak, never a cross-user write (RLS also applies).
 *
 * DELETE is a hard delete of the `packages` row (§8 "Deletion is a hard
 * delete"). Child rows are not involved (a package has no child tables; its
 * data point is career_profiles, which is NOT touched — deleting a package
 * never deletes the user's profile). The update body carries only `status`,
 * validated against the PackageStatus enum before any write.
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
