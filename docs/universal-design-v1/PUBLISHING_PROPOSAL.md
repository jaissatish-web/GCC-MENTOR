# Persistent publishing — proposal only, not implemented

The current approved implementation has code defaults, live previews and browser-local drafts. Publish and restore are disabled. No database or API changes are included.

## Approval requested for a later implementation

Reuse existing Supabase; no new service. Add a numbered migration with an append-only `design_theme_versions` table (UUID primary key, validated JSONB settings, creator UUID, timestamp) and a singleton `design_theme_state` table (id constrained to 1, draft JSONB, published version UUID, previous version UUID, updated timestamp). Foreign keys retain known versions. Public clients receive no write permissions. Existing administrator authorization is rechecked on every server action. Server-side validation uses the allowlisted theme schema; arbitrary CSS is rejected.

Operations: save draft validates and stores draft only; publish validates and atomically creates a version and switches the published/previous pointer; restore atomically swaps pointers to validated versions. Use an optimistic expected-version argument to reject conflicting admin writes. A transaction/RPC performs version insertion and pointer update together, with locked-down execute permissions. Include bounded version retention after references are preserved.

Runtime: server reads only published settings through a dedicated narrow reader, falls back to the known-good code preset on missing/invalid storage, and serializes CSS variables into the website-only boundary before first paint. Cache the published record with a dedicated tag; invalidate after successful publish/restore. Do not cache private drafts in public output. Never put secret settings in the theme response. Resume rendering/PDF paths never read this configuration.

Required verification before enabling: unauthorized read/write attempts, invalid/injected configuration, concurrent publish conflict, transaction failure, rollback, fallback, cache freshness across sessions, first paint, all connected components and full resume preview/PDF regression. Migration must be tested in disposable DB before production execution. Founder approval of exact migration/actions is still required; this document alone is not authorization.
