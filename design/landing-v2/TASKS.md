# Landing v2 — Implementation Tasks

Branch: `feature/landing-v2` · Spec: `design/landing-v2/README.md` · Do not touch routes other than `/`.

## Phase 0 — Prep
- [ ] T0.1 Create branch `feature/landing-v2` from `main`.
- [ ] T0.2 Copy `design/landing-v2/assets/*` → `public/landing/`.
- [ ] T0.3 Confirm Tailwind theme has all colours in `tokens.json` (add missing: blue, blue-soft, alert, ok, ok-soft).
- [ ] T0.4 Move the current landing page into `components/landing-legacy/` (keep until v2 is approved) — no deletions.

## Phase 1 — Sections (mobile first, then md/lg)
Create one component per section in `components/landing-v2/`:
- [ ] T1.1 `Nav` (sticky, mobile menu button + sheet)
- [ ] T1.2 `Hero` (photo + workspace card, CTAs, country chip scroller)
- [ ] T1.3 `TrustStrip`
- [ ] T1.4 `WhoItsFor` (snap-scroll on mobile, 4-col grid desktop)
- [ ] T1.5 `Pain` + `PainFix`
- [ ] T1.6 `HowItWorks` (branching card layout, `selectedJob` state) — spec §5
- [ ] T1.7 `Services` (3 phases, swipe on mobile)
- [ ] T1.8 `BeforeAfter` (toggle)
- [ ] T1.9 `Trust`
- [ ] T1.10 `Markets`
- [ ] T1.11 `TemplateOrbit` (spec §6; reuse existing template renderer for previews; rAF; reduced motion)
- [ ] T1.12 `InterviewPrep`
- [ ] T1.13 `FounderBand` (placeholder until photo/name supplied)
- [ ] T1.14 `Pricing` (keep "card checkout not live" notice)
- [ ] T1.15 `Faq` (accordion, reuse current FAQ copy)
- [ ] T1.16 `FinalCta` + `Footer`
- [ ] T1.17 `MobileStickyCta` (hidden ≥ lg, respects safe-area inset)

## Phase 2 — Assemble & verify
- [ ] T2.1 Compose sections in the landing route in the order of README §4.
- [ ] T2.2 Keep existing SEO metadata (title, description, OG tags).
- [ ] T2.3 Run acceptance checklist (README §9) on laptop + a real phone.
- [ ] T2.4 Screenshot mobile + desktop, send for review.

## Phase 3 — Ship (only after approval)
- [ ] T3.1 Open PR `feature/landing-v2` → `main`; Vercel preview URL for final check.
- [ ] T3.2 Merge; remove `components/landing-legacy/` in a follow-up PR once stable.
