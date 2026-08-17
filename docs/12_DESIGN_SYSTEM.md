# DESIGN SYSTEM — one visual language, no per-page invention

`tailwind.config.ts` is authoritative. It is a **protected file**.

---

## ⚠ 1. Read the value, never the name

**The colour tokens are named for the wrong colours.**

The palette moved from green to **navy** by changing the token **values** and keeping
the green **names**. So `forest` is navy, and `forest-dark` is a **light blue** meant
for use *on* dark surfaces.

**This is a live hazard, not a cosmetic annoyance.** Anyone — human or AI — choosing a
colour by its name chooses wrong, and it has already shipped two real defects that
reached the founder in normal use: near-black text on a navy button (1.69:1 contrast,
effectively invisible), and white form labels on a white card, where "Full name" could
not be seen at all.

**Correct aliases exist. Use them. Treat `forest*` as deprecated.**

| Use this | Value | Is |
|---|---|---|
| `navy` | `#1B4272` | Primary action |
| `navy-deep` | `#0B1F38` | Dark surfaces — sidebar, hero, optimizing screen |
| `navy-tint` | `#E7EEF8` | Pale tint fill |
| `sky` | `#6BA3E0` | Light blue **for text and borders on dark navy** |

**Outstanding work:** migrate the remaining `forest*` usages across the app to the
correct names, then delete the aliases. Recorded in
[`14_OPEN_ITEMS.md`](14_OPEN_ITEMS.md).

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

**Nine destinations, in this founder-specified order:**

Dashboard · Create Resume · Career Profile · Resume Library · Resume Templates ·
Job Match · Resume Optimizer · Cover Letter · Settings

The order is deliberate: the two things a returning user does most sit directly under
Dashboard, and the creation entry point comes before the tools that operate on what was
created. **Payments is deliberately absent** — it lives inside Settings.

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
