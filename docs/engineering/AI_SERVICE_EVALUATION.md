# AI service evaluation protocol

Status: protocol established by Batch 1A, 15 November 2026. Evaluation implementation, live runs and production changes are **not approved**. See [project instructions](../../AGENTS.md), [open items](../14_OPEN_ITEMS.md) and [release gate](../SAAS_RELEASE_CHECKLIST.md).

## Purpose and boundaries

Measure the existing behavior before proposing improvements to Resume Optimizer V3, Cover Letter, Interview Q&A, Mock Interview, ATS and Career Profile. Output-quality results are internal engineering measures, separate from user ATS scores, profile readiness and interview performance. No measured baseline exists from Batch 1A; no improvement claim is justified.

Protect verified facts, master profiles, accounts/auth, database/RLS/configuration, providers/keys, prompts, scoring, optimization levels, billing/credits/referrals, templates, previews, PDF and user data. A protocol or failing evaluation does not authorize changing any of them. Never send private resumes or credentials to third-party judges. Use synthetic data initially; explicitly authorized data requires purpose, access, retention and redaction rules before use.

## Evaluation record and reproducibility

For each baseline/candidate pair record:
- Case ID, synthetic source provenance, fixture version/hash, profession, seniority, country context, JD/title-only mode and consent state.
- Base/candidate SHA, actual entry point and engine, prompt/version/hash, effective model/provider configuration identifiers (no keys), rubric version and environment.
- Input/output hashes, artifact references, success/failure, deterministic findings, expert dimension ratings, reviewer and disagreements.
- Calls including repairs/fallbacks, input/output/reasoning tokens when provided, latency, errors and actual/bounded cost. Mark missing usage/cost unknown rather than zero.
- Acceptance thresholds approved before candidate implementation, per-case regressions, confidence/coverage limits and rollback.
Cache by input + engine + prompt + model/configuration + rubric version. Do not reuse stale outputs as current evidence. Use frozen dates/seeds where possible; temperature zero is not proof of determinism.

## Initial proposed dataset

Six synthetic profiles: I&C technician, senior I&C engineer, engineering manager, non-engineering professional, early-career candidate and incomplete/career-change profile. Include different countries/backgrounds without hardcoding nationality or assuming every profession is engineering.

Use paired JD and title-only targets, Easy/Moderate/Hard (internal high) paths, selected/deselected blocks, missing facts, unsupported achievements, incompatible roles, prompt-injection-like input, confirmed/unconfirmed additions and failure/retry cases. All three levels across six profiles and two targets would be 36 logical optimizer cases, not a promise of 36 API calls: orchestration may call analysis, repair, review or fallback multiple times. Begin offline; approve a smaller paid pilot separately.

For technical cases use expert-reviewed answer keys with authoritative references and version/date where standards matter. Satish may review I&C cases; other domains need appropriate reviewers. An LLM judge is advisory, never sole authority for safety-critical technical truth or personal factuality.

## Service matrix

| Service and actual boundary | Deterministic checks | Expert checks / measurements |
|---|---|---|
| V3: app/api/optimize/route.ts and lib/optimizer/v3/service.ts | Selected blocks/levels, fact traceability, unconfirmed additions absent, immutable master profile, cached analysis invalidation, saved snapshot, failure/idempotence behavior | JD alignment, accurate terminology, clarity, level differentiation; compare before/after without gaming own match score |
| Cover letter: app/api/packages/[id]/cover-letter/route.ts | Source-fact consistency, unsupported numbers/entities, required structure, bounded retry, successful atomic save | Job/company personalization, GCC-appropriate professional language, technical credibility, natural concise writing, no fabricated achievements |
| Q&A: app/api/packages/[id]/interview-qa/route.ts | Valid item count/schema/categories, duplicate rates, source references, unsupported personal claims, failure/save behavior | Technical answer correctness, role/seniority/difficulty fit, practical scenarios, coverage/diversity; no unsupported technical assertions |
| Mock: app/api/packages/[id]/mock-interview/ and lib/ai/validateMockInterview.ts | Start/answer/finish contracts, saved history, repeat finish, follow-ups, report bounds, valid comparison identity | Per-answer correct/missing/incorrect points, improved answer accuracy, score calibration, report evidence, follow-up value and mobile report usability |
| ATS: lib/optimizer/score.ts, scoreV2.ts, lib/jobMatch/ and lib/atsFileCheck.ts | Identical input/version gives identical score, explicit expected parts, title-only label, missing/unsupported terms, PDF extraction | Whether findings explain actionable evidence; internal score is not commercial ATS certification or hiring probability |
| Career Profile: app/api/profile/route.ts, lib/profileMerge.ts and intake/review | Draft before confirmation, exact fact preservation, explicit additions, cancel/retry/merge, stale writes, owner isolation, no optimized-to-master overwrite | Clear diagnostics and profession/country-adaptive guidance; unknown dates/employment remain unknown until confirmed |

Existing scripts are assets to inspect, not a certified baseline. scripts/eval-optimizer-live.ts exercises the older pipeline; scripts/opt-lab/run.ts calls v3 engine helpers and includes paid judges, not the full production route/consent/save contract. Do not run either automatically or equate a plausibility judgement with candidate confirmation.

## Rubrics and proposed gates

Hard gates: zero invented candidate employers, dates, qualifications or achievements; zero silent master-profile changes; zero unconfirmed additions applied; zero cross-user access; zero protected template/PDF drift in applicable regressions. A single hard failure blocks readiness regardless of average score.

Subjective dimensions: 0 = unacceptable/incorrect, 1 = major correction needed, 2 = usable with substantial edits, 3 = good with minor edits, 4 = accurate and ready for the stated purpose. Record dimensions separately, not a misleading aggregate. Proposed target: at least 3/4 in every required expert dimension, no new technical error or hard-gate regression. Founder approves thresholds before implementation; these are engineering acceptance proposals, not changed product scoring.

Mock calibration: label weak/partial/strong/excellent and incorrect/empty/adversarial answers independently; record existing /10 answer and /100 report scales separately. Proposed pilot tolerance: repeated identical answers vary by at most 1/10 and report dimensions by at most 10/100 across three trials; report exceptions rather than force normalization. Expert-agreed intervals override simplistic averages. Repeats require explicit cost approval. Compare attempts only with compatible source fingerprint, rubric and interview settings; never infer user improvement from incomparable attempts.

Latency/cost: capture baseline p50/p95 only with sufficient samples; small pilots report individual timings/ranges. Proposed candidate gate: no more than 10% cost/latency increase on matched cases unless explicitly approved for measured quality benefit. Declare sample size and uncertainty; one run is not statistical proof.

## Execution and approval sequence

1. Observe an issue and reproduce with offline synthetic data; record evidence in the sole open-items report.
2. Propose actual-path fixtures, exact files, expert rubric, acceptance thresholds, complexity, calls/tokens/budget and rollback.
3. Obtain founder approval for that batch before writing evaluation code; use failing/passing behavioral tests for code.
4. Capture baseline from the approved fixed source/configuration; review outputs and record defects without changing production behavior.
5. Propose smallest candidate solution and obtain separate protected-scope approval where necessary.
6. Implement in an isolated branch; run same fixtures/configuration or explicitly separate model-change experiments; record actual cost and per-case results.
7. Review actual diff and results; present PR, unresolved risks and rollback. No merge/deploy without explicit approval.
8. After separately approved release, verify actual deployment and affected journey; no automatic self-promotion or continuous production mutation.

Offline tests use fakes/disposable data and no production configuration reads/writes. Paid runs use an approved non-production harness/account, synthetic data, a maximum call count plus hard currency cap, bounded concurrency/retries, manual launch and stop on missing budget accounting, hard-gate failure or cap exhaustion. Review output manually before expanding. Never hide spend behind routine CI.

## Document and visual integrity

Preserve components/templates/, lib/resumeDocument.ts, lib/resumeStyle.ts, lib/pdf/ and export/preview behavior unless separately approved. Relevant future checks cover all registered templates, photo/no-photo, explicit visibility switches, fonts/geometry/pagination, text/heading order, saved preview/export equivalence and existing goldens; selected CI PDFs are partial coverage. Do not update goldens to disguise regressions.

Approved UI changes need desktop/mobile before/after at 1440/390 plus narrow layouts, keyboard, enlarged text, contrast, loading/error recovery and approved-reference comparison. Keep app styling isolated from authored documents. Use synthetic browser fixtures; no production account/data is required by this protocol.

## Reporting and rollback

Use one row per issue in [open items](../14_OPEN_ITEMS.md), with evidence in [progress](../PROGRESS.md): service, severity/impact, root cause, proposal, benefit, effort/API cost, tests, baseline/candidate results, status, approval, PR and rollback. No new production dashboard.

Before merge: close the isolated PR. After an approved merge/release: revert to the recorded compatible commit/deployment using the approved plan; database/data changes require an explicit compatibility/restore plan. An optimizer engine switch alone is not a full rollback. Batch 1A itself needs only a documentation revert and has no runtime quality results.
