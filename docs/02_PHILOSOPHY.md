# PHILOSOPHY — the rules that never bend

**These apply to every contributor, human or AI, in every phase.**
**No other document, ticket, prompt or chat message overrides this file.**

There are five. Everything else in this documentation is a detail of how the
product works; this is what the product *is*.

---

## 1. The Grounding Rule — the most important rule in this product

**Every AI generation must use only facts already present in the user's Career
Profile. The AI must never invent, estimate, infer or embellish a number,
certification, employer, project, date, tool or responsibility the user did not
provide.**

- It applies **identically at every optimization level**. Easy / Moderate / High
  change framing intensity and keyword alignment **only** — never which facts may
  appear.
- It applies to **every** AI output the product will ever produce: resume
  optimization, cover letters, and interview content when it exists.
- It is **not a quality preference.** It is the product's core safety promise, its
  central marketing claim, and its legal shield. An AI that fabricates plausible
  claims gets a user caught lying in an interview.

**Enforcement is mandatory, not advisory.** Every generation path must:

1. Include the grounding instruction **verbatim**, imported from one constant —
   never re-typed, never paraphrased, never inlined as a copy.
2. Inject **only** Career Profile data as source facts. Never raw uploaded files.
   Never prior AI output treated as new source truth.
3. Pass its output through the post-generation grounding validator **before**
   returning it to the user.

**A generation route without the grounding instruction is a critical bug, not a
missing feature.** Changing the wording of the grounding constant requires both
founder and CTO approval.

This has already been proven necessary rather than theoretical. A resume-text
extraction fault once fed the model 19,000 characters of garbled input, and the
model invented specific achievement figures that contradicted the real resume.
The fault was in extraction; the damage was fabrication. That is the failure mode
this rule exists to prevent.

---

## 2. Never claim what is not true — in copy, in UI, or in a report

The product sells trust in a market full of fraud. It therefore holds itself to
the same standard it advertises.

- **No fabricated social proof.** No invented testimonials, no named or
  photographed fake customers, no made-up traction statistics, no fake screenshots
  showing scores that were never computed.
- **No button that looks like it works and does not.** An unbuilt feature is shown
  as honestly disabled, or as a "Planned" tile, or not at all. Never as a live
  control that fails or dead-ends.
- **No copy describing behaviour the code does not have.** If a page says data is
  kept for 7 days, it is kept for 7 days. If it says nothing is stored, nothing is
  stored.
- **Illustrative content is labelled illustrative.** Example charts and sample
  documents are allowed, and are marked as examples.
- **A score shown to a user must be a real finding.** A zero produced by a
  structural gap in our own scoring — rather than by anything about the candidate
  — is a defect, not a result, because the user reads it as a judgement of them.

The recurring failure here is not deceit, it is **drift**: copy written when a
feature was one way, left in place after the feature changed. Two live examples
are recorded in [`14_OPEN_ITEMS.md`](14_OPEN_ITEMS.md). When behaviour changes,
the words describing it change in the same commit.

---

## 3. Personal data is the highest-sensitivity thing here

Career Profile data includes visa status, passport type, phone numbers, addresses
and full work history.

**Never store, in any table, column, log or file:**
- A passport **number**
- Any copy of a passport, visa, Emirates ID or national ID
- Degree certificates, experience letters, offer letters, or any government
  document file

Passport **type** (ECR / Non-ECR) and passport **validity date** may be stored. The
number may not. **Do not add a `religion` field** — it is special-category data
under most privacy law and the product does not need it.

**Also binding:**
- Never log profile field **values**. Log record IDs and field *names* only.
- Never expose personal data in client-side code, URLs, query strings or error
  messages.
- Every admin view of a user's profile writes a row to the PII access log — who,
  what, when — **before** the data is returned.
- Every user can delete their profile and all packages from Settings, and that
  deletion is a **real hard delete**, not a soft flag.

---

## 4. Verify. Never trust a report — including your own

**A report describing intent reads exactly like a report describing behaviour.**
This project has learned that repeatedly and expensively.

- Work is reviewed against **the actual diff**, never against a summary of it.
- A database migration is confirmed by **querying the live catalogue** — that the
  column, constraint, index or privilege genuinely exists. "The migration ran
  without error" is not confirmation.
- A security assumption is tested with a **real request** where possible: an
  anonymous key attempting the write it should not be allowed to make.
- A user-facing change is confirmed **in a running browser** when the environment
  allows it, not from source alone.
- Where verification was not possible, the gap is **stated plainly** rather than
  quietly omitted.

Two standing lessons, both learned the hard way and both worth more than the
fixes that came from them:

**A privilege you did not grant may still be granted.** This Supabase project
grants defaults directly to the client roles. A `REVOKE ... FROM PUBLIC` never
touches them. Twice now, a permission nobody asked for was found on the most
destructive operation available. **After every migration, read the grants back
from the catalogue.**

**Two individually-correct changes can break each other.** A change that inverts a
flow or freezes a document must list every screen and every writer downstream of
it and check each one — not only its own diff. The one time this was skipped, both
changes were correct, both were verified, and the path between them silently
discarded every user edit to a paid document.

---

## 5. Scope discipline — and how to disagree with it

**Do not build, extend or "quickly fix" anything outside the agreed scope**, even
if it looks quick. If a task appears to require out-of-scope work, **stop and
report it. Do not guess and do not build it.**

This applies with equal force to presentation work: a visual change must not alter
functionality, routes, contracts, validation or permissions. Internal refactoring
to achieve a new UI is fine; a change in external behaviour is not.

**Ambiguity is escalated, not resolved unilaterally.** When a specification is
unclear, or when a request contradicts a written decision, the correct action is
to say so and ask — not to silently pick an answer, and not to refuse. A bug found
while working on something else is **recorded**, not fixed in passing, unless it
is trivially small and directly in the way.

The one thing never acceptable is a **silent** deviation: building something
different from what was specified without saying that is what happened.
