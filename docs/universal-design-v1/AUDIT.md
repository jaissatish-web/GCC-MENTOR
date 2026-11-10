# Universal Design System V1 — source architecture audit

Date: 10 November 2026. Inspected base: `f72e2faccf4e287f9ac7d213d988f8045a10a961`.

Status: source inspection only. This document does not certify production behavior, visual equivalence, database configuration, or test results. The current founder instruction authorizes a foundation, administrator preview and landing-page pilot. Other pages require subsequent visual approval and migration.

## What already works and should be reused

| Existing owner | Current responsibilities | V1 treatment |
|---|---|---|
| `app/ui-system.css` | RGB-channel palette, semantic color aliases, geometry, navigation accents, component state styling, retained Tailwind utility bridges | Reuse existing `--ui-*` vocabulary and channel format. Do not replace a channel value with a hex string. |
| `app/typography.css` | Inter family, semantic size/weight/line-height roles, responsive role changes, strong legacy utility enforcement | Keep as the stylesheet owner for typography; bind approved settings to its existing roles. |
| `app/globals.css` | Import order, Tailwind layers, document baseline, orbit geometry and global primitives | Keep existing document and animation rules untouched. Add no broad headings/table/paragraph resets. |
| `app/responsive.css` | Existing application layout adaptations and field/button behavior | Preserve application geometry until the approved migration stage. |
| `components/ui/Button.tsx`, `Card.tsx`, `Input.tsx`, `Textarea.tsx`, `Select.tsx` | Existing accessible control structure, forwarding, variants, busy semantics and field associations | Reuse actions and component contracts. Add only missing presentation variants if needed. |
| `app/admin/*`, `lib/admin/adminAuth.ts` | Middleware plus per-page `requireAdmin()` checks; server actions independently check admin identity | New design page must call existing `requireAdmin()`. No new authentication flow. |
| `app/page.tsx`, `components/landing-v3/*` | Current public landing, resume orbit, globe, navigation, native disclosures and interview demonstration | Preserve content, destinations and interaction/rendering components; migrate surrounding visual styles only. |

`app/layout.tsx` already loads locally served Inter through `next/font`, plus Instrument Serif and IBM Plex Mono. No new font dependency is needed. `tailwind.config.ts` contains extensive legacy static utilities and is protected by existing design documentation; current CSS bridges adapt those utilities outside document boundaries.

## Current conflicts and incomplete central control

1. Palette currently starts as Azure & Slate (`--ui-brand-rgb: 37 99 235`, canvas `245 248 252`); it differs from the newly approved Executive Slate & Teal. Do not confuse historical documentation palettes with the requested new default.
2. Typography currently uses mobile hero36/page28/section21/card17/body15 and larger-screen hero48/page32/section24/card18/body16. Its single 768px scale does not implement the requested independent tablet/desktop hierarchy.
3. Landing `premium.module.css` declares local `--lp-width:1200px`, a fluid gutter, fluid section spacing, serif/display size roles and numerous fixed gaps/heights. Some are overridden by global `!important` typography enforcement; intended CSS and computed output can disagree.
4. Geometry is partly centralized but not complete. For example `WorkspaceHome.module.css` uses fixed 1180px width,14px card padding,12px radius and local gaps. Globally connected colors alone do not establish migration of that page.
5. `ui-system.css` includes both foundational tokens and many later feature-specific fixes, compatibility selectors and compound exclusions. Do not append another site-wide generic override system to it. Keep new preview behavior opt-in and serialize only known tokens.
6. Card radius is currently16px and control radius12px in root tokens; some component/premium-tools scopes override those values. Responsive geometry uses640px in foundation and768/1024px in application rules. Scope-specific tokens must be audited before claiming universal control.
7. The shared Button already handles primary/secondary/ghost/danger/disabled/loading and small/medium; it lacks a large size. Global `.ui-button` minimum-height/padding rules can flatten its nominal size variants. Card currently exposes only light/dark/dark-interactive tones, not all requested semantic states.
8. Inputs share `.field`, labels and feedback. Existing responsive rules pin44px minimum and16px input type; preserve these accessibility floors when settings change.
9. Reduced-motion support already exists in orbit/landing/shared interaction components. Replacing animations is outside scope.

## Resume isolation and protected paths

Protect `components/templates/`, `lib/pdf/`, resume/template configuration, preview scaling, template selection and PDF routes. Source search found no `--ui-*` token consumption in template or PDF implementation. Engine/Gulf templates carry authored inline font stacks, sizes, colors and spacing. PDF rendering has its own document HTML/style path.

Existing UI selector exclusions include `[data-document-preview]`, `#resume-render`, `.actual-template-orbit-face`, and `[data-typography="document"]`, with roots and descendants excluded. Some older color/geometry bridges additionally exclude `.linkedin-profile-preview` but omit the generic typography boundary. Do not extend such incomplete selectors into a new global rule.

`app/globals.css` pins existing resume wrapper font-size to `.9375rem` and line-height1.5. `ResumeDocumentView` adds `data-document-preview` to the scaled page and fullscreen content, retaining fixed794px width. `DocumentOrbit` wraps actual templates in `.actual-template-orbit-face`; those contents must keep their current formatting and scale.

Important residual inheritance risk: exclusion prevents direct selectors, but wrappers can still inherit family, weight or ink from UI ancestors when a template descendant has no explicit value. Body UI font/weight changes and custom-property inheritance therefore require actual baseline comparisons. Merely keeping template source unchanged is insufficient evidence of visual equivalence. Prefer pilot-scoped settings and a stable existing document baseline over altering renderer code.

### Available regression tools

- `scripts/verify-typography-documents.mjs` compares every authored template at390/1440px using original compiled CSS (`TYPE_BASELINE`) against the changed build; records every element’s type, color and relative geometry and representative PNGs. Include the proper `TYPE_BASE_REF` rather than its historical default.
- `scripts/verify-template-pdfs.ts` runs the real PDF path with fictional photo/no-photo and long fixtures, supports selected template IDs, retained `OUT` files and style overrides. Capture originals before modifying global CSS, then compare equivalent generated files/rendered pages after.
- `scripts/verify-resume-style.ts`, template/catalog/engine checks and existing typography source checks support source/functional regression but do not replace visual/PDF comparisons.
- Browser regression scripts depend on local Chromium and `sucrase/register`; verify actual availability before reporting results.

## Persistence audit and exact approval boundary

Existing `site_content` (migration046) stores `slug`, `title`, text `body`, `published`, timestamps and editor ID. Its public policy reads published rows; writes are service-role-only through admin server actions. `lib/admin/siteContent.ts` caches public reads with a tag and provides a missing-configuration fallback. Existing generic editor lists all rows and can replace content bodies.

This is a useful authorization/cache pattern but not yet a typed theme store. Putting draft, published and rollback JSON into unrelated content slugs would introduce a new backend contract, public-row semantics, possible accidental edits through the generic content screen and concurrency/version concerns. No existing design-publishing runtime or theme revision store was found.

**Recommendation for this approved implementation pass:** build code-owned validated defaults, live scoped preview, responsive controls and browser-local draft with explicit labels. Keep Publish and Restore published theme unavailable with an explanation until backend approval. Browser-local draft persistence must never be presented as site-wide publishing or server-enforced storage.

**Proposed later persistence implementation, requiring founder approval:** a dedicated numbered migration for an administrator-written theme state containing draft, published, previous published configuration, version, publication time and actor; server-side strict allowlist/range validation; atomic publication with expected-version conflict check; administrator-only write operations using `requireAdmin()`; public reads of validated published tokens only; cached server-rendered CSS delivery with tag invalidation; code-known-good fallback on absent/malformed/error state. No arbitrary CSS or selectors. Reuse the existing Supabase infrastructure. Present exact schema/actions/cache scope for approval before writing them.

## Recommended consolidation sequence

1. Record new authorization and protected scope in the domain spec/progress/decision log.
2. Capture original compiled CSS, representative resume PNGs and real PDF outputs before global CSS changes.
3. Implement a typed setting allowlist mapped to existing semantic variable names, maintaining RGB-channel aliases and bounded values.
4. Scope default foundation/pilot styling to explicitly opted-in application UI; preserve every document boundary and inherited baseline.
5. Add `/admin/design-system` with existing admin checks, live responsive preview, honest browser-local drafts, reset and visible persistence limitation. Use existing local components.
6. Migrate landing module aliases, typography roles, buttons/cards/forms and relevant nav chrome to the foundation. Preserve orbit, globe, copy, links and services.
7. Verify six requested widths and the six requested setting changes; compare resume/PDF baselines and run required checks. Block review/merge on unintended document differences.
8. Open an approval PR. Do not merge or publish production before founder review. Remaining SaaS surfaces are a later systematic rollout, not completed by this pilot.
