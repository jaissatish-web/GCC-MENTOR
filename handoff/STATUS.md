STATE: READY

# handoff/STATUS.md — CTO ↔ Hermes relay marker

**This file is a mailbox, not documentation.** It is polled by Hermes's
scheduled job on a fixed interval. The `STATE:` line on line 1 is the only
thing that matters mechanically — everything else here is protocol notes for
whoever (human or agent) is reading this file.

If you are Hermes, triggered by your scheduler: **read this file first,
before `docs/RULES.md`, before `docs/HERMES.md`, before anything else.**

---

## States

| STATE | Meaning | Who acts |
|---|---|---|
| `WAITING` | Nothing queued. Do nothing. | Nobody |
| `READY` | A task is queued below, not yet started | **Hermes** picks it up |
| `IN_PROGRESS` | Hermes is currently working on the queued task | Nobody — wait |
| `NEEDS_REVIEW` | Hermes finished and wrote a report. Awaiting CTO review | **CTO** picks it up |

### If you are Hermes, triggered by your scheduler

1. Read this file.
2. If **`STATE` is anything other than `READY`** — do nothing else. Exit immediately, quietly. This is normal, not an error.
3. If **`STATE` is `READY`**:
   a. Immediately change line 1 to `STATE: IN_PROGRESS` and save this file. Do this before anything else, so an overlapping trigger cannot double-start the same task.
   b. Read `docs/RULES.md`, then `docs/HERMES.md`, then the **Queued task** section below in this file — it is your full instruction for this round.
   c. Work **only** inside `D:\claude work\GCCSAAS`. Your `workdir` setting anchors you here by default but does not enforce it — treat this as a hard rule regardless.
   d. Execute exactly that task, exactly as `docs/HERMES.md` describes. One ticket, one commit, nothing more.
   e. Write your report — the exact format from `docs/HERMES.md` §6 — to `handoff/RESULTS/TASK-0NN.md` (matching the ticket number, not a timestamp — the CTO looks these up by ticket, not by when they ran).
   f. Change line 1 to `STATE: NEEDS_REVIEW` and save this file.
   g. Stop. Do not start another task. Do not touch this file again until it next says `READY`.

### If you are the CTO, checking in

1. If `STATE` is `NEEDS_REVIEW`: read `handoff/RESULTS/TASK-0NN.md`, review the actual code exactly as before — never approve on the report's word alone.
   - **Approved:** write the next task into **Queued task** below, set `STATE: READY`.
   - **Needs a fix:** write the fix instructions into **Queued task** (same ticket, corrective spec), set `STATE: READY`.
   - **A founder decision is needed** (an open decision, a Needs-Review-gated ticket, anything `docs/RULES.md` §5 covers): set `STATE: WAITING`, raise it with the founder directly in conversation — **never** resolve it by writing to this file.
2. If `STATE` is `WAITING` or `IN_PROGRESS`: nothing to do. Check again later.

### The one rule that keeps this safe

**Only the CTO writes `READY`. Only Hermes writes `IN_PROGRESS` and `NEEDS_REVIEW`.** A ticket from `docs/TASKS.md`'s "Blocked / Needs Review" section is never queued here without the founder having explicitly signed off in conversation first.

---

## Queued task

Execute TASK-006, and only TASK-006. Do not start, plan, or partially
implement any other ticket.

Full spec is in `docs/TASKS.md` under TASK-006 ("Migrations folder setup").
Summary: create `supabase/migrations/README.md` documenting that migrations
are numbered (`010_`, `011_`, …), applied manually by the founder in the
Supabase SQL Editor, additive by default, and every new table must have RLS
enabled with an owner-only policy before it is considered complete. Include
a copy-paste checklist the founder follows when applying one. **No SQL in
this ticket** — this is documentation only, no schema changes.

Key things `docs/HERMES.md` will tell you, stated here so there is no doubt:

- This ticket has no dependency on any other ticket and touches no
  application code — it is pure documentation for a folder that does not
  exist yet.
- Never use a hard-coded hex colour (not applicable to this ticket, but
  stated for consistency).
- Do NOT install shadcn/ui or run any shadcn command. That path was tried
  and reverted.

Write your report to `handoff/RESULTS/TASK-006.md` using the exact format
in `docs/HERMES.md` §6, including the literal output of `npm run build`
and `npm run lint`. Then set line 1 of this file back to
`STATE: NEEDS_REVIEW` and stop.
