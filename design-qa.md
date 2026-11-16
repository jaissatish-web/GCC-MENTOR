# Approved Option2 — implementation QA, 16 November 2026

Source visual truth: docs/evidence/2026-11-16-shortlisting/option2-reference.webp (second displayed generated design, desktop1440/mobile390 targets). Actual mock raster1536×1024; exact browser baselines are not supplied by a generated image.

Implementation: CandidateConcerns.tsx and concerns.module.css. Four visible choices, default third job-suitability concern, four local response states, decorative12KB WebP. Uses existing typography/theme/icons, no global override or service change.

Final result: blocked

Local build, typecheck, lint, full92/92 offline checks and responsive typography/mounted markup with normal200% text passed. Final hydrated seven-width matrix and normalized source-versus-render comparison are pending. Cloud local preview returned an upstream connection error; do not substitute process startup or HTTP checks for visual verification. Vercel branch preview must be inspected before release.

Review fixes: explicit screen-reader service descriptions added following failing regression; enlarged text harness covers spans at320/390. Image decoding now targets rendered images because hidden lazy artwork at320 never requests bytes; visible-image health assertions retained. Keyboard baseline waits for native focus scrolling to settle (same existing demo pattern), retaining the2px threshold.

Protected: template/PDF/document styling, AI/auth/payments/credits/backend/schema/configuration and original marquee/orbit/globe sources unchanged.

## Historical V3 QA record

# GCC Mentor V3 visual QA

final result: blocked

## References and method
Founder-approved issue #87 revised final desktop mockup and matching three mobile artboards. The 1024×1536 design images are composition references, not live 1440/390 captures. Current approved source assets, real resume orbit/halo, six flags, colored logos, dotted globe and founder photo are retained. Landing CSS modules own composition; Universal Design tokens own website typography; authored documents retain fixed UI inheritance.

Exact local Chromium captures exercise actual Next production HTML/JS/CSS at 320, 360, 390, 430, 768, 1024 and 1440 CSS pixels, DPR1. Anonymous API fixtures avoid production data/AI. Remote production browser navigation failed ERR_EMPTY_RESPONSE. This is local responsive evidence, not production-network or authenticated flow certification. The fixture serves original assets for Next image URLs, so optimized CDN output and DPR2 sharpness remain unverified.

## Findings and review
- New story, persistent synthetic labels, same-job previews, accessible 46/61/74 chart, manual interview stages and motion controls implemented.
- Exact-width overflow, image health, destinations, menu/Escape/focus, globe country selection, orbit keyboard/preview/animation, 200% text and reduced motion exercised.
- Independent review identified two Important issues: a remaining undisclosed protected template link and a focused interview control moving below the viewport. Both were reproduced with failing assertions before correction. The final seven-width rerun passes, including all template disclosures and stable native control position across every transition. The compact globe country labels also pass the added wrapping check.
- Minor deferred: the specific offshore commissioning gap is explicit in the resume excerpt but only general unsupported-experience protection remains in the Cover Letter/Q&A excerpts. No unsupported fact is added.
- Earlier flattened-globe captures came from an obsolete intermediate build and must not be used as final evidence.

## Limits before production approval
Existing test:interview times out waiting for the dashboard progress report on unchanged main and V3. Protected services are not modified to resolve that separate fixture issue. Actual screen-reader testing, authenticated service generation, payment/credits, live optimized-image delivery and field performance remain unverified. No pixel-identical fidelity claim; useful real controls, readable type and retained document functionality govern adaptation of the compressed composition artboards.
