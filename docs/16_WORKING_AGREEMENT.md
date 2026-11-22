## Batch 1A quality foundation — 15 November 2026

Status: founder-approved documentation implementation; merge/deployment pending separate approval. This section supersedes conflicting historical task/branch wording below. Source baseline: main ca0abcf3ab386a252dc39a08ba26707d07019816. Superpowers practices are adapted from obra/superpowers; no plugin or dependency is installed.

### Authorized file boundary

Only: AGENTS.md; docs/16_WORKING_AGREEMENT.md; docs/SAAS_RELEASE_CHECKLIST.md; docs/CURRENT_STATE.md; docs/12_DESIGN_SYSTEM.md; docs/14_OPEN_ITEMS.md; docs/PROGRESS.md; docs/15_DECISION_LOG.md; docs/DOCUMENTATION_INDEX.md; docs/engineering/AI_SERVICE_EVALUATION.md. Preserve older evidence with dated authority notices. No application, workflow, package/lockfile, SQL, prompt, scoring or template edits. Do not interfere with existing PRs #79/#80 or other open PRs.

### Development standards

1. **Brainstorm:** state the user problem, evidence, affected users, constraints and smallest useful alternatives. Resolve material product choices with the founder; no redesign based solely on trends.
2. **Plan:** map exact files/dependencies, protected boundaries, complexity, API cost, acceptance thresholds, tests and rollback. Record proposed versus approved work explicitly.
3. **Debug systematically:** reproduce, inspect errors/recent changes, trace input through boundaries and test one root-cause hypothesis. Use synthetic/redacted diagnostics; never log raw resumes, credentials or private user data. An unreproduced issue is an investigation, not a verified fix.
4. **TDD for approved code:** write a behavioral regression that fails for the intended reason, implement the smallest fix, observe green, then refactor with checks intact. Never weaken assertions or recapture a golden merely to obtain green. Documentation-only changes require source/link/diff review instead.
5. **Review:** inspect the actual base-to-head diff against the approved specification, security/data boundaries and tests. Record critical/important findings and resolve them before readiness. Independent review, when available and authorized, supplements lead review; never fabricate a reviewer or claim independence for self-review.
6. **Verify before completion:** record exact head, command/environment, result, evidence and limits. Distinguish source inspection, offline tests, synthetic browser checks, expert review and live verification. Prior-head green is insufficient after edits. No unmeasured quality claims.

### Controlled continuous improvement

Observe → Identify → Investigate → Propose → Approve → Implement → Test → Review → Deploy.

For Resume Optimizer V3, Cover Letter, Interview Q&A, Mock Interview, ATS and Career Profile, use the [evaluation protocol](engineering/AI_SERVICE_EVALUATION.md). Each proposal identifies evidence/root cause, affected users, smallest solution, effort and API cost, files/database/workflows, measurable criteria and rollback. Founder approval precedes implementation. Work on one approved batch in an isolated branch; compare identical baseline/candidate fixtures. Stop for high-risk scope changes. A PR is not merge/deployment approval.

### Lightweight founder report

Use 14_OPEN_ITEMS.md for unresolved proposals and PROGRESS.md for evidence; do not create another production dashboard or parallel task list. Each issue records: ID, service/component, severity/user impact, evidence, proposal/benefit, effort/API cost, coverage, baseline/candidate results, status, approval needed, PR and rollback. Statuses: observed → investigated → proposed → approved → implementing → verified → review → released, or blocked/rejected. Advance only with evidence and authorization. UI/UX and reliability work use the same process; visual changes require approved references and mobile/desktop comparison.

### Rollback and cost boundaries

Documentation PR: close before merge or revert its commit after an approved merge. Code releases require their own compatible deployment/data rollback plan; never assume an engine switch reverses data. No credentials/user data to third-party judges. Paid evaluations need an approved model, synthetic dataset, hard spend/call limits and stop conditions. Plugin installation is a separate approval and must be verified in a new session before claiming activation.

# Working agreement

Updated by founder instruction, 22 October 2026. Applies to future sessions and replaces the former tool-specific Claude/Hermes handoff arrangement.

## Roles
Satish owns product/business direction and describes the desired experience in plain language. The lead assistant researches, explains tradeoffs, writes requirements, builds or delegates, reviews actual changes and reports evidence. Subagents may handle bounded tasks when useful, as authorized by Satish; the lead remains responsible for integration and verification.

## Before implementation
1. Read root `AGENTS.md`, `00_START_HERE.md`, `PROJECT_PLAN.md`, `CURRENT_STATE.md`, `PROGRESS.md`, and relevant domain files.
2. Check the latest main and working tree. Identify the exact requested outcome and any existing behavior that must remain.
3. Record the finalized requirement, acceptance criteria, scope, affected files, risks and verification plan in the domain file and progress tracker BEFORE changing code. Record decisions with dates in `15_DECISION_LOG.md`.
4. Mark new behavior **approved, not implemented** until it ships. Ask only when a material product decision or truly missing authorization remains; routine implementation choices within scope can proceed.

## Implementation and verification
Preserve grounding, existing user facts, account/data boundaries and service logic outside scope. Use shared design tokens; visual-only work must not change scoring, prompts, storage, validation, billing or resume typography. Do not commit secrets, force push, bypass protections or drop/rename schema without explicit authorization. Schema work requires numbered migrations and appropriate database verification.

Read the actual diff, including delegated work. Run appropriate repository checks for code changes (`typecheck`, `lint`, `build`, affected regression tests); inspect user-facing flows at mobile and desktop sizes where possible. Test service/data flows when they change. Record unavailable verification and existing failures accurately. Documentation-only changes require source/link/diff checks, not a claim that runtime behavior was retested.

## Keeping one implementation per feature

Before adding a component, workflow or style rule, trace the current route to its
implementation. Reuse the existing owner for the same responsibility. The landing
starts at `app/page.tsx`, with navigation in `components/landing-v3/PremiumNav.tsx`.
Career Profile import and review use the same workspace from
`app/profile/page.tsx`. Keep their route files as thin exports so existing links work.

When replacing an implementation, review the old path in the same PR. Check imports,
dynamic paths, assets, tests and build conventions before removing it. Record the
reason in the PR when two similar files need to stay, such as separate route
contracts or separate styling for authored resume documents.

## Before ending
Update domain documents to actual implementation; record checks, failures, unresolved questions, commit and next action in `PROGRESS.md`. Never mark a feature complete only because a builder reports success. Distinguish source inspection, automated tests, synthetic UI checks and live production verification.

## Branches
Main is the sole standing branch. Temporary branches are permitted when main protection requires a pull request for already-authorized work; remove them after merge. Other branches require Satish’s instruction. Respect protection. Before deleting an old branch, compare against main and preserve unique work durably with an explicit recovery record. Do not merge experimental changes as part of cleanup.

## Document authority
Latest explicit founder decisions take precedence over old repository process notes. `PROJECT_PLAN.md` owns agreed direction; `CURRENT_STATE.md` owns the inspected baseline; `PROGRESS.md` owns active work; domain files own details; `15_DECISION_LOG.md` owns dated rationale. `DOCUMENTATION_INDEX.md` labels historical records. A source contradiction is a documentation defect to investigate, not permission to alter working logic without scope.
