# PERSONAL-HOME-002 — reference dashboard adaptation

26 October 2026. Satish requests the attached GCC Mentor Dashboard HTML layout adapted to the current website theme. Approved; source implementation complete, visual verification pending.

## Contract

Use the reference hierarchy: personal identity and soft-square photo/initials; readiness and activity; interview performance and quick actions; upcoming dates; application pipeline and documents. Use current navy/blue/cyan tokens and shared compact typography. Mobile uses one column, desktop paired cards. Keep existing shell navigation rather than duplicating the mock navigation.

Reuse actual profile, aggregate overview, interview-progress and tracker data. No hardcoded candidate facts, uplift points, usage caps, sample events, work status, Iqama expiry or hiring claims. Preserve the two existing readiness meanings and arithmetic; the single-score rubric remains outside this visual task. Missing and unavailable values must be explicit, never false zero. Keep unfinished interview continuation and pending-import priority. Edit/photo actions link to the canonical Career Profile editor.

## Affected files and protected scope

`components/studio/WorkspaceHome.tsx`, its new scoped stylesheet, optional compact presentation in `components/dashboard/InterviewProgressOverview.tsx`, and this specification/progress/decision record. Preserve APIs, schema, auth, scoring, prompts, credits, resume templates and exports. Existing progress reports and events retain their established calculations/timezone rules. No new mutation or generation on Home.

## Acceptance and verification

- Reference-like card hierarchy using current tokens and shared type roles; 44px targets, long-label wrapping, 320px mobile through desktop layouts.
- Real all-account service totals and pipeline stage counts; errors/retry, loading, no-profile, no-interview and empty tracker states.
- Working links for resume optimization, saved resumes, one Career Profile editor, application setup, interviews and existing next action.
- Interview scores/comparisons use existing progress endpoint and comparable metrics, never mix different resumes into an invented trend.
- Docs first, diff review, typecheck, lint, production build and repository regression checks. Visual browser QA is separately required before calling the design visually verified or live.

## Verification limitation

Cloud-browser access to the live site was rejected by automatic approval review because browser use had not been explicitly authorized. Continue code and non-browser checks; request browser authorization after a concrete implementation is ready. Do not claim visual verification or release.

## Implemented source

Paired compact cards, personal identity, real profile completeness/Gulf-preparation link, activity totals, ongoing-next-action strip, compact per-resume interview metrics/history selector, four quick actions, saved tracker events, all-account pipeline counts and document/availability fields. Existing shell navigation remains. Canonical editor owns edits and photos. No API, database, score or document-renderer change.

## Checks and remaining work

Typecheck, lint and production build pass with CI placeholder public settings. All 80 existing repository checks pass. The extended dashboard static-rendering check additionally passes real counts, unknown documents, stale/error suppression, civil dates, ongoing practice and pending-import priority. Final production rebuild after the last stylesheet/import correction passed. React checklist reviewed: stable keys, effects/abort cleanup retained, derived selection, named native progress elements and keyboard focus.

Visual QA remains blocked as recorded in personal-dashboard-qa.md. Main is protected by required checks; deliver on a temporary draft PR pending browser authorization and visual QA, then merge/clean that branch only when gates pass. No production release claimed.
