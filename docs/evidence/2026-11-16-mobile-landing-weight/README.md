# Mobile landing weight — verification evidence

Branch: `perf/mobile-landing-weight` · Base: `main` 714c106 · Date: 16 November 2026
Plan: `docs/superpowers/plans/2026-11-16-mobile-landing-weight.md`

## Measured result

Cold mobile transfer, device-emulated 390×844 DPR 3, `Network.setCacheDisabled`,
summed from `Network.loadingFinished.encodedDataLength`.

| Type | Before (live 714c106) | After (this branch) | Change |
|---|---|---|---|
| Images | 616.2 KB | 174.6 KB | −441.6 KB (−72%) |
| JS | 228.9 KB | 226.2 KB | −2.7 KB |
| Fonts | 82.4 KB | 47.6 KB | −34.8 KB |
| CSS | 53.8 KB | 52.4 KB | −1.4 KB |
| XHR | 3.2 KB | 3.4 KB | +0.2 KB |
| **Total** | **984.3 KB** | **504.7 KB** | **−479.6 KB (−48.7%)** |

Target was under 650 KB. Achieved 504.7 KB.

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
and it ran for 204s where comparable checks finish in 1–3s. It is being re-run against clean
`main` and against this branch to establish whether it is pre-existing or a timing flake.
**Result is recorded here once both runs finish. No test threshold was weakened.**

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
