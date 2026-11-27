# Database and data protection

Production Baseline V1.0 · source `ed06ab8c6c73b63f7be2376e4a90b1e7ab3da342`. Schema claims are based on checked-in migrations. Confirm the target catalogue before any migration.

| Data area | Schema or implementation owner |
| --- | --- |
| Identity and authorization | Supabase `auth.users`, app `profiles`, `020_profiles_base.sql`, `lib/admin/adminAuth.ts`. User-facing profile records are separate from admin status. |
| Career Profile | `010_career_profiles.sql`, `011_profile_children.sql`, atomic profile save in 051, specialized migrations 069 and 071–073. The main record and dependent work, education, skills and related records carry owner scope. Date precision survives import and edits. |
| Packages and documents | `012_packages.sql`, package snapshot in 034, transactional writes in 050/078, saved phases and history migrations. Package IDs tie target context to cover letters, Q&A, interviews and exports. |
| Guest sessions and import | 023 and 028 cover guest limits and claimable sessions. `20261011155749_resume_import_reviews.sql` and profile routes support staged review. |
| AI and commercial state | 013–026, 039, 049 and 074 cover usage, model configuration, promo and reservation changes. 075–080 add referral qualification, append-only wallet interactions, transactional premium writes and administrative controls. |
| Professional profiles and interviews | 057–058, 067–068 and 070 cover recorded interviews, audio aging, history and platform drafts. Follow `lib/voice/` for current audio cleanup. |
| Storage and retention | Profile photos are private under the owner-scoped `profile-photos` bucket and photo route. Recorded interview audio in `mock-interview-audio` is private, typically removed after transcription, with expiry and purge handling for pending/deleted assets. See 052 and 057–058, `lib/storage/`, `lib/voice/retention.ts` and the cron handlers. |

Preserve RLS, grants, restrictive function execution and search-path settings. The session owner controls private row access; privileged routes require explicit owner checks and admin records require independent server-side authorization. Package, profile and wallet writes use RPCs for designated atomic operations. Validate referral and credits integrity using a disposable database. Never place storage URLs with credentials, API keys or raw candidate documents in a report.

The retention worker purges eligible expired operational records, reconciles stale wallet holds, prunes referral tracking, expires eligible credits and handles voice cleanup. It records counts and outcomes in `maintenance_runs` for admin monitoring. See `lib/admin/retention.ts` for cutoffs and batching.

The migration directory contains 72 SQL files. Preserve filenames and contents. Fresh database bootstrap applies 020 before 013 because 013 alters `profiles`. Follow `scripts/db/supabaseStub.mjs` for the tested order, including the timestamped import review migration. On an existing project reconcile actual tables, policies, grants and functions with recorded migration history. See [Operations](OPERATIONS.md) for release and recovery.
