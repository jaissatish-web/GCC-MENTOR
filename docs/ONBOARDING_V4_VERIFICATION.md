# Career Profile Onboarding V4 / DATE-096 verification

18 November 2026. Development and isolated synthetic testing only. Founder review required; no production release, migration application, record rewrite or main merge authorized.

## Result and source

Implemented the approved #95 inline review and #96 precision/pending-score contracts on `feat/career-profile-onboarding-v4`. The branch is synchronized with main `dfc387e`. Exact review commit and PR are recorded in Issue #96 at handoff. Historical main documentation/dead-code cleanup was retained; no archived reports were restored.

## Date contract

Migration073 adds nullable work start/end and certificate issue/expiry precision, allowing year/month/day. NULL with a date is legacy unknown. No UPDATE/backfill or production migration was run. Storage anchors remain technical encoding. GET/editor keeps the raw legacy date for unchanged saves and displays its year with an unverified label. The shared service loader projects only supported precision, retaining explicit unknown metadata; raw legacy month/day anchors do not enter new service contexts.

Strict calendar/precision validation rejects malformed supplied dates before RPC. The existing atomic save retains row identity, owner RLS, optimistic version checks and transactional rollback. Per-row compatibility resolves missing keys before collection-wide key union, preserving unchanged metadata from older clients; new/changed dated facts without precision receive an actionable409. Direct owner table writers retain existing privileges: this is an API/RPC compatibility guard, not universal metadata immutability.

## Assessments and consumers

| Boundary | Intentional behavior |
|---|---|
| `profileDatePrecision`, editor dates, API, types, migration073 | Lossless year/month/day, honest legacy handling, unchanged legacy roundtrip and paired facts. |
| `experienceYears`, `employmentGaps`, profile API/UI | Known arithmetic retained; conservative bounds and explicit insufficient-precision status. Unknown is distinct from zero/no gaps. |
| Job Match adapters/mapping, ATS scan, public result UI | Evaluate both conservative extremes using the existing formula. Equal established results retain that score; otherwise experience and affected overall score are null/pending. Independent categories remain available. |
| Optimizer `experienceMet`, `scoreV2`, v3 engine/service, API/view/types | Met/unmet/unknown requirements; unknown uses U rather than failed C or confirmed A. No pending numeric total, gains, ceilings or automatic recommendation. Original weights and known-input arithmetic retained; original screening-as-of eligibility retained. |
| Optimizer analysis/fingerprint/cache keys | Date values, precision and employment status participate in a new cache namespace. Clarifications recalculate even where storage anchors collide. Historical snapshots and records are not rewritten. |
| `answerGrounding`, `factSummary`, shared duration consumers | Suppress unsupported numeric claims from uncertain starts/ends, including fallback and global career-span paths. |
| `buildInterviewQaPrompt` | Only a nullable-data guard in the existing uncertainty branch; exact prompt string literals are unchanged. Interview evaluation criteria are unchanged. |
| Package/setup/preview score displays | Pending clarification is neutral and never a zero ring, low/failed match, numeric gain or eligibility claim. Known categories remain visible. |
| Resume document data derivation | Year-only range stays year-only; legacy year explicitly unverified. Template layouts/styles/fonts, preview/PDF rendering are unchanged. |

Synthetic one-year requirement regression: genuinely month-precise Nov2021–Feb2022 retains score30. The same legacy-unknown record and year-only2021–2022 produce pending, rather than certifying30 or the reproduced erroneous100. Long year-bounded histories may retain100 only where both extremes establish the same existing capped score; no exact duration is claimed. No midpoint, fallback points or weight redistribution is used.

## V4 interaction

One canonical editor supports inline changes, eight-section navigation, repeatable movement/removal/undo and existing categories/preferences. There is one final acknowledgement/save; edits and restored decisions reset acknowledgement. Missing/uncertain facts remain unconfirmed. Invalid supplied values disable Save and expose a focusable correction action. Success requires PUT and refetch; photo, stale version, refetch and pending-cleanup failures have distinct truthful outcomes.

Saved-first Add mode cannot overwrite; selected proposed updates affect only chosen facts. Switching back to Add clears those overwrites while preserving unrelated manual corrections and additions. Different tenures are not silently deduplicated; ambiguous incoming roles are retained for explicit Keep/Add choices. Replacement remains an Advanced action with named losses. Same-tab recovery retains canonical edits, import mode, choices and section, guarded by source/import/saved-version identity. Manual drafts lacking a server import identity honestly warn that reload recovery is unavailable.

Actual File/pasted source is retained only in the current session, separate from editable fields. Only digest/size and import identity are checkpointed; bytes are not added to browser/server storage. Missing bytes show originally extracted details; mismatched/identity-unavailable reattachments are reference files and never rerun extraction or confirm facts.

## Verification evidence

- Repository `npm test`:103/103 checks passed after synchronization, including new date, pending score/UI, PGlite persistence/API, recovery and merge regressions.
- Typecheck, lint and production build passed with synthetic build configuration. No paid model or production-account call.
- Real canonical-page browser suite:32 checks at320/390/768/1440, source focus/Escape/no-write, single acknowledgement, row undo/move/removal, precision payload/refetch, same-tab recovery, invalid email correction,503/409/refetch/cleanup/storage failures and saved-profile Add/update/repeated-role/reload decisions.
- Isolated workspace/browser and source digest suites exercise focus trapping/return, resize scroll lock, source identity and exact pasted bytes before handoff.
- Actual download-code PDFs: ats_classic/falcon_executive, optimized and raw, with/without photo and longCV (12 files total) passed ATS text, image and pagination checks. Existing all-template markup/style tests also passed. This is selected PDF coverage, not an exhaustive PDF certification.
- Actual-diff protected check passed; exact string/template literal comparison confirms prompt instruction strings unchanged. No template registry/style/font/PDF/auth/RLS/credit/evaluation edits.
- Independent review found and prompted regressions for raw legacy service dates, fallback numeric claims, future screening eligibility, uncertain-end global grounding, work-card labels, gap-status propagation and review-decision recovery. Important findings were fixed; no independent production or assistive-technology certification is claimed.

Screenshots and machine-readable results use synthetic Nina Sample healthcare/hospitality data. The founder evidence package contains logs and responsive/source/save views. Actual final command outcomes/commit and any unavailable preview are recorded in Issue #96.

## Remaining release and compatibility limits

The migration is authored/tested only; a separately approved isolated preview database is required for authenticated persistence review. A hosted preview may not have that schema/configuration. Do not exercise production-backed saves. No production migration/data change, merge or deployment was performed.

Old direct table writers can bypass the RPC compatibility guard; enforcing a broader database write boundary would require a separate proposal. Raw source bytes and corrected drafts are not cross-device durable. Physical Android/iOS virtual-keyboard behavior and real NVDA/VoiceOver remain unverified. Browser keyboard/focus/reflow tests and measured fixture widths are evidence, not a WCAG compliance certificate.

Rollback before release: leave this branch unmerged. After any future precision-aware writes, retain additive columns/metadata and the compatibility layer; reverting to the old lossy writer or dropping precision is unsafe. Never backfill legacy facts or replace historical snapshots automatically.
