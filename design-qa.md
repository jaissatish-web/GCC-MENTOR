# Interview visual refresh — design QA

final result: passed

## Scope and source truth

Presentation changes only, on `design/interview-visual-refresh`.
The approved report/coaching image is `/workspace/scratch/e8f962cdbeb8/generated_images/exec-c4ab81bd-f0f9-4752-9e85-848ac714a4e9.png` (1254 × 1254).
The approved selector/comparison source is `/workspace/interview-workspace-refined.html`.
These are design directions adapted to the existing application, not a request to copy their large display typography. The user explicitly requested the site's existing theme and central typography.

## Browser evidence

Actual React components were compiled with production Tailwind, ui-system.css and typography.css into an isolated preview. Navigation/image shims and synthetic API responses prevent production account access or AI usage. The production routes were not given a demo or authentication bypass.

Cloud browser: `http://terminal.local:4173/`.
Desktop viewport: 1348 × 926 CSS px, 1× captures. Phone/tablet checks used real embedded viewports at 320, 390 and 768 CSS px, with their own media queries, not scaled desktop screenshots. The iframe scrollbar consumes 15px of the available inner layout.

Screenshots:
- `docs/interview-visual-refresh/interview-report-desktop-final.jpg`
- `docs/interview-visual-refresh/interview-report-mobile-final.jpg`
- `docs/interview-visual-refresh/interview-progress-desktop-final.jpg`
- `docs/interview-visual-refresh/interview-setup-desktop-final.jpg`
- `docs/interview-visual-refresh/report-source-comparison.jpg`

The last file puts the approved report and rendered implementation together for comparison. The reference's 531px-wide report panel and the implementation's 735px-wide content region were normalized to 531px width for visual inspection. This is a responsive application adaptation: central typography is intentionally retained, not a claim of pixel-identical composition. Focused score bars, coaching callout, portrait grid and mode selection were also inspected at native browser size.

## Findings and iteration

- P2: The original report and progress used dark score rings and several unrelated area colours, which differed from the approved clean report. Replaced these with white surfaces, shared green score bars and gold coaching highlights. Post-change browser evidence confirms all four score areas remain visible.
- P2: A full grid of report categories plus the score summary made the initial view unnecessarily long. Moved the existing eight categories behind “Explore all report sections”; Overview, Answers and Practice plan remain directly available. All saved report content is retained.
- P2: The existing progress breakdown duplicated the new paired comparison. Kept the existing interactive timeline behind “Explore all practice scores”. All dimensions of the paired comparison remain visible together.
- Preview-only issue: portrait files initially lived outside the isolated preview root. Copied the existing six public assets into that preview; all six then loaded at natural resolution. No production asset URLs changed.

No actionable P0/P1/P2 findings remain in the checked states.

## Required fidelity surfaces

- Typography: reused type-section, type-card, type-stat, type-label, type-helper and type-caption. No new font family or scale was introduced; app/typography.css is unchanged. Mobile section heading measured 20px. The isolated preview uses the shared font fallback; production continues to obtain Inter from its unchanged layout.
- Spacing/layout: existing PageShell, fields and application cards retained. New comparisons reflow from two columns to one; interviewer portraits use two columns on small phones, three on intermediate widths and six on wide screens. Checked no horizontal overflow at 320, 390, 768 and desktop.
- Colours/tokens: existing teal, teal-soft, gold-ink, gold-soft, ink and line utilities. Gold denotes the earlier chart series; green the later series, with explicit labels and numeric values. Negative changes use a signed minus and gold tone, never a positive claim.
- Images: all six supplied WebP portraits loaded. object-fit: contain preserves the complete source; no generated replacement or crop. Mic/chat emoji are the user's explicit label request. UI icons reuse existing Lucide assets.
- Copy/data: actual report text, answer text and scores are preserved. “Review my answers” opens the existing answer explorer; it does not promise automatic weakest-answer selection. Dates/roles come from the saved run. Preview example content is not bundled into product components.

## Interactions checked

- Switch between voice and typed modes, preserving the original default and capability gate.
- Choose a host, including Mariam; only the chosen host has aria-pressed=true.
- All six images loaded without clipping at 320px.
- All four paired score rows visible at 320, 390 and 768px.
- Compare interviews 2→3 (+9), 1→3 (+19), 1→2 (+10); selectors and values update.
- Lower-score fixture shows 72→60 and -12 points.
- First-result fixture shows a baseline message and no misleading comparison selectors.
- Report → Answers → Question 1, saved text and stronger-answer content; keyboard activation and heading focus work.
- Practice plan navigation and expanded category grid containing all eight existing report categories.
- Voice report: original transcript, Coach feedback, grammar notes and Stronger answer tabs; stronger-answer surface uses the same green tint, and no horizontal overflow at 390px.
- Existing score-area selector and timeline focus still work (Technical knowledge, interview 1: 66/100).
- No application console errors or warnings observed. Browser-extension metadata errors were excluded.

## Validation and boundaries

Passed TypeScript and ESLint, mock-report contract, interview-progress tests, progress API tests and disposable interview-history database tests.
A byte comparison confirms the setup page's entire pre-render block is unchanged, including state defaults, draft handling, capability checks and start/answer/finish handlers. There are no changes under app/api, lib, types or supabase. The new attempt selectors affect presentation only and consume the existing model's comparable flag.

Live signed-in end-to-end recording/AI generation was not exercised: this is an isolated visual check, and no service logic was changed. Browser capture of the complete long phone page timed out; native viewport captures and DOM layout measurements were used instead.

## Follow-up polish

No blocking follow-ups. The global typography, preserved existing navigation and saved-data constraints intentionally take priority over the concept image's larger decorative score treatment.
