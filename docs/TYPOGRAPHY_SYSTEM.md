# Current application typography — 2 November 2026

MENAJOBS-TYPE-001 replaces the historical scales below. Implemented in app/typography.css: mobile/desktop hero36/48, page28/32, section21/24, card17/18, body15/16, label14, helper13/14, button14/15, caption12/13px; inputs16px. Inter retained. See [implementation and QA report](MENAJOBS_TYPOGRAPHY_2026-11-02.md) for measured reference evidence, protected documents and release limits. Historical sections below explain earlier decisions, not current tokens.

# Compact shared typography — 26 October 2026

COMPACT-BRAND-001 uses Inter, body15px/1.55, helper/label/button14px, captions12px, inputs16px/1.5; page headings22px mobile/26px desktop at700, section headings18/20px at600, cards16px at600. Landing hero30–48px and sections22–30px. Root typography.css owns the scale; internal levels consume aliases instead of duplicating values. Documents are isolated. Implemented and locally checked; release pending. See COMPACT_BRAND_2026-10-26.md. Earlier sections below retain historical rationale.

## CSS ownership cleanup — 26 October 2026

CSS-CLEANUP-001 preserves the current computed typography. typography.css remains the sole type-scale owner; necessary important rules and document exclusions remain. Obsolete competing module/global declarations are removed and mobile/desktop layouts use responsive.css. See [CSS_CLEANUP_2026-10-26.md](CSS_CLEANUP_2026-10-26.md) for exact equivalence evidence and release status.

# Current direction — reference typography, 25 October 2026

SOFT-INDIGO-001 adopts the selected SkillDrift reference with existing bundled Inter. Current scale remains central in app/typography.css: page headings24/28px with800 weight; sections18/20px600; body16px400 at1.625 line; controls16px; helper14px; caption12px. Auth title26px800, desktop story40px800, field labels15px700. Marketing retains its responsive display scale with800 headline emphasis. Only headings receive stronger weight; body stays regular. Auth-specific roles are still configured centrally. Resume/template typography is protected. See [SOFT_INDIGO_2026-10-25.md](SOFT_INDIGO_2026-10-25.md). Earlier sections below are dated context.

# Clear Path internal typography — 24 October 2026

Current internal configuration is the `.app-type.internal-ui` block in `app/typography.css`. It overrides the preserved public baseline below. AppShell and opted-in internal portals use it; public landing/menu and authored documents do not.

| Role | Mobile | Desktop (768px+) |
|---|---:|---:|
| H1 | 24px | 28px |
| H2 | 18px | 20px |
| H3 | 16px | 16px |
| H4 | 15px | 15px |
| H5 | 14px | 14px |
| H6 | 13px | 13px |
| Paragraph/reading | 15px | 16px |
| Label/helper | 14px | 14px |
| Caption | 12px | 12px |
| Input | 16px | 16px |

Each heading has its own `--ui-hN-size`. Shared weights/lines and the body aliases live in the same block. Inter remains the existing bundled family. Change code-owned tokens here; there is no new end-user design control panel. Shared spacing/palette/control configuration remains in `app/ui-system.css`; existing mobile/desktop public defaults are retained to protect landing. See [CLEAR_PATH_ROLLOUT.md](CLEAR_PATH_ROLLOUT.md) for scope, tests and release evidence.

## Preserved baseline and historical rationale

# Universal application typography

The visual reference is **How it works popup**. `app/typography.css` owns every application font, size, weight, line-height and letter-spacing setting. Change that file to update the application; do not introduce local scales in page CSS or inline styles.

| Text role | Phone | Tablet/desktop | Weight | Class / element |
|---|---:|---:|---:|---|
| Page heading | 20px | 22px | 600 | h1 / type-title |
| Section heading | 20px | 22px | 600 | h2 / type-section |
| Subheading | 16px | 18px | 600 | h3–h6 / type-card |
| Paragraph, list, normal copy | 15px | 16px | 400 | p, li, dd / type-body |
| Input and textarea | 16px | 16px | 400 | input, textarea, select |
| Field label | 14px | 14px | 500 | label, legend, dt / type-label |
| Supporting text | 14px | 14px | 400 | type-helper |
| Caption | 12px | 12px | 400 | small / type-caption |
| Action text | 15px | 15px | 600 | button / type-button |
| Numeric statistic | 24px | 28px | 600 | type-stat |

Inter is the shared UI font, including editor controls and illustrative social-profile previews. Body line-height is 1.55; headings 1.35; labels, buttons and captions 1.4. Use weight 600 for inline emphasis. Hero and marketing aliases resolve to these same roles rather than adding extra sizes.

## Future changes

1. Change the semantic tokens at the beginning of `app/typography.css`.
2. Change the relevant breakpoint token there if a different phone/desktop size is needed.
3. Run the typography and responsive browser checks after a production build.

The enforcement rules deliberately take priority over page modules, Tailwind typography utilities and inline UI font styles. Headings follow their semantic level; a paragraph does not become a heading merely because it carries an old `text-xl` class. Use an actual heading for a heading and `type-helper` / `type-caption` for secondary copy.

Page CSS may consume the shared tokens, but must not redeclare them. Arbitrary legacy text-size classes are mapped to approved roles for compatibility. New components should use semantic elements and the `type-*` classes.

## Documents

Resume output is protected by `[data-document-preview]`, `#resume-render` and `.actual-template-orbit-face`. An intentionally authored document can also use `[data-typography="document"]`; this is not an escape hatch for application pages. These boundaries preserve template typography and PDF/DOCX layout. Editor controls outside the document use the universal UI system.

Brand text has a shared text measure so it wraps at readable sizes, including enlarged text. Long application words can reflow without shrinking the font.

This system changes text properties only. It does not set card padding, card dimensions, colours, borders, page widths, image dimensions or layout spacing.

## Shared popup hierarchy

The How it works popup is the visual reference for the entire application. Page titles now use its section-heading scale and weight. Descriptions, introductions and copyable results resolve to the same paragraph token, rather than separate competing sizes.

| Role | Phone | Tablet / desktop |
|---|---:|---:|
| Page / section heading | 20px | 22px |
| Card heading | 16px | 18px |
| Paragraph / description / introduction / copyable result | 15px | 16px |
| Button / navigation action | 15px | 15px |
| Label / supporting text | 14px | 14px |
| Caption | 12px | 12px |
| Form control | 16px | 16px |

All these roles remain controlled in `app/typography.css`. The title, description, reading and introduction tokens are aliases, so changing the shared section or body token updates every corresponding role together. Input size stays independent to prevent phone zoom. Resume template fonts, sizes, weights and export layouts remain isolated by the document boundaries above.

## MENAJOBS-TYPE-001 — approved 2 November 2026; implementation pending

Founder authorizes a presentation-only global typography rebuild against live MenaJobs home/extension. Retain bundled Inter, brand, functional layouts, animations, navigation and all service logic. Use one existing owner (`app/typography.css`), with mobile/desktop roles: hero36/48, page28/32, section21/24, card17/18, body15/16, label14/14, helper13/14, button14/15, caption12/13px. Regular400, label500, section/card/button600, page/hero700; body1.55, heading1.25, hero1.15. Desktop breakpoint768px. Inputs16px. Restrained tracking; preserve local functional spacing, normalize only immediate heading-description rhythm. Semantic headings must override legacy utility sizes; explicit helper/caption roles must work on paragraphs.

Measured reference desktop1363px: system sans-serif stack (not Inter); home h1 36/40px700 with -.9px tracking and16px bottom margin; nav14/20px500; extension h1 48/48px800,-1.2px,20px margin; section30/36px700; step headings16/24px600; paragraphs16/24px400; lead18/28px400; muted107,114,128. We adopt principles and approved fallback, not every reference value (retain700 display and accessible text colors). Mobile reference measurements/screenshots pending browser capability; never label inferred values measured.

Affected scope: central typography, redundant ui-system type declarations, narrowly related presentation modules, cover-letter preview boundary, regression assertions and evidence docs. Exclude APIs/lib/backend/schema/auth/payment/scoring/prompts/templates/PDF generation. Preserve generated letter preview at existing15px/1.55, editor16px/1.5. Acceptance: distinct hierarchy, readable fields, no overflow at360/375/390/430 and desktop, document font/layout equivalence, existing interaction checks pass; required CI green before PR merge. Authenticated live checks must be reported separately from fictional fixtures.

Implementation review: a rendered mobile dashboard exposed pre-existing application-stage label collisions. Apply caption role and word wrapping only to those labels (WorkspaceHome TSX/CSS), preserving five-stage values/logic. Explicit semantic type-* roles must outrank legacy text-xs/sm paragraph classes; mixed-class regression coverage required.

Rendered route contrast review found legacy inverse text on preparation-pack light surfaces (as low as1.03:1). Scope adds focused text/palette role corrections in app/preparation-pack/explorer.module.css; retain dark media/insets with inverse copy, keep authored samples and all animations intact.
