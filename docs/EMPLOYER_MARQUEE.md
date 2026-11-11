# Dual employer logo marquee —11November2026

Status: implemented and locally browser-verified; separate draft PR/nonproduction preview delivery in progress. No merge or production release authorized.
Base main0d6f5e9. Temporary branch design/dual-employer-marquee.

Scope: one reusable logo section inserted between six-country band and connected journey, maintaining hero/flags as one introductory composition. Exact founder heading, support and non-affiliation disclaimer. Two visually balanced white/slate rows: top moves right-to-left, bottom left-to-right. Official, locally hosted brand assets with provenance; current QatarEnergy rather than legacy QP/Qatar Petroleum; no duplicate legacy Qatargas. No endorsements, partnerships, hiring claims or job-board links.

Design: existing UDS colors/font/spacing, compact heading, normalized logo windows with contain aspect preservation, gentle edge mask, no decorative card grid. CSS-only transform loop with two equal-width groups and identical boundary gap; no motion library. Pause on hover and focus; explicit accessible pause control for continuing animation; reduced-motion renders static wrapping groups with duplicates hidden. Only unique group announced by assistive technology. Fixed image dimensions reserve geometry; no third-party logo requests at runtime.

Files: new modular presentation component and its CSS/data, local assets/source manifest, one import and section insertion in app/page.tsx; bounded browser QA + CI step; these docs/progress/decision log. No changes to theme defaults, other sections, existing animations, resume/template/PDF/backend/auth/AI/pricing/business logic.

Acceptance: actual390/1440screenshots, six-width overflow/image checks, opposite transform direction, loop reset geometry, hover/pause and keyboard toggle, reduced-motion static list, correct names/disclaimer, same-order/unchanged existing landing sections, image payload and request count/CLS observations. Build/type/lint/repository checks. Draft PR/main base and matching-SHA preview, no merge.

## Implemented and verified

21 locally hosted, sourced employer logos. Current QatarEnergy and QatarEnergy LNG; no QP/Qatar Petroleum/Qatargas legacy duplicates. Exact supplied copy and disclaimer. Selection excludes ADNOC/EGA/Petrofac pending suitable verified current artwork; no substitute brands. Visual inspection replaced an incorrect Hyundai Motor footer asset with Hyundai E&C’s actual header mark and a partial Samsung mark with the current Samsung E&A header mark. White-only L&T/McDermott/Ma’aden marks get a dark monochrome filter. Source URLs and artwork hashes: public/landing/employers/SOURCES.md.

Production build passed (includes lint/type validation); npm test92/92 passed. Chromium: new marquee checks pass360/390/430/768/1024/1440px, including opposite motion, equal loop-group widths, hover pause, keyboard pause/resume, reduced motion exposing all unique logos, image decoding, no horizontal overflow and zero layout shift attributed to the section. Compiled actual V2 six-width suite passed all existing destinations/navigation/interview/globe interactions; orbit-depth suite passed390/1440. No comparison threshold changed. Historical strict FittedPage mounted-geometry drift is outside this presentation-only task and was not fixed or weakened here.

Performance: 182588 bytes total local logo artwork, 21 unique logo URLs shared by duplicated groups; no dependencies added, CSS transform motion only, fixed image boxes, no third-party logo calls. Local observations are not field Core Web Vitals or a production Lighthouse score. Browser tests use compiled actual components with anonymous read-only API fixtures, not authentication/backend verification.

Protected-source review: app/page.tsx adds only one import and one component insertion. No existing presentation, orbit/animation, resume renderer/template/PDF, backend/auth/AI, pricing or business-logic files modified. Existing CI checks retained, one bounded marquee browser check added.

Next: inspect matching-commit Vercel preview, deliver mobile/desktop screenshots and draft PR; wait for founder approval. Production remains unchanged.

## Approved correction — original brand colors
Founder requested original company colors instead of grayscale (11 November 2026). Remove grayscale and reduced opacity from all logo images. Preserve the official white/reversed L&T, McDermott and white/gold Ma’aden assets on a dark slate logo window so they stay visible without recoloring artwork. Keep all layout, motion, pause/reduced-motion and protected systems unchanged. Verify six-width browser behavior and update draft PR82/preview; no merge.

Color correction verified: production build including lint/types passed; actual Chromium screenshots show original company colors; marquee behavior, image loading, pause/resume, reduced motion and overflow checks pass all six widths. Only logo appearance and provenance wording changed; no assets, animation timing or protected code modified.
