# [Product Name] — Gulf Career Platform

A guided platform that helps Gulf-focused job seekers get shortlisted, by rebuilding their resume in Gulf format and reframing it for a specific target role — **using only facts the user already provided.**

> **The product name is an open decision.** Use the literal placeholder `[Product Name]` in all documentation and UI copy. Do not invent a name.

---

## Status

**Phase 1 (MVP) — in development.** Career Profile data layer + resume optimizer.

**👉 [docs/PROJECT_STATUS.md](docs/PROJECT_STATUS.md) — read this first.** It has the current ticket progress, what's next, and the working process. This README stays static; that file is the living snapshot.

---

## New here? Read in this order

| # | Document | Why |
|---|---|---|
| 0 | **[docs/PROJECT_STATUS.md](docs/PROJECT_STATUS.md)** | **Current state — start here, especially in a fresh session** |
| 1 | **[docs/PIPELINE.md](docs/PIPELINE.md)** | **How this project gets built, in plain English. Start here — no coding knowledge needed.** |
| 2 | **[docs/RULES.md](docs/RULES.md)** | **Non-negotiable constraints. Nothing overrides this file.** |
| 3 | [docs/HERMES.md](docs/HERMES.md) | Operating instructions for the build agent |
| 4 | [docs/TASKS.md](docs/TASKS.md) | The backlog. *If it is not written there, it does not happen.* |

## Reference

| Document | Covers |
|---|---|
| [docs/FOUNDING_BRIEF.md](docs/FOUNDING_BRIEF.md) | The founder's original brief (v13) — the source all specs derive from |
| [docs/AUDIT.md](docs/AUDIT.md) | Step 0 gap report on the earlier HireCircuit build |
| [docs/PRODUCT.md](docs/PRODUCT.md) | Vision, audience, the MVP decision |
| [docs/MVP.md](docs/MVP.md) | Phase 1 scope — explicit IN and OUT lists |
| [docs/CAREER_PROFILE.md](docs/CAREER_PROFILE.md) | The core data layer and the fixed-vs-optimized split |
| [docs/PROMPTS.md](docs/PROMPTS.md) | AI spec — personas, grounding, levels, validation |
| [docs/DASHBOARD_LIBRARY.md](docs/DASHBOARD_LIBRARY.md) | Packages, Library, dashboard |
| [docs/USER_FLOW.md](docs/USER_FLOW.md) | MVP flow, screen by screen |
| [docs/DESIGN.md](docs/DESIGN.md) | Visual language, tokens, UX principles |
| [docs/ADMIN.md](docs/ADMIN.md) | Admin panel, rate limiting, support |
| [docs/INFRASTRUCTURE.md](docs/INFRASTRUCTURE.md) | Hosting, AI provider, document generation, migrations |
| [docs/ROADMAP.md](docs/ROADMAP.md) | Phases 2–4 backlog |

---

## Repository layout

```
docs/                The specification. The only source of truth
design-reference/    The two approved mockups, as working HTML. Convert, don't redesign
reference/           Read-only donor code from an earlier build. Patterns only, never prompts
app/                 Next.js App Router — pages and API routes
components/          React components
lib/                 Supabase clients, utilities, AI layer (to be built)
supabase/migrations/ Numbered SQL migrations, applied manually by the founder
types/               TypeScript interfaces
```

---

## The three rules that matter most

1. **The grounding rule is absolute.** Every AI generation uses only facts present in the Career Profile. Never invent, estimate or embellish a number, certification, employer or project. This applies identically at every optimization level. `docs/RULES.md` §2
2. **Never store a passport number.** Validity date and ECR/Non-ECR type only. `docs/RULES.md` §3
3. **Nothing outside Phase 1 gets built.** Scope creep is the single biggest risk to shipping. `docs/RULES.md` §4

---

## Stack

Next.js 14 (App Router) · TypeScript strict · Tailwind · Supabase (Postgres + Auth + Storage, RLS everywhere) · Claude `claude-sonnet-5` via `lib/ai/provider.ts` · Puppeteer for HTML→PDF · Razorpay (pending KYC) · Hostinger VPS for the app only.

---

## Local setup

```bash
npm install
```

```bash
npm run dev
```

Copy `.env.example` to `.env.local` and fill it in — see [docs/INFRASTRUCTURE.md](docs/INFRASTRUCTURE.md) §5. **`ANTHROPIC_API_KEY` is required from TASK-015 onward.** Never commit `.env.local`.

Chromium for PDF generation is deferred until it is needed (TASK-030):

```bash
npx puppeteer browsers install chrome
```

---

## Contributing

Every change starts from a ticket in [docs/TASKS.md](docs/TASKS.md). One ticket per commit, prefixed with the ticket ID. Payment, security and profile-storage tickets require review before merge and are **never self-assigned**.
