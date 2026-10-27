# FIRST-RESUME-001 — first dashboard guidance

27 October2026, Riyadh. Satish approved automatic first-resume popup on the dashboard for new signed-up users, offering Upload resume, Paste resume text and Type my details. Approved, not implemented.

## Intended behavior

Open only when profile and package reads have succeeded, the profile is absent, all-account resume_count is confirmed zero, no target-job packages exist and nextAction is no_profile. Never flash it during loading or failed reads; do not interrupt a pending import, existing profile or saved resume. Dashboard remains visible behind the modal. User may close with Escape, close button, outside click or Explore dashboard; closing lasts for this dashboard visit, with no persistent cross-account browser flag. A later empty visit can offer guidance again.

Use existing canonical profile flows: /profile?import=upload, /profile?import=paste and /profile?view=details. This is navigation only, not an upload/profile creation or credit spend. Preserve authentication/signup behavior, intake review, existing profile saves, scoring, quotas and templates. Shared Radix dialog provides focus containment, accessible title/description and keyboard dismissal. Theme uses current tokens.

## Acceptance

Confirmed new-user state opens a compact responsive navy dialog with three44px+ touch choices and clear labels. Existing/pending/error/loading states do not open it. Dismissal does not immediately reopen; choices reach the respective existing editor/import panels. Check320/390/desktop widths and keyboard interactions; typecheck/lint/build and focused regressions plus required CI before release.

## Affected code

New dashboard FirstResumeDialog component, scoped stylesheet and reusable eligibility helper consumed by WorkspaceHome. No backend or auth configuration changes. Theme surface task is documented separately in THEME_SURFACE_AUDIT_2026-10-27.md.

## Signup routing refinement

Ordinary signup currently passes through /onboarding and then sends users without a resume handoff to /profile. Route only that no-handoff/fallback branch to /dashboard so it can present the new dialog. Keep anonymous draft/resume-text/readiness handoffs on their existing review/extraction paths. No Supabase/auth/session/callback implementation is changed.
