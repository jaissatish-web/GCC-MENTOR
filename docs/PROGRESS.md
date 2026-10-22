# Progress and next action

Updated 22 October 2026. Single active task tracker; old task/release reports are historical.

## DOC-001 — establish persistent project memory
Authorization: founder requested main-only cleanup and documents aligned with main; future work must update documents before changing logic.
Scope: documentation and repository branch organization only. No application/schema/configuration behavior changes.
Acceptance: root instructions, agreed plan, source-based baseline, progress record, documentation index and branch inventory; identify stale claims and retain verification limits.
Implementation: canonical documentation and current-state notices delivered in this documentation-only commit, based on main `81fdcf1`. Branch cleanup remains pending separately.
Verification: source comparison of package versions, intake limits/handoff, scoring implementations, optimizer selection, service routes and CSS imports. No runtime tests necessary for this documentation-only change. No live database/provider/deployment check performed.

## BRANCH-001 — keep main only
Inventory: 36 non-main branches; 27 are ancestors of main and nine have commits outside main history. Names, exact heads and ahead/behind counts are in `BRANCH_CLEANUP_2026-10-22.md`.
Status: authenticated browser now available. Main-ancestor branches are being deleted. Nine separate heads preserved in the inert recovery archive described in BRANCH_PURPOSES.md; an independent restore check passed. Final nine removals and remote verification follow publication of this archive.
Acceptance: verified remote branch list contains only main, with recoverable unique work and no unrequested changes merged.

## BUG-001 — resume upload “failed to fetch”
Founder-reported symptom from prior conversation. Pending reproduction and diagnosis. No fix or root cause verified here. Start with the actual failing request, response/status and current deployment; check PDF, DOCX and paste paths and preservation of the intake draft.

## Next session
Read `AGENTS.md` and the canonical documents first. Finish/verify main-only cleanup, then use PLATFORM_MASTER.md as the shared discussion baseline. Discuss/record the next authorized feature or investigate BUG-001 only when the founder asks for that implementation. Do not restart old design plans automatically.

## DOC-002 — understand main and classify old branches
Founder clarified: current main is the application baseline; no application changes or experimental merges. Document the full platform concept, current source behavior and plan; inspect branch purposes and remove the rest.
Acceptance: founder-readable PLATFORM_MASTER.md with service/score/data flows and live-verification limits; branch-purpose record; durable recovery of nine unique heads; remote cleanup verification.
Implementation: source review delegated into bounded read-only service/control reviews and integrated by lead. Only documentation/recovery records may change.
Checks planned: source references, relative links, docs-only diff, backup restoration and required GitHub CI.
