# Candidate preparation focus — approved Option2 QA

**Source visual truth:** docs/evidence/2026-11-16-shortlisting/option2-reference.webp, second displayed concept approved by Satish. Original raster1536×1024 contains desktop1440/mobile390 intended layouts, not exact device baselines.
**Implementation evidence:** docs/evidence/2026-11-16-shortlisting/option2-1440.webp, option2-390.webp, option2-hosted-default.jpg.
**Comparisons:** option2-compare-1440.webp and option2-compare-390.webp in that folder. These put source and actual render in the same image. Reference content crops1122×581 and349×660 are normalized proportionally to1440×746 and390×738; actual CSS viewports1440/390, DPR1, screenshots1440×787 and390×1397. No pixel-exact equivalence is claimed for generated artboards.
**State:** default third concern, job suitability; same dark response and service mapping. All four interactive states tested separately.

## Findings and accepted constraints

No unresolved P0/P1/P2 functional or composition issue after the iterations below. The expected mobile text-density difference is explicit: generated helper text is too small to treat as production typography. Existing central16px concern/13px helper tokens, 44px+ controls, full readable status details and a mandatory illustrative caption make the actual mobile section taller than the raster. All four main problems/mappings remain visible, with no section accordion or horizontal carousel. This implements the approved responsive structure while preserving the brief's readability and truthfulness requirements.

- Fonts/typography: existing Inter, centralized UDS marketing/page/card/body/helper tokens. Strong headline/teal emphasis, clear concern/service hierarchy; readable labels and true200% text pass. No document typography change.
- Spacing/layout: matching centered intro, desktop selector/response split and mobile stack; fine separators, selected teal rule/background, dark response, CTA then original journey. Target and actual section crops inspected together. Existing rounded CTA geometry follows current global token; no new override layer.
- Colors/tokens: existing white/canvas/navy/teal/soft-teal palette. Selected concern and response text have semantic labels, not color-only meaning. Dark canvas uses existing UDS ink (slightly more navy than the generated slate approximation).
- Images: generated decorative transparent paper illustration, optimized320×320 WebP11,514bytes, sharp at100–160px. Original employer artwork, orbit documents, globe and founder image retained. No CSS-drawn replacement or fake assessment screenshot.
- Copy/content: approved emotional headline, concise mock concern wording, all four direct mappings, four useful grounded responses, clear illustrative caption and employer-decision limitation. No scores or guarantees.

## Iteration history

1. Initial mobile render used the full brief questions and repeated more text than the selected mock. Replaced with the selected mock's concise four quotes; final captures retain all intended concerns/mappings and improve scan speed.
2. Review requested service descriptions for assistive technology and complete enlarged-text coverage. Added aria-describedby mapping links following a failing compiled regression; all native buttons remain keyboard accessible and role=status announces the selected preparation focus. Measured2× text includes spans at320/390, with root200% typography matrix also passing.
3. Browser-harness failures were investigated rather than weakening gates: skip image.decode only for non-rendered lazy artwork at320 (existing visible-image health assertion retained); settle native focus scrolling before baseline, keeping2px stability threshold; exclude the intentional1px visually hidden status text from visible-clipping assertions. Final full hydrated matrix passes.

## Browser verification

- Actual compiled application with anonymous API/image fixtures:320/360/390/430/768/1024/1440; all choices Enter/Space, exactly one selected, matching title/content, retained focus/position, default reset, existing menu/destinations/package/interview/globe/orbit assertions, no overflow/broken visible images/invalid anchors/page errors.
- Enlarged text: measured2× at320/390 and existing seven-width normal/root200% typography suite PASS. Reduced-motion matrix; component introduces no animation/auto-advance.
- Cloud local preview was blocked by upstream connection failure; no local-preview process/health claim substitutes for browser verification.
- Hosted Vercel preview dpl_9tLRmbncdtk3g7JzH83jW3xxQBaA READY at application commit cc8a896. Cloud browser opened the real page and exercised all four selections, confirmed their corresponding headings/evidence/announcements, then restored default. Actual hosted screenshot saved. Application error log empty; browser-extension metadata errors are recorded separately and not attributed to the app.
- Cloud browser viewport is its native desktop size, not a claimed390/1440 device. Exact-width screenshots come from the actual compiled browser harness.
- Section comparison images already isolate all new UI at readable resolution, including selected response/icon/text detail; an additional microscopic crop is unnecessary.

## Remaining limits

No authenticated generation, payment, real account/data writes, paid model calls, physical devices, full screen-reader or field-performance certification. Protected sources unchanged. Remote exact-head CI is a separate merge gate and must complete before release. Final evidence-only commit changes no application code from the hosted preview.

**final result: passed**
