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

**Magic-link sign-in** required a client-side handler: Supabase returns
implicit-flow tokens in the URL *fragment*, which a server route cannot read at
all, so the callback never saw a code and always failed. The fragment is now
completed client-side on the login page and cleared from the URL.

---

## 2. Authorization — the three questions, kept separate

Three different questions, three different modules. Conflating any two of them
creates a hole.

| Question | Answered by | Never answers |
|---|---|---|
| **Who are you?** | Supabase session, checked first in every route | Anything about entitlement |
| **Is this row yours?** | The query itself — scoped `user_id = caller`, so another user's id matches no row and 404s | Whether the content is paid |
| **May this content be served?** | `lib/packageAccess.ts` | Ownership. It never sees a user id and cannot be mistaken for an ownership check |

**Ownership is enforced in the query, not in a branch afterwards.** A row loaded
by id and *then* checked is a row that was already read.

Separately, `lib/entitlements.ts` answers "what may a free user **start**" — which
is a different question again from "may this already-sold thing be served", and
the two are deliberately not merged. The entitlements table is editable from an
admin screen; the access gate must never be.

---

## 3. Row-level security

**Enabled on all 12 public tables, no exceptions.** A new table without it is a
data breach waiting to happen.

Patterns in use:
- **Owner-all** — the user may do anything to their own rows. Profile and package
  data.
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

**Therefore, standing rules for every migration:**

1. After applying it, **read the grants back from the catalogue.** A revoke aimed
   at what you expect will miss what the project actually grants.
2. Every new `SECURITY DEFINER` function gets an explicit
   `REVOKE EXECUTE ... FROM anon, authenticated` — not only from `PUBLIC`.
3. Confirm the column, constraint and index exist by querying the catalogue.
   "It ran without error" is not confirmation.
4. Where possible, attempt the forbidden operation with a real anonymous key and
   confirm it is refused.

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
  phrase, and performs a hard delete of the profile and all packages. Not a flag.
- **Photos are private**, in a non-public bucket, served through server-minted
  signed URLs.

---

## 7. Cost and abuse control

Every AI call spends real money, so unlimited free usage is a cost risk rather
than only an abuse edge case.

- **Signed-in users:** a daily limit on free actions, keyed on user id with a
  secondary key on phone/email to survive account cycling. Admin can raise or reset
  it for someone legitimately blocked.
- **Anonymous scans:** a separate IP-keyed daily limit, because there is no user id
  to key on.
- **Paid actions are not rate-limited** — they are self-limiting.
- **Authentication precedes every model call.** An anonymous caller cannot spend
  tokens on an authenticated route, which is why a missing middleware entry was
  never a cost vector.
- **Payment precedes generation.** Optimization used to run *before* payment, so
  every visitor who never bought still spent real tokens, and the product then sold
  a blurred preview of work it had already paid for. That funnel is inverted now.

Known and accepted: a malformed model response does not consume a rate-limit slot
even though the call cost money. Charging a user's daily attempt for a random model
hiccup is worse than the narrow gap.

---

## 8. Payment integrity

**`is_paid` is only ever set server-side**, by promo-code redemption or an admin
credit grant, both atomic. There is no client-side path that can set it and there
must never be one.

**The invariant the whole access gate rests on:** content cannot exist without
payment. Generation refuses unless the row is genuinely paid; nothing else writes
generated content except a text edit, which only edits text that already exists;
and there is no refund path that flips `is_paid` back.

**If a refund flow is ever added, that is the invariant it must preserve.**

When a real payment provider is integrated: `is_paid` set only by verified
server-side confirmation, never a client callback; webhooks idempotent; card data
and webhook secrets never logged.
