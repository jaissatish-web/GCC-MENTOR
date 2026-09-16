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
import { signedPhotoUrl } from '@/lib/storage/profilePhoto'
import { normalizeProfileDate } from '@/lib/partialDates'

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
 * ATOMIC SINCE 2026-09-15 (audit H08, migration 051). The PUT used to write the
 * parent row and then five child tables in six separate calls, so a failure
 * mid-way left a half-saved profile. It now validates and normalises here, then
 * hands the whole save to save_career_profile(), which runs as the signed-in
 * user (RLS still applies) inside ONE transaction: all of it lands, or none.
 *
 * STALE-TAB PROTECTION: a caller may send `expected_updated_at` (the
 * `updated_at` it loaded). If the stored profile is newer, nothing is written
 * and the answer is 409 PROFILE_CONFLICT. Callers that do not send it keep the
 * previous last-write-wins behaviour.
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

/**
 * Date columns on each child table. Values arriving for these are run through
 * normalizeProfileDate before they reach Postgres — see lib/partialDates.ts for
 * why month-precision input is the normal case rather than an edge case.
 */
const CHILD_DATE_FIELDS: Partial<Record<(typeof CHILD_TABLES)[number], readonly string[]>> = {
  profile_work_experience: ['start_date', 'end_date'],
  profile_certifications: ['issue_date', 'expiry_date'],
}

/** Date columns on career_profiles itself. Same treatment. */
const PROFILE_DATE_FIELDS = [
  'date_of_birth',
  'passport_validity_date',
  'driving_license_validity_date',
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

  // target_job_title and target_industry are OPTIONAL since migration 042: a
  // resume does not state the job the user is aiming for, so an auto-save right
  // after extraction must not require them. They are stored as null when empty
  // (see the parent build below). full_name / phone / email stay required — a
  // profile with no way to identify or contact the person is not usable.
  const requiredStringErr = requiredString('full_name', 'phone', 'email')
  if (requiredStringErr) return requiredStringErr

  if (typeof p.currently_in_gulf !== 'boolean') return 'currently_in_gulf'
  // Optional (migration 030) — informational targeting context, same
  // standing as target_company. null/absent is valid; if present it must be
  // a real enum member.
  if (p.target_country !== null && p.target_country !== undefined) {
    if (
      typeof p.target_country !== 'string' ||
      !TARGET_COUNTRIES.includes(p.target_country as TargetCountry)
    ) return 'target_country'
  }

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
    'current_employer', 'current_project', 'target_company',
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

/**
 * A date the database refuses to store as NULL must be readable HERE, not
 * discovered to be unreadable by Postgres.
 *
 * THE 500 THIS CLOSES (found end-to-end 2026-09-05). Three layers each behaved
 * reasonably and together produced a server error:
 *
 *   1. `requireString` accepts any non-empty string, so extraction returning
 *      `start_date: "January 2020"` — prose rather than ISO — passes validation.
 *   2. `normalizeProfileDate` cannot parse it and returns null, which is the
 *      right call: a date we cannot read is absent, and guessing would be worse.
 *   3. `profile_work_experience.start_date` is NOT NULL, so Postgres rejects the
 *      insert and the route answers 500 Internal Server Error.
 *
 * The user sees a server error immediately after waiting for their CV to be
 * read, and nothing tells them which job is missing a date. Extraction is
 * non-deterministic, so this fires intermittently on resumes that DO state
 * their dates.
 *
 * Validating the shape at the boundary turns it into a 400 that names the
 * field. It changes no storage behaviour: a value that reaches the database
 * still goes through exactly the same normaliser.
 */
function requireStorableDate(value: unknown): boolean {
  return normalizeProfileDate(value) === null
}

function validateWorkExperience(list: unknown): string | null {
  if (!Array.isArray(list)) return 'work_experience'
  for (const item of list) {
    if (!isObject(item)) return 'work_experience'
    if (requireString(item.company, 'company')) return 'work_experience.company'
    if (requireString(item.role, 'role')) return 'work_experience.role'
    if (requireString(item.start_date, 'start_date')) return 'work_experience.start_date'
    // NOT NULL in the database, so it must be readable here — see above.
    if (requireStorableDate(item.start_date)) return 'work_experience.start_date'
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
    // Institution is OPTIONAL (2026-08-18): resumes commonly list a degree and
    // year with no institution, and an auto-save right after extraction must not
    // fail on it. No migration needed — an empty string satisfies the column's
    // NOT NULL, and the user can add the institution later.
    if (optional(item.institution, 'institution', (x) => typeof x === 'string')) return 'education.institution'
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

  // photo_url stores an OBJECT PATH (migration 032). The client can only
  // render a URL, so sign it here; a missing or removed object yields null and
  // the profile simply renders without a picture.
  const photoDisplayUrl = await signedPhotoUrl((profile as { photo_url?: string | null }).photo_url)

  return NextResponse.json({
    ...(profile as CareerProfile),
    photo_url: photoDisplayUrl,
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
    'full_name', 'nationality', 'date_of_birth', 'passport_type',
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
  // Same partial-date treatment as the child tables above.
  for (const f of PROFILE_DATE_FIELDS) {
    if (f in profileRow) profileRow[f] = normalizeProfileDate(profileRow[f])
  }

  // user_id is always the caller; never taken from the body.
  profileRow.user_id = user.id

  // Compute readiness (TASK-014) from the submitted data and persist it.
  // readiness_category/score are ALWAYS computed here — never taken from the
  // request body. Completeness only (docs/CAREER_PROFILE.md §5).
  // NOTE: this must be a COPY of profileRow, not an alias. Assigning the four
  // child arrays onto profileRow itself would add keys that are not columns on
  // career_profiles, and the upsert below then fails with "Could not find the
  // 'certifications' column of 'career_profiles'" — defeating the whitelist
  // built directly above.
  const readinessInput: ReadinessInput = { ...profileRow } as unknown as ReadinessInput
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

  // Child collections, normalised exactly as before, keyed by their JSON name.
  // Row identity rules are unchanged: a row WITH an id is updated in place (the
  // id never changes); a row WITHOUT one is inserted; a stored row absent from a
  // collection that WAS sent is deleted; a collection that was not sent is left
  // alone. profile_id always comes from the caller's own profile, never the body.
  const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
  const childKeys: Array<[string, (typeof CHILD_TABLES)[number]]> = [
    ['work_experience', 'profile_work_experience'],
    ['skills', 'profile_skills'],
    ['certifications', 'profile_certifications'],
    ['education', 'profile_education'],
    ['additional_information', 'profile_additional_information'],
  ]
  const children: Record<string, Array<Record<string, unknown>>> = {}
  for (const [key, table] of childKeys) {
    const rows = body[key]
    if (!Array.isArray(rows)) continue
    const dateFields = CHILD_DATE_FIELDS[table] ?? []
    children[key] = rows.filter(isObject).map((r) => {
      const { profile_id: _ignoredProfile, created_at: _ignoredCreated, ...rest } = r
      void _ignoredProfile
      void _ignoredCreated
      const row: Record<string, unknown> = { ...rest }
      // Month-precision dates ("2021-03") and bare years ("2019") are what
      // resumes actually contain; Postgres `date` rejects both.
      for (const f of dateFields) {
        if (f in row) row[f] = normalizeProfileDate(row[f])
      }
      if (typeof row.id !== 'string' || !UUID_RE.test(row.id.trim())) delete row.id
      return row
    })
  }

  const { user_id: _callerId, ...profilePayload } = profileRow
  void _callerId
  const expectedUpdatedAt =
    typeof body.expected_updated_at === 'string' && body.expected_updated_at.trim() !== ''
      ? body.expected_updated_at
      : null

  const { data: saveResult, error: saveError } = await supabase.rpc('save_career_profile', {
    p_profile: profilePayload,
    p_children: children,
    p_expected_updated_at: expectedUpdatedAt,
  })

  if (saveError) {
    console.error(
      'profile PUT save error: user=' + user.id + ' fields=career_profiles,' + CHILD_TABLES.join(','),
      saveError.code ?? '',
      saveError.message ?? '',
    )
    return NextResponse.json(
      { error: 'Your profile could not be saved. Nothing was changed — please try again.' },
      { status: 500 },
    )
  }

  const result = saveResult as { status?: string; profile_id?: string; updated_at?: string } | null
  if (result?.status === 'conflict') {
    return NextResponse.json(
      {
        error:
          'This profile was changed in another tab or on another device. Reload to see the latest version — your edits on this screen have not been saved.',
        code: 'PROFILE_CONFLICT',
      },
      { status: 409 },
    )
  }
  const profileId = result?.status === 'saved' ? result.profile_id ?? null : null
  if (!profileId) {
    console.error('profile PUT: save returned no profile for user=' + user.id)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }

  console.info(
    `profile PUT success: user=${user.id} profile=${profileId} ` +
      `fields=career_profiles,${CHILD_TABLES.join(',')}`
  )
  // updated_at is the version the editor sends back next time (stale-tab check).
  return NextResponse.json({ ok: true, profileId, updated_at: result?.updated_at ?? null })
}
