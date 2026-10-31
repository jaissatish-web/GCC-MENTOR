# Platform terminology — TERM-001

31 October 2026. Approved by founder; implemented in source, release verification pending.

Use one recognizable name per destination/action across public navigation, application navigation, Home, library, profile, optimizer and preparation services. Existing routes, handlers, facts, scoring, prompts, API contracts, storage, payments and resume documents are protected.

| Meaning | Canonical wording |
|---|---|
| Start a new job-specific resume | Optimize Resume for a New Job |
| Generate for the job already selected | Optimize Resume for This Job |
| Job information within that flow | Job Details |
| Central career facts | Career Profile |
| Base resume derived from those facts | Career Profile Resume |
| Job-specific output | Optimized Resume |
| Saved resume destination | Resume Library |
| Letter service / action | Cover Letter / Write Cover Letter |
| Study service / action | Interview Q&A / Prepare Interview Q&A |
| Practice service / action | Mock Interview / Start Mock Interview |
| External profile services | LinkedIn Optimization / NaukriGulf Optimization |

Keep meaningful distinctions: upload/import is not optimization; a target job is not an applied application; profile completeness, Gulf preparation and job-match assessments remain separate. Compact bottom-navigation aliases remain for narrow screens. Contextual explanations may use ordinary prose; buttons/menu labels use shared constants in lib/serviceLabels.ts.

Acceptance: entry points into /optimize/target identify the same action; no competing base-resume/library names on customer screens; service names and main action capitalization agree; destinations and processing behavior unchanged. Verify diff, typecheck, lint, build and required repository checks; inspect mobile/desktop wrapping when feasible. Affected: customer app pages/components, presentation labels and guidance, docs.

Implementation: shared names now feed navigation, footers, Home, library entry points, profile, optimizer title and preparation source labels. Base-resume references use Career Profile Resume; Edit Career Profile consistently identifies the existing editor. Removed one duplicate Home shortcut to the same new-job flow. Plural activity counts remain natural collection labels. Existing assessments remain distinct.

Verification: typecheck/lint passed; production build passed with placeholder configuration. Focused dashboard rendering passed after updating capitalization assertions. Final npm run check passed: typecheck, lint and 88/88 regression suites. Local browser navigation fixture could not launch bundled Chromium (CDP target connection closed); remote CI browser checks remain a release gate. No live account/provider/deployment verification claimed.

Release blocker: automatic approval review rejected git push to origin, stating publication to the GitHub destination was not explicitly authorized. No workaround attempted. No PR opened or merged; remote CI/deployment not run. Local implementation commit 6149384. User confirmation of publication is the next action.
