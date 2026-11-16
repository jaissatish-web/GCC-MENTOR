# Mobile landing weight — approved implementation plan

Satish asked for the landing page to be optimised on mobile and authorized Hermes to
implement directly in the repository. Base `main` 714c106. This plan records the
requirement, acceptance criteria, affected files and protected scope **before** any
implementation edit, per `AGENTS.md`.

## Requirement

Reduce the public landing page's cold mobile transfer without changing the approved
design, copy, section order, application behaviour or any protected service.

Measured baseline (live `gcc-mentor.vercel.app`, CDP `Emulation.setDeviceMetricsOverride`
390×844 DPR 3, `Network.setCacheDisabled`, summed `loadingFinished.encodedDataLength`):

| Type | KB |
|---|---|
| Images | 616.2 |
| JS | 228.9 |
| Fonts | 82.4 |
| CSS | 53.8 |
| XHR | 3.2 |
| **Total** | **984.3** |

## Acceptance criteria

1. Cold 390px mobile transfer of the landing page is **under 650 KB** (baseline 984.3 KB).
2. No visual change to the approved design at any width. The industry tiles, the resume
   halo and the six country flags must render as before.
3. `npm run check` passes (typecheck + lint + 92 repository checks).
4. `npm run build` passes and `scripts/verify-mobile-layout.mjs` still passes at
   320/360/375/390/430/768/1280/1366/1440, including the 32px enlarged-text pass.
5. `scripts/verify-landing-v3-story.mjs` and `scripts/verify-premium-landing-v2.mjs`
   still pass. The founder portrait `public/landing/v2/founder-satish.webp` must keep its
   exact sha256 `c9956711c5e7a778a12e91eec2dc4b2592eea03dfc851fe29a3233ac05ae7120`.
6. A new deterministic asset-budget check (`scripts/verify-mobile-weight.mjs`) fails if the
   landing assets regress above budget, and is registered in `scripts/run-checks.mjs`.
7. Nothing in protected scope changes: `middleware.ts`, `lib/supabase/*`,
   `app/auth/callback/route.ts`, `lib/ai/grounding.ts`, `tailwind.config.ts`.
8. No scoring, prompt, schema, auth, payment or AI-call change. No dependency added.

## Authorized scope

| # | Change | File(s) | Measured effect |
|---|---|---|---|
| 1 | Split the 1536×1024 `industries.webp` sprite into six 512×512 tiles and render them through `next/image` with `sizes`, so a phone downloads ~384px art instead of the whole 1536px sheet | `public/landing/v2/industries/*.webp` (new), `app/page.tsx` | 294.3 KB → ~120 KB |
| 2 | Give mobile its own 560px resume halo instead of the 840px desktop file | `public/landing/v2/resume-halo-mobile.webp` (new), `components/landing-v3/premium.module.css` | 86.2 KB → ~18 KB |
| 3 | Re-export `flags/om.svg` and `flags/sa.svg` with svgo precision 0 (coordinates rounded to integers). Verified pixel-identical at the 36×26px display size | `public/landing/v2/flags/om.svg`, `public/landing/v2/flags/sa.svg` | 200.5 KB → 23.7 KB |
| 4 | Raise the mobile marketing type floor: `helperSize` 13→15px. `bodySize` 15→16px. Tablet and desktop columns untouched | `lib/design-system/theme.ts` | 100 visible text nodes at 13px become 15px |
| 5 | Bring the brand wordmark link to a 44px tap target | `components/landing-v3/premium.module.css` | WCAG 2.5.8 |
| 6 | Add the asset-budget regression check | `scripts/verify-mobile-weight.mjs`, `scripts/run-checks.mjs`, `package.json` | prevents silent regression |

Estimated result: **984 KB → ~560 KB** on a cold 390px mobile load.

## Protected scope

No change to: hero copy and order, candidate-concern copy, journey, interview demo,
employer marquee, founder portrait bytes, globe, templates, orbit/halo geometry,
all backend/AI/auth/payment/credits/data/document/PDF code, all protected files.
`--uds-hero-size` (36/44/52) and `--uds-marketing-size` (26/30/34) are **pinned by
`scripts/verify-mobile-layout.mjs`** and must not change. The shared application UI
tokens (`--ui-body-size`) are a separate system and must not change.

## Out of scope (separate proposals)

- A persistent mobile CTA in the sticky header or a bottom bar. `.navCta` is
  `display:none` below 600px while the page is 11,840px tall. This is a visible
  conversion change and needs the founder's visual approval first.
- Analytics installation, security headers, JSON-LD and the public pricing page.
  Tracked in the landing audit of 16 November 2026; separate branches.

## Tasks

1. Record this plan, the decision-log entry and the PROGRESS entry before any code.
2. Baseline `npm test` on the branch before edits, so a pre-existing failure is not
   attributed to this work.
3. Add `scripts/verify-mobile-weight.mjs` first and observe RED against the current
   assets (the sprite and the two oversized flags must trip the budget).
4. Implement scope items 1–5 with the smallest possible diff.
5. Run `npm run check`, `npm run build`, `CHROME_PATH=... npm run test:mobile`, the two
   landing verifiers and `npm run test:typography`.
6. Re-measure the real cold mobile transfer against the built local server and record
   the before/after numbers as evidence.
7. Commit, push one temporary branch, open a draft PR, and verify it with `gh`.
   Merge stays with the founder.

## Owners

`public/landing/v2/industries/*`, `public/landing/v2/resume-halo-mobile.webp`,
`public/landing/v2/flags/om.svg`, `public/landing/v2/flags/sa.svg`,
`app/page.tsx` (industry tiles only), `components/landing-v3/premium.module.css`
(halo media query + brand link only), `lib/design-system/theme.ts` (mobile typography
defaults only), `scripts/verify-mobile-weight.mjs`, `scripts/run-checks.mjs`,
`package.json`, `docs/`.

## Review focus

Check that the industry tiles still show the correct six distinct scenes in the right
order, that the halo depth and position are unchanged, that the flags are visually
unchanged, that no copy or section order moved, that the portrait hash still matches,
that no protected file was touched, and that the measured transfer really dropped.
