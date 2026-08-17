# Archive — frozen, not maintained

**Nothing in this folder is current.** It is kept as a historical record and is not
updated. For the state of the product, start at [`../00_START_HERE.md`](../00_START_HERE.md).

Several files here were **actively wrong** by the time they were archived on
2026-08-17 — `RULES.md` forbade building four features that were already shipped and
live, and `MVP.md` described one resume template and no free tier when the product had
15 templates and a free tier. **Do not follow instructions from this folder.**

---

## Why it is kept

The ticket history records *why* things are the way they are: which database
privileges turned out to be unsafe and how they were found, which invariant the
payment gate depends on, why the delivered document is frozen, why the readiness score
stopped using a model. The durable parts of that were lifted into the active
documentation, but the full reasoning — and the record of what was tried and reverted —
lives here.

| File | What it is |
|---|---|
| `TICKET_HISTORY.md` | The full ticket-by-ticket build log, 163 items. The most detailed record of what happened and why |
| `STATUS_HISTORY.md` | The old rolling status file. Append-only; its newest entry was already 18 tickets behind the code |
| `FOUNDING_BRIEF.md` | The original founding brief — the source of the product's rules |
| `AUDIT.md`, `BOOT_REPORT.md` | Early assessments of the inherited codebase |
| `redesign/` | The three-stage visual redesign plan and its page-by-page specifications |
| everything else | Superseded specifications — see the mapping below |

---

## Where each old file went

| Archived file | Now covered by |
|---|---|
| `RULES.md` | [`02_PHILOSOPHY.md`](../02_PHILOSOPHY.md) and [`16_WORKING_AGREEMENT.md`](../16_WORKING_AGREEMENT.md) |
| `HERMES.md` | [`16_WORKING_AGREEMENT.md`](../16_WORKING_AGREEMENT.md) |
| `PRODUCT.md`, `MVP.md`, `ROADMAP.md` | [`01_PRODUCT.md`](../01_PRODUCT.md) |
| `INFRASTRUCTURE.md` | [`03_ARCHITECTURE.md`](../03_ARCHITECTURE.md) |
| `PROMPTS.md`, `PIPELINE.md` | [`06_AI_PIPELINE.md`](../06_AI_PIPELINE.md) |
| `CAREER_PROFILE.md` | [`07_CAREER_PROFILE.md`](../07_CAREER_PROFILE.md) |
| `GCC_READINESS_JOB_MATCH.md` | [`09_SCORING.md`](../09_SCORING.md) |
| `USER_FLOW.md`, `DASHBOARD_LIBRARY.md` | [`11_USER_JOURNEYS.md`](../11_USER_JOURNEYS.md) |
| `DESIGN.md`, `redesign/DESIGN_SYSTEM.md` | [`12_DESIGN_SYSTEM.md`](../12_DESIGN_SYSTEM.md) |
| `redesign/PAGE_SPECS.md` | [`11_USER_JOURNEYS.md`](../11_USER_JOURNEYS.md) |
| `redesign/PLANNED_SERVICES.md` | [`01_PRODUCT.md`](../01_PRODUCT.md) §7 |
| `ADMIN.md` | [`13_ADMIN.md`](../13_ADMIN.md) |
| `TASKS.md` unplanned findings | [`14_OPEN_ITEMS.md`](../14_OPEN_ITEMS.md) |
| `IDEA.md` | [`00_START_HERE.md`](../00_START_HERE.md) |

**Source-code comments still point at some of the old paths** — for example the
grounding constant cites `docs/PROMPTS.md`, and several files cite `docs/RULES.md` or a
ticket number. Those pointers are stale but harmless; use the table above to find the
current home. They are corrected opportunistically when a file is touched for another
reason, rather than in one sweeping edit across the codebase.
