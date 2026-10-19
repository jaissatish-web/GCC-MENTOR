# Universal typography verification — 19 October 2026

Reference: the existing Add Job Details page. Scope: text styling only.

## Implementation

- `app/typography.css` is the only typography configuration source: Inter, semantic sizes, weights, line heights and letter spacing.
- Semantic headings, paragraphs, fields, labels, helper copy, captions and actions take precedence over old module styles, utility classes and inline UI settings.
- Existing page/module font declarations consume these tokens. The editor UI and social-profile examples use the same application font.
- Resume document render boundaries preserve template typography. Future document surfaces may explicitly use `data-typography="document"`.
- Text wrapping covers long words, brand copy and navigation action copy at enlarged text sizes. No card, colour, border, padding, width or spacing declarations were changed in existing stylesheets.

## Verification

- Production build, typecheck and lint.
- Typography browser fixture at 320, 390, 768 and 1440px: semantic roles override conflicting module, utility and inline settings; heading fragments inherit their heading; changing root font/size tokens propagates; Georgia document text stays isolated.
- Mobile browser suite at 320–1440px: shared UI and actual public landing markup, normal and 200% text size, no horizontal overflow or clipped heading, 44px controls, bundled Inter and document isolation.
- Actual LinkedIn and NaukriGulf components at 320/390/768/1440px: setup, results, editable text, preview, save/retry, checklist persistence and import-conflict paths.
- Interview UI: result categories, charts, question explorer, answer tabs, saved text, keyboard controls, reduced motion and six responsive widths.
- Readiness input: actual PDF/DOCX extraction, paste, invalid/oversized files, parser failure/retry and focus.
- AST comparison of all 11 modified existing CSS files confirms every non-typography declaration is unchanged.
- React review: the two TSX edits only replace font-size expressions with shared tokens; no hooks, behavior, fetches or accessibility semantics changed.

## Older checks needing separate maintenance

These additional UI scripts have stale assertions against features already changed before this typography pass:

- `test:readable-ui` expects the former Home region “Your progress and next step”; current Home uses “Your next step”.
- `test:preview` expects 50 template names; the current catalog exposes 53.
- `test:preparation` targets the former textarea label “Cover letter text (editable)”; the current cover letter uses the email editor surface.

Their failures are recorded rather than changing product behavior to satisfy outdated tests. No live generation or production data mutation was needed for typography validation.
