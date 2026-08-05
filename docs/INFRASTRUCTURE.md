# INFRASTRUCTURE.md — Technical Setup

Source: Founding Brief §5e, plus CTO decisions recorded below.

---

## 1. Where everything runs

| Concern | Service | Rationale |
|---|---|---|
| Database | **Supabase** (PostgreSQL) | Managed, RLS built in |
| Authentication | **Supabase Auth** | Provider-agnostic — see §4 |
| File storage | **Supabase Storage** | Uploaded resumes, profile photos, generated documents |
| Application hosting | **Hostinger VPS** | Runs the Next.js app **only** |

**The VPS does not handle the database, authentication, or file storage.** This is deliberate: the Career Profile contains the platform's highest-sensitivity data (passport validity, visa status, phone numbers). A managed service with security best practices built in is the responsible choice for a non-technical solo founder — not merely the easier one.

---

## 2. AI provider — CTO decision

**Decision: Anthropic Claude (`claude-sonnet-5`) for all MVP generation and extraction, accessed through a thin provider interface.**

Rationale:

1. **Grounding adherence is the product's core requirement.** The single most important behaviour in this system is a model that reliably refuses to invent facts when instructed. That is an instruction-following property, and it is the property MVP quality depends on most.
2. **Switching cost is near zero right now.** The two AI paths that matter for MVP are extraction (being rewritten to a new schema) and optimization (being rewritten from scratch for grounding, personas, and levels). Nothing is being preserved.
3. **Parked routes are unaffected.** The five existing OpenAI routes (ATS, cover letter, interview prep, apply, mock interview) are Phase 2–4 scope. They keep their OpenAI code untouched until their phase arrives.

**Implementation requirement:** all model calls go through `lib/ai/provider.ts`, which exposes a single `generate()` function. No API route imports an SDK directly. This makes a future provider change a one-file edit and allows quality A/B testing on real resumes.

**Model selection:**

| Task | Model | Why |
|---|---|---|
| Resume extraction | `claude-sonnet-5` | Long messy documents, structured JSON output |
| Resume optimization | `claude-sonnet-5` | Grounding adherence, quality of rewriting |

Do not use a larger model for MVP. Cost per full run (extraction + optimization) must stay well under ₹30 against a ₹499 price point.

---

## 3. Document generation

### PDF

The resume renders as **HTML using the same template and CSS as the on-screen preview**, then converts to PDF via a headless-browser renderer (Puppeteer).

This guarantees the downloaded file matches exactly what the user saw — including correct behaviour for the field-visibility toggles — rather than risking a second, inconsistent rendering path.

**Existing implementation:** `app/api/resumes/[id]/pdf/route.ts` renders `app/resume-render/[id]/page.tsx`. This approach is correct and carries forward. The route must be repointed at the new package data model.

**Known operational risk:** headless Chromium is memory-hungry and will fail under concurrency on an undersized VPS. Before launch, either size the VPS accordingly or move rendering to a dedicated service. This is a launch-readiness item, not a code defect — tracked as `TASK-030`.

### DOCX

A separate library maps the **same structured resume data** into a Word document. Same underlying data, different output format — **not a second content pipeline**. The DOCX writer must read from the identical package data the PDF renderer reads.

---

## 4. Authentication — deliberately unresolved

The login method is an **open decision** (see `docs/RULES.md` §5). The founder is weighing Mobile+OTP (best audience fit, real per-SMS cost) against Google login and Email+OTP (cheaper, no SMS gateway).

**Build requirement:** the auth layer must not be hard-locked to one provider. Do not default to Mobile+OTP simply because it was an earlier recommendation.

Current state: Supabase SSR with email/password and an OAuth callback handler. JWTs are stored in HTTP-only cookies, never `localStorage`. Route protection lives in `middleware.ts` — **do not modify without an explicit ticket**.

---

## 5. Environment variables

| Variable | Purpose | Status |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL | SET |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Public anon key | SET |
| `SUPABASE_SERVICE_ROLE_KEY` | Server-side operations — **never expose to client** | SET |
| `DATABASE_URL` | Direct Postgres connection | SET |
| `ANTHROPIC_API_KEY` | Claude — all MVP AI features | **EMPTY — required before any AI work** |
| `OPENAI_API_KEY` | Legacy, parked routes only | EMPTY — not needed for MVP |
| `RAZORPAY_KEY_ID` / `RAZORPAY_KEY_SECRET` | Payments | **EMPTY — blocked on KYC** |
| `NEXT_PUBLIC_APP_URL` | Used by the PDF renderer | SET |

`.env.local` is gitignored and must never be committed. Maintain `.env.example` with empty values for onboarding.

---

## 6. Database migrations

- Every schema change ships as a numbered file in `supabase/migrations/` (e.g. `001_career_profiles.sql`).
- **Never edit `supabase/schema.sql` against a live database.** It is a historical record and is already known to be stale.
- Migrations are additive by default. Dropping or renaming an existing column requires an explicit ticket.
- Every new table has: UUID primary key, `user_id` foreign key where user-owned, `created_at` with timezone, and **RLS enabled with a policy restricting access to the owning user**.

**RLS is not optional.** A new table shipped without RLS is a data breach waiting to happen, and profile tables are the most sensitive in the product.

---

## 7. Inherited debt — resolved by starting in a clean repository

This repository is a **fresh start**. The earlier HireCircuit build remains at
`D:\Hire Circuit` as a permanent, untouched archive.

That decision eliminated a whole class of problems that would otherwise have
needed tickets:

| Problem in the old build | Resolution |
|---|---|
| `app/api/run-migration/route.ts` — unauthenticated migration endpoint, a live security hole | Not copied. Gone |
| Three stray root-level `supabase-migration-*.sql` files | Not copied. New migrations start at `010_` in `supabase/migrations/` |
| `supabase/schema.sql` describing an outdated `resume_data JSONB` structure | Not copied |
| `CONTEXT.md` — four months stale, factually wrong | Not copied. `docs/` is the only source of truth |
| Six out-of-scope feature areas (ATS, cover letter, interview prep, mock interview, apply, market insights) | Left in the archive. Harvest in their phase |
| Four-tier subscription pricing | Left in the archive |
| Old dark-mode `Inter` design system | Left in the archive. New tokens in `tailwind.config.ts` |

**What was deliberately carried over** — see `reference/README.md` for the rules
on using it, and `docs/AUDIT.md` for why each piece was judged worth keeping:

- `lib/supabase/client.ts`, `lib/supabase/server.ts` — proven, unchanged
- `middleware.ts`, `app/auth/callback/route.ts` — proven, unchanged
- `reference/` — read-only donor code for PDF, parsing and template patterns
- `design-reference/` — the approved mockups as hand-written HTML

### Current environment note

`node_modules` was installed with `PUPPETEER_SKIP_DOWNLOAD=true` because the
Chromium download is ~150MB and is not needed until TASK-030. Before that
ticket, run:

```bash
npx puppeteer browsers install chrome
```
