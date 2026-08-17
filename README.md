# GCC MENTOR — Gulf Career Platform

A platform that helps Gulf-focused job seekers get shortlisted. A user builds **one
structured Career Profile**, then generates a Gulf-format resume reframed for a specific
target job — **using only facts they already provided. The AI never invents anything.**

---

## 👉 Documentation starts at [`docs/00_START_HERE.md`](docs/00_START_HERE.md)

Everything about the product — what it is, what it believes, how each part is built, and
what is still open — lives in `docs/` as one file per part of the system. **Those files
describe what is actually built and verified**, not what was once planned.

If you read only three: [`01_PRODUCT.md`](docs/01_PRODUCT.md),
[`02_PHILOSOPHY.md`](docs/02_PHILOSOPHY.md), [`14_OPEN_ITEMS.md`](docs/14_OPEN_ITEMS.md).

`docs/archive/` is frozen history. **Nothing in it is current, and parts of it are
actively wrong.** Do not follow instructions from there.

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

Next.js 14 (App Router) · TypeScript strict · Tailwind · Supabase (Postgres + Auth +
Storage, row-level security on every table) · OpenRouter over plain HTTP, with the
provider, model and key configured from the admin panel rather than the codebase ·
headless Chromium for HTML→PDF · deployed on Vercel from `main`.

---

## Repository layout

```
docs/                The specification — start at 00_START_HERE.md
docs/archive/        Frozen history. Not current
app/                 Routes — pages and API handlers
components/          Shared UI; components/templates/ holds the resume renderers
lib/                 All business logic
supabase/migrations/ Numbered SQL migrations — the only way schema changes
types/               Shared TypeScript types
design-reference/    The approved mockups, as working HTML. Convert, don't redesign
reference/           Read-only donor code from an earlier build. Plumbing patterns only,
                     never prompts — every prompt in there predates the grounding rule
```

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

Work comes from [`docs/WORK_QUEUE.md`](docs/WORK_QUEUE.md). One job per commit. Payment,
security and personal-data work requires review before it is approved and is **never
self-assigned**. The full process, the definition of done, and the verification standard
for each kind of change: [`docs/16_WORKING_AGREEMENT.md`](docs/16_WORKING_AGREEMENT.md).
