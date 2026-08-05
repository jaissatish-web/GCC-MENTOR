# AUDIT.md — Step 0 Gap Report

**Date:** 2026-08-05 · **Auditor:** Claude Code (CTO/reviewer) · **Baseline commit:** `0407c74`
**Scope:** existing codebase vs. Founding Brief v13. **No code was modified during the audit.**

---

## Headline

The repository contains roughly **12,000 lines of working code built against a different product specification** than the founding brief describes.

| | Existing build (HireCircuit) | Founding brief |
|---|---|---|
| Model | Freemium suite, 4 subscription tiers | Single-purpose optimizer, one-time ₹499 |
| Architecture | Resume-centric (each resume owns its own data) | Profile-centric (one Career Profile powers everything) |
| Scope | ATS + cover letter + interview prep + mock interview + apply + market insights | Career Profile + resume optimizer only |
| AI safety | None | Grounding rule, absolute and non-negotiable |

Both are coherent products. They are not the same product.

**About 60% of the code is genuinely reusable.** The core — data model, AI layer, business model, design system — must be rewritten. **Recommendation: refactor, not rebuild.**

The repository was also **not under version control**. A baseline commit now exists so every refactor is reversible.

---

## (a) Matches the brief — keep unchanged

| Area | Detail |
|---|---|
| Stack | Next.js 14 App Router, TypeScript strict, Tailwind, Supabase — exactly brief §5e |
| Resume parsing | `app/api/parse/upload/route.ts` (PDF/DOCX), `app/api/parse/text/route.ts` — brief §4e paths 1 and 2, working |
| Three input paths | Upload / paste / manual all exist as entry points |
| PDF pipeline | `api/resumes/[id]/pdf` renders `app/resume-render/[id]` via headless Chromium — brief §5e's exact approach, chosen correctly |
| Auth | Supabase SSR, HTTP-only cookies, `middleware.ts` protection. Provider-agnostic enough for the open login decision |
| RLS | Enabled on all existing tables |
| Field visibility | `block_visibility` + `block_order` JSONB — brief §4b mechanism, half-built |
| Gulf domain fields | nationality, visa status, iqama, notice period as first-class. 19 files reference iqama |
| **No passport number stored** | Only `passport_type` (ECR/Non-ECR). The earlier build independently reached the brief-safe position. **Keep it.** |
| **No religion field** | Referenced in old docs, never implemented. Leave it that way — special-category data |

**Domain knowledge the code has that the brief does not:** the **ECR / Non-ECR** passport distinction — India-specific emigration clearance status that genuinely affects Gulf hiring for Indian nationals. Carried forward into the new schema.

---

## (b) Exists but must change

**1. Data model is resume-centric; the brief is profile-centric.** *(structural — largest gap)*
Each `resumes` row carries its own `personal`, `gulf_fields`, `experience_data`, `education_data`. Ten resumes means ten copies of the user's phone number. Brief §4a promises the opposite: "any edit to a fixed field happens once in the Career Profile and automatically reflects across the resume."
→ `docs/CAREER_PROFILE.md`, TASK-007/008

**2. `optimize-resume` overwrites the original in place.** *(blocks Wow #1)*
`app/api/optimize-resume/route.ts` writes generated text back onto `summary_text` and `experience_data`. **The "before" is destroyed.** This makes the before/after diff — mockup screen 08, the landing page's central claim — architecturally impossible.
→ `docs/DASHBOARD_LIBRARY.md` §4, TASK-021

**3. No grounding rule exists anywhere in the codebase.** *(most serious finding)*
Searched all ~90 source files for "never invent", "do not invent", "grounding": **zero matches.** The optimizer's entire system prompt is: *"You are an expert Gulf resume optimizer... You improve resumes to pass Gulf ATS systems and impress Gulf recruiters."*

Nothing prevents fabricated certifications, inflated numbers, or invented projects. The landing page states "Nothing invented — ever" three times. Brief §4c calls this non-negotiable. **Currently it is marketing copy with no mechanism.**
→ `docs/PROMPTS.md` §2/§7, TASK-016/019

**4. No optimization levels, personas, or block selection.** Easy/Moderate/High: absent. Industry personas: absent — one generic sentence for all users. Per-block selection: absent, it optimizes everything always. Risk indicator: absent.
→ TASK-017/018/028

**5. Pricing model conflict.** Code has 4 tiers; `lib/utils.ts` says ₹399/₹899 while `CONTEXT.md` says ₹499/₹999 — the codebase disagrees with its own documentation. Brief §7: one-time ₹499, no subscription, no free tier. Founder has deferred the long-term model.
→ `docs/MVP.md` §7. `subscriptions` table retained but unused.

**6. Thirteen templates; the brief wants one.** Brief §4b: MVP ships **one** polished template with solid conditional rendering; multiple templates are Phase 2+. Thirteen templates × every show/hide combination is an unaffordable test surface.
→ TASK-031

**7. Design system entirely different.** Current: dark mode, `Inter`, `#1E3A8A`/`#22C55E`/`#38BDF8`. Mockups: light marble, Instrument Serif + Plus Jakarta Sans + IBM Plex Mono, navy/emerald/gold/sand. Structure survives; styling does not.
→ `docs/DESIGN.md`, TASK-006

**8. Readiness score formula wrong.** Current: profile completeness + highest ATS score + resume count. Brief §4f: completeness only, weighted by auto-derived category, never gating.
→ TASK-014

**9. Currently broken.** `OPENAI_API_KEY` empty; resume migration possibly unapplied; dashboard queries tables that may not exist. Not booted during the audit.
→ TASK-001

---

## (c) In the brief, absent from the code

| Missing | Brief § | Ticket |
|---|---|---|
| Career Profile as a first-class entity | §4 | TASK-007/008 |
| Grounding, personas, optimization levels | §4a, §4c | TASK-016–018 |
| Package / Library model, status field, generation-count logging, Phase 2–4 schema slots | §5a | TASK-009/035 |
| Before/after diff UI | §8a | TASK-033 |
| Reuse detection | §5a | TASK-036 |
| Payment (Razorpay referenced in 4 files, zero implementation) | §7 | TASK-042/043 |
| Admin panel | §5b | TASK-040 |
| Rate limiting — **zero matches in codebase** | §5c | TASK-038 |
| PII access log — **zero matches in codebase** | §9 | TASK-041 |
| Skills relevance reordering | §4a | TASK-021 |
| "Additional Information" catch-all | §4e | TASK-008 |
| Data deletion / retention | §9 | TASK-037 |
| WhatsApp share | §8a | TASK-033 |

---

## Built early, outside MVP scope

| Feature | Actual phase |
|---|---|
| ATS checker | 2 |
| Cover letter generator | 3 |
| Interview prep | 4 |
| Mock interview | 4 |
| Market insights | 3 |
| **One-click apply** | **Not in the brief at any phase** |

**The previous build did exactly what brief §9 warns against** — it built across all four phases while Phase 1's core (resume edit, preview, reliable PDF) remained unfinished. This is the most common way solo founders stall, and the founding brief is the correct antidote to it.

**Disposition: parked, not deleted.** Code stays; routes come off the UI. Phase 2–4 start with a head start instead of a blank page. **Every parked AI route lacks the grounding rule and must be rewritten before reuse.**

---

## CTO decisions recorded during this audit

| Decision | Choice | Rationale |
|---|---|---|
| Rebuild vs. refactor | **Refactor** | Preserves working parsing, PDF, auth, and real domain knowledge |
| AI provider | **Claude `claude-sonnet-5`** behind `lib/ai/provider.ts` | Grounding adherence is the core requirement; switching cost is near zero since the AI layer is being rewritten anyway |
| Out-of-scope code | **Park, don't delete** | Free head start for Phases 2–4 at zero current cost |
| Passport number | **Never store** | Confirms the existing build's position; removes the largest liability |
| Template count | **One** (`GulfPremium`, new) | Brief §4b; harvest from the existing 13 |
| Pricing | **One-time ₹499**, model kept tier-neutral | Brief §7; founder deferred the long-term model |

---

## Open decisions still unresolved

Per brief §9a — **not** resolved by this audit and **not** to be resolved by the builder:

1. Pre-payment preview content — change-summary vs. blurred full CV
2. Package / batch rules
3. Long-term pricing model — founder deferred
4. Product name — `[Product Name]` placeholder in use
5. Login method
6. Razorpay KYC timeline; Privacy / Terms / Refund policy content
