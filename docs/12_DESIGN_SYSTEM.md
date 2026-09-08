# DESIGN SYSTEM — one visual language, no per-page invention

`tailwind.config.ts` is authoritative. It is a **protected file**.

---

## 0. BLUEPRINT — the current identity

**Chosen by the founder 2026-09-08** from three mocked directions, and rolled out across
the whole application. The brief it answers: the product should look like an
**instrument, not a brochure**. Its users are piping, E&I and commissioning engineers who
read technical drawings all day, so the language is drawn from that — a tight grid, mono
figures, sharp corners, and ONE signal colour that means "act".

| Token | Value | Role |
|---|---|---|
| `paper` | `#EEF0F1` | Page ground |
| `white` | `#FFFFFF` | Panels, the surfaces that matter |
| `graphite` | `#101519` | Headings, dark stages |
| `graphite-soft` | `#3B4650` | Body text |
| `slate` | `#5B6B76` | Muted, secondary |
| `signal` | `#C2410C` | The one accent. Primary action, money, current tab |
| `signal-ink` | `#9A3412` | Text ON a signal tint; hover |
| `signal-tint` | `#FCE9E1` | Soft signal fill |
| `edge` | `#D8DDE0` | Hairline. Decorative, never carries meaning |
| `edge-strong` | `#76838E` | Input borders, which DO carry meaning |

**Radius 4px** (`rounded-bp`) and 6px (`rounded-bp-lg`) — drawn, not rounded.
**Type:** Archivo (`font-bp-display`) for headings, Inter for body, IBM Plex Mono for
every figure, always with `tabular-nums` so a changing number does not shift its
neighbours.

### The rules that make it work

1. **One accent, spent once per screen.** The moment `signal` appears twice it stops
   meaning "this is the thing to do". The old palette had navy for primary AND gold for
   purchase; both collapsed into `signal`.
2. **Not everything is a panel.** Metrics are figures on a rule. Lists are rows divided
   by rules. A border, a fill and a shadow each say "separate object" — spend them on
   things that are one.
3. **`edge` is decorative, `edge-strong` is meaningful.** A hairline separating two
   sections may sit below 3:1; the border of an input may not.

### Contrast, measured

| Pair | Ratio |
|---|---|
| `graphite` on `paper` / `white` | 16.07 / 18.37 |
| `graphite-soft` on `paper` / `white` | 8.43 / 9.64 |
| `slate` on `paper` / `white` | 4.82 / 5.51 |
| `signal` on `white`, and white on `signal` | 5.18 / 5.18 |
| `signal-ink` on `signal-tint` | 6.22 |
| `edge-strong` on `paper` / `white` | 3.40 / 3.88 |

**Two traps, both found by measuring rather than looking:**
- **`signal` on `signal-tint` is 4.41 and FAILS.** Text on a tinted fill uses
  `signal-ink`. A hue never pairs with its own tint.
- **`signal-ink` on `signal` is 1.41.** Text on the solid accent is white.

### What is deliberately NOT Blueprint

- **`components/templates/**`** — the CV renderers. A delivered resume is a frozen
  document whose styling is the user's own choice. Repainting the app must never repaint
  someone's CV.
- **The landing page and `components/marketing/`** — dark navy and gold, and the
  strongest visual asset the product owns. Converting it is a separate decision. When the
  global serif default was removed from `globals.css`, three landing headings that
  relied on it were pinned explicitly so the page renders exactly as before.

---

## 1. One name per colour

**Resolved 2026-09-08.** This section used to open with a warning: read the value,
never the name, because `forest` was navy and `forest-dark` was a light blue. That
warning is gone because the condition it described is gone.

The `forest*` tokens were renamed across 50 files and **the aliases were deleted**, so
there is now exactly one name for each colour and it is the true one:

| Was | Is | Value | Role |
|---|---|---|---|
| `forest` | `navy` | `#1B4272` | Structure, primary action |
| `forest-deep` | `navy-deep` | `#0B1F38` | Hover, headers |
| `forest-deep-dark` | `navy-deepest` | `#081627` | Dark chrome — sidebar, mobile nav |
| `forest-tint` | `navy-tint` | `#E7EEF8` | Soft fill, active nav |
| `forest-tint-dark` | `navy-tint-dark` | `#14304F` | Soft fill on dark |
| `forest-dark` | `sky` | `#6BA3E0` | Text and borders ON dark navy |

**Why the aliases had to go, and not just be deprecated.** Honest aliases were added
first, pointing at identical values, with the old names left valid so nothing had to be
rewritten at once. That was the right first move and the wrong place to stop: while both
names resolved, the trap stayed fully armed, and the app went on using the misleading
name in 291 places. A deprecated name that still works is not deprecated.

**Verified, not assumed:** every colour declaration in the compiled stylesheet was
captured before and after the rename and compared. 191 declarations, identical. The
rename changed no rendered pixel.

**One name is deliberately NOT in this table.** `lib/resumeStyle.ts` offers a resume
accent called **Forest** (`#2A6F4E`) — a genuine green a user picks for their own CV.
It is unrelated to this palette and was left untouched.

## 1b. The type floor — nothing readable is under 12px

**Applied 2026-09-08.** The app carried **238 occurrences of text below 12px**, including
20 at 9px and 30 at 10px, and not only in admin — they were in the optimizer, the resume
library, onboarding and the landing page. On a 375px phone held at arm's length, 9px is
decoration rather than text.

**12px is a hard floor** and is reserved for captions, eyebrows and pill labels. Nothing
a user must act on — a value, a field label, anything inside a form — goes below 13px.

305 sizes were raised or consolidated across 46 files:

| Was | Is | Why |
|---|---|---|
| 9, 9.5, 10, 10.5, 11, 11.5px | **12px** | Below the readable floor |
| 12.5px | 13px | Half a pixel is not a distinction a reader can see |
| 13.5px | 14px | ” |
| 14.5px | 14px | ” |

Distinct sizes fell from **24 to 16**. The remaining ten are 17px and above — heading
sizes, deliberately untouched, because they are a per-screen composition decision and
belong with `PageShell` adoption where one component will own them.

**What raising a floor surfaces.** Two mobile bottom-nav labels stopped fitting: measured
with the real font at 12px, a 4-item bar on a 320px screen gives each item 80px, and
"Resume Library" renders at 84px. `NavItem.shortLabel` now supplies a bar-only label
("Library", "Profile", "Optimize"); the sidebar and the More sheet keep the full names,
because they have the room and the full name is clearer.

---

## 1d. Contrast is measured, not judged

**Every text/surface pair in this system has a measured ratio.** Two defects had already
shipped from eyeballing it — near-black on navy at 1.69:1, and white labels on a white
card — and a third was caught during this work: `Alert`'s first draft used `text-info`,
which is not a token, so no rule was generated and the text inherited the body's
near-white at **1.05:1**.

A missing Tailwind colour produces no error. It produces no rule. That is why measuring
is the standard here and not a nicety.

| Pair | Ratio |
|---|---|
| `ink-900` on `surface-light` | 17.15 |
| `ink-700` on `surface-light` | 7.71 |
| `ink-400` on `surface-light` | 5.29 |
| `ink-400` on `bg` | 5.02 |
| `ink-400` on `surface-2-light` | 4.67 |
| Alert `danger` / `warning` / `info` / `success` | 4.51 / 5.26 / 8.69 / 7.01 |

**The floor is 4.5:1** for body text, 3:1 for large text and UI boundaries. `ink-400` was
darkened from `#6B7A8D` to `#5F6D7D` on 2026-09-08 to meet it — it had been failing on
all three surfaces across 314 call sites.

---

## 1b2. The page frame — and the limit of one frame

**`PageShell` adoption began 2026-09-08.** It went from 3 screens to 11: the eight admin
screens now share one width, one heading size and one header rhythm, where six were
`max-w-3xl`/`text-2xl`, one was `960px`/`text-2xl` and one was `960px`/`text-[26px]`.

**The frame now owns the typeface.** Among the first three adopters, two set
`font-redesign-sans` themselves and one did not — so `/templates` rendered in a different
face from `/cover-letter` and nobody had noticed. A page cannot own its own font if the
frame exists to make screens feel like one product.

### The audit said 31 screens. That number was too blunt.

Reading each screen's actual shape rather than its width value, the app has **three page
shapes, not one**, and `PageShell` only fits the first:

| Shape | Screens | Frame |
|---|---|---|
| **Page** — title, then content, scrolls | admin ×8, templates, cover letter, GCC readiness, library, settings, visibility, package view | `PageShell` |
| **Focused task** — one centred card, no page furniture | pay, generate, login, signup, onboarding steps | **No shared frame yet** |
| **Staged wizard** — full-height, its own stage header | optimize target, optimize setup | Deliberately bespoke |

**Forcing a centred task screen into a top-aligned page header would make it worse, not
more consistent.** Consistency means the same shape gets the same treatment — not that
every screen gets the same treatment.

**Next:** the remaining page-shaped screens, then a `FocusShell` for the centred group,
which has five real adopters waiting and so is worth building.

---

## 1c. Shared state components

**Added 2026-09-08.** Three components that did not exist, which is why call sites
hand-rolled their own.

| Component | Replaces | Why it is a component |
|---|---|---|
| `Alert` | 70 hand-written `text-terra` strings | There was no way to tell a field problem from a failed request from a standing warning — all three rendered identically. The four variants are that distinction. `role`/`aria-live` are set by variant, not left to the call site. |
| `EmptyState` | 9 different phrasings | Almost none offered the action that would fill the space. `action` is a first-class prop: on the resume library an empty list is a new user's FIRST screen, so a dead end there is a lost user. |
| `Skeleton` | 3 of 34 screens had any loading design | These users are on Gulf mobile networks and several screens wait 8–45s on a model call. The loading state is one of the most-seen screens in the app and was the least designed. Motion sits behind `prefers-reduced-motion`; the group carries one `aria-live` announcement so a screen reader hears "loading" once, not nine bars. |

**Every variant is contrast-checked before it ships.** That is not ceremony — the first
version of `Alert` used `text-info`, which is **not a token**, so it generated no rule,
the text inherited the dark body's near-white `marble`, and the result was white on pale
blue at **1.05:1**. Silent, because a missing Tailwind colour produces no error. Measured
and fixed to `text-navy` (8.69:1). Current ratios: danger 4.51, warning 5.26, info 8.69,
success 7.01.

`SectionNav` and `ScoreDisplay` were in the audit's list and are **deliberately not built
yet**: their only adopters are the Career Profile and Readiness screens. Building them
now would create the exact unused-component problem this whole effort exists to undo.

---

## 2. The colour intent

**navy = action · gold = purchase and readiness · terracotta = caution**

| Token | Use |
|---|---|
| `gold` | Primary call-to-action **fill**, focus ring, accent. Fill only — see §6 |
| `gold-text` | Gold-coloured **text or links**. A distinct, darker value |
| `amber` | Secondary accent — partial or warning status |
| `terra` | Error and risk status |
| `ink-900 / 700 / 400 / 200` | Text: primary, secondary, muted, recessed borders |
| `line`, `line-strong` | Hairline border; input and card border |
| `bg`, `surface`, `surface-2` | Page background; card; recessed fill |

**Status colour never borrows the accent hue.** Gold means "action", not "state" — the
one exception is the shortlisted status, which is gold-tinted by design.

Neutrals carry a deliberate warm undertone rather than a pure desaturated grey.

---

## 3. Typography

| Role | Font | Size | Weight |
|---|---|---|---|
| Display (landing hero only) | Serif | 44–56px | 600 |
| H1 | Serif | 32px | 700 |
| H2 | Serif | 24px | 600 |
| H3 | Inter | 18px | 700 |
| Body | Inter | 14px | 400 |
| Small | Inter | 12px | 500 |
| Eyebrow / label | Inter | 11px | 700, uppercase, `.14em` tracking |
| Data / numbers | Mono | 22–26px | 400, tabular numerals |

**Serif is reserved for headlines, greetings and the wordmark.** Inter carries every
piece of UI chrome, label, button and paragraph. Mono is only for places where digits
must align in a column: scores, prices, counts, IDs.

**No page introduces a fourth typeface or reassigns these roles.** Body copy targets
~65 characters per line on desktop; headings balance their wrapping.

---

## 4. Spacing, grid and containers

**8px grid:** `4 · 8 · 12 · 16 · 24 · 32 · 40 · 48 · 64`. Layout uses `gap` on flex and
grid containers — never accumulating per-element margins.

| Context | Max width | Structure |
|---|---|---|
| App shell | 1600px | Sidebar 248px · flexible main · 340px right rail at ≥1280px |
| Marketing | 1280px | Single column, generous side padding |
| Forms (profile, settings) | 900px | One readable column; two-up for short paired fields |
| Admin | 960px | Single column, denser rhythm |

**Desktop is never a stretched mobile layout.** Every signed-in page uses the
sidebar-and-main structure, not a single centred column floating in empty space.

**Radius:** 6 / 12 / 16 / 20 / full. **Shadow:** three steps, plus one gold CTA glow —
the single deliberately loud element on a screen.

---

## 5. Components

Nine shared primitives, in `components/ui/`: **Button · Card · Input · Textarea ·
Select · Pill · Toggle · ProgressBar · ReadinessRing**. Plus `LockedTile` for planned
services, and a shared `PageShell` frame.

**Buttons** — six variants: `primary` (navy-deep fill), `purchase` (gold fill,
near-black text, glow — the one primary action per screen), `progress` (navy fill, for
in-flow confirm), `secondary`, `ghost`, `disabled`.

**Minimum touch target 44px.** Focus state: 2px gold outline, 1px offset, on **every**
interactive element without exception.

**Cards** — one card shape used everywhere. No page defines its own.

**Forms** — one field anatomy: label above, `line-strong` border, gold focus ring.
Two-up for short paired fields on desktop, single column on mobile.

**Dashed borders mean one thing consistently: not yet filled or not yet active.**
File drop-zones and planned-service tiles both use it.

**Tables** — admin and the desktop Library only. Mobile uses stacked labelled cards.

---

## 6. Accessibility — the finding that shaped the palette

**Raw gold fails as text on light backgrounds: 2.8:1, below the AA threshold.**

Found by measuring real contrast ratios rather than trusting that a brand colour would
work. The fix is a separate `gold-text` token at 5.6:1, which passes. So:

**Gold is a fill colour. `gold-text` is a text colour. They are not interchangeable.**

Two related rules learned from shipped defects:
- **Check the contrast of both layers, not just the background.** Near-black text on a
  navy button measured 1.69:1.
- **On an SVG `<text>` element, `text-*` classes do nothing** — SVG colour comes from
  `fill`. A readiness ring's score silently never changed colour between states because
  of this.

Helper and muted text uses the `ink-400` token, **not** an opacity wash on primary
text. Opacity washes were used in 22 places on one page alone and were measurably too
low-contrast.

---

## 7. Navigation

**One typed array is the single source of truth** (`components/layout/navItems.ts`).
The desktop sidebar, the mobile bottom bar and the "More" drawer all render from it.

They used to be three separate copies, and they had **already drifted** — the mobile
bar still showed a renamed item and a destination that had moved.

**Eight destinations, in this founder-specified order:**

Dashboard · Career Profile · Resume Library · Resume Templates ·
Job Match · Resume Optimizer · Cover Letter · Settings

The order is deliberate: the two things a returning user does most sit directly under
Dashboard, and the tools that operate on what was created follow. **Payments is
deliberately absent** — it lives inside Settings. **"Create Resume" was removed from
the nav (2026-08-18):** its three ways to start (upload · paste · fill manually) now live
on the Career Profile page itself, so the profile is the one place a user both sees their
data and rebuilds it. The `/create-resume` route still exists for the dashboard's
first-run CTA and the onboarding fallback — it is only gone from the menu.

**Breakpoints:** desktop (≥1024px) shows the full 248px rail; tablet (768–1023px)
collapses to icon-only, expandable on tap, with nothing hidden; mobile (<768px) uses a
5-slot bottom bar plus a "More" drawer holding **every** remaining destination, so
nothing becomes unreachable on a phone.

**Planned services appear in the nav dimmed and non-interactive**, under their own
"coming soon" heading — never as links. This was a deliberate change from the original
rule of "no nav entry at all": the founder wanted the roadmap visible, and chose the
dimmed treatment specifically so nobody taps into a dead end. **They carry no link
target by construction**, so they cannot accidentally become clickable later.

Active state: exact-match for Dashboard only, since it is a prefix of the Library
route; prefix-match everywhere else, so the highlight survives a multi-step flow.

---

## 8. Anti-drift rules

1. **Never a literal hex value in a component.** Reference a token.
2. **One card, one button set, one field anatomy.** No page invents its own.
3. **One icon library** — Heroicons. Never mix a second set.
4. **Read the token value, not its name** (§1).
5. **Copy changes in the same commit as the behaviour it describes.**
6. **Presentation changes never alter functionality**, routes, contracts, validation or
   permissions.

**The one place these rules cannot apply, and why:** print templates. The PDF pipeline
renders to static markup with no stylesheet, so a Tailwind-classed template produces a
completely unstyled PDF — the actual paid deliverable. Templates therefore use inline
styles from a single tokens file mirroring the Tailwind config. **Those two files must
be kept in step by hand.**
