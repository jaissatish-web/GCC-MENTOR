# GCC MENTOR — Visual Redesign: Design System Reference

**Status:** Stage 2 of 3 (Documentation). Stage 1 (visual direction) approved by the
founder 2026-08-11 — see `docs/redesign/STAGE1_DECISIONS.md` for the exact
locked decisions this document builds on. **This is documentation only. No
application code changes yet.** Hermes implementation prompts are Stage 3,
written only after the founder approves everything in this Stage 2 set
(`DESIGN_SYSTEM.md`, `PAGE_SPECS.md`, `PLANNED_SERVICES.md`).

**Scope discipline, unchanged from Stage 1:** this document changes how
GCC MENTOR looks. It does not add, remove, or alter any feature, route
behavior, API contract, database field, or business rule. Every component
below is a *visual* specification of something that already exists, already
has approved data/logic (GCC Readiness, Job Match, Cover Letter), or is
explicitly marked Planned (Mock Interview, Q&A, Saved Jobs — zero
functionality, see `PLANNED_SERVICES.md`).

---

## 1. Color system

Two themes, one token set. Every color below is a CSS custom property —
components reference the token name, never a literal hex value, so a future
palette tweak is a one-file change.

> ### ⚠ THE PALETTE IS NAVY, NOT GREEN — corrected 2026-08-16
>
> This section described a **forest green** brand primary. TASK-112 moved the
> product to **navy** at the founder's request, by changing the token VALUES and
> keeping the green NAMES. The names below are therefore historical: `--forest`
> is navy, and `--forest-dark` is a light blue.
>
> That is a live hazard, not a cosmetic one. Anyone — human or agent — choosing
> a colour by its name chooses wrong, and it has already shipped two real
> defects: near-black text on a navy button (1.69:1, invisible) and white form
> labels on a white card ("Full name" could not be seen at all). Both reached
> the founder in normal use.
>
> This restores the direction `docs/DESIGN.md` §1 stated from the very
> beginning: **navy = action, gold = purchase and readiness**. The redesign's
> green was the divergence; the code has since returned to the original plan
> while carrying the wrong labels.
>
> **Correct values as shipped today** (`tailwind.config.ts` is authoritative):
>
> | Token | Value | Actually is |
> |---|---|---|
> | `--forest` | `#1B4272` | Navy — primary action |
> | `--forest-deep` | `#0B1F38` | Near-black navy — dark surfaces |
> | `--forest-dark` | `#6BA3E0` | **Light blue**, for use ON dark surfaces |
> | `--forest-tint` | `#E7EEF8` | Pale blue tint fill |
>
> Renaming the tokens to `navy` / `navy-deep` / `sky` is the outstanding fix.
> Until that lands, read the value, never the name.

### 1.1 Brand & neutral tokens

| Token | Light value | Dark value | Use |
|---|---|---|---|
| `--forest` | `#1B4272` (navy) | `#6BA3E0` | Brand primary — primary action, links, progress |
| `--forest-deep` | `#0B1F38` | `#081627` | Dark surfaces — sidebar, optimizing screen, landing hero |
| `--forest-tint` | `#E7EEF8` | `#152B3B` | Tint fill |
| `--gold` | `#C98A2E` | `#E8B15C` | Primary CTA fill, focus ring, accent — **fill only, see §9 accessibility** |
| `--gold-text` | `#8A5A1E` | `#F3CD8B` | Gold-*colored text/links* on their theme's base surface — a distinct, darker token from `--gold` on light backgrounds (see §9) |
| `--gold-tint` | `#FBF1DF` | `#26301F` | Shortlisted/attention tint fill |
| `--amber` | `#B9691D` | `#E2933E` | Secondary accent — partial/warning status |
| `--terra` | `#B4472B` | `#E27A54` | Error/risk status |
| `--terra-tint` | `#F7E7E1` | `#3A2018` | Error/risk tint fill |
| `--ink-900` | `#17241F` | `#F2F5F0` | Primary text |
| `--ink-700` | `#45544D` | `#C2CDC4` | Secondary text |
| `--ink-400` | `#7C8981` | `#83988C` | Muted text, captions, disabled |
| `--ink-200` | `#DFE4DE` | `#2C4A3A` | Borders on recessed surfaces |
| `--line` | `#E4E1D6` | `#20402F` | Hairline border |
| `--line-strong` | `#CFCABB` | `#2E5A41` | Input border, card border |
| `--bg` (paper) | `#FBFAF6` | `#0E1B16` | Page background |
| `--surface` | `#FFFFFF` | `#132A21` | Card/panel background |
| `--surface-2` | `#F4F2EC` | `#193527` | Recessed fill (metric tiles, code blocks) |

All neutrals carry a deliberate warm/green undertone — never a pure
desaturated grey. This is a direct, explained deviation from the reference
images' own neutral values, which are literally Tailwind's stock `slate`
scale (approved in Stage 1, item 1).

### 1.2 Semantic color is separate from brand

Status color (success/warning/error) never borrows the accent hue (gold)
outside of `shortlisted`, which is gold-tinted by design (matches the
existing `Pill` component's `shortlisted` variant). Gold otherwise means
"action," not "state" — a rule carried forward unchanged from the existing
app.

### 1.3 Icon system — new dependency, approved 2026-08-11

**Approved for use. Documented explicitly per the founder's requirement
that dependency installation never happen silently.**

| | |
|---|---|
| **Library** | Heroicons |
| **Exact package** | `@heroicons/react` (npm, MIT license, maintained by the Tailwind CSS team) |
| **Version to install** | Latest v2 (`^2.x`) — v2 is the version compatible with the icon set style (outline/solid) referenced in the design images |
| **Why needed** | The current app has no icon library — `Sidebar.tsx`, `Button`, and `Pill` all use plain Unicode glyphs (◆ ◎ ▤ ◈ ⚙, etc.), not SVG icons. All three reference images use Heroicons; a denser, component-heavy nav and badge system (9-item sidebar, mobile "More" sheet, Locked/Planned tiles, admin tab nav) reads more consistently with real SVG icons than with Unicode glyphs, which render inconsistently across platforms/fonts. |
| **Where it will be used** | Sidebar/bottom-nav/"More" sheet item icons (§8.1–8.3), button icon slots where a button pairs an icon with a label (e.g. "Optimize resume for a job" +), Locked/Planned tile icons (`PLANNED_SERVICES.md`), status/empty-state illustrations. **Not** used to replace the mono/serif number-and-text-driven data displays (readiness ring, scores) — those stay typographic, not iconographic. |
| **Not used for** | Anything that would require a second icon set — one library only, no mixing, per the anti-drift rules (§13). |

This is a **frontend-only, zero-runtime-behavior dependency** — pure SVG
React components, no network calls, no data. It does not touch any API
contract, business logic, or backend file. The actual `npm install
@heroicons/react` command is a line item in Stage 3's foundation ticket
(`docs/redesign/STAGE3_IMPLEMENTATION_PLAN.md`), called out explicitly so
it is never silently introduced by a later, unrelated ticket.

---

## 2. Typography

| Role | Font | Size | Weight |
|---|---|---|---|
| Display (landing hero only) | Serif | 44–56px | 600 |
| H1 | Serif | 32px | 700 (Bold) |
| H2 | Serif | 24px | 600 (SemiBold) |
| H3 | Sans (Inter) | 18px | 700 (Bold) |
| Body | Sans (Inter) | 14px | 400 (Regular) |
| Small | Sans (Inter) | 12px | 500 (Medium) |
| Eyebrow / label | Sans (Inter) | 11px | 700, uppercase, `letter-spacing: .14em` |
| Data / mono | Mono | 22–26px | 400, `font-variant-numeric: tabular-nums` |

**Rule (approved Stage 1, item 2):** serif is reserved for headlines,
greetings, and the wordmark — the same convention the current app already
uses (`font-serif` throughout). Inter carries every UI chrome element,
label, button, and body paragraph. Mono is reserved for anything where
digits must align in a column: scores, prices, counts, IDs. No page may
introduce a fourth typeface or reassign these roles.

Body copy targets ~65 characters per line on desktop; headings use
`text-wrap: balance` so they don't ladder unpredictably.

---

## 3. Spacing

8px grid: `4 · 8 · 12 · 16 · 24 · 32 · 40 · 48 · 64`. (16, 20, and 64 are
additions to the reference's own list, which skipped steps a real layout
needs — flagged and approved in Stage 1.) Layout uses `gap` on flex/grid
containers, never accumulating per-element margins.

---

## 4. Grid & containers

| Context | Max width | Structure |
|---|---|---|
| App shell | 1600px | Sidebar 248px (desktop) · Main flexible · Right rail 340px (desktop ≥1280px only) |
| Marketing/landing | 1280px | Single column, generous side padding |
| Forms (Career Profile, Settings) | 900px | Single readable column; two-up for short paired fields |
| Admin | 960px | Single column, denser vertical rhythm |

Desktop composition is never a stretched mobile layout — every app-shell
page uses the sidebar+main(+rail) structure, never a single centered
column wider than 900px floating in empty space.

---

## 5. Radius & shadow

| Radius | Value | | Shadow | Value |
|---|---|---|---|---|
| sm | 6px | | sm | `0 1px 2px rgba(23,36,31,.07)` |
| md | 12px | | md | `0 6px 16px rgba(23,36,31,.09)` |
| lg | 16px | | lg | `0 20px 44px rgba(23,36,31,.14)` |
| xl | 20px | | CTA glow | `0 6px 18px rgba(201,138,46,.35)` (gold buttons only — the one deliberately loud element on a screen, unchanged principle from the current app) |
| full | 9999px | | | (dark theme shadows use black-based rgba at lower opacity — see component CSS) |

---

## 6. Buttons

Maps 1:1 onto the existing `buttonVariants` — same variant names in code,
restyled only.

| Variant | Visual | Use |
|---|---|---|
| `primary` | Forest-deep fill, light text | Default action |
| `purchase` (CTA) | Gold fill, near-black text, glow shadow | The one primary action per screen — payment, "Analyze a Job," "Optimize" |
| `progress` | Forest fill, white text | In-flow confirm actions (save, continue) |
| `secondary` | White/surface fill, strong border | Secondary action alongside a primary |
| `ghost` | Transparent, translucent border | Tertiary / on dark surfaces |
| `disabled` | Surface-2 fill, muted text | Non-interactive state |

Minimum touch target 44px height, unchanged from the current app's own
rule. Focus state: 2px gold outline, 1px offset, on every interactive
element without exception.

---

## 7. Forms

Text input, select, textarea, toggle, checkbox/radio, file upload (used by
onboarding's resume upload) — single shared field anatomy: label above,
13.5px Inter value text, `--line-strong` border, gold focus ring. Two-up
`form-grid` for short paired fields (city/country, start/end date) on
desktop and tablet; single column on mobile. File upload uses a dashed
`--line-strong` drop-zone card, matching the Locked/Planned tile's dashed
convention elsewhere in this system (dashed = "not yet filled/active,"
consistent meaning across both contexts).

---

## 8. Cards, tables, navigation, modals, badges

**Cards** — `--surface` background, `--line` border, `--r-lg` radius,
`shadow-sm` at rest, `shadow-md` on hover-lift where the card is a link.
One card shape, used everywhere — dashboard tiles, recommendation cards,
admin summary cards, package cards. No page defines its own card style
(anti-drift rule, §13).

**Tables** — used only in Admin (Access Log, Promo Codes) and Library
(desktop only — mobile uses cards, see `PAGE_SPECS.md`). `--line-strong`
header rule, `--line` row rules, 12.5px body text, mono for any ID/count
column.

**Navigation** — the single most load-bearing spec in this document,
detailed in full:

### 8.1 Desktop sidebar (≥1024px)

Fixed 248px, `--forest-deep` background. Nine real destinations, in order:
**Dashboard · Career Profile · GCC Readiness · Job Match · Resume
Optimizer · Cover Letter · Library · Payments · Settings.** Exact-pathname
active-state highlighting (gold border + tint, matching the admin nav's
own already-approved pattern from TASK-075). No locked/Planned items
appear here — see §8.4 and `PLANNED_SERVICES.md` for why.

### 8.2 Tablet (768–1023px)

Sidebar collapses to icon-only (48px), expandable on tap/hover into the
full labeled list as an overlay — same nine destinations, same order,
nothing hidden.

### 8.3 Mobile (<768px) — bottom nav + "More" sheet

**Bottom bar, 5 slots:** Dashboard · Career Profile · Resume Optimizer ·
Library · **More**.

**"More" sheet** (bottom drawer, same `--surface` card treatment as a
modal, dismiss on backdrop tap or swipe-down): every destination not in
the bottom bar — **GCC Readiness, Job Match, Cover Letter, Payments,
Settings** — listed in the same order as the desktop sidebar, same icon,
same label, full tap target. **This is the founder's explicit
requirement: no destination becomes unreachable on mobile.** The five
items named in the approval message are exactly the five that live in
this sheet.

### 8.4 What never appears in navigation, on any breakpoint

Mock Interview, Q&A/Interview Prep, and Saved Jobs (Planned) never appear
in the sidebar, the tablet overlay, the bottom bar, or the "More" sheet —
consistent with the founder's rule and with the existing app's own
principle ("never expose a nav destination that doesn't exist"). They
surface only as content-level Planned tiles (§10, and fully specified in
`PLANNED_SERVICES.md`). Opportunities/job-board, Resources, Notifications,
and Premium/subscription appear nowhere at all — no tile, no nav entry,
no placeholder — until separately approved.

**Modals/drawers** — new pattern (today's app is full-page/inline-banner
almost exclusively). Forest-deep surface, gold-outlined primary action,
dismiss on backdrop click/swipe or Esc. Used for: the mobile "More" sheet,
and any single irreversible confirmation (e.g. deleting a package).
Never used to hide a full form — forms stay full-page or inline.

**Badges/status pills** — maps 1:1 onto the existing `Pill` variants
(`applied · shortlisted · interview · visa_processing · offer · risk ·
grounded`), restyled colors only, same seven meanings, no eighth invented.

---

## 9. Accessibility — contrast verification

Stage 1 approval (item 3, "deeper green/gold for contrast") was
conditional on accessibility remaining strong. Verified against WCAG 2.1
AA (4.5:1 normal text, 3:1 large text/UI) using the actual token values
above, not asserted:

| Pair | Ratio | AA (4.5:1 text) | Notes |
|---|---|---|---|
| `--ink-900` text on `--bg` (light) | ~15:1 | ✅ | |
| `--forest` text on `--bg` (light) | 7.6:1 | ✅ | |
| `--terra` text on `--bg` (light) | 5.2:1 | ✅ | |
| **`--gold` (#C98A2E) text on `--bg` (light)** | **2.8:1** | **❌ fails, even for large text (3:1)** | **Do not use raw `--gold` as text color on a light surface** |
| `--gold-text` (#8A5A1E) on `--bg` (light) | 5.6:1 | ✅ | Use this token instead — mirrors the existing app's own `state-gold-text` convention, which already exists for exactly this reason |
| Dark button text (`#1E1305`) on `--gold` fill | 6.2:1 | ✅ | Gold as a *fill* with dark text on top is safe — the failure above is only gold *as text* |
| `--gold-light`/`--gold-text` (dark theme) on dark `--bg` | 11.7:1 | ✅ | |
| Dark-theme body text on dark `--bg` | ~15:1+ | ✅ | |

**One concrete rule this produces:** gold is safe as a button/badge fill
(dark text on top) and safe as text on dark surfaces. It is **not** safe
as a link or label color directly on the light paper background — use
`--gold-text`, not `--gold`, whenever gold-colored text sits on `--bg` or
`--surface` in light mode. This is now a hard rule in §13 anti-drift.

---

## 10. AI-result, resume, and Planned-service components

**Readiness ring** — the existing `ReadinessRing`/`calculateReadiness()`
output, restyled: conic-gradient gold arc over `--surface-2` track,
centered mono score + "Ready" label.

**Job Match breakdown** — per-category rows (Required Skills, GCC
Experience, Certifications, etc.), each a label + a `Pill` (`grounded` /
`risk` / `shortlisted` depending on score band), plus the AI's one-sentence
explanation per category — same data shape TASK-071/072 already produce.

**Grounding notice** — a fixed, non-optional one-line callout ("Every
generated line traces to a fact already in your Career Profile") on every
AI-output screen: Resume Optimizer, Cover Letter, Job Match. Never styled
away, never removed by a page-level design choice.

**Resume/package card** — target role + country, status `Pill`, created
date, generation count (mono) — the same fields the current Library
already renders.

**Locked/Planned tile** — fully specified in `PLANNED_SERVICES.md`; summary
here: dashed `--line-strong` border, `--surface-2` fill, a neutral
"Planned" badge (never a fake phase number), one honest description line,
never a number, never a preview of output.

---

## 11. Loading, empty, error, success states

Real copy, reused wherever the same situation occurs — no page invents its
own wording for a state another page already has copy for.

| State | Treatment | Existing copy reused |
|---|---|---|
| Loading | Skeleton pulse, `--surface-2` blocks; named-step progress (not a bare spinner) for any AI call, matching the existing optimize flow's step names | "Applying Gulf CV format," etc. |
| Empty | Dashed-border card, muted body text | "No activity yet — optimize a resume and it will show up here." |
| Error | `--terra` border/tint, specific and actionable, never vague | "AI provider is not configured. Set it in /admin first." |
| Success | `--forest`-tinted inline confirmation | "Saved." |

---

## 12. Component reuse map

| Component | Used on |
|---|---|
| `Button` (6 variants) | Every page |
| `Card` | Dashboard, Library, Package detail, Recommendations, Admin, GCC Readiness, Job Match, Cover Letter |
| `Pill` | Library, Package detail, Job Match, Admin Promo Codes/Access Log |
| Sidebar / bottom-nav+More | Every authenticated app-shell page |
| Readiness ring | Dashboard, GCC Readiness, /ats-scan |
| Job Match breakdown | Job Match, /ats-scan, Optimize preview (findings-only view) |
| Grounding notice | Resume Optimizer, Cover Letter, Job Match |
| Locked/Planned tile | Dashboard, Landing page (Coming Soon section) |
| Table | Admin (Access Log, Promo Codes), Library (desktop) |
| Form field set | Career Profile, Settings, Optimize/target+setup, Onboarding |
| Modal/drawer | Mobile "More" sheet, irreversible-action confirmations |

Every full-page spec in `PAGE_SPECS.md` names components from this table
by name — a Hermes prompt built from this document reuses first, invents
only when the table has no entry.

---

## 13. Anti-drift rules

1. Every card is the `Card` component from §8 — no page defines its own
   border-radius, shadow, or padding.
2. Every button is one of the six named variants in §6 — never a one-off
   color.
3. Every status is a `Pill` variant from §8 — never raw colored text.
4. Headlines are serif, UI chrome is Inter, numbers are mono — no
   exceptions per-page.
5. `--gold` is a fill color; `--gold-text` is a text color on light
   surfaces. Never swap them (§9).
6. No nav destination — sidebar, tablet overlay, bottom bar, or "More"
   sheet — is ever added for a service without an approved, real page
   behind it. Planned services live only in Locked/Planned tiles.
7. Every Hermes prompt built from `PAGE_SPECS.md` names which existing
   components it reuses before naming anything new — reuse is the
   default, a new component is the exception that needs a stated reason.
