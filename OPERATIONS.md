# Operations and releases

Production Baseline V1.0 · source `ed06ab8c6c73b63f7be2376e4a90b1e7ab3da342`. On 27 November 2026 the production alias was Ready on deployment `dpl_EjjAjpMXeD2dB8F6EpNfTqUnCdDb` at that source.

## CI and production releases

Use a temporary branch from current main and open a pull request. `.github/workflows/ci.yml` defines the `CI / checks` gate on pull requests and pushes. It installs Node 22 dependencies, audits production dependencies, checks types and lint, runs deterministic and disposable-database suites, builds and runs Chromium verifications. Use `npm run check`, `npm run build` and the focused CI script for the affected workflow. The suite includes DOCX smoke and route cases; Chromium checks sample templates in PDF, navigation, mobile, branding, intake and wallet. Use isolated preview data for authenticated smoke tests.

After approved merge, confirm the live alias serves the expected Git SHA and production is Ready. Check public pages, private redirects and relevant signed-in journeys with authorized test access. Review Vercel runtime events and release diagnostics. Record outstanding hosted checks explicitly. Preserve a previous compatible Ready production deployment and avoid removing previews with active links or operational dependencies.

## Configuration

Use [README](README.md) and `.env.example` for core names. For hosted isolated referral checks use the build guard in `scripts/verify-referral-preview-env.mjs` and `GCC_MENTOR_PREVIEW_TEST_REF` as applicable. `VOICE_INTERVIEWS_ENABLED`, `VOICE_STT_API_KEY`, `VOICE_STT_MODEL` are conditional voice settings. Optimizer/grounding, timeout, allowance and instrumentation options are defined by the environment readers and admin schema; use the current code for supported values. Configuration records and server secrets stay in their authorized service. The production retention cron in `vercel.json` invokes `/api/cron/retention` at 03:15 UTC.

In Supabase Auth, set the canonical Site URL and allow intended callback and recovery URLs. For token-hash email flows follow `app/auth/confirm/route.ts`; for callback flows use the allowlisted targets in `app/auth/callback/route.ts`. Use the applicable SMTP configuration and verify actual signup and recovery delivery. Check URL output with `scripts/check-auth-redirects.mjs`. Treat a template change and actual delivery as distinct checks.

## Migrations and recovery

Rehearse migrations and rollback with disposable data. Record the target, prior compatible deployment, applied catalogue, restore point and responsible operator before an approved production migration. See [Database](DATABASE.md) for bootstrap order. Verify function permissions, owner isolation and data compatibility before releasing dependent code. Use the existing pause/enable controls while compatible rollout is verified. Production migrations and database changes require explicit authorization.

For a regression, preserve logs, identify the affected release and pause impacted activities where necessary. Restore the last compatible Vercel deployment and keep committed additive schema where compatible. A Vercel rollback leaves database state unchanged. Reconcile only eligible expired wallet reservations, preserving settlement history. Use `node scripts/verify-referral-recovery.mjs` for the synthetic migration and restore rehearsal. A synthetic rehearsal cannot certify production backup coverage. A database restore requires explicit approval and accounting for writes since the restore point.

See [AI](AI.md) for known factual integrity and transcription limits. Keep recurring verification instructions here and detailed release evidence with the associated PR or issue.
