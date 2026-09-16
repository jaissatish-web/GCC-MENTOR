# SAAS REMEDIATION — 2026-09-15

What was done about every item in
[`FULL_SAAS_AUDIT_2026-09-15.md`](FULL_SAAS_AUDIT_2026-09-15.md) (kept unchanged as the
baseline), with the evidence for each claim and what is still not proven.

- **Branch:** `claude/saas-production-hardening`, from `origin/main` at `fa84383`, plus the
  audit report (cherry-picked from `astra/full-saas-audit` @ `019eac3`).
- **Not done, by instruction:** no merge, no deployment, no production migration, no
  production account or AI traffic, no payment work.

## What the status words mean here

| Status | Meaning |
|---|---|
| **Implemented locally** | The code or SQL is on the branch |
| **Verified locally** | Proven by typecheck, lint, production build, the repository's scripts, or the **local Postgres-compatible database harness** (`scripts/verify-db-security.mjs`, Supabase partially stubbed) — never against production, staging, CI or a browser |
| **Verified in staging** | Not used: no staging environment was available. Nothing below claims it |
| **Awaiting database migration** | Needs a migration from 049–055 applied to production ([`SAAS_RELEASE_CHECKLIST.md`](SAAS_RELEASE_CHECKLIST.md) §3) |
| **Awaiting founder decision** | Code or mechanism ready; the policy or value is the founder's |
| **Not verified** | Written but not exercised — typically a signed-in browser flow, a live AI provider, email delivery, or Supabase Storage enforcement |

**The database suite is a local Postgres-compatible test harness (PGlite) with Supabase
behaviour partially stubbed** — roles, default grants, `auth.uid()`, `auth.users`, the
sign-up trigger and a `storage` schema recreated in SQL — running every migration in order.
It proves what the **SQL** does. It is **not** Supabase Auth, PostgREST, the Storage API or
production RLS, and it runs on a **single connection**, so nothing here rests on real
parallel connections. Details under "Checks run".

---

## Item by item

| ID | Finding confirmed? | What changed | Where | Evidence | Status |
|---|---|---|---|---|---|
| **C01** | Yes — `npm audit`: 1 critical (next), 3 high (`@xmldom/xmldom`, nested `nanoid`, nested `postcss`) | Next.js 14.2.35 → **15.5.25** (the patched security line; every critical/high advisory is fixed from 15.5.24), React 18 → **19.1.1**, `eslint-config-next` 15.5.25; `npm audit fix` (non-force) for xmldom, js-yaml, nanoid; npm `overrides` pins Next's own nested `postcss` to 8.5.28. Next 15 async-request codemod (20 files); `serverExternalPackages`/`outputFileTracingIncludes` moved out of `experimental` (left there, Next 15 silently ignores them and the PDF route would ship without Chromium); one ref type and one `<a>`→`<Link>` for React 19/lint | `package.json`, `package-lock.json`, `next.config.mjs`, codemod files | `npm audit` and `npm audit --omit=dev`: **0 vulnerabilities**. Build passes. The PDF route's trace lists all four Chromium archives. **Golden resume check:** React 19 prepends `<link rel="preload" as="image">` for images; the same template rendered under React 18.3.1 and 19.1.1 was **byte-identical once that leading hint is stripped** (compared directly, both versions installed side by side), so `verify-resume.ts` strips only that hint — golden file untouched | Verified locally. Not verified: runtime on Vercel |
| **H01** | Yes — owner `ALL` policy + default grants on `rate_limits` | Owner may read only; reservations table; `reserve`/`consume`/`release` functions (per-user advisory lock, pending counts toward the limit, one-at-a-time cap, all-users cap, expiry); all quota writes server-side | `049_…sql`, `lib/rateLimit.ts`, `lib/ai/serviceGuard.ts` | DB suite: owner cannot update count / override / insert / delete; cannot call the functions; pending reservations block overshoot; consume idempotent; release refunds; expired reservation stops blocking; global cap; identity keying | Verified locally · **Awaiting database migration** |
| **H02** | Yes — owner `ALL` + grants on `is_paid`, `payment_id`, `optimized_content`, `profile_id` | Column grants: owner updates only name/stage/template/style/tracker; INSERT and every server field go through `lib/packages/serverWrites.ts` (service role, user id from the session, matched in the write). Routes moved: optimize (insert + generate), content edits, status, tracker, PDF event | `050_…sql`, `lib/packages/serverWrites.ts`, `app/api/optimize`, `app/api/packages/[id]/*` | DB suite: owner can rename, change stage, edit tracker; **cannot** write any of 10 server columns, insert a package, reach another user's row, or call the writers; anon cannot read | Verified locally · **Awaiting database migration** |
| **H03** | Yes — cover letter, Q&A, mock start/answer/finish had no quota | One gate before every model call (`serviceGuard`: pause → allowance → concurrency → reservation; fails closed). Applied to CV reading (upload + paste), advert structuring, CV build, cover letter, Q&A, mock start/answer/report; the legacy anonymous scan honours the pause. New defaults are **abuse ceilings**, env- and admin-overridable | `lib/ai/serviceGuard.ts`, `lib/rateLimit.ts`, 10 route files | DB suite (reservation semantics, counters); typecheck + build. **Not verified:** each route end to end against a live provider | Implemented locally · **Awaiting migration** · **Awaiting founder decision** (allowances) |
| **H04** | Yes — whole-array JSON rewrites | Six single-row functions (event, letter, Q&A set, mock run, mock answer, mock completion) under row locks; routes use them; events de-duplicated (PDF re-download) | `050_…sql`, `lib/packages/serverWrites.ts`, routes | DB suite: letters and events written after a stale read both survive; dedupe; wrong owner refused. **Not verified:** a true two-connection race (single-connection test DB) | Verified locally · **Awaiting migration** |
| **H05** | Yes — `${origin}${next}` concatenation | `lib/safeRedirect.ts`: same-origin paths under app sections only, query kept; used by callback, login, signup, the magic-link/recovery hash handler | `lib/safeRedirect.ts`, `app/auth/callback`, `app/login`, `app/signup`, `components/auth/*` | `verify-safe-redirect.ts`: 35 cases — deep links kept; absolute, protocol-relative, backslash, user-info, dot-host, tab/newline smuggling, dot-segment, loop and over-long inputs refused | Verified locally. Not verified: a real emailed link |
| **H06** | Yes — legal pages unpublished | **No legal text written** (inventing terms is forbidden). Publishing mechanism already exists (`/admin/content`). Added the data inventory and a what-the-policy-must-cover checklist | `DATA_INVENTORY_AND_RETENTION.md` | — | **Awaiting founder decision** (launch blocker) |
| **H07** | Yes — expiry only hid anonymous CVs | `purge_expired_operational_data()` (counts only) + `maintenance_runs`; nightly Vercel Cron route (fails closed without `CRON_SECRET`, constant-time check); "Run clean-up now" in `/admin/services` | `054_…sql`, `lib/admin/retention.ts`, `app/api/cron/retention`, `vercel.json` | DB suite: expired deleted, live kept, counts only, users cannot run it or read the log. **No production row deleted** | Verified locally · **Awaiting migration + `CRON_SECRET`** |
| **H08** | Yes — six separate writes | `save_career_profile()` — one transaction, runs as the user (RLS applies), stale-version check; route delegates; editor sends the version it loaded and keeps it current | `051_…sql`, `app/api/profile/route.ts`, `app/profile/page.tsx` | DB suite: create; upsert-by-id keeps ids; unsent collection untouched; stale version → conflict, nothing written; a failing child rolls back parent **and** earlier children; another user's child id refused; anon refused | Verified locally · **Awaiting migration**. Not verified: the editor's conflict message in a browser |
| **H09** | Yes — 60–120s routes, 280s provider budget | `runAiTask` takes `deadlineAt` (passed to every attempt and tier; repair only if it can finish); each AI route has a deadline 20–30s inside `maxDuration`; cover letter 60s cap → 120s with a 100s deadline, and **mock interview start 120s → 180s** with a 150s deadline. Both ceilings were raised on the basis that the platform allows up to 300s; **the account's actual plan limit was not inspected** | `lib/ai/runTask.ts`, 5 route files | `verify-deadlines.ts` (fake provider): deadline reaches the provider; no late repair; stalled provider returns control within the deadline; every route's deadline ≥15s inside its ceiling | Verified locally (mocked provider) |
| **M01** | Yes — 013 needs 020 | No renumbering (live history must match). Bootstrap order documented and encoded; fresh-DB proof on every test run | `supabase/migrations/README.md`, `scripts/db/supabaseStub.mjs` | DB suite: plain numeric order **fails**; bootstrap order applies every file | Verified locally. Not verified: a Supabase staging restore |
| **M02** | Yes — bucket limits null | 5 MiB, JPEG/PNG/WebP on the bucket, matching the route; owner-folder policies unchanged | `052_…sql` | DB suite: limits stored; cross-folder upload refused; own-folder allowed. **Not verified:** Storage API enforcement (not reproducible offline) | Verified locally (SQL) · **Awaiting migration** |
| **M03** | Yes — no recovery | `/forgot-password` (no enumeration, rate-limit message), `/auth/update-password` (expired-link state), recovery links routed by the hash handler, "Forgot password?" and expired-link notice on login | `app/forgot-password/*`, `app/auth/update-password`, `components/auth/AuthHashHandler.tsx`, `app/login/page.tsx` | Typecheck, lint, build. **Not verified:** email delivery, Supabase redirect configuration | Implemented locally · **Awaiting founder decision** (password policy, leaked-password protection) |
| **M04** | Yes — letter ignored the saved CV; child reads failed silently | Saved CV (frozen document) is the letter's primary source; Q&A and mock use the same rule; one loader that errors on any incomplete read (also the CV build) | `lib/ai/buildCoverLetterPrompt.ts`, `lib/packages/profileLoader.ts`, 4 routes | Typecheck, build. **Not verified:** letter quality from a live model | Implemented locally |
| **M05** | Yes | Answers ≤ 3,000 characters (server + box); only an in-progress run's unanswered question; repeats answered from what is saved (409, no model call); a finished report is final; early finish allowed and explained; report told what was skipped | mock routes, `050_…sql`, `app/mock-interview/page.tsx`, `lib/mockInterviewLimits.ts` | DB suite: no-answer finish refused; answer saved once; second answer refused; completed run immutable; answers refused after completion | Verified locally · **Awaiting migration** |
| **M06** | Yes | Drafts keyed by package + run + question, kept in sessionStorage; the picker is locked while a request runs; replies applied to the job they belong to; the shared picker ignores a late detail response | `app/mock-interview/page.tsx`, `lib/usePackagePicker.ts` | Typecheck, build. **Not verified in a browser** | Implemented locally |
| **M07** | Yes — "applied" at creation | Stages `saved` (first; shown "Saved · not applied"), `rejected` ("Not selected"), `withdrawn`; new jobs start as saved; stage shown separately from preparation progress; existing "applied" rows untouched | `053`, `055`, `types/package.ts`, `lib/utils.ts`, stage/pill components, Library, journey copy | DB suite: stages exist and order; owner can set them; new rows default to saved | Verified locally · **Awaiting migration** |
| **M08** | Yes — `select('*')` for every job | `list_package_summaries()` (flags and counts, SQL search incl. country, stage filter, keyset paging, index); `GET /api/packages?view=summary`; every screen moved to summaries + one full job; Library paged with "Load more"; legacy full list capped at 100 for one release | `055_…sql`, `app/api/packages/route.ts`, `lib/packageSummary.ts`, `lib/usePackagePicker.ts`, 7 screens | DB suite: own jobs only; flags right; no document columns; paging without overlap; search finds older jobs; `%` literal; stage and CV filters | Verified locally · **Awaiting migration**. Not verified in a browser |
| **M09** | Yes | Middleware keeps path + query; login, signup (and the confirmation email) return there through the safe rule | `middleware.ts`, auth pages/actions | Safe-redirect suite | Verified locally (logic). Not verified live |
| **M10** | Yes | Carousel no longer says interview practice is planned; template count from the registry everywhere (orbit, landing, templates page); interview illustration shows the four text-report dimensions (no "speaking clarity"/"confidence"); reports described as preparation feedback, not predictions; "up to 25" answers; FAQ lists Q&A and mock | `app/page.tsx`, landing components, templates page, mock page | Build; public landing check below | Implemented locally · **Awaiting founder decision** on price wording while services are open |
| **M11** | Yes | Full inventory (every store, reader, retention, deletion path; unverified items marked); purge (H07); "Delete my data" behaviour stated truthfully | `DATA_INVENTORY_AND_RETENTION.md` | — | **Awaiting founder decision** (retention periods, account closure, provider data handling) |
| **M12** | Yes — 5 MB PDF vs 4.5 MB platform limit, buffered first | 4 MB PDF / 2 MB DOCX, checked from headers and File size before buffering; `.doc` refused clearly; signature check; separate scanned / password-protected / damaged messages; extracted text ≤ 30,000; client mirrors the limits; anonymous helper checks size before buffering | `app/api/parse/upload`, `components/profile/ResumeImport.tsx`, `lib/resumeTextFromUpload.ts` | Typecheck, build. **Not verified** with synthetic oversized/encrypted/scanned files through the running route | Implemented locally |
| **M13** | Yes | `npm run typecheck`, `npm test` (every deterministic script + DB suite), `npm run check`; a CI workflow (audit, typecheck, lint, tests, and a build with placeholder public settings — no production secrets) that runs on every push and pull request | `package.json`, `scripts/run-checks.mjs`, `.github/workflows/ci.yml` | Local runs below. **The CI workflow has never run:** it is added by this branch and first executes when the branch is pushed, so no CI result exists for any commit here | Scripts verified locally · CI **not yet run** |
| **M14** | Yes | `/admin/services`: pause/resume per service with a message; per-action allowance, all-users cap, requests at once; today and 7-day allowed/saved/failed/refused counts (counted inside the enforcing functions, no user ids); retention history + run now; change history with before/after. Enforced server-side on every call | `049_…sql`, `lib/admin/serviceControls.ts`, `app/admin/services`, `app/admin/actions.ts` | DB suite: counters exact for allowed/saved/failed/refused-limit/busy/cap; no user id column; users cannot read counters or history; history append-only | Verified locally (data layer) · **Awaiting migration** · **Awaiting founder decision** (values). Not verified in a browser |
| **L01** | Partly — the embedded previews were already `aria-hidden`, so their headings are hidden from assistive technology | Nothing changed in the templates: they also produce the delivered PDF and the 32,768-case golden check; changing heading tags there for a landing-page concern is not worth that risk | — | — | Accepted with reason; revisit with the template port (WORK_QUEUE W6) |
| **L02** | Yes | `search_path` pinned on both flagged functions; EXECUTE revoked from client roles on the SECURITY DEFINER trigger function | `052_…sql` | DB suite: both functions pinned; trigger function not callable; sign-up trigger still creates the profile row | Verified locally · **Awaiting migration** |
| **L03** | Yes | Part-docs brought to the current state: security, data model, AI pipeline, architecture, admin, user journeys, open items, decision log, migrations README; `.env.example` names | `docs/*`, `.env.example` | — | Done |
| **X01** *(added)* | Found in review, not in the audit: Q&A and mock "enforced" grounding checked only JSON shape | Numbers in Q&A answers and mock ideal points must come from profile / saved CV / advert / the user's own dates; >5 unsourced Q&A answers → repair; survivors dropped. Mock "better answer" may use only the user's words, gaps as `[placeholders]` | `lib/ai/answerGrounding.ts`, Q&A and mock routes and prompts | `verify-answer-grounding.ts` (16 checks). **Not verified** against a live model | Verified locally (rules) |

---

## Checks run

Every command below ran on the **uncommitted working tree** described above —
`8b1b301` plus these changes, content fingerprint `dd42b542b01e` — on
2026-09-15 between 15:51 and 15:58 UTC, on one Windows developer machine.

**Nothing here was run against staging, production, CI, a browser, or a live
Supabase project.** At the time of writing the branch had never been pushed, so
the CI workflow had never run.

| Check | Command | Result | What it shows — and does not |
|---|---|---|---|
| Production dependencies | `npm audit --omit=dev` | **PASS** — 0 vulnerabilities | The C01 gate. Advisory data as published on 2026-09-15 |
| All dependencies | `npm audit` | **PASS** — 0 vulnerabilities | Includes build-only packages |
| Types | `npm run typecheck` (`tsc --noEmit`) | **PASS** | No type errors. Types are not behaviour |
| Lint | `npm run lint` | **PASS** — no warnings or errors | `next lint`, deprecated in Next 16 |
| Deterministic suite | `npm test` | **PASS** — 13/13 scripts | The scripts below, in one run |
| · Golden resume | in `npm test` (109s) | **PASS** — all 32,768 visibility permutations | The golden file is **unchanged**; React 19's leading image-preload hint is stripped before hashing (see the normalizer risk below) |
| · DOCX smoke | in `npm test` | **PASS** | A valid DOCX is produced; its artifact is deleted afterwards |
| · Safe redirect | in `npm test` | **PASS** — 35 assertions | Pure logic, no browser and no real login |
| · Deadlines | in `npm test` | **PASS** — 15 assertions | A **fake** provider. No live AI call |
| · Answer grounding | in `npm test` | **PASS** — 16 assertions | The rule, not a live model's output |
| · 7 pre-existing scripts | in `npm test` | **PASS** | Unchanged checks from before this work |
| Database suite | `npm run test:db` | **PASS** — 113/113 | See the harness note below |
| Production build | `npm run build` | **PASS** — compiled in 86s, 54/54 pages generated | A real local production build with local settings present. Not a deployment, and not proof of Vercel runtime behaviour |
| PDF Chromium trace | read of `.next/…/pdf/route.js.nft.json` | **PASS** — 4 Chromium archives traced | The upgrade still ships Chromium to the PDF function. Not proof it launches on Vercel |
| Whitespace | `git diff --check`, plus a scan of new files | **PASS** — 0 issues | — |

**The database harness, stated precisely.** `scripts/verify-db-security.mjs` runs
a local Postgres-compatible engine (PGlite) with **Supabase behaviour partially
stubbed**: roles (`anon`, `authenticated`, `service_role`), default grants,
`auth.uid()`, an `auth.users` table, a sign-up trigger and a `storage` schema are
recreated in SQL by `scripts/db/supabaseStub.mjs`. It proves what the **SQL**
does — grants, RLS policies, function privileges and transaction behaviour.

It does **not** prove, and must not be quoted as proving, the behaviour of
Supabase Auth (GoTrue), PostgREST, the Storage API, Realtime, or production RLS
as actually deployed. It is also a **single connection**: every concurrency
claim rests on row locks and advisory locks read in the SQL, **not** on racing
real parallel connections, which was not tested.

## What these checks cannot show

- No signed-in journey was exercised anywhere — not in a browser, not by script.
- No mobile or accessibility pass was run (no browser testing at all in this work).
- No live AI provider call was made; every AI test uses a fake provider.
- No email was sent or received; no Supabase redirect configuration was exercised.
- Supabase Storage never enforced the new bucket limits: migration 052's values
  were asserted **in the test database only**.
- No migration has been applied to any real database.
- The CI workflow has never run (see M13).

## Provisional defaults — none of these is an approved policy

Every value below was chosen by me to make the code safe and testable, **not** by the
founder. They are deliberately conservative and, where marked, changeable without a
deploy. **Treat each as a proposal awaiting approval**; none is GCC Mentor policy.

| Default I chose | Value on this branch | How to change it | Why this value |
|---|---|---|---|
| Daily AI allowance per user | job adverts 30, cover letters 20, Q&A 10, mock start 10, mock answers 150, mock reports 10; CV reads 5 and optimizations 20 (both unchanged) | `/admin/services` per action, no deploy; or the `RATE_LIMIT_*` setting names | Abuse ceilings far above plausible honest use — **not** a commercial free plan |
| All-users daily cap | **none set** (NULL) | `/admin/services` | A spend budget is the founder's; the mechanism is built and left unset |
| Requests at once, per user per service | 1 | `/admin/services` (1–5) | Stops two tabs spending twice for one result |
| Reservation expiry | 120–330s, per route, each longer than that route's own ceiling | Code (`ttlSeconds` per route) | A killed function must not cost the user a try |
| Retention — anonymous CV scans | deleted at their existing 7-day expiry | SQL (migration 054) | Only enforces the promise already made to those visitors |
| Retention — anonymous rate-limit rows | 30 days | `purge_expired_operational_data(p_rate_limit_days)` | Engineering default for salted IP hashes; no policy exists yet |
| Application stages | `saved` first, plus `rejected` and `withdrawn`; existing rows untouched | SQL + `lib/utils.ts` labels | M07 asked for saved-vs-applied; the wording is the founder's to confirm |
| Early mock finish | allowed; the report states what was skipped | Code | Refusing would trap a user mid-run, but the product rule is the founder's |
| Library page size | 20 per page (50 on the dashboard, 100 in service pickers), server maximum 100 | Code (`lib/packageSummary.ts`, `app/api/packages/route.ts`) | Small enough for a phone; nothing depends on the number |
| Mock answer length | 3,000 characters | `lib/mockInterviewLimits.ts` | About 500 spoken words; bounds the spend on one answer |
| Password minimum | **unchanged at 6** | Supabase settings and two code constants | Raising it is a founder decision (M03); not changed silently |
| Pricing wording | **unchanged** | `/admin/content` and landing copy | M10 notes ₹499/₹999 shown on services that are free today — the founder's call |
| Legacy `/ats-scan` | **kept**, now pausable and purged after expiry | `/admin/services` | Retiring it is a product decision |
| AI provider retention | **unchanged** | Provider account settings | Whether to require zero-retention routing is the founder's |

## Risks carried into review

1. **The golden-test normalizer (React 19).** `verify-resume.ts` strips a leading
   `<link rel="preload" as="image">` before hashing. Equivalence was proven for the two
   permutations rendered under both React 18.3.1 and 19.1.1; the other 32,766 were compared
   only under React 19, against the unchanged golden file. A future React change that adds
   a different hoisted element would fail the check loudly, which is the safe direction —
   but the normalizer is a tolerance the original check did not have. The golden file is
   untouched, so the comparison can always be re-proven.
2. **PDF function size on Vercel.** The PDF route's build trace contains the four
   `@sparticuz/chromium` archives (intended, about 69 MB) **and** 616 files from this
   machine's Puppeteer Chrome cache, because the full `puppeteer` devDependency is resolved
   during tracing. A Linux build may trace its equivalent cache and push the function past
   Vercel's size limit. **Not verified** — check the function size on the first preview
   build. The tracing behaviour predates this work.
3. **Number grounding is a heuristic, not a proof.** Every number in a Q&A or mock answer
   must appear in the profile, the saved CV, the job advert or the target, or be derivable
   from the user's own dates. Because **the advert is an accepted source**, "my 10 years"
   passes when the advert says "10 years required". Invented employers or certifications in
   prose are addressed by the prompt alone. This narrows invention; it does not end it.
4. **Cover letters are validated against the Career Profile, not the saved CV.** The letter
   is now written from the saved CV while the existing validator still checks the profile.
   The failure direction is safe — a refusal, never an invention — but letters may be
   refused more often when a CV's wording carries a number the profile does not.
5. **Preview deployments and the production database.** Vercel builds a preview for every
   pushed commit. Whether previews point at the production Supabase project **could not be
   verified** from this machine: no Vercel CLI, and per-deployment URLs sit behind Vercel's
   login. See "Environment note".
6. **The migration/deploy window.** The new code needs 049 and 051–055 before it runs, and
   050 stops the old code saving generated work the moment it is applied. No ordering
   removes the window entirely: follow §3–§4 of the release checklist and promote
   immediately after 050.

## Not verified — and what it would take

- **Anything signed-in in a browser** (profile, jobs, letters, Q&A, mock, Library, admin
  screens) — needs a preview deployment on a staging database; creating accounts in
  production was out of bounds.
- **Live AI generation** through the new guard, deadlines and grounding rules.
- **Emails** (confirmation, recovery) and Supabase's redirect configuration.
- **Storage API** enforcement of the bucket limits.
- **Parallel-connection races** against real Postgres (row locks argued, not raced).
- **Production state:** none of 049–055 is applied; `CRON_SECRET` is not set.
- **`scripts/e2e-smoke.mjs`** (creates an account, spends AI calls) and the PDF load test —
  not run.

## Founder decisions

In [`SAAS_RELEASE_CHECKLIST.md`](SAAS_RELEASE_CHECKLIST.md) §7, each with a recommendation:
legal text (H06), retention and account closure (M11), password policy (M03), allowances
and budget (M14), price wording while services are open (M10), and the legacy anonymous
scan.

## Environment note

During the React 18/19 comparison the C: drive reached 0 bytes free (a partial npm install
into the session's scratch folder). Everything the session created on C: was removed
(C: back to ~150 MB free); the comparison was redone on D: and its temporary folders
deleted. npm's download cache on C: may still hold packages from that install — it is the
user's shared cache and was left untouched.

**Vercel previews and the production database — unverified.** Vercel builds a preview
deployment for every pushed commit. Whether the Preview environment points at the
**production** Supabase project could not be verified from this machine: the Vercel CLI is
not installed and per-deployment URLs are behind Vercel's login. The only evidence is
indirect — recent preview builds for other branches failed while the same commit's
production build succeeded, which is consistent with previews missing some settings but
proves nothing. Treat a preview as possibly reaching production data, and do not exercise
sign-up, profile, job, AI or admin features on one until a separate staging Supabase
project is configured. Details and the safe-failure analysis are in
[`SAAS_RELEASE_CHECKLIST.md`](SAAS_RELEASE_CHECKLIST.md) §6b.

## After the first push — 2026-09-16

The branch was pushed on 2026-09-16 at `2622a5c`. Four things are now known that the
record above could not state. Everything else in this document stands unchanged.

**GitHub CI passed — the first time the workflow has ever run.** Run
[35049706030](https://github.com/jaissatish-web/GCC-MENTOR/actions/runs/35049706030)
completed successfully on `ubuntu-latest` / Node 22, with every step green: `npm ci`,
`npm audit --omit=dev --audit-level=high`, `npm run typecheck`, `npm run lint`, `npm test`
and `npm run build`. The build step ran 45 seconds and compiled. The branch therefore
builds on Linux, not only on the one Windows machine used above.

**The first Vercel preview deployment failed.** Deployment
`dpl_6CFD8KdKLgiRTSnZiUpoMALYDRSb` for `2622a5c` reported only "Deployment has failed";
the GitHub deployment status carries no further detail.

**The cause is reproduced locally but is NOT confirmed against the Vercel build log.**
The log could not be read from this machine: the Vercel CLI is not installed, no Vercel
token is present, and `npx vercel inspect --logs` starts an OAuth device-code flow that
only the founder can complete — the attempt made here expired unauthenticated.

Ruled out, each with evidence:

| Candidate | Ruled out because |
|---|---|
| Next.js 15 / React 19 | The same commit builds on Linux in CI (45 s) and on the developer machine |
| `vercel.json`, `maxDuration` | It declares one daily cron and nothing else — no `functions` block, no `maxDuration` |
| Chromium/Puppeteer tracing, function size | The PDF route traces 444 files totalling 70.5 MB, well inside Vercel's 250 MB uncompressed limit, and `bin/` is traced as intended |
| Cron configuration | A single once-daily schedule, which every plan tier allows |
| Dependency resolution | `npm install` resolves clean on React 19 — no peer conflict for Vercel's install step to hit |

What does reproduce it: hiding the environment file and running `next build` fails at the
same stage a preview would, with

```
Error occurred prerendering page "/cover-letter"
Error: supabaseUrl is required.
Export encountered an error on /cover-letter/page: /cover-letter, exiting the build.
```

- **Build stage:** static generation (prerendering), after a successful compile.
- **Route:** `/cover-letter`.
- **Class of cause:** missing configuration — `NEXT_PUBLIC_SUPABASE_URL` absent at build
  time. Not code, not Next 15, not React 19, not Chromium, not size, not cron.

None of the other three environments exercises this: CI sets placeholder Supabase values,
the developer machine has `.env.local`, and production has the real values. A Preview
environment with no Supabase variables is the only one of the four that would fail — which
matches the pattern already recorded in the Environment note, where preview builds failed
for other branches while the same commit's production build succeeded. It remains a
hypothesis until someone reads the build log.

**Preview/production Supabase isolation: unable to verify.** Unchanged from the Environment
note, and no new access was obtained. One inference, clearly labelled as such: if the
reproduction above is the real cause, then `NEXT_PUBLIC_SUPABASE_URL` is not set for
Preview at all, which would mean previews reach *no* Supabase project rather than the
production one. That is an inference from an unconfirmed cause and is not a verification.
Keep treating a preview as possibly reaching production data.

**Required founder action — nothing here was changed automatically.**

1. Read the log: `npx vercel login`, then
   `npx vercel inspect dpl_6CFD8KdKLgiRTSnZiUpoMALYDRSb --logs`.
2. If it is the missing configuration, the fix is an environment one, not a code one:
   create the separate staging Supabase project this document has asked for throughout,
   apply 049-055 to it, and set `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`,
   `SUPABASE_SERVICE_ROLE_KEY` and `NEXT_PUBLIC_APP_URL` for the **Preview** environment
   only. Production variables are not to be touched.

Making the build tolerate absent Supabase configuration was deliberately not done: it
would turn a missing-configuration failure into a preview that silently renders a
half-working app, which is the opposite of what a release gate is for.

**One source fix was made on this branch, and it is not the deployment fix.**
`lib/safeRedirect.ts` held a raw NUL and a raw DEL byte inside the regex class that
rejects control characters, which made Git classify the file as binary — the post-login
redirect validator showed as "Binary files differ" in every diff and pull-request view.
Rewritten with escape sequences; identical behaviour, `verify-safe-redirect` still passes.
It is not known to have anything to do with the failed deployment.

**Still unverified after this push.**

- The actual Vercel build-stage error, and therefore the cause above.
- Whether Preview points at the production Supabase project.
- The Chromium PDF path. No check in `npm test` launches a browser — only
  `scripts/pdf-loadtest.ts` does, and it is not in the suite. CI passing says nothing
  about whether PDF export works on Vercel's runtime.
- Everything in "Not verified" above: signed-in journeys, live AI generation, emails and
  storage limits still need a working preview on a staging database.

### The second push — same result

Pushing the two commits above (`aaf9294`) produced the same split. GitHub CI run
[35059313711](https://github.com/jaissatish-web/GCC-MENTOR/actions/runs/35059313711)
**passed**, all steps green including the production build. The Vercel preview
`dpl_BTPrwDRhLsqwfEVFrVuZnTSCxrkf` **failed**, with the same detail-free
"Deployment has failed" status as the first one.

**No later preview has passed.** Two different commits now fail identically while CI
passes on both, which is what an environment-level cause looks like and is not what a
code-level cause looks like — but it still is not the build log, and the cause above is
still formally unconfirmed. Reading that log remains the first required action.

### What the inspect attempt actually returned

The `npx vercel inspect --logs` run completed, but it returned **no build log**. Its entire
output was the CLI installing itself and then:

```
> No existing credentials found. Starting login flow...
  Visit https://vercel.com/oauth/device?user_code=...
Waiting for authentication...
Error: expired_token: Device code has expired.
```

No Vercel credentials exist on this machine: the `com.vercel.cli` folders hold only empty
`Cache/` and `Data/` directories, there is no `auth.json`, and no token is set in the
environment. GitHub holds no copy of the error either — the commit status, the deployment
status and the check-runs API all return the same detail-free "Deployment has failed"
line, and the Vercel bot left no commit comment.

**The failure stage, route and message on Vercel therefore remain unknown, and no
deployment fix has been made.** The `/cover-letter` prerender reproduction recorded above
is still the leading hypothesis and nothing more. Writing a fix against it would be
guessing at a cause nobody has read, and if the guess were wrong it would add a change to
this branch that no failure justified. The unblock is one step and needs the founder:
`npx vercel login`, complete the device prompt while it is still valid, then
`npx vercel inspect dpl_8rCUatpyFggGkcmUqtgqiJuhcezv --logs`.

### The redirect validator is now reviewable text — verified

After `5659e95`, `lib/safeRedirect.ts` is 3488 bytes containing **zero** NUL and zero DEL
bytes. Git now diffs it as text: a probe edit produces a line-level `2 2` numstat and a
normal `-`/`+` hunk, where the pre-fix blob produced "Binary files differ" and a `- -`
numstat. GitHub will therefore render both the file and its future diffs normally, which
is the whole point of the change. All **35** assertions in
`scripts/verify-safe-redirect.ts` pass, including the control-character cases — tab,
newline, NUL — that the escaped class exists to reject. Validation behaviour is identical;
only the way the two bytes are spelled in source has changed.

### Confirmed root cause, from the build log

The founder supplied the Vercel build log for `b681148`. The hypothesis recorded above was
correct in kind and slightly wrong in detail — the route named is `/`, not `/cover-letter`:

```
11:11:42.157 Error occurred prerendering page "/".
11:11:42.157 Error: supabaseUrl is required.
11:11:42.158     at e (.next/server/app/api/anonymous-session/claim/route.js:1:11199)
11:11:42.158 Export encountered an error on /page: /, exiting the build.
11:11:42.168  x Next.js build worker exited with code: 1
```

- **Stage:** static generation, after "Compiled successfully in 23.3s" — so nothing about
  the compile, the dependency install or the framework was at fault.
- **Route:** `/`, the landing page.
- **Chain:** `/` renders `AppFooter`, which is on every page. `AppFooter` calls
  `listPublishedLegal()` and `getPublishedValue()` in `lib/admin/siteContent.ts`; both call
  `createServiceRoleClient()`, which hands `process.env.NEXT_PUBLIC_SUPABASE_URL!` to
  supabase-js. Where that variable is absent the **constructor throws before any query
  runs**, and because the footer is on a statically generated page the throw lands in
  `next build` instead of at request time.
- **Not** Next.js 15, React 19, `vercel.json`, `maxDuration`, Chromium or Puppeteer
  tracing, function size, or cron configuration. Each of those was ruled out above and the
  log agrees: the install and compile steps both succeeded.

Why only the preview: the CI workflow sets placeholder Supabase values and the developer
machine has `.env.local`, so in both the constructor succeeds. Production has real values.
The Preview environment, which has none, was the only one of the four that could fail —
as recorded above before the log was available.

**The fix (`6b60e4b`).** These reads already treat unavailable content as empty:
`listSiteContent` returns `[]`, `getPublishedPage` returns `null`, `getPublishedValue`
returns its caller's fallback. The single uncovered case was being unable to construct the
client at all. The three read paths now obtain the client through a helper that returns
`null` when the configuration is absent, and each then takes the same no-content path it
already takes when a query fails. With settings present, behaviour is byte-for-byte what
it was. `saveSiteContent` is deliberately excluded: an admin write that silently did
nothing would be worse than one that fails loudly.

Verified against the preview's own condition: with the environment file removed,
`next build` previously died on `/` and now completes **54/54** static pages with exit 0.

**What this fix does not do.** It makes the preview *build*; it does not make the preview
*work*. A Preview environment with no Supabase configuration still cannot sign anyone in,
and the footer's legal links will be absent there because there is nothing to read them
from. The staging Supabase project and the Preview environment variables remain the
founder actions described above, and nothing here changed any environment variable.
