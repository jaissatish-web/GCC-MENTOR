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

Vercel builds a **preview for every pushed commit**, including this branch. Whether preview
deployments use the **production** Supabase project **could not be verified** from the
developer machine (no Vercel CLI; per-deployment URLs are behind Vercel's login). Recent
preview builds for other branches **failed**, while the same commit's production build
succeeded — consistent with previews lacking some settings, but not proof of anything.

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
