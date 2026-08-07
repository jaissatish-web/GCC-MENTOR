# ROADMAP.md — Phased Backlog

Source: Founding Brief §10. Sequenced, **not simultaneous**.

Tickets exist for **Phase 1 only** (`docs/TASKS.md`). Phases 2–4 are recorded here as a backlog and must not be broken into tickets or built until the preceding phase is live.

---

## Phase 1 — MVP (current)

**Career Profile data layer + resume optimizer.** Full scope in `docs/MVP.md`.

**Exit criteria — Phase 2 does not start until all are true:**

1. A user can go from landing page to downloaded, optimized PDF without founder intervention.
2. Razorpay is live and has processed at least one real payment.
3. The grounding validator is running on every generation path.
4. The admin panel can resolve a "I paid but something broke" support case.

---

## Phase 2 — Week 2–3

**Theme: top-of-funnel and retention.**

| Item | Notes |
|---|---|
| **Free ATS Score tool** | Lightweight keyword-match version. Can read from an existing Career Profile if one exists. This is the hook that feeds the Phase 1 paid optimizer. Substantial prior code exists at `app/api/ats-check/route.ts` and `app/dashboard/ats-checker/` — parked, review before reuse. |
| **Resume version history within a package** | Git-like: keep past optimization runs instead of overwriting. Deferred from MVP because version history only becomes valuable once a user has accumulated multiple runs on the same package — which by definition means they are already retained. No value in building it before Phase 1 proves retention. |
| **Automated %-match ranking against a new JD** | Built on the same similarity-scoring logic as the ATS engine. Do not build this twice. Replaces the MVP's rule-based title matching in reuse detection. |
| **Multiple selectable resume templates** | Only after the single MVP template's conversion is validated. 12 additional templates already exist in `components/templates/` — parked. |
| **Per-field toggles inside Additional Information** | Only if usage shows it is needed. |

---

## Phase 3 — Month 2

**Theme: second paid product + organic acquisition.**

| Item | Notes |
|---|---|
| **Cover letter generator** | Paid add-on. Generated from the same Career Profile with a "senior recruiter writing a persuasive letter on the candidate's behalf" persona instead of the hiring-manager persona. **No new data or mechanism required** — this is the payoff for building the Career Profile correctly in Phase 1. Prior code at `app/api/cover-letter/route.ts` — parked, has no grounding rule, must be rewritten against `docs/PROMPTS.md`. |
| **Blog content + SEO pages** | Information layer. |
| **Salary calculator** | Prior data exists: `market_insights` + `job_disciplines` tables are already seeded. |
| **EOSB (end-of-service benefits) calculator** | New build. |

**Revisit at this point:** the pricing model. Once cover letter generation is a repeatable per-package action, one-time-per-optimization pricing may no longer fit. See `docs/RULES.md` §5.

**Founder request, 2026-08-07 — recorded here, not built:** an admin-configurable, token-based multi-package system — define arbitrary services in the admin panel, assign each a token cost, bundle into packages, and have that configuration alone drive what users can buy. Explicitly deferred to this revisit point rather than built during Phase 1, for two reasons: (1) `docs/MVP.md` §7 already commits to "no subscription tier yet — introduce only after Phase 1 proves conversion... validate after the first 10 sales," and this is exactly that model arriving early, before any real sale exists to validate against; (2) the Phase 1 payment screen's copy (`docs/USER_FLOW.md` Step 9) promises users "No subscription. No auto-renewal" — a token/credit system is functionally a wallet and would mean walking that promise back before it ships. Founder chose to finish Phase 1 first. When this is picked up for real: it needs a proper spec (token/entitlement schema, admin package-builder UI, payment-flow changes, and a decision on how the "no subscription" user-facing promise should change), not a bolt-on to the existing single-row pricing table from TASK-047.

---

## Phase 4 — Month 2–3+, funded by revenue from Phases 1–3

**Theme: the differentiator. Highest complexity in the entire roadmap.**

| Item | Notes |
|---|---|
| **AI-generated interview questions** | Built from the Career Profile + the *optimized resume*, using claim-extraction: read the specific claims in the user's optimized resume (numbers, named systems and standards, scope of responsibility) and generate a deep-dive question tied to each one, plus a few general questions from the JD's required skills. Not a generic question bank. |
| **Speech-based mock interview with AI review** | Highest complexity item in the whole roadmap. |

**Hard gate: do not start Phase 4 until Phases 1–3 are live and generating revenue.**

**Phase 1 obligation to Phase 4:** the optimized resume must be stored as structured data with claims identifiable and extractable — not as free text. This costs almost nothing now and is expensive to retrofit. See `docs/DASHBOARD_LIBRARY.md`.

---

## Not planned for v1

- Multi-language support
- Native mobile app (the web app is mobile-first; that is the mobile strategy)
- Job board / external job integrations
- One-click apply *(exists in the codebase from the earlier build; not in the brief at any phase — parked indefinitely)*
