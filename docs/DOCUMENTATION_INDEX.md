# Documentation index — current only

**Scope:** `main` carries current documentation only. Historical design
campaigns, dated audit/QA/rollout reports and superseded design directions were
removed from `main` on **17 November 2026** and now live only on the
`archive/docs-history-pre-2026-11` branch. Retrieve any of them with
`git show archive/docs-history-pre-2026-11:<path>` — never copy one back into
`main`.

Use this page to find current instructions. Some linked directories contain
feature specifications, plans or evidence. The file's role and dated status
determine how to use it.

## Read order

1. [`../AGENTS.md`](../AGENTS.md) — working rules and current authorization
2. [`16_WORKING_AGREEMENT.md`](16_WORKING_AGREEMENT.md) — documents first, then code
3. [`CURRENT_STATE.md`](CURRENT_STATE.md) — what is actually implemented
4. [`PLATFORM_MASTER.md`](PLATFORM_MASTER.md) — plain-language platform explanation
5. [`PROGRESS.md`](PROGRESS.md) — the single task/progress surface
6. The relevant domain document below

The live product surface is defined by `app/` (53 pages, 51 API routes). Code and
a document that disagree means the document is wrong.

## Authority

| Document | Role |
|---|---|
| [`../AGENTS.md`](../AGENTS.md) | Canonical workflow, scope and authorization |
| [`00_START_HERE.md`](00_START_HERE.md) | Entry point |
| [`16_WORKING_AGREEMENT.md`](16_WORKING_AGREEMENT.md) | Documentation-first working method |
| [`CURRENT_STATE.md`](CURRENT_STATE.md) | Current implementation baseline |
| [`PLATFORM_MASTER.md`](PLATFORM_MASTER.md) | Current platform in plain language |
| [`PROGRESS.md`](PROGRESS.md) | Sole implementation/verification progress surface |
| [`PROJECT_PLAN.md`](PROJECT_PLAN.md) | Agreed direction |
| [`15_DECISION_LOG.md`](15_DECISION_LOG.md) | Dated founder decisions and rationale |
| [`14_OPEN_ITEMS.md`](14_OPEN_ITEMS.md) | Sole unresolved-proposal surface |

## Product and domain specifications

| Document | Covers |
|---|---|
| [`01_PRODUCT.md`](01_PRODUCT.md) | Product definition |
| [`02_PHILOSOPHY.md`](02_PHILOSOPHY.md) | The grounding rule and honesty rules |
| [`03_ARCHITECTURE.md`](03_ARCHITECTURE.md) | System architecture |
| [`04_DATA_MODEL.md`](04_DATA_MODEL.md) | Data model |
| [`05_SECURITY.md`](05_SECURITY.md) | Security and PII handling |
| [`06_AI_PIPELINE.md`](06_AI_PIPELINE.md) | AI pipeline |
| [`07_CAREER_PROFILE.md`](07_CAREER_PROFILE.md) | Career Profile |
| [`CAREER_PROFILE_BLOCKS.md`](CAREER_PROFILE_BLOCKS.md) | The 14-block profile contract |
| [`08_RESUME_ENGINE.md`](08_RESUME_ENGINE.md) | Resume engine |
| [`09_SCORING.md`](09_SCORING.md) | Scoring |
| [`10_PLANS_AND_PAYMENT.md`](10_PLANS_AND_PAYMENT.md) | Plans and payment |
| [`11_USER_JOURNEYS.md`](11_USER_JOURNEYS.md) | User journeys |
| [`13_ADMIN.md`](13_ADMIN.md) | Admin panel |
| [`17_OPTIMIZER_ENGINE.md`](17_OPTIMIZER_ENGINE.md) | Optimizer engine |
| [`18_OPTIMIZER_V3_LAB.md`](18_OPTIMIZER_V3_LAB.md) | Optimizer lab |
| [`19_LINKEDIN_OPTIMIZATION.md`](19_LINKEDIN_OPTIMIZATION.md) | LinkedIn optimization |
| [`20_PROFESSIONAL_PROFILES.md`](20_PROFESSIONAL_PROFILES.md) | Professional profiles |
| [`SHARED_CAREER_INTAKE.md`](SHARED_CAREER_INTAKE.md) | Shared career intake |
| [`PROFILE_INTAKE_SEPARATION.md`](PROFILE_INTAKE_SEPARATION.md) | Profile intake separation |
| [`RESUME_IMPORT_REVIEW.md`](RESUME_IMPORT_REVIEW.md) | Resume import |
| [`RECORDED_VOICE_INTERVIEW.md`](RECORDED_VOICE_INTERVIEW.md) | Recorded voice interview |
| [`EMPLOYER_MARQUEE.md`](EMPLOYER_MARQUEE.md) | Employer logo marquee |

## Design and content

| Document | Role |
|---|---|
| [`12_DESIGN_SYSTEM.md`](12_DESIGN_SYSTEM.md) | **The single current visual authority** |
| [`BRAND_SYSTEM.md`](BRAND_SYSTEM.md) | Historical brand decisions |
| [`TYPOGRAPHY_SYSTEM.md`](TYPOGRAPHY_SYSTEM.md) | Historical typography decisions and implementation references |
| [`TERMINOLOGY.md`](TERMINOLOGY.md) | Agreed product terminology |

## Operations

| Document | Role |
|---|---|
| [`SAAS_RELEASE_CHECKLIST.md`](SAAS_RELEASE_CHECKLIST.md) | Release gate |
| [`SUPABASE_AUTH_SETUP.md`](SUPABASE_AUTH_SETUP.md) | Auth configuration |
| [`DATA_INVENTORY_AND_RETENTION.md`](DATA_INVENTORY_AND_RETENTION.md) | Data inventory and retention |
| [`LEGAL_POLICIES.md`](LEGAL_POLICIES.md) | Legal policies |
| [`engineering/AI_SERVICE_EVALUATION.md`](engineering/AI_SERVICE_EVALUATION.md) | Measurable AI-service baseline protocol |

## Feature specifications and evidence

| Path | Covers |
|---|---|
| [`free-tools/`](free-tools/) | Free tools: country rules, field contracts, inventory, UI system, SEO and conversion |
| [`evidence/`](evidence/) | Verification evidence |
| [`plans/`](plans/) | Active plans |
| [`superpowers/`](superpowers/) | Development-practice material |

## Outside `docs/`

| Path | Role |
|---|---|
| [`../README.md`](../README.md) | Repository entry point |
| [`../design-reference/`](../design-reference/) | Original HTML mockups retained for provenance |
| [Archived design references](https://github.com/jaissatish-web/GCC-MENTOR/tree/86bfaa75e60db6ee7cf45b18fe049f932759b7d2/design-reference) | Career Studio, Soft Indigo, White Workspace and an earlier landing concept |
| [`../reference/README.md`](../reference/README.md) | Read-only donor code from an earlier build; plumbing patterns only, never prompts |
| [`../supabase/migrations/README.md`](../supabase/migrations/README.md) | Migration conventions |
| [`../public/landing/employers/SOURCES.md`](../public/landing/employers/SOURCES.md) | Employer logo provenance — keep |
| [`../public/landing/v2/ASSET_SOURCES.md`](../public/landing/v2/ASSET_SOURCES.md) | Landing asset provenance — keep |

## Adding documentation

Record new work in the relevant domain document and
[`15_DECISION_LOG.md`](15_DECISION_LOG.md). Do **not** add a new dated campaign
report, and do **not** create a second design direction. One current statement per
subject.

## Current feature review —18 November2026

[Career Profile Onboarding V4 verification](ONBOARDING_V4_VERIFICATION.md) records the approved date contract, affected consumers, local evidence and unreleased status for Issues#95/#96.
