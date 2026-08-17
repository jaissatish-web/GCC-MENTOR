# WORKING AGREEMENT — who does what, and what "done" means

---

## 1. The three roles

| Role | Who | Owns |
|---|---|---|
| **Founder** | The repository owner | Every product and business decision. Non-technical. |
| **CTO / reviewer** | Claude Code | This documentation, the specs, and review of every change before it is approved |
| **Builder** | Hermes, a separate desktop AI app | Executes a written spec exactly as given |

**The founder decides. The CTO specifies and reviews. The builder implements.**

The CTO does not only review — it also builds directly, by founder instruction.
The split, settled by practice:

**The CTO builds directly when the work is:**
- security-critical — row-level security, database privileges, service-role usage,
  anything touching personal data
- destructive or irreversible — hard deletes, migrations against the live database
- payment-adjacent — anything that decides whether something has been paid for
- the AI prompt-building or grounding-validation pipeline, where output *quality* is
  decided rather than only correctness
- small enough that specifying it costs more than doing it

**Hermes builds:** UI screens, CRUD routes, restyles, and any well-specified
mechanical change. Both tracks get **identical** review discipline.

---

## 2. How work is handed over

Work lives in [`WORK_QUEUE.md`](WORK_QUEUE.md) — **only work that is not yet
done.** When something ships, it leaves the queue and the part-document it affects
is updated instead. The queue never becomes a history file; that is what
`archive/` is for, and it is closed.

**Handing a job to Hermes:**
1. The CTO writes the item in the queue: what to change, what must not change,
   files involved, and how it will be checked.
2. The founder pastes it **verbatim**. No ad-hoc additions in chat — an instruction
   that exists only in a chat message cannot be reviewed against.
3. Hermes follows the item and the documents it names. Nothing else.
4. Hermes reports. **The CTO reviews the actual diff, never the report.**
5. Approved work leaves the queue and the docs are updated in the same sitting.

**One job at a time, one commit per job.** Hermes stops after each one and waits.
The review gate between jobs is the entire point.

---

## 3. When to stop instead of proceeding

**Stopping costs one message. Guessing costs a review cycle, a revert, and
trust.** Stop and report if:

1. The spec is ambiguous, or two documents contradict each other
2. The job appears to need out-of-scope work
3. A protected file would have to change (see §5)
4. A table or column would have to be dropped or renamed
5. Payment, authentication or personal-data storage would be touched and the job
   does not explicitly say so
6. A new dependency would be needed — propose it and wait
7. A security issue is discovered — report it, never fix it inline
8. The build fails for a reason you did not introduce
9. The job cannot be completed for any reason

**A found bug is recorded in [`14_OPEN_ITEMS.md`](14_OPEN_ITEMS.md), not fixed in
passing** — unless it is trivially small and directly in the way, in which case
say so explicitly.

**When the founder's instruction conflicts with a written decision:** say so
plainly in one or two sentences and ask. Do not silently comply. Do not silently
refuse. If the founder confirms after hearing the conflict, that is the decision —
build it, and log it in [`15_DECISION_LOG.md`](15_DECISION_LOG.md).

**The four things that are refuse-and-explain regardless of who asks:** weakening
the grounding rule, adding a passport number field, logging personal-data values,
skipping server-side payment verification.

---

## 4. Definition of done

A job is not done until **all** of these are true:

1. It does exactly what its spec says — no more, no less
2. `npx tsc --noEmit` passes with no new errors
3. `npm run lint` passes with no new errors
4. `npm run build` completes
5. Any new AI generation path carries the grounding instruction and passes the
   validator
6. No personal data is logged, exposed, or newly stored in violation of the rules
7. Any schema change is applied to the live database **and confirmed by querying
   the catalogue**, not by absence of error
8. Any change to templates passes the exhaustive field-combination baseline
9. The affected documentation is updated in the same change
10. The commit message says what changed and why

**Self-certification is not sufficient.** Payment, security and personal-data work
additionally requires CTO review before it is approved.

---

## 5. Engineering rules

- TypeScript strict. No `any` without a written justification comment.
- Every API route begins with an authentication check and returns 401 when absent.
- Every async function has error handling. Every route returns correct status codes.
- Never hardcode a key, secret or credential. Never commit an `.env` file.
- Always use parameterised queries. Never concatenate SQL.
- Never drop or rename an existing table or column without an explicit instruction.
- Every schema change ships as a **numbered migration file**. Never edit schema
  directly against the live database.
- Never `git push --force`, `git reset --hard`, or skip hooks.
- One job per commit. Never commit `node_modules`, `.next` or build output.
- Work on `main`. Do not create branches unprompted.

**Protected files — do not modify without an explicit instruction naming the file:**

`middleware.ts` · `lib/supabase/client.ts` · `lib/supabase/server.ts` ·
`app/auth/callback/route.ts` · `lib/ai/grounding.ts` · `lib/packageAccess.ts` ·
`tailwind.config.ts`

---

## 6. Verification standards

Beyond build and lint, the standard depends on what changed. See
[`02_PHILOSOPHY.md`](02_PHILOSOPHY.md) §4 for why each of these exists.

| What changed | How it must be verified |
|---|---|
| A migration | Query the live catalogue for the column, constraint, index **and grants** |
| A privilege or policy | Attempt the forbidden operation with a real anonymous key and confirm it is refused |
| A gate or a payment check | Assert every malformed input shape fails **closed** |
| A template or renderer | Run the exhaustive field-combination baseline |
| A user-facing screen | Load it in a running browser and confirm behaviour, not source |
| A flow change | Check **every** screen and writer downstream of it, not only the diff |

**Where verification was not possible, say so.** A known gap stated plainly is
worth more than an optimistic claim. Two standing gaps: no authenticated page has
ever been verified in a browser in the CTO's environment, and this machine has
limited memory, so leaving a dev server and a production build running
simultaneously corrupts the build cache.

---

## 7. Keeping this documentation true

**A decision is written down before the code is written.** It goes in
[`15_DECISION_LOG.md`](15_DECISION_LOG.md), and every part-document it affects is
updated in the same sitting.

**This has failed four times.** The documentation fell behind the code repeatedly —
once by 17 jobs, once by 22 — and each time the next session spent hours
reconstructing the truth from commit history before it could safely change
anything. In the worst case, the specification actively forbade features that were
already shipped and live.

Two habits prevent the recurrence, and both are cheap:

- **Update the part-file, not a status log.** A rolling "latest update" section
  grows forever and is read by nobody. The facts belong in the file that owns them.
- **Never let the docs describe a plan as though it were the product.** If
  something is built but unreachable, or specified but unbuilt, it says so in those
  words.
