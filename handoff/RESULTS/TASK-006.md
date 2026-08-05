## TASK-006 — Migrations folder setup
**Status:** done

**Files changed:**
- supabase/migrations/README.md (new) — documents the migrations conventions (numbered files, manual apply by founder in Supabase SQL Editor, additive by default, mandatory RLS with owner-only policy) and includes a copy-paste apply checklist. Documentation only; no SQL.
- docs/TASKS.md (modified) — TASK-006 Status set to done.

**Spec compliance:**
- Create `supabase/migrations/README.md` → done
- Document migrations are numbered (`010_`, `011_`, …) → done, README explains zero-padded sequential numbering that is never reused.
- Document applied manually by the founder in the Supabase SQL Editor → done, explicitly states no automated migration runner; founder runs each file by hand.
- Document additive by default → done, with the caveat that a destructive (drop/rename) change is only ever done via a separately-approved ticket.
- Document every new table must have RLS enabled with an owner-only policy before it is considered complete → done.
- Include a copy-paste checklist the founder follows when applying one → done, a 9-item checkbox list.
- No SQL in this ticket → done, README is prose/markdown only; no `.sql` files created.

**Verification:**
- npm run build: PASS
  ```
  ✓ Generating static pages (17/17)
  Route (app)   Size   First Load JS
  ┌ ○ /          138 B   87.4 kB
  ... (17 routes) ...
  ○  (Static)   prerendered as static content
  ƒ  (Dynamic)  server-rendered on demand
  ```
- npm run lint: PASS
  ```
  > next lint
  ✔ No ESLint warnings or errors
  EXIT:0
  ```
- Manual check performed: confirmed the target path exists by listing `supabase/` (contained an empty `migrations/`), created `supabase/migrations/README.md`, ran `git add`/`git commit` (commit `4bdd4ad`), and confirmed the commit contains `2 files changed, 87 insertions(+)`.

**Deviations from spec:** none.

**Bugs found outside this ticket:** none.

**Questions for CTO:** none.
