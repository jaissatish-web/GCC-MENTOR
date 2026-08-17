# GCC MENTOR — Visual Redesign: Stage 3 Implementation Plan

**Status:** Stage 3 of 3. Stage 1 (direction) and Stage 2 (design system +
page specs) are both approved. This document is the sequencing/dependency
layer over the 23 Hermes tickets (`TASK-076`–`TASK-098`) now added to
`docs/TASKS.md`. **This plan does not implement anything — it is the map
for how the tickets in `docs/TASKS.md` get executed and reviewed.**

## Non-negotiables carried into every ticket

Every one of the 23 tickets below opens with, verbatim:

> **VISUAL/PRESENTATION IMPLEMENTATION ONLY — DO NOT CHANGE EXISTING
> FUNCTIONALITY.**

And closes with the same two-part acceptance gate: a **functional-parity
check** (API contracts, business rules, data behavior, authorization,
validation, and functional outcomes unchanged — internal refactoring for
the new UI is fine, external behavior is not) and a **visual QA check**
(matches `DESIGN_SYSTEM.md` tokens exactly, no invented component, correct
desktop/tablet/mobile behavior per `PAGE_SPECS.md`). A ticket is not done
until both pass — the same "never trust the report alone" review
discipline this project has used since TASK-051.

## Why this ordering

Every page ticket depends on the four foundation tickets shipping first —
building a page against tokens/components that don't exist yet would mean
redoing it. Everything *after* foundation is ordered by real dependency,
not arbitrary preference: layout shells before the pages inside them, the
three new pages after Dashboard (which is the first place their "Quick
Actions" links appear), admin last since it's visually independent of the
consumer app and lowest urgency (it was just restructured in TASK-075).

```
Foundation (076 → 079, strictly sequential)
   │
   ├─→ Marketing/Auth (080–082) ─── independent of App Core, can run in parallel
   │
   └─→ App Core (083–090, mostly independent of each other after 083)
          │
          └─→ New pages (091–093, depend on Dashboard's Quick Actions links)
   │
   └─→ Admin (094–098, independent of everything above except Foundation)
```

Within App Core and Admin, tickets are independent of each other once
their own layout-shell ticket (078 for App Core, 094 for Admin) ships —
they can be assigned to Hermes in any order after that point, and a
failed one only blocks a re-review of itself, never a sibling page.

## The 23 tickets

| # | Ticket | Depends on | Touches |
|---|---|---|---|
| 1 | TASK-076 — Design tokens + icon dependency | — | `tailwind.config.ts`, `package.json` |
| 2 | TASK-077 — Shared UI primitives restyle | 076 | `components/ui/*` |
| 3 | TASK-078 — Navigation system (sidebar, tablet, bottom-nav+More) | 076, 077 | `components/layout/*` |
| 4 | TASK-079 — Locked/Planned tile component | 076, 077 | `components/ui/LockedTile.tsx` (new) |
| 5 | TASK-080 — Landing page | 076–079 | `app/page.tsx` |
| 6 | TASK-081 — Login/Signup | 076–079 | `app/login`, `app/signup` |
| 7 | TASK-082 — Onboarding + Extracting | 076–079 | `app/onboarding/*` |
| 8 | TASK-083 — Dashboard | 076–079 | `app/dashboard/page.tsx` |
| 9 | TASK-084 — Career Profile + Visibility | 076–079 | `app/profile/*` |
| 10 | TASK-085 — Optimize Target + Setup | 076–079 | `app/optimize/target`, `/setup` |
| 11 | TASK-086 — Optimize Payment | 076–079 | `app/optimize/pay/[packageId]` |
| 12 | TASK-087 — Optimize Preview/Diff | 076–079 | `app/optimize/preview/[packageId]` |
| 13 | TASK-088 — Library + Package Detail | 076–079 | `app/dashboard/library`, `app/package/[id]` |
| 14 | TASK-089 — /ats-scan | 076–079 | `app/ats-scan/page.tsx` |
| 15 | TASK-090 — Settings + Payments | 076–079 | `app/settings`, `app/payments` |
| 16 | TASK-091 — /gcc-readiness (new page) | 076–079, 083 | `app/gcc-readiness/page.tsx` (new) |
| 17 | TASK-092 — /job-match (new page) | 076–079, 083 | `app/job-match/page.tsx` (new) |
| 18 | TASK-093 — /cover-letter (new page) | 076–079, 083 | `app/cover-letter/page.tsx` (new) |
| 19 | TASK-094 — Admin shell/nav | 076–077 | `app/admin/layout.tsx`, `AdminNav.tsx` |
| 20 | TASK-095 — Admin Dashboard + AI Provider | 094 | `app/admin/page.tsx`, `app/admin/ai-provider` |
| 21 | TASK-096 — Admin Prompts + Promo Codes | 094 | `app/admin/prompts`, `app/admin/promo-codes` |
| 22 | TASK-097 — Admin Packages + Users | 094 | `app/admin/packages`, `app/admin/users` |
| 23 | TASK-098 — Admin Access Log | 094 | `app/admin/access-log` |

Full ticket text (spec, do-not-touch list, acceptance criteria) is in
`docs/TASKS.md`, in ticket-ID order, ready to paste to Hermes one at a
time exactly as every prior ticket in this project has been.

## Review process — unchanged from the rest of this project

Same as every ticket before it: founder pastes one ticket to Hermes,
Hermes implements and reports, founder pastes the report back, Claude
Code reviews the **actual diff**, never the report's word alone — for
these tickets specifically checking both the visual-QA and
functional-parity gates before approving. Multiple review rounds remain
normal, not a failure.

## What Stage 3 explicitly does not include

- No application code has been written by Claude Code as part of this
  plan. Every line of implementation is Hermes's, ticket by ticket,
  reviewed the same way as always.
- No ticket introduces Mock Interview, Q&A, Saved Jobs, Opportunities,
  Resources, Notifications, or Premium functionality — TASK-079 and the
  page tickets that use it only ever render static Locked/Planned tiles.
- No ticket touches a migration, an API route's logic, `lib/ai/*`,
  `lib/admin/*`, or any business-logic file — the do-not-touch list is
  repeated per ticket in `docs/TASKS.md`, not just here.
