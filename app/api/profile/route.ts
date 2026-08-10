import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import type {
  CareerProfile,
  CareerProfileFull,
  PassportType,
  ProfileAdditionalInformation,
  ProfileCertification,
  ProfileEducation,
  ProfileSkill,
  ProfileWorkExperience,
  TargetCountry,
} from '@/types/careerProfile'
import { calculateReadiness } from '@/lib/readiness'
import type { ReadinessInput } from '@/lib/readiness'
import { detectEmploymentGaps } from '@/lib/employmentGaps'

/**
 * Profile CRUD API — TASK-012.
 *
 * GET /api/profile  -> the caller's career_profiles row + all five child tables.
 * PUT /api/profile  -> upsert the caller's profile + children.
 *
 * Auth is checked first on every route; 401 when absent. Every write is
 * validated against types/careerProfile.ts before hitting the database, and a
 * 400 names the offending FIELD only — never its value (docs/RULES.md §3).
 *
 * ATOMICITY NOTE: the Supabase JS client (v2.112) exposes NO cross-table
 * transaction primitive. The PUT below performs up/downdates in sequence and
 * is therefore NOT atomic — a failure mid-way can leave the profile partially
 * written. This is stated plainly rather than faking atomicity with sequential
 * awaits. True atomicity requires a server-side Postgres function (RPC) that
 * wraps the whole operation in one transaction; that is a separate migration
 * and not built here (see Question for CTO).
 *
 * PII: no field VALUES are ever logged or echoed — only profile ID and field
 * names appear in logs/errors.
 */

const TARGET_COUNTRIES: TargetCountry[] = [
  'saudi_arabia', 'uae', 'qatar', 'oman', 'kuwait', 'bahrain', 'generic_gulf',
]
const PASSPORT_TYPES: PassportType[] = ['ECR', 'Non-ECR']

const CHILD_TABLES = [
  'profile_work_experience',
  'profile_skills',
  'profile_certifications',
  'profile_education',
  'profile_additional_information',
] as const

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

function isObject(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v)
}

/** Validate a single string field that must be a non-empty string. */
function requireString(v: unknown, field: string): string | null {
  if (typeof v !== 'string' || v.trim() === '') return field
  return null
}

/** Validate an optional scalar field against a type checker. */
function optional(v: unknown, field: string, check: (x: unknown) => boolean): string | null {
  if (v === null || v === undefined) return null
  return check(v) ? null : field
}

/** Validate one CareerProfile (parent) record; returns offending field or null. */
function validateProfile(p: Record<string, unknown>): string | null {
  // Required (NOT NULL) fields — reject if missing or of the wrong type.
  const requiredString = (...fields: string[]): string | null => {
    for (const f of fields) {
      const v = p[f]
      if (typeof v !== 'string' || v.trim() === '') return f
    }
    return null
  }

  const requiredStringErr = requiredString(
    'target_job_title', 'target_industry', 'full_name', 'phone', 'email'
  )
  if (requiredStringErr) return requiredStringErr

  if (typeof p.currently_in_gulf !== 'boolean') return 'currently_in_gulf'
  if (
    typeof p.target_country !== 'string' ||
    !TARGET_COUNTRIES.includes(p.target_country as TargetCountry)
  ) return 'target_country'

  // Optional scalar fields — null/undefined ok, but wrong type is an error.
  const optionalStr = (...fields: string[]): string | null => {
    for (const f of fields) {
      const v = p[f]
      if (v === null || v === undefined) continue
      if (typeof v !== 'string') return f
    }
    return null
  }
  const optionalStrErr = optionalStr(
    'current_employer', 'current_project', 'target_company', 'photo_url',
    'nationality', 'date_of_birth', 'passport_validity_date', 'visa_status',
    'notice_period', 'current_location', 'whatsapp', 'linkedin_url',
    'professional_summary', 'driving_license_country', 'driving_license_category',
    'driving_license_validity_date',
  )
  if (optionalStrErr) return optionalStrErr

  if (p.passport_type !== null && p.passport_type !== undefined) {
    if (typeof p.passport_type !== 'string' || !PASSPORT_TYPES.includes(p.passport_type as PassportType)) {
      return 'passport_type'
    }
  }
  if (p.visa_transferable !== null && p.visa_transferable !== undefined) {
    if (typeof p.visa_transferable !== 'boolean') return 'visa_transferable'
  }
  // has_driving_license is nullable-tri-state (migration 027) — null/absent
  // is valid (not yet answered), but if present it must be a real boolean,
  // never a truthy string, so "not yet answered" can never be confused with
  // a coerced false.
  if (p.has_driving_license !== null && p.has_driving_license !== undefined) {
    if (typeof p.has_driving_license !== 'boolean') return 'has_driving_license'
  }

  // Readiness is auto-derived (TASK-014); accept null or a known value if sent.
  if (p.readiness_category !== undefined && p.readiness_category !== null) {
    const known = ['currently_in_gulf', 'fresher', 'returner', 'experienced_not_in_gulf']
    if (typeof p.readiness_category !== 'string' || !known.includes(p.readiness_category)) return 'readiness_category'
  }
  if (p.readiness_score !== undefined && p.readiness_score !== null) {
    if (typeof p.readiness_score !== 'number' || p.readiness_score < 0 || p.readiness_score > 100) return 'readiness_score'
  }

  // field_visibility is NOT computed/merged here (that is TASK-013). If the
  // client sends it, validate its shape; if absent, the DB default applies.
  if (p.field_visibility !== undefined && p.field_visibility !== null) {
    if (!isObject(p.field_visibility)) return 'field_visibility'
    for (const v of Object.values(p.field_visibility)) {
      if (typeof v !== 'boolean') return 'field_visibility'
    }
  }

  return null
}

function validateWorkExperience(list: unknown): string | null {
  if (!Array.isArray(list)) return 'work_experience'
  for (const item of list) {
    if (!isObject(item)) return 'work_experience'
    if (requireString(item.company, 'company')) return 'work_experience.company'
    if (requireString(item.role, 'role')) return 'work_experience.role'
    if (requireString(item.start_date, 'start_date')) return 'work_experience.start_date'
    if (optional(item.end_date, 'end_date', (x) => typeof x === 'string')) return 'work_experience.end_date'
    if (typeof item.sort_order !== 'number') return 'work_experience.sort_order'
    // migration 027 — null/absent = not GCC experience, otherwise must be a
    // real target_country_enum member, same set the DB column accepts.
    if (
      optional(item.gcc_country, 'gcc_country', (x) => typeof x === 'string' && TARGET_COUNTRIES.includes(x as TargetCountry))
    ) return 'work_experience.gcc_country'
  }
  return null
}

function validateSkill(list: unknown): string | null {
  if (!Array.isArray(list)) return 'skills'
  for (const item of list) {
    if (!isObject(item)) return 'skills'
    if (requireString(item.name, 'name')) return 'skills.name'
    if (typeof item.sort_order !== 'number') return 'skills.sort_order'
  }
  return null
}

function validateCertification(list: unknown): string | null {
  if (!Array.isArray(list)) return 'certifications'
  for (const item of list) {
    if (!isObject(item)) return 'certifications'
    if (requireString(item.name, 'name')) return 'certifications.name'
    if (optional(item.issuer, 'issuer', (x) => typeof x === 'string')) return 'certifications.issuer'
    if (optional(item.issue_date, 'issue_date', (x) => typeof x === 'string')) return 'certifications.issue_date'
    if (optional(item.expiry_date, 'expiry_date', (x) => typeof x === 'string')) return 'certifications.expiry_date'
    if (typeof item.sort_order !== 'number') return 'certifications.sort_order'
  }
  return null
}

function validateEducation(list: unknown): string | null {
  if (!Array.isArray(list)) return 'education'
  for (const item of list) {
    if (!isObject(item)) return 'education'
    if (requireString(item.degree, 'degree')) return 'education.degree'
    if (requireString(item.institution, 'institution')) return 'education.institution'
    if (optional(item.start_year, 'start_year', (x) => typeof x === 'number')) return 'education.start_year'
    if (optional(item.end_year, 'end_year', (x) => typeof x === 'number')) return 'education.end_year'
    if (typeof item.sort_order !== 'number') return 'education.sort_order'
  }
  return null
}

function validateAdditional(list: unknown): string | null {
  if (!Array.isArray(list)) return 'additional_information'
  for (const item of list) {
    if (!isObject(item)) return 'additional_information'
    if (requireString(item.label, 'label')) return 'additional_information.label'
    if (requireString(item.value, 'value')) return 'additional_information.value'
    if (typeof item.sort_order !== 'number') return 'additional_information.sort_order'
  }
  return null
}

// ---------------------------------------------------------------------------
// Handlers
// ---------------------------------------------------------------------------

export async function GET(): Promise<NextResponse> {
  const supabase = await createClient()
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Query by user_id EXPLICITLY — never rely on RLS as the only filter.
  const { data: profile, error: profileError } = await supabase
    .from('career_profiles')
    .select('*')
    .eq('user_id', user.id)
    .maybeSingle()

  if (profileError) {
    console.error('profile GET error: id=' + user.id + ' fields=career_profiles', profileError?.message ?? '')
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
  if (!profile) {
    return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
  }

  const profileId = profile.id as string
  if (!profileId) {
    console.error('profile GET: missing id for user=' + user.id)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }

  // Fetch all five child tables scoped to this profile.
  const fetchChildren = async (table: (typeof CHILD_TABLES)[number]): Promise<unknown[]> => {
    const { data } = await supabase.from(table).select('*').eq('profile_id', profileId)
    return (data as unknown[] | null) ?? []
  }
  const [work_experience, skills, certifications, education, additional_information] = await Promise.all([
    fetchChildren('profile_work_experience'),
    fetchChildren('profile_skills'),
    fetchChildren('profile_certifications'),
    fetchChildren('profile_education'),
    fetchChildren('profile_additional_information'),
  ])

  // Computed on read, never persisted — see lib/employmentGaps.ts's header
  // for why this is informational only (not folded into readiness_score
  // yet). Not part of CareerProfileFull's DB-mirrored shape; an additive
  // extra key on the response only.
  const employment_gaps = detectEmploymentGaps(work_experience as ProfileWorkExperience[])

  return NextResponse.json({
    ...(profile as CareerProfile),
    work_experience: work_experience as ProfileWorkExperience[],
    skills: skills as ProfileSkill[],
    certifications: certifications as ProfileCertification[],
    education: education as ProfileEducation[],
    additional_information: additional_information as ProfileAdditionalInformation[],
    employment_gaps,
  } satisfies CareerProfileFull & { employment_gaps: ReturnType<typeof detectEmploymentGaps> })
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

  // Validate every field BEFORE writing anything (never echo values).
  const badProfileField = validateProfile(body)
  if (badProfileField) {
    return NextResponse.json({ error: `Invalid field: ${badProfileField}` }, { status: 400 })
  }
  const childChecks: Array<[string, string | null]> = [
    ['work_experience', validateWorkExperience(body.work_experience)],
    ['skills', validateSkill(body.skills)],
    ['certifications', validateCertification(body.certifications)],
    ['education', validateEducation(body.education)],
    ['additional_information', validateAdditional(body.additional_information)],
  ]
  for (const [label, err] of childChecks) {
    if (err) return NextResponse.json({ error: `Invalid field: ${err}` }, { status: 400 })
    void label
  }

  // Build the career_profiles upsert row. Strip anything not a valid column.
  const allowedProfileKeys: Array<keyof CareerProfile> = [
    'currently_in_gulf', 'current_employer', 'current_project',
    'target_job_title', 'target_industry', 'target_country', 'target_company',
    'full_name', 'photo_url', 'nationality', 'date_of_birth', 'passport_type',
    'passport_validity_date', 'visa_status', 'visa_transferable', 'notice_period',
    'current_location', 'phone', 'whatsapp', 'email', 'linkedin_url',
    'professional_summary', 'field_visibility', 'readiness_category', 'readiness_score',
    'has_driving_license', 'driving_license_country', 'driving_license_category',
    'driving_license_validity_date',
  ]
  const profileRow: Record<string, unknown> = {}
  for (const k of allowedProfileKeys) {
    if (body[k] !== undefined) profileRow[k] = body[k]
  }
  // user_id is always the caller; never taken from the body.
  profileRow.user_id = user.id

  // Compute readiness (TASK-014) from the submitted data and persist it.
  // readiness_category/score are ALWAYS computed here — never taken from the
  // request body. Completeness only (docs/CAREER_PROFILE.md §5).
  const readinessInput: ReadinessInput = profileRow as unknown as ReadinessInput
  readinessInput.work_experience = Array.isArray(body.work_experience)
    ? (body.work_experience as Array<{ start_date: string; end_date?: string | null }>)
    : []
  readinessInput.education = Array.isArray(body.education) ? (body.education as unknown[]) : []
  readinessInput.certifications = Array.isArray(body.certifications)
    ? (body.certifications as unknown[])
    : []
  readinessInput.skills = Array.isArray(body.skills) ? (body.skills as unknown[]) : []
  const readiness = calculateReadiness(readinessInput)
  profileRow.readiness_category = readiness.category
  profileRow.readiness_score = readiness.score

  // Upsert the profile row (one table = one atomic operation via Supabase).
  const { data: upserted, error: upsertError } = await supabase
    .from('career_profiles')
    .upsert(profileRow, { onConflict: 'user_id' })
    .select('id')
    .single()

  if (upsertError) {
    console.error('profile PUT upsert error: id=' + user.id + ' fields=career_profiles', upsertError?.message ?? '')
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
  const profileId: string | null = upserted?.id ?? null
  if (!profileId) {
    console.error('profile PUT: no id returned for user=' + user.id)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }

  // Reconcile the child rows for this profile — UPSERT-BY-ID per table.
  // Referential integrity (packages.optimized_content.experience_blocks frozen
  // by profile_experience_id, and packages.skills_order) must never depend on
  // the client sending ids back: ids preserve row identity and survive re-save.
  //   - Rows arriving WITH an id: upsert on id; the id is never changed.
  //   - Rows arriving WITHOUT an id: insert; the DB generates the id.
  //   - Rows in the DB whose id is ABSENT from the incoming set: delete those
  //     and only those. Never a blanket delete.
  // profile_id is FORCED to the caller's profile id on every write path, never
  // taken from the request body (ownership verification).
  // Each table is its own Supabase op; the five are NOT atomic as a group (no
  // JS-client cross-table transaction) — but with upsert-by-id a partial
  // failure is recoverable rather than data-losing. Keep the try/catch + 500.
  const reconcileChildren = async (
    table: (typeof CHILD_TABLES)[number],
    rows: unknown[] | undefined,
  ): Promise<void> => {
    if (!Array.isArray(rows)) return

    const incoming = rows.filter(isObject).map((r): Record<string, unknown> => {
      const { profile_id: _ignored, ...rest } = r
      return { ...rest, profile_id: profileId } // force ownership; never body value
    })

    const withId = incoming.filter((r) => typeof r.id === 'string' && String(r.id).trim() !== '')
    const withoutId = incoming.filter((r) => r.id === undefined || r.id === null || String(r.id).trim() === '')

    // Existing ids for THIS profile (ownership-scoped, never a blanket read).
    const { data: existing } = await supabase
      .from(table)
      .select('id')
      .eq('profile_id', profileId)
    if (existing === null) {
      throw new Error('SELECT id returned null for ' + table)
    }
    const existingIds = (existing as { id: string | null }[])
      .map((x) => (x.id != null ? String(x.id) : ''))
      .filter(Boolean)

    // Upsert rows that carry an id. The id is the key and is never changed.
    if (withId.length > 0) {
      const { error } = await supabase.from(table).upsert(withId, { onConflict: 'id' })
      if (error) throw error
    }

    // Insert rows with no id; let the DB generate one.
    if (withoutId.length > 0) {
      const { error } = await supabase.from(table).insert(withoutId)
      if (error) throw error
    }

    // Delete rows whose id is absent from the incoming set — ONLY those.
    const keepIds = new Set(withId.map((r) => String(r.id)))
    const stale = existingIds.filter((id) => !keepIds.has(id))
    if (stale.length > 0) {
      const { error } = await supabase
        .from(table)
        .delete()
        .eq('profile_id', profileId)
        .in('id', stale)
      if (error) throw error
    }
  }

  try {
    await Promise.all([
      reconcileChildren('profile_work_experience', body.work_experience as unknown[] | undefined),
      reconcileChildren('profile_skills', body.skills as unknown[] | undefined),
      reconcileChildren('profile_certifications', body.certifications as unknown[] | undefined),
      reconcileChildren('profile_education', body.education as unknown[] | undefined),
      reconcileChildren('profile_additional_information', body.additional_information as unknown[] | undefined),
    ])
  } catch (e) {
    const msg: string = typeof e === 'object' && e !== null && 'message' in e ? String((e as { message: unknown }).message) : ''
    console.error('profile PUT children error: id=' + profileId + ' fields=' + CHILD_TABLES.join(','), msg)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }

  console.info(
    `profile PUT success: user=${user.id} profile=${profileId} ` +
      `fields=career_profiles,${CHILD_TABLES.join(',')}`
  )
  return NextResponse.json({ ok: true, profileId })
}
