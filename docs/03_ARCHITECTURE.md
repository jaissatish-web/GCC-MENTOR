# ARCHITECTURE — stack, layout, and how a request flows

---

## 1. Stack

| Layer | Choice |
|---|---|
| Framework | Next.js 14, App Router, React 18 |
| Language | TypeScript, strict mode |
| Styling | Tailwind CSS 3 |
| Database, auth, storage | Supabase (Postgres + Auth + Storage), row-level security on every table |
| AI | OpenRouter, called over its OpenAI-compatible HTTP API with plain `fetch` — no vendor SDK |
| PDF rendering | Headless Chromium via `puppeteer-core` + `@sparticuz/chromium` |
| Resume text extraction | PDF.js (`unpdf`) for PDF, `mammoth` for DOCX |
| Hosting | Vercel, deployed from `main` |
| UI primitives | Radix, Heroicons |

**No AI vendor SDK is installed on purpose.** The provider, model, key and a
fallback are all editable from the admin panel and stored in the database, so
switching provider never needs a redeploy. See [`06_AI_PIPELINE.md`](06_AI_PIPELINE.md).

---

## 2. Folder layout

| Path | Contains |
|---|---|
| `app/` | Routes — pages and API handlers, App Router convention |
| `components/` | Shared UI. `components/ui/` are the design-system primitives; `components/templates/` are the resume renderers |
| `lib/` | All business logic. Nothing in `app/` should hold a rule that belongs here |
| `types/` | Shared TypeScript types |
| `supabase/migrations/` | Numbered SQL migrations, the only way schema changes |
| `docs/` | This documentation — the specification |
| `design-reference/` | The original approved mockups as working HTML. Convert, do not redesign |
| `reference/` | Read-only donor code from an earlier build. Wiring patterns only |

**The one hard warning about `reference/`:** every AI prompt in it was written
**without** the grounding rule and allowed the model to invent certifications and
numbers. Never copy a prompt from there. Use it for *how plumbing works*, never for
*what the product is*.

---

## 3. Where the logic actually lives

The rule is one concept, one module, one reader. These are the modules that matter
most, and each has a document that owns it.

| Module | Decides | Document |
|---|---|---|
| `lib/resumeKind.ts` | What kind of resume a row holds, **for labelling only** — no gate | [`10_PLANS_AND_PAYMENT.md`](10_PLANS_AND_PAYMENT.md) |
| `lib/entitlements.ts` | What the free plan includes | [`10_PLANS_AND_PAYMENT.md`](10_PLANS_AND_PAYMENT.md) |
| `lib/ai/grounding.ts` | The grounding instruction, verbatim, imported everywhere | [`02_PHILOSOPHY.md`](02_PHILOSOPHY.md) |
| `lib/ai/validateGrounding.ts` | Whether generated output may be returned at all | [`06_AI_PIPELINE.md`](06_AI_PIPELINE.md) |
| `lib/resumeDocument.ts` | The one derivation of a resume from a profile | [`08_RESUME_ENGINE.md`](08_RESUME_ENGINE.md) |
| `lib/templates.ts` | The template registry and versioning | [`08_RESUME_ENGINE.md`](08_RESUME_ENGINE.md) |
| `lib/readiness.ts` | The GCC Readiness score | [`09_SCORING.md`](09_SCORING.md) |
| `lib/jobMatch/`, `lib/gccReadiness/` | Job Match scoring and resume analysis | [`09_SCORING.md`](09_SCORING.md) |
| `lib/rateLimit.ts`, `lib/anonymousRateLimit.ts` | Cost and abuse control | [`06_AI_PIPELINE.md`](06_AI_PIPELINE.md) |
| `lib/supabase/` | The three database clients — see §5 | [`05_SECURITY.md`](05_SECURITY.md) |

**One derivation, many renderers.** A resume is derived from a profile in exactly
one place, and every template renders that derived document. A template never
re-derives its own data. This is what makes 15 templates cheap and what makes an
exhaustive rendering baseline possible.

---

## 4. How a request flows

**A page request:**
```
Browser → middleware.ts (session + route protection)
        → Server Component (reads Supabase with the user's own session)
        → HTML
```

**An API request that costs money:**
```
Browser → route handler
        → authentication check           (401 if absent — always first)
        → ownership check                (the row must belong to the caller)
        → rate limit                     (the only spend limit while locks are off)
        → prompt built from profile data only
        → AI provider over HTTP
        → grounding validator            (blocks unvalidated output)
        → write result → response
```

**Every step in that order matters.** Authentication precedes any model call, so an
anonymous caller can never spend tokens. Validation precedes the response, so unverified
output never reaches a user.

**There is no payment check in that chain today** — every service is open while the AI
pipeline is being built, and the locks are re-applied afterwards. When they return, the
gate sits immediately after the ownership check, before anything is generated or served.
See [`10_PLANS_AND_PAYMENT.md`](10_PLANS_AND_PAYMENT.md).

**A PDF download:**
```
Browser → /api/packages/[id]/pdf
        → auth + ownership + access gate
        → the frozen delivered document, if one exists
        → render template to HTML → headless Chromium → PDF bytes
```

---

## 5. The three database clients — never mix them up

| Client | Runs as | Use for |
|---|---|---|
| `lib/supabase/client.ts` | The signed-in user, in the browser | Client components |
| `lib/supabase/server.ts` | The signed-in user, on the server | Server Components and most routes. **Row-level security applies** |
| `lib/supabase/serviceAdmin.ts` | The service role — **bypasses row-level security entirely** | Only where a user genuinely must not be able to do the write themselves |

**The service-role client is the sharpest tool in the repository.** It ignores
every policy. It is correct for admin writes to tables that carry no write policy
at all, and for nothing else. Any new use of it is security-critical work and
requires review.

The first two clients and `middleware.ts` are **protected files** — they are not
modified without an explicit instruction naming them.

---

## 6. Environments and configuration

Configuration is split deliberately between environment variables and the
database:

**Environment variables** — infrastructure that cannot bootstrap itself:
Supabase URL, the anonymous key, the service-role key, and a pooler connection
string used for applying migrations. Never committed.

**Database rows** — everything the founder should be able to change without a
developer:
- AI provider, model, key and fallback, per feature (`ai_provider_config`)
- Prices (`pricing`) — edited directly in the Supabase table editor
- What the free plan includes (`plan_entitlements`) — edited from the admin panel
- Prompt templates (`prompt_templates`)

**This split is the point, not an accident.** A price change or a model swap is a
business decision, and the founder makes it without asking anyone or waiting for a
deploy.

---

## 7. Deployment

Vercel builds from `main`. Push is deploy.

**Two deployment facts that were expensive to learn and are easy to break:**

1. **Chromium must be shipped to the lambda explicitly.** The PDF route launches a
   real browser. Its binary lives in a package directory that Next's file tracer
   cannot see, because it is only ever opened at runtime by a computed path.
   `next.config.mjs` therefore both externalises the package *and* forces its
   `bin/` directory into the function bundle. Externalising alone is not enough —
   that was verified by reading the build's own file-trace output, not inferred.
2. **The include key is a glob, and that is the trap.** A literal
   `/api/packages/[id]/pdf` key silently matches nothing, because `[id]` is read as
   a character class. A wildcard segment is what actually matches. Two earlier key
   formats looked correct and traced zero files.

The include is scoped to the routes that actually launch a browser, so no other
function carries 66MB it never uses.

---

## 8. Local development notes

- `npm run dev` for the dev server; `npm run build` then `npm start` for a
  production check.
- **This machine has limited memory (~4GB).** Running a dev server and a
  production build at the same time reliably corrupts the build cache and produces
  module-not-found errors that look like real defects. If that happens: stop all
  Node processes, delete `.next`, and start once.
- Migrations are applied against the live database using the pooler connection
  string, in a transaction, and then **confirmed by querying the catalogue.** The
  direct database host is not reachable from this environment.
