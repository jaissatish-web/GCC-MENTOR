# GCC MENTOR — Gulf Career Platform

A platform that helps Gulf-focused job seekers get shortlisted. A user builds **one
structured Career Profile**, then generates a Gulf-format resume reframed for a specific
target job — **using only facts they already provided. The AI never invents anything.**

---

## 👉 Documentation starts at [`docs/00_START_HERE.md`](docs/00_START_HERE.md)

For a plain-language explanation of the full current platform, read [`docs/PLATFORM_MASTER.md`](docs/PLATFORM_MASTER.md).

Read [`AGENTS.md`](AGENTS.md), [`docs/PROJECT_PLAN.md`](docs/PROJECT_PLAN.md),
[`docs/CURRENT_STATE.md`](docs/CURRENT_STATE.md) and [`docs/PROGRESS.md`](docs/PROGRESS.md)
before working. These separate agreed direction, current implementation and active tasks.
[`docs/DOCUMENTATION_INDEX.md`](docs/DOCUMENTATION_INDEX.md) identifies domain references
and historical reports. Update the agreed specification **before** changing code,
then record implementation and verification results. Older records are not fresh production certification.

---

## The three rules that matter most

1. **The grounding rule is absolute.** Every AI generation uses only facts present in the
   Career Profile — never an invented or estimated number, certification, employer,
   project or date. It applies identically at every optimization level.
2. **Never store a passport number.** Validity date and ECR/Non-ECR type only. No
   document copies of any kind.
3. **Never claim what is not true** — in copy, in the UI, or in a score shown to a user.
   An unbuilt feature is honestly disabled, never a live-looking control.

Full detail: [`docs/02_PHILOSOPHY.md`](docs/02_PHILOSOPHY.md).

---

## Stack

Next.js 15.5 (App Router) · React 19 · TypeScript strict · Tailwind · Supabase (Postgres + Auth +
Storage, row-level security on every table) · OpenRouter over plain HTTP, with the
provider, model and key configured from the admin panel rather than the codebase ·
headless Chromium for HTML→PDF · deployed on Vercel from `main`.

---

## Repository layout

```
docs/                Product and engineering specifications
app/                 Next.js pages, layouts, shared CSS and API handlers
components/          Reusable UI, landing sections and resume renderers
lib/                 Business logic, data access and shared helpers
public/              Public assets and their source records
scripts/             Regression checks, fixtures and developer utilities
supabase/migrations/ Numbered SQL migrations
types/               Shared TypeScript types
design-reference/    Original HTML mockups kept for provenance
reference/           Read-only donor code from an earlier build
```

Use [the design system](docs/12_DESIGN_SYSTEM.md) for current visual direction.
The original HTML mockups and donor code document earlier work. Donor prompts
predate the grounding rule. See [the documentation index](docs/DOCUMENTATION_INDEX.md)
for the archived design evidence.

---

## Local setup

```bash
npm install
```

```bash
npm run dev
```

Copy `.env.example` to `.env.local` and fill in the Supabase values. **Never commit it.**

The AI provider, model and API key are **not** environment variables — they are set from
`/admin` and stored in the database, so they can be changed without a redeploy.

---

## Contributing

Work comes from [`docs/PROGRESS.md`](docs/PROGRESS.md). Main is the sole standing branch.
Follow [`docs/16_WORKING_AGREEMENT.md`](docs/16_WORKING_AGREEMENT.md): documents first,
implementation second, then review and verification. Preserve logic during visual-only tasks.
