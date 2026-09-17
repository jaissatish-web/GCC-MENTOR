import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import type { PackageServiceEvent, PackageServiceEventType } from '@/types/package'

/**
 * GET /api/service-usage (2026-09-17, founder request)
 *
 * How many times each service has run — in total for this user, and per saved
 * CV. Counted from each package's own service history (migration 048/050),
 * which records one event per generation: a regenerated Q&A set counts twice,
 * even though only the newest set is stored.
 *
 * Own rows only (RLS plus an explicit user filter). It reads nothing but ids
 * and the event list, so it stays light with a large Resume Library.
 */

export interface ServiceUsageCounts {
  cv: number
  cover_letter: number
  qa: number
  mock_started: number
  mock_completed: number
  pdf: number
}

export interface ServiceUsageResponse {
  totals: ServiceUsageCounts
  /** package id -> that CV's counts */
  by_package: Record<string, ServiceUsageCounts>
  /** How many saved CVs the totals cover. */
  packages: number
}

const EMPTY: ServiceUsageCounts = { cv: 0, cover_letter: 0, qa: 0, mock_started: 0, mock_completed: 0, pdf: 0 }

const OF_TYPE: Partial<Record<PackageServiceEventType, keyof ServiceUsageCounts>> = {
  cv_generated: 'cv',
  cover_letter_generated: 'cover_letter',
  qa_generated: 'qa',
  mock_interview_started: 'mock_started',
  mock_interview_completed: 'mock_completed',
  pdf_downloaded: 'pdf',
}

export async function GET(): Promise<NextResponse> {
  const supabase = await createClient()
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()
  if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data, error } = await supabase.from('packages').select('id, service_events').eq('user_id', user.id)
  if (error) {
    console.error('service-usage: read failed user=' + user.id, error.message)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }

  const totals: ServiceUsageCounts = { ...EMPTY }
  const byPackage: Record<string, ServiceUsageCounts> = {}
  for (const row of (data ?? []) as Array<{ id: string; service_events: PackageServiceEvent[] | null }>) {
    const counts: ServiceUsageCounts = { ...EMPTY }
    for (const event of row.service_events ?? []) {
      const key = OF_TYPE[event?.type as PackageServiceEventType]
      if (!key) continue
      counts[key] += 1
      totals[key] += 1
    }
    byPackage[row.id] = counts
  }

  const body: ServiceUsageResponse = { totals, by_package: byPackage, packages: (data ?? []).length }
  return NextResponse.json(body)
}
