# Premium Tools V1 — approved rollout, 4 November 2026

Status: approved, implementation starts after founder visual approval (`Ok` in response to the explicit reference approval/share-link question). Lead owns PR70 merge/CI/release. This change covers Stage D presentation for the remaining49 reserved tool bodies using the approved reference template; all50 bodies will share ToolPageLayout. Publication remains20active/30planned. No claim that unavailable calculators are implemented.

## Scope and invariants
Affected files: app/tools/[slug]/page.tsx and components/free-tools/{ToolPageLayout,ToolRunner,SpecialTool,PremiumTools.module.css}. Consolidate title/breadcrumb/content/FAQ/related links/one CTA; preserve metadata/schema, country-specific pending reasons, methods/examples/mistakes/limitations/FAQs and all URLs. Existing formulas, validation, handlers, client state, input transmission and publication allowlist remain unchanged. No lib/API/auth/AI/data/schema/payments/template changes.

Special file/checklist forms adopt the same fields/actions/result surfaces; contextual button labels replace the reference-specific label on other tools. Checkbox/file/reset/copy/print behavior is unchanged. Inactive pages show the original explicit unavailable reasons and jurisdiction limits.

## Acceptance and verification
Every reserved route uses data-tool-design=v1 and the shared layout, exactly one optional CTA and one H1. All20active utilities retain fixture outputs/actions and all30planned pages retain noindex/availability. Test built50-page SEO,20tool hydrated states, representative special forms at320 and the seven specified widths, no overflow/error/API regressions. Root runs full build/requiredCI and visual QA after integration; targeted typecheck/lint evidence added below. No deployment or runtime claim at implementation start.

## Source implementation and targeted checks
All50 reserved tool bodies now route through ToolPageLayout. Active pages use the approved form/result presentation, contextual action labels and a single CTA; inactive pages preserve their original availability/legal text. File/checklist controls adopt the same component styles; checkbox glyphs retain native controls inside44px label hit areas. Methods/examples/mistakes/limitations/FAQs and metadata/schema are retained. Formula/spec/registry/API/service sources were not edited.

Targeted final `npm run typecheck` and ESLint for the four touched TSX files passed, plus `git diff --check`. Full build,50-page/20-active-tool browser regression, seven-width visual QA, required remote CI and deployment verification remain lead-owned and pending. No merge/deployment claim from this source task.
