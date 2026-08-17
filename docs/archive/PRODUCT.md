# PRODUCT.md — Vision, Audience, and the MVP Decision

Source: Founding Brief §1–§3, plus technical context from the existing codebase.

---

## 1. Long-term vision

A guided platform that helps any Gulf-focused job seeker — regardless of where they are in their journey — **get shortlisted**, by fixing the real reason applications fail:

- generic resumes and cover letters not tailored to the target role, and
- no visibility into whether the candidate is even competitive.

Full long-term scope: guided resume building, one-click Gulf-format optimization, real ATS scoring against a specific job description, AI-generated interview questions from the optimized resume, a speech-based mock interview with review, and an information layer (blog plus free tools: ATS score, CV score, salary calculator, end-of-service-benefits calculator).

**This section describes the destination, not what ships first.** See `docs/MVP.md` for what ships first and `docs/ROADMAP.md` for the sequence.

---

## 2. Who the platform serves

**Open to every Gulf-focused job seeker. Not restricted to one persona or segment.**

This includes:

- people with no Gulf experience yet
- people with Indian or other domestic experience trying to break in for the first time
- people currently in the Gulf who want their next assignment
- people currently in the Gulf who want a step up

**The product does not gate access by type of user.** There is no "this tool is for X" screen, no qualifying question that turns anyone away.

### How the product personalizes without segmenting

Onboarding builds a structured **Career Profile** (`docs/CAREER_PROFILE.md`) capturing the user's *status* and *target* alongside the rest of their background. That profile drives:

- which expert persona the AI adopts when generating
- which Gulf-CV format conventions apply
- how the readiness score is weighted

This is **guidance personalization, not a user restriction**. Anyone can use the platform regardless of what their profile contains.

---

## 3. Market context — why trust is the product

This market is **trust-starved more than feature-starved**. There is documented, active scam behaviour targeting exactly this audience: agents who take money for Gulf job placement and disappear.

Two consequences that must shape every build decision:

1. **Credibility and transparency come before polish.** Transparent pricing on the homepage, a real founder story, visible payment security, and the "nothing invented" promise are primary product surface — not footer content.
2. **The grounding rule is a trust feature, not just a safety feature.** "The AI never invents a fact you didn't give us" is the strongest differentiator available in a market where the competition is fabrication.

---

## 4. The MVP decision

The MVP is:

> the Career Profile data layer, plus the core resume optimization flow built on top of it — **open to all users from day one**.

No user type is excluded or prioritised in the product itself. Marketing and initial outreach may emphasise whichever channel or message converts fastest — that is a go-to-market choice, tested during distribution, **not a product restriction**.

### Why the Career Profile is built first

Every output the platform will ever generate — optimized resume now; cover letter, interview questions, mock interview later — must be **generated from the same structured profile**, not re-derived from a fresh upload each time.

Building this correctly now is what makes Phases 3 and 4 cheap. The Phase 3 cover letter generator, for example, requires *no new data layer and no new mechanism* — only a different persona. That is the proof the investment is correct.

---

## 5. Technical starting position

This repository contains a pre-existing Next.js application (~12,000 LOC) built against an earlier, different product specification. It is being **refactored, not rebuilt**.

**What carries forward unchanged:**

| Capability | Where |
|---|---|
| Next.js 14 App Router + TypeScript strict + Tailwind | project root |
| Supabase Postgres + Auth + RLS on all tables | `lib/supabase/`, `supabase/` |
| Resume parsing from PDF / DOCX | `app/api/parse/upload/route.ts` |
| Resume parsing from pasted text | `app/api/parse/text/route.ts` |
| HTML→PDF via headless Chromium | `app/api/resumes/[id]/pdf/route.ts`, `app/resume-render/[id]/page.tsx` |
| Auth + route protection | `middleware.ts`, `app/auth/callback/route.ts` |
| Field visibility / block ordering mechanism | `block_visibility`, `block_order` JSONB |
| Gulf domain fields (nationality, visa, iqama, ECR/Non-ECR passport type) | `profiles`, `app/dashboard/profile/` |

**What is being replaced:** the data model (resume-centric → profile-centric), the entire AI layer (no grounding, no personas, no levels), the design system, and the pricing model.

**What is being parked:** ATS checker, cover letter, interview prep, mock interview, one-click apply, market insights. These are Phase 2–4 features that were built early. Their code stays in the repository and stops being reachable from the UI. See `docs/MVP.md`.

Full detail: `docs/AUDIT.md`.
