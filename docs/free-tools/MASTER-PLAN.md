# Free Tools Hub master plan

Approved by founder mission 3 November 2026. Status: planning; no tools implemented or production-certified. Baseline main c5cb0e1dcb457091215850799fd4724fce0bdd78.

## Scope and acceptance
50 standalone tools, no login/paywall, no AI calls, no Career Profile dependency, same public routes for members. Each completed tool requires correct pure logic, validation, unique server content/metadata, full results, contextual CTA, related links, browser tests and protected PR release. Unverified legal regimes stay unavailable and out of sitemap. Never change existing scoring, extraction, APIs, auth, payments, database, quotas, templates or animations.

## Audit and reuse
Next 15.5 / React19 / TS / Tailwind, not older versions in prompt. Existing /dashboard/tools lists paid preparation services; no public app/tools route. middleware.ts does not match /tools, so preserve it. app/sitemap.ts currently lists three public URLs; app/robots.ts allows tools. lib/siteUrl.ts centralizes origin. Root metadata defaults canonical to /, so every tool must override it. app/typography.css and app/ui-system.css own shared tokens. components/layout/navItems.ts owns app navigation; PremiumNav and LandingFooter own current public navigation. Reuse existing auth client only for CTA status; never gate calculators. No established client event sink found in initial search; emit optional content-free events without new third-party integration. Browser print provides PDF without paid provider. Existing unpdf/mammoth parsing is server-oriented; initial resume utilities accept pasted text, file-size utility reads metadata only. Do not reuse authenticated AI extraction.

## Architecture and sequence
Phase0: this documentation PR, review diff and links, required checks, protected merge before production edits. Phase1: app/tools directory and shared dynamic slug route, registry, scoped styles, pure calculation modules and validators, page-specific SSR content, metadata/schema, optional CTA auth lookup, sitemap/nav, content-free events. Registry must not publish incomplete tools.
Phase2: tools21–30; Phase3:41–50; Phase4:11–20; Phase5:31–40; Phase6:1–10. Implement and run each tool's fixtures before the next. Shared code may be bundled by category but tracker stays individual. Country-specific URL variants deferred until genuinely unique verified content exists.

Pure calculations return typed results or field errors, reject nonfinite/negative amounts and impossible/reversed dates, cap abusive text/input size, use UTC date-only arithmetic, document inclusive/exclusive rules. Currency inputs do not imply live exchange rates. Present decimal rounding; do not round intermediate amounts unnecessarily. Tool-specific contracts are in TOOLS-INVENTORY.md.

## Dependencies and effort
Foundation precedes all categories. Settlement and termination depend on verified country rules; others can ship independently. Planning/audit 1–2 engineering days; foundation2–3; deterministic40 tools8–15; legal engine/research5–12 plus unresolved authority checks; full QA/release3–5. These are effort estimates, not delivery guarantees. Prefer existing stack over external calculator services: zero per-use API fees, low operational burden, reproducible tests. Hosting bandwidth/build costs remain.

## Risks and mitigation
Legal transitions/regimes: explicit coverage matrix and fail closed. Thin SEO: bespoke examples, FAQs, assumptions and instructions per tool; no duplicate country landing pages. Privacy: memory only except opt-in local tracker; no raw inputs in telemetry. Regression: isolated lib/free-tools and components/free-tools; minimal navigation/sitemap integration; existing CI required. Browser PDF varies: explain system print and test preview. Indexing/ranking is external, never guaranteed. No production secrets/redeploy settings changed.

## Release
Follow QA-TEST-PLAN.md and tracker. Required checks context is checks; never bypass protection or merge pending/failed CI. Confirm automatic Vercel deployment after merge; distinguish source, fixture, preview and live account evidence. PR reports must include scope, tests, SEO, guest/member evidence and limits.


## Founder staging decision — 3 November 2026
Release only the20 locally tested Resume21–30 and General41–50 tools first. Merge through required CI and verify live so the founder can review. Remaining30 stay planned/unavailable, not indexable; resume implementation after this staged review. See RELEASE-1-STATUS.md and issue66. This supersedes the original instruction to finish all50 in one uninterrupted release.
