# OPTIMIZER ENGINE — how a Career Profile becomes a CV for one job

**Built 2026-09-17.** This is the service the rest of the platform depends on:
cover letters, interview Q&A and the mock interview all start from the CV it
produces. This document is the reference for how it works and why.

Code: `lib/optimizer/*`, `app/api/optimize/route.ts`,
`app/api/optimize/analyze/route.ts`, `components/optimizer/*`.
Migration: `056_optimizer_engine.sql`.

---

## 1. The promise, and the one rule that makes it possible

**Every user, in any profession, gets a CV written for the job they typed or
pasted, and every word in it can be defended in an interview.**

The rule: **code decides what is true and what matters. The model only writes.**

Before this engine, the model got the profile and the advert and worked out for
itself what to emphasise. Results varied from run to run, strong matches were
missed, and nothing measured whether the CV had actually been targeted. Now:

| Decision | Made by |
|---|---|
| What the job asks for | Model (extraction, transcribe-only), cached |
| Where the profile proves each requirement | Code (literal match) + model bridge, **verified by a verbatim quote in code** |
| Which employer terms each block may use, keep, and lead with | Code (tailoring plan) |
| The wording | Model, one section at a time |
| Whether the wording is grounded | Code (grounding validator) |
| Whether the wording is good and delivered its level | Code (quality gate) |
| Whether any claim is overstated in meaning | Model reviewer, **only findings that quote the rewrite verbatim count** |
| The score, before and after | Code, deterministic |

---

## 2. The user journey

```
/optimize/target      job title (+ industry) and, optionally, the job advert
        │
/optimize/setup       ── POST /api/optimize/analyze ──►  MATCH REPORT (before anything is built)
                       • score now, with the part breakdown
                       • "can reach N using only your real experience" (honest maximum)
                       • already on your CV ✓ / in your profile, not said yet ↑ / not in your profile
                       • "Raise your score: do you have any of these?" — tick genuine skills →
                         POST /api/optimize/confirm-skills adds them to the Career Profile → re-check
                       • choose summary + roles; each level shows its projected score (≈)
        │  POST /api/optimize  (Phase A: creates the package, attaches the analysis; no model call)
/optimize/generate    POST /api/optimize {packageId}  (Phase B: the pipeline, §3)
        │
/package/[id]         BEFORE → AFTER score card, part changes, "why this CV fits",
                      roles that kept original wording (and why), gaps still open
/optimize/preview     every change, editable; each saved edit is RE-SCORED (PATCH)
```

**Two modes**, derived from whether an advert was pasted, never stored:

- `job_description` — requirements are the advert's own. The score is a **job match**.
- `target_title_only` — requirements are an **estimate** of what adverts for that
  title usually ask for. The UI labels it *Role alignment · estimate* and says so.
  Estimated requirements may rank and score. They are never written, and the
  validator treats them as import risks (§4).

A failed or slow analysis never blocks building. The CV still builds, without a
plan or a score.

---

## 3. The pipeline (`lib/optimizer/pipeline.ts`)

```
analysis (cached)  ─► evidence map ─► tailoring plan
                                          │
             ┌────────────────────────────┴───────────────────────────┐
     summary call (also skill order)      role calls, 3 roles each, in parallel
             └────────────────────────────┬───────────────────────────┘
                     grounding validator + quality gate   (code)
                                          │
                        fact-check review (model, quotes verified)
                                          │
                 ONE repair round, ONLY for blocks with problems
                                          │
            best valid version per block — else the candidate's own text
                                          │
                     score guard: the match score never goes down
                                          │
        optimized_content · skills_order · document_snapshot · match_report
```

**Why sections.** One call for the whole resume was the slowest call in the product,
the one most often cut off at the token budget, and all-or-nothing. Sections run in
parallel, a failure stays local, and a repair rewrites only what failed. Cost is about
25% more input tokens, which the founder accepted for quality (2026-09-17).

**Time.** The route gives itself 280s inside Vercel's 300s ceiling. The review starts
only with at least 45s left, and a repair round only with at least 100s left. A block
that could not be re-reviewed after a review flag keeps the original text.

**Model calls per build**, typically: summary 1 + roles ⌈n/3⌉ + review 1. A repair round
runs only for blocks that still fail after autofix, and the summary gets one extra attempt
when time allows. Analysis adds 1–2 calls, once per job, cached. Measured on the live
evaluation (DeepSeek V4 Flash via OpenRouter): 3–6 calls and 30–165s per build.

**Config keys** (set per key in `/admin/ai-provider`; each falls back to `default`):

| Key | Used for |
|---|---|
| `job_description` | Advert → requirements and keywords |
| `optimization_analysis` | Title-mode estimate, and the evidence bridge |
| `optimization` | Section writing, and repairs |
| `optimization_review` | Fact-check review |

The `deepseek` provider calls DeepSeek's own API (`https://api.deepseek.com`, OpenAI-compatible).
`openrouter` remains available for any model.

---

## 4. Truthfulness — every layer, and what it catches

| Layer | Where | Catches |
|---|---|---|
| Grounding instruction | `lib/ai/grounding.ts` (unchanged) | Sets the rules for every call |
| Trust-labelled prompt blocks | `buildOptimizationPrompt.ts` | An employer's wish list arriving as evidence |
| **Tailoring plan (BLOCK 4B)** | `plan.ts` | Lists allowed terms per block with evidence quotes; lists gaps as **FORBIDDEN** |
| **Bridge verification** | `evidence.ts` `verifyBridges` + `bridgeIsPlausible` | Any "equivalence" whose quote is not verbatim in that exact role is dropped. The quote must also contain **every distinctive word** of the requirement (same word family, degree abbreviations expanded) or spell out its acronym. Graded requirements ("advanced Excel") and soft skills are never bridged. Only the spelling the quote proves is approved |
| **Same-sentence evidence** | `evidence.ts` `sameSentenceBridges` | Model-free: all words of a requirement inside one sentence of the candidate's own text ("Filed quarterly UAE VAT returns" → "VAT return filing") |
| Grounding validator | `validateGrounding.ts` | (see next row) |
| ↳ word-coverage support | `validateGrounding.ts` | A capitalised phrase built only from words already in scope ("ICU Registered Nurse" from "Registered nurse" + "Staff Nurse - ICU") is not an import. The scope is the role plus profile lists for a bullet, and the whole profile for the summary |
| ↳ checks | `validateGrounding.ts` | Invented numbers, entities imported from the advert, cross-role leaks, fixed fields. **Title mode passes the estimated requirements as import text**, so a "typical" term is a hard failure |
| **Allow-list** | `validateGrounding` `approvedTerms` | A verified bridge term passes, **only in the role that proves it** |
| **Quality gate** | `qualityGate.ts` | Hard: hype words the profile never uses; grading words ("proven", "extensive", "proficient", "hands-on", "consistently"…) the profile never uses; unstated-outcome tails (", ensuring…", " to maintain accurate…"); authority verbs ("led", "managed", "oversaw"…) with no authority in the source or role title; any gap term. Soft: a rewrite that loses an original bullet's content (dropped fact), present-tense openers (every role is written in the past tense), "Label:" prefixes, first person, bullet length, duplicates, dropped employer terms, coverage below the level, summary length, easy changing the bullet count, condensed-role limits |
| **Autofix by removal** | `autofix.ts` | Before a model repair: cut the sentence (summary) or trailing clause (bullet) that carries the offending phrase, re-validate everything, and use the result only if it is clean. It can only shorten text. Unreviewed results are reviewed |
| **Fact-check review** | `review.ts` | Meaning-level overstatement: "assisted" → "delivered", team result → personal result. Issues without a verbatim quote are discarded |
| Per-block fallback | `pipeline.ts` | A block that cannot be proven keeps the candidate's own words, and the screens say so |
| **Score guard** | `pipeline.ts` | A build that would lower the match reverts the most harmful block until it does not |

Everything logged is codes and counts only, never content (`docs/RULES.md` §3).

---

## 5. The match score (`lib/optimizer/score.ts`)

**Deterministic, same function in the browser and on the server, computed on the
rendered resume document**, not on the profile. The profile-based Job Match
(`09_SCORING.md` §2) cannot show a before and after, because optimization changes
none of its inputs.

| Part | Weight | Measures |
|---|---|---|
| Keywords & skills | 45 | Each requirement: **1** as the exact phrase in summary or experience, **0.8** with all its words in one sentence in any order or word form, **0.6** only listed in skills or additional info, **0** absent. "A or B" requirements are satisfied by either option. Certifications count 1 in the certifications section, and degrees count 1 in education. Must-have = 3, nice = 1, soft skills × 0.5. Stems, aliases and derived acronyms match. Repeating a term adds nothing |
| Summary alignment | 10 | Share of the heaviest 6 requirements named in the summary; length 25–120 words |
| Job title match | 10 | Headline carries the target title (50) + best overlap with a held role title (50) |
| ATS readability | 10 | Email, phone, summary, skills, experience present; ≥2 bullets per role; bullets 6–40 words; no first person |
| Qualifications | 25 | Existing deterministic Job Match categories (years, education, certifications, GCC experience, licence). **Not applicable in title mode**, where its weight is redistributed |

- **Honest maximum**: the score when every requirement the profile supports is placed in
  a selected block. A gap is never counted.
- **Projection per level**: `before + (max − before) ×` 0.5 / 0.85 / 1.0 for easy / moderate / high.
  The quality gate's coverage targets (§6) are what make those factors real.
- Bands: ≥75 strong · ≥55 fair · otherwise needs work.
- UI copy always states it measures match to the requirements, **not a prediction of being hired**.

---

## 6. Levels are contracts, not moods

| | Easy | Moderate | High |
|---|---|---|---|
| Sentence structure, bullet order and count | Kept | Rewritten outcome-first, ordered by relevance | Fully restructured |
| USE terms placed (per role) | ≥ 50% | ≥ 80% | 100% |
| Summary anchors placed | ≥ ⅓ | ≥ ½ | ≥ ⅔ |
| Unrelated older roles | Full | Full | At most 3 strongest bullets (the role itself is never removed) |
| Grounding | Identical at every level | | |

Soft misses trigger a repair. The better version wins.

---

## 7. Data

- `job_analyses` (migration 056): one row per (user, input hash) with requirements,
  verified bridges and a profile fingerprint. **Service-role only.** Purged 30 days
  after creation by `purge_expired_operational_data()`. Bridges are recomputed whenever
  the profile's evidence text changes.
- `packages.match_report` (migration 056): `lib/optimizer/types.ts` `MatchReport`.
  Server-written only. It is not in the authenticated column UPDATE grant. PATCH
  re-scores `after` on every text edit and sets `after_edited`.
- `packages.structured_job` is still written, for Job Match consumers.

---

## 8. Verification

| Check | Command | Needs |
|---|---|---|
| Engine suite (matching, evidence, bridge plausibility, score, plan, gate, autofix, validator allow-list and word coverage, review parsing, pipeline with scripted model) | `npm test` (`verify-optimizer-engine.ts`) | nothing |
| DB security incl. 056 (RLS, grants, uniqueness, purge) | `npm test` (`verify-db-security.mjs`) | nothing |
| Existing grounding + skills-order suites | `npm test` | nothing |
| **Live evaluation across professions** | `node --env-file=.env.local node_modules/sucrase/bin/sucrase-node scripts/eval-optimizer-live.ts [easy\|moderate\|high] [case…]` | configured AI provider; **spends real calls** |

The live evaluation independently re-checks every saved output: grounding, hard
quality issues, gap terms, and score direction. It writes the full before/after text to
`tmp/optimizer-eval/` for a human read. Add a profession by adding a case to
`scripts/fixtures/optimizerEvalCases.ts`.

---

## 8b. What the live evaluation taught (2026-09-17, four rounds)

Each round ran 6 professions (ICU nurse, accountant, developer, MEP engineer by title,
key account manager by title, civil graduate). Every round passed every automatic safety
check. Quality problems found and fixed between rounds, in order:

1. Model bridges were far too loose ("CRM" ← "Key account management"). Fixed with the
   every-distinctive-word rule, which had the most effect: fallbacks fell from 7 blocks to 1.
2. AI filler (", ensuring accuracy and compliance") was not caught. Unstated-outcome tails are now hard.
3. Past roles were rewritten in the present tense. Past tense is now the rule, with a soft check.
4. Summaries were thrown away over one phrase. Autofix now cuts it; the summary also gets one extra attempt.
5. The validator flagged the candidate's own words recombined ("ICU Registered Nurse").
   Word-coverage support was added, with a test that a JD-only licence still fails.
6. "Accounting or Finance" was split into two requirements. "Either/or" alternatives were added.
7. A High build merged away "Cared for ventilated patients", and a sales CV buried its only
   quantified result. Added a soft dropped-fact check and a "quantified result first" ordering rule.

## 8c. Robustness against real model output (2026-09-17, live I&C package)

- **Key names are normalised before validation.** `bullets`, `rewritten_bullets` and
  `optimized_bullets` all become `generated_bullets`, and `was_optimized` defaults to true
  for the section's own roles. Blocks for other roles are dropped, and a truncated or
  re-cased id resolves to the section's role when unambiguous.
- Role sections show roles outside the section as title, company and dates only, which
  cuts cross-role leaks and prompt size.
- A section call stalls out after 90s and is retried once. Roles still missing after the
  repair round are asked for one at a time. The summary gets up to two extra attempts.
- Bracketed acronyms in requirements become alternatives. "&" abbreviations match.
  Hyphenated compounds must be intact in evidence and in-sentence matching.
- Model choice, measured on the same 9-role profile: `deepseek-v4-flash` rewrote 8 of 9 roles
  in 195s. `deepseek-v4-pro` rewrote 1 of 9 in 284s at about 15× the price. Keep Flash for
  `optimization`.

## 9. Known limits, stated plainly

- **The score cannot be raised past the honest maximum.** A strong profile against a
  demanding advert may gain only a few points. The way up is the user confirming
  requirements they genuinely have, never the product claiming them.

- Matching is lexical plus verified bridges. A real equivalence the bridge model misses
  shows as a gap. That costs points, never truth.
- The authority-verb guard works on words. "Coordinated" → "directed" is caught by the
  review, not the gate.
- Title-mode requirements are an estimate. The UI says so, and the score is labelled
  *Role alignment*.
- The score is this product's measure, not any specific ATS vendor's.
