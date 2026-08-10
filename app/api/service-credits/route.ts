import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { countAvailableServiceCredits } from '@/lib/admin/servicePackages'

/**
 * GET /api/service-credits?service=cover_letter (TASK-065)
 *
 * Lets the UI show "N available" or a "redeem a code" prompt without
 * spending an actual generation attempt to find out. Always scoped to the
 * caller's own credits — never accepts or trusts a userId from the client.
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  const supabase = await createClient()
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const serviceKey = request.nextUrl.searchParams.get('service')
  if (!serviceKey || serviceKey.trim() === '') {
    return NextResponse.json({ error: 'Missing service' }, { status: 400 })
  }

  const available = await countAvailableServiceCredits(user.id, serviceKey)
  return NextResponse.json({ available })
}
