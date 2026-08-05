# PROMPTS.md — AI Generation Specification

Source: Founding Brief §4a, §4c, §4d.

**This document defines the safety-critical behaviour of the product.** Deviating from it is a critical bug, not a style choice.

---

## 1. The three rules, always used together

Every AI-generated output in this product — resume optimization now; cover letter, interview questions, and mock interview review later — is built from three rules applied simultaneously.

### Rule 1 — Persona

Every generation prompt assigns the AI a **specific expert identity** relevant to the user's target industry and role, pulled from the Career Profile's target fields.

This is what makes output sound like a real practitioner rather than a template engine.

### Rule 2 — Grounding *(absolute)*

Every prompt explicitly instructs the AI to use **only facts already present in the Career Profile**. Never invent, estimate, or embellish a number, certification, employer, or project the user did not provide.

**The Career Profile is the only source of truth injected into any generation prompt.**

This rule applies **identically at every optimization level**. The level changes framing intensity and JD-keyword alignment only — never what facts may appear.

### Rule 3 — Claim-extraction *(Phase 4, design for it now)*

Question generation will read the specific claims present in the user's *optimized resume* — numbers, named systems and standards, scope of responsibility — and generate a deep-dive question tied to each one, testing whether the user can actually explain what they claimed.

**Phase 1 obligation:** store optimized output as structured data with claims identifiable and extractable, not as free text. Cheap now, expensive to retrofit.

---

## 2. The grounding instruction — VERBATIM

**This block must appear in the system prompt of every generation route, unmodified.** Do not paraphrase, shorten, or "improve" it.

Store it once as an exported constant in `lib/ai/grounding.ts` and import it. Never inline a copy.

```
ABSOLUTE CONSTRAINT — GROUNDING:

You may use ONLY the facts provided in the CAREER PROFILE section below.
You must NEVER invent, estimate, infer, embellish, or add:
  - any number, quantity, percentage, duration, or metric
  - any certification, licence, qualification, or training
  - any employer, client, project, site, or location
  - any job title, date, or duration of employment
  - any system, standard, tool, or technology
  - any responsibility, achievement, or outcome

If a fact is not explicitly present in the CAREER PROFILE, it does not exist.
You may not add it, imply it, or hint at it.

You are rewriting HOW the user's real experience is described.
You are NOT changing WHAT that experience is.

If the target job description mentions a requirement the user's profile does
not support, you must NOT claim it. Omit it entirely. Do not use hedging
language to imply partial experience the user did not state.

Fabricating a plausible-sounding claim causes real harm: the user will be
asked about it in an interview and will be caught. Omission is always
correct. Invention is never acceptable.
```

---

## 3. Persona library

Personas are selected by `target_industry` on the Career Profile.

**MVP scope: curated, well-crafted personas for the highest-volume segments, plus a solid fallback.** This keeps the platform open to everyone — nobody is turned away — while keeping output quality high where volume actually is.

Store in `lib/ai/personas.ts` as a keyed map.

| Key | Persona |
|---|---|
| `engineering_technical` | "You are a senior Instrumentation & Control / Commissioning hiring manager with 15+ years reviewing candidates for Aramco- and ADNOC-standard megaprojects across the Gulf. You have screened thousands of CVs from Indian and expatriate engineers. You know exactly which phrasing signals real site experience and which signals someone who has only read about it." |
| `construction_site` | "You are a senior Construction Manager with 15+ years delivering Gulf infrastructure and building projects for tier-one contractors in KSA, UAE and Qatar. You have hired and rejected hundreds of site engineers, supervisors and QA/QC staff. You can tell within thirty seconds whether a CV describes real site delivery or generic duty statements." |
| `it_tech` | "You are a senior Engineering Manager hiring technology staff for Gulf enterprises and government digital programmes across UAE, KSA and Qatar. You have reviewed thousands of CVs from Indian technology professionals and know precisely how Gulf employers weigh delivery evidence, certifications and stack depth." |
| `generic_gulf_professional` | "You are a senior Gulf-market recruitment specialist with 15+ years placing professionals across sectors in Saudi Arabia, the UAE, Qatar, Oman, Kuwait and Bahrain. You understand exactly what Gulf employers look for in a CV, how Gulf ATS systems parse documents, and which framing gets a candidate shortlisted." |

**Fallback rule:** any `target_industry` without a dedicated persona uses `generic_gulf_professional`. Never fail, never turn a user away, never leave the persona empty.

Additional industry personas (nursing, hospitality, etc.) get added later based on what Library data shows is actually being requested. **Do not add them speculatively.**

---

## 4. Optimization levels

The level controls **framing intensity and JD-keyword alignment**. It **never** controls truthfulness.

| Level | Target JD match | Instruction fragment |
|---|---|---|
| `easy` | ~75–80% | "Apply light rewording. Preserve the user's own voice and sentence structure. Introduce target-role terminology only where it fits naturally over the existing phrasing." |
| `moderate` | ~80–90% | "Apply fuller reframing. Restructure sentences to lead with the outcomes and responsibilities most relevant to the target role. Adopt the target's terminology wherever the user's real experience genuinely supports it." |
| `high` | ~90–100% | "Apply maximum reframing and terminology alignment. Aggressively restructure emphasis so the most target-relevant aspects of the user's real experience lead every bullet. Adopt the job description's exact vocabulary wherever the user's real experience supports that vocabulary." |

### Rules

- The level applies **once, globally**, to the whole optimization run. **Not configurable per block.** This keeps the control simple for MVP.
- The grounding rule is **unaffected** by the level. What "High" changes is how aggressively the AI restructures emphasis and adopts the JD's exact terminology **for the user's real experience** — not whether new experience appears.
- **The UI must show a risk indicator at Moderate and High**, telling the user that a closer match raises the bar for what they need to explain confidently in an interview. The resume gets sharper; the user should walk in ready to defend every claim at the level they chose.

---

## 5. What gets optimized

| Block | Treatment |
|---|---|
| Professional Summary | **Rewritten** — user-selectable |
| Work description bullets, per company entry | **Rewritten** — user-selectable per entry |
| Skills & certifications | **Reordered by relevance, never reworded.** Automatic — not user-selectable |
| Everything else | **Never touched** |

Before generation the user chooses which blocks to optimize, or clicks one-click **"Optimize All"**.

**Not every entry needs rewriting for every target — a senior expert does not touch what is already strong.** The UI must make partial selection feel like expertise, not an incomplete job.

---

## 6. Prompt assembly order

`lib/ai/buildOptimizationPrompt.ts` assembles in exactly this order:

1. **Persona** — from `target_industry`
2. **Grounding block** — verbatim from `lib/ai/grounding.ts`
3. **Gulf CV format conventions** — from `target_country`
4. **Level instruction** — from §4
5. **CAREER PROFILE** — the only facts. Fixed fields marked read-only context; only selected blocks marked as rewritable
6. **TARGET** — job title, industry, country, company (if given)
7. **JOB DESCRIPTION** — if provided. Otherwise: "No job description was provided. Optimize against the target job title, industry and country conventions."
8. **OUTPUT FORMAT** — strict JSON schema

### Hard requirements

- The profile is injected as **structured, labelled data** — never a flattened blob.
- Fixed fields are provided as **read-only context** so the model can reference them accurately, with an explicit instruction that they must be reproduced verbatim if echoed and must never be rewritten.
- **Never inject the raw uploaded file.** The profile is the only source.
- **Never inject prior AI output as new source truth.** Regeneration reads the profile, not the last generation.

---

## 7. Post-generation validation — mandatory

Every generation response passes through `lib/ai/validateGrounding.ts` **before** it reaches the user.

The validator must:

1. **Reject fixed-field mutation.** Compare returned employer names, job titles, dates, locations, education entries and certifications against the profile. Any difference is a hard failure.
2. **Flag unsourced numerics.** Extract every number from generated text. Any number not present in the corresponding source entry is flagged for review.
3. **Verify skills reordering only.** The returned skills array must be a permutation of the profile's set — same members, no additions, no removals, no edits.
4. **Enforce the output schema.** Malformed JSON is a failure, not something to repair by guessing.

**On failure:** retry once with a corrective instruction. On second failure, return an error to the user and log the incident (IDs and failure reason only — never PII values). **Never show unvalidated output to a user.**

---

## 8. Phase 3 — cover letter *(do not build yet)*

Identical mechanism, different persona:

> "You are a senior recruiter writing a persuasive letter on the candidate's behalf to a Gulf employer."

Same Career Profile, same grounding rule, same validator. **No new data or mechanism required.** This is recorded here as confirmation that the Phase 1 architecture is correct — not as a licence to build it early.

---

## 9. Cost control

- Extraction and optimization are **one model call each**. Do not chain calls for a single user action.
- The full run (extraction + optimization) must stay well under ₹30 against a ₹499 price point.
- Every call is logged to `ai_usage_log` with user ID, route, token counts and cost — see `docs/ADMIN.md`. Free actions are rate-limited from day one.
