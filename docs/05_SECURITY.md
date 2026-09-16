# SECURITY — auth, privileges, personal data, and what must be verified

Two of this project's three real security findings were found **only** because
something was verified rather than assumed. That is the theme of this document.

---

## 1. Authentication and route protection

Supabase Auth. `middleware.ts` holds the list of protected routes and the matcher
that applies it. Both must be updated together.

**Adding a protected page means adding it to `middleware.ts` in two places.** This
was missed on three consecutive new pages, each time leaving a route that rendered
a shell and an error for a logged-out visitor instead of redirecting cleanly. None
of the three leaked data — every API route checks authentication independently —
but it is the most repeated mistake in this codebase's history. **A new protected
page is not done until an anonymous request to it has been observed returning a
redirect to login.**

`middleware.ts` and `app/auth/callback/route.ts` are protected files.

**Where a user lands after signing in is validated, in one place (2026-09-15, audit
H05/M09).** The callback used to redirect to `` `${origin}${next}` ``, with `next` from
the query string — `@evil.example` turns that into another host. Every auth path
(callback, login, signup, the magic-link hash handler) now goes through
`lib/safeRedirect.ts`: only a same-origin path under one of the app's own sections is
accepted, query strings (`?package=<id>`) are kept, and everything else falls back.
Middleware records path **and** query, so a signed-out user returns to the job they
opened. `scripts/verify-safe-redirect.ts` asserts 35 cases, hostile ones included.

**Password recovery exists (2026-09-15, audit M03):** `/forgot-password` →
emailed link → `/auth/callback` → `/auth/update-password`. The request page gives
the same answer whether or not the address has an account (no enumeration). Supabase
must list the callback URL under Authentication → URL Configuration; leaked-password
protection and the minimum length are founder decisions
([`SAAS_RELEASE_CHECKLIST.md`](SAAS_RELEASE_CHECKLIST.md)).

**Magic-link sign-in** required a client-side handler: Supabase returns
implicit-flow tokens in the URL *fragment*, which a server route cannot read at
all, so the callback never saw a code and always failed. The fragment is now
completed client-side on the login page and cleared from the URL.

**Sign-out** is a server action, `app/auth/actions.ts`, reached from the three-bar
menu. Until 2026-09-11 there was no way to sign out at all. It revokes **this device's**
session only (`scope: 'local'`), and if the revoke call fails it deletes the `sb-`
session cookies regardless — the browser must never stay signed in after the user asked
to leave.

---

## 2. Authorization — the three questions, kept separate

Three different questions, three different modules. Conflating any two of them
creates a hole.

| Question | Answered by | Never answers |
|---|---|---|
| **Who are you?** | Supabase session, checked first in every route | Anything about entitlement |
| **Is this row yours?** | The query itself — scoped `user_id = caller`, so another user's id matches no row and 404s | Whether the content is paid |
| **May this content be served?** | **Nobody, currently.** Every service is open — see §8 | — |

**Ownership is enforced in the query, not in a branch afterwards.** A row loaded
by id and *then* checked is a row that was already read.

Separately, `lib/entitlements.ts` answers "what may a free user **start**" — which
is a different question again from "may this already-sold thing be served", and
the two are deliberately not merged. The entitlements table is editable from an
admin screen; the access gate must never be.

---

## 3. Row-level security

**Enabled on every public table, no exceptions** (25 at the 2026-09-15 audit, plus
the tables migrations 049–054 add). A new table without it is a data breach waiting
to happen.

Patterns in use:
- **Owner-all** — the user may do anything to their own rows. Career Profile and its
  child tables.
- **Owner rows, limited columns** — `packages` (migration 050): the owner may read and
  delete their jobs and UPDATE only the metadata they edit (name, stage, template,
  style, tracker fields). Payment state, generated content, the frozen document,
  letters, Q&A, interview runs and service history are written by the server only.
- **Owner-read only** — `rate_limits` (migration 049): a user may see their own
  counters but never change them.
- **Owner-select only** — `profiles`, so a user can read but never write their own
  `is_admin`. An owner-all policy here would be a privilege-escalation hole.
- **Public read** — `pricing` and `plan_entitlements`. Both are genuinely public
  information.
- **No policy at all** — every commercial table. This is *tighter* than owner-only:
  a user who could write `promo_codes` or `user_service_credits` could mint
  themselves the paid product. Writes happen through the service role only.

---

## 4. The service role

`lib/supabase/serviceAdmin.ts` **bypasses row-level security entirely.**

Rules:
- Use it only where a user genuinely must not be able to perform the write
  themselves.
- The calling code checks `requireAdmin()` first. Data-layer functions do **not**
  quietly enforce authorization — a function that did would hide where the real
  gate is.
- Every admin server action re-verifies admin status independently. **A server
  action is its own POST endpoint** and is not covered by the page's render-time
  check.
- The granting admin's identity always comes from the session, never from a form
  field, so an action cannot be attributed to someone else.
- **Server-owned package writes** (`lib/packages/serverWrites.ts`, 2026-09-15) use it
  because a user's own session may no longer write those columns. Every function takes
  the caller's user id — from the session, after authentication — and matches it in the
  write. The service role bypasses RLS, so that match **is** the ownership check: never
  pass an id taken from a request body.

---

## 5. Database privileges — the lesson this project learned twice

**Read this before writing any migration.**

This Supabase project grants privileges **directly to the `anon` and
`authenticated` roles** by default. A `REVOKE ... FROM PUBLIC` does not touch a
direct grant to a named role. It looks like a lockdown and does nothing.

**Finding one — `SECURITY DEFINER` functions, live and exploitable.** Every
`SECURITY DEFINER` function in the project had only ever revoked from `PUBLIC`,
leaving each one callable by **any** client, including unauthenticated ones,
through the auto-exposed REST endpoint, with attacker-chosen arguments. Three were
confirmed exploitable: one would have unlocked any user's package for free, one
would have let anyone manipulate another user's rate limits, and one would have
let anyone burn another user's credit or mark a package they did not own as paid.
It was live for weeks.

**Finding two — `TRUNCATE`, found by checking rather than by symptom.** A new
table came back holding `TRUNCATE` for `anon` **even after an explicit revoke of
insert, update and delete.** Checking the rest of the schema found the same on
**12 of 12 tables**, including `packages` and `career_profiles`.

Why that one mattered more than the others: **`TRUNCATE` is not subject to
row-level security at all.** Postgres checks the privilege and empties the table,
consulting no policy. Every protection the rest of the schema relies on simply
does not apply. One successful `TRUNCATE career_profiles` as `anon` would have
erased every user's profile; `packages`, every paid resume. No exploit route was
found — the REST layer exposes no truncate verb — so it was latent, not open. It
was revoked across every table, along with `TRIGGER` and `REFERENCES`, and default
privileges were changed so new tables do not arrive with them.

**Finding three — owner-writable server state (2026-09-15 audit, H01/H02).** Two
tables carried an owner `ALL` policy on top of Supabase's broad default grants:
`rate_limits`, so a signed-in user could raise their own `limit_override` or reset
their own count through the data API and walk past every daily limit; and `packages`,
so an owner could write `is_paid`, `payment_id`, `optimized_content` or `profile_id` on
their own rows. Neither reached another user's data — RLS held — but both let a user
forge the state the server trusts. Fixed by migrations 049 (read-only counters,
reservations through service-only functions) and 050 (column grants, server writers),
and asserted as each role against a local Postgres-compatible test harness with Supabase
behaviour partially stubbed (`scripts/verify-db-security.mjs`) — evidence about the SQL,
not about Supabase Auth, PostgREST, the Storage API or production RLS, and not applied to
any real database yet. **Owner-only RLS decides *whose* rows; grants decide
*which columns*. A policy is not a substitute for a column grant.**

**Therefore, standing rules for every migration:**

1. After applying it, **read the grants back from the catalogue.** A revoke aimed
   at what you expect will miss what the project actually grants.
2. Every new `SECURITY DEFINER` function gets an explicit
   `REVOKE EXECUTE ... FROM anon, authenticated` — not only from `PUBLIC`.
3. Confirm the column, constraint and index exist by querying the catalogue.
   "It ran without error" is not confirmation.
4. Where possible, attempt the forbidden operation with a real anonymous key and
   confirm it is refused.
5. **A column the server derives is not granted to `authenticated`.** Add the new
   table's or column's forbidden-write case to `scripts/verify-db-security.mjs`, which
   runs every migration on a fresh database and tries it as each role.

**One honest limitation:** default privileges are per-role, so the new default only
covers tables created by the role migrations run as. A table created through the
Supabase dashboard as a different role would arrive with `TRUNCATE` again. Re-running
the revoke loop fixes it and is idempotent.

---

## 6. Personal data

The binding rules are in [`02_PHILOSOPHY.md`](02_PHILOSOPHY.md) §3. The mechanics:

- **Never stored:** passport numbers, any document copy or image (passport, visa,
  Emirates ID, certificates, offer letters). Passport *type* and *validity date*
  only.
- **Logging:** record IDs and field *names* only, never field values. This applies
  to error messages too.
- **Admin reads are logged** to `pii_access_log` — who, what, when — **before** the
  data is returned. Not after.
- **Deletion is real.** Settings offers a two-step confirmation requiring a typed
  phrase, and performs a hard delete of the profile, all packages, any CV reading
  still waiting, and the photo. Not a flag. **It does not close the login** — the
  screen says so; account closure is a founder decision
  ([`DATA_INVENTORY_AND_RETENTION.md`](DATA_INVENTORY_AND_RETENTION.md)).
- **Photos are private**, in a non-public bucket, served through server-minted
  signed URLs. Since migration 052 the bucket itself refuses files over 5 MiB or not
  JPEG/PNG/WebP, so a direct Storage upload cannot bypass the route's checks.
- **Expired anonymous CV scans are deleted, not just hidden** — nightly
  (`/api/cron/retention`, migration 054) and on demand from `/admin/services`, with
  counts-only run history. Where every kind of personal data lives and for how long:
  [`DATA_INVENTORY_AND_RETENTION.md`](DATA_INVENTORY_AND_RETENTION.md).

---

## 7. Cost and abuse control

Every AI call spends real money, so unlimited free usage is a cost risk rather
than only an abuse edge case. **A free service still needs a limit; payment is not
the abuse control** (2026-09-15 audit H03 — the cover letter, Q&A and every mock
interview call had none).

- **One gate in front of every model call: `lib/ai/serviceGuard.ts`.** CV reading,
  advert structuring, CV build, cover letter, Q&A, mock start / answer / report. In
  order: the founder's **pause** switch, the **daily allowance** (per-user admin
  override → founder setting → code default), a **one-at-a-time** cap, an optional
  **all-users daily cap**, then an atomic **reservation** (migration 049). Pending
  reservations count toward the limit, so two tabs cannot both pass it. A saved result
  consumes the slot; any failure releases it; a killed function's reservation expires.
  **Fails closed** — unreadable controls or counters refuse the request.
- **Keying:** user id, with the secondary phone/email key that survives account
  cycling. Admin can still raise or reset one user's allowance.
- **Anonymous scans:** a separate IP-keyed daily limit, plus the founder's pause.
- **Profile recreation:** 2 a month on the free plan, 5 for paid users, checked before
  the model call and counted on success only (`lib/recreateLimit.ts`, 2026-09-11).
- **Input bounds:** CV text 20,000 characters pasted / 30,000 extracted; uploads 4 MB
  PDF, 2 MB DOCX, checked before buffering; mock answers 3,000 characters.
- **Deadlines:** every AI route passes one give-up point, 20–30s inside its
  `maxDuration`, through every attempt, provider tier and repair
  (`scripts/verify-deadlines.ts`), so it answers with its own message instead of the
  platform's timeout page.
- **Authentication precedes every model call.** An anonymous caller cannot spend
  tokens on an authenticated route.

**Founder visibility:** `/admin/services` shows, per action, today's and the last
seven days' allowed / saved / failed / refused counts — counted inside the same
database functions that enforce the limits — and records every change with its before
and after values.

Known and accepted: a failed model call does not consume the user's slot even though
the call cost money. Charging a user's daily attempt for a random model hiccup is
worse than the narrow gap — and the counters now show how often it happens.

---

## 8. Payment integrity — currently not enforced, on purpose

**Every paid lock was removed on 2026-08-17 by founder decision**, so the whole
pipeline can be built and tuned without a paywall in the way. The locks are
re-applied over the finished machine. Full reasoning and the accepted tradeoffs
are in [`15_DECISION_LOG.md`](15_DECISION_LOG.md).

**What still protects things, unchanged:** authentication on every route,
ownership scoping in every query, row-level security, the service-role boundary,
and the daily rate limit on generation. **Nothing about data protection was
weakened** — only the "have you paid" question was removed.

**What to restore, and the two rules that made it correct:**

1. **`is_paid` is only ever set server-side**, by promo-code redemption or an
   admin credit grant, both atomic. No client-side path may set it.
2. **Gate the AI-written text, not the container** — a row with no generated
   content holds only the user's own typing, so serving it gives nothing away.

**The invariant the old gate rested on:** content cannot exist without payment.
Generation refused unless the row was paid; nothing else wrote content except a
text edit, which only edits text that already exists; and no refund path flipped
`is_paid` back.

⚠ **That invariant is being broken deliberately right now.** Rows are being
created with generated content and `is_paid = false`. **Whoever re-applies the
lock must deal with those rows** — purge or mark them — rather than assume they
cannot exist. If a refund flow is ever added, it must preserve the invariant too.

When a real payment provider is integrated: `is_paid` set only by verified
server-side confirmation, never a client callback; webhooks idempotent; card data
and webhook secrets never logged.
