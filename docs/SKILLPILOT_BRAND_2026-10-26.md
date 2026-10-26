# SKILLPILOT-BRAND-001 — navy, blue and cyan platform presentation

26 October 2026 (Riyadh). Approved by Satish after reviewing the live SkillPilot homepage.

## User goal

Use the reference's typography, headers, cards, visual treatment and careful alignment across the GCC Mentor public site and signed-in product. Adopt its navy, blue and cyan palette while retaining GCC Mentor's Gulf-career purpose and content.

## Approved visual direction

- Use a deep navy page canvas, layered navy card surfaces, fine blue-gray borders, high-contrast near-white headings and readable slate body text.
- Use clear blue for primary actions and cyan for small highlights, focus states, progress and technical micro-labels. Use a restrained monospaced face only for short labels, step numbers or data-like details; keep Inter as the reading and heading face.
- Keep headers compact and aligned, with clear active navigation and one unmistakable primary action.
- Give cards, fields and boxes consistent padding, border, radius and color. Keep card titles, descriptions and action rows aligned.
- Keep typography compact on phones and consistent across pages. Set touch controls to at least 44px and form entry text to at least 16px. Allow headings, labels and CTA rows to wrap without clipping.
- Use a navy hero treatment with a subtle blue-to-cyan accent; keep its heading and action hierarchy focused.
- Preserve semantic green, amber and red for success, caution and errors; ensure text remains readable on dark surfaces.

## Scope and protected behavior

Visual-only update to shared public and authenticated presentation styles and their design documentation. Preserve routes, JSX behavior, APIs, auth, storage, payments, scores, prompts, service limits, user data flows and all resume/PDF/DOCX template styling. Do not change Tailwind configuration or backend behavior.

## Acceptance criteria

1. The public site and signed-in pages use the same navy/blue/cyan palette and shared type roles, including headers, cards, fields, menus, buttons and feedback states.
2. Existing text remains readable; body and secondary text retain strong contrast on dark surfaces, with visible borders and focus indicators.
3. Main content, cards and CTA groups align consistently. Long labels wrap; mobile screens do not clip or force horizontal scrolling.
4. Preserve 44px control targets, 16px form-entry text, and independent resume/template output styles.
5. Visually inspect public and authenticated representative pages at phone and desktop widths before calling the design verified.
6. Record exact changed files and verification. No claim of live release without deployment evidence.

## Implementation status

Implementation on `codex/skillpilot-brand-001`: shared palette and responsive presentation styles updated across the public landing, workspace, professional profiles, preparation explorer and How it works guide. The PR preview and phone/desktop visual verification are pending. Service logic and resume document styles were not intentionally changed.
