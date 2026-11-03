# Free Tools repository audit — 2026-11-03

Source audited: main `c5cb0e1dcb457091215850799fd4724fce0bdd78`. Read-only source review, no live authenticated certification.

## Existing routes and reuse
- There is **no public `/tools` route** in current main. `app/dashboard/tools/page.tsx` is a protected service catalog, containing links to optimizer, templates, cover-letter, Q&A, mock interview, LinkedIn and NaukriGulf. Preserve these existing service tiles and add a Free Tools link rather than relabeling paid/AI services free.
- `app/page.tsx` imports `components/landing-v3/PremiumNav.tsx` and `LandingFooter.tsx`. `components/marketing/SiteNav.tsx` is an older alternative and not the current home header. Integrate the active surfaces.
- Current home anchors are passed from `app/page.tsx`; both desktop and mobile menus consume the anchors. Add `/tools` there using proper internal links, checking shared anchor-only tests.
- `components/landing-v3/LandingFooter.tsx` contains product links. Its FAQ link is `#faq`, which will not resolve on tool pages unless changed to `/#faq` when sharing this footer.
- `components/layout/navItems.ts` is authenticated navigation source. Add Free Tools to **both** `NAV_ITEMS` and exactly one `NAV_GROUPS` group; `ServicesMenu.tsx` warns about ungrouped items. A new non-profile-gated group permits all signed-in users access. Sidebar and menu reuse this list. Do not create another bottom bar; `MobileBottomNav.tsx` intentionally keeps Home/Resumes/Practice/Profile, while top `AppHeader.tsx` opens the full menu on phones.
- `components/layout/AppFooter.tsx` has both compact/full modes, plus legal links from `listPublishedLegal()`; public `LandingFooter` does the same. These depend on server content access; avoid coupling calculation/result rendering to footer database availability.
- UI primitives in `components/ui`, shared type roles in `app/typography.css`, theme tokens in `app/ui-system.css`: white surfaces, brand blue, ink #18253a, muted #53637a, semantic success/error, 44px controls. Reuse tokens and compact page classes. Global rules and document exceptions must remain intact.

## Auth isolation
- `middleware.ts` explicitly matches protected app routes and login/signup only. `/tools` is absent from both protected list and matcher; new public tool routes need **no auth/middleware change**.
- Do not put public tools under `/dashboard`: all descendants are protected. Existing `/dashboard/tools` may link to `/tools`.
- `lib/supabase/client.ts` exports browser client; initialization assumes env vars. For CTA only, defer optional client session lookup to effect and guard missing env. A failed auth lookup must leave calculator usable. Do not call profile APIs or import authenticated `AppShell` into public tools.
- `AppShell` imports sidebar/current-stage/profile-related navigation and server footer. Public static tool pages need a small shared public layout, not this shell. Same public page can serve authenticated visitors, with only CTA changing.

## SEO
- `lib/siteUrl.ts` normalizes `NEXT_PUBLIC_APP_URL` with production fallback; use `SITE_URL` for sitemap and metadata. Preview env may be localhost intentionally. Verify production environment canonical value rather than changing secrets.
- Root `app/layout.tsx` metadata has metadataBase, default title template, canonical `/`, locale en_US, root OG/Twitter images, index/follow. Every tool must **override inherited canonical `/`**, title, description, OG URL/title/description/image and Twitter fields. Use absolute title to avoid repeated branding if desired.
- `app/sitemap.ts` manually contains only `/`, `/preparation-pack`, `/gulf-readiness-score`; add `/tools` and completed indexable tools from an explicit published registry. Do not advertise blocked/unfinished tools. Current lastModified uses current request/build time; tool registry should carry genuine content dates.
- `app/robots.ts` allows `/` and disallows app/account/API routes. `/tools` is not blocked. No robots change required unless documenting explicit policy.
- No existing `application/ld+json`, WebApplication or BreadcrumbList implementation was found. Add small escaped JSON-LD server-side per page; do not inject input into it.
- Root OG uses an external Unsplash photograph. A local tools OG image or generated Next ImageResponse card would be more representative and avoid network dependency. This is independent of calculator functions.
- No analytics integration (`gtag`, dataLayer, plausible, posthog, trackEvent) found in application source. Implement privacy-safe event hook/adapter without a new provider or fake conversion dashboards. Document whether events only dispatch in-browser, versus actually collected; never claim collection without destination.
- All educational content, breadcrumbs, FAQs, related links should render in server page; isolate only input/results as client components. Registry must reject unknown slugs with 404, not publish empty fallback pages.

## Parsing / exports
- Existing packages: `unpdf`, `mammoth`, `docx`, `puppeteer-core`; PDF/Word extraction wrappers in `lib/resumeTextFromUpload.ts`, `lib/pdfTextExtract.ts`, `lib/resumeParse/layoutText.ts` rely on Node buffers and server parsing. They are **not automatically browser-safe**. Resume utilities can offer pasted text initially; file size check uses File metadata only. If adding parsing, verify browser bundle and avoid server/AI upload routes.
- Browser `window.print()` with print stylesheet provides private, dependency-free Save as PDF for structured notes/checklists. Explain browser print dialog rather than claiming automatic PDF download.
- Deterministic keyword matching must be isolated from `lib/jobMatch/`, `lib/optimizer/`, existing ATS API/scoring and all AI services; report term overlap rather than employer ATS success.

## CI and deployment
- `.github/workflows/ci.yml` runs on every branch push and PR; job `checks` runs Node22 `npm ci`, production high audit, typecheck, lint, `npm test`, build, Chromium installation, PDF compatibility tests, responsive typography/mobile, clear-path, CTA, studio, review, processing, navigation and shared-intake tests. CI timeout 30m. Dummy Supabase settings are used. It does not certify real authenticated production data.
- `package.json` exposes `check` = typecheck + lint + npm test. Existing test runner `scripts/run-checks.mjs` plus browser verification scripts are reusable conventions. Add meaningful free-tool function and browser coverage to normal test entry points/CI.
- `vercel.json` only sets BOM1 region and existing retention cron. New tool pages need no deployment/env/cron/schema changes. `next.config.mjs` externalizes server PDF libraries and traces Chromium only for existing resume PDF routes; don't expand heavy tracing to browser free tools.
- Validate protected branch settings via GitHub API, merge only green required checks and mergeability; inspect Vercel commit/deployment state after automatic Git merge deployment.

## Important risks / acceptance
1. Legal correctness cannot be inferred from code or competitor; each jurisdiction/regime/date needs official verification. Block unavailable rules explicitly; no country-name-only duplicated pages.
2. Negative, zero, NaN/Infinity, extremely large values and dates need field-specific treatment. Avoid generic Number(empty)=0 validation. Calendar arithmetic should avoid local DST and invalid rollover.
3. Local tracker must catch unavailable/quota-exceeded storage and warn about cleared browser data; never silently claim persistence.
4. Tool forms/results must remain usable without auth success. Test both guest and synthetic signed-in CTA states, clearly separating real-session evidence.
5. Indexability is not ranking; Lighthouse needs documented measured runs, and production checks cannot be inferred from source.
6. Root layout fonts use next/font/google; restricted network local builds may need available font fetch path/cache. No dependency change authorized merely to bypass local connectivity.
