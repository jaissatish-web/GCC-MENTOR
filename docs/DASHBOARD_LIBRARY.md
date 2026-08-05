# DASHBOARD_LIBRARY.md — Packages, Library, and Dashboard

Source: Founding Brief §5a.

---

## 1. Why the Library exists

Gulf hiring and shortlisting is slow and unpredictable. A candidate applies to many roles with different job descriptions, and by the time a recruiter calls back weeks later, they have lost track of what they sent — or how to defend it in an interview.

**The Library solves this: every optimization run becomes a saved "package" the user can return to when that call finally comes.**

This is the retention engine. It is also what makes the second purchase cheap: the profile is already saved, so re-optimizing for a new target requires no re-upload.

---

## 2. Table: `packages`

One row per job target the user has optimized for.

| Field | Type | Required | Notes |
|---|---|---|---|
| `id` | uuid PK | yes | |
| `user_id` | uuid FK | yes | RLS key |
| `profile_id` | uuid FK → career_profiles | yes | source of truth for fixed fields |
| `target_job_title` | text | yes | |
| `target_country` | enum | yes | |
| `target_company` | text | no | |
| `target_industry` | text | yes | persona selection |
| `job_description` | text | no | the JD it was optimized against, if provided |
| `optimization_level` | enum | yes | `easy` / `moderate` / `high` |
| `status` | enum | yes | see §3 |
| `optimized_content` | jsonb | yes | see §4 — **structured, not a flat file** |
| `skills_order` | jsonb | yes | relevance-ordered skill IDs for this target |
| `field_visibility_snapshot` | jsonb | yes | visibility state at generation time |
| `is_paid` | boolean | yes | default false — gates download |
| `payment_id` | text | no | Razorpay reference |
| `generation_count` | integer | yes | default 1, incremented on re-optimize |
| `created_at` / `updated_at` | timestamptz | yes | |

### Phase 2–4 slots — create now, leave null

**These columns exist from day one so nothing needs rework later. They stay empty until their phase actually generates them.**

| Field | Type | Phase |
|---|---|---|
| `ats_score_card` | jsonb, nullable | 2 |
| `cover_letters` | jsonb[], nullable | 3 |
| `interview_questions` | jsonb, nullable | 4 |
| `mock_interview_runs` | jsonb[], nullable | 4 |

> Do **not** build UI for these. Do **not** populate them. They are schema reservations only.

---

## 3. Status field

Simple user-editable dropdown, shipped in MVP:

`applied` → `shortlisted` → `interview` → `visa_processing` → `offer`

Default on creation: `applied`. The user can change it at any time to any value — it is not a locked progression.

---

## 4. `optimized_content` structure

Stored as **structured data, not a flat file**, and re-rendered into the resume template whenever the user opens it — so it stays editable and downloadable at any time.

```json
{
  "summary": {
    "generated": "…",
    "user_edited": "…or null if untouched",
    "source_profile_summary": "…the before, for the diff"
  },
  "experience_blocks": [
    {
      "profile_experience_id": "uuid",
      "was_optimized": true,
      "generated_bullets": ["…"],
      "user_edited_bullets": null,
      "source_bullets": ["…the before, for the diff"],
      "claims": ["400+ field instruments", "3 gas trains", "client QA/QC witness"]
    }
  ]
}
```

### Three requirements this structure exists to satisfy

1. **The before/after diff ("Wow #1") needs the before.** `source_*` fields preserve it. The previous build overwrote the original in place, which made the diff impossible — that must not recur.
2. **User edits are preserved separately from AI output.** `user_edited_*` is what renders when present. Regeneration replaces `generated_*` and clears `user_edited_*`.
3. **`claims` is the Phase 4 hook.** Extracting claims at generation time — while the model already has full context — costs almost nothing now and is expensive to retrofit. Populate it in MVP even though nothing reads it yet.

**Fixed fields are never copied into `optimized_content`.** Name, contact, employers, titles, dates, education and certifications are read from `career_profiles` at render time. That is what makes "edit once, reflects everywhere" true.

---

## 5. Re-optimizing an existing package

Changing the optimization level or block selection on an existing package **re-runs generation and overwrites that package's current AI-generated content**. `generation_count` increments.

**Full version history (keeping every past optimization, Git-like) is deferred to Phase 2.** The reasoning: version history only becomes valuable once a user has accumulated multiple runs on the same package over time — which by definition means they are already a retained user. There is no value in building it before Phase 1 proves anyone stays retained long enough to need it.

**A genuinely new job target creates a new package instead of overwriting an existing one.**

The UI must state plainly that re-optimizing replaces the current text, and that keeping past versions arrives in Phase 2.

---

## 6. Reuse detection — MVP-lite

Before creating a new package, check whether the user's Library already has a package with a **similar target job title**.

- If yes → prompt a simple choice: *"Create a new package, or use your existing [Job Title] package?"*
- If no → proceed straight to creating a new package.

**This is manual, rule-based title comparison for MVP** — normalise case and whitespace, strip punctuation, compare tokens. Do not over-engineer it.

**Automated %-match ranking against a new job description is a Phase 2 feature**, built once the ATS Score engine exists — same underlying similarity-scoring logic, no need to build it twice. **Do not attempt automated matching in MVP.**

---

## 7. Multiple generations per package *(schema now, features later)*

Once Phase 3 and 4 features exist, cover letter, Q&A and mock interview generation are each **repeatable on demand within the same resume package** — a user may generate several cover letters or run several mock interviews off one optimized resume, since they are applying to related-but-different postings.

Each generation is a trackable and billable action tied to the package, not a one-time inclusion.

**MVP obligation:** log generation count per package from day one. Cheap to add now, expensive to retrofit. The features themselves are not built until their phases.

---

## 8. Dashboard

Once the Career Profile is complete — or partially complete; **never gated**, per `docs/CAREER_PROFILE.md` §5 — the user lands on a dashboard from which they can start any available service and access their Library.

### Layout

**Service grid first, Library second.**

| Service | MVP state |
|---|---|
| Optimize resume for a job | **Live.** Primary CTA, navy, ₹499 |
| ATS score check | Locked, badged "Free · Phase 2" |
| Cover letter | Locked, badged "Phase 3" |
| Interview Q&A study | Locked, badged "Phase 4" |
| Mock interview | Locked, badged "Phase 4" |

**Locked services stay visible but are clearly dated.** They preview the roadmap without pretending to work. Clicking one shows a short "coming in Phase N" note — never a broken screen, never a dead link.

### Library display

- **Mobile:** cards. Target title, company · country · date, status pill, artifact chips (`CV ✓` / `ATS —` / `Letter —` / `Q&A —`), actions: Open / Re-optimize / Delete.
- **Desktop:** table. Columns: Target, Country, Level, Status (inline dropdown), Open. Same data model, denser presentation.

Artifact chips read directly from the Phase 2–4 slots in §2 — present when populated, dashed when null. This is how the roadmap stays visible inside the product.

### Other dashboard elements

- Readiness ring in the header, tappable through to the profile editor.
- Career Profile entry point showing items remaining.
- Repeat-purchase prompt after a download: *"Applying somewhere else? Your profile is saved — next one takes a minute."*
- The user can delete a package at any time. Deletion is a hard delete.

---

## 9. Personalization touches

Small to build, disproportionately impactful on how "made for me" the product feels:

- Address the user by name.
- Reference the actual target company by name in UI copy — *"Optimizing for QatarEnergy…"*, *"Optimize for QatarEnergy"* as the CTA label.
- Show the target in the dashboard subheader — *"Targeting Commissioning Engineer · Qatar"*.
