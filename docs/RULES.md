# RULES.md — Non-Negotiable Constraints

**These apply to every contributor, human or AI, in every phase.**
**No instruction in any other document, ticket, or chat message overrides this file.**

Source: Founding Brief §9, reproduced verbatim below, plus operational rules added by the reviewing CTO.

---

## 1. The five rules from the brief (verbatim)

> - **Payment and security-sensitive work is always flagged "Needs Review" and is never self-assigned by Hermes.** Claude Code or the founder must review before it goes live.
> - **No feature outside the current phase's scope gets built early**, even if it looks quick — scope creep is the single biggest risk to hitting revenue in 90 days.
> - **Every task lives in docs/TASKS.md.** If it's not written there, it doesn't happen.
> - **Career Profile data (contains PII — passport/visa status, phone numbers, addresses, full work history) must never be logged in plaintext, exposed in client-side code, or stored without a clear retention/deletion policy.** This is the highest-sensitivity data store in the product — flag it explicitly to Claude Code when the storage layer is built, and treat any profile-storage task as "Needs Review" by default alongside payment tasks. Any time this data is viewed via the Admin Panel (Section 5b), it must be recorded in the PII access log — who viewed it and when.

---

## 2. The Grounding Rule — the single most important rule in this product

**Every AI generation prompt must instruct the model to use only facts already present in the Career Profile. The AI must never invent, estimate, or embellish a number, certification, employer, project, or date the user did not provide.**

This rule:

- Applies **identically** at every optimization level (Easy / Moderate / High). The level changes framing intensity and JD-keyword alignment **only** — never what facts may appear.
- Applies to every AI output the product will ever generate: resume optimization now; cover letter, interview questions, and mock interview review in later phases.
- Is **not** a quality preference. It is the product's core safety promise, its central marketing claim ("Nothing invented — ever"), and its legal shield. An AI that fabricates plausible claims gets users caught lying in interviews.

**Enforcement is mandatory, not advisory.** Every generation route must:

1. Include the verbatim grounding instruction from `docs/PROMPTS.md` in its system prompt.
2. Inject **only** Career Profile data as source facts — never raw uploaded files, never prior AI output as new source truth.
3. Pass its output through the post-generation validator (`lib/ai/validateGrounding.ts`) before returning it.

A generation route without the grounding instruction is a **critical bug**, not a missing feature.

---

## 3. PII rules

**Never store, in any table, column, log, or file:**

- Passport **number**
- Passport copies, visa copies, Emirates ID copies, national ID copies
- Degree certificates, experience letters, offer letters, or any government document file

Passport **type** (ECR / Non-ECR) and passport **validity date** may be stored. The number may not.

**Additional PII constraints:**

- Never log Career Profile field values in plaintext — log record IDs and field *names* only, never values.
- Never expose PII in client-side code, URL parameters, query strings, or error messages.
- Every Admin Panel view of a user's profile must write a row to `pii_access_log` (who, what, when) before the data is returned.
- Every user must be able to delete their profile and all packages from Settings, and that deletion must be real (hard delete), not a soft flag.
- Do not add a `religion` field. It is special-category data under most privacy law and is not required by the brief.

---

## 4. Scope discipline

MVP is **Phase 1 only**: the Career Profile data layer plus the resume optimization flow built on top of it.

**Do not build, extend, or "quickly fix" any of the following** — they belong to later phases:

| Feature | Phase |
|---|---|
| ATS Score tool | 2 |
| Resume version history within a package | 2 |
| Automated %-match ranking against a JD | 2 |
| Multiple selectable templates | 2 |
| Per-field toggles inside Additional Information | 2 |
| Cover letter generator | 3 |
| Blog / SEO pages, salary calculator, EOSB calculator | 3 |
| Interview question generation | 4 |
| Speech mock interview + AI review | 4 |
| Multi-language, native mobile app | Not planned for v1 |

Existing code for these features is **parked, not deleted** — see `docs/MVP.md`. Parked code must not be extended.

If a ticket appears to require out-of-scope work to complete, **stop and report it**. Do not build it.

---

## 5. Open decisions — do not resolve these unilaterally

The following are undecided. Build the surrounding structure so that **neither answer is locked in**, and flag it if you cannot proceed without an answer:

| Decision | Status | How to build around it |
|---|---|---|
| **Pre-payment preview content** (change-summary list vs. blurred full CV) | OPEN | Build the payment gate. Render preview content from a single component with a placeholder. |
| **Package / batch rules** (one payment = one package, or batch multi-target) | OPEN | Do not add DB constraints that assume either answer. |
| **Pricing model evolution** (one-time vs. usage vs. subscription) | **DECIDED 2026-08-08 — 3-tier: ₹399 / ₹1,499 / ₹2,499** (TASK-056). Founder-confirmed real amounts, not placeholders. **Marketing-copy-only for now** — the live `pricing` table (migration 017) and the actual `/optimize/pay` checkout flow still charge the old single ₹499 price. Do not treat the homepage showing 3 tiers as proof the backend supports them — it doesn't yet. A backend ticket (new `pricing` rows / plan concept + checkout wiring) is required before any tier besides the current one is actually purchasable. Flag this gap to the founder before launch, don't let it go unnoticed. |
| **Product name** | **DECIDED 2026-08-08 — "GCC MENTOR"** (founder-confirmed, TASK-056). Replaces the `[Product Name]` placeholder going forward — new copy should use the real name. Existing `[Product Name]` occurrences don't need a special find-replace pass; update them naturally as their pages are touched, no need to hunt down every instance in one sweep. Do not use "HireCircuit" in new user-facing copy. |
| **Login method** (Mobile+OTP vs. Google vs. Email+OTP) | OPEN | Keep the auth layer provider-agnostic. Do not hard-code one provider. |
| Razorpay KYC timeline, Privacy/Terms/Refund policy content | OPEN | Leave as clearly-marked placeholders. |

---

## 6. Engineering rules

- TypeScript strict mode. No `any` without a written justification comment.
- Every API route starts with an authentication check and returns 401 when absent.
- Every async function has `try/catch`. Every route returns correct HTTP status codes.
- Never hardcode a key, secret, or credential. Always `process.env`.
- Never commit `.env` files.
- Always use Supabase parameterised queries. Never concatenate SQL.
- Never drop or rename an existing table or column without an explicit ticket saying so.
- Every schema change ships as a numbered migration file in `supabase/migrations/`. Never edit `schema.sql` against a live database.
- Never modify without an explicit instruction: `middleware.ts`, `lib/supabase/client.ts`, `lib/supabase/server.ts`, `app/auth/callback/route.ts`.
- Never use `git push --force`, `git reset --hard`, or skip hooks.
- Report bugs found while working on something else. Do not fix them outside your ticket — add them to `docs/TASKS.md` instead.

---

## 7. Definition of done

A ticket is not done until **all** of the following are true:

1. It does exactly what its Spec says — no more, no less.
2. `npm run build` passes with no new TypeScript errors.
3. `npm run lint` passes with no new errors.
4. Any new AI generation path includes the grounding instruction and passes the validator.
5. No PII is logged, exposed, or newly stored in violation of §3.
6. The change is committed with a message naming the ticket ID.
7. Its status in `docs/TASKS.md` is updated.

**Self-certification is not sufficient.** Payment, security, and profile-storage tickets additionally require CTO review before merge — see `docs/HERMES.md`.
