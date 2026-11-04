# Shared SaaS foundation rollout — 4 November 2026

## Approved scope, recorded before implementation
The founder approved the premium reference direction after reviewing the hub/calculator screenshots. This source batch prepares Stage E's shared foundation for integration **after the complete tools batch**, using the existing central token owners only. Root owns release sequencing, tests, GitHub and deployment. Implementation is not production verification.

Owned files: `app/ui-system.css`, `app/typography.css`, this report. No components, handlers, service logic, API routes, auth, scoring, AI, calculator formulas, subscription/payment, schemas/data, resume/template sources or animation code are changed.

## Intended behavior and acceptance
One central navy/teal/light palette replaces the root blue theme. Heading #123B5D is distinct from body #172B3A; actions #087E9A; white surface; #F8FAFC canvas; secondary #64748B; divider #E2E8F0; field boundary #7D8DA2; success #137547, warning #A35B08, error #B42332. Controls8px and cards12px, restrained flat surfaces, no new decoration. Existing UI aliases continue to consume these semantic tokens rather than adding page palettes.

Inter retains the existing body15/16px, label/helper13–14px and input16px roles. Shared page titles30/36px, sections23/26px, cards17/18px, matching the approved reference. Native input contrast/focus remains intact. Generated documents and resume previews retain their explicit document/font rules and existing selector exclusions; no template content, typography or layout changes.

The public tools theme should consume the root system after integration; only tools-specific focus/CTA presentation remains scoped. Existing compatibility selector boundaries are retained. Existing global heading declarations are adjusted in place rather than appending a competing important override layer.

## Source coverage and integration risks
- Shared layout/navigation/UI buttons/fields, auth, studio, professional profiles and review already consume central variables, so this changes their presentation consistently without handlers or page restructuring.
- Dashboard uses deliberate local `--ui-h1-size`/`--ui-h2-size` card contexts. Preserve these rather than forcing page-sized headings inside compact sections.
- Root token changes can affect any app consumer; exact blue/canvas/type-size assertions in older regression scripts need their approved expected values updated while retaining central ownership, boundary and behavioral assertions.
- Template engine/TSX sources do not consume `var(--ui-*)`; no redundant document token reset layer is added. Existing isolated selectors and explicit template metrics remain. No generated-document source is changed.
- Landing pages contain their own decorative module declarations. This batch updates shared consumed tokens but does not remove/rebuild proprietary page modules, orbit/globe animations, layout or assets. Page-level visual cleanup remains separately reviewable work if not already satisfied.
- Authenticated live pages require a valid permitted session for true production review. Synthetic render/browser fixtures cannot certify live account persistence.

## Required integration QA
Root should build once after integration, then run typecheck/lint/full repository checks, shared mobile regression, clear-path/CTA/studio/review/navigation/intake suites, strict premium tool checks and all tool-page fixtures. Compare shared controls at320/360/390/430/768/1024/1440 and200% text, including dashboard compact headings, auth field contrast, long reports, mobile navigation, profile/review, professional-profile panels and generated document boundaries. Existing document/PDF fixtures remain required CI. Inspect screenshots; passing assertions alone is not visual certification.

## Current state
Approved and documented; implementation pending in this file's initial record. Final source diff, tests and limitations are appended below when completed. No build/CI/deployment result is claimed by this subtask.

## Implemented source — awaiting root integration verification
Root palette/control/type roles updated in place; tools-only duplicate palette/scale removed. Card H2 explicit role now works in both tools and app chrome with document exclusions. Existing heading enforcement now uses the navy heading token; body/input text keeps its separate ink role. No JS/components/backend/animations changed. The diff reduces duplicate CSS declarations. `git diff --check` and PostCSS parsing pass. No build/browser/CI/live certification claimed by this subtask.

Remaining drift: landing/auth/professional/studio page modules may retain authored shadows/radii/gradients or structures; this shared foundation does not claim every page was independently redesigned. Existing how-it-works guide uses inverse text on a colored hero and internal scope retains that semantic hero treatment, so that guide needs screenshot contrast review alongside ordinary navy-heading surfaces. Existing dashboard local heading overrides remain.
