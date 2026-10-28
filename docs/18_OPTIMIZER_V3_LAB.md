# Optimizer v3 — test lab results (2026-10-02)

> **2026-10-22 status:** The “NOT wired” status below is historical and superseded: app/api/optimize/route.ts selects v3 by default, with OPTIMIZER_ENGINE=v2 rollback. Retain this as dated lab evidence, not a deployment status.

**Status: tested, NOT wired into `/api/optimize`.** The founder asked to test the
approved prompts on many kinds of CVs before deciding the next step.

## What v3 is

Founder-approved design (2026-10-02 conversation):

- **Only work data goes to the AI**: summary, jobs (title, employer, dates, location,
  bullets), skills, certifications, education. Never name, contact, nationality, date
  of birth, passport, visa or target country. One prompt for all Gulf countries.
- **Specialist persona from the user's own target title** ("senior recruiter and CV
  specialist for {title} roles in the Gulf job market").
- **Analysis call** (`lib/optimizer/v3/prompts.ts` ANALYSIS_SYSTEM): short ATS keywords,
  field match (same / related / different), every requirement in group
  **A** (shown) · **B** (same field, a related duty is shown — equipment, duties, soft
  skills) · **C** (not shown; always certificates, licences, education, years, named
  software and standards, other fields). Code re-checks every group
  (`lib/optimizer/v3/engine.ts` analyzeV3): literal matches, relevant quotes, years from
  dates, languages never assumed, soft skills -> summary.
- **Writing call**: Easy rewords only; **Moderate (default)** adds a new point per
  must-have B; High rewrites everything in the job's vocabulary and adds every B.
  Certificates, education, companies, titles, dates and personal details are never in
  the output. Every group-A keyword must appear in the job's exact spelling.
- **Checks**: the production truth checker on every rewritten bullet (a failing job keeps
  its own bullets); new points must carry a B requirement, no numbers, no C terms, no
  certificate wording, max 3 per job; C terms are removed from the summary.
- **Speed**: same model (deepseek-v4-flash), thinking off, fastest hosts first.

## How it was tested

`scripts/opt-lab/` — 15 fake profiles (3–5 roles, real-user size) and 20 realistic Gulf
adverts (`data/`, generated once and committed), 26 scenarios: 14 same field, 4 related,
4 different field, 4 title-only. Each CV scored three ways:

- **Our score**: the production match score (`lib/optimizer/score.ts`), qualifications included.
- **Independent ATS**: a Jobscan-style keyword match rate; its own prompt reads the
  advert and never sees our analysis.
- **Invented-claim audit**: any C requirement in the final CV that the profile never had.
- Plus a separate recruiter judge on whether each added point is realistic.

Run: `node --env-file=.env.local node_modules/sucrase/bin/sucrase-node scripts/opt-lab/run.ts v3`
(and `baseline`, `report`; `compare.ts` for today vs v3).

## Results (final run)

| Group | Our score: before -> Easy / Moderate / High | Independent ATS: before -> Easy / Moderate / High |
|---|---|---|
| Same field (14) | 44 -> 51 / 56 / 56 | 26 -> 32 / 41 / 42 |
| Related field (4) | 40 -> 44 / 49 / 50 | 17 -> 22 / 28 / 29 |
| Different field (4) | 27 -> 27 / 27 / 27 | 3 -> 4 / 4 / 5 |
| Title only (4) | 85 -> 92 / 93 / 94 | n/a |

- Field verdict right 25/26 · invented-claim audit **0** · recruiter judge **100%**
  realistic (66/66) · median **14 s** (analysis + Moderate), slowest 25 s.

**Today's optimizer vs v3, same 10 scenarios (Moderate):** time 112 s -> 17 s; our score
50 -> 51 (today) vs **59** (v3); independent ATS 25 -> 26 vs **39**; invented claims 0 / 0.
Today's optimizer failed outright on the developer CV (analysis gave up after 240 s).

Benchmark: Jobscan recommends a 75%+ match rate, notes many users succeed at 65%, and that
above 75% is often not possible without keyword stuffing.

## What the lab found and fixed in shared code (also live)

- `lib/optimizer/text.ts`: British "-ise" verbs were normalised by word length, so
  "liaised" and "liaise" did not match and a tense change threw away a whole job.
- `lib/ai/profileEntities.ts`: present-tense verbs and summary openers ("Coordinate…",
  "Proven…") at the start of a sentence were read as names copied from the advert.
- Tests: `scripts/verify-match-terms.ts`.

## Open

- 75–85% at Moderate is reached only when the candidate genuinely has most of what the
  advert asks (MEP 63–72, ICU 65–77); the average same-field CV stops near 56 because the
  remaining requirements are honest gaps (group C).
- Writing polish: some strong bullets barely change at Moderate; one new point read
  keyword-stuffed.
- (Done 2026-10-02, see Go-live.) First-time explainer, one-time agreement, field warning UI and wiring into
  `/api/optimize` — next phase, after founder review.

## Go-live (2026-10-02) — v3 is the production optimizer

Founder: "implement in the main branch and push… then check on the website."
Rollback without a code change: set `OPTIMIZER_ENGINE=v2` in Vercel.

**Flow**
1. Level screen (`/optimize/setup`) runs **one** analysis via `POST /api/optimize/check`
   (cached in `job_analyses`, key `sha256('v3:'+…)` — the column is exactly 64 chars):
   field match banner, "your CV today", the honest "ATS score up to" per level, and
   certificates/licences the job asks for that the profile lacks — **offered with their
   point gain, never written** ("I have one — add it to my profile" opens
   `/profile?open=sec_certifications`).
2. First time: explainer + one-time agreement (`career_profiles.optimizer_consent_at`,
   migration 061). The review page shows added material in yellow; no tick box.
3. After the agreement and one optimization: one click → finished CV page (`autoApplied`),
   no review step.
4. Build = the cached analysis + one writing call (~5–9 s of model time).

**Fixes from the end-to-end test**
- Cache never saved (`'v3:'+hash` was 67 chars) — every build re-ran the analysis.
- A rewrite of a real duty that picked up one job term was turned into a removable
  "added" line, taking the real duty with it and leaving it out of the score (Moderate
  showed 36 → 37). Now an **enhanced rewrite**: stays in the CV, only the added term is
  yellow (`match_report.added_terms`). A line that is mostly new words is still a new
  point under the strict rules (`ownShare` < 0.5).
- Lines with numbers the rewrite dropped ("a team of 25 technicians") are restored as
  the profile has them (lab: 1 lost number per level → 0).
- ", ensuring accuracy and completeness" fluff is cut in code (the model ignores the
  prompt rule) — only when the tail has no job keyword, no number and is not the
  profile's own words (16 of 214 lab bullets).
- "Target 75–85" is shown only when the profile can reach it; otherwise "Best for your
  profile: N".
- Build screen said "2–4 minutes"; now "under 30 seconds".

**Measured locally (MEP CV, Senior MEP Engineer advert)**: first optimization 16 s from
click to review page (was 75 s with the cache bug); 41 → 53 (55 with the 2 suggested
points), best possible 56; second optimization at High went straight to the CV page,
41 → 55. Different field (MEP → Finance Manager): "Outside your field", 27 at every
level. Tests: `scripts/verify-optimizer-v3.ts`.


## OPT-PRESELECT-001 — 28 October 2026 — approved, implementation pending
Founder requests job-dependent level recommendations and review before generation. Easy targets about +10 score points through existing-fact polishing; Moderate targets about +25 with individually confirmed relevant duties; Hard (stored enum high) targets 75–95% match where evidence supports it. These are goals, never forced score floors or guarantees. Preserve measured before/after scoring and honest ceilings.

Before Run: show current fit, recommendation and estimates; let users select summary, each company and skills ordering, and individually opt into relevant same-field suggestions. No added duty selected by default; server validates selections against current analysis, level and selected owner. Unselected sections retain original content. Confirmed duties are naturally drafted within their actual company; unsupported software/certificates/qualifications still require the canonical Career Profile editor. Preserve final full resume, original/generated comparison, edit/keep/undo/save/download logic.

Scope: setup page, job check/report, selected-block request/storage contract, v3 build and focused regressions. Existing JSON selected_blocks stores optional choices; no schema migration, auth/billing/readiness/template changes. Legacy packages without choices retain existing pending-suggestion behavior. Acceptance: goals/recommendation are data-dependent; Easy adds no claims; Moderate/Hard only incorporate explicit, valid choices; skills off preserves order; company/summary off preserves originals; score remains measured. Verify typecheck/lint/build/repository tests plus focused contract and UI checks.


OPT-PRESELECT-001 implemented and locally verified: job-check recommendations; Easy +10 / Moderate +25 / Hard75–95 goals with measured scores and honest ceilings; visible summary/company/skills ordering choices; evidence-linked, unchecked duty confirmations. Server revalidates owner, level, kind and evidence identity, incorporates only approved generated duties, and retains final editable/removable highlights. Existing packages without choices retain pending-suggestion behavior. No schema/auth/billing/readiness/template changes.
Verification: production build/typecheck/lint passed;83/83 repository checks passed, including real document/score assembly with a mocked writer, approvals/forgeries/empty selections/legacy behavior. Actual setup component browser fixture passed390/1440px, section and duty toggles, precise submission payload, Easy exclusion, failed-check retry and no horizontal overflow. Tests use fictional APIs and no live account or AI provider; natural-language fidelity and production deployment remain unverified. New preselection behavior targets default v3; rollback v2 remains historical. Publication pending.


## OPT-CLARITY-002 — 28 October 2026 — approved, implementation pending
Following official competitor-workflow research, founder authorizes clearer optimisation choices and provenance. Keep Easy/Moderate/Hard and existing +10/+25/75–95 goals, describe each by rewrite scope; each pre-run duty shows target requirement priority, why relevant, related profile evidence and actual company. Final review distinguishes original, rewritten, user-edited and explicitly confirmed new duties with text labels as well as colour; originals remain inspectable. Clarify that score is this platform’s estimate and does not guarantee employer ATS outcomes; no need to chase100.
Acceptance: no unconfirmed addition described as confirmed; actual confirmed additions visibly distinguish from pending ones; original text accessible; manual edit/remove/save and measured scoring unchanged. Scope setup and preview UI plus focused UI regression; no backend/prompt/scoring/schema/auth/billing/template changes. Verify build/type/lint, full regressions, mobile/desktop actual component fixture.

Prior OPT-PRESELECT-001 released in PR54/main765aedf; GitHub CI621 passed and Vercel dpl_3epXAUwLBUNbnDM8Dkf3Y4JHWhAx READY with production alias verified28 October2026. Live signed-in/provider run not performed.

OPT-CLARITY-002 implemented and locally verified: scope-based level descriptions, required/preferred priority and per-duty explanation with current company/evidence; original summary/responsibility disclosures; explicit original/rewritten/edited/confirmed-new/pending labels; corrected retained-company and skills-order wording. Existing selection, scores, generation, edit/remove/save handlers untouched. Build/typecheck/lint and83/83 regressions passed. Actual setup+preview components passed390/1440px with fictional APIs: scope/priority/evidence, select payload, Easy exclusion, retry, originals, manual summary edit, confirmed-duty removal and exact save payload. No live provider/account checks. Main publication and deployment pending required CI.


## OPT-JD-SCORE-003 / PROCESSING-CYBER-001 —28 October2026 — approved, implementation pending
Founder approves researched model: quality/readability25, target-role presentation10, applicable essential screening10, JD skills/tools30 + responsibilities20 + supporting/domain keywords5. No duplicate category credit; required outweigh preferred, no level bonus, unknown/unmet mandatory requirements visible independently of high totals. Reuse verifiable quality checks, recheck generated wording, do not claim employer parser validation without export evidence. Preserve historical score versions; new jobs use versioned formula and preview/edit/save consistently.
During optimisation, missing skills/tools/keywords are selectable for THIS resume only; no mandatory Career Profile edit. Explicit confirmation never assumed, company placement requires separate real-experience/owner confirmation, named software/standards not inferred from related duties. Persist application-scoped choices in existing package JSON; master profile and other resumes unchanged. Mandatory fixed facts cannot be invented; unsupported certificate/licence remains a screening gap, with manual correction in this resume review where possible. Final result explains earned components and required skills/responsibility coverage and unresolved screening. Goals remain +10/+25/75–95 evidence-limited.
Shared processing visual: lighter cyan/ice/lilac cyber palette against dark theme, preserve rings/orbits and quotations, stable visual/step/quote regions with controlled overflow. Show green ticks for reported complete steps, current stage active, future pending; existing timer-paced progress must not falsely claim backend stages completed. Preserve accessibility/reduced-motion, service behaviour, errors/retries.
Scope: versioned optimizer scoring/report/render/save contracts, selected package skills/keywords, setup/result screens, shared Processing components/styles, bounded progress consumers if needed and focused deterministic/browser tests. No schema/auth/billing/readiness/other service score changes, no template typography changes. Verify required checks, before/after/edit parity, nonmutation, version compatibility and mobile/desktop stable processing. Publication requires main-protection CI.

OPT-JD-SCORE-003 / PROCESSING-CYBER-001 implemented and locally verified. New versioned25/10/10/55 scoring, transparent applicable-category scaling, actual coverage and visible screening; resume-only confirmed skills never reach master Profile or writer company evidence. Bounded grammar review and real Word round-trip supply exact-version quality evidence; manual edits invalidate evidence and show pending checks rather than retain stale marks. UI shows earned points, coverage and unresolved screening in setup/preview/result. Save preserves scoped skills and measured-score parity; historical version unchanged.
Shared orbit now ice/cyan/lilac with circuit detail, fixed layout/step weights and reserved tallest-note space. All shared consumers inherit visuals; optimizer request boundaries produce true green ticks. Other single-request services show workflow focus without claiming timer-based completion; explicit completion props support real events. Quotes/reduced-motion preserved.
Verification: final production build/typecheck/lint passed;85/85 regression scripts passed, plus actual component browser fixtures320/1440 stable processing and390/1440 optimizer selection/edit/save. Root inspected mobile processing screenshot. Tests cover exact scoped skill IDs/nonmutation, forged/Easy approvals, negative claims, duplicate keywords, mandatory gaps, old versions, actual DOCX parsing, provider-failure/truncation handling and source-bound grammar issue excerpts. No live account or AI-provider walkthrough; PDF readability not certified by the Word check. Publication pending protected-branch CI.
