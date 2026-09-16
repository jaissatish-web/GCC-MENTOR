# SAAS RELEASE CHECKLIST — shipping the 2026-09-15 hardening safely

**For branch `claude/saas-production-hardening`.** Nothing on that branch has been
deployed, merged or applied to the production database. This file is the order to do
it in, the settings it needs (names only — never values), how to check each step, how
to back out, and what must be true before calling production ready.

What was changed and why: [`SAAS_REMEDIATION_2026-09-15.md`](SAAS_REMEDIATION_2026-09-15.md).

---

## 1. Before anything: a restore point

- [ ] Confirm the Supabase project has a **current backup** (Dashboard → Database →
      Backups). Its schedule and retention depend on the plan — **unverified from this
      repository**. If there is no recent one, take a manual export through the pooler
      connection before step 3.
- [ ] Decide who presses "rollback" (§6) and keep this page open during the release.

## 2. Settings (names only)

**Vercel → Project → Settings → Environment Variables**

| Name | Status | Notes |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `NEXT_PUBLIC_APP_URL` | Existing | Unchanged |
| `CRON_SECRET` | **New, required** | A long random value used only for this. Without it the nightly clean-up refuses to run — expired anonymous CVs are then still not deleted |
| `RATE_LIMIT_JOB_DESCRIPTIONS_PER_DAY`, `RATE_LIMIT_COVER_LETTERS_PER_DAY`, `RATE_LIMIT_INTERVIEW_QA_PER_DAY`, `RATE_LIMIT_MOCK_INTERVIEWS_PER_DAY`, `RATE_LIMIT_MOCK_ANSWERS_PER_DAY`, `RATE_LIMIT_MOCK_REPORTS_PER_DAY` | New, optional | Override the code defaults. `/admin/services` overrides both without a deploy — prefer it |
| `AI_STALL_TIMEOUT_MS` | Existing, optional | Longest one AI attempt may wait |

**Check whether Preview deployments share the production database.** If preview
variables point at the production Supabase project, a preview test IS a production test.
Use a separate staging project for §5 (recommended).

**Supabase → Authentication → URL Configuration**

- [ ] **Site URL** is the production domain.
- [ ] **Redirect URLs** include `https://<production domain>/auth/callback` (and the
      preview/staging domains you test on). Password-reset and confirmation links fail
      without it.
- [ ] Email templates for **confirm signup** and **reset password** are enabled and send
      from a working sender (delivery is **unverified**).
- [ ] **Password policy** (founder decision §7): minimum length and leaked-password
      protection. The app's own minimum is 6 today, matching sign-up.

## 2b. Staging setup — the safe place to test (founder, click by click)

The goal: the Preview deployment for `claude/saas-production-hardening` talks to a
**separate Supabase staging project**, so the full product can be exercised without a
single production row being read or written. Nothing below copies production data. No
production setting is touched at any point.

Do the steps in order. Where a value is needed, this document names the **field** and
never the value — copy values straight from one dashboard to the other and paste nowhere
else.

### Step 1 — Create the staging Supabase project

1. Open the Supabase dashboard and choose the **same organisation** as the live project.
2. Click **New project**.
3. **Name:** something unmistakable, e.g. `gcc-mentor-staging`. The name is the only thing
   standing between you and pasting a migration into the wrong SQL editor later.
4. **Database password:** generate a new one. **Never reuse the production password.**
   Save it in your password manager.
5. **Region:** the same region as production, so timing behaves similarly.
6. **Plan:** the free tier is enough for this.
7. Click **Create new project** and wait for provisioning to finish (a few minutes).

Do **not** use any "clone", "branch", "restore from backup" or "import data" option on the
production project. Staging starts empty, by design — that is what makes it safe.

### Step 2 — Apply the database schema, in bootstrap order

Supabase Dashboard → **SQL Editor** → **New query**, for the **staging** project. Confirm
the project name in the top-left before every paste.

A brand-new database needs **all 46 migration files**, not just 049–055 — staging has no
schema at all until you apply them. Apply them in the **fresh-database bootstrap order**,
which is numeric order with one swap: **020 runs before 013**, because `013_operations.sql`
alters the `profiles` table that `020_profiles_base.sql` creates. (The live project grew
the other way round, which is why the folder cannot simply be renumbered.)

```
010, 011, 012, 020, 013, 014, 015, 016, 017, 018, 019,
021, 022, 023, 024, 025, 026, 027, 028, 029, 030,
031, 032, 033, 034, 035, 036, 037, 038, 039, 040,
041, 042, 043, 044, 045, 046, 047, 048,
049, 050, 051, 052, 053, 054, 055
```

For each file, in that order: open it from `supabase/migrations/`, copy the whole file,
paste into a **new** SQL Editor query, click **Run**, and confirm "Success". Then move to
the next. One file per run — do not paste several together.

Two rules that bite if ignored:

- **053 must be run and finished before 055.** Postgres will not let 055 use the new
  `saved` stage value in the same transaction that adds it.
- If any file errors, **stop**. Do not skip it and carry on; the next files assume it
  worked. The full per-migration checklist is in `supabase/migrations/README.md`.

This order is not a guess: `scripts/verify-db-security.mjs` proves on every `npm test` run
that plain numeric order fails and this order succeeds, against a throwaway Postgres.

### Step 3 — What staging needs, and what it does not

| Thing | Needed for staging? | Why |
|---|---|---|
| All historical migrations (010–048) | **Yes** | A new database has no tables at all. 049–055 alone would fail immediately |
| Migrations 049–055 | **Yes** | The branch's code calls functions that only exist after these |
| Storage bucket configuration | **No manual step** | Migration 032 creates the private `profile-photos` bucket and 052 sets its 5 MB limit and image-only types. Applying the migrations is the whole job |
| Authentication URL configuration | **Yes** | Step 4. Confirmation and password-reset links fail without it |
| Vercel Preview environment variables | **Yes** | Step 5. This is what points Preview at staging instead of nothing |
| `CRON_SECRET` | **Optional** | Vercel Cron only fires on **production** deployments, so the nightly purge never runs on a preview by itself. Set it only if you want to trigger the retention route by hand |
| Test-only AI provider configuration | **Optional, and not an environment variable** | Provider, model and API key live in the staging **database**, set at `/admin/ai-provider`. Staging starts with none, so every AI feature refuses cleanly and spends nothing until you decide otherwise (Step 8) |

### Step 4 — Authentication URLs (staging project)

Supabase Dashboard → **staging** project → **Authentication** → **URL Configuration**.

1. **Site URL:** paste the branch preview URL from Vercel (Step 5 tells you where to find
   it). Use the **branch** URL, not a one-off deployment URL.
2. **Redirect URLs** → **Add URL**, three entries:
   - the branch preview URL followed by `/auth/callback`
   - the branch preview URL followed by `/**`
   - a wildcard for per-deployment URLs, because Vercel gives every single deployment its
     own hostname and the confirmation email uses whichever host you signed up on:
     `https://gcc-mentor-*.vercel.app/**`
3. **Authentication → Emails:** confirm **Confirm signup** and **Reset password** are
   enabled. On the free tier Supabase's built-in mailer is rate-limited to a few messages
   an hour — enough for this testing, and a reason to use real inboxes you control rather
   than dozens of throwaways.
4. Leave production's URL configuration alone. It is a different project; you cannot reach
   it from here by accident as long as the project name in the corner says staging.

### Step 5 — Point the Vercel **Preview** environment at staging

Vercel Dashboard → project **gcc-mentor** → **Settings** → **Environment Variables**.

For each name below: **Add New**, type the name, paste the value from the **staging**
Supabase project, and — this is the part that matters — tick **Preview** only. Leave
**Production** and **Development** unticked. A variable added to Production would change
the live site.

| Name | Where the value comes from (staging project) |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Project Settings → API → Project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Project Settings → API → `anon` `public` key |
| `SUPABASE_SERVICE_ROLE_KEY` | Project Settings → API → `service_role` key. Server-only, never shared |
| `NEXT_PUBLIC_APP_URL` | The branch preview URL from Vercel |
| `DATABASE_URL` | Project Settings → Database → Connection string. Only needed if you run tooling against staging |
| `CRON_SECRET` | Optional — any long random value you generate yourself |

To find the branch preview URL: Vercel → **Deployments** → the newest deployment for
`claude/saas-production-hardening` → the **Domains** list shows both a per-deployment URL
and a longer `-git-claude-saas-production-hardening-` one. The `-git-` one is the branch
URL; it stays the same for every future push to this branch, which is why Step 4 uses it.

### Step 6 — Redeploy the preview so it picks the variables up

Environment variables are read at build time. A preview built before Step 5 still has none.

Vercel → **Deployments** → newest deployment for the branch → the **···** menu →
**Redeploy** → leave "Use existing build cache" **unticked** → **Redeploy**. Wait for
**Ready**.

### Step 7 — Make yourself an admin on staging (once)

Admin screens are gated on a flag no user can set for themselves, so the first admin is
made by hand.

1. Open the preview URL, **Sign up**, confirm the email, and sign in.
2. Supabase → **staging** project → **Table Editor** → `profiles` table.
3. Find your row, set **`is_admin`** to `true`, save.
4. Reload the preview. `/admin` now opens.

### Step 8 — AI: leave it off until you decide otherwise

Staging has no AI provider configured, and that is the safe default. Every AI feature will
refuse with a clear "nothing was used" style message and **no money is spent**. Do the
whole of the non-AI walk-through in §5a first, in that state.

Nothing in this document configures a key or spends anything. When you want the AI
features tested, see §2c.

## 2c. Testing the AI features at the smallest possible cost

**Nothing here happens without the founder's explicit go-ahead.** These are the settings to
put in place first, so a test run cannot become an expensive run.

1. **Set the allowances to near-zero before adding a key.** Preview → `/admin/services`.
   Set every per-day allowance to the smallest number that still lets you see the feature
   work — `1` or `2`. `/admin/services` overrides the code defaults without a redeploy, so
   this takes seconds and needs no deployment.
2. **Then** add the provider at `/admin/ai-provider`, on **staging only**: provider, model
   and API key are stored in the staging database, so production's configuration is
   untouched and unreadable from here.
3. **Use the cheapest small model** the provider offers for the first pass. The point is to
   prove the path works — request, guard, counter, refusal — not to judge output quality.
   Switch to the real model only for a final look, with allowances still at 1–2.
4. **Prefer a provider key with its own hard spend cap**, set at the provider's dashboard.
   That cap, not this app, is the real backstop.
5. **Watch the counters.** `/admin` shows usage and estimated cost per service. Check it
   after the first call, not after the tenth.
6. **Pause when done.** `/admin/services` → pause each service. Staging then refuses
   cleanly again and cannot spend while unattended.
7. **Order of testing, cheapest first:** one CV import, then one optimisation, then one
   cover letter, then one Q&A set, then one short mock interview with two questions and a
   finish. That is roughly the minimum that exercises every AI path once.

## 3. Database migrations — order, one run each

Apply with the checklist in `supabase/migrations/README.md`.

**These migrations are NOT all purely additive.** No user row's content is rewritten, but
permissions and one configuration row do change:

- **049** revokes INSERT/UPDATE/DELETE on `rate_limits` from `authenticated` and **replaces**
  the owner `ALL` policy with a read-only policy (dropping the old one).
- **050** revokes INSERT/UPDATE on `packages` from `authenticated` and re-grants UPDATE on
  nine named columns only. This is the change that stops the currently deployed code saving
  generated work.
- **052** **UPDATEs an existing row** in `storage.buckets` (the `profile-photos` size and
  MIME limits) and alters two function definitions.
- **055** changes the `packages.status` column **default** to `saved`.
- 051, 053 and 054 only add objects or enum values.

No migration edits, deletes or rewrites a user's own data. **The order below keeps the old
code working until the new code is live**, which is why 050 is last:

| Step | File | Safe with the OLD code running? |
|---|---|---|
| 1 | `049_quota_integrity_and_service_controls.sql` | Yes — the old code writes counters through the service role, which still may |
| 2 | `051_atomic_profile_save.sql` | Yes — only adds a function |
| 3 | `052_storage_limits_and_function_hardening.sql` | Yes |
| 4 | `053_package_saved_rejected_withdrawn_stages.sql` | Yes — only adds stage values |
| 5 | `054_retention_purge.sql` | Yes — only adds a table and a function |
| 6 | `055_package_summaries_and_saved_default.sql` | Mostly — new jobs start as "saved", which the old screens do not label. Cosmetic, until the new code is live |
| 7 | `050_package_integrity_and_atomic_writes.sql` | **No.** It removes the user session's right to write generated content. The old code saves CVs, letters, Q&A and interview answers through the user session, so **those saves fail until the new code is live.** Apply it, then promote the new deployment immediately (§4) |

After each, confirm in the SQL editor (catalogue, not "it ran without error"):

```sql
-- 049: users may read, not write, their counters; the new objects exist
select grantee, privilege_type from information_schema.role_table_grants
 where table_schema='public' and table_name='rate_limits' and grantee in ('anon','authenticated');
select action, service_key, enabled from public.ai_service_controls order by action;
select routine_name, grantee from information_schema.routine_privileges
 where routine_schema='public' and routine_name in ('reserve_rate_limit','consume_rate_limit_reservation','release_rate_limit_reservation');
-- expected: authenticated has SELECT only on rate_limits; 9 control rows; functions granted to service_role only

-- 050: authenticated may update only the editable columns of packages
select column_name from information_schema.column_privileges
 where table_schema='public' and table_name='packages' and grantee='authenticated' and privilege_type='UPDATE'
 order by column_name;
-- expected: application_deadline, application_notes, interview_date, job_url, name, status, style_overrides, template_id, template_version

-- 051 / 054 / 055: functions exist
select proname from pg_proc where proname in ('save_career_profile','purge_expired_operational_data','list_package_summaries');

-- 052: bucket limits and pinned search paths
select file_size_limit, allowed_mime_types from storage.buckets where id = 'profile-photos';
select proname, proconfig from pg_proc where proname in ('set_updated_at','handle_new_user_profile');

-- 053 / 055: stages and default
select enumlabel from pg_enum e join pg_type t on t.oid = e.enumtypid where t.typname = 'package_status_enum' order by enumsortorder;
select column_default from information_schema.columns where table_name = 'packages' and column_name = 'status';
```

The same rules are asserted on every run of `npm run test:db` (113 checks) against a
**local Postgres-compatible test harness with Supabase behaviour partially stubbed**
(PGlite; roles, grants, `auth.uid()`, `auth.users`, the sign-up trigger and a `storage`
schema recreated in SQL). That is evidence the **SQL** is right. It is **not** evidence
about Supabase Auth, PostgREST, the Storage API or production RLS, it does not use real
parallel connections, and it says nothing about whether anything has been applied to
production. Supabase Storage has **never** enforced migration 052's limits in a test —
only the stored values were checked.

## 4. Deploy order

1. [ ] CI green on the release commit (typecheck, lint, audit, `npm test`, build).
2. [ ] Preview deployment built from the release commit and checked (§5) against a
       **staging** database that already has 049–055.
3. [ ] Production database: steps 1–6 of §3, in order, each verified.
4. [ ] Production database: step 7 (050), verified.
5. [ ] **Immediately** merge/promote the release to production.
6. [ ] Watch for 15 minutes: `/admin/services` counters (succeeded rising, failed not
       spiking), Vercel runtime logs for `serviceGuard:` or `package_*` errors.
7. [ ] Set `CRON_SECRET`, then run the clean-up once from `/admin/services` and confirm a
       successful row in its history; the next nightly run should appear the day after.

## 5a. What can be tested with no AI provider at all

Everything in this list runs against staging with **no key configured and nothing spent**.
Do all of it before §2c is even considered.

**Fully testable without AI**

- Sign up, email confirmation, sign in, sign out, session persistence across a reload.
- Password recovery end to end, including reusing a spent link and the "expired" state.
- Post-login redirect: open a deep link signed out, sign in, land back on it.
- Profile: manual create and edit, every section, the two-tab conflict message, photo
  upload (including a file over 5 MB and a non-image, both of which the bucket rejects).
- Library: paging, search, stage filter, stage changes across saved / applied / rejected /
  withdrawn, delete.
- PDF and DOCX download, and every template, **provided a package exists** — see below.
- Admin: service pause and resume, allowance changes, the audit list of who changed what,
  and the refusal messages each produces.
- Cross-user access protection: two accounts, each trying the other's package, profile and
  document URLs by id.
- Every mobile width, and every loading, empty, error and retry state.

**Needs AI, and therefore §2c**

- CV import and parsing (`/api/parse/upload`, `/api/parse/text`) — both are AI-backed.
- The anonymous ATS scan.
- Resume optimisation, which is what creates a package in the normal flow.
- Cover letter, interview Q&A, mock interview start / answer / finish and its report.

**The one dependency worth knowing about.** In the normal flow a package only exists after
an optimisation, so PDF, DOCX, package editing and the Library stages appear to need AI
first. Two ways round it:

- Spend one optimisation in §2c, then test the whole downstream surface for free; or
- Insert one package row directly in the staging **Table Editor** and test exports against
  it at zero cost. This exercises rendering and export but not the app's own write path,
  so do it as well as, not instead of, the single real optimisation.

## 5. Preview validation — a signed-in walk-through

On a preview deployment with a **staging** database (never create test accounts in
production). Phone first — 360, 375 and 390 px wide — then tablet and desktop.

- [ ] Sign up → confirm email → land on onboarding; sign out; open `/interview-qa?package=<id>`
      signed out → sign in → you land back on that page **with the job selected**.
- [ ] Forgot password → email → set new password → dashboard. Reuse the link → "expired" state.
- [ ] Upload a PDF CV (text), a DOCX, a scanned PDF (expect the scanned message), a >4 MB
      PDF (expect the size message, instantly), an old `.doc` (expect the .docx message).
- [ ] Profile: save; open a second tab, save there, then save the first → the conflict
      message, and nothing overwritten.
- [ ] Add a job with a long title and company → build the CV → it shows as
      "Saved · not applied" → download PDF (Chromium works on Vercel).
- [ ] Cover letter: uses the saved CV's wording; two letters in two tabs both survive.
- [ ] Q&A: generates; every answer's numbers appear in the CV/profile/advert.
- [ ] Mock interview: start; answer; double-tap Submit → one answer, no second charge;
      answer in two tabs → the second is told it was already answered; switch job
      mid-draft → the draft stays with its own question; finish early → report says what
      was skipped; finish again → same report.
- [ ] Library: search a job that is not on the first page → found; stage filter; load
      more; change stage; delete.
- [ ] `/admin/services`: set one allowance to 0 → that service answers with the limit
      message; pause a service → its message shows; resume → works; each change listed.
- [ ] Failed provider: on staging, set a test service's model to an invalid one → a clear
      "nothing was used" message; the counter shows a failure, the user's allowance is intact.
- [ ] Refresh and back-button on every service page; offline (DevTools) on the mock page →
      the typed answer is still there.

## 6. Rollback

- **Code:** Vercel → Deployments → promote the previous production deployment.
- **But the previous code cannot save generated work once 050 is applied.** If you roll
  the code back, also run this — it restores the pre-050 write privileges (and with them
  the audited H02 weakness, so roll forward again as soon as possible):

  ```sql
  GRANT INSERT, UPDATE ON public.packages TO authenticated;
  ```
- **049** can stay: the previous code works with it. Restoring the old owner-write policy
  would reopen H01; do not, unless a specific failure requires it.
- **051–055** are additive and compatible with the previous code; leave them. (053's stage
  values cannot be removed from Postgres; they are harmless to the old code.) If the old
  screens must not show "saved" for new jobs, run
  `ALTER TABLE public.packages ALTER COLUMN status SET DEFAULT 'applied';`.
- **Data:** no migration changes a user's own rows. 052 does update one configuration row
  (the `profile-photos` bucket limits); to undo it, set `file_size_limit` and
  `allowed_mime_types` back to NULL. A restore is needed only for an unrelated accident.

## 6b. Preview deployments — unresolved risk

Vercel builds a **preview for every pushed commit**, including this branch.

**Resolved 2026-09-16.** The preview builds again. The build log for `b681148` showed the
failure was `Error: supabaseUrl is required.` while prerendering `/` — the footer asks the
database for its published legal links on every page, and the Supabase client constructor
throws when the Preview environment has no Supabase settings. Fixed in `6b60e4b`: those
reads now take the same "no content" path they already take when a query fails. Preview
and CI are both green.

That tells us something about isolation, though it is not a full answer: a Preview
environment carrying the **production** Supabase settings would never have failed that
way, so Preview was **not** pointing at production at the time of that build. It may hold
no Supabase settings at all. Whether that is still true after anyone edits the Vercel
project is not something this document can promise — check §2b before testing.

Until a separate **staging** Supabase project is configured for the Preview environment:

- Assume a preview **may** reach production data. Do not exercise sign-up, profile, job,
  AI or admin features on a preview.
- A preview built from this branch against an **un-migrated** database fails safely for the
  new paths: every AI service refuses with "nothing was used" when it cannot read its
  controls, the profile save writes nothing when its function is missing, and the job list
  errors rather than writing. Features that already existed (stage changes, deletes, photo
  upload, sign-up) would still write to whatever database the preview points at — which is
  why the preview must not be used until staging exists.
- The preview is **not expected to be functional** until that staging project is
  configured and 049–055 are applied to it.

## 7. Founder decisions — with a recommendation for each

| Decision | Why it matters | Recommendation |
|---|---|---|
| Privacy policy, terms (H06) | Real CVs, dates of birth, visa details go to AI providers | **Launch blocker.** Write both from `DATA_INVENTORY_AND_RETENTION.md` §5; a lawyer reads them; publish from `/admin/content` |
| Refund policy | Only needed with payments | Write it before the first paid sale |
| Retention periods and account closure (M11) | "Delete my data" keeps the login and the spend log is deleted with a user | Offer account closure; keep the spend log with the user link removed |
| AI provider data handling | CV text leaves your systems | Prefer providers/routes that do not retain prompts; name them in the policy |
| Password policy (M03) | Six characters is weak | Minimum 8 and turn on leaked-password protection |
| Free allowances and a spend budget (M14) | Defaults are abuse ceilings, not a plan | Keep the defaults for launch; set an all-users cap on Q&A and mock start once a week of counters shows normal use |
| Prices shown while services are open (M10) | The menu shows ₹499/₹999 on services that are currently free | Either label them "free during early access" or re-apply the locks — not both unsaid |
| Legacy anonymous `/ats-scan` POST | Stores CVs for 7 days and spends money for signed-out callers | Retire it (the scorecard replaced it); until then it can be paused |

## 8. Go / no-go

**Go only when every line is true:**

- [ ] CI green on the exact commit being released; `npm audit --omit=dev` shows no high or
      critical issue.
- [ ] Migrations 049–055 applied to production and each verified with §3's queries.
- [ ] `CRON_SECRET` set; one successful clean-up recorded in `/admin/services`.
- [ ] Supabase redirect URL configured; a real password reset completed on production by
      the founder with their own account.
- [ ] The §5 walk-through passed on a preview with a staging database, on a phone.
- [ ] Privacy policy and terms written, reviewed and published.
- [ ] A current backup confirmed, and the rollback owner named.

Until then the honest status is: **the code is hardened and tested locally; production is
unchanged.**
