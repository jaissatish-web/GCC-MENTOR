/**
 * A disposable, in-process Postgres shaped like a Supabase project, for tests.
 *
 * Uses PGlite (real Postgres compiled to WASM — no Docker, no server, no
 * credentials) and recreates the parts of Supabase the migrations depend on:
 *   - roles anon / authenticated / service_role (service_role BYPASSRLS),
 *   - Supabase's default public-schema grants (ALL on tables and functions to
 *     every API role — the broad grants the 2026-09-15 audit is about),
 *   - auth.users + auth.uid() read from `request.jwt.claim.sub`, as PostgREST does,
 *   - storage.buckets / storage.objects / storage.foldername().
 *
 * WHAT THIS CANNOT PROVE. It runs the real SQL, grants and RLS policies, but it
 * is not PostgREST, GoTrue or the Storage API: bucket size/type limits are
 * stored here, not enforced (Storage enforces them); and PGlite is a single
 * connection, so parallel-connection races are reasoned about via locks, not
 * raced. Results are "verified in a disposable local database", never
 * "verified in staging".
 *
 * NEVER point this at a real database. It creates roles and schemas.
 */

import { PGlite } from '@electric-sql/pglite'
import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

/**
 * Fresh-database bootstrap order. Migrations apply in numeric order EXCEPT that
 * a file listed here waits for its prerequisites. 013 alters `profiles`, which
 * 020 creates — the live project had `profiles` before numbering began, so the
 * out-of-order dependency only bites on a fresh database (audit M01).
 * Keep in step with supabase/migrations/README.md.
 */
export const BOOTSTRAP_PREREQUISITES = {
  '013_operations.sql': ['020_profiles_base.sql'],
}

const SUPABASE_BASE = `
  create role anon nologin noinherit;
  create role authenticated nologin noinherit;
  create role service_role nologin noinherit bypassrls;

  grant usage on schema public to anon, authenticated, service_role;
  alter default privileges in schema public grant all on tables to anon, authenticated, service_role;
  alter default privileges in schema public grant all on functions to anon, authenticated, service_role;
  alter default privileges in schema public grant all on sequences to anon, authenticated, service_role;

  create schema auth;
  create table auth.users (
    id uuid primary key default gen_random_uuid(),
    email text,
    created_at timestamptz not null default now()
  );
  create function auth.uid() returns uuid language sql stable as
    $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
  grant usage on schema auth to anon, authenticated, service_role;
  grant execute on function auth.uid() to anon, authenticated, service_role;
  grant select on auth.users to service_role;

  create schema storage;
  create table storage.buckets (
    id text primary key,
    name text not null,
    public boolean default false,
    file_size_limit bigint,
    allowed_mime_types text[],
    created_at timestamptz default now()
  );
  create table storage.objects (
    id uuid primary key default gen_random_uuid(),
    bucket_id text references storage.buckets(id),
    name text not null,
    owner uuid,
    metadata jsonb,
    created_at timestamptz default now()
  );
  alter table storage.objects enable row level security;
  create function storage.foldername(name text) returns text[] language sql immutable as
    $$ select (string_to_array(name, '/'))[1:greatest(array_length(string_to_array(name, '/'), 1) - 1, 0)] $$;
  grant usage on schema storage to anon, authenticated, service_role;
  grant all on storage.objects to anon, authenticated, service_role;
  grant select on storage.buckets to anon, authenticated;
  grant all on storage.buckets to service_role;
`

export function migrationFiles(dir) {
  return readdirSync(dir).filter((f) => /^\d{3}_.*\.sql$/.test(f)).sort()
}

/** The order a fresh database must apply migrations in. */
export function bootstrapOrder(dir) {
  const files = migrationFiles(dir)
  const done = new Set()
  const order = []
  const visit = (f) => {
    if (done.has(f)) return
    for (const pre of BOOTSTRAP_PREREQUISITES[f] ?? []) visit(pre)
    done.add(f)
    order.push(f)
  }
  files.forEach(visit)
  return order
}

export async function createSupabaseLikeDb() {
  const db = await PGlite.create()
  await db.exec(SUPABASE_BASE)
  return db
}

export async function applyMigrations(db, dir, order = bootstrapOrder(dir)) {
  for (const file of order) {
    const sql = readFileSync(join(dir, file), 'utf8')
    try {
      await db.exec(sql)
    } catch (e) {
      throw new Error(`migration ${file} failed: ${e.message}`)
    }
  }
  return order
}

/** Run `fn` as a signed-in user (role authenticated, auth.uid() = uid). */
export async function asUser(db, uid, fn) {
  await db.exec(`reset role; select set_config('request.jwt.claim.sub', '${uid}', false); set role authenticated;`)
  try {
    return await fn()
  } finally {
    await db.exec(`reset role; select set_config('request.jwt.claim.sub', '', false);`)
  }
}

/** Run `fn` as the server's service-role client. */
export async function asService(db, fn) {
  await db.exec(`reset role; select set_config('request.jwt.claim.sub', '', false); set role service_role;`)
  try {
    return await fn()
  } finally {
    await db.exec('reset role;')
  }
}

/** Run `fn` as a signed-out visitor. */
export async function asAnon(db, fn) {
  await db.exec(`reset role; select set_config('request.jwt.claim.sub', '', false); set role anon;`)
  try {
    return await fn()
  } finally {
    await db.exec('reset role;')
  }
}

export async function createAuthUser(db, email) {
  const r = await db.query('insert into auth.users (email) values ($1) returning id', [email])
  return r.rows[0].id
}
