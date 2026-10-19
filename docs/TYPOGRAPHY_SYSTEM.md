# Universal application typography

The visual reference is **Add Job Details**. `app/typography.css` owns every application font, size, weight, line-height and letter-spacing setting. Change that file to update the application; do not introduce local scales in page CSS or inline styles.

| Text role | Phone | Tablet/desktop | Weight | Class / element |
|---|---:|---:|---:|---|
| Page heading | 26px | 30px | 700 | h1 / type-title |
| Section heading | 20px | 22px | 600 | h2 / type-section |
| Subheading | 16px | 18px | 600 | h3–h6 / type-card |
| Paragraph, list, normal copy | 16px | 16px | 400 | p, li, dd / type-body |
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
