# GCC Mentor

GCC Mentor helps professionals preparing for jobs in Saudi Arabia, the UAE,
Qatar, Oman, Kuwait and Bahrain, including people already working in the Gulf.
One confirmed Career Profile supports the base CV, tailored job packages and
interview preparation. The stack is Next.js App Router, React, strict
TypeScript, Tailwind, Supabase Auth/Postgres/Storage and Vercel.

## Where to work

| Concern | Code to inspect first |
| --- | --- |
| Public landing and tools | `app/page.tsx`, `components/landing-v3/`, `app/tools/`, `lib/free-tools/` |
| Career Profile, import and review | `app/profile/page.tsx`, `app/api/profile/`, `lib/resumeParse/`, `lib/careerIntake/` |
| Readiness, ATS and resume optimization | `lib/gulfReadiness/`, `lib/jobMatch/`, `app/api/optimize/`, `lib/optimizer/` |
| Resume Library and job packages | `app/dashboard/library/`, `app/package/`, `app/api/packages/` |
| Cover Letter, Interview Q&A, Mock Interview, reports and progress | Package API routes, `app/mock-interview/`, `lib/voice/` |
| LinkedIn and NaukriGulf | `app/api/linkedin/`, `app/api/naukrigulf/`, `components/linkedin/` |
| AI provider, usage and service allowances | `lib/ai/provider.ts`, `lib/ai/providerConfig.ts`, `lib/ai/serviceGuard.ts`, `lib/rateLimit.ts`, `lib/admin/servicePackages.ts` |
| Resume styles, templates and exports | `lib/resumeStyle.ts`, `lib/templates.ts`, `lib/pdf/`, `app/api/resume/pdf/` and the package PDF/DOCX routes |
| Account, administration, models, promo codes and logs | `app/settings/`, `app/admin/`, `lib/admin/` |
| Application design | `tailwind.config.ts`, `app/globals.css`, `app/typography.css` and the [design system](docs/12_DESIGN_SYSTEM.md) |

## Rules

- Inspect the current route, callers, schema, and tests before editing. Reuse
  the existing owner for a responsibility. Verify real columns, endpoints,
  configuration keys and function contracts before using them. Keep components
  focused and add files, dependencies or documentation only when needed.
- Treat current source, verified schema, and explicit founder decisions as
  authoritative. Dated reports are evidence for their own revisions. Keep
  feature and release decisions in the existing domain docs or the relevant
  issue/PR. Use the [documentation index](docs/DOCUMENTATION_INDEX.md) to find
  domain detail, operational instructions, and historical records.
- Preserve candidate facts. Never invent skills, work, dates, qualifications,
  employers, metrics or achievements. Keep unknown dates unknown. Protect
  scoring policies, paid allowances, pricing, approved designs, and resume
  template behavior. Obtain founder approval before changing those decisions,
  introducing major architecture changes, or performing destructive operations.
- Session refresh and private page redirects live in `middleware.ts`.
  Independently authenticate server APIs via `lib/supabase/server.ts`, scope
  data to the caller and keep owner-based RLS under `supabase/migrations/`.
  Use `lib/admin/adminAuth.ts` for admin authorization. Service-role access
  stays server-side. Never log credentials, raw resumes or passport numbers.
- Reserve authenticated model work before calling the provider and settle the
  reservation on success or failure. Use the existing guest pause and atomic
  attempt limit for anonymous AI. Use the shared browser renderer for PDF
  concurrency protection and keep Chromium trace entries scoped to its callers.
- Search imports, dynamic paths, routes, assets, scripts, tests, database/cron
  and external consumers before deleting superseded work. Preserve
  uncertain dependencies and historical migrations. Keep temporary diagnostics
  out of committed source.

## Verify and release

Use `npm ci`, `npm run check` (types, lint, and deterministic checks), and
`npm run build`. Use the affected checks in `.github/workflows/ci.yml` for
mobile/desktop, database, document and accessibility behavior. Use synthetic
fixtures for development and an isolated configuration for hosted write tests.
Trace failures to their cause, inspect the final diff, and report what each
check actually exercised.

Work from current `main` on a dedicated branch and open one PR for review.
Respect branch protection. Follow the [release checklist](docs/SAAS_RELEASE_CHECKLIST.md)
and [migration instructions](supabase/migrations/README.md). Preview and
production have separate verification and release decisions. Merge or change
production only with founder authorization.
