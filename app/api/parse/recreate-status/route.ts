import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getRecreationStatus } from '@/lib/recreateLimit'

/**
 * How many profile recreations this user has left this month (2026-09-11).
 *
 * Read by the Career Profile's "Recreate my profile" panel so it can say how
 * many are left, and at zero, when they come back. Informational only — the
 * limit itself is enforced in the two parse routes, before the model call.
 */
export async function GET(): Promise<NextResponse> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const status = await getRecreationStatus(user.id)
  return NextResponse.json(status)
}
