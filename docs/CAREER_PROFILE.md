# CAREER_PROFILE.md — The Core Data Layer

Source: Founding Brief §4, §4a–§4f.

**This is the most important schema in the product and the most sensitive data store.** Every task touching it is "Needs Review" by default.

---

## 1. Why this exists

Every output the platform will ever generate — optimized resume now; cover letter, interview questions, mock interview later — is generated **from this profile**, not re-derived from a fresh upload each time.

**Architectural consequence, stated plainly:** the profile is the single source of truth. A resume package never owns its own copy of the user's name, phone, employers, or dates. It references the profile. Editing a fixed field once updates every document.

> The previous build got this wrong: each resume row carried its own copy of personal and experience data. Changing a phone number meant editing every resume. This model exists specifically to fix that.

---

## 2. Table: `career_profiles`

One row per user. `user_id` is unique.

### Status

| Field | Type | Required | Notes |
|---|---|---|---|
| `id` | uuid PK | yes | |
| `user_id` | uuid FK → auth.users | yes | unique |
| `currently_in_gulf` | boolean | yes | drives readiness category |
| `current_employer` | text | no | if applicable |
| `current_project` | text | no | if applicable |

### Target

| Field | Type | Required | Notes |
|---|---|---|---|
| `target_job_title` | text | yes | |
| `target_industry` | text | yes | drives persona selection — see `docs/PROMPTS.md` |
| `target_country` | enum | **yes** | `saudi_arabia`, `uae`, `qatar`, `oman`, `kuwait`, `bahrain`, `generic_gulf`. Drives CV format conventions **and** provides the fallback target when no JD is given. |
| `target_company` | text | no | free-text, searchable, **any** employer — not a fixed list. Sharpens persona and framing when present. |

### Identity & contact — every field has a visibility toggle

| Field | Type | Required | Visibility toggle |
|---|---|---|---|
| `full_name` | text | yes | yes |
| `photo_url` | text | no | yes |
| `nationality` | text | no | yes |
| `date_of_birth` | date | no | yes |
| `passport_type` | enum `ECR`/`Non-ECR` | no | yes |
| `passport_validity_date` | date | no | yes |
| `visa_status` | text | no | yes |
| `visa_transferable` | boolean | no | yes |
| `notice_period` | text | no | yes |
| `current_location` | text | no | yes |
| `phone` | text | yes | yes |
| `whatsapp` | text | no | yes |
| `email` | text | yes | yes |
| `linkedin_url` | text | no | yes |

> **Passport number is deliberately absent and must never be added.** See `docs/RULES.md` §3. Validity date and ECR/Non-ECR type carry the hiring signal without the liability.
>
> `passport_type` (ECR / Non-ECR) is India-specific emigration clearance status. It materially affects Gulf hiring for Indian nationals. It is not in the founding brief but is retained from the existing build as genuine domain knowledge.

### Professional summary

| Field | Type | Required | Notes |
|---|---|---|---|
| `professional_summary` | text | no | The user's **own** summary — the source, never AI output |

This is the user's existing summary, captured on the upload and paste paths and
editable by hand. It is nullable: the manual and fresher paths often have none.

**It is the source side of an AI-rewritten block, exactly like work-description
bullets.** The AI's rewrite lives in `packages.optimized_content.summary.generated`
(`docs/DASHBOARD_LIBRARY.md` §4). This field is that block's
`source_profile_summary` — the "before" the diff renders against.

> **Never write generated text back into this column.** Doing so destroys the
> "before" permanently and makes the diff impossible on every later run. That is
> the exact failure the previous build shipped — see `docs/DASHBOARD_LIBRARY.md` §4.
> The profile holds what the user wrote; the package holds what the AI produced.

Two consequences worth stating explicitly:

- **No visibility toggle.** Unlike the identity and contact fields, the summary
  is core resume content, not a disclosure decision. It is not in
  `field_visibility` and does not get a toggle.
- **When it is null there is no "before."** First-run output for these users is
  new content, not a diff. The results screen must degrade to a plain
  "new content" state rather than rendering an empty left-hand side.

### Structured lists (separate tables, see §3)

`work_experience`, `skills`, `certifications`, `education`, `additional_information`

### Derived / metadata

| Field | Type | Notes |
|---|---|---|
| `readiness_category` | enum | auto-derived, see §5 — stored, recomputed on save |
| `readiness_score` | integer 0–100 | auto-derived, see §5 |
| `created_at` / `updated_at` | timestamptz | |

### Visibility storage

Store as a single JSONB column `field_visibility` on `career_profiles`:

```json
{ "photo": true, "passport_type": false, "date_of_birth": true, "additional_information": true }
```

Default: `true` for all fields except `passport_type` and `date_of_birth`, which default to `false`.

**Rule:** hiding a field never deletes the underlying data. It only controls whether the field renders on the generated resume.

---

## 3. Child tables

All are user-owned, RLS-protected, and reference `career_profiles.id`.

### `profile_work_experience`

| Field | Type | Required |
|---|---|---|
| `id` / `profile_id` | uuid | yes |
| `company` | text | yes |
| `role` | text | yes |
| `start_date` / `end_date` | date | start yes, end no (null = current) |
| `location` | text | no |
| `description` | text | no |
| `highlights` | text[] | no |
| `sort_order` | integer | yes |

### `profile_skills` / `profile_certifications`

| Field | Type | Notes |
|---|---|---|
| `name` | text | required |
| `issuer` | text | certifications only |
| `issue_date` / `expiry_date` | date | certifications only |
| `sort_order` | integer | user's canonical order — **never mutated by AI** |

> Relevance reordering for a specific target is computed at generation time and stored **on the package**, never written back here. The profile's order is the user's own.

### `profile_education`

`degree`, `institution`, `field_of_study`, `start_year`, `end_year`, `sort_order`.

### `profile_additional_information`

For resume content that does not fit the fixed schema — awards, publications, languages, volunteer work.

| Field | Type | Notes |
|---|---|---|
| `label` | text | AI suggests it; user can rename |
| `value` | text | |
| `sort_order` | integer | |

**MVP scope: one section, one show/hide toggle for the whole block.** Not individually toggleable per custom field — that is a Phase 2 upgrade if usage shows it is needed.

---

## 4. How the profile is built — three paths, one destination

| Path | Flow |
|---|---|
| 1. Upload resume (PDF/DOCX) or LinkedIn export PDF | file parse → AI extraction → review screen |
| 2. Paste resume text | AI extraction (skips file parsing) → review screen |
| 3. Fill manually from scratch | → review screen (skips extraction) |

**All three converge on the same Career Profile review/edit screen. Build one profile editor UI, not three flows.**

The review screen is a **confirm/correct** interface, not a long manual form. Extraction will be roughly 85% accurate on real-world resumes; the review screen is the safety net and must make correction fast.

**Nothing is saved until the user confirms.**

---

## 5. Readiness Score

A completeness score weighted by an **auto-derived** category. No extra onboarding question is required — the category is derived from data already present.

### Category detection (evaluate in this order, first match wins)

| Order | Category | Logic |
|---|---|---|
| 1 | `currently_in_gulf` | `currently_in_gulf = true` |
| 2 | `fresher` | 0 work experience entries, **or** under ~1 year total experience |
| 3 | `returner` | 12+ month gap between the most recent job's end date and today |
| 4 | `experienced_not_in_gulf` | has experience; not currently in Gulf; no Gulf employer in history |

### Weighting

Each category assigns weights to field groups. Weights sum to 100.

| Field group | Fresher | Experienced (not in Gulf) | Returner | Currently in Gulf |
|---|---|---|---|---|
| Contact & target | 25 | 15 | 20 | 15 |
| Education | 30 | 10 | 10 | 5 |
| Certifications | 20 | 20 | 20 | 10 |
| Skills | 20 | 10 | 20 | 10 |
| Work experience detail | 5 | 30 | 25 | 20 |
| Visa-readiness fields | 0 | 15 | 5 | 40 |

*Visa-readiness fields = visa status, transferability, notice period, passport validity.*

**Returner rule:** there is **no mandatory gap-explanation field**. Optional at most. This is sensitive territory and must not be a required input.

### Behaviour rules

- Clicking an incomplete item jumps directly to that field in the profile editor.
- **The readiness score never blocks or gates any paid feature.** A user can optimize a resume from a partially complete profile at any time. It is a nudge and a guide only.
- Presented as a progress ring, not a bare percentage — this is "Wow moment #2". Gold below 100, emerald at 100.
- Do **not** include ATS scores or resume counts in the calculation. It measures profile completeness only.

---

## 6. Fixed vs. AI-optimized — the critical distinction

| Category | Fields | Rule |
|---|---|---|
| **AI-rewritten** | Professional Summary; work-description bullets under each company | Reframed for the target, using **only** facts already present in that work experience entry |
| **Reordered, never reworded** | Skills list, certifications list | Display order prioritised by relevance. Items themselves never changed, added, or removed. Fully inside the grounding rule — nothing is added or reworded, only resequenced. |
| **Fixed — never AI-rewritten** | Name, photo, all contact details, nationality, DOB, passport type/validity, visa status, notice period, company names, job titles held, employment dates and duration, location, education entries, certifications | Changed **only** by the user, **only** in the Career Profile |

### Why the split matters

It is what makes the output feel like a human expert wrote it rather than an AI regenerating a whole document. **A real resume writer does not invent your dates or certifications — they sharpen how your real experience is framed against a specific target.**

**Implementation consequence:** any edit to a fixed field happens once in the Career Profile and automatically reflects across the resume — and later the cover letter. **The user never edits fixed fields inside the generated resume document.**

AI-*generated* text is a separate matter: once generated, the user **can** directly edit the summary and bullets before downloading. A real resume writer's draft still gets a client review pass.

---

## 7. Security requirements

- RLS enabled on `career_profiles` and every child table. Policy: `user_id = auth.uid()`.
- Never log field **values**. Log record IDs and field **names** only.
- Never expose profile data in URL parameters or query strings.
- Admin Panel reads must write to `pii_access_log` before returning data — see `docs/ADMIN.md`.
- The user must be able to hard-delete their profile and all packages from Settings.
- `SUPABASE_SERVICE_ROLE_KEY` is server-only and must never reach a client component.
