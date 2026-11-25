# Referral and wallet production recovery plan

## Verified baseline and rehearsal

On 25 November 2026 Vercel reported production Ready at commit
`b5128243370b119aca2f14f83045f1d53511b9b8`, deployment
`dpl_ByAhCyD8bTBC6M6AjBKEmD4trwyF`. Recheck the live alias at release time and
record the exact compatible deployment for rollback. A read-only production
catalogue query confirmed PostgreSQL 17.6, Career Profile, packages with RLS,
existing service allowances, and absence of the new ledger and Auth triggers.
Production migration history confirms the 073/074 prerequisite batch.

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
