# Universal Design System V1 — approved scope, 10 November 2026

Status: source implemented and code checks passed; mandatory visual QA blocked; review/production release pending. Founder requested a review PR, no merge or production deployment before visual approval.

Build a typed, bounded, semantic website-only theme foundation and administrator-only `/admin/design-system` controls using existing admin authorization. Support mobile/tablet/desktop values, immediate isolated preview, default preset, local draft persistence clearly labelled as browser-local. Persistent publish/rollback requires a separately approved backend proposal if current infrastructure cannot safely provide it. Do not claim it is available until tested.

Pilot only the existing landing page. Preserve content, links, CTAs, resume orbit, globe and services. Subsequent application migration requires founder approval. Do not change root tokens that resume templates inherit. New theme variables and selectors must be opt-in and must not enter resume document subtrees.

Affected areas: theme configuration/helper, opt-in shared website styles, admin page/client controls/navigation, landing root integration, documentation and meaningful theme validation/regression tests. No existing APIs, schema, auth, product logic, resume rendering/template/preview/PDF files may change.

Acceptance: specified default palette/type/spacing; responsive controls; safe bounded configuration; live preview at device widths; honest draft/publish status; landing pilot token coverage; no resume visual changes; typecheck/lint/build/checks; requested responsive evidence; PR held for founder approval.

Verification: capture representative existing resume previews and PDF baselines before modifying CSS; compare identical fixtures afterward. Capture landing at 360/390/430/768/1024/1440; test six requested setting changes; review accessibility, overflow, focus/reduced-motion. Record unavailable checks as blockers rather than success.
