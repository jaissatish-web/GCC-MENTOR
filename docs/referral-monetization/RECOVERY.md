# Referral and wallet production recovery plan

## Verified baseline and rehearsal

On 25 November 2026 Vercel reported production Ready at commit
`b5128243370b119aca2f14f83045f1d53511b9b8`, deployment
`dpl_ByAhCyD8bTBC6M6AjBKEmD4trwyF`. Recheck the live alias at release time and
record the exact compatible deployment for rollback. A read-only production
catalogue query confirmed PostgreSQL 17.6, Career Profile, packages with RLS,
existing service allowances, and absence of the new ledger and Auth triggers.
Production migration history confirms the 073/074 prerequisite batch.
Supabase reports the production organization is on its Free plan. Managed
automatic backups are unavailable on that plan. An existing logical archive
and an authorized encrypted destination were not independently confirmed.

Run `node scripts/verify-referral-recovery.mjs` to reproduce the recovery
rehearsal on disposable Postgres. It restores a synthetic pre-release archive
into another database, compares existing profile and package rows and tests
owner and cross-user visibility. It then applies 075–080 in one transaction,
rolls back and verifies that the ledger and referral Auth triggers disappeared.
It reapplies and commits all six migrations, checks that referral earning and
wallet enforcement default off, and verifies legacy rows and visibility again.
This rehearsal uses synthetic data and checks the application migration and data
compatibility. It does not certify a production restore point.

## Before approving the release

1. In the correct production Supabase project, review Database → Backups. An
   operator with backup access must record the latest successful restore point,
   its UTC timestamp, retention and the available restore method. If the account
   has no usable managed backup, arrange a logical backup using the official
   project export/restore instructions and a restricted encrypted destination.
   Record the backup artifact identifier, checksum, completion time and
   recovery owner. A backup containing production rows belongs only in an
   authorized production recovery environment.
2. For a logical backup, review coverage of roles, schemas and data, including
   Auth, extensions and grants. Record separate recovery coverage for Storage
   objects and external Auth/provider/Vercel settings if a full project restore
   is needed. Check the archive against a separate approved recovery target
   where available. Confirm acceptable data loss and downtime with the founder.
3. Record the production alias, old deployment ID, exact approved release SHA,
   previous service pause/limit settings, latest migration version, and
   production database project reference. Review the recovery sequence with the
   operator who owns Vercel and Supabase. Apply only the approved migration
   set, in numeric order, and keep earning and wallet enforcement inactive
   until the compatible application and production smoke checks are verified.

## In an incident after approval and rollout

- Stop new referral issuance and premium service admission with the existing
  admin controls. Record the incident start time, release SHA, last known good
  deployment and impacted services.
- If the migration transaction is still open and a verification fails, roll back
  the transaction. Recheck legacy package access, referral Auth trigger absence
  and migration history. If the migration has committed, restore the known-good
  Vercel deployment and leave the additive schema in place. This avoids losing
  ledger entries or later user writes. Keep the affected services paused until
  their authorization behavior and wallet totals are verified.
- Review settlement diagnostics and remaining holds. Reconcile only expired
  holds through the existing wallet reconciler. Preserve grant and settlement
  history. Reopen service admission against the compatible release after
  confirming the balance and artifact checks.
- Escalate to database restore only if the compatibility rollback cannot
  recover service or data integrity. The recovery operator must obtain
  explicit approval before any restore that can discard writes. Confirm the
  chosen restore point and account for writes after it. A Vercel rollback does
  not roll back a database.

[Supabase backup and restore documentation](https://supabase.com/docs/guides/platform/backups)

## Logical backup on the current plan

The 26 November read-only catalogue check confirmed that production is still at the
073/074 prerequisite stage and that GCC-MENTOR-TEST records migration names 075–080.
The synthetic restore and migration rollback replay passed again. Vercel confirmed
the known-good production deployment remains Ready and serves the public alias.
Actual production archive and restore validation remain open.

1. In [Production Backups](https://supabase.com/dashboard/project/wfdcsdecbnsyvoluuuox/database/backups),
   confirm whether a usable archive already exists. For a new export, use the
   production project's **Connect** panel on a trusted workstation and select the
   session pooler if direct connectivity is unavailable. Keep connection credentials
   in the operator's approved secret store and supply them only to the local client.
2. Use the [official CLI backup procedure](https://supabase.com/docs/guides/platform/migrating-within-supabase/backup-restore)
   to export the project roles, schema and data including Auth records. Run all
   exports in an access-restricted encrypted location approved for production
   data. Include the migration history and managed-schema customizations in the
   recovery inventory. Record completion time, checksum, retention and owner.
   The production provider configuration contains credentials, so the archive
   requires the same access controls as other production secrets.
3. Keep a separate inventory and protected backup for Storage objects and a
   secure record of Auth, Vercel and external provider configuration. The
   database archive only covers Storage metadata. Rehearse with synthetic data
   or restore the real archive to a separately authorized recovery environment.
   Keep production records out of GCC-MENTOR-TEST.
4. Verify restored profile and package counts, Auth and Storage references,
   extensions, grants and profile/package row-level security. Verify that the
   operator can reach the archived files and decrypt them. Keep the existing
   deployment available for application rollback and retain any new ledger and
   audit entries if a post-migration application rollback is needed.
