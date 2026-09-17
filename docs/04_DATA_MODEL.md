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

**Match** — `match_report` (migration 056, jsonb, server-written only): the
deterministic before/after match score, the requirements and quote-verified evidence
it used, blocks that kept original wording, and gaps. NULL on packages built before
the optimizer engine. See [`17_OPTIMIZER_ENGINE.md`](17_OPTIMIZER_ENGINE.md) §7.

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
- `skills_order` — relevance-ordered skill IDs for this target only. **Nullable since
  migration 044** (2026-08-18) — same "not yet generated" convention as
  `optimized_content`. It was NOT NULL from the original table until then, which is a bug
  fix, not a design choice: the two-phase create-then-generate flow (migration 033)
  always wrote `null` here at creation, and the database rejected every one of those
  inserts until migration 044 caught up. See
  [`15_DECISION_LOG.md`](15_DECISION_LOG.md).
- `field_visibility_snapshot` — visibility state at generation time

**Presentation** — deliberately separate from content, so restyling can never
rewrite what a resume says: `template_id`, `template_version`, `style_overrides`,
`name`

**Commercial:** `is_paid`, `payment_id`, `tier` (`free` | `paid`; null = created
before the free tier existed and belongs to the paid flow)

**Other:** `status` — the APPLICATION stage: saved / applied / shortlisted / interview /
visa processing / offer / rejected / withdrawn. `saved`, `rejected` and `withdrawn` were
added by migration 053 (audit M07); new rows start as `saved` (migration 055) because a
prepared CV is not a submitted application, and existing rows keep their stage.
Preparation progress (CV, letter, Q&A, mock) is shown separately from it. Also
`generation_count`, `ats_score_card`, `job_match_result`, `cover_letters[]`,
`interview_questions`, `mock_interview_runs[]`, the tracker fields (`job_url`,
`application_deadline`, `interview_date`, `application_notes`) and `service_events[]`
(migration 048).

**Who may write what (migration 050, audit H02).** The owner's own session may read and
delete their jobs and UPDATE only `name`, `status`, `template_id`, `template_version`,
`style_overrides` and the four tracker fields. Every other column — payment state,
generated content, the frozen document, letters, Q&A, interview runs, service history —
is written only through `lib/packages/serverWrites.ts`. The array columns are changed
by single-row functions (§5), never read-modified-and-written from JavaScript.

**Lists never load the documents (migration 055, audit M08).** Screens that list jobs
use `list_package_summaries()` through `GET /api/packages?view=summary`: identity,
stage, tracker fields and flags/counts — never the CV, letters or transcripts. A
screen loads one full row, for the job it opens, from `GET /api/packages/[id]`.

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
| `job_analyses` | Cached optimizer analysis per (user, input hash): requirements, quote-verified evidence, profile fingerprint. Holds short profile quotes, so it is personal data. Purged 30 days after creation (migration 056) | Service role only |
| `service_packages`, `service_package_items` | Bundle definitions | Service role only |
| `user_service_credits` | Credits a user holds | Service role only |
| `optimization_credits` | Admin-granted free optimizations, as a permanent ledger | Service role only |
| `rate_limits`, `anonymous_rate_limits` | Daily counters — plus, in `rate_limits`, one **monthly** counter: `profile_recreation`, keyed on the first of the month (2026-09-11, `lib/recreateLimit.ts`) | `rate_limits`: owner may **read** only, the service role writes (migration 049). `anonymous_rate_limits`: service role |
| `rate_limit_reservations` | One row per model call in flight; counts toward the limit until consumed, released or expired (migration 049) | Service role only |
| `ai_service_controls` | Per quota action: available/paused, per-user and all-users daily allowances, requests at once, the paused message (migration 049) | Service role only — edited from `/admin/services` |
| `ai_service_control_changes` | Every change to the above, before and after | Insert + read, service role; append-only |
| `ai_service_daily_stats` | Per action per day: allowed, saved, failed, refused (limit / busy / cap). **Counts only, no user id** | Service role read; written only inside the enforcing functions |
| `maintenance_runs` | Each retention clean-up: when, trigger, counts or error (migration 054) | Service role only |
| `pending_profile_drafts` | One CV reading per user, kept until they decide what to do with it (migration 047, 2026-09-11). Written by the parse routes before they answer; deleted once resolved. **Holds CV data** — cascades with the account, and "Delete my data" removes it explicitly because the profile's cascade does not reach it | Owner only |
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
| `reserve_rate_limit`, `consume_rate_limit_reservation`, `release_rate_limit_reservation` (049) | Checking a count and then incrementing it after the model call let concurrent requests all pass. Reservations are taken under a per-user lock and counted while pending |
| `package_append_event`, `package_append_cover_letter`, `package_set_interview_questions`, `package_append_mock_run`, `package_record_mock_answer`, `package_complete_mock_run` (050) | Whole-array rewrites lost a letter, answer or event when two tabs saved together. Each changes one row under a lock; an answered question and a completed report are never overwritten. `SECURITY INVOKER`, service role only |
| `save_career_profile` (051) | The profile save was six separate calls and could half-commit. One transaction, run as the signed-in user (RLS applies), with a stale-version check |
| `list_package_summaries` (055) | Paged, server-searched job list. `SECURITY INVOKER` as the signed-in user |
| `purge_expired_operational_data` (054) | Deletes expired anonymous sessions and stale operational rows; returns counts only |

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

**Bucket-level limits since migration 052** (audit M02): 5 MiB, JPEG/PNG/WebP only —
the same rule `lib/storage/profilePhoto.ts` applies, now also enforced by Storage for a
direct upload that never passes through the route. Owner-folder policies unchanged.
