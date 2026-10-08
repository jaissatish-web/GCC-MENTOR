import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

export async function GET(): Promise<NextResponse> {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    // No supplied user id: the invoker RPC uses auth.uid() and existing owner RLS.
    const { data, error } = await supabase.rpc('dashboard_overview')
    if (error || !data) {
      console.error('dashboard overview unavailable')
      return NextResponse.json({ error: 'Could not load your activity totals.' }, { status: 503 })
    }
    return NextResponse.json(data, { headers: { 'Cache-Control': 'private, no-store' } })
  } catch {
    return NextResponse.json({ error: 'Could not load your activity totals.' }, { status: 503 })
  }
}
