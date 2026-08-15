# Planned-Service Visual Treatment — Mock Interview, Q&A, Saved Jobs

**Status:** Stage 2 documentation. Governs how three explicitly-future
services are represented visually in this redesign, per
`STAGE1_DECISIONS.md` items 4–9. Zero functionality, backend, database,
API, or fictional data is built for any of these three in this pass.

## Why this pattern, not another one

This is not a new invention. It restyles a pattern the current app
already uses and has already proven out once:

- `app/dashboard/page.tsx`'s `LOCKED` array rendered **Cover Letter** as
  exactly this kind of dashed, badged, non-functional tile — labelled
  `Phase 3` — before TASK-065/066 made it real. The tile disappeared and
  was replaced by a real nav destination the moment the feature shipped.
- `app/page.tsx`'s `comingSoon` array already does the same thing on the
  homepage for **Mock Interview**, **Question Paper Generator**, **Gulf
  Career Guidance**, and **AI Career Assistant** — dashed cards, "Preview
  only" badge, existing copy, no fabricated claim of function.

This document formalizes that existing pattern as the single, consistent
treatment for all three founder-approved future services, rather than
each page inventing its own "coming soon" styling.

## Tile anatomy

| Element | Spec |
|---|---|
| Border | 1px dashed `--line-strong` (never solid — solid means real/clickable-through) |
| Fill | `--surface-2` (light) / `rgba(242,245,240,.03)` (dark) |
| Badge | "Planned" — neutral outline badge, **never** a phase number, date, or percentage (nothing not actually decided) |
| Title | Service name, plain — "Mock Interview," "Q&A / Interview Prep," "Saved Jobs" |
| Description | One line, plain language, describing what it *will* do — never a live number, never a sample result |
| Interaction | Tap/click shows a short honest note (e.g. "Mock Interview — planned for a future release.") — same `showLocked()`-style micro-interaction the dashboard already has for locked services today. No functional action follows the tap. |

## Where each tile appears

| Surface | Mock Interview | Q&A / Interview Prep | Saved Jobs |
|---|---|---|---|
| Dashboard "Planned" row | ✅ | ✅ | ✅ |
| Homepage "Coming Soon" section | ✅ (existing copy, unchanged) | Existing "Question Paper Generator" card covers this territory — kept as-is, not renamed, since renaming existing public copy is a content decision beyond this redesign's scope | ❌ — not added as a public claim (Stage 1 decision item 9) |
| Desktop sidebar / tablet overlay | ⚠️ **dimmed, non-interactive** (see amendment) | ⚠️ same | ⚠️ same |
| Mobile bottom bar / "More" sheet | ❌ never | ❌ never | ❌ never |

The dashboard "Planned" row is new *placement* but not new *content* — it
consolidates tiles that (for Mock Interview and, arguably, Q&A) already
exist elsewhere in the app today, just scattered between the dashboard's
old `LOCKED` array and the homepage's `comingSoon` array. This redesign
gives them one consistent home and one consistent visual treatment.

## What must never happen

- No fake score, count, or preview output on any Planned tile.
- No *interactive* nav entry, on any breakpoint, for any of the three. See the
  2026-08-15 amendment below for the one permitted, non-interactive form.
- No backend call, no new table, no new API route, no new field — a
  Planned tile is pure static content, string props only.
- No implication of a ship date, phase number, or priority order that
  hasn't actually been decided by the founder.

## Graduation path (documentation only — not built now)

When a founder decision eventually approves building one of these for
real, precedent is Cover Letter's own history:

1. Backend/data ticket(s) ship first, reviewed under the project's normal
   security/quality discipline (same as every other feature).
2. The Planned tile for that one service is removed from the Dashboard
   "Planned" row and the homepage "Coming Soon" section (if present
   there).
3. A new real destination is added to the nav list in
   `DESIGN_SYSTEM.md` §8.1 — a one-line addition to an ordered array, not
   a navigation redesign, because the nav component was built (per Stage
   1 item 8) to expect this.
4. A `PAGE_SPECS.md`-style entry is written for the new real page,
   following the same template every other route in this redesign
   already uses.

This section exists so a future session doesn't have to re-derive the
process — it does not authorize starting step 1 for any service today.

---

## Amendment — 2026-08-15 (founder decision)

The original rule was **"No nav entry, on any breakpoint, for any of the
three."** The founder asked for these services to be visible in the desktop
sidebar so users can see where the product is going.

Presented with the options, the founder chose the **dimmed, non-interactive**
treatment over fully-clickable entries. That distinction is the whole point:

- The rule existed to stop a user tapping a nav item and hitting a dead end.
  Navigation is the highest-trust surface in the app, and a link that goes
  nowhere is the same category of problem as a generated CV claiming an
  achievement the user never had.
- A dimmed, unclickable row with a "Soon" badge makes a *promise about the
  roadmap*, not a *claim about the product*. Nothing can be tapped, so nobody
  can be led anywhere. The intent of the original rule survives.

**What is now permitted**, and only this:

| Element | Spec |
|---|---|
| Placement | Desktop sidebar and tablet overlay, in a separate group under a "Coming soon" heading, always BELOW every real destination |
| Element type | Plain `<div>` — never `<a>`, never `<button>`, not even a disabled one (a disabled control can still take focus in some browsers, putting a keyboard user on a row that does nothing) |
| State | `aria-disabled="true"` so assistive tech announces it rather than the user discovering it by trying |
| Styling | Dimmed text and icon, outline "Soon" badge |
| Mobile | Still excluded from the bottom bar and the "More" sheet — space there is scarce and every slot should be something that works |

Source of truth is `PLANNED_NAV_ITEMS` in `components/layout/navItems.ts`, whose
type deliberately has **no `href` field** so a future edit cannot quietly turn
one of these into a link.

The graduation path below is unchanged: building one for real still means
shipping the backend first, then removing it from this group and adding a real
entry to `NAV_ITEMS`.
