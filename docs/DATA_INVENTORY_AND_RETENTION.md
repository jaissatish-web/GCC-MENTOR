# DATA INVENTORY AND RETENTION — where personal data lives, and for how long

**Written 2026-09-15 for audit items H06, H07 and M11.** This is an engineering
inventory, not a privacy policy. It says what the code and database actually hold,
who can read each item, how long it stays, and how it is deleted — and marks every
statement it could not verify from this repository as **unverified**. Nothing here is
an approved retention promise; the founder decides the policy (§4), and a lawyer
reads the published text.

---

## 1. What is stored, and where

| Data | Where | What it contains | Who can read it | How long it stays today | How it is deleted |
|---|---|---|---|---|---|
| Login | Supabase Auth (`auth.users`) | Email, password hash, sign-in metadata | The user (their own session); the service role | Until the account is closed. **The app offers no account closure** | Only from the Supabase dashboard today (founder decision, §4) |
| Admin flag | `profiles` | `is_admin` | Owner (read only); service role | With the account | Cascades with the account |
| Career Profile | `career_profiles` + five child tables | Name, phone, WhatsApp, email, LinkedIn, nationality, date of birth, passport **type** and validity date, visa status and transferability, notice period, location, full work history, skills, certifications, education, free-text extras | Owner (RLS); admins through the logged PII viewer | Until the user deletes it | Settings → "Delete my data" (hard delete, cascades to children and jobs) |
| Profile photo | Storage bucket `profile-photos` (private) | The photo | Owner, via server-minted signed URLs | Until replaced or deleted | "Delete my data" removes it after the profile; a failure is logged and can leave one orphaned object |
| CV reading waiting for a decision | `pending_profile_drafts` | The parsed profile from an uploaded or pasted CV | Owner | Until the user keeps, replaces or discards it | Resolving it; "Delete my data" deletes it first |
| Saved jobs | `packages` | Target job, the pasted job advert, the optimized CV, the frozen delivered document (contact details as they were printed), cover letters, interview Q&A, mock-interview transcripts **including the user's typed answers**, tracker notes, service history | Owner (read/delete; limited columns update); server writers | Until the user deletes the job or all data | Library → Delete; "Delete my data" |
| Signed-out legacy scan | `anonymous_analysis_sessions` | **Raw CV text** and the parsed profile from the old `/ats-scan` flow | Service role only | 7-day expiry. **Before 2026-09-15 expiry only hid rows** (9 expired rows were found) | Deleted after expiry by the nightly clean-up (migration 054) |
| Signed-out rate limits | `anonymous_rate_limits` | Salted IP hash, action, daily count | Service role only | Purged after 30 days (engineering default, §4) | Nightly clean-up |
| Signed-in quotas | `rate_limits`, `rate_limit_reservations` | User id, action, day, count; in-flight reservations | Owner may read own counters; service role writes | Counters: kept. Reservations: deleted a day after expiry | Counters cascade with the account |
| AI spend log | `ai_usage_log` | User id, route, model, token counts, estimated cost. **No prompt or answer text** | Service role | Kept | `ON DELETE CASCADE` with the account — the financial record disappears with the user (open item: likely `SET NULL`) |
| Admin access log | `pii_access_log` | Which admin viewed which user's record, when | Service role; append-only | Kept | Cascades with either account |
| Service counters and settings | `ai_service_daily_stats`, `ai_service_controls`, `ai_service_control_changes`, `maintenance_runs` | Counts per action per day (no user id); settings; who changed a setting; clean-up run results (counts) | Service role | Kept | Not personal content; admin ids cascade/null with the account |
| Browser storage | The user's own browser (sessionStorage) | Unsent mock-interview drafts (`gcc.mockDraft.*`), the CV-reading hand-off to the profile page | Only that browser tab | Until the tab closes or the answer is saved | Automatic |
| Server logs | Vercel runtime logs | User and record ids, route names, error messages. By rule never field values — enforced by review, not by a tool | Whoever has Vercel project access | Vercel's plan retention — **unverified** | Vercel-managed |
| AI prompts and answers | The configured AI provider(s) — today OpenRouter, which routes to upstream model hosts | Profile facts, CV text, the job advert, typed interview answers, generated text | The provider and its upstreams | **Unverified** — depends on the provider account's data settings and each upstream's policy | Not controllable from this app |
| Auth emails | Supabase's email sender | Email address, confirmation/recovery links | Supabase | **Unverified** | Supabase-managed |
| Backups | Supabase-managed backups | Everything above, as of backup time | Supabase / project owner | **Unverified** — depends on the Supabase plan. Deleted data persists in backups until they age out | Ages out with the backup schedule |

## 2. What the 2026-09-15 changes did

- **Expired anonymous CV scans are deleted, not hidden.** `purge_expired_operational_data()`
  (migration 054) runs nightly from Vercel Cron (`/api/cron/retention`, needs
  `CRON_SECRET`) and on demand from `/admin/services`. It returns and records **counts
  only**; no CV content is read or logged. **Applying migration 054 and setting
  `CRON_SECRET` are still to be done in production** — until then nothing is purged.
- **Photo uploads are bounded at the bucket** (migration 052), so a direct Storage upload
  cannot store an oversized or non-image file.
- **Nothing that was stored has been deleted from production.** The purge has run only in
  the disposable test database.

## 3. The two anonymous flows — do not confuse them

- **`/gulf-readiness-score` (current, supported):** the CV is read in the request, scored
  by arithmetic and discarded. Nothing is stored (`lib/resumeTextFromUpload.ts`).
- **`/ats-scan` (legacy):** its page redirects to the scorecard since 2026-08-18, but its
  POST endpoint still exists, stores CV text for seven days and makes model calls. It is
  now pausable from `/admin/services` and its rows are purged after expiry. **Retire or
  keep it is an open founder decision** (14_OPEN_ITEMS).

## 4. Decisions only the founder can make

1. **Retention periods** — how long a saved job, a CV reading and a closed account's data
   are kept; whether `rate_limits` history is trimmed; whether 30 days is right for
   anonymous rate-limit rows.
2. **Account closure** — offer a real "close my account" (delete the login too), and
   decide what survives it: likely the spend log with the user link removed, and the admin
   access log.
3. **AI provider data handling** — which providers and upstreams may receive CV data, and
   whether to require zero-retention routing where the provider offers it.
4. **Cross-border disclosure** — users are in India and the Gulf; the database region and
   the AI providers' regions need stating.
5. **Legal text** — privacy, terms, refund. The publishing mechanism exists
   (`/admin/content`; pages 404 until written **and** published). Nothing has been
   written on the founder's behalf, deliberately.

## 5. What the privacy policy must cover (a checklist, not wording)

- Every row of §1 that holds personal data, in plain words.
- That CV text, profile facts and typed interview answers are sent to AI providers, and
  which ones.
- How long each kind is kept (§4.1) and what "Delete my data" does and does not remove
  (it keeps the login; logs and backups age out on their own schedule).
- How to contact the founder, and how to close the account.
- Cookies: Supabase session cookies (necessary); no analytics or advertising cookies are
  set by this code as of 2026-09-15.
