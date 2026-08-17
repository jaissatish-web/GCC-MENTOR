-- Migration 040 — take TRUNCATE, TRIGGER and REFERENCES away from the client roles.
--
-- FOUND 2026-08-17 while verifying migration 039's own grants, which is the only
-- reason it surfaced: the new table came back holding TRUNCATE for `anon` even
-- after an explicit REVOKE of insert/update/delete. Checking the rest of the
-- schema showed the same on every table — 12 of 12, including `packages` and
-- `career_profiles`.
--
-- WHY THIS MATTERS MORE THAN THE OTHER GRANTS. Row-level security is what makes
-- INSERT, UPDATE, DELETE and SELECT safe for `anon` and `authenticated` in this
-- project: a policy scopes every statement to the caller's own rows. **TRUNCATE is
-- not subject to row-level security at all.** Postgres checks the TRUNCATE
-- privilege and empties the table. No policy is consulted, so none of the
-- protection the rest of the schema relies on applies. A single successful
-- `TRUNCATE public.career_profiles` as `anon` would erase every user's profile,
-- and `TRUNCATE public.packages` every paid resume.
--
-- IS IT EXPLOITABLE TODAY? Not by any route found. PostgREST does not expose
-- TRUNCATE as an HTTP verb — a REST DELETE becomes a SQL DELETE, which RLS
-- filters — and no SECURITY INVOKER function in this schema issues one. So this is
-- a latent privilege rather than an open door. It is still exactly the shape of
-- Unplanned #18, where a default grant to `anon`/`authenticated` survived a REVOKE
-- aimed at PUBLIC and left `SECURITY DEFINER` functions callable by anyone: a
-- privilege nobody asked for, on the most destructive operation available, with
-- the schema's main defence not applying to it. It is removed on the same
-- reasoning — do not leave the damage one bug away from being possible.
--
-- TRIGGER and REFERENCES go too. Neither is needed by a REST client. TRIGGER
-- would let a client attach a trigger function to a table it can read, which is a
-- privilege-escalation shape; REFERENCES allows foreign keys pointing at the table
-- and can leak values through constraint violations.
--
-- SELECT / INSERT / UPDATE / DELETE are deliberately LEFT ALONE. Those are the
-- grants the application actually uses, and RLS is what makes them safe.
--
-- Idempotent, and safe to re-run. Migrations execute as the schema owner, not as
-- these roles, so nothing in the app or in future migrations loses anything.

do $$
declare t record;
begin
  for t in
    select tablename from pg_tables where schemaname = 'public'
  loop
    execute format(
      'revoke truncate, trigger, references on public.%I from anon, authenticated',
      t.tablename
    );
  end loop;
end
$$;

-- Stop the same grants arriving on tables created later. Default privileges are
-- per-role-and-schema, so this has to name the roles that own new objects.
alter default privileges in schema public
  revoke truncate, trigger, references on tables from anon, authenticated;
