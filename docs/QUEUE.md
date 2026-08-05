# QUEUE.md — Autonomous Hermes/CTO Relay

**This file is a mailbox, not documentation.** It exists so Hermes (running on
a schedule) and the CTO (checking in periodically) can hand work back and
forth without the founder manually copying text between them.

If you are Hermes running from a scheduled trigger: **read this file first,
before anything else, before `docs/HERMES.md`.**

---

## Status: READY

## Queued task

Execute TASK-005, and only TASK-005. Do not start, plan, or partially
implement any other ticket.

Key things `docs/HERMES.md` will tell you, stated here so there is no doubt:

- `design-reference/` contains the approved mockups as working HTML with the
  final design. Convert the mockup to React with Tailwind tokens for the
  auth pages' visual style. If your output differs from the mockup's design
  system, the mockup is right.
- `reference/` is read-only donor code from an older, different product. Use
  it for wiring patterns only. NEVER copy an AI prompt from it.
- The login method is an open decision (`docs/RULES.md` §5) — build email +
  password now, and structure the page so an OAuth button or an OTP flow can
  be added without restructuring. Do not hard-code a single provider
  assumption. Do not build Mobile+OTP.
- Do not modify `middleware.ts` or `app/auth/callback/route.ts` — both are
  protected files and this ticket does not authorize touching them.
- Never use a hard-coded hex colour. Always use the tokens in
  `tailwind.config.ts`.
- The product name is undecided. Use the literal string `[Product Name]`.
- Do NOT install shadcn/ui or run any shadcn command. That path was tried
  and reverted — it overwrote `lib/utils.ts`, `app/globals.css`,
  `app/layout.tsx` and `components/ui/Button.tsx` with its own unrelated
  design system despite flags meant to prevent that. Build every component
  by hand, the same way `components/ui/` was built in TASK-001.

Write your report to `docs/reports/TASK-005.md` using the exact format in
`docs/HERMES.md` §6, including the literal output of `npm run build` and
`npm run lint`. Then set Status back to `NEEDS_REVIEW` in this file and stop.

---

## How this works

**Status** is always exactly one of:

| Status | Meaning | Who acts |
|---|---|---|
| `WAITING` | Nothing queued. Do nothing. | Nobody |
| `READY` | A task is queued below, not yet started | **Hermes** picks it up |
| `IN_PROGRESS` | Hermes is currently working on the queued task | Nobody — wait |
| `NEEDS_REVIEW` | Hermes finished and wrote a report. Awaiting CTO review | **CTO** picks it up |

### If you are Hermes, triggered by the scheduler

1. Read this file.
2. If **Status is anything other than `READY`** — do nothing else. Exit immediately. This is normal, not an error; it means there is no new work yet.
3. If **Status is `READY`**:
   a. Immediately change Status to `IN_PROGRESS` and save this file. Do this before anything else, so a second trigger firing early does not double-start the same task.
   b. Read `docs/RULES.md`, then `docs/HERMES.md`, then the **Queued task** section below — it contains your full instruction for this round, in the same form the founder used to paste directly.
   c. Execute exactly that task, exactly as `docs/HERMES.md` describes. One ticket, one commit, nothing more.
   d. Write your report — the exact format from `docs/HERMES.md` §6 — to `docs/reports/TASK-0NN.md` (matching the ticket number).
   e. Change Status to `NEEDS_REVIEW` and save this file.
   f. Stop. Do not start another task. Do not touch this file again until it next says `READY`.

### If you are the CTO, checking in

1. If Status is `NEEDS_REVIEW`: read `docs/reports/TASK-0NN.md`, review the actual code exactly as before — do not approve on the report's word alone.
   - **Approved:** write the next task into **Queued task** below, set Status to `READY`. Done — the loop continues on its own next trigger.
   - **Needs a fix:** write the fix instructions into **Queued task** (same ticket, corrective spec), set Status to `READY`.
   - **A founder decision is needed** (an open decision, a Needs-Review-gated ticket, anything RULES.md §5 covers): set Status to `WAITING`, and raise it with the founder directly in conversation — **never** resolve it by writing to this file.
2. If Status is `WAITING` or `IN_PROGRESS`: nothing to do. Check again later.

### The one rule that keeps this safe

**Only the CTO writes `READY`. Only Hermes writes `IN_PROGRESS` and `NEEDS_REVIEW`.** A ticket from `docs/TASKS.md`'s "Blocked / Needs Review" section is never queued here without the founder having explicitly signed off in conversation first — the autonomy in this file is about removing copy-paste, not about removing the founder from decisions that are actually theirs.
