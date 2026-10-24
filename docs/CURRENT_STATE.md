# Current implementation baseline

Source inspected: main `d5455475d1ceac6ce735850cc3926ebf3804bf90`, 22 October 2026; application code is unchanged from `81fdcf1`. This is a source-based handoff, not a new production certification. Consult the actual code when extending a domain; older reports retain only their dated evidence.

| Area | Current source behavior | Evidence / detail |
|---|---|---|
| Stack | Next.js 15.5, React 19, TypeScript, Tailwind 3; Supabase; Vercel | `package.json`, `docs/03_ARCHITECTURE.md` |
| Public intake | One extraction creates a draft reused for two scorecards and first-profile review; PDF 4MB, DOCX 2MB, pasted text 20,000 characters | `app/api/career-intake/route.ts`, `lib/careerIntake/shared.ts`, `SHARED_CAREER_INTAKE.md` |
| Signup handoff | First-profile claim is authenticated; returning-user import uses existing merge/replace/keep protection | `app/api/career-intake/claim/route.ts`, `app/api/profile/pending-draft/route.ts` |
| Profile Readiness | Career-data completeness; employment history/experienced stage selects contact 25, education 20, skills 20, employment 35; otherwise 25/35/30/10 (background) | `lib/readiness.ts`, `SHARED_CAREER_INTAKE.md` |
| Gulf preparation | Applicable awareness checklist. Score = prepared/applicable scored items ×100, rounded. Any unknown checklist item makes assessment provisional; age/location/history/service usage give no points | `lib/gulfReadiness/preparation.ts`, `lib/gulfReadiness/fromProfile.ts` |
| Passport guidance | Future recorded expiry is treated as prepared by this engine; it does not establish destination-specific minimum validity or work permission | `lib/gulfReadiness/preparation.ts` |
| Countries | Six GCC countries plus generic Gulf; unknown is allowed | `COUNTRY_OPTIONS` in `lib/careerIntake/shared.ts` |
| Job Match | Separate job-specific assessment; do not equate it with profile completeness or Gulf preparation | `lib/jobMatch/`, `lib/optimizer/` |
| Optimizer | v3 is the default; `OPTIMIZER_ENGINE=v2` selects rollback implementation. v3 is connected, not merely a lab | `app/api/optimize/route.ts`, `lib/optimizer/v3/` |
| Base resume | Dedicated Career Profile resume route exists alongside optimized job packages | `app/api/packages/career-profile/route.ts`, `lib/careerProfileResume.ts` |
| Preparation services | Cover letters, Q&A, text mock and recorded-voice code exist. Voice availability depends on server/provider/storage setup | `app/api/packages/[id]/`, `RECORDED_VOICE_INTERVIEW.md` |
| Professional profiles | LinkedIn and NaukriGulf import/generation services exist; users apply outputs externally themselves | `app/api/linkedin/`, `app/api/naukrigulf/`, `19_LINKEDIN_OPTIMIZATION.md`, `20_PROFESSIONAL_PROFILES.md` |
| Typography | `app/typography.css` is the current shared application type configuration; document boundaries preserve resume fonts | `app/globals.css`, `TYPOGRAPHY_SYSTEM.md` |
| Brand/layout | Shared UI tokens plus mobile/desktop styles are imported. Current brand specification is emerald-led | `app/ui-system.css`, `app/mobile-design.css`, `app/desktop-design.css`, `BRAND_SYSTEM.md` |
| Access and quotas | Auth and abuse controls (pause, rate, concurrency) are active. Commercial credit/bundle helpers exist but their consumption helpers have no generation-route consumers in this review; do not describe paid credits as enforced. | `lib/ai/serviceGuard.ts`, `lib/entitlements.ts`, individual API routes |
| Database | Numbered migrations are repository evidence, not proof they were applied to the live database. Old table counts/catalogue claims are dated | `supabase/migrations/`, `04_DATA_MODEL.md` |

## Known limits and next investigation
- Resume upload “failed to fetch” was reported by the founder. No reproduction, root cause or production fix was verified in this documentation session.
- New intake provider quality, production signup, email delivery and cross-device persistence still need configured live checks as stated in `SHARED_CAREER_INTAKE.md`.
- No new source-wide functional, security, billing, database or visual certification was performed here. Earlier test reports apply only to their named commits/environments.
- The canonical guide resolves entry-point drift. Domain details not rechecked in this session remain explicitly subject to source verification; do not claim every historical statement has been independently retested.

For the founder-readable complete service flow and current limits, read [PLATFORM_MASTER.md](PLATFORM_MASTER.md).

## Career Profile update — PROFILE-014, 22 October 2026
PR #26 implements the [14-block contract](CAREER_PROFILE_BLOCKS.md) using existing parent/child/category storage. All 14 blocks are discoverable; specialist sections are optional and custom sections remain. Original category identities/headings/order/visibility and private preparation data are preserved. Extraction instructions cover specialist information and preserve untied responsibilities separately rather than guessing an employer. WhatsApp controls use existing number storage; no separate not-used declaration is persisted. Client/project/employment/study-status details remain descriptive/category text. No schema migration, scoring arithmetic or other service rewrite. Local typecheck/lint/build and 76 deterministic/disposable-database checks passed; synthetic category interactions passed at 390/1440px. PR #26 is the authoritative release/check/merge record; live authenticated save and live model fidelity are not certified by these tests.

## Clear Path rollout — 24 October 2026, not yet on main
Internal UI implementation is retained in PR31, application commit5678495; source scope and local test evidence in CLEAR_PATH_ROLLOUT.md. Required CI449 fails existing Zod/Puppeteer dependency audit; no merge/deployment. Production still serves main b319aab. Do not describe Clear Path as live.

## PR31 dependency blocker follow-up — 24 October2026
The old required audit failure is resolved in source by dependency commit26b4d48. Local production audit0; clean install/typecheck/lint/build/77 checks and198 PDF fixtures passed with bundled Chromium. Final CI and main merge/deployment remain pending; Clear Path is not yet claimed live. See05_SECURITY.md.


## Career Studio presentation — 24 October2026
PR33 reconstructs the founder-approved internal Home/Profile/resume/interview/report layout. Existing service APIs, storage, auth, score engines, prompts and resume formatting are protected. Locally built source and fictional mobile/desktop interactions are verified; required CI/main merge/Vercel alias status must be read from the release record. See CAREER_STUDIO.md and root design-qa.md. Do not infer live authenticated persistence from these fixtures.
