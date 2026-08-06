import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import type { FieldVisibility } from '@/types/careerProfile'

/**
 * Field visibility API — TASK-013.
 *
 * PUT /api/profile/visibility
 *
 * Accepts a PARTIAL field_visibility map and MERGES it into the stored JSONB.
 * A request setting one key leaves the other keys exactly as they were — it
 * never replaces the object wholesale.
 *
 * The valid key set is EXACTLY the keys on the FieldVisibility interface in
 * types/careerProfile.ts. CAREFUL: these keys deliberately do NOT match the
 * career_profiles column names — it is `photo`, not `photo_url`; it is
 * `passport_validity`, not `passport_validity_date`. There is NO
 * `professional_summary` key (the summary is core resume content and has no
 * toggle — docs/CAREER_PROFILE.md §2) — it is rejected like any unknown key.
 *
 * Uses the anon-key session client (RLS applies — the caller can only ever
 * touch their own row). Never the service role.
 *
 * PII: never log or echo field VALUES — only profile id and key names.
 *
 * WRITE SCOPE: this route writes to the `field_visibility` column on
 * `career_profiles` and nothing else. See WRITE_SCOPE note in PUT.
 */

// Exact key set from the FieldVisibility interface. Nothing else is accepted.
const VALID_FIELD_KEYS: ReadonlyArray<keyof FieldVisibility> = [
  'full_name',
  'photo',
  'nationality',
  'date_of_birth',
  'passport_type',
  'passport_validity',
  'visa_status',
  'visa_transferable',
  'notice_period',
  'current_location',
  'phone',
  'whatsapp',
  'email',
  'linkedin_url',
  'additional_information',
]

const VALID_KEY_SET: ReadonlySet<string> = new Set(VALID_FIELD_KEYS)

function isObject(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v)
}

export async function PUT(request: NextRequest): Promise<NextResponse> {
  const supabase = await createClient()
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }
  if (!isObject(body)) {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 })
  }

  // Reject unknown keys and non-boolean values up front — name the KEY only.
  for (const [key, value] of Object.entries(body)) {
    if (!VALID_KEY_SET.has(key)) {
      // The key could be a value-like string, but we only ever echo the KEY.
      return NextResponse.json({ error: `Unknown field: ${key}` }, { status: 400 })
    }
    if (typeof value !== 'boolean') {
      return NextResponse.json({ error: `Invalid value for field: ${key}` }, { status: 400 })
    }
  }

  // Load the caller's current row (scoped by user_id, RLS applies). 404 if none.
  const { data: row, error: fetchError } = await supabase
    .from('career_profiles')
    .select('id, field_visibility')
    .eq('user_id', user.id)
    .maybeSingle()

  if (fetchError) {
    console.error('visibility GET error: id=' + user.id + ' fields=field_visibility', fetchError?.message ?? '')
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
  if (!row) {
    return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
  }

  const profileId: string = row.id as string
  const current: FieldVisibility =
    (row.field_visibility as FieldVisibility | null) ??
    // Fall back to the migration-010 documented default if the stored value
    // is somehow absent. All true except passport_type and date_of_birth.
    {
      full_name: true,
      photo: true,
      nationality: true,
      date_of_birth: false,
      passport_type: false,
      passport_validity: true,
      visa_status: true,
      visa_transferable: true,
      notice_period: true,
      current_location: true,
      phone: true,
      whatsapp: true,
      email: true,
      linkedin_url: true,
      additional_information: true,
    }

  // MERGE the partial into a fresh map — every key already validated above.
  const merged: FieldVisibility = { ...current }
  for (const [key, value] of Object.entries(body)) {
    merged[key as keyof FieldVisibility] = value as boolean
  }

  // ----- WRITE_SCOPE -----
  // This route writes ONLY the `field_visibility` column via a single UPDATE
  // that sets exactly that one column. No other column on career_profiles is
  // written, cleared or nulled; no child table is touched. Hiding a field only
  // flips a boolean in this jsonb map and NEVER deletes underlying data.
  // (Read-modify-write is used because PostgREST replaces a jsonb column
  // wholesale on update; merging requires reading the current value first.
  // Not atomic against a concurrent write, but correct for single-writer use.)
  const { error: updateError } = await supabase
    .from('career_profiles')
    .update({ field_visibility: merged })
    .eq('user_id', user.id)

  if (updateError) {
    console.error('visibility UPDATE error: id=' + profileId + ' keys=' + Object.keys(body).join(','), updateError?.message ?? '')
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }

  console.info(
    `visibility PUT success: user=${user.id} profile=${profileId} ` +
      `keys=${Object.keys(body).join(',')}`
  )

  return NextResponse.json(merged satisfies FieldVisibility)
}