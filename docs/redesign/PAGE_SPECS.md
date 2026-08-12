# GCC MENTOR — Visual Redesign: Page-by-Page Specification

**Status:** Stage 2 of 3. Builds on `DESIGN_SYSTEM.md` — every component
named below is defined there; this document does not redefine components,
only how they compose per page. **Documentation only — no code changes.**

**How to read each entry:** *Function* states what the page does today,
unchanged. *Functional parity* is the checklist a reviewer (and Hermes)
checks before/after — same data, same actions, same validation, same
permissions, same success/error behavior. *Components* names reuse from
`DESIGN_SYSTEM.md` §12. Desktop/Tablet/Mobile describe layout only.

Mobile nav for every authenticated app-shell page below is the bottom bar
+ "More" sheet from `DESIGN_SYSTEM.md` §8.3 — stated once here, not
repeated per page unless a page has an additional mobile-specific need.

---

## 0. Route audit (2026-08-11, re-verified against the repository, not assumed)

**Method:** `find app -type f \( -name "page.tsx" -o -name "page.ts" -o
-name "not-found.tsx" -o -name "error.tsx" -o -name "loading.tsx" -o -name
"global-error.tsx" -o -name "layout.tsx" \)` run directly against the
working tree, cross-checked against `middleware.ts`'s `PROTECTED_ROUTES`
array.

**Result: 24 existing routes, matching every entry already in §A–D below.
No missing route found; no route in this document does not exist in the
repository.** Full list of existing `page.tsx` files found:

`/` · `/login` · `/signup` · `/onboarding` · `/onboarding/extracting` ·
`/dashboard` · `/dashboard/library` · `/profile` · `/profile/visibility` ·
`/optimize/target` · `/optimize/setup` · `/optimize/pay/[packageId]` ·
`/optimize/preview/[packageId]` · `/package/[id]` · `/ats-scan` ·
`/settings` · `/payments` · `/admin` · `/admin/ai-provider` ·
`/admin/prompts` · `/admin/promo-codes` · `/admin/packages` ·
`/admin/users` · `/admin/access-log`

Plus the three founder-approved new pages (existing logic/data only,
no new routes beyond these three): `/gcc-readiness` · `/job-match` ·
`/cover-letter`. **27 routes total in this document's scope — no others
are created.**

**Two things the audit surfaced, neither requiring a spec change:**

1. **No custom `not-found.tsx`, `error.tsx`, `loading.tsx`, or
   `global-error.tsx` exists anywhere in the app today** — the app relies
   entirely on Next.js's default 404/error/loading rendering. This is not
   a missing route to redesign (a route requires a URL segment; these are
   fallback render behaviors, not pages), and adding custom ones would be
   a **new** page outside the three approved — explicitly not in scope
   this pass. Flagging it as a real, honest gap for a future ticket, not
   silently building it now.
2. **Three layout shells wrap groups of routes and are covered by the
   Navigation System spec (`DESIGN_SYSTEM.md` §8), not as separate page
   entries:** `app/layout.tsx` (root — global fonts/metadata, wraps every
   route including marketing), `app/dashboard/layout.tsx` (the `AppShell`/
   `Sidebar`, wraps every authenticated app-core page), `app/admin/
   layout.tsx` (the `AdminNav` tab bar, wraps all 7 admin pages, from
   TASK-075). These three files are explicit line items in the Stage 3
   implementation plan's foundation phase, since every other page's visual
   correctness depends on them shipping first.

---

## A. Marketing

### `/` — Landing page
**Function (unchanged):** Public homepage. States what's live vs. planned
honestly (`liveServices` vs. `comingSoon` arrays) — no functional or
content change, restyle only.

**Functional parity:** All CTAs route to the same destinations
(`/onboarding`, `#platform`, `/login`). `liveServices` cards keep their
"Live" badge; `comingSoon` cards keep their dashed "Preview only"
treatment and exact existing copy. Pricing section keeps its explicit
disclosure that checkout is still the single-package flow. FAQ content
unchanged.

**Components:** Card, Locked/Planned tile (for the `comingSoon` grid —
same visual family as Dashboard's Planned row, per `PLANNED_SERVICES.md`),
Button (`purchase` for primary CTA, `ghost` for secondary).

**Desktop (≥1024px):** Dark forest-deep hero, skyline photo with gradient,
serif H1, gold eyebrow styled as a small badge-like uppercase label (visual
treatment only — this is the existing eyebrow copy, e.g. "Built for the
Gulf career journey"; it does not mean literal "Coming Soon" text belongs
in the hero — clarified 2026-08-12, TASK-080 review), two-button CTA row,
trust line.
Below: alternating light/dark sections at 1280px max-width — live-services
4-up grid, coming-soon 4-up dashed grid, industries strip, testimonials
3-up, comparison table, pricing 3-up, footer.

**Tablet (768–1023px):** Same section order; grids fall to 2-up; hero
image moves above the headline stack instead of beside it.

**Mobile (<768px):** Single column throughout; hero CTA buttons stack
full-width; comparison table becomes horizontally scrollable (own
`overflow-x` container, page never scrolls sideways); pricing cards stack.

---

### `/login`, `/signup`
**Function (unchanged):** Supabase-session auth forms.

**Functional parity:** Same fields, same validation, same redirect
behavior (`redirectTo` query param honored), same error messaging from
Supabase Auth.

**Components:** Card, form field set, Button (`primary`).

**Desktop:** Centered card, max-width 420px, on a light or subtly-tinted
`--bg` (not the dark hero treatment — this is a utility screen).

**Tablet/Mobile:** Same centered-card composition, full-width with side
padding on mobile.

---

## B. Onboarding

### `/onboarding`
**Function (unchanged):** Resume upload/paste entry point — the start of
the extraction pipeline.

**Functional parity:** Upload and paste-text paths both still call the
same `/api/parse/upload` / `/api/parse/text` endpoints; same file-type/
length validation; same handoff into `/onboarding/extracting`.

**Components:** Card, form field set (file drop-zone variant, dashed
border per `DESIGN_SYSTEM.md` §7), Button (`purchase` for "Extract").

**Desktop:** Centered card, 640px max-width, drop-zone with a paste-text
toggle above/below it.

**Tablet/Mobile:** Same composition, full-width.

---

### `/onboarding/extracting`
**Function (unchanged):** AI extraction progress screen.

**Functional parity:** Same named-step progress sequence, same handoff
into the profile editor via session-draft state (`lib/onboardingDraft.ts`)
on success, same error path on failure.

**Components:** Named-step loading pattern (`DESIGN_SYSTEM.md` §11).

**Desktop/Tablet/Mobile:** Single centered card, step list with
checkmarks as each stage completes — layout is breakpoint-invariant, this
screen is inherently narrow already.

---

## C. App core

### `/dashboard`
**Function (unchanged):** Authenticated home. Every data source is
identical to today: `GET /api/profile`, `GET /api/packages`,
`calculateReadiness()` — same calls, same fields, same logic.

**Functional parity:** Profile Strength = real `readiness_score`. Resumes
Created = real `packages.length`. Next Best Action = the same three-tier
`if/else` over real state (no profile / no packages / has packages) — not
a recommendation engine. Recent Activity = 3 newest real packages.
**One correction from the current build:** the "ATS score check" tile,
still marked locked/"Phase 2" in code, is stale — the ATS scanner has
been live since TASK-058 — this tile is dropped, not carried forward.

**Components:** Card, Readiness ring, Button (`purchase`), Pill (package
status), Locked/Planned tile (new "Planned" row — Mock Interview, Q&A,
Saved Jobs, per `PLANNED_SERVICES.md`).

**Desktop (≥1024px):** Two-column main (1.1fr/1fr): left = greeting +
metric row (Profile Strength, Resumes Created, Latest Job Match — the
third metric is new, backed by the already-existing Job Match engine, not
invented) + "next step" hero strip + Recent Activity + Planned row. Right
rail (340px, ≥1280px) = Readiness ring card, Quick Actions list (Check
GCC Readiness, Analyze a Job Match, Optimize Resume, Generate Cover
Letter, View Library — all five now real per Stage 1/2 approvals),
Library preview.

**Tablet:** Right rail drops below the main column instead of beside it;
metric row falls to 2-up.

**Mobile:** Single column, metric row 2-up, hero strip full-width, Planned
row becomes a horizontally-scrollable strip (own `overflow-x` container).

---

### `/profile`, `/profile/visibility`
**Function (unchanged):** Career Profile editor + field-visibility
controls — the data every downstream feature (Optimizer, Job Match,
Readiness) reads from.

**Functional parity:** Full-object `PUT /api/profile` contract unchanged
(per the existing partial-PUT caveat already documented in
`docs/TASKS.md` Unplanned #7 — not something this redesign touches).
Same required-field set, same tri-state driving-license logic (the exact
class of bug this project has specifically stress-tested before — flagged
here as a must-verify item in the eventual Hermes review, not a new risk
introduced by this document). `/profile/visibility`'s field toggles map to
the same `field_visibility` object.

**Components:** Card, form field set (full range — text, select, date,
repeatable work-experience/education/certification rows), toggle (for
visibility page), Button (`primary` save).

**Desktop:** 900px single readable column; repeatable sections (work
experience, education) use a card-per-entry pattern with an "Add" button
at the bottom of each section, not a giant flat form.

**Tablet:** Same column, `form-grid` two-up fields collapse to one-up
below ~840px.

**Mobile:** Single column throughout; sticky "Save" bar pinned above the
bottom nav so it's reachable without scrolling back up on a long profile.

---

### `/gcc-readiness` *(new route — Stage 1/2 approved, existing logic only)*
**Function (new page, no new logic):** Standalone view of the GCC
Readiness score and breakdown that today only appears embedded in
`/dashboard` and inside `/ats-scan` results. Calls the same
`calculateReadiness()` / `readiness_score` fields — no new computation.

**Functional parity:** Score and "missing" list must match `/dashboard`'s
own readiness card exactly, since both read the same source data — this
is the acceptance test for this page (two surfaces, one number, always).

**Components:** Card, Readiness ring, Pill (per-category status).

**Desktop:** Large readiness ring + category breakdown list side-by-side
(rail-style, ≥1280px) or stacked (1024–1279px); each category row links
back to the relevant `/profile` section when incomplete.

**Tablet/Mobile:** Ring above, category list below, full width.

---

### `/job-match` *(new route — Stage 1/2 approved, existing logic only)*
**Function (new page, no new logic):** Standalone authenticated Job Match
report — the exact gap flagged after TASK-073 ("no UI shows an
authenticated user a Job Match report before Optimize"). Reuses
`lib/jobMatch/*` and `lib/ai/jobMatchExplanation.ts` exactly as `/ats-scan`
already does, via the second `CareerProfileFull` adapter
(`lib/jobMatch/profileAdapters.ts`) that TASK-073 already built for this
purpose.

**Functional parity:** A job description pasted here must produce the
identical `JobMatchResult` shape `/ats-scan` and `/optimize` already
consume — this page is a new *display* of an existing *computation*, not
a new computation.

**Components:** Job Match breakdown, Grounding notice, Card, Button
(`purchase` — "Optimize with these findings," linking into `/optimize`
with the findings carried forward).

**Desktop:** JD-paste form at top (full width, 900px cap); results below
as the Job Match breakdown component, full-width diagnosis paragraph then
category grid (2–3 columns depending on width).

**Tablet:** Same, category grid 2-up.

**Mobile:** Single column throughout.

---

### `/optimize/target`, `/optimize/setup`
**Function (unchanged):** Target job/country/industry selection, then
block/level selection for the optimization run.

**Functional parity:** `target_country` stays optional (TASK-074, already
shipped) — do not re-introduce it as required. Same required-before-
continue gate (title + industry). Same block/level selection fields
submitted to `/api/optimize`.

**Components:** Card, form field set, Button (`primary` continue).

**Desktop:** Centered wizard card, 720px, step indicator above (2 steps).

**Tablet/Mobile:** Same composition, full-width, step indicator condenses
to a progress bar.

---

### `/optimize/pay/[packageId]`
**Function (unchanged):** Payment / promo-code redemption screen.

**Functional parity:** Promo-code redemption calls the same
`redeem_promo_code` RPC path; Razorpay remains blocked/absent exactly as
today (not part of this redesign — see `docs/TASKS.md` TASK-042).

**Components:** Card, form field set (promo code input), Button
(`purchase`).

**Desktop/Tablet/Mobile:** Single centered card throughout — this screen
has no meaningful desktop-density opportunity, breakpoints differ only in
padding.

---

### `/optimize/preview/[packageId]`
**Function (unchanged):** Before/after diff + blurred/watermarked
pre-payment preview (TASK-033/044's server-rendered PNG approach,
unchanged) + post-payment full content with edit capability.

**Functional parity:** Diff tab stays ungated (matches the existing
data-flow decision). Blur/watermark remains server-baked into the PNG,
never a client-side CSS filter. `PATCH /api/packages/[id]` edit path
unchanged.

**Components:** Card, Grounding notice, resume/package card, Button
(`purchase` for pay-to-unlock).

**Desktop:** Two-column — diff/before-after on the left (or tabbed:
Changes / Full CV), resume preview + purchase CTA on the right rail.

**Tablet:** Stacked — preview above, diff/purchase below.

**Mobile:** Single column, tabs instead of side-by-side, purchase CTA
sticky above the bottom nav.

---

### `/cover-letter` *(new route — Stage 1/2 approved, existing backend)*
**Function (new page, existing backend):** The paused TASK-066 frontend —
generation UI for the fully-built Cover Letter backend (TASK-065,
persona-based, same grounding rule and architecture as the Resume
Optimizer).

**Functional parity:** Generation gated on `package.is_paid` + an
available `cover_letter` service credit, consumed only after a validated
success — exactly as TASK-065 built it. Redeem-code entry point
(`/api/redeem-package-promo`) reachable from here or `/settings`, per the
original TASK-066 spec.

**Components:** Card, form field set (persona/tone selection), Grounding
notice, Button (`purchase`).

**Desktop:** Centered form (720px) → generated letter preview below,
full-width once generated, with an edit-in-place textarea.

**Tablet/Mobile:** Same composition, full-width.

---

### `/dashboard/library`, `/package/[id]`
**Function (unchanged):** Package list + individual package detail
(PDF/DOCX download, cover letter access, promo redemption, status).

**Functional parity:** Same list/status/delete API (`DELETE`, status
filter), same reuse-detection re-optimize behavior (TASK-036 — overwrite
only after the new package is confirmed created), same hard-delete
confirmation flow (TASK-037).

**Components:** Table (desktop), resume/package card (mobile/tablet),
Pill (status), Button.

**Desktop:** Library = data table, sortable by date/status, mono for
generation-count column. Package detail = two-column (document preview
left, actions/status right rail).

**Tablet:** Library switches from table to card list at the same
breakpoint the current app already uses; package detail stacks.

**Mobile:** Card list throughout, package detail single column, download
buttons full-width.

---

### `/ats-scan`
**Function (unchanged):** The public, anonymous-capable free scanner —
stays exactly as-is functionally. This is the anonymous-session entry
funnel (TASK-069/070); it is **not** replaced by the new `/gcc-readiness`
or `/job-match` authenticated pages, which serve a logged-in user viewing
their own saved data. `/ats-scan` continues to accept a pasted resume with
no account.

**Functional parity:** Anonymous session persistence + claim-on-signup
(TASK-069/070) unchanged. Same `jobMatch` field structure TASK-071/072
already renders.

**Components:** Job Match breakdown, Readiness ring, form field set
(upload/paste), Card.

**Desktop/Tablet/Mobile:** Same responsive treatment as `/job-match`
above — this page and `/job-match` should look like siblings (same
result-rendering components), differing only in the entry form (this one
also accepts a resume, since the visitor has no saved profile yet).

---

### `/settings`
**Function (unchanged):** Account settings, delete-data section.

**Functional parity:** Same fields, same `DeleteDataSection` irreversible-
action confirmation flow.

**Components:** Card, form field set, Button (`secondary`/`primary`),
modal (delete confirmation).

**Desktop:** 900px column, sectioned cards (Account, Notifications-off-
by-default note if applicable, Delete my data as its own visually
separated danger-zone card using `--terra` accents).

**Tablet/Mobile:** Same, full-width.

---

### `/payments`
**Function (unchanged):** Currently a placeholder (Unplanned #4 — no
ticket has ever built a real payment-history page). This redesign
restyles the placeholder honestly — it does not build the missing
feature. If/when a real payment-history page is built, it follows this
same template with real data.

**Components:** Card (empty-state treatment).

**Desktop/Tablet/Mobile:** Centered empty-state card, consistent with
`DESIGN_SYSTEM.md` §11's empty-state pattern.

---

## D. Admin (7 pages — TASK-075 structure kept exactly)

All seven admin pages share: `--surface-2` background, denser type scale
(no serif except the page H1), no gold glow (glow reserved for consumer
CTAs), mono for every ID/config value, the existing horizontal tab nav
(`AdminNav.tsx`) restyled but not restructured.

### `/admin`
**Function (unchanged):** Live-summary dashboard, links to the six
sub-pages. Same data-fetch functions, same warning-color treatment when
`allProviderConfigs.length === 0`.

**Desktop:** 3-up summary card grid within the 960px admin container.
**Tablet:** 2-up. **Mobile:** single column.

### `/admin/ai-provider`
**Function (unchanged as of TASK-099, 2026-08-11):** Six named-service
cards (Resume Parsing, Resume Optimization, ATS Scanner, Cover Letter
Generation, Q&A Generation, Mock Interview — each its own
provider/model/fallback-model/API-key form), a `Default` card (fallback
for anything unconfigured), and an `Other overrides` card (free-text-key
form for internal sub-steps like `job_description`). Q&A
Generation/Mock Interview are inert config rows — no route reads those
keys yet.

**Desktop/Tablet:** One card per service, stacked, each with its own
inline form. Default and Other overrides as trailing cards, same
pattern.
**Mobile:** Same, full-width fields.

### `/admin/prompts`
**Function (unchanged):** Prompt template edit forms.
**All breakpoints:** One card per template, full-width textarea.

### `/admin/promo-codes`
**Function (unchanged):** Create form + existing-codes list.
**Desktop/Tablet:** List as compact rows. **Mobile:** Stacked cards.

### `/admin/packages`
**Function (unchanged):** Service package create form + list, dynamic
add/remove line items (`ServicePackageItemsFields`, stable per-row keys —
unchanged from its TASK-061 fix).
**All breakpoints:** Same as promo-codes pattern.

### `/admin/users`
**Function (unchanged):** Search + selected-user detail (packages, credit
grant, rate-limit override), `q`/`user` params shared across sections
exactly as today.
**Desktop:** Search results and selected-user cards in a single column
(960px is narrow enough that admin never needs a sidebar-detail split).
**Tablet/Mobile:** Same, unchanged since this page was never wide to
begin with.

### `/admin/access-log`
**Function (unchanged):** Read-only table, most recent 50 entries.
**Desktop/Tablet:** Table, own `overflow-x` container.
**Mobile:** Falls back to a stacked card-per-row list (same treatment as
Library's mobile fallback) — table columns become labeled rows.

---

## Cross-page acceptance checklist (applies to every route above)

- [ ] Every API contract, request/response shape, business rule, data
      behavior, authorization check, validation rule, and functional
      outcome remains unchanged — verified by re-reading the actual route
      handler, not assumed from this document. **A frontend implementation
      may be refactored internally where necessary for the new UI (e.g.
      restructuring a component tree, changing local state shape), but the
      externally observable functionality and every API contract must stay
      compatible.**
- [ ] Every permission/auth check (`requireAdmin()`, session checks,
      RLS-backed reads) fires exactly where it fires today.
- [ ] Every validation rule (required fields, enum checks, length limits)
      is unchanged.
- [ ] Every success/error message matches existing copy unless this
      document explicitly says otherwise (none do).
- [ ] No route in this document does not already exist in
      `DESIGN_SYSTEM.md` §12's component reuse map or `docs/redesign/
      STAGE1_DECISIONS.md`'s approved additions (`/gcc-readiness`,
      `/job-match`, `/cover-letter`).
