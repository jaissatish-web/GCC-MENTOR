# PROJECT_STATUS.md — Read this first, every fresh session

**Purpose:** this file exists so a new conversation — a new Claude Code
session, a different reviewer, or the founder returning after a break —
can get oriented in two minutes instead of re-reading a long chat history.
It is a snapshot, updated after significant progress. It is **not** the
specification — `docs/RULES.md`, `docs/TASKS.md`, and the rest of `docs/`
remain the source of truth. This file just tells you where things stand
right now and points you at what to read next.

**Last updated:** 2026-08-06

---

## Read in this order

1. This file (orientation)
2. `docs/RULES.md` (non-negotiable constraints)
3. `docs/TASKS.md` (exact ticket-by-ticket status — the real detail)
4. `docs/HERMES.md` (if you are about to give Hermes a task)

---

## What this project is

A Gulf-focused career platform. Users build one Career Profile, then
generate a Gulf-format resume reframed for a specific target job/country —
using only facts already in their profile (the AI never invents anything).
Full product context: `docs/PRODUCT.md` and `docs/FOUNDING_BRIEF.md`.

Product name is undecided — use `[Product Name]` literally everywhere.

## Who does what

| Role | Who |
|---|---|
| Product/business decisions | The founder — non-technical, solo |
| Spec owner + code reviewer ("CTO") | Claude Code |
| Builder | Hermes (Hermes desktop app, model: DeepSeek V4 Flash) |

## How work actually happens — read this before doing anything automated

**Workflow is fully manual, by deliberate choice.** Claude Code gives the
founder a prompt naming exactly one ticket. The founder pastes it into
Hermes. Hermes does that one ticket and reports back in that same chat
window. The founder pastes the report back to Claude Code, who reviews the
**actual code** — never the report's word alone — and gives the next
prompt.

**Do not build or suggest a scheduled/automated relay (cron jobs, a
file-based mailbox between Hermes and Claude Code, etc.) without the
founder explicitly asking for it again.** This was tried once — see
`docs/HERMES.md` §1a note. It was reverted for two reasons: it surfaced a
real failure mode (a cron-triggered Hermes run ignored its instructions
entirely and fabricated a false completion claim, with literally no error
signal anywhere in the platform's own bookkeeping — the run was recorded
as "successful"), and, separately, it made the process harder for the
founder to see and stay in control of. Manual and visible, even if slower,
is the standing preference.

## Non-negotiables (full detail in `docs/RULES.md`)

1. **Grounding is absolute.** AI-generated resume text uses only facts
   already in the Career Profile. Never invented, at any optimization
   level.
2. **No passport number field, ever.** Validity date and ECR/Non-ECR type
   only.
3. **Nothing outside Phase 1 gets built.** See `docs/MVP.md` for the exact
   in/out list.
4. **Payment, security, and PII-storage tickets are "Needs Review"** and
   are never queued or approved without the founder explicitly signing
   off first, in conversation — not assumed, not inferred.

## Current progress

**Phase 1 (MVP). Done and merged: TASK-001 through TASK-006.**

- TASK-001 — shared UI primitives (`components/ui/`)
- TASK-002 — landing page
- TASK-003 — navigable route skeleton (placeholder pages for every MVP route)
- TASK-004 — app shell (sidebar + mobile bottom nav)
- TASK-005 — auth pages (email + password, provider-neutral)
- TASK-006 — `supabase/migrations/README.md` (migration conventions + apply checklist)

**Next up: TASK-007** — the `career_profiles` database migration. Flagged
**Needs Review** (creates the table holding the product's most sensitive
data — passport validity, visa status, phone numbers). **Do not queue or
auto-approve this without the founder's explicit go-ahead in the current
conversation.** Full spec: `docs/TASKS.md` Section B.

For the exact live status of every ticket, `docs/TASKS.md` is authoritative
— this section is a summary, not a substitute.

## Known state of the tooling

- `npm run build` and `npm run lint` both pass clean as of TASK-006.
- No `.env.local` exists yet and none is needed until TASK-007 actually
  requires a live Supabase connection (TASK-007 itself only writes a
  migration *file* — it does not apply anything to a database).
- The old HireCircuit codebase remains archived, untouched, at
  `D:\Hire Circuit` — not part of this repo, referenced only for donor
  patterns in `reference/`. See `docs/AUDIT.md`.
- Razorpay KYC and the Anthropic API key are external, founder-owned
  dependencies tracked outside this repo — ask the founder for current
  status if a ticket needs either.

## If you are picking this project back up cold

Update this file's "Last updated" date and the "Current progress" section
once you've reviewed the latest ticket status in `docs/TASKS.md`, so the
next person (or the next fresh session) doesn't have to reconstruct it
again.
