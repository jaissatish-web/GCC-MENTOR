# Mobile landing weight — verification evidence

Branch: `perf/mobile-landing-weight` · Base: `main` 714c106 · Date: 16 November 2026
Plan: `docs/superpowers/plans/2026-11-16-mobile-landing-weight.md`

## Measured result

Cold mobile transfer, device-emulated 390×844 DPR 3, `Network.setCacheDisabled`,
summed from `Network.loadingFinished.encodedDataLength`.

**Live site, after the merge (authoritative): 984.3 KB → 576.7 KB (−407.6 KB, −41.4%).**

| Type | Before (live 714c106) | After (live 7a187ad) | Change |
|---|---|---|---|
| Images | 616.2 KB | 208.8 KB | −407.4 KB (−66%) |
| JS | 228.9 KB | 228.7 KB | −0.2 KB |
| Fonts | 82.4 KB | 82.4 KB | — |
| CSS | 53.8 KB | 53.6 KB | −0.2 KB |
| XHR | 3.2 KB | 3.2 KB | — |
| **Total** | **984.3 KB** | **576.7 KB** | **−407.6 KB (−41.4%)** |

Target was under 650 KB. The live site now measures 576.7 KB on a cold phone load.
A local `next start` build measured 504.7 KB; the live figure above is the one that counts,
because it is what a visitor on mobile data actually receives.

### Next size win, not taken here

`hero-gulf.webp` is served at `w=1200` (53.8 KB) to a 390px phone, and
`/landing/employers/ccc.svg` is 15.5 KB. Both are over-served on mobile and are the
next obvious target. They were left alone to keep this change to one clear, reversible step.

## What each change saved

| Asset | Before | After | Method |
|---|---|---|---|
| `/landing/v2/industries.webp` → six tiles | 294.3 KB | ~120 KB served | 1536×1024 sheet split into six 512×512 WebP files, rendered through `next/image` with `sizes="(min-width:960px) 16vw, (min-width:600px) 31vw, 46vw"` so a phone receives ~384px art |
| `/landing/v2/resume-halo.webp` | 86.2 KB | 17.9 KB on phones | A separate 560px WebP used below 960px; the desktop file is untouched |
| `/landing/v2/flags/om.svg` | 175.9 KB | 18.1 KB | svgo, integer path precision |
| `/landing/v2/flags/sa.svg` | 24.6 KB | 5.6 KB | svgo, integer path precision |
| Mobile body text | 15px | 16px | `NUMBER_FIELDS.bodySize` mobile column |
| Mobile helper text | 13px | 15px | `NUMBER_FIELDS.helperSize` mobile column |
| Brand wordmark target | 40px | 44px | `min-height` on `.system .brand` |

## Visual equivalence checks

- **Industry scenes** — before/after device-emulated captures at 390px and 1440px confirm the
  same six scenes (Oil & Gas, Construction, Engineering, Operations, Projects, Corporate) in
  the same order, with no missing, swapped, stretched or degraded image.
- **Flags** — original and optimised SVGs rasterised at the 36×26px display size are
  pixel-identical. The optimisation only removes floating-point precision from path data.
- **FAQ and helper text** — the only intended visual difference. Text is 1–2px larger on
  mobile, so a few FAQ questions wrap to a second line. Fully legible, no clipping, no
  overlap; the layout holds.
- **Founder portrait** — `public/landing/v2/founder-satish.webp` is byte-identical, verified
  by the sha256 pinned in `scripts/verify-landing-v3-story.mjs`.

## Automated checks

| Check | Result |
|---|---|
| `npm run typecheck` | PASS |
| `npm run lint` | PASS — no warnings or errors |
| `npm run build` | PASS |
| `npm run test:mobile` (320/360/375/390/430/768/1280/1366/1440 + 200% text) | PASS |
| `scripts/verify-premium-landing-v2.mjs` (V3 presentation, 7 widths) | PASS |
| `scripts/verify-orbit-depth.mjs` (390 + 1440) | PASS |
| `scripts/verify-mobile-weight.mjs` (new budget check) | PASS — was RED before the asset work |
| `npm test` (92 repository checks) | 91 PASS, 1 FAIL — `verify-resume.ts`, see below |

### The one failing check

`scripts/verify-resume.ts` reports `32767/32768 permutations differ`. The script contains
no reference to the landing page, the flags, the industry tiles or `lib/design-system/theme.ts`,
and it ran for 204s where comparable checks finish in 1–3s.

**It fails identically on clean `main` 714c106.** The failure was reproduced twice against a
separate clean-`main` worktree, using the exact invocation path from `scripts/run-checks.mjs`
(`stdio: ['ignore','pipe','pipe']`) and with the same `NEXT_PUBLIC_APP_URL` environment:
both trees produce the same output and the same exit code. The script also aborts with
`stdin is not a tty` when run outside that harness. It is therefore **pre-existing and
environment-specific, not caused by this change**. No threshold was weakened and no check
was skipped.

Pull request: **#92** — https://github.com/jaissatish-web/GCC-MENTOR/pull/92
Branch `perf/mobile-landing-weight` (head `64ff9bf`), merged to `main` by squash as
**`7a187ad`** on 16 November 2026 after GitHub CI passed both runs
(11m1s and 10m21s). The branch was deleted from the remote after the merge.

## Live verification after the merge

Confirmed on `https://gcc-mentor.vercel.app/` after Vercel deployed `7a187ad`:

- `/landing/v2/industries/oil-gas.webp` returned 404 before the deploy and 200 after.
- The old `/landing/v2/industries.webp` sheet now returns 404 — it is gone.
- The live HTML references the six new tiles
  (`construction, corporate, engineering, oil-gas, operations, projects`).
- Full-page scroll at 390×844: **74 images, 0 broken**, 6 industry tiles loaded,
  6 country flags loaded, the resume-designs section resolves, and
  `scrollWidth 390` against `viewport 390` — **no horizontal overflow**.
- Visual check of the industries section at 390px confirms all six scenes render
  correctly with no distortion: Oil & Gas, Construction, Engineering, Operations,
  Projects, Corporate.

### Two environment limitations found, not caused by this change

1. `scripts/verify-landing-v3-presentation.mjs` and `scripts/verify-orbit-depth.mjs` cannot run
   on Windows: their fixture server checks `file.startsWith(root + '/')`, which never matches a
   Windows path, so every request 404s and the page renders empty. Both were validated by
   temporarily patching that single separator check locally, then reverting the patch — the
   committed source is unchanged. On Linux CI the check passes. **Worth a separate two-line
   fix so the founder can run these locally.**
2. `@electric-sql/pglite` is a declared devDependency but was not installed in the local
   `node_modules`, which made `verify-dashboard-overview.mjs` and
   `verify-interview-history-db.mjs` fail locally with `ERR_MODULE_NOT_FOUND`. Installing it
   (without changing `package.json` or the lockfile) makes both pass. CI runs `npm ci` and was
   never affected.

## Not changed

No copy, section order, colour, layout, hero, founder portrait bytes, dependency, schema,
auth, payment, AI call, scoring rule or protected file. The sticky-header mobile CTA,
analytics, security headers, JSON-LD and a public pricing page are separate proposals and
were deliberately excluded.

## Rollback

Revert this branch's single commit. No database, schema or data rollback is required.
