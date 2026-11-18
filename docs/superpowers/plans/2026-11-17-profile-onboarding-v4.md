# Career Profile Onboarding V4 Implementation Plan

> **For agentic workers:** Use executing-plans with bounded parallel domain work and whole-branch review. Each task requires red/green evidence.

**Goal:** Preserve honest dates and provide the approved single inline profile-review workspace.
**Architecture:** Existing canonical editor and atomic RPC remain authoritative; explicit precision metadata accompanies stored date anchors. Pure conservative bounds feed tri-state requirements and nullable pending assessments. Scoped presentation replaces repeated review screens.
**Tech Stack:** Next.js/React/TypeScript, existing PGlite synthetic database and Chromium tests. No new dependency.
**Spec:** Issues #95/#96 and docs/CAREER_PROFILE_BLOCKS.md (17 November authorization).

## Global Constraints
- Development/isolated testing only; no production data/migrations, merge or deployment.
- No AI prompt text, weights, unrelated scoring, template/PDF/style/font/auth/credit/evaluation changes.
- Legacy precision unknown stays unknown; no backfill. New/changed dates need explicit precision.
- Bounds may establish an unchanged requirement result or identical score at both extremes; otherwise pending. No midpoint, fallback points or denominator redistribution.

## Review Focus
- Mixed legacy/known rows and old clients must preserve metadata under a row lock.
- Overlapping uncertain intervals must not become definitive claims or zero experience.
- Numeric-only UI, comparisons and caches must not coerce null to zero.
- Refresh/source mismatch/409/refetch failures must retain honest unsaved state.
- Long/mobile content and sticky actions must remain keyboard reachable.

### Task 1: Date domain and honest calculations
Files: lib/profileDatePrecision.ts, types/careerProfile.ts, lib/experienceYears.ts, lib/employmentGaps.ts; tests scripts/verify-date-precision.ts.
Interface: DatePrecision = year|month|day; strict date decode/encode/project and conservative boundary bounds. Metadata null means legacy unknown, never inferred precision. Duration assessment returns known/bounded/unknown and lower/upper years.
- [x] Write fixtures for year/January/day/invalid/leap/legacy and bounds/overlaps; run to observe failure.
- [x] Implement strict helpers, domain metadata and honest duration/gaps; preserve known-date arithmetic.
- [x] Run focused tests green; record evidence.

### Task 2: Atomic persistence
Files: supabase/migrations/073_profile_date_precision.sql, app/api/profile/route.ts, lib/packages/profileLoader.ts, lib/resumeDocument.ts data projection; synthetic DB tests.
Consumes Task 1 helpers. Four paired nullable precision columns, validation, unchanged legacy preservation, old-client compatibility under existing lock.
- [x] Write and run failing PGlite/API tests for roundtrip, mixed clients, invalid metadata, stale version, rollback.
- [x] Implement additive migration/RPC guard and precision-aware API/loader projection, without RLS/auth changes.
- [x] Run synthetic DB/API checks green; no remote DB access.

### Task 3: Precision-sensitive consumers and pending score
Files: lib/jobMatch/{profileAdapters,requirementMapping}.ts, types/jobMatch.ts; lib/optimizer/{experienceMet,scoreV2}.ts, necessary v3/services/score consumers; grounding data helpers only.
Consumes bounds; produces assessable score or pending null with reason. Preserve known formulas/weights and frozen snapshots; version new assessment/cache contracts.
- [x] Write failing known/year/legacy/bounds/30-to-100/pending-vs-failure regression fixtures.
- [x] Implement tri-state requirements, bounds comparison and pending totals; propagate through API/UI, avoiding numerical null coercion.
- [x] Run focused regressions and typecheck green; inspect every prompt-file boundary.

### Task 4: Canonical inline workspace
Files: app/profile/page.tsx, components/profile/review/*, narrowly scoped source-ready/recovery/merge helpers.
Consumes precision dates and existing canonical editor/save callbacks. Eight sections, direct edits, add/remove/undo/move, stable IDs, source comparison, staged merges and single final acknowledgement/save.
- [x] Write failing canonical-navigation/recovery/merge/source/ack tests and synthetic UI harness.
- [x] Replace repeated diagnostic/review/summary/verify screens with scoped workspace and reuse all canonical fields.
- [x] Verify save/refetch/failure/409/storage/source-identity cases; exact widths 320/390/768/1440 and keyboard.

### Task 5: Review and handoff
- [x] Run typecheck/lint/npm test/build, protected actual-diff and selected unchanged fixture/template/PDF checks.
- [x] Review whole branch independently; fix important findings with regression coverage.
- [ ] Record exact head, commands, results, screenshots and remaining limits in #96 and docs.
- [ ] Commit/push this approved branch, create implementation PR, obtain available non-production preview; stop before merge/release.
