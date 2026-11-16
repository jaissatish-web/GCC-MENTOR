# Candidate Preparation Focus — Implementation Plan

> **For agentic workers:** Use superpowers:executing-plans inline; final independent whole-branch review. Founder has approved Option 2 and explicitly authorized build and merge in this conversation.

**Goal:** Faithfully implement the second displayed design, “Find your preparation focus”, on existing PR #90.
**Architecture:** Replace CandidateConcerns presentation with four always-visible native selection buttons and one response canvas. Default selection is job suitability. Store only local selected concern; no requests, persistence or scoring. Keep existing homepage composition and surrounding components.
**Tech Stack:** Existing Next.js/React/TypeScript/CSS modules/Inter/Lucide; no dependencies.
**Spec:** Founder brief and selected visual at ../../evidence/2026-11-16-shortlisting/option2-reference.webp; source image generated in this conversation. It contains desktop1440/mobile390 composition targets, not browser baselines.

## Global constraints
- Employer marquees/disclaimer → candidate problems → solution → career journey → product demonstrations.
- Primary headline: “You have the experience. So why aren't Gulf recruiters calling?”
- All four concerns and service mappings visible at every width; only selected secondary explanation changes.
- Native button semantics, aria-pressed and aria-controls, visible focus; Enter/Space retain focus. No auto-advance, motion or scroll hijack.
- Explicit illustrative caption; no actual assessment, fabricated facts, hiring probability or guarantee.
- Preserve templates/PDF/document typography, AI/auth/payments/credits/backend/database/configuration, original marquee/orbit/globe source.
- Scope: CandidateConcerns.tsx, concerns.module.css, one generated paper illustration, affected landing/browser/typography tests, docs/evidence/design-qa and existing plan/progress/decision log.
- Merge authorization supersedes the previous hold only after verification and independent review; production must match approved commit.

## Review focus
- Narrow320px/200% text: readable wrapping, all controls and no overflow.
- Keyboard selection: stable focus/position and correctly announced response.
- Four response states: all are useful, fact-grounded and have visible service relationship.
- Anonymous use: no hidden account/data/service side effects.
- Mobile text density versus mock: readable central typography takes precedence over generated tiny type.

### Task 1: Selected concept, regression and implementation
**Files:** components/landing-v3/CandidateConcerns.tsx, concerns.module.css; public/landing/v3/preparation-evidence.webp; scripts/verify-landing-v3-story.mjs, verify-landing-v3-presentation.mjs, verify-mobile-layout.mjs.
**Interface:** CandidateConcerns(): JSX.Element, no props. #challenges is outer region, #solutions is nested response region after selectors; #preparation-response updates from four selected buttons. Default third concern. CTA #how-it-works remains.
- [ ] Write compiled/browser assertions for new headline, all four selectors, explicit illustrative caption and default response; observe RED against existing PR90 build.
- [ ] Reproduce old test:mobile failure at details#challenges; replace only obsolete accordion assertions with always-visible-selection invariants. Retain services disclosure and all previous responsive/document checks.
- [ ] Implement selected mock composition and four data-driven response states; add generated paper asset, no CSS drawing or invented document text.
- [ ] Verify browser widths320/360/390/430/768/1024/1440, every selector and keyboard Enter/Space, focus position, default/reset, useful responses, no requests, no overflow, enlarged text and reduced motion.
- [ ] Run build, typecheck/lint, full npm test, mobile and original landing/orbit/marquee/PDF CI gates. Use bundled Chromium locally; existing font bytes fixture only if network font fetch stalls; disclose fixture limits.

### Task 2: Review, visual parity and approved release
**Files:** design-qa.md, docs/evidence/2026-11-16-shortlisting/*, docs/PROGRESS.md, docs/15_DECISION_LOG.md, existing V3 plan.
- [ ] Compare normalized desktop/mobile crops of selected mock and real browser render; fix P0/P1/P2 differences; retain comparison image and actual screenshots.
- [ ] Independent read-only source review, fix material findings with regression evidence; verify protected diff and whitespace.
- [ ] Update existing PR90/WorkReport89, push exact verified tree with lease, obtain green CI and working preview where available.
- [ ] Mark ready and merge exact approved PR head after CI passes. Verify main deployment reaches READY and live DOM/interaction/copy reflect selected direction. No unrelated source/config changes.

Rollback: before merge retain PR branch; after release revert only this PR through review or restore prior known-good deployment if separately needed. No data/schema rollback.
