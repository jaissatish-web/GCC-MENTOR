# Resume quality and design review

Branch: `resume-quality-and-design`.
Base: `8ed6e7c3651f61c48107c5dc105d1c19f11ee3fa` (main at checkout).

## Result

A candidate's professional headline can be imported verbatim, edited in Career Profile, hidden or cleared without changing historical employment titles or application targets. The existing extensible profile rows persist the header fact atomically; no schema migration is required. The headline is consumed by the header and excluded from custom sections. The add/merge path preserves an existing user-reviewed headline.

A shared `resolvePackageResumeDocument` now resolves screen, editor, PDF and Word content. Tailored resumes preserve their saved document, including per-application edits. Career Profile resumes reflect the latest saved profile. Explicitly cleared headlines are not resurrected by legacy title repair. The no-snapshot PDF path now receives the application's title rather than rendering from the profile and only reporting the correct title afterwards.

Named categories print their heading once. Redundant item prefixes such as `Key Achievement:` beneath `Key Achievements` are suppressed in preview, PDF and Word, including existing snapshots. Achievement sentences, meaningful item names and stored source data remain unchanged.

The resume editor also lets users edit or clear the separate project/role context. Raw-profile rendering avoids printing an identical description both as context and as an activity. No profile content is deleted during rendering.

## Designs

Three new stable IDs are available alongside the original fifty:

- `ats_professional`: a readable 11 pt single-column design, without a photo.
- `gcc_professional`: a clean teal single-column design, skills first, optional photo on the right.
- `senior_professional`: 10.5 pt text with compact spacing for longer careers, without a photo.

Contact details, identity/GCC status and additional availability facts use separate lines. The new designs preserve the separate employment description. Template filtering helps choose single-column or optional-photo layouts. Existing saved template IDs and the default template remain unchanged; old golden fingerprints are retained.

## User review

`/resume-design-lab` is a noindex, preview/development-only review page. It contains invented profiles from twenty professions and five experience patterns. Select a design, edit or hide the headline, toggle sample sections and inspect long content. It never calls a customer-data API or saves a profile. It returns 404 on Vercel production deployments.

The section toggles on this sample review page are demonstration controls. In the real product, Career Profile retains its existing field/category visibility controls and the per-resume editor retains its existing section and item editing controls; this change adds the dedicated headline control and editable role context.

## Verification

- 2,000 deterministic synthetic profiles (20 professions × 5 career patterns × 20 variations).
- 7,000 actual template renders: 6,000 across the new designs plus 1,000 across the original fifty.
- 20 real DOCX buffers checked for source-content retention, one per profession.
- Actual DOCX route checked for saved edits, changed master profiles, deliberately blank headlines, authentication and ownership.
- Disposable Postgres checks include atomic headline persistence, stable identity, explicit blank/hidden choices and ownership isolation.
- All new designs exported through the actual PDF renderer with and without a photo, and with a long CV. Short files: one page and 8/8 internal parsing checks. Long files: seven or eight pages with no stranded headings and bounded page-foot gaps.
- PDF pages rasterized and visually inspected; production build, TypeScript and lint checked.
- Full regression runner includes the new quality and export-route checks. Run `npm test` for the complete current suite.

Commands:

```sh
npm run typecheck
npm run lint
npm test
node scripts/verify-template-pdfs-shell.mjs ats_professional gcc_professional senior_professional
node scripts/verify-template-pdfs-shell.mjs ats_professional gcc_professional senior_professional --raw
npm run build
```

The headless-shell adapter changes only the browser launcher for container tests. Production still uses the existing Vercel Chromium configuration. Desktop Chromium failed to launch in this container; the installed headless shell completed the real PDF renderer and file checks.

## Evidence limits and release conditions

These are synthetic mapping/rendering tests, not 2,000 real customer CVs and not 2,000 live model-extraction calls. One-page fixtures and extensive long fixtures are both tested; no page-count guarantee is made for arbitrary content. Internal PDF parsing checks are not certification by every ATS vendor. DOCX content now follows the saved document; its layout remains a separate Word layout, and the existing decision to withhold Word downloads from the UI/raw resumes is unchanged.

No production database migration, customer-data write, AI service call or main-branch merge was performed for verification. A feature-branch preview may inherit the project's configured preview database. Use the synthetic review page first and avoid editing live candidate profiles unless that is intended.

Before merge, the founder should review the three designs on phone and desktop and compare their own intended header/section behavior. For broader extraction accuracy, add consented real source files or an isolated test corpus and evaluate the model reader separately.

## Template gallery and document previews

All 53 designs remain available with their existing IDs and selection behavior. Recommended designs appear first; users can search and filter by profession, single-column ATS style, optional photo, senior/executive or early career. Filtering never applies a design automatically. Gallery cards show the whole first A4 page.

The homepage retains its existing rotating real-template showcase, with a larger featured document. Inline previews use native CSS zoom; the shared full-screen reader provides Fit, 75%, 100%, 125%, 150% and 200% views of live document text, keyboard Escape, focus restoration and scrolling for long CVs. Uploaded photo quality still depends on the original image. Resume sections and export layouts are unchanged by this gallery update.

Validation: TypeScript, lint, all 63 regression checks and the production build passed. The additional offline geometry check (`node scripts/verify-document-zoom.mjs`) could not run because the container browser was unavailable and its download timed out. Live browser visual review is also outstanding; review phone/desktop fit, long-document scrolling, zoom, modal keyboard behavior and homepage animation before merging.
