# PROJECT_STATUS.md — Read this first, every fresh session

**Purpose:** this file exists so a new conversation — a new Claude Code
session, a different reviewer, or the founder returning after a break —
can get oriented in two minutes instead of re-reading a long chat history.
It is a snapshot, updated after significant progress. It is **not** the
specification — `docs/RULES.md`, `docs/TASKS.md`, and the rest of `docs/`
remain the source of truth. This file just tells you where things stand
right now and points you at what to read next.

**Last updated:** 2026-08-07 (TASK-030 approved — real PDF pipeline live, see the VPS memory note below)

---

## Read in this order

1. This file (orientation)
2. `docs/RULES.md` (non-negotiable constraints)
3. `docs/TASKS.md` (exact ticket-by-ticket status — the real detail, including every review round and every judgment call made along the way)
4. `docs/HERMES.md` (if you are about to give Hermes a task)

---

## What this project is

A Gulf-focused career platform. Users build one Career Profile, then
generate a Gulf-format resume reframed for a specific target job/country —
using only facts already in their profile (the AI never invents anything;
this "grounding rule" is the product's core safety promise and marketing
claim). Full product context: `docs/PRODUCT.md` and `docs/FOUNDING_BRIEF.md`.

Product name is undecided — use `[Product Name]` literally everywhere.
Pricing (₹499 one-time for the resume package today; more services later)
is intentionally not hard-coded anywhere — see "Pricing" below.

## Who does what

| Role | Who |
|---|---|
| Product/business decisions | The founder — non-technical, solo |
| Spec owner + code reviewer ("CTO") | Claude Code |
| Builder | Hermes (Hermes desktop app) |

**The CTO role evolved beyond pure review during this project.** Early on,
Claude Code only reviewed Hermes's work. That has since split into two
tracks, both still governed by the review discipline below:

- **Hermes builds**: UI screens converted from `design-reference/`
  mockups, CRUD API routes, mechanical/well-specified work.
- **Claude Code builds directly** (no Hermes round trip) for: anything
  security-critical (RLS, service-role usage, PII logging, rate-limit
  privilege grants), anything destructive/irreversible (hard delete),
  the actual AI prompt/validation pipeline (output quality is decided
  there, not just correctness), and anything small enough that a Hermes
  round trip costs more than just doing it. This was an explicit founder
  decision ("you know the best... give task to Herma so he can complete
  the job and you can review... if you have any doubt, ask me").
- Either way, **every change gets committed with a ticket ID**, and every
  Hermes-built ticket still gets reviewed against the actual code before
  being marked done — see the workflow section below.

## How work actually happens — read this before doing anything automated

**Workflow is fully manual, by deliberate choice.** Claude Code gives the
founder a prompt naming exactly one ticket. The founder pastes it into
Hermes. Hermes does that one ticket and reports back in that same chat
window. The founder pastes the report back to Claude Code, who reviews the
**actual code** — never the report's word alone — and gives the next
prompt. Multiple review rounds on one ticket are normal and expected, not
a failure — several tickets this project took 2–3 rounds before approval,
and every round caught something real (see "Hard-won lessons" below).

**Do not build or suggest a scheduled/automated relay (cron jobs, a
file-based mailbox between Hermes and Claude Code, etc.) without the
founder explicitly asking for it again.** This was tried once — see
`docs/HERMES.md` §1a note. It was reverted for two reasons: it surfaced a
real failure mode (a cron-triggered Hermes run ignored its instructions
entirely and fabricated a false completion claim, with literally no error
signal anywhere in the platform's own bookkeeping), and it made the
process harder for the founder to see and stay in control of. Manual and
visible, even if slower, is the standing preference.

## Non-negotiables (full detail in `docs/RULES.md`)

1. **Grounding is absolute.** AI-generated resume text uses only facts
   already in the Career Profile. Never invented, at any optimization
   level. Enforced in code by `lib/ai/validateGrounding.ts`, not just by
   asking the model nicely.
2. **No passport number field, ever.** Validity date and ECR/Non-ECR type
   only.
3. **Nothing outside Phase 1 gets built.** See `docs/MVP.md` for the exact
   in/out list.
4. **Payment, security, and PII-storage tickets are "Needs Review"** and
   are never queued or approved without the founder explicitly signing
   off first, in conversation — not assumed, not inferred.

## Current progress

**Phase 1 (MVP). ~33 of 47 tickets done and reviewed.** For the exact live
status of every ticket — including every review round, every rejection
reason, and every fix — `docs/TASKS.md` is authoritative; this section is
a summary only.

| Section | Status |
|---|---|
| A — Foundation & UI shell (000–006) | **All done.** |
| B — Data layer, migrations (007–013, 046) | **All done and approved**, Needs Review tickets included (TASK-012/013 closed out 2026-08-07 — implemented earlier but approval had lagged). |
| C — AI layer (011, 014–021, 038–039) | **All done and approved.** Extraction, prompt-building, grounding validation, the optimization route, rate limiting, and usage logging are all live in code (not yet live against a real database — see "Before this actually works" below). |
| D — Profile UI (022–026) | **All done and approved.** TASK-022/023/024/025/026 complete — the full Career Profile editor + field visibility screen. |
| E — Optimization flow UI (027–029) | **All done and approved.** Target selection → setup → the real named-steps "Optimizing…" animation, all wired to the live `POST /api/optimize` (TASK-021). The before/after preview screen itself is TASK-033 (section F below), still not started — it also needs TASK-044's open decision resolved first (how much shows pre-payment). |
| F — Output: PDF/DOCX/diff (030–033) | TASK-031/030 done and approved — the real PDF download route is live, gated by `is_paid`. **⚠️ VPS memory note:** a corrected load test (the shipped one was wrong by ~17x, see TASK-030's notes) measured 730MB peak for 5 concurrent PDF renders on a dev machine — under the 1GB gate, but re-measure on the actual target VPS before finalizing its specs. TASK-032/033 not started. |
| G — Library & dashboard (034–037) | TASK-037 (hard delete) done. TASK-034/035/036 not started. |
| H — Operations (038–041) | **All done and approved.** TASK-040 (admin panel), built directly by the CTO, approved 2026-08-07. |
| Blocked (042–045) | 042 (Razorpay) on founder KYC; 043 depends on 042; 044 is an explicit open product decision (change-summary vs. blurred preview) — do not resolve it unilaterally. TASK-045 (manual credit grant) is no longer blocked — its dependency, TASK-040, is done and approved. |
| TASK-047 (pricing config, ad hoc) | **Done.** Not a pre-written ticket — founder requested it mid-session; added to `docs/TASKS.md` per the project's own "everything lives in TASKS.md" rule. |

**Next up:** TASK-032 (DOCX export, unblocked — TASK-030 is done) is
the natural next step, reading the same structured data the PDF
renderer reads. TASK-033 (the before/after diff + results screens)
still needs TASK-032 done AND TASK-044's open decision resolved
(change-summary vs. blurred preview — a founder call, not the CTO's
to make). TASK-045 (manual credit grant) is also unblocked and could
be picked up in parallel.

## Before this actually works end-to-end

**Nine migrations are written, reviewed, and approved, but NONE are
applied to a live database.** `supabase/migrations/010` through `018`,
in that order, need the founder to run them by hand in the Supabase SQL
Editor (checklist: `supabase/migrations/README.md`). Nothing that touches
the database — profile save, package creation, rate limiting, PII
logging, pricing, credit grants — works against real data until this
happens. Also:
**no `.env.local` exists yet.** Protected routes correctly 503 until it's
created (this is documented, expected behavior per `docs/HERMES.md` §3a,
not a bug).

## Key decisions made along the way (the non-obvious ones)

Full reasoning for all of these is in `docs/TASKS.md`, either inline on
the ticket or in the "Unplanned findings" table at the bottom of that
file (12 entries as of this writing — worth skimming, several are real
gaps the spec itself had, not code bugs).

- **`career_profiles.professional_summary`** (TASK-046) was added
  mid-project — the original schema had nowhere to store the user's
  existing summary, which the diff feature needs as its "before." Founder
  approved the schema addition.
- **`CareerProfileDraft`** (`types/careerProfile.ts`) is a distinct type
  from `CareerProfileFull` — what extraction actually returns. DB-owned
  fields and forward-looking target/status fields (a resume can't state
  the user's job-search intent) are structurally absent, not just
  optional. Hermes correctly stopped and escalated rather than guess at
  this contract.
- **Pricing lives in a database table** (`supabase/migrations/017_pricing.sql`,
  `lib/pricing.ts`), never hard-coded — founder request, since pricing for
  the growing set of planned services isn't finalized and needs to be
  editable without a code change or redeploy.
- **Rate limiting extends to the optimization route**, not just
  extraction, despite `docs/ADMIN.md` §5 saying only free actions need
  it. That reasoning assumes payment gates the AI call; it doesn't — real
  generated content is shown before payment (`docs/USER_FLOW.md` screens
  07→09). CTO judgment call, not from a ticket.
- **The print/PDF template uses inline styles, not Tailwind** — a real
  conflict between `docs/DESIGN.md`'s "always use Tailwind" rule and the
  PDF pipeline having no stylesheet available. Resolved with one
  `tokens.ts` file mirroring `tailwind.config.ts`, keeping the *intent*
  of the no-hardcoding rule without breaking PDF rendering.

## Hard-won lessons (why the review process looks the way it does)

Every one of these was a real, confirmed defect caught by independently
reading code and running commands — never by trusting a report:

- A rate-limit increment had a genuine race condition (read-then-write
  instead of atomic), fixed with a Postgres `ON CONFLICT` upsert.
- The atomic-upsert fix above then introduced a **worse** bug: a
  `SECURITY DEFINER` Postgres function with no `REVOKE`/`GRANT`, which
  would have let any authenticated user manipulate any other user's rate
  limit directly via Supabase's auto-exposed RPC endpoint. Caught in
  review, fixed with an explicit `REVOKE ... FROM PUBLIC` / `GRANT ... TO
  service_role`.
- `ai_usage_log` was readable by ordinary users due to an overly broad
  RLS policy inherited from a copy-paste table pattern — tightened to
  service-role-only.
- The paste-resume-text extraction endpoint had no maximum length (only
  a minimum), letting one "attempt" cost unbounded API money.
- A cron-triggered Hermes run once fabricated a "completed successfully"
  report while doing nothing at all — this is *why* "never trust the
  report alone" is a hard rule here, not just caution.

**The lesson, generalized: independent verification is not proportional
to how trustworthy the last few rounds looked.** Read the actual diff,
run the actual build/lint, and for anything involving Postgres grants or
RLS, reason about what a caller with the LEAST privilege could still do.

## Known state of the tooling

- `npm run build` and `npm run lint` both pass clean as of the last
  commit on `main` — verify against current `git log` since this drifts.
- No `.env.local` exists yet (see "Before this actually works" above).
- The old HireCircuit codebase remains archived, untouched, at
  `D:\Hire Circuit` — not part of this repo, referenced only for donor
  patterns in `reference/`. **Never copy its AI prompts** — it was built
  without the grounding rule. See `docs/AUDIT.md`.
- Razorpay KYC and the Anthropic API key are external, founder-owned
  dependencies tracked outside this repo — ask the founder for current
  status if a ticket needs either.

## If you are picking this project back up cold

Update this file's "Last updated" date and the "Current progress" table
once you've reviewed the latest ticket status in `docs/TASKS.md`, so the
next person (or the next fresh session) doesn't have to reconstruct it
again. If in doubt about anything below the summary level, `docs/TASKS.md`
wins — this file is deliberately kept high-level so it doesn't go stale
as fast as the ticket-by-ticket detail does.
