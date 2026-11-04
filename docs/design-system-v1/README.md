# Premium design system V1 — 4 November 2026

Issue #69. Founder-approved scope, not yet implemented or released. Baseline main `5c426c53de7df3da5a19e9dd8a3e097311816c90`. Visual-only; no APIs, auth, AI/prompts/scoring, schema/data, payments, calculator formulas, URLs or document/template typography changes.

## Sequence and acceptance
A audit → B foundation → C hub + Working Days Calculator reference → founder visual approval → D remaining tool presentation → E SaaS consistency. First reference PR must NOT merge until visual approval, even with green CI. No production settings/secrets changes. Stage C creates reusable components but only opts the directory and working-days-calculator into the new page body treatment. Shared tools navigation is foundation work. 50 reserved routes, 20 active and 30 planned; this mission does not authorize making incomplete calculators active.

Reference acceptance: white canvas; navy headings, teal actions; central Inter role tokens; 8px controls/12px panels; quiet borders and no decorative gradients/shadows; concise directory rows with equal icon treatment, plain availability labels, search and category controls; all 50 routes remain discoverable; one optional CTA; form/result split on wide screens, stacked on phones; result placeholder, visible validation/success, copy/print/reset preserved. Generic field/result presentation reusable for subsequent tools. Existing content, assumptions, FAQs, related links, metadata, schema, publication allowlist and sitemap preserved. No additional framework or runtime dependency.

Files: app/ui-system.css (scoped theme), app/typography.css (scoped token values only if needed), app/tools/page.tsx, app/tools/layout.tsx, app/tools/[slug]/page.tsx, components/free-tools/{ToolCatalog,ToolRunner,ToolCta,Tools.module.css}, new ToolPageLayout/ToolResult/ToolChrome and premium CSS. Keep legacy body styles for non-reference details until approval. Regression: existing formula fixtures, repository required checks, all50 static SEO checks, representative interactive tests, responsive widths320/360/390/430/768/1024/1440, 200% text, labels/focus, no unexpected API calls; comparable local Lighthouse with conditions recorded. Field Core Web Vitals require real75th percentile data and cannot be established by lab runs.

## Current audit evidence
Cloud browser live capture: GCC homepage, tools hub, Working Days Calculator, dashboard → sign-in. Authenticated internal screens not visually observable without valid session; source mapping below is not live certification. MenaJobs homepage, tools directory, working-days, gratuity, keyword matcher, notice-period, resignation-letter pages inspected with current screenshots. Initial blank gratuity capture rejected and recaptured loaded. Header dropdown inspected. Mobile viewport/menu and loading transitions remain to verify; no claims from desktop capture alone. Screenshots in evidence/ and QA artifacts preserve their source and viewport.

MenaJobs strengths: repeated breadcrumb/introduction/form/result/content order; restrained navy body headings and blue interactive/result headers; aligned form fields and persistent result placeholder; related tools and FAQs follow utility; category directory sections improve scan paths. Not copied: proprietary logo/assets, exact page copy, promotional percentages, legal formulas or jurisdiction defaults. GCC reference uses more restrained flat rows, short tool-name headings, teal actions, plain availability, single low-pressure CTA, explicit user-defined assumptions. Competitor legal text observed only, not independently verified or adopted. Its result panel also embeds marketing/email capture, which GCC reference will keep outside results.

## Issue inventory
|Severity|Observation|Affected files|Evidence/status|
|---|---|---|---|
|High|Directory h2 labels inherit section size; long descriptions dominate cards|ToolCatalog.tsx, Tools.module.css, typography.css|Source + live hub|
|High|Statistic p inherits body rules, losing result prominence|ToolRunner.tsx, typography.css|Source; verify reference output|
|High|No extracted ToolPageLayout despite shared dynamic route|app/tools/[slug]/page.tsx|Source|
|Medium|Two signup CTAs per tool compete with utility|dynamic route, ToolCta.tsx|Source + live calculator|
|Medium|Ordinary Free badges and hard-coded category colors|ToolCatalog.tsx, Tools.module.css|Source + live hub|
|Medium|Page-specific controls duplicate shared button/input patterns|ToolRunner, SpecialTool, Tools.module.css, components/ui|Source; preserve handlers|
|Medium|Tools header/footer differs from main; incorrect current-page marker on details|app/tools/layout.tsx|Source/live|
|Medium|50 cards combine20 usable and30 planned tools, with lengthy preamble|app/tools/page.tsx, ToolCatalog.tsx|Source/live; clarify without hiding routes|
|Medium|Global important typography silently defeats module styling|app/typography.css, Tools.module.css|Source; explicit role classes|
|Medium|Heroicons and Lucide both used; mock page imports both|layout/*, mock-interview/page.tsx|Source; use existing Lucide consistently for tools|
|Medium|Several independent SaaS presentation layers|WorkspaceHome.module.css, professional-profiles.css, auth-presentation.css, resume-review.css, career-studio.css|Source-only; Stage E|
|Review|Landing gradient headings and shadows|landing-v3/premium.module.css|Live/source; Stage E preserve orbit/globe|

## SaaS coverage map and limits
Landing app/page.tsx + landing-v3; dashboard WorkspaceHome; Career Profile app/profile/page.tsx; review profile/review reexports profile plus onboarding/report; library dashboard/library; ATS/optimizer optimize/{target,setup,generate,preview} (/ats-scan redirects); cover-letter, interview-qa, mock-interview; linkedin-optimization/naukrigulf-optimization + professional-profiles.css; login/signup/forgot-password/update-password + auth-presentation.css; shared layout/* + navItems. Payments redirects settings?tab=payments: no standalone pricing implementation assumed. All protected flows source-reviewed only, not session tested. Stage E must verify loading/empty/error/success, responsive navigation, contrast/overflow and console behavior with real permitted session or explicitly labelled fixtures.

## Token specification
Palette: heading #123B5D; action #087E9A (white text contrast verified in QA); success #137547; warning #A35B08; error #B42332; white surface; #F8FAFC secondary; #172B3A text; #64748B secondary; #E2E8F0 divider; stronger field boundary when contrast needs it. Central ui-system.css owns opt-in [data-tool-design=v1] theme. Typography stays in typography.css using existing role classes; mobile title30/section23/card17/body15/helper13/input16; desktop title36/section26/card18/body16/helper14. Existing Inter local hosting reused. Spacing4/8/12/16/24/32/48, control height46, radius8 controls and12 panels, width1120, mobile gutters16 (12 at320). Native accessible controls/details, no animation package; reduced-motion support. No color-only status.

## Status
|Stage|Status|
|---|---|
|A live/source audit|In progress; baseline tests/performance pending|
|B foundation|Approved, not implemented|
|C two references|Approved, not implemented|
|Visual gate|Not reached|
|D remaining49 tool bodies|Not started; approval dependency|
|E SaaS rollout|Not started; approval dependency|

## Implemented reference — latest status
The approved reference scope above is now implemented and locally verified. The earlier 'not implemented' planning labels are retained as dated history. [Delivery report](DELIVERY.md) records the actual shipped-to-preview scope, metrics, screenshots, passing checks and access limits. PR#70 remains unmerged pending founder visual approval. StageD/E remain not started. Field boundaries were strengthened to#7D8DA2 after measured contrast QA; semantic card H2s now explicitly outrank legacy central h2[class] enforcement within the reference scope.
