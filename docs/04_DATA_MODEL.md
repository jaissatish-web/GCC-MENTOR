# DATA MODEL — every table, and the state of the live database

**Schema changes only ever happen through a numbered migration in
`supabase/migrations/`.** Never edit schema directly against the live database.

**Migrations 010 through 041 are applied and independently confirmed against the
live database** — by querying the catalogue for the column, constraint, index and
grants, not by the migration running without error. See
[`05_SECURITY.md`](05_SECURITY.md) §5 for why that distinction is not pedantry.

Row-level security is enabled on **all 12 public tables**, with no exceptions.

---

## 1. The shape in one picture

```
auth.users
   │
   ├── profiles              (is_admin flag only)
   │
   ├── career_profiles       ONE per user — the single source of truth
   │      ├── profile_work_experience
   │      ├── profile_skills
   │      ├── profile_certifications
   │      ├── profile_education
   │      └── profile_additional_information
   │
   └── packages              MANY per user — one per resume
```

**One profile, many resumes.** Everything the product generates comes from the one
profile. A resume is never re-derived from a fresh upload. That single decision is
what makes new output types (cover letter, interview content) cheap to add — they
need no new data layer, only a different persona.

---

## 2. `career_profiles` — the user's career, once

One row per user, enforced by a unique constraint on `user_id`.

**Status and target:** `currently_in_gulf`, `current_employer`,
`current_project`, `target_job_title`, `target_industry`, `target_country`,
`target_company`

**Identity and contact:** `full_name`, `photo_url`, `nationality`,
`date_of_birth`, `phone`, `whatsapp`, `email`, `linkedin_url`,
`current_location`

**Gulf-specific readiness:** `passport_type` (ECR / Non-ECR — **type only, never a
number**), `passport_validity_date`, `visa_status`, `visa_transferable`,
`notice_period`

**Driving licence:** `has_driving_license`, `driving_license_country`,
`driving_license_category`, `driving_license_validity_date`

**Derived and control:** `professional_summary`, `field_visibility` (which fields
appear on a CV), `readiness_category`, `readiness_score`

`target_country` is **nullable and informational**. It was once required and
labelled as setting CV format conventions — it never did. Gulf format conventions
are country-agnostic, and the field was never rendered on a resume, so requiring it
was misleading.

### Child tables

All five cascade-delete with the profile and are ordered by `sort_order`.

| Table | Columns |
|---|---|
| `profile_work_experience` | `company`, `role`, `start_date`, `end_date` (null = current), `location`, `description`, `highlights[]`, `gcc_country` |
| `profile_skills` | `name` |
| `profile_certifications` | `name`, `issuer`, `issue_date`, `expiry_date` |
| `profile_education` | `degree`, `institution`, `field_of_study`, `start_year`, `end_year` |
| `profile_additional_information` | `label`, `value` — the catch-all |

**`sort_order` on skills and certifications is the user's canonical order and is
never mutated by AI.** Relevance reordering for one target job is stored on the
package, not on the profile.

**Dates are stored to day precision but resumes only give months.** Extraction
correctly returns `YYYY-MM` rather than inventing a day, so a helper pads for
storage and never displays the padded day. It returns null rather than guessing on
unparseable input.

**`gcc_country` is the known weak point.** It is written by exactly one thing — a
dropdown in the profile editor — and extraction never derives it. Consequences in
[`09_SCORING.md`](09_SCORING.md) §5.

---

## 3. `packages` — one row per resume

The most-evolved table in the schema. Grouped by what each part is for.

**Target** — what this resume aims at: `target_job_title` (required),
`target_country`, `target_company`, `target_industry` (nullable since
migration 043 — see below), `job_description`, `optimization_level`,
`selected_blocks`

**`target_industry` is nullable and optional at the `/optimize/target` UI
level too** (2026-08-18, same standing as `target_country` above): it drives
which reviewer persona writes the resume (`lib/ai/personas.ts`), a real
effect, but the prompt pipeline already falls back to a generic Gulf-recruiter
persona when it is unset, so nothing forces the choice. `target_country` and
`target_company` remain in the schema (existing rows, the admin listing, the
Career Profile's own defaults) but are no longer collected on
`/optimize/target` — new packages carry them as `null`.

**Content** — what the user gets:
- `optimized_content` — **the AI-written text. Nullable.** Null means nothing has
  been generated, and that fact is the product's access gate. See
  [`10_PLANS_AND_PAYMENT.md`](10_PLANS_AND_PAYMENT.md).
- `document_snapshot` — **the frozen delivered document.** The rendered lines
  exactly as delivered, with visibility already applied.
- `skills_order` — relevance-ordered skill IDs for this target only
- `field_visibility_snapshot` — visibility state at generation time

**Presentation** — deliberately separate from content, so restyling can never
rewrite what a resume says: `template_id`, `template_version`, `style_overrides`,
`name`

**Commercial:** `is_paid`, `payment_id`, `tier` (`free` | `paid`; null = created
before the free tier existed and belongs to the paid flow)

**Other:** `status` (applied / shortlisted / interview / visa processing / offer),
`generation_count`, `ats_score_card`, `job_match_result`, `cover_letters[]`, and
two reserved-and-unused slots for planned services

### Why `document_snapshot` exists — the most important thing in this table

A package originally froze only the AI-written **text**. Every fixed field — name,
contact details, education, certifications, photo — was read **live** from the
profile at render time.

**So editing your Career Profile silently rewrote resumes you had already paid
for.** Re-downloading last week's CV could produce a different document. The
snapshot closes that: what was delivered stays delivered.

Two rules follow, and both are load-bearing:
- **Both renderers prefer the snapshot** when one exists.
- **Editing text re-applies only the summary and bullets onto the frozen
  document.** It never rebuilds, because rebuilding would read the live profile and
  reintroduce the exact bug the snapshot exists to prevent.

### The one free-resume quota, enforced in the database

A partial unique index, `packages_one_free_per_user`, allows exactly one
`tier = 'free'` row per user. **In the database, not only in the route that
writes it** — a quota enforced only in application code is a quota that a second
code path forgets.

`tier` is a stored column rather than an inference because a free resume and an
abandoned checkout are otherwise the same shape: since payment precedes
generation, clicking Optimize inserts an unpaid row with no content — byte-for-byte
how a free resume looks. Counting unpaid rows for the quota would make a user who
changed their mind lose their free CV.

**`tier` drives the quota and the labelling. It is explicitly not the access
gate.**

---

## 4. Operational tables

| Table | Holds | Who may read/write |
|---|---|---|
| `profiles` | `is_admin` only | User may **select** their own row. No insert/update/delete policy at all — otherwise a user could grant themselves admin |
| `pricing` | Prices by key | Public read. Founder edits in Supabase directly |
| `plan_entitlements` | One row per feature: what free includes | Public read (the free tier is public information). **No write policy** — writes go through the service role from the admin panel |
| `ai_provider_config` | Provider, model, key, fallback, per feature | Service role only |
| `prompt_versions` | Versioned, admin-editable prompt bodies. **One active per key, enforced by a partial unique index.** The grounding block and output schema are *not* here — they are injected in code | Service role only |
| `prompt_templates` | Superseded by `prompt_versions`. Left in place, should gain no new keys | Service role only |
| `promo_codes` | Codes, and the package they unlock | Service role only |
| `service_packages`, `service_package_items` | Bundle definitions | Service role only |
| `user_service_credits` | Credits a user holds | Service role only |
| `optimization_credits` | Admin-granted free optimizations, as a permanent ledger | Service role only |
| `rate_limits`, `anonymous_rate_limits` | Daily counters | Owner / service role |
| `ai_usage_log` | Every model call, for cost tracking | Service role |
| `pii_access_log` | Every admin view of a user's profile | Insert + read, service role |
| `anonymous_analysis_sessions` | A free scan's result, 7-day expiry, single-use | Service role, keyed by a signed cookie |

**A table with no write policy is tighter than an owner-only policy, not looser.**
Several tables above deliberately have none: a user who could write
`promo_codes`, `user_service_credits` or `optimization_credits` could mint
themselves the paid product.

---

## 5. Atomic database functions

Some operations cannot be a read-then-write in JavaScript without a race. These
run as single Postgres statements:

| Function | Why it must be atomic |
|---|---|
| `increment_rate_limit`, `increment_anonymous_rate_limit` | Two concurrent requests would both read the old count |
| `consume_optimization_credit` | Uses `FOR UPDATE SKIP LOCKED`. The realistic trigger is mundane — an impatient user double-clicking Optimize would otherwise spend one credit twice |
| `consume_service_credit`, `grant_package_credits` | Same class |
| `redeem_promo_code`, `redeem_package_promo_code` | A code must not be redeemable twice concurrently |

**Every one of these is `SECURITY DEFINER`, and that is exactly why each needs an
explicit `REVOKE EXECUTE` from the client roles.** This project has already been
burned by assuming otherwise — see [`05_SECURITY.md`](05_SECURITY.md) §5.

Credits are **stamped on consumption, never deleted**, so a spent credit remains a
permanent audit record: who granted it, why, when, and which resume it paid for.

---

## 6. Storage

One bucket, `profile-photos`, **private**. Photos are served through signed URLs
minted server-side. Verified with an unauthenticated probe: writes denied, signed
URL minting denied, public URL not served.
