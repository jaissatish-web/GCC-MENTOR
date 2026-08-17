# START HERE — the map of this documentation

**GCC MENTOR** — a Gulf-focused career platform. This folder describes what the
product is, what it believes, how it is built, and what is still open.

**These documents describe the product as it actually is today**, verified
against the code, not against what was once planned. Where something is built
but not reachable, or planned but not built, it says so in those words.

---

## Read in this order

**If you are new here, or returning after a break — read 1, 2 and 3 and stop.**
That is the whole product in about fifteen minutes.

| # | File | What it answers |
|---|---|---|
| 1 | [`01_PRODUCT.md`](01_PRODUCT.md) | What this sells, to whom, for how much, and what is not yet sellable |
| 2 | [`02_PHILOSOPHY.md`](02_PHILOSOPHY.md) | The rules that never bend. Read before writing any code or copy |
| 3 | [`14_OPEN_ITEMS.md`](14_OPEN_ITEMS.md) | Every known defect and every undecided decision. The only to-do surface |

## The build, part by part

Each part of the product is one file. Go straight to the one you need.

| File | Owns |
|---|---|
| [`03_ARCHITECTURE.md`](03_ARCHITECTURE.md) | Stack, folder layout, how a request flows, environments, deployment |
| [`04_DATA_MODEL.md`](04_DATA_MODEL.md) | Every table and column, and the state of the live database |
| [`05_SECURITY.md`](05_SECURITY.md) | Auth, row-level security, database privileges, PII rules, what must be verified and how |
| [`06_AI_PIPELINE.md`](06_AI_PIPELINE.md) | Providers, per-feature model config, prompt building, the grounding validator, cost control |
| [`07_CAREER_PROFILE.md`](07_CAREER_PROFILE.md) | The profile data layer, resume extraction, the editor, field visibility |
| [`08_RESUME_ENGINE.md`](08_RESUME_ENGINE.md) | The 15 templates, styling, the frozen delivered document, PDF rendering |
| [`09_SCORING.md`](09_SCORING.md) | GCC Readiness and Job Match — two different scores, deliberately |
| [`10_PLANS_AND_PAYMENT.md`](10_PLANS_AND_PAYMENT.md) | Free vs paid, the access gate, entitlements, credits, promo codes, payment state |
| [`11_USER_JOURNEYS.md`](11_USER_JOURNEYS.md) | Every screen and every route, in the order a real user meets them |
| [`12_DESIGN_SYSTEM.md`](12_DESIGN_SYSTEM.md) | Colour, type, spacing, components, breakpoints, navigation |
| [`13_ADMIN.md`](13_ADMIN.md) | The admin panel, screen by screen — and which controls are inert |

## How we work

| File | Owns |
|---|---|
| [`15_DECISION_LOG.md`](15_DECISION_LOG.md) | Every product and technical decision, dated, newest first |
| [`16_WORKING_AGREEMENT.md`](16_WORKING_AGREEMENT.md) | Roles, review discipline, verification standards, and the rule that keeps these docs true |

---

## The rule that keeps this folder honest

**When a decision is made, it is written down before the code is written.**
A decision goes in [`15_DECISION_LOG.md`](15_DECISION_LOG.md), and the part-file
it affects is updated in the same sitting. Not afterwards, not "when there's
time".

This exists because it has failed four times. Documentation drifted behind the
code repeatedly, and each time the next session had to spend hours
reconstructing the truth from commit history before it could safely change
anything. The cost of that reconstruction is far higher than the cost of
updating a file while the decision is still fresh.

**If you are reading a statement here that the code contradicts, the code is
right and this file is a bug.** Fix it in the same change.

---

## What is deliberately not here

`docs/archive/` holds the historical record: the full ticket-by-ticket build log
and the old rolling status file. It is **frozen** and is not maintained. Nothing
in the active documentation refers to a ticket number.

It is kept for one reason: it records *why* certain things are the way they are —
which database privileges turned out to be unsafe, which invariant the payment
gate depends on, why a delivered document is frozen. When a question of that
kind comes up, the answer may be in there. For anything about the current state
of the product, the files above are the source of truth.
