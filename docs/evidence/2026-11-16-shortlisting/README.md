# Latest revision — approved Option2, 16 November 2026

Founder selected “Find your preparation focus” (second displayed image), approved build and merge after verification, and superseded the rejected original PR90 design below. Same branch/PR90, WorkReport89. Original source release remains main b6667b0 until checked merge.

Four always-visible candidate concerns directly show service mappings. Selecting one updates a single illustrative response canvas; default is job suitability. Explicit example/limits wording, no fake score, no user data or actual assessment. Shorter approved-mock quotes reduce mobile height. Original colorful employer rows/disclaimer, journey, orbit, globe and services retained.

Build, typecheck/lint, full92/92 offline suite and mobile typography suite passed locally. Final hydrated matrix PASS at320/360/390/430/768/1024/1440; all four selectors, keyboard/focus, measured200% at320/390, no page errors/overflow. Hosted preview READY and all four states exercised in cloud browser. Normalized comparisons reviewed; design-qa.md final result passed. Exact-head remote CI remains the merge gate.

Assets: option2-reference.webp is the approved concept board; public/landing/v3/preparation-evidence.webp is the generated decorative paper illustration. Both are illustrative; no template or real resume was altered.

Plan: ../../superpowers/plans/2026-11-16-candidate-focus.md. Current QA: ../../../design-qa.md.

## Final Option2 evidence

- [Desktop browser capture](option2-1440.webp) · [Mobile browser capture](option2-390.webp)
- [Desktop comparison](option2-compare-1440.webp) · [Mobile comparison](option2-compare-390.webp)
- [Hosted browser capture](option2-hosted-default.jpg)
- Preview: https://gcc-mentor-gu8htyph7-satishs-projects-c02c354b.vercel.app/ (application commit cc8a896; final evidence commit changes docs/tests only).

The mobile implementation uses readable central typography and explicit example labels rather than the generated board's tiny helper type, so it is taller than the conceptual raster. It preserves every main concern/mapping and avoids full-section collapse. See design-qa.md for normalization, iterations and accepted differences.

## Historical rejected first PR90 revision

# V3 shortlisting preparation section — 16 November 2026

Founder-approved follow-up to released V3, main `b6667b0756cfeeb8bf91ea67474f55ff7c9f79ed` (tree `e8ccddca68f24dc1b7d210cca0a7f80e4423c970`). PR #88 is already merged; a focused follow-up PR is required. Work Report: [#89](https://github.com/jaissatish-web/GCC-MENTOR/issues/89). Do not merge or release without new explicit founder approval.

## Implemented order

Hero → GCC countries → both colorful employer marquees and disclaimer → candidate pain points → GCC Mentor solutions → Career journey → product demonstrations.

The old collapsed FAQ version is removed. The new headline, supporting paragraph and four concerns use the founder's exact copy; each has a short practical explanation. The solution bridge covers Career Profile, ATS analysis, Optimized Resume, Cover Letter and interview preparation, without a shortlisting/employment guarantee. Compact editorial rows use existing Executive Slate & Teal tokens. Mobile shows two concerns initially; the same keyboard-accessible button reveals/hides only the additional two. Desktop shows all four.

## Verification

- Baseline and final post-change full offline suites (`npm test`): **92/92 PASS** each.
- Compiled-page regression: **RED** on original V3 for missing candidate headline, then **GREEN** on implementation, including exact copy and required section order.
- Local production compilation/build: **PASS**, with the font fixture limitation below.
- TypeScript and lint: **PASS**, no lint warnings/errors (existing Next lint-command deprecation and npm proxy notices).
- Actual compiled-page browser matrix: **PASS** at 320/360/390/430/768/1024/1440 CSS px, DPR1. No document overflow, broken visible images, invalid anchors or page errors. Checks retain original navigation, menu/Escape, package tabs, interview controls/progress, ten resume orbit faces and Gulf selection; original routes remain available.
- New disclosure behavior: keyboard Enter, aria-expanded, focus retention, extra concerns hidden after collapse, first two concerns/solution always present, all four visible at desktop widths: **PASS**.
- Enlarged text: mobile expanded concerns at measured 2× computed text size, plus existing root 200% text check: **PASS**, no horizontal overflow or story text clipping.
- Fresh 390px/1440px screenshots visually inspected. These capture the compiled application with anonymous local API/image fixtures and reduced motion; they are not live production captures.
- Independent read-only review: no Critical/Important source issue. Minor regression-coverage suggestions addressed (exact support/explanations, collapsed visibility and expanded enlarged text). Reviewer did not execute the later browser run; the lead did.

## Screenshots

![Mobile: two visible concerns and the solution bridge](mobile-390.png)

![Desktop: all four concerns and solution bridge](desktop-1440.png)

## Scope and limits

No resume templates, document typography, resume previews/PDF code, AI services, auth, backend, database/configuration, dependencies, marquees, orbit or globe sources changed. No paid AI/service calls. Source comparison and local verification do not certify signed-in generation, actual production network/CDN delivery, screen readers or physical devices.

Google font fetching stalled in this restricted local environment. The successful build used Next's local font-response fixture with existing V3 CSS/font bytes; application layout/font source and configuration are unchanged. The system Chromium launcher failed before opening a page; the bundled repository Chromium successfully ran the matrix. These are environment workarounds, not product fixes. Remote CI/build status must be checked separately.

Rollback: close the unmerged follow-up PR to leave production unchanged. After a separately approved release, revert only this change through a reviewed PR; no database rollback is needed.
