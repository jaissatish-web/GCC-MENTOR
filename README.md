# GCC Mentor

Production Baseline V1.0. Source inspected at `ed06ab8c6c73b63f7be2376e4a90b1e7ab3da342`, which matched the Vercel production alias on 27 November 2026.

GCC Mentor helps first-time Gulf applicants and professionals already in the GCC prepare for specific jobs using one truthful Career Profile. The application uses Next.js 15 App Router, React 19, TypeScript, Tailwind 3, Supabase and Vercel.

[Production](https://gcc-mentor.vercel.app/) · [GitHub](https://github.com/jaissatish-web/GCC-MENTOR)

| Location | Responsibility |
| --- | --- |
| `app/`, `middleware.ts` | Pages, layouts, route handlers, server actions, session refresh and route gates |
| `components/`, `public/` | Shared UI, landing content, icons, images and document templates |
| `lib/`, `types/` | Domain logic, AI, documents, database clients and data contracts |
| `supabase/migrations/` | Ordered schema, grants, policies and database functions |
| `scripts/`, `.github/workflows/ci.yml` | Verification, fixtures, maintenance utilities and CI |
| `next.config.mjs`, `vercel.json` | Application build and deployment configuration |

Use Node.js 22, as in CI. Run `npm ci`, copy `.env.example` into `.env.local` and configure an isolated Supabase project for signed-in development. Set `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` for server operations, and `NEXT_PUBLIC_APP_URL` for links and redirects. Supply `CRON_SECRET` for scheduled endpoints. See [Operations](OPERATIONS.md) for conditional settings. Keep secrets outside Git.

Run `npm run dev` to develop, `npm run check` for types, lint and regressions, `npm run build` for a production build, and `npm start` to serve it. CI uses placeholder Supabase settings for builds and a disposable Postgres harness for tests.

Begin with [AGENTS.md](AGENTS.md). Continue with [Product](PRODUCT.md), [Functionality](FUNCTIONALITY.md), [Architecture](ARCHITECTURE.md), [Design](DESIGN.md), [AI](AI.md), [Database](DATABASE.md), [Business](BUSINESS.md) and [Operations](OPERATIONS.md).
