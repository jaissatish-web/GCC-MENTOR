# GCC Mentor — full SaaS audit

Date: 2026-09-15 (UTC)  
Repository: `jaissatish-web/GCC-MENTOR`  
Audited source: `fa843831e738fc1e4305e02cdd9bbf0732599190` (`main` at audit start)  
Delivery branch: `astra/full-saas-audit` — do not merge automatically.

## Production-readiness verdict

**Not ready for an unrestricted production launch.** The product has a coherent career preparation journey, substantial working implementation, and useful founder controls. However, database permissions undermine quota and package integrity, several AI services have no effective application quota, a critical dependency advisory needs triage, and privacy/retention readiness is incomplete. These outweigh the successful static and deterministic checks.

This is a source audit with read-only database verification and a signed-out live browser review, **not a completed authenticated end-to-end certification or penetration test**. Findings distinguish observed configuration, source-derived risks, and unverified deployment behavior. No cross-user data access or actual exploitation was demonstrated.

This branch adds this report only. No application code, dependency, environment variable, database policy, payment implementation, or production record was changed. Security and transactional fixes need coordinated migrations and regression checks; making isolated patches during this audit would risk breaking working behavior. Earlier journey improvements already on the audited main commit are acknowledged separately below.

## Evidence and scope

- Reviewed Next.js routes, API handlers, server actions, shared AI/provider code, Supabase migrations, package/profile models, navigation, landing content, and existing verification scripts.
- Used the GitHub connection to inspect repository state and publish this audit branch.
- Read catalog metadata in the connected active Supabase project whose schema matches GCC Mentor: 25 public tables, RLS policies, relevant grants, function privileges, storage configuration, migration history, and security advisors. Read only publication flags for legal content and an aggregate expired-session count. No CVs, user records, provider keys, or secret values were retrieved.
- Inspected the live signed-out landing page and login at `https://gcc-mentor.vercel.app` in a browser. The binding between that deployment, its exact source commit, its environment, and the connected database was not independently established through Vercel configuration.
- Ran local checks without adding Supabase credentials or changing environment variables. No production account creation, AI generation, payment, deletion, permission mutation, or abuse/load testing was performed.

Severity: **Critical** = immediate launch-blocking dependency/security triage; **High** = material security, integrity, privacy, or reliability risk; **Medium** = meaningful functional, operational, or UX gap; **Low** = polish/hardening. Status is exactly **Fixed**, **Not fixed**, or **Needs founder decision**. “Needs founder decision” remains unresolved and is not a waiver.

## Issue register

The open register contains **1 critical, 9 high, 14 medium, and 3 low issues**. Four earlier fixes are recorded separately and are not counted as new fixes.

| ID | Severity | Issue | Status |
| --- | --- | --- | --- |
| C01 | Critical | Locked production dependencies include a critical Next.js advisory | Not fixed |
| H01 | High | Users can mutate their own rate-limit counters and overrides through the data API | Not fixed |
| H02 | High | Package ownership policy permits writes to payment and generated-output fields | Not fixed |
| H03 | High | Cover letter, Q&A, and mock interview lack enforced per-service AI budgets | Not fixed |
| H04 | High | Whole-JSON updates can lose concurrent interview/history changes | Not fixed |
| H05 | High | Auth callback does not constrain the destination to the same origin | Not fixed |
| H06 | High | Public privacy/terms content is unpublished | Needs founder decision |
| H07 | High | Anonymous CV expiry does not ensure deletion; expired rows remain | Not fixed |
| H08 | High | Profile save can partially commit across parent/child tables | Not fixed |
| H09 | High | Provider execution budget exceeds several route timeouts | Not fixed |
| M01 | Medium | Fresh database setup is not reproducible in numeric migration order | Not fixed |
| M02 | Medium | Photo bucket lacks bucket-level size/type restrictions | Not fixed |
| M03 | Medium | Password recovery is absent; leaked-password protection is disabled | Needs founder decision |
| M04 | Medium | Cover letter is not grounded in the saved optimized resume | Not fixed |
| M05 | Medium | Mock answer limits and completed-run lifecycle are insufficient | Not fixed |
| M06 | Medium | Mock answer draft can follow a switch to another package | Not fixed |
| M07 | Medium | Tracker starts at Applied and lacks saved/rejected/withdrawn stages | Needs founder decision |
| M08 | Medium | Library endpoint returns all package payloads without pagination | Not fixed |
| M09 | Medium | Sign-in loses the requested service/package destination | Not fixed |
| M10 | Medium | Marketing contradicts live services and report capabilities | Not fixed |
| M11 | Medium | Deletion/retention coverage needs an explicit operational policy | Needs founder decision |
| M12 | Medium | Upload limits and extraction bounds need Vercel alignment | Not fixed |
| M13 | Medium | Release checks and configured deployment validation are incomplete | Not fixed |
| M14 | Medium | Founder needs an effective AI service pause/budget control | Needs founder decision |
| L01 | Low | Preview templates introduce repeated page-level headings and duplicate content | Not fixed |
| L02 | Low | Database function search-path hardening is incomplete | Not fixed |
| L03 | Low | Migration/operational documentation is stale or inconsistent | Not fixed |

## Critical finding

### C01 — Dependency security gate

**Evidence:** `package-lock.json`; `npm audit --omit=dev --json` reports four affected package entries: one critical (`next`) and three high (`@xmldom/xmldom`, nested `nanoid`, nested `postcss`). Installed Next.js is 14.2.35. The vulnerable nanoid/postcss instances are under `node_modules/next/node_modules/`; upgrading only the root packages would not resolve them.

The [Next.js AVIF image optimization advisory](https://github.com/advisories/GHSA-2xp9-vwfh-vxw4) includes the installed version in its affected range. Its native image-decoding prerequisites and applicability to the deployed Vercel image infrastructure were **not verified**. This is not a claim of demonstrated remote code execution on GCC Mentor. The audit also identifies other Next.js advisories, including [Server Actions denial of service](https://github.com/advisories/GHSA-m99w-x7hq-7vfj).

**Action:** Triage the complete dependency report, select a supported patched framework/dependency set, and run the configured build, auth, upload, image, PDF/DOCX and service regression flows. Do not apply `npm audit fix --force` blindly: the suggested framework upgrade crosses a major version. Release gate: no unresolved applicable critical/high dependency findings, or a documented, evidence-based non-applicability assessment for each.

## High findings

### H01 — Rate-limit state is client-writable

**Evidence:** `lib/rateLimit.ts`, migrations `013_operations.sql` and `016_increment_rate_limit.sql`; live catalog inspection shows an authenticated owner `ALL` policy on `rate_limits`, with INSERT/UPDATE privileges including `count` and `limit_override`. No compensating rate-limit trigger was found. Owner isolation prevents changing another user's row, but does not stop a user changing their own quota state through Supabase directly.

**Impact:** The route's limit check can be bypassed by altering the state it trusts. Restricting the increment RPC alone is insufficient. This is derived from effective policies/grants; no live mutation was attempted.

**Action:** Make quota mutations server-only, preserve any necessary owner read access, and use an atomic reservation/consume operation before paid computation with explicit failure/refund behavior. Test direct authenticated REST writes, concurrent requests, and administrator overrides in staging. The optimizer does have a rate check; the issue is its trusted state and its check-then-increment timing, not a total absence of a check.

### H02 — Package row permissions exceed user-editable fields

**Evidence:** `supabase/migrations/012_packages.sql`, subsequent package migrations, and live owner `ALL` policy/grants. Authenticated owners have INSERT/UPDATE privileges on fields including `is_paid`, `payment_id`, `optimized_content`, and `profile_id`. The application routes constrain ordinary edits, but the data API exposes the underlying grants.

**Impact:** An owner can tamper with server-derived/payment state in their own package. Payment gates are intentionally off in several routes, so this is a data-integrity defect now and a payment-readiness blocker, not evidence of a live checkout bypass or cross-user disclosure.

**Action:** Separate user-editable metadata from server-owned fields using column grants, narrowly scoped RPCs, or separate tables. Retain ownership checks and intended resume editing. Test direct API mutations of every protected field before reintroducing entitlement gates.

### H03 — AI cost controls do not cover the service journey

**Evidence:** `app/api/packages/[id]/cover-letter/route.ts`, `interview-qa/route.ts`, and `mock-interview/**/route.ts` authenticate users and scope packages, but do not enforce a per-service quota before provider calls. `lib/ai/runTask.ts` delegates authorization/rate limits to callers. Cover-letter code explicitly leaves credit locks off. `lib/ai/provider.ts` can retry and fall back across providers.

**Impact:** A signed-in user can repeatedly trigger provider spend; concurrency and retries amplify the exposure. Usage logging is valuable but is not enforcement. Optimization increments its limit after successful generation, allowing concurrent requests to pass the earlier check.

**Action:** Define free limits independently of payments; reserve per-user and global budgets atomically, limit concurrent jobs, cap prompt/answer lengths and retries, and add idempotency. Verify costs for retry/fallback/error paths. Do not implement payments as the solution to basic abuse controls.

### H04 — Concurrent JSON updates can overwrite work

**Evidence:** Package-scoped cover-letter/mock routes read JSON arrays and write a replacement value; `lib/packageEvents.ts` appends to an in-memory event array. Mock runs, answers, generated letters and `service_events` live on the package row.

**Impact:** Simultaneous tabs or services can each read the same old value, then overwrite the other's newly saved content. The service history is not an immutable audit trail; completed outputs and events may disappear under concurrent writes.

**Action:** Use separate append-only event/run records or transactional database functions with optimistic version checks. Test two simultaneous answers and two different service completions for one package. Keep user-facing history distinct from a privileged operational/security audit log.

### H05 — Callback destination validation

**Evidence:** `app/auth/callback/route.ts` reads `next` from the query string and redirects with string concatenation of `origin` and `next` after a successful code exchange. A harmless local URL-parser check established that concatenation can produce a different destination host; no real login token or malicious redirect was used.

**Impact:** A crafted callback destination can send a successfully signing-in user off-site. This does not establish token disclosure or an authentication bypass; it requires the successful callback path.

**Action:** Accept only approved relative paths, construct the URL with a base, and verify the resulting origin before redirecting. Add cases for malformed destinations, user-info syntax, slash/backslash variants, and safe package deep links. Coordinate with M09.

### H06 — Privacy and terms are not published

**Evidence:** Live `site_content` publication flags for `privacy`, `terms`, and `refund` are false; `footer_about` is published. The public landing footer did not expose privacy/terms links. The product accepts detailed CVs and optional sensitive Gulf-related profile fields and transmits selected information to AI providers.

**Action requiring founder decision:** Approve and publish accurate collection, processing, provider/subprocessor, retention, deletion, contact, and cross-border handling disclosures before broader real-user acquisition. Establish applicable legal review based on the business and users' jurisdictions. Refund policy becomes a payment launch gate; it is not a reason to implement payments now. This is a product/privacy readiness finding, not a jurisdiction-specific legal conclusion.

### H07 — Expired anonymous CV records remain stored

**Evidence:** `lib/anonymousSession.ts` hides expired sessions; legacy `app/api/ats-scan/route.ts` persists anonymous CV/parsed analysis with a seven-day expiry. A read-only aggregate query found **9 expired rows** in `anonymous_analysis_sessions`. No cleanup job was found in the repository, and no `cron` schema was present in the connected database. External scheduling was not independently checked.

**Impact:** Expiration limits retrieval but does not deliver deletion. The newer `app/api/gulf-readiness/route.ts` follows a transient flow; this finding must not be generalized to every anonymous scan.

**Action:** Define a retention period and implement monitored, repeatable deletion of expired sessions through an approved scheduled process. Reconcile old records and clarify which anonymous flow is supported. Acceptance: overdue records are purged within the stated window, with aggregate monitoring and no raw CV logging.

### H08 — Profile save is not atomic

**Evidence:** `app/api/profile/route.ts` performs a parent upsert and separate reconciliations of five child collections; the code documents the lack of a transaction.

**Impact:** An error midway can leave a partially updated career profile. A retry or second tab can produce inconsistent source facts, readiness scores, and subsequent documents.

**Action:** Move the coordinated save into a transaction with ownership validation and a version check. Test an injected failure after each child stage and concurrent saves. Preserve existing normalization, merge behavior, and child ownership policies.

### H09 — Provider deadlines exceed function budgets

**Evidence:** `lib/ai/provider.ts` defaults to a 280-second give-up budget. Cover-letter `maxDuration` is 60 seconds and its `generate()` call does not supply an earlier deadline; mock start/finish use 120 seconds and answer uses 90 seconds. Their shared generation path must fit those route budgets, including retries and persistence.

**Impact:** A slow provider can outlive the route's configured window, producing a platform timeout instead of a recoverable application error and potentially spending money without saving the result. [Vercel documents that invocations exceeding their configured duration terminate with a timeout](https://vercel.com/docs/functions/limitations).

**Action:** Pass an absolute deadline shorter than each function's maximum through every generation/retry layer, reserve time for saving, and test stalled providers. Consider durable execution for longer work only after choosing the expected user experience. Actual Vercel plan/runtime duration settings were not inspected.

## Medium findings

### M01 — Migration reproducibility

`020_profiles_base.sql` explicitly must run before `013_operations.sql`, which alters `profiles`; naive numeric application fails on a fresh database. Live migration history contains only two recorded entries, while the matching public schema includes all 25 tables and the tracker/history fields. Manual application is documented, so two history entries do **not** mean the other migrations are missing. Provide a clean bootstrap order/baseline, reconcile migration tracking without reapplying destructive work, and prove a fresh staging restore. Evidence: `supabase/migrations/README.md`, migrations 013/020/048 and live catalog/history.

### M02 — Storage controls can be bypassed through direct uploads

The live `profile-photos` bucket is private and uses owner-folder policies, which is good. Its `file_size_limit` and `allowed_mime_types` are null. `app/api/profile/photo/route.ts` validates size and image signatures, but owner INSERT access to Storage bypasses that route. Add bucket-level restrictions as well as server validation, test legitimate photos and direct uploads, and inspect the separate project-wide limit. No foreign-object access was demonstrated.

### M03 — Account recovery and password protection

The live login page has email/password and signup links but no recovery action; no reset-password journey was found in the source. Signup permits six-character passwords, and the connected project's security advisor reports leaked-password protection disabled. Founder must select an appropriate supported policy and email delivery setup; implement and verify recovery links, expiry, resend/error states, and password changes. Auth emails, delivery, session refresh, and account recovery were not exercised.

### M04 — Letter/resume grounding drift

`app/api/packages/[id]/cover-letter/route.ts` selects the job fields and current profile but not `optimized_content` or `document_snapshot`; `lib/ai/buildCoverLetterPrompt.ts` receives the current profile, target and JD. Thus it does not actually use the saved optimized resume as the primary source for a matching letter. Q&A/mock paths have resume context but also current profile context, so later edits need a deliberate versioning rule. Child profile query failures in the letter route also become empty arrays instead of explicit failures. Use the chosen saved resume version, disclose any additional profile facts, and fail clearly on incomplete reads. Verify after profile and saved-resume edits.

### M05 — Mock interview lifecycle and input bounds

The mock answer route checks for a nonempty answer without a meaningful maximum answer length. Re-answering a question is allowed, and finish accepts a run with at least one answer without making completed reports immutable. Repeated finish requests can regenerate a report. Define whether revisions/early finish are supported, enforce length and run-state rules, and make repeated submissions idempotent. This is separate from the general cost gate in H03. Evidence: `app/api/packages/[id]/mock-interview/[runId]/{answer,finish}/route.ts`.

### M06 — Draft answer context can switch

In `app/mock-interview/page.tsx`, changing the selected package updates the selection without clearing or keying `answerDraft` by package/run/question. A draft written for one job can remain visible for another. Bind draft state to its context and prevent ambiguous selection changes during submission. Test switching packages mid-draft and while a request is pending. This is a same-user context error, not cross-user leakage.

### M07 — Saved job and application semantics

Migration 048 and the tracker use an initial `applied` stage. A newly prepared package need not represent a submitted application. Saved/draft, rejected, and withdrawn outcomes are not represented in the current stage set. The Library already stores job context/URLs, while separate Saved Jobs navigation is still described as planned. Founder should choose one clear model: a saved job/package with preparation and application progress represented separately. Do not inflate application counts before a user marks a submission. Preserve existing stage values during any additive migration.

### M08 — Unbounded Library payload

`app/api/packages/route.ts` selects all package columns without pagination. The dashboard and service selectors reuse package data, potentially loading document snapshots, all mock transcripts, letters and event history when they need summaries. As users accumulate work this increases latency, mobile memory and database egress. Add paginated summary queries and load heavy content for the selected package. Verify older pages remain discoverable and sorting/counts stay correct.

### M09 — Authentication loses user intent

`middleware.ts` stores a protected pathname in `redirectTo`, but `app/login/actions.ts` completes sign-in at `/dashboard` rather than restoring that destination. Query context can also be lost. A user entering from Q&A, templates, or a saved package must rediscover their task. Share safe destination validation with H05 and preserve approved path/query context across login/signup. Confirm expired-session recovery as well as fresh sign-in.

### M10 — Product claims need one source of truth

Observed public copy includes interview practice marked “planned” alongside live mock/Q&A service cards; `components/landing/TemplateOrbit.tsx` advertises ten templates while the other gallery advertises fifteen. The interview illustration includes speaking clarity/confidence scores although the live service is text-based and voice feedback is described as planned. Label illustrative future capabilities explicitly and present actual text-feedback dimensions. Avoid implying that readiness scores predict hiring outcomes. Align pricing/manual-unlock wording with the currently unlocked service routes. No payment feature was added.

### M11 — Retention and erasure need a complete policy

`app/settings/actions.ts` deletes profile-related data and pending drafts, with best-effort photo cleanup. `DeleteDataSection.tsx` accurately says the login remains active. That transparency should be retained. Separately define auth account closure, orphaned photos, operational/usage logs, provider retention, backups, and deletion failures; document what is retained and why. No claim is made that the current action falsely promises account deletion. Validate the full inventory with synthetic data in staging and provide a founder-operable failure/retry process.

### M12 — Upload contract does not match deployment limits

`app/api/parse/upload/route.ts` accepts PDFs up to 5 MiB, constructs a buffer before its size check, and does not apply a clear extracted-text bound comparable to the text-input path. A compressed document can expand substantially during extraction. Vercel documents a [4.5 MB function request/response payload limit](https://vercel.com/docs/functions/limitations), including the upload envelope, so some advertised uploads can fail before the handler returns its friendly error. Set a conservative client/server limit or design controlled direct storage uploads, bound extracted text/page counts, and test oversized, malformed, encrypted and scanned documents. No hostile files were submitted to production.

### M13 — Release verification gap

There is no repository `.github/workflows` release gate and `package.json` has no aggregate test/typecheck script, although useful verification scripts exist. In this audit, the build compiled but prerendering failed with missing Supabase URL configuration; this checkout cannot certify a deployable build. This is an environment limitation, not proof that the live deployment is broken. Require a configured preview build, existing script suite, two-user RLS integration tests, and a preview journey before release. Vercel project settings, deployed commit, runtime logs, PDF binary tracing, branch protection, backup restore, alerts and rollback remain unverified.

### M14 — Founder controls need an effective service safety switch

Admin code already exposes provider/model settings, prompts, packages, promos, credits, usage and content. Server actions call `requireAdmin()`, and live `profiles` has owner SELECT policy only; broad SQL column grants alone do **not** establish a self-admin escalation because RLS blocks row writes. The operational gap is that credits/quota controls cannot reliably govern services whose locks are off or whose quota rows are client-writable. Founder should choose per-service availability/free allowance/global spend thresholds and a pause control enforced in the same server path as H01/H03. Keep it understandable without requiring SQL or deployment edits; add change history and a safe test/preview for provider/prompt changes.

## Low findings

### L01 — Landing accessibility and content duplication

The template orbit and separate gallery repeat a large amount of content. Embedded CV previews introduce multiple page-level headings into the landing DOM. Retain the attractive teal/gold visual language and clearly fictional examples, but use preview-appropriate heading semantics and one authoritative template count. A full screen-reader/keyboard audit and mobile layout check were not completed.

### L02 — Function hardening

The live Supabase advisor flags mutable search paths on `set_updated_at` and `handle_new_user_profile`. The latter is a security-definer trigger function. Although trigger functions have broad EXECUTE grants, they return `trigger` and cannot be treated as ordinary callable privilege-escalation RPCs. Sensitive consume/grant/increment/redeem functions checked in the catalog deny EXECUTE to anon/authenticated. Pin safe function search paths and review owner/privilege boundaries in a staging migration. See [Supabase's RLS guidance](https://supabase.com/docs/guides/database/postgres/row-level-security) for the distinction between row policies and privileged server access.

### L03 — Documentation drift

Migration documentation promises sequential numbering but has an explicit out-of-order prerequisite and repeated 027 prefixes; it also contains outdated operational/tooling references. Source comments and public roadmap copy disagree about which services are live. Publish a compact current operations guide covering migration order, service availability, credential rotation without values, incident pause, and restore verification. Do not copy historical connection details or secrets into the guide.

## Journey and UX coverage

| Area | Assessment and evidence | Remaining acceptance check |
| --- | --- | --- |
| Landing conversion/trust | Live desktop page loads; free readiness CTA is clear, fictional examples/illustration labels and no-guarantee copy are strengths. Teal/gold cards are visually coherent. H06/M10/L01 remain. | Mobile, keyboard, screen reader, conversion analytics; publish approved policies. |
| Signup/login/auth | Source uses Supabase SSR and server checks; signed-out login has appropriate email/password autocomplete. H05/M03/M09 remain. | Real signup, email confirmation, recovery, logout, refresh, expired link and deep-link restoration. |
| Dashboard | Existing main now provides a next action and explicit loading/failure recovery. Package payload growth remains M08. | New user, incomplete profile, many packages, provider/network failure, narrow viewport. |
| Profile/CV import | Structured profile/merge/readiness logic has passing deterministic scripts. H08/M12 remain. | Real parser, bad file types, scanned PDFs, interrupted saves, photo upload and RLS. |
| Resume optimization | Job-targeted generation, grounding and saved document structure exist. H01/H02/H03 affect trust and cost. | Provider output quality, two concurrent generations, save failure, updated profile and JD. |
| GCC templates/export | Shared resume rendering golden check and DOCX smoke pass. Public previews label fictional data. | Actual PDF/DOCX downloads for long/short profiles and every intended template on Vercel. |
| Package workspace | Existing shared preparation journey connects resume, letter, Q&A, mock and report with package context. | Back/refresh/deep-link behavior; edited resume propagation; stale data/concurrent tabs. |
| Cover letters | Owner-scoped endpoint and grounding validation exist; current-profile source diverges from saved resume (M04). | Generation/retry/copy/download, factual consistency and repeated-request handling. |
| Interview Q&A | Package-context route and generated Q&A UI exist. H03/H04 and input/version consistency remain. | Provider failure, new/resumed session, empty output, saved resume changes. |
| Mock interview | Text practice and persisted run/report flow exist. H03/H04/H09/M05/M06 remain. | Draft switching, retry, double submission, early finish, completed-run behavior. |
| Report | Existing report link selects package and report view; output is AI-generated text feedback, not a validated hiring predictor. | Refresh saved report, incomplete run, duplicate finish, score explanations and small screens. |
| Resume Library/saved jobs/tracker | Search, stage filters, job links and timeline are implemented. M07/M08 affect semantics/scale. | No results vs no data vs request failure, all stage changes, long job names, pagination. |
| Service history | User-visible events exist; whole-row JSON is not concurrency-safe or an authoritative audit log (H04). | Two simultaneous service updates, event order, deletion expectations. |
| Admin/founder | Broad useful controls, per-action authorization, masked provider-key display; effective cost control is incomplete (M14). | Non-admin action denial, invalid form values, provider failover, audited changes, usable incident pause. |
| Mobile UX | Source includes responsive layouts, wrapping journey chips and overflow-conscious Library controls from prior work. | No full live mobile or authenticated browser pass in this audit; verify 360/375/390 px and tablet, focus/keyboard, touch targets, dialogs and CV preview scrolling. |
| Empty/loading/error states | Recent shared selector/dashboard recovery is a positive baseline. Partial profile reads and platform timeouts can still bypass good feedback. | Inject 401/403/404/429/500/offline/slow responses in staging, preserve user drafts, provide retry without duplicate cost. |
| Broken routes/links | Landing anchor script passes; public landing/login navigated successfully. Protected templates redirect to login as designed, but may surprise a visitor exploring samples. | Complete authenticated route crawl and external job-link validation were not performed. |
| Payment readiness | Schema/admin concepts for pricing/credits/promos exist, with gates deliberately off. H02/H03 and policy decisions block a safe paid launch. | Later: authoritative entitlements, signed/idempotent webhooks, reconciliation, refunds/tax/business decisions. No payments implemented or tested. |

## Security controls that were verified or observed

- All 25 inspected public tables have RLS enabled. Profile child policies scope through the parent owner; package routes inspected authenticate and constrain by `user_id`.
- `profiles` permits owner SELECT, not owner UPDATE via RLS. No confirmed self-assignment of `is_admin` was found. Admin server actions perform their own checks rather than relying only on navigation/middleware.
- Provider configuration and privileged credit/prompt data have service-only policies. Sensitive RPC EXECUTE privileges inspected are denied to anon/authenticated. RLS-enabled anonymous service tables without client policies are expected, not automatically broken tables.
- Photo storage is private with owner-path policies. This does not remove the direct-upload limit gap in M02.
- Current tracked-file secret-pattern screening found no matching credential candidates; `.env.example` is the tracked environment template. No values were printed. This was **not** a full-history secret scanner, and does not certify historical commits, build artifacts, logs or deployed environment exposure.
- Provider keys are stored as secret values in a service-only configuration table and masked in admin display. Database-at-rest protection, provider-side retention, key rotation, browser bundles and production logs require independent operational verification; no key values were fetched.

## Checks performed

| Check | Result | Interpretation |
| --- | --- | --- |
| `npm run lint` | PASS | No ESLint warnings or errors. |
| `npx tsc --noEmit` (sequential final run) | PASS | Initial parallel build/typecheck attempt encountered transient `.next/types` generation races; final independent run passed. |
| `npm run build` | INCOMPLETE / failed prerender | Compilation and type validation succeeded; static generation failed with `supabaseUrl is required` because configuration is absent in this checkout. No substitute env values were introduced. |
| `npm audit --omit=dev --json` | FAIL security gate | 1 critical + 3 high affected package entries; C01. Counts are package entries, not proof of four exploitable paths. |
| `sucrase-node scripts/verify-next-action.ts` | PASS | Next-action decision logic. |
| `sucrase-node scripts/verify-profile-readiness.ts` | PASS | Deterministic profile readiness rules. |
| `sucrase-node scripts/verify-gcc-experience.ts` | PASS | GCC experience logic. |
| `sucrase-node scripts/verify-gulf-readiness.ts` | PASS | Gulf readiness logic. |
| `sucrase-node scripts/verify-profile-merge.ts` | PASS | Profile merge behavior. |
| `sucrase-node scripts/verify-landing-anchors.ts` | PASS | All checked in-page anchors resolve; not a complete URL crawl. |
| `sucrase-node scripts/verify-runtask.ts` | PASS | Shared task behavior under the script's fixtures; not real-provider quality. |
| `sucrase-node scripts/verify-resume.ts` | PASS | All 32,768 visibility permutations match the existing golden HTML. Golden file unchanged. |
| `sucrase-node scripts/docx-smoke.ts` | PASS | Valid 9,212-byte DOCX and expected content. Generated smoke artifact removed after the check. |
| Signed-out browser | PARTIAL PASS | Landing/login load and inspected desktop service cards are readable; no horizontal document overflow in the observed desktop view. Not an authenticated/mobile certification. |
| Supabase catalog/advisor review | COMPLETED read-only | Findings above verified without changing policies or reading customer content. |
| Current-tree secret-pattern scan | No candidates found | Limited heuristic check, not a security guarantee. |

Commands using `sucrase-node` were run with the installed `node_modules/.bin/sucrase-node`. No new dependencies or golden files were committed. The existing `scripts/e2e-smoke.mjs` needs configured credentials and performs account/AI operations; it was not run against production. PDF load tests, real AI calls, multi-user RLS requests, payment tests, malicious uploads, email delivery, backup recovery, load testing and authenticated mobile/accessibility checks were not performed.

## Earlier fixes present in the baseline

These are **Fixed** in the audited main commit, not changes made by this audit branch. See `docs/SAAS_JOURNEY_REVIEW_2026-09-15.md` and commit `56e51b1` for the earlier implementation.

| ID | Earlier issue | Status | Evidence |
| --- | --- | --- | --- |
| F01 | Disconnected service progression/package context | Fixed | `components/package/PreparationJourney.tsx` and package/service integration. |
| F02 | Dashboard/service selection could confuse loading or failed retrieval with empty data | Fixed | Explicit loading/error/retry handling in the existing journey changes. |
| F03 | Library needed search/recovery and more flexible narrow-layout controls | Fixed | Search/no-match recovery and wrapping controls in the earlier Library work. |
| F04 | Report navigation needed to select the correct package/report view | Fixed | Package-aware report navigation in the earlier mock interview changes. |

These source fixes do not substitute for a complete authenticated regression pass in this audit.

## Recommended release sequence and ownership

1. **Engineering/security:** Triage C01; close H01/H02 with additive, staged permission changes and direct data-API tests. Verify owner reads/edits and admin actions still work; demonstrate user A cannot read or mutate user B's data.
2. **Engineering/product:** Implement H03/H04/H08/H09 with clear reservations, deadlines, transactional writes and idempotency. Test failures and concurrent requests, not just the happy path. Harden H05 alongside deep-link recovery.
3. **Founder/privacy:** Approve H06/M11 policy and data inventory, establish H07 cleanup and monitoring, select M03 account recovery/password controls and M14 service budgets/pause behavior. Set realistic report claims and tracker semantics.
4. **Engineering/release:** Prove a clean schema bootstrap, configured preview build, dependency gate and deterministic scripts. Complete a two-account journey: signup → import/review profile → optimize for a JD → inspect/export saved CV → matching letter → Q&A → mock answers → saved report → tracker/history → refresh/resume → delete test data. Include revoked session, blocked quota, failed provider, failed save, concurrent tabs, long content and mobile.
5. **Founder/release owner:** Review the remaining medium/low issues with an owner and target date. Confirm deployment/source/database binding, backup restore, production alerts and rollback. Only then make the production launch decision. Payment activation remains a separate future decision and scope.

## Change record

- Added `docs/FULL_SAAS_AUDIT_2026-09-15.md` to make the audit evidence, issue severity/status, release gates and verification limits reviewable in GitHub.
- No application-code fixes were made in this audit. Working backend logic and Supabase assumptions were preserved for a coordinated follow-up rather than changed without integration verification.
- Delivery is the audit branch only; no merge to main, payment work, environment changes or deployment was requested or performed.
