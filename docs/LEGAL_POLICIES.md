# Legal and trust pages — 29 October 2026

Approved scope: populate the existing site_content legal system with Privacy, Terms, Cookies, Refund and Disclaimer; link all published policies from public, signed-in and legal-page footers. Preserve AI, authentication, storage, payment and scoring behavior.

Acceptance: five public routes using the existing plain-text renderer/admin editor; readable names; no dead privacy anchor; accurate data/deletion disclosures; mobile-first styling; typecheck/lint/build and repository checks. Content-only seed must preserve any nonempty founder-authored policy. No schema changes.

Implemented in source; release/content publication pending. Affected: siteContent, legal route, shared/public footers, auth privacy link, admin copy and content seed. Live provider settings, storage regions, retention-worker operation and legal entity/jurisdiction are not verified; do not invent them.

## Release procedure

1. Review `scripts/seed-legal-policies.sql` and apply it to the target database through its SQL editor or `psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f scripts/seed-legal-policies.sql`. This is content DML only, not a schema migration. It updates only empty bodies and preserves every nonempty existing policy, even unpublished drafts. Review any preserved policy at `/admin/content` before release; it may differ from the approved copy in the seed.
2. Verify `SELECT slug, title, published, updated_at FROM public.site_content WHERE slug IN ('privacy','terms','cookies','refund','disclaimer');` and confirm all intended pages are published with substantive bodies.
3. Deploy the PR after required checks and review. Save the affected policies through `/admin/content` to invalidate `site-content`, or allow up to the existing one-hour cache lifetime. Do not assume a deployment clears the persistent data cache.
4. Check all five URLs without signing in, footer links on landing and in-app pages, and the date. No schema/auth/storage changes are needed. Content can be revised or unpublished through the existing admin editor.

The date is rendered from `updated_at` in the existing legal route; seed sets it to 29 October 2026. Subsequent admin saves intentionally change it to the new revision date. Seed rollback: use the pre-release database content snapshot/admin editor; do not blindly clear policies after they have been edited.

## Source evidence and legal references

Reviewed `docs/01_PRODUCT.md`, `02_PHILOSOPHY.md`, `04_DATA_MODEL.md`, `05_SECURITY.md`, current baseline/master, retention inventory, anonymous session/cookie code, voice retention worker and migration058, Supabase SSR0.5.2 cookie defaults, site_content loader/admin actions and actual footers. Older claims of no anonymous storage or full account closure are not repeated. No guarantee of flawless AI or legal compliance is made.

Public references checked 29 October2026: European Commission individual rights and request-handling guidance (https://commission.europa.eu/law/law-topic/data-protection/information-individuals_en); UAE government PDPL overview (https://u.ae/en/about-the-uae/digital-uae/data/data-protection-laws); SDAIA controller/processor guidance at https://dgp.sdaia.gov.sa/. These inform conditional rights wording, not a certification of compliance.

## Verification and remaining work

Clean npm ci, typecheck, lint and production build passed. `node scripts/verify-legal-policies.mjs` passed in disposable PostgreSQL: five substantive published rows, fixed date, rerun idempotency and unpublished founder-draft preservation. Actual production Next HTTP responses against a local mock site_content backend passed for all five routes, rendered date, all five footer links and unknown-slug404 after clearing the local build-time data cache. These are fixture tests, not live database or production browser checks. Repository suite result is recorded in PROGRESS.md.

No production credentials, database publication, configured AI-provider terms/regions, retention-worker operation, visual browser screenshots or legal review were verified. Publishing the seed and required PR checks remain release steps. All content stays in the existing database editor; no fallback policy system, schema migration or generation/payment/auth behavior was introduced.
