# COMPACT-BRAND-001 — consistent, compact application presentation

26 October 2026 (Riyadh). Approved by Satish; implemented and locally verified. Baseline main 3d0961e. The founder requests a clean branded landing and internal SaaS, smaller readable mobile typography and CTAs, consistent colours and precise alignment.

## Approved contract
Use the existing Inter font and one restrained indigo action colour with neutral white/slate surfaces. Centralize palette values in ui-system.css and all typography in typography.css. Remove duplicate internal palette values so one edit propagates to public and internal surfaces. Preserve semantic red/amber/green for issues, warnings and progress, and independent document colours.

Mobile body 15px, supporting text/labels/buttons 14px, captions 12px; app page titles 22px/26px desktop, section titles 18px/20px, card titles 16px, regular body and 600/700 heading weights. Landing hero 30–48px rather than 36–60px; public section headings 22–30px. Form entry remains 16px to avoid mobile zoom. Controls have 44px minimum touch targets, 10px radii, cards 16px; spacing follows the existing 4/8px rhythm. Content containers, card insets and action alignment consume shared tokens. Long labels and enlarged text must reflow.

## Scope and acceptance
Affected: app/typography.css, app/ui-system.css, app/responsive.css, app/career-studio.css, public landing/interview modules and auth/professional layout CSS where needed; existing verification expectations and documentation. Keep component logic, routes, APIs, auth, database, scoring, prompts, quotas and all resume/document renderers unchanged. No rebrand or service change.

Inspect live public landing and locally built real components using fictional fixture APIs. Verify 320/390/768/1440px and enlarged text, shared tokens and document isolation; retain navigation, profile editing, report and CTA interaction checks. Run typecheck, lint, full regression suite and production build. Record local vs live evidence separately. Main remains the only standing branch; publication must respect existing main protection and authorization.

## Result
Implemented in eight presentation CSS files. One root palette now reaches landing/auth/internal screens; typography shares a root scale with semantic internal aliases. Public/internal inputs use white surfaces; controls and CTA rows use44px minimum targets; mobile/app headings, card radii, spacing and desktop header wrapping follow the compact contract. No API/lib/types/schema/auth/template/React component changes.

Verification: full80/80 regression suite, clean native-directory production build (including typecheck/lint),29 Career Studio responsive/state interactions, production CSS mobile and200% text reflow, shared role/token propagation and public/internal consistency, document isolation, universal typography, and actual profile CTA/phone selections at320/390/768/1440 passed. The mounted-workspace build compiled/generated pages but failed export-directory cleanup with ENOTEMPTY; the same final source built successfully in a clean native directory. Prior screenshots of real fictional workspace components were inspected at phone/desktop; public static-layout screenshots omit dynamic images/globe and are not proof of their runtime rendering. Public production baseline was inspected in cloud browser; authenticated production flows remain unverified.

PR #40 targets protected main. Required remote CI and merge are pending; the production deployment has not been updated or verified.

