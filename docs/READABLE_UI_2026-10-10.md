# Readable UI refresh — 10 October 2026

The landing page now introduces the product through a short promise, four service cards and three preparation steps. The existing application demo expands on request. The resume rotation, examples, Gulf markets, founder information, trust details, pricing and FAQs remain available.

The dashboard leads with the existing computed next action. Profile scores and saved work follow it. Detailed application and interview progress remains available under **Your progress reports**. Loading, failed-request and empty-account states remain explicit.

Mobile navigation uses **Home / Profile / Resumes / More**. The shared More drawer retains every existing service route. Desktop navigation follows the same order, uses readable active states and preserves progress marks. Tablet controls have enough room for their touch targets. The drawer contains keyboard focus, and Escape returns focus to its trigger. Public section selection closes its menu.

Inter remains the shared UI font. Body text uses weight 400, 16px on phones and 17px on laptops, with 1.7 line spacing. Marketing descriptions use 1.75 line spacing and shorter line lengths. Resume document typography remains excluded from these rules. The existing warm light background, teal and gold branding, and template visuals are preserved.

## Scope

No changes to API routes, database schema, migrations, authentication middleware, AI prompts, scoring, credits, generation, service eligibility or resume exports. The next-action computation and destination links are unchanged. Only presentation, navigation controls and descriptive copy were edited.

## Verification

- Production build, TypeScript and ESLint.
- All 49 existing deterministic checks, including scoring, grounding, service outputs and database security.
- Existing mobile-layout regression: 320–1440px, enlarged text, document isolation and 44px controls.
- `CHROME_PATH=/path/to/chromium npm run test:readable-ui`: built landing and dashboard client bundles, fictional local API fixtures, new/saved/failed profile states, next-action visibility, all services reachable through More, keyboard navigation and expandable reports/demo.

The UI fixture server binds to loopback and blocks external browser requests. It does not use production credentials, create accounts, write to a database or spend AI credits. Local screenshots are generated under ignored `artifacts/`. Authenticated production generation was not exercised by these checks.
