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
