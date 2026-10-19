# Typography audit and mobile refinement — 19 October 2026

## Verdict and changes

The original normalization used the same body size for card descriptions, making mobile text compete with headings. The refined system uses 15px normal body, 14px card descriptions, 16px page introductions, 16px fields and 16px copyable results on phones. Labels/supporting copy stay 14px and captions 12px. Headings remain 26/20/16px on phones and 30/22/18px on larger screens.

All values are owned by `app/typography.css`. Application components consume semantic classes; resume template components, document previews and exports remain outside the typography boundary. No service logic, content, card colours or layout spacing was changed. An AST comparison confirms component edits only alter static text-role classes.

## Numbered audit steps

1. **Reference and hierarchy — needed refinement.** Inspected Add Job Details, the supplied phone screenshots and current profile-page captures. Headings used the same font but supporting descriptions needed a separate role.
2. **Route and source inventory — complete.** Audited all 49 route sources; the automated guard checks 178 UI components and 11 consuming stylesheets for centralized font values. The guard is part of `npm test`.
3. **Rendered mobile hierarchy — passing within the stated fixtures.** The new built-page suite covers 88 page/viewport cases plus four isolated password-form cases at 320, 390, 768 and 1440px, checks heading sizes/weights, 16px fields and horizontal overflow. Uses fictional local API responses only.
4. **Saved content and template isolation — passing.** LinkedIn and NaukriGulf actual-component suites cover editable results, preview, save/retry and checklists at four widths. Preparation tests cover saved letters, email editing, Q&A, signup, progress/retry and document-orbit behavior. Shared mobile checks include 200% text and protected document fonts.
5. **Live release — verify after deployment.** Compare computed role sizes on the production profile pages and Add Job Details after the deployment reaches READY.

## Route-by-route coverage

Source coverage is complete; rendered coverage and limits are stated separately. A redirect or an unpublished page is not counted as a full content-page test. Automatic generation and payment paths were not started on the live account. Admin review uses typography metrics/source checks rather than copying complete admin HTML.

| Route | Evidence / limit |
|---|---|
| `/[legalSlug]` | Source reviewed; privacy/terms/refund currently unpublished (missing-page state) |
| `/admin/access-log` | Live route inspection + shared-role/source checks; phone data-table states not exhaustively exercised |
| `/admin/ai-provider` | Live route inspection + shared-role/source checks; phone data-table states not exhaustively exercised |
| `/admin/content` | Live route inspection + shared-role/source checks; phone data-table states not exhaustively exercised |
| `/admin/packages` | Live route inspection + shared-role/source checks; phone data-table states not exhaustively exercised |
| `/admin` | Live route inspection + shared-role/source checks; phone data-table states not exhaustively exercised |
| `/admin/plan` | Live route inspection + shared-role/source checks; phone data-table states not exhaustively exercised |
| `/admin/promo-codes` | Live route inspection + shared-role/source checks; phone data-table states not exhaustively exercised |
| `/admin/prompts` | Live route inspection + shared-role/source checks; phone data-table states not exhaustively exercised |
| `/admin/services` | Live route inspection + shared-role/source checks; phone data-table states not exhaustively exercised |
| `/admin/users` | Live route inspection + shared-role/source checks; phone data-table states not exhaustively exercised |
| `/ats-scan` | Redirect/alias source reviewed; destination uses shared typography |
| `/auth/update-password` | Actual component fixture with fictional auth; 320 / 390 / 768 / 1440px |
| `/cover-letter` | Built-page render: 320 / 390 / 768 / 1440px |
| `/create-resume` | Redirect/alias source reviewed; destination uses shared typography |
| `/dashboard/library` | Built-page render: 320 / 390 / 768 / 1440px |
| `/dashboard` | Built-page render: 320 / 390 / 768 / 1440px |
| `/dashboard/tools` | Built-page render: 320 / 390 / 768 / 1440px |
| `/forgot-password` | Built-page render: 320 / 390 / 768 / 1440px |
| `/gcc-readiness` | Redirect/alias source reviewed; destination uses shared typography |
| `/gulf-readiness` | Built-page render: 320 / 390 / 768 / 1440px |
| `/gulf-readiness-score` | Built-page render: 320 / 390 / 768 / 1440px |
| `/interview-qa` | Built-page render: 320 / 390 / 768 / 1440px |
| `/linkedin-optimization` | Built-page render: 320 / 390 / 768 / 1440px |
| `/linkedin-optimization/workspace` | Built-page render: 320 / 390 / 768 / 1440px |
| `/login` | Shared AuthShell source; signup form fixture at four widths; live signed-in session redirects Home |
| `/mock-interview` | Built-page render: 320 / 390 / 768 / 1440px |
| `/naukrigulf-optimization` | Actual component fixtures: intro, setup, saved/editable results and preview at four widths |
| `/naukrigulf-optimization/workspace` | Actual component fixtures: intro, setup, saved/editable results and preview at four widths |
| `/onboarding/extracting` | Source reviewed; saved-import/report requires a preceding draft; parser/progress fixtures cover shared UI |
| `/onboarding` | Existing-profile guard renders Profile at four widths; import extraction uses separate fixtures |
| `/onboarding/report` | Source reviewed; saved-import/report requires a preceding draft; parser/progress fixtures cover shared UI |
| `/optimize/generate/[packageId]` | Actual progress/error/retry component fixture at four widths; no live generation |
| `/optimize/pay/[packageId]` | Redirect path reviewed; no payment or live generation initiated |
| `/optimize/preview/[packageId]` | Shared UI/source and document-boundary checks; saved-work variants not exhaustively exercised |
| `/optimize/setup` | Missing-draft guard redirects to job details at four widths; setup selection requires a saved target |
| `/optimize/target` | Built-page render: 320 / 390 / 768 / 1440px |
| `/package/[id]/edit` | Source + live editor controls; template isolation fixture; no saved content edits |
| `/package/[id]` | Shared UI/source and document-boundary checks; saved-work variants not exhaustively exercised |
| `/` | Built-page render: 320 / 390 / 768 / 1440px |
| `/payments` | Redirect/alias source reviewed; destination uses shared typography |
| `/preparation-pack` | Built-page render: 320 / 390 / 768 / 1440px |
| `/professional-profile` | Redirect/alias source reviewed; destination uses shared typography |
| `/profile` | Built-page render: 320 / 390 / 768 / 1440px |
| `/profile/visibility` | Redirect/alias source reviewed; destination uses shared typography |
| `/resume-design-lab` | Built-page render: 320 / 390 / 768 / 1440px |
| `/settings` | Redirect/alias source reviewed; destination uses shared typography |
| `/signup` | Shared AuthShell source; signup form fixture at four widths; live signed-in session redirects Home |
| `/templates` | Built-page render: 320 / 390 / 768 / 1440px |

## Evidence and limits

Fresh live captures were inspected. Captures showing skeletons/loading were rejected as visual evidence; they do not establish a successful page review. The accepted phone captures are rendered from actual current components or built pages with fictional API data, including the NaukriGulf card hierarchy and job-details form. Local QA screenshots and results are under `artifacts/type-final/` and `artifacts/page-typography/` (not committed, to avoid publishing account data).

No claim of complete accessibility compliance is made. The automated checks cover sizing, weights, field readability, overflow, configuration propagation and document isolation. All possible account states, admin table contents and unpublished legal content cannot be verified from these fixtures.

Typography is centrally adjustable; future pages should use semantic headings plus `type-body`, `type-lead`, `type-description`, `type-helper`, `type-caption` or `type-longform`. Run `npm test`, build, `test:typography`, `test:mobile` and `test:page-typography` after future changes.

The password screen is verified through an isolated component fixture with a fictional authenticated user. The raw static export lacks local authentication configuration and is excluded from the built-page suite. The suite explicitly rejects client-error screens and runtime errors.
