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
Status: pending deletion. GitHub connector exposes no branch-delete operation. Shell push has no authenticated credential; browser GitHub is signed out. Do not claim branches were removed. Preserve unique work durably before deleting those nine branches.
Acceptance: verified remote branch list contains only main, with recoverable unique work and no unrequested changes merged.

## BUG-001 — resume upload “failed to fetch”
Founder-reported symptom from prior conversation. Pending reproduction and diagnosis. No fix or root cause verified here. Start with the actual failing request, response/status and current deployment; check PDF, DOCX and paste paths and preservation of the intake draft.

## Next session
Read `AGENTS.md` and the canonical documents first. Complete branch cleanup once authenticated branch management is available, then discuss/record the next authorized feature or investigate BUG-001. Do not restart old design plans automatically.
