# Landing premium redesign + design consistency — proposal, 17 November 2026

**Status: PROPOSAL. Nothing here is implemented or authorized.** Written for founder
review before any visual change. Merge and deployment remain founder decisions.

## Purpose

Make GCC Mentor read as the premium, trustworthy career platform for the Gulf, and make
the public site and the signed-in product look like one company built by one team.

**Hard constraint (founder instruction, 17 November 2026):** change **no internal logic**.
Resume optimization, cover-letter generation, interview Q&A generation, mock-interview
generation and review, scoring, prompts, auth, payments and database behaviour are all out
of scope. This proposal touches presentation only.

## Evidence base

30 same-niche platforms analysed, 17 November 2026:

| Category | Count | Where |
|---|---|---|
| Gulf / Middle East job boards | 10 | `D:\GCC-Mentor-Work\research\01-gulf-boards.md` |
| Resume / ATS / AI resume tools | 10 | `D:\GCC-Mentor-Work\research\02-resume-tools.md` |
| Interview prep and mock interview | 10 | `D:\GCC-Mentor-Work\research\03-interview-prep.md` |

Headlines, button text and computed colours were read from live pages. Screenshots and raw
JSON: `D:\GCC-Mentor-Work\research\captures\`. Every traffic, user-count and review claim
encountered is **as-claimed and unverified**; colour values are computed styles at one
instant and may miss late-loading or A/B-rotated palettes.

## Findings that drive the proposal

### F1 — The category's default promise is unavailable and undifferentiated

Eight of ten resume tools promise interviews ("Land 6X more Interviews", "Less Hassle, More
Interviews"). Three lead with borrowed authority (Forbes rankings). **GCC Mentor cannot join
this contest**: it has no user count, no review count and no press ranking, and inventing
one would violate its own grounding rule.

**The unclaimed position, from the interview-prep research:** *nobody in the category
instruments the second attempt.* No platform scores attempt 2 against attempt 1, and no
platform says "your first attempt is supposed to be rough." GCC Mentor already owns the
honesty mechanic — extracted data is labelled "Not yet user-verified" and the verified count
starts at zero. That is a brand, not a shortfall.

### F2 — Typography is the strongest cheap premium signal

Every platform that reads premium ships a distinctive non-system face: Roobert (Teal),
Graphik Web (Kickresume), HK Grotesk (Zety), TT Commons (Resume.io), EuclidCircularB
(Novoresume), Rubik (Careerflow). Only Rezi and Enhancv use Inter. GCC Mentor uses **Inter
with Arial/Helvetica fallbacks**, i.e. the free tier of the category.

Meanwhile the market leader GCC Mentor competes with, **Naukrigulf, serves Arabic-first
with the Cairo font** — and the interview-prep research found **no Arabic localisation
anywhere** in that category.

### F3 — The brand colour is already differentiated but does not reach the product

Measured category primaries: `#2AACEA`, `#F5B501`, `#FFC85E`, `#51E2C2`. **None uses navy +
teal.** GCC Mentor's documented brand `#007F78` is available territory.

But it is not what users see. Measured from the live site: the `/login` primary button
renders **`#2563EB`** (the `info` token), not `#007F78`. Root cause is AUDIT-009 — two
stacked token layers where `app/ui-system.css:1011` re-points `--ui-brand` at `--uds-brand`.
`app/auth-presentation.css` additionally cites a sixth visual direction
(`SkillDrift-inspired`).

### F4 — Eleven sections is why the page is 14.7 phone screens

`app/page.tsx` order: hero → how-it-works → services → templates → interview → industries →
markets → about(founder) → plans → faq → final. Measured at 390×844: **landing 12,415 px
(14.7 screens)**, templates 11,352 px (13.4), against 1–3 screens for the product pages.

Two structural defects:
- **The founder proof is buried at position 8.** "Built with real Gulf industry… 15+ years
  of Instrumentation & Controls" with a real portrait is the page's single strongest trust
  asset, and it is the one device competitors structurally cannot copy.
- **`industries` and `markets` are adjacent and overlapping** — both address Gulf markets.

### F5 — Two trust liabilities to correct

- The hero is a composited stock image (cut-out edge visible at 390 px). Stock people are
  the fastest "template" signal in this category.
- The employer wall shows 21 logos forced into one `160×52` box, producing wildly unequal
  optical weight. The disclaimer in `EmployerMarquee.tsx:46` is correct, but a 21-logo wall
  under "Prepare for opportunities across the Gulf" implies relationship regardless.
  This brushes the founder's own rule #3: never claim what is not true in the UI.

## Proposed changes

### P1 — Resolve the token collision; one palette (AUDIT-009)

Correct the `--uds-brand` seed so the documented brand `#007F78` reaches every surface, and
audit every component reading `--ui-accent`/`--ui-brand` for a deliberate decision rather
than an accident. Keep `--uds-info` as the informational blue so genuine info states retain
their meaning. Retire the `SkillDrift` framing in `auth-presentation.css`.

Single-point change, wide surface. This alone makes the site and the product look related.

### P2 — Introduce one display typeface

Add one distinctive display face for headings (body can remain Inter for legibility at
small sizes). Selection must check licensing for commercial web use; candidates seen in the
category are named in `02-resume-tools.md` but are **not** recommendations to copy, since
several are paid licences. Also evaluate **Arabic coverage** — Naukrigulf leads on Arabic and
Cairo already pairs well with Latin; GCC Mentor currently has no Arabic presence at all.

Cost: one font file. Expected effect: the largest perceived-quality gain per unit of effort
in this proposal.

### P3 — Restructure the landing from 11 sections to 7

Proposed order, with the rationale for each move:

| # | Section | Change | Why |
|---|---|---|---|
| 1 | Hero | **Replace stock photo with a real product screen** (the review screen with its "Not yet user-verified" label) | Shows the product and demonstrates honesty in one image |
| 2 | **Founder proof** | **Moved up from position 8** | The one trust device competitors cannot copy; 15+ years of real Gulf domain experience |
| 3 | How it works | Keep, tighten to 3 steps | Already good; the stepper pattern is the strongest existing UX idea |
| 4 | Services | Keep | "One Career Profile. Multiple outputs." is the real product thesis |
| 5 | Templates + Interview | **Merge** | Both are demonstrations of the same profile; halves the length |
| 6 | Plans + FAQ | Merge into one "what it costs / what you get" block | Removes an extra full-width band |
| 7 | Final CTA | Keep | — |
| — | `industries` + `markets` | **Merge into one Gulf-coverage block**, or fold into the hero country strip | They overlap today |

### P4 — Trust architecture built on what is actually true

Replace the borrowed-authority pattern with three honest devices:

1. **The grounding promise, stated as a headline claim:** *nothing in your resume will be
   invented.* No competitor in the 30 analysed makes this claim.
2. **Show the honesty mechanic:** the "1 needs attention / 2 needs review / 0 verified by
   you" triage, and the "Not yet user-verified" label, as a product proof rather than a
   hidden detail.
3. **Own the first-attempt framing:** *your first attempt is supposed to be rough.* Identified
   as an unclaimed position in the interview-prep research. Directly serves a user who lacks
   confidence.

### P5 — Employer wall correction

Reduce to 6–9 logos with **normalised optical sizing** (equal visual weight, not equal
bounding boxes), and reframe the heading so it describes preparation rather than
relationship. Keep the existing disclaimer.

### P6 — Mobile-first pass

Target: landing from 14.7 screens toward the 6–8 range achieved by reducing section count
(P3) and by moving imagery to responsive `next/image` with explicit sizes. Note PR #92
already cut mobile transfer from 984 KB to 505 KB — section count, not bytes, is now the
limiting factor. Measured before/after page height required as evidence.

### P7 — CTA hierarchy and consistency

- Unify the two labels for the same action (nav "Check free readiness" vs hero "Check my
  readiness").
- Resolve the nav duplication ("Access" and "About & access").
- One primary action per screen; the secondary stays outlined.

## What does not change

No change to optimizer prompts or output, cover-letter generation, interview Q&A generation,
mock-interview generation or review, scoring, readiness logic, auth, RLS, payments,
database, or any API route. Resume templates, PDF/preview rendering and document typography
stay isolated and untouched. Visual-only means visual-only.

## Acceptance criteria

1. On every signed-in surface, the primary action renders the approved brand colour;
   info/success/warning/error states unchanged.
2. Landing section count is 7 or fewer, and every section is reachable from the nav or
   deliberately excluded.
3. Mobile landing page height measured before and after, at 390×844, with the figure
   recorded — no horizontal overflow anywhere.
4. One display face is used for headings on every public and signed-in surface.
5. The founder proof section appears within the first three sections.
6. `npm test`, `typecheck`, `lint`, and the existing typography/landing browser lanes pass.
7. Before/after captures exist for landing (desktop + mobile), login, dashboard, profile
   review and templates.

## Rollback

Each change lands as its own commit. Default rollback is a one-commit revert per change.
P1 (token) is independently revertible; P2 (font) is revertible by removing the font import;
P3 (structure) is revertible by restoring `app/page.tsx`.

## Proposed sequence — one PR per step

| PR | Change | Risk | Needs |
|---|---|---|---|
| 1 | P1 token collision fix | Low code, wide visual | Founder picks the single brand colour |
| 2 | P2 display typeface | Low | Founder approves the face and its licence |
| 3 | P4 + P5 trust and employer wall | Medium, content-led | Founder approves the copy |
| 4 | P3 landing restructure | Medium, largest visual change | Founder approves the section order |
| 5 | P6 + P7 mobile and CTA pass | Low | Builds on 1–4 |

**Recommendation:** start with PR 1. It is small, it is the root of the coherence problem,
and it needs only one decision from the founder — keep the documented brand teal `#007F78`,
or adopt a different brand colour deliberately.

## Open questions for the founder

1. **Brand colour:** keep `#007F78`, or choose differently now that we know navy+teal is
   unclaimed in this category?
2. **Arabic:** Naukrigulf leads with Arabic and Cairo; nothing in interview prep offers it.
   Is an Arabic surface in scope for GCC Mentor, and if so now or later?
3. **Display typeface:** approve a budget for a licensed face, or stay with a free face and
   compete on layout instead?
4. **The stock hero:** may a real product screenshot be used, or is there a reason the
   product must stay hidden pre-signup?
5. **Employer logos:** keep with corrected sizing, or replace entirely with a "prepared for
   roles like" list that makes no relational implication?
