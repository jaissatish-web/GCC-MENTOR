## Career Profile consolidation — 25 October 2026

SINGLE-EDITOR-001 is implemented and locally verified, release pending. Career Profile summary/reports are read-only; Edit Career Profile opens the sole full editor. All14 logical blocks, resume-import review, photo and resume visibility share that editor and one Cancel/Save changes bar. Dashboard, readiness, settings, optimizer skill/certificate gaps and preview photo controls link into it. Imported facts require acknowledgement and permit explicit deferral of missing information; malformed supplied values require correction. Photo requests occur during Save, after the existing profile PUT; errors distinguish any saved details from a failed photo. Existing backend APIs/schema/scoring/auth/templates are unchanged. See [CAREER_PROFILE_BLOCKS.md](CAREER_PROFILE_BLOCKS.md) and [PROGRESS.md](PROGRESS.md) for current evidence and release status; older editor descriptions below are historical.

# GCC Mentor — how the current platform works

Updated 22 October 2026. Owner: Satish. This is the founder-readable guide to the application currently on main. Read it with [PROJECT_PLAN.md](PROJECT_PLAN.md), [CURRENT_STATE.md](CURRENT_STATE.md) and [PROGRESS.md](PROGRESS.md).

**Evidence:** source review of main `d5455475d1ceac6ce735850cc3926ebf3804bf90`; its application code is unchanged from `81fdcf1303a5c9c39d8fe04a621e70cc6a9fbfeb`. This guide updates understanding and documents only. It does not change the application, approve an old branch, certify the live database or claim every live service was retested.

## 1. The platform in plain language

The Career Profile is the user's central set of facts. A resume upload helps fill it; it is not a separate permanent truth source for every service. The user reviews and corrects captured information before creating the first saved profile.

That profile supports two resume paths: a base Profile Resume showing the user's existing information, and separate job-specific resumes created through Resume Optimizer. The selected resume can then support a cover letter, interview Q&A and mock interview practice. LinkedIn and NaukriGulf preparation are additional services using the Career Profile and, when selected, reviewed imported external-profile content.

The application runs on Next.js 15.5, React 19, TypeScript and Tailwind 3. Supabase provides authentication, database and storage. Vercel hosts the application. The founder manages AI configuration through the admin interface. Source: `package.json`, `app/`, `lib/`.

## 2. The user journey

| Step | What the user does | What the platform does |
|---|---|---|
| Enter | Upload PDF/DOCX, paste resume text, or use manual entry | Reads resume text and builds a structured draft; manual entry avoids extraction |
| Clarify | Confirm unclear/missing details | Reuses known facts, asks for preparation context and supports all six GCC destinations or open-to-all |
| Understand | See scores and useful gaps | Calculates Profile Readiness and Gulf preparation separately; public detail is limited |
| Sign up | Create/sign into an account | Carries the first-profile guest draft forward without another AI extraction |
| Review | Correct and explicitly confirm the reading | Saves the Career Profile through the existing review/save path |
| Prepare a CV | Choose base resume or tailor for a job | Renders current profile facts, or creates a separate job package and optimized document |
| Apply/prepare | Create letter, Q&A, interview attempts or external-profile content | Uses the chosen source and saves outputs/history under the user's account |
| Improve | Review feedback and fill missing facts | Recalculates readiness from current facts and shows valid interview progress comparisons |

Public intake starts at `/gulf-readiness-score`, using `/api/career-intake`. Guest facts stay in tab-scoped browser session storage before signup; the configured AI provider processes submitted resume content. A server-side anonymous attempt counter still exists. The first-profile claim is authenticated and stores a pending draft, not an immediately approved Career Profile. Returning users with an existing named profile are directed to the existing import path so the new reading does not silently overwrite saved facts or bypass import limits.

Sources: `app/gulf-readiness-score/page.tsx`, `app/api/career-intake/route.ts`, `app/api/career-intake/claim/route.ts`, `app/onboarding/report/page.tsx`, `app/profile/page.tsx`, [SHARED_CAREER_INTAKE.md](SHARED_CAREER_INTAKE.md).

## 3. Three different assessments

These answer different questions and must not be presented as one interchangeable score.

| Assessment | Question it answers | Main source |
|---|---|---|
| Profile Readiness | Have we captured usable career information? | `lib/readiness.ts` |
| Gulf preparation | Which basic preparation details are recorded or need attention? | `lib/gulfReadiness/preparation.ts` |
| Job Match / ATS matching | How does this candidate's evidence relate to this particular job or preparation target? | `lib/jobMatch/`, `lib/optimizer/` |

### Profile Readiness: sum of completed career-data points

| Category | Employment history present or experienced stage declared | No employment history / early career |
|---|---:|---:|
| Contact and current location | 25 | 25 |
| Education or training | 20 | 35 |
| Skills | 20 | 30 |
| Employment details and responsibilities | 35 | — |
| Background / professional summary | — | 10 |
| Total | 100 | 100 |

The contact group splits into name 7, email 6, phone 6 and current location 6. Email/phone use validity checks; non-empty placeholders are not automatically valid facts. Education can be satisfied by a recorded degree/training entry or an explicit no-formal-qualification declaration. Employment completion checks dates, supplied employer/title and substantive responsibilities/highlights. This is a record-completeness score, not a judgement of the person's career value. Visa status, optional certificates, target employer and purchases do not add points.

### Gulf preparation: prepared items divided by applicable scored items

`score = round(prepared applicable scored items / all applicable scored items × 100)`

Each applicable scored check has equal value. Unknown scored items remain in the denominator but are labelled unconfirmed, not established failures. Any unknown checklist detail, including unscored context, makes the overall assessment provisional.

| Check | Current treatment |
|---|---|
| Qualification/training | Scored when applicable; no formal qualification can be context, with attention for some regulated/professional role names |
| Passport and expiry | Scored; a parseable future expiry is treated as prepared; absent/in-progress/expired needs attention or confirmation |
| Visa/residency situation | Scored for a user currently in the Gulf; not applicable for a confirmed user outside the Gulf |
| Joining availability | Scored for a recorded answer; longer notice does not reduce readiness |
| Professional registration or driving licence | Scored only when the current role/country heuristic identifies it as relevant |
| Resume preparation | Scored when career facts such as employment, education or skills are available |
| Profession, present location, Gulf work history, country choice | Context used to select relevant guidance; these facts do not earn points |
| Date of birth | Recorded privately/optionally for context; age earns no points |
| Resume improvement / buying services | Guidance/context; using the platform earns no points |

**Limits of this current calculation:** it checks recorded awareness, not documents or actual legal eligibility. A future passport expiry does not establish a country's minimum remaining-validity rule. Professional registration is identified by a basic role/country heuristic, not a complete current legal catalogue. Country choice and age do not make one candidate more valuable than another. The current assessment version returned by this path is `4.0`.

### Job matching

Job Match belongs to one target, rather than the whole Career Profile. Optimizer v3 prepares analysis and before/after match reports. A real pasted job description and a generated typical advert are different evidence sources; the UI/documentation must preserve that distinction. Resume extraction and semantic analysis can use paid model calls even when the arithmetic score itself is deterministic. Do not describe the whole upload/intake process as having zero AI cost.

## 4. Career Profile and resume library

The saved Career Profile contains identity/contact facts, employment, education, skills, certificates, additional information and resume visibility preferences. The editor has overview, details, completeness, Gulf readiness and settings views. Current save validation requires name, email and phone. An employment row needs employer, role and a valid start date. The profile save is a full-object operation; future callers must not assume an arbitrary partial object is safe.

| Resume type | Meaning | What later Career Profile edits do |
|---|---|---|
| Profile Resume · Not optimized | One base resume per user, identified by `tier='free'`, built from current saved profile facts | Future base-resume rendering uses the updated profile |
| Optimized resume | A separate job package with target information, optimized content, saved document snapshot and match report | Does not silently rewrite the frozen saved job document |

Renaming the base resume does not change its identity. Templates should change presentation, not candidate facts. Base resume services use a current profile-derived context; job-specific preparation uses the saved job resume snapshot when available, with the existing rebuild fallback for older rows.

Sources: `app/api/profile/route.ts`, `app/api/packages/career-profile/route.ts`, `lib/careerProfileResume.ts`, `lib/resumeDocument.ts`, `app/api/packages/[id]/route.ts`.

## 5. Resume Optimizer

1. The user supplies a target job title, with optional job description, industry, country and employer details.
2. The application creates a separate package, then runs analysis/build against its saved target. The title is required; a pasted JD is recommended but not mandatory.
3. **v3 is the current default.** `OPTIMIZER_ENGINE=v2` selects the previous engine for rollback. The older v3 lab document is not current wiring status.
4. If no JD is supplied, v3 uses a cached/generated typical Gulf advert for the chosen title/industry. This is generic target preparation, not proof of a real vacancy.
5. The build produces rewritten content, skill ordering, frozen document and before/after match report. New claims are not automatically applied: the route explicitly sets `autoApply=false`.
6. The user reviews suggested additions/corrections before saving/exporting through the existing preview workflow. Existing candidate facts remain the grounding boundary; an AI suggestion is not a new verified fact.

Sources: `app/optimize/target/page.tsx`, `app/optimize/setup/page.tsx`, `app/api/optimize/route.ts`, `lib/optimizer/v3/`.

## 6. Templates and exports

**Current source count: 53 registered, available template entries**, counted from the `TEMPLATES` object in `lib/templates.ts`. The three newer IDs `ats_professional`, `gcc_professional` and `senior_professional` are additional to the former 50. Older documents/tests saying 50 describe their earlier baseline, not the current registry count. This count is source evidence, not a new live rendering test of every design.

All designs consume the common resume document model. Most use the shared template engine; the registry includes dedicated renderers such as Gulf Premium and ATS Classic. Template styling/photo capability is controlled by registry metadata. Application typography in `app/typography.css` is separate from resume-document typography and must not override it.

PDF rendering uses headless Chromium and the selected template. The DOCX API exists, but the base Profile Resume explicitly returns an unavailable response until Word matches its template preview. Do not promise that every resume/template currently provides a matching DOCX download. Existing exports need their own rendering/ATS checks when changed.

Sources: `lib/templates.ts`, `components/templates/`, `lib/resumeDocument.ts`, `app/api/packages/[id]/pdf/route.ts`, `app/api/packages/[id]/docx/route.ts`.

## 7. Cover letters and Interview Q&A

These services can use either the base Profile Resume or an optimized job resume. They do not universally require the user to optimize first. For a job package that has not yet built its optimized content, Q&A and mock interview generation refuse that unfinished source.

| Service | Current behavior | Important limit |
|---|---|---|
| Cover Letter | Generates grounded text from profile/selected resume and target context; supports tone choice; successful generations append saved letters | Request has its own deadline/guard; displayed completion speed must not be promised from old lab timings |
| Interview Q&A | Builds multiple topic parts in parallel, validates answers and saves a set | Aims for up to 25 questions; can save with at least 15 valid questions, so do not promise exactly 25 every time |

Sources: `app/api/packages/[id]/cover-letter/route.ts`, `app/api/packages/[id]/interview-qa/route.ts`.

## 8. Mock interviews, reports and progress

The user selects a resume, interview focus, difficulty and question count. Current server choices are:

| Setting | Available choices |
|---|---|
| Focus | HR, Technical, Gulf readiness, Manager, Mixed |
| Difficulty | Standard, Strong, Challenging |
| Question count | 5, 10 or 15; default 10 |
| Input | Text, or recorded voice when the required server/provider/storage setup is available |

Recorded voice is asynchronous preparation, not a live video interviewer. Questions are shown; the candidate records/submits answers, then explicitly requests review. Each recorded answer is capped at three minutes and 8MiB. Transcription/review uses the configured services. A worker route exists, but current `vercel.json` does not schedule it; a separate scheduler may exist outside source and was not verified here.

Reports and progress use saved attempts. The shared numeric progress view includes overall, technical knowledge, role fit, Gulf readiness and answer structure. A valid trend compares only completed attempts with the same frozen-resume fingerprint, rubric, input mode, focus, difficulty and question count. A different source/settings combination is a separate baseline; older attempts without identity metadata must not be presented as a proven improvement trend.

Sources: `app/api/packages/[id]/mock-interview/`, `lib/interviewProgress.ts`, `lib/voice/`, `lib/voice/types.ts`, `app/api/cron/voice-interview-review/route.ts`.

## 9. LinkedIn and NaukriGulf preparation

Both are direct navigation destinations with their own workspaces and stored drafts. The user can build from Career Profile or import existing external-profile content for review. Differences must be acknowledged before generation. Outputs are grounded, validated and independently reviewed through the existing AI path. A profile fingerprint and draft revision protect against overwriting content based on a stale profile or another edit.

The result is copy-ready content and an application checklist. The user applies changes on LinkedIn/NaukriGulf themselves. The platform does not log into those sites, create their accounts or automatically update the external profile.

Sources: `app/linkedin-optimization/`, `app/naukrigulf-optimization/`, `app/api/linkedin/`, `app/api/naukrigulf/`, `lib/linkedin/`, `lib/naukrigulf/`.

## 10. Founder controls, usage and AI

| Control | Current source meaning |
|---|---|
| AI provider/model/key | Database-backed admin configuration; per-service configuration can override defaults |
| AI fallback | Service primary → fully configured service fallback → default provider/model as last resort; duplicate provider/model attempts are skipped |
| Service pause | Admin can pause guarded services server-side, not merely hide a button |
| Usage limits | Per-user overrides/action defaults, concurrency and optional global daily caps; reservations count work in flight |
| Success/failure accounting | Guarded calls generally consume a reservation only after saved success and release it on failure; anonymous intake separately counts attempted model readings, including provider failure |
| Paid credits/pricing | Administration and credit/entitlement machinery exist, but paid credit consumers are not wired into the current generation flow; usage limits are active and are different from a paid-credit charge |
| Prompt management | Versioned prompt/admin machinery exists; inspect each service's actual prompt adoption before claiming every generation uses a published stored prompt |

This is a description of code, not a verified inventory of the founder's current production settings, exact model, key, price or account balance. Do not publish secret values in documentation. Payment enablement or changes to quotas are separate product work requiring explicit scope.

Sources: `lib/ai/providerConfig.ts`, `lib/ai/provider.ts`, `lib/ai/serviceGuard.ts`, `lib/rateLimit.ts`, `lib/anonymousRateLimit.ts`, `lib/entitlements.ts`, `app/admin/`.

## 11. Data, retention and deletion

User requests and stored artifacts are scoped to their account through the existing authenticated routes and database policies. The repository's numbered migrations describe intended schema changes; their presence does not prove every migration is applied to the live database.

Current `vercel.json` schedules `/api/cron/retention` at **03:15 UTC daily (06:15 Riyadh)**. It does not list the voice-review worker cron. The actual deployment/scheduler and retention outcomes require live verification.

Settings “Delete my data” deletes profile data and related packages/children, pending drafts and import reviews, attempts photo cleanup, signs the user out and retains the authentication login. It is not an account-closure operation. A known gap remains: LinkedIn drafts reference the authentication owner and can survive profile-data deletion because that action does not delete the auth user or explicitly remove the LinkedIn draft. Do not claim all data is removed by Settings until this is resolved and verified in a separately authorized change.

Sources: `app/settings/actions.ts`, `components/settings/DeleteDataSection.tsx`, `vercel.json`, [DATA_INVENTORY_AND_RETENTION.md](DATA_INVENTORY_AND_RETENTION.md), [14_OPEN_ITEMS.md](14_OPEN_ITEMS.md).

## 12. Current status and remaining plan

| Item | Current status | Next action |
|---|---|---|
| Shared intake and explicit profile review | Implemented in main source | Verify configured production PDF/DOCX/paste/signup journeys |
| Profile/Gulf preparation separation | Implemented; deterministic current formulas above | Verify public/dashboard parity for the same confirmed facts; assess any requested future changes separately |
| Base and job-specific resume paths | Implemented | Preserve live-profile versus frozen-job distinction in future work |
| Optimizer v3 and preparation services | Implemented source | Assess output quality using agreed fixtures/live tests when authorized |
| Recorded voice | Implemented but configuration/scheduler dependent | Verify current flag, provider/storage, worker scheduling and actual device recovery before calling it live-ready |
| Paid launch | Controls exist; paid consumers not fully wired | Finalize commerce/access decisions and verify complete charging behavior before launch claims |
| Resume upload “failed to fetch” | Founder-reported, not reproduced or resolved in this source/documentation review | Investigate exact failed request and status, deployment logs and all three input paths; preserve the draft |
| Settings/LinkedIn deletion gap | Known, unresolved | Specify/test retention correction as separate authorized work |
| Old branches | Historical implementation/audit/design work; some have commits outside main | Review purpose, preserve unique work, remove retired branch refs; never merge experiments simply to clear the list |
| Documentation | Canonical documents plus this guide establish shared understanding | Keep these synchronized with actual main behavior and record uncertainty |

A source inspection does not establish that the live website is running the same commit, that live migrations are correct or that every provider/device flow works. These checks were not performed in writing this guide. Historic reports keep their dated results; they do not certify today's deployment.

## 13. The agreed way we work from now on

1. Read root `AGENTS.md`, [00_START_HERE.md](00_START_HERE.md), [PROJECT_PLAN.md](PROJECT_PLAN.md), this guide, [CURRENT_STATE.md](CURRENT_STATE.md), [16_WORKING_AGREEMENT.md](16_WORKING_AGREEMENT.md) and [PROGRESS.md](PROGRESS.md).
2. Satish explains the desired experience naturally. The lead assistant researches where needed, explains impact and turns the finalized decision into clear requirements.
3. **Update the agreed specification and acceptance criteria before implementation.** Separate current behavior, proposed behavior and approved pending work.
4. Implement only the authorized scope. Use bounded subagents where useful and review actual diffs. Visual-only work must preserve service logic and resume typography.
5. Verify the affected journey, record results and limitations, update actual status and leave a clear next action. Never claim an untested feature is live-ready.

For the present task, the agreed boundary is understanding main, reviewing/removing retired branches and updating documents. No application redesign, logic rewrite, schema change or old experimental feature is authorized by this guide.

## Subsequent authorized profile update — 22 October 2026
The founder approved the [14-block Career Profile contract](CAREER_PROFILE_BLOCKS.md). This supersedes the preceding documentation-only task boundary for PROFILE-014. Existing fields and flexible categories are reused. Detailed project/client/status facts remain descriptive category data, not new separately queryable columns. Scoring arithmetic and other services remain unchanged; a future single Gulf Profile Readiness rubric is not implemented in this task. See PROGRESS.md for actual validation and release status.
