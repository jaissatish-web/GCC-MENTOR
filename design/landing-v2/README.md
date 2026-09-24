# GCC Mentor — Landing Page v2 (Design Handoff)

**Status:** Design approved for implementation · **Not yet in production**
**Live design preview:** https://claude.ai/artifact/BEvq4YytjKyWUyag8StVim (desktop + mobile artboards, interactive)
**Target:** replace the current landing page at https://gcc-mentor.vercel.app/ (`/` route)

> Rule: implement on a feature branch locally, review on laptop + real phone, then merge to `main`.
> Do **not** change product logic, auth, pricing logic, or any route other than the landing page.

---

## 1. What's in this folder

```
design/landing-v2/
├── README.md              ← this spec (read first)
├── TASKS.md               ← step-by-step implementation tasks for Claude Code / Hermes
├── tokens.json            ← colours, fonts, radii, shadows (matches live site theme)
├── CREDITS.md             ← image sources + licences
├── assets/                ← 15 images, ready for /public/landing/
└── source/
    ├── desktop.dc.html    ← desktop design source (1440 wide, fluid)
    ├── mobile.dc.html     ← mobile design source (390 wide) — PRIMARY
    └── TemplateOrbit.dc.html ← circular template carousel (desktop + compact mobile mode)
```

The `.dc.html` files are **design references**, not production code. They use a design-tool runtime
(`support.js`, `<x-dc>`, `{{holes}}`, `<sc-for>`, `<sc-if>`). Read them for exact layout, copy,
spacing, colours and interaction logic (the `class Component` script at the bottom of each file),
then rebuild as real React/Next.js components with Tailwind.

## 2. Mobile first

Most users are on mobile. Build every section **mobile layout first** (`mobile.dc.html`), then add
`md:` / `lg:` breakpoints to reach the desktop layout (`desktop.dc.html`).

| Breakpoint | Reference |
|---|---|
| < 768px | mobile.dc.html (390 base, max-width 430 content column) |
| ≥ 1024px | desktop.dc.html (max-width 1200 content, 40px side padding) |
| 768–1023px | mobile structure with 2-column grids where desktop has 3–4 |

Minimum touch target 44×44px. Sticky bottom CTA bar on mobile only (hide ≥ 1024px).

## 3. Theme (unchanged from live site)

Same palette and fonts as the current site — see `tokens.json`.

| Token | Hex | Use |
|---|---|---|
| canvas | #FAF7F2 | page background |
| white | #FFFFFF | cards, alternating section bands |
| ink / ink-soft / ink-muted | #14181C / #414B55 / #616B76 | text |
| line / line-strong | #EAE4DB / #D2C9BC | borders |
| teal / teal-soft | #0F4C43 / #E4EEEB | primary, buttons, "fixed/verified" |
| gold / gold-soft / gold-ink | #C9962E / #F7EFDD / #8A6114 | accent, badges, text on gold-soft |
| blue / blue-soft | #1F5A8A / #DCEAF7 | job-keyword highlight, Target job 3 |
| ok / ok-soft | #2C6E49 / #E3EFE8 | "Ready" states |
| alert | #A33528 | pain lines (strikethrough), "before" score |

Fonts: **Fraunces** (headings, italic accent words in teal), **Plus Jakarta Sans** (body),
**IBM Plex Mono** (eyebrows, numbers, scores). Already loaded on the live site.

## 4. Section order and content

| # | Section | id | Key visuals / behaviour |
|---|---|---|---|
| 1 | Nav (sticky) | — | Logo, links (desktop), Log in, Sign up free; mobile: Sign up + menu button |
| 2 | Hero | `top` | H1 "Your experience is Gulf-ready. *Now make your CV say so.*"; plant photo + floating workspace card (Readiness 72, ATS 49→78, pack status); 2 CTAs; 6 country chips (swipe on mobile) |
| 3 | Trust strip | — | 5 items desktop / 2×2 mobile |
| 4 | Who it is for | — | 4 photo cards (site engineer, airport, departures board, nurse). Mobile: horizontal snap-scroll |
| 5 | Pain | `pain` | "Applied everywhere. *Heard nothing back.*" laptop photo + overlapping inbox card; 3 search/skim/skip cards |
| 6 | Pain → fix | — | 8 items: struck-through pain (alert) → bold fix. Desktop 4×2 grid with icons; mobile numbered list |
| 7 | **How it works** | `journey` | Card layout (see §5) — interactive |
| 8 | Services | `services` | 3 phases each with photo header (Know / Build / Prepare). Mobile: swipe cards |
| 9 | Generic → targeted | `scan` | Before/After toggle, ATS 49 vs 78, colour legend |
| 10 | Trust | `trust` | Generic AI vs GCC Mentor; review-page mock with Locked fields + suggested line |
| 11 | Six markets | — | Riyadh + Dubai photo tiles, 4 text tiles, "not a recruitment agency" disclaimer |
| 12 | **Templates orbit** | `templates` | Circular rotating carousel (see §6) — interactive |
| 13 | Interview prep | — | Panel photo + feedback scores card (72/68/61/54) |
| 14 | Founder band | — | Refinery photo, teal overlay. **Needs real founder name + photo** |
| 15 | Pricing | `pricing` | Free vs Application services. **Needs real price** (placeholder `[PRICE]`) |
| 16 | FAQ | `faq` | Accordion, first item open |
| 17 | Final CTA | `score` | Dubai night photo, teal overlay, upload drop zone → `/gulf-readiness-score` |
| 18 | Footer | — | Services / markets / contact |
| 19 | Mobile sticky CTA | — | "Free Gulf Readiness · Score my CV" → `/gulf-readiness-score` |

Keep all existing CTA destinations: `/gulf-readiness-score`, `/signup`, `/login`, `/templates`.

## 5. How it works — "One Career Profile. Every job you target."

Structure inside one large white card:

1. **Built once banner** (teal, faded photo): 01 Career Profile → 02 Gulf Readiness as glass cards.
2. **Branch connector**: one line splits into 3 curved lines; pill "Step 3 · Then, for each job you target — tap one". The branch to the selected job takes that job's colour; others `#E2DCD2`.
3. **3 target-job photo cards** (tappable). Selected = 3px border in job colour + shadow + "✓ Selected" badge.
4. **Pack panel** (Steps 4–7) tinted in the selected job's colour: Optimized CV / Cover letter / Interview Q&A / Mock interview — icon, number, title, value chip, one-line description. Desktop 4 columns, mobile 2×2.
5. Dashed note: "Add target job 4, 5, 6… — same profile, a new pack for each".

Example data (illustrative, keep "example" framing):

| Job | Code | Colour / soft | Image | ATS | Letter tone | Mock |
|---|---|---|---|---|---|---|
| Senior Instrumentation Engineer — Saudi Arabia | SA | #0F4C43 / #E4EEEB | market-saudi-riyadh.jpg | 49 → 78 | Professional | Practise next |
| Commissioning Lead — UAE | AE | #8A6114 / #F7EFDD | market-uae-dubai.jpg | 52 → 81 | Technical | Ready |
| E&I Superintendent — Qatar | QA | #1F5A8A / #DCEAF7 | hero-plant-night.jpg | 45 → 74 | Short | Ready |

State: `selectedJob` (0–2), default 0.

## 6. Templates orbit

Replaces the current orbit with an improved version (same idea as live `actual-template-orbit`).

- 10 template cards on an ellipse. Per card angle `θ = angle + i·2π/10`;
  `x = rx·cos θ`, `y = ry·sin θ`, depth `d = (sin θ + 1)/2`;
  `scale = (0.6 + 0.42d)·k`, `opacity = 0.5 + 0.5d`, `saturate(0.55+0.45d) brightness(0.9+0.1d)`;
  z-index: front half `60 + 40d`, back half `10 + 30d` (centre stage = 50, so back cards pass behind it).
- Desktop: rx 440, ry 140, k 1, container 800px, stage 330px wide.
  Mobile (compact): rx 140, ry 54, k 0.62, container 650px, stage scaled 0.72.
- Auto-rotate: 38s per turn (−0.005 rad / 33ms). Use `requestAnimationFrame` in production.
- While rotating, centre stage shows the front-most card. Tap a card → it eases to the front (0.16 lerp) and rotation pauses.
- Controls: prev / Pause–Resume / next, counter "03 / 10", tags, "Use this template" (desktop).
- **Production:** render real template previews using the existing template renderer at small scale (as the live site does with `transform: scale(0.16)`), not the simplified mock in the design.
- Respect `prefers-reduced-motion`: no auto-rotation, keep manual prev/next.
- Keep the animation state local to the orbit component so it never re-renders the whole page.

## 7. Images

All 15 images are in `assets/`; put them in `/public/landing/`. Use `next/image` with `sizes`
and lazy loading below the fold; hero image `priority`. Target < 200 KB each (WebP/AVIF via next/image).
Licences in `CREDITS.md` (all CC0 / public domain / Unsplash licence — no attribution required, credits kept for records).

## 8. Content still needed before go-live

- [ ] Founder name + photo (section 14)
- [ ] Price for Application services (section 15) — or keep "Confirm directly" wording
- [ ] Confirm example target jobs in §5 (consider one non-engineering example)
- [ ] Final check that no claim implies guaranteed jobs (existing disclaimers kept)

## 9. Acceptance checklist

- [ ] Looks right on 360px, 390px, 430px, 768px, 1280px, 1440px
- [ ] No horizontal page scroll on mobile (only intended swipe rows)
- [ ] All CTAs route correctly
- [ ] Journey: tapping each job updates branch colour, cards and pack
- [ ] Before/After toggle, FAQ accordion work
- [ ] Orbit: rotates, pauses on tap, prev/next, reduced-motion respected, smooth on a mid-range Android
- [ ] Lighthouse mobile: Performance ≥ 85, Accessibility ≥ 95
- [ ] Text contrast ≥ 4.5:1 (white text only on #0F4C43, #8A6114, #1F5A8A)

> **Implemented 2026-09-24** on branch `feature/landing-v2` — `app/page.tsx` + `components/landing-v2/`. Images live in `public/landing/` (not duplicated here).
