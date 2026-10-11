# Resume import review

After authenticated upload/paste or a claimed signup import, the Career Profile overview shows a compact import-review card alongside the existing profile completeness and Gulf readiness experience. This does not add a score or alter readiness scoring.

The importer records real processing changes: date normalization, recovered contact/personal fields, repeated skill consolidation, education-year placement, common spelling cleanup and existing verification notes. Common spelling replacements apply only to descriptions and responsibilities, preserving technical ALL-CAPS. The professional summary remains the original source until the user chooses to accept a correction.

An optional AI proofread produces suggestions, never silent rewrites. Its 15-second deadline and content budget preserve import availability; a failed/malformed/truncated answer is labeled unavailable. A conservative validator rejects changed quantities/acronyms and content-word additions/deletions. Accepted suggestions still require user confirmation; this validator is not a semantic guarantee. Coverage is displayed for a partial wording check. No new skills, accomplishments or stronger responsibility claims are added by this feature.

The expandable card shows before/after and reasons. Original text means text read from the source, not the PDF layout. Users can apply suggestions, restore recorded wording/repeated skills, or open the relevant profile section. Matching uses employer, role, date and current wording; ambiguous matches or later edits are not overwritten. These changes use the normal profile Save and concurrency guard. Historical comparison is labeled separately from the current edited profile.

The latest import review is stored per user in `resume_import_reviews`, with server-only writes and owner-only read/delete. It contains private resume text and must not be logged. Identity-document numbers are masked. The pending-draft report also carries the review so an interrupted import can recover. Review deletion clears the pending comparison as well; Settings data deletion removes both records. Auth-user deletion cascades the review row. No public/share endpoint exists. A newer import replaces the prior comparison; older imports have no retroactively invented history.

Migration: `20261011155749_resume_import_reviews.sql`. Verification: `verify-import-review.ts` and `verify-import-review-db.mjs`, included in `npm test`.
