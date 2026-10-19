# LinkedIn and NaukriGulf profile preparation redesign

final result: passed

## Source and scope

The founder requested the font, field formatting and visual style of Add Job Details on both professional-profile journeys, with separate happy-candidate hero imagery, benefits, responsibilities, practical visibility advice, a clear optimisation CTA, and valuable editable results. This is a style adaptation within the existing product, not a pixel clone of the job form. Main baseline: b57daa28adf568e7a82f347041aa0b3bc5a5a5f3.

Source visual truth: `design-qa/profiles/add-job-reference-desktop.jpg`, production `/optimize/target`.
Rendered implementation: `design-qa/profiles/naukrigulf-fields-desktop.jpg`, actual NaukriGulf workspace components in the local cloud-browser preview with synthetic fixtures.
Full-view comparison input: `design-qa/profiles/reference-comparison.jpg`.
Both screenshot images measure 1348 × 926 pixels. Browser CSS viewport reported 1363 × 936; captures use the browser's consistent content crop. No density scaling was applied to the comparison; each original is placed beside the other at 1:1. The reference includes the real authenticated navigation; the isolated component preview intentionally excludes server-authenticated shell components. Compare typography, fields, cards, palette and progress treatment, rather than different content column widths.

Focused evidence: `design-qa/profiles/linkedin-copy-mobile-focused.jpg` and computed typography measurements from both reference and implementation. Mobile renders use actual components and production CSS at 390 × 900 CSS px, density 1; mobile evidence files show consecutive upper regions of full-page test screenshots without scale changes.

## Review and comparison history

- [P2, fixed] Initial local preview did not serve image assets or fonts through its static preview host. Embedded the actual generated images and production font files in the temporary preview only. Both actual production image files also load in the isolated HTTP fixtures. Re-captured the complete NaukriGulf hero in `design-qa/profiles/naukrigulf-intro-desktop.jpg`. Production uses Next Image against committed public assets.
- [P2, fixed] Initial generated-results summary, saved-time panel and progress panel pushed all copy-ready content below the desktop fold. Removed duplicate metadata, kept successful generation as an accessible live announcement, and compacted progress/actions. Post-fix evidence: `design-qa/profiles/linkedin-results-desktop.jpg` and `design-qa/profiles/naukrigulf-results-mobile.jpg`. The first result is now reached sooner; section anchors provide direct access to later sections.
- Final comparison found no actionable P0/P1/P2 issues. Wider desktop workspace columns intentionally accommodate readable content and multiple fields; phone content keeps the shared 12px page gutters and 12px panel padding.

## Required fidelity surfaces

- Fonts/typography: exact Inter family and existing global roles. Reference and implementation h1: 30px / 700 / 40.5px line-height; inputs: 16px / 400 / 24.8px; labels: 14px / 500 / 19.6px. Mobile title is the existing shared 26px role. Existing social-profile illustrative previews retain their separate Arial document scale.
- Spacing/layout: shared card, field, button and control tokens; compact three-step preparation bars; responsive two-column hero/outputs on desktop, stacked on phones. No horizontal overflow at 320, 390, 768 and 1440px across introductions, setup, results and previews. Copy surfaces preserve paragraphs and wrap long text.
- Colours/tokens: existing emerald action palette, white cards, canvas background and visible grey field borders. Quiet blue/emerald visual for LinkedIn and amber/emerald visual for NaukriGulf. Selection uses both radio control and border/background, rather than colour alone.
- Images/assets: separate 1200 × 800 WEBP photos, 58,030 and 68,538 bytes respectively. Sharp, undistorted crop with faces visible; editorial career illustrations, no testimonial attribution or invented performance numbers. Heroicons supply standard interface icons.
- Copy/content: explains why a clear profile matters, exact deliverables/paste destinations, what GCC Mentor prepares and what users publish themselves. Platform-specific tips and future routines have official guidance links. No guaranteed recruiter ranking, visibility percentage, interviews or hiring claims. Headline, summary and selected role descriptions have distinct editing controls, character counts and exact copy values; fixed career facts remain grounded in Career Profile.

## Browser interactions and validation

Cloud browser at local preview: introduction CTA → source → direction → review → synthetic generation → results, section navigation, edit About, return to readable preview, save, cross-platform navigation and future-tip accordion. Local preview uses synthetic Career Profile fixtures and no production AI, credentials or live account mutations. App console reviewed: no application errors; browser-extension metadata warnings were outside the app.

Production build, TypeScript and ESLint pass. Main verification suite: 68 checks passed on the first run; the remaining introduction assertion needed URL-decoding for Next Image's encoded URL and passed when rerun, yielding 69 checks passed. Both actual-component browser suites pass at 320/390/768/1440px, including hero image loading, CTA destination, source/setup/generation, result/preview overflow, edit/preview/copy of the exact revised text, save/retry, pending-save disabling, checklist persistence, optional import/conflict gates and missing-profile routing.

UI test evidence is generated from fixture content, not the user's personal profile. These tests validate presentation and preserve the existing service contracts; the production LLM was not called during this design pass.

## Assets and supplied image-generation direction

Built-in ImageGen was used for both project assets. No CLI/API fallback.

- `public/professional/linkedin-confidence-v1.webp`: 3:2 editorial professional photo, confident happy South Asian mid-career woman at a laptop, bright modern workspace, natural lighting, warm ivory with subtle blue/emerald accents; no text, logos, badge, readable screens, metrics or testimonial framing.
- `public/professional/naukrigulf-confidence-v1.webp`: 3:2 editorial photo, confident happy South Asian mid-career man holding a phone beside a laptop, bright Gulf office and soft city skyline, warm ivory with amber/emerald accents; no text, logos, badge, readable screens, metrics or testimonial framing.

## Follow-up polish

No blocking findings. Consider a future independently scoped research pass for platform form-label changes. This redesign preserves existing generation, storage, revision/conflict handling, validation and account controls.

Previous batch report retained at `design-qa/archive-2026-10-18-batch.md`.
