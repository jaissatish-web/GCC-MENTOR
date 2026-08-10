# Supabase Migrations

This folder holds every schema change for this product, in chronological order,
one numbered file per change.

## Why this folder exists

Every table and every column is written down history. Nothing is edited in place
against the live database. If it is not in a migration file here, it does not
exist in the database — by rule (`docs/RULES.md` §6): every schema change ships
as a numbered migration file in `supabase/migrations/`. **Never edit
`schema.sql` against a live database.**

This product does not use a migration runner (no `supabase db push`, no
Prisma, no auto-migrate on deploy). For this project the steps are manual and
deliberate — the founder applies each file by hand in the Supabase SQL Editor.
That is by design, because the founder is the only person with production
access, and every change is reviewed before it is applied.

**Also a technical fact, not just a preference (2026-08-09):** during
development, the founder authorized Claude Code to apply migrations directly
where possible. `DATABASE_URL`'s direct-connection host (`db.<ref>.supabase.co`)
does not resolve from the Claude Code sandbox at all, not even at the DNS
level — a known Supabase behavior, the direct host is IPv6-only for many
projects and the sandbox has no IPv6 route.

**Update, 2026-08-10:** the founder supplied the Connection Pooler URL
(Project Settings → Database → Connection Pooling, port 6543), which IS
IPv4-reachable from the sandbox. It's cached in `.env.local` as
`DATABASE_POOLER_URL` (gitignored, never committed — same handling as every
other secret in that file). Migration 027 was applied this way, using the
`pg` npm package (installed `--no-save` for this one-off use — not a
project dependency, not in `package.json`) connecting with discrete
connection fields rather than parsing the URL as a string, since the
founder's actual database password contains literal `@` characters that
make naive URL-parsing ambiguous. Applying a migration directly is now the
default when a session has DB access already established — the SQL Editor
manual-paste process below remains the fallback whenever it isn't.

## How migrations are numbered

Files are named with a zero-padded, monotonically increasing number followed by
a short dash-separated description:

```
010_career_profiles.sql
011_profile_children.sql
012_packages.sql
013_operations.sql
```

The numbering is **sequential and never reused**. If `010_` was already applied
to the database, the next change is `011_`, never anything less, and never an
edit to `010_`. Once a number has been applied to the database, that number is
gone forever.

## The four rules

1. **Numbered.** Each change gets the next unused number (`010_`, `011_`, …),
   in order, with a short descriptive suffix.
2. **Applied manually by the founder.** No automated migration runner. The
   founder runs each file by hand in the Supabase SQL Editor.
3. **Additive by default.** New migrations add tables, columns, indexes and
   policies. They do **not** drop or rename existing tables or columns. A
   destructive change (drop or rename) is only ever done via an explicit,
   separately-approved ticket that calls it out — it is never slipped into a
   routine change.
4. **RLS is mandatory on every table.** A new table is not considered complete
   until Row Level Security is enabled on it and it has an **owner-only**
   policy — a policy that lets only the row's owner (typically
   `user_id = auth.uid()`) select, insert, update or delete it. **Never ship a
   new table without RLS.**

## Applying a migration (checklist — copy and paste)

Use this exact checklist every time you apply a new migration to the database.

- [ ] I have confirmed this is the **next unused number** in this folder, and
      that no lower-numbered migration is waiting to be applied.
- [ ] I have read the whole file before touching the editor.
- [ ] I opened the Supabase SQL Editor for the **correct project** (production
      vs. staging — this is the project I intend to change).
- [ ] I have a **currently valid backup** of the database available, or the
      change is purely additive (no dropping or renaming).
- [ ] I ran the SQL and the editor returned **success** (no error).
- [ ] I verified every table the file created has **RLS enabled** and an
      **owner-only policy**.
- [ ] If the file created a `SECURITY DEFINER` function, I ran
      `REVOKE EXECUTE ... FROM anon, authenticated` on it explicitly — a
      `REVOKE ... FROM PUBLIC` is **not sufficient on this project**: this
      Supabase project grants `EXECUTE` on new functions directly to
      `anon`/`authenticated` as a separate default privilege that `FROM
      PUBLIC` never touches (found and fixed on three functions 2026-08-07,
      see `docs/TASKS.md` Unplanned finding #18). Verify with:
      `SELECT grantee, privilege_type FROM information_schema.routine_privileges WHERE routine_schema='public' AND routine_name='<fn>';`
      — only `service_role` (and the owner) should appear.
- [ ] I spot-checked the result (a quick select, or a look in the Table
      Editor) and it matches what the file intended.
- [ ] I confirmed the change **cannot be re-run twice** (it is either a
      `CREATE ... IF NOT EXISTS`, or running it again would error cleanly and
      harmlessly — additive changes behave this way).
- [ ] The file's number in this folder is now the **highest applied** number —
      nothing is behind, nothing is skipped.

When every box is checked, the migration is applied. If any box cannot be
checked, **stop** — do not proceed, and get the reviewer (or founder) involved
before applying anything.

## Review before apply

Every migration in `docs/TASKS.md` that touches the data layer is flagged
**Needs Review**. That means the SQL is reviewed and approved before the
founder ever runs it. Applying a migration is the last step in that chain,
never the first — the founder does not eyeball-approve their own scripts as
they paste them in; the review happens before this checklist is even opened.
