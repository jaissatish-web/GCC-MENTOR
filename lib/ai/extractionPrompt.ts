import type {
  CareerProfileDraft,
  DraftWorkExperience,
  DraftSkill,
  DraftCertification,
  DraftEducation,
  DraftAdditionalInformation,
} from '@/types/careerProfile'

/**
 * Resume extraction — system prompt + draft normalizer (TASK-020).
 *
 * This is EXTRACTION, not generation: the model reads the user's raw resume
 * text and returns a structured CareerProfileDraft. The prompt is written from
 * scratch (NOT the ones in reference/parse-*.reference.ts — see docs/HERMES.md
 * §7 — those target the old HireCircuit schema and the OpenAI SDK).
 *
 * Grounding analogue: extraction may use ONLY facts literally present in the
 * resume text. A field it cannot find is ABSENT (omitted), never a fabricated
 * placeholder or empty string — matching the CareerProfileDraft contract.
 */

export const EXTRACTION_SYSTEM_PROMPT = `You are a resume extraction engine for a Gulf career platform.

Read the resume text provided below and return a single JSON object. Your job is STRUCTURED EXTRACTION: copy facts from the resume into the exact schema below. You never invent, infer or guess a fact that is not literally in the text.

RULES:
1. Return ONLY valid JSON. No prose, no markdown, no code fences, no explanation.
2. Use ONLY facts present in the resume. If a field is not present, OMIT it (for optional fields) — never emit null, "", or a placeholder. Do not guess.
3. booleans (visa_transferable) must be true or false; omit if not determinable.
4. Dates: use YYYY-MM-DD where a full date is present, otherwise YYYY-MM or YYYY. NEVER invent a date.
5. passport_type is one of "ECR" or "Non-ECR" only; omit if not stated.
6. professional_summary: a concise first-person summary of the candidate's experience, written ONLY from facts in the resume. Null/omit if the resume has no summary-like paragraph.
7. skills: a flat list of named skills. Do NOT categorize or create sub-objects.
8. Every item in work_experience/skills/certifications/education/additional_information MUST carry "sort_order" — the order the item appears in the resume, starting at 1. Do NOT include "id", "profile_id" or "created_at" on any item.
9. additional_information: capture anything else the resume contains that does not fit a named field — e.g. languages, marital status, driving licence, salary expectation, expected salary, availability, projects, LinkedIn, address, hobbies, gap notes. Each entry: {"label": <short AI-suggested label, e.g. "Languages">, "value": <the text>, "sort_order": <n>}. The user can rename the label later; keep it short.
10. work_experience highlights: preserve each bullet as a separate string, original wording.

OUTPUT SCHEMA (all five arrays must be present; use [] if none):
{
  "full_name": "string",
  "photo_url": "string",
  "nationality": "string",
  "date_of_birth": "string",
  "passport_type": "ECR" | "Non-ECR",
  "passport_validity_date": "string",
  "visa_status": "string",
  "visa_transferable": true,
  "notice_period": "string",
  "current_location": "string",
  "phone": "string",
  "whatsapp": "string",
  "email": "string",
  "linkedin_url": "string",
  "professional_summary": "string",
  "work_experience": [
    { "company": "string", "role": "string", "start_date": "string", "end_date": "string", "location": "string", "description": "string", "highlights": ["string"], "sort_order": 1 }
  ],
  "skills": [ { "name": "string", "sort_order": 1 } ],
  "certifications": [ { "name": "string", "issuer": "string", "issue_date": "string", "expiry_date": "string", "sort_order": 1 } ],
  "education": [ { "degree": "string", "institution": "string", "field_of_study": "string", "start_year": 2015, "end_year": 2019, "sort_order": 1 } ],
  "additional_information": [ { "label": "string", "value": "string", "sort_order": 1 } ]
}

Every key in the parent object and every item is OPTIONAL except sort_order on items and the five arrays themselves. ANOTHER reminder: NO id, profile_id, created_at, currently_in_gulf, current_employer, current_project, target_job_title, target_industry, target_country, or target_company keys anywhere.`

// Parent keys the draft may carry (matching CareerProfileDraftFields). Everything
// else — status & target fields, DB-owned fields, any unrecognized key — is
// dropped by normalizeDraft so the model can never inject them.
const ALLOWED_PARENT_KEYS = new Set([
  'full_name',
  'photo_url',
  'nationality',
  'date_of_birth',
  'passport_type',
  'passport_validity_date',
  'visa_status',
  'visa_transferable',
  'notice_period',
  'current_location',
  'phone',
  'whatsapp',
  'email',
  'linkedin_url',
  'professional_summary',
])

function isObject(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v)
}

function withSortOrder(items: unknown[], start: number): Record<string, unknown>[] {
  return (items ?? []).map((raw, i) => {
    const it = isObject(raw) ? raw : {}
    const out: Record<string, unknown> = {}
    for (const [k, v] of Object.entries(it)) {
      // Drop DB-owned and forbidden keys on child items defensively.
      if (k === 'id' || k === 'profile_id' || k === 'created_at' || k === 'updated_at') continue
      out[k] = v
    }
    out.sort_order = start + i
    return out
  })
}

/**
 * Coerce the model's raw JSON into a well-formed CareerProfileDraft:
 *  - keeps only allowed optional parent fields (drops status/target & DB-owned)
 *  - guarantees all five child arrays exist (default [])
 *  - assigns extraction-order sort_order to every child item
 *  - returns null if the payload is not an object (malformed)
 */
export function normalizeDraft(raw: unknown): CareerProfileDraft | null {
  if (!isObject(raw)) return null

  const parent: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(raw)) {
    if (ALLOWED_PARENT_KEYS.has(k)) parent[k] = v
    // Any other key — status/target, DB-owned, or unrecognized — is dropped.
  }

  const workArr = Array.isArray(raw.work_experience) ? raw.work_experience : []
  const skillsArr = Array.isArray(raw.skills) ? raw.skills : []
  const certsArr = Array.isArray(raw.certifications) ? raw.certifications : []
  const eduArr = Array.isArray(raw.education) ? raw.education : []
  const addlArr = Array.isArray(raw.additional_information) ? raw.additional_information : []

  return {
    ...(parent as unknown as CareerProfileDraft),
    work_experience: withSortOrder(workArr, 1) as DraftWorkExperience[],
    skills: withSortOrder(skillsArr, 1) as DraftSkill[],
    certifications: withSortOrder(certsArr, 1) as DraftCertification[],
    education: withSortOrder(eduArr, 1) as DraftEducation[],
    additional_information: withSortOrder(addlArr, 1) as DraftAdditionalInformation[],
  }
}

/**
 * Extract the first JSON object from a provider text response, tolerating a
 * leading ```json fence or surrounding prose (defensive, not lenient on facts).
 */
export function extractJsonObject(text: string): unknown {
  const trimmed = text.trim().replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/, '')
  try {
    return JSON.parse(trimmed)
  } catch {
    // last resort: cut from first { to last }
    const start = trimmed.indexOf('{')
    const end = trimmed.lastIndexOf('}')
    if (start !== -1 && end > start) {
      try {
        return JSON.parse(trimmed.slice(start, end + 1))
      } catch {
        return null
      }
    }
    return null
  }
}