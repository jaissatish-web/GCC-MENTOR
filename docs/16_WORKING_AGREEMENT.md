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

## Before ending
Update domain documents to actual implementation; record checks, failures, unresolved questions, commit and next action in `PROGRESS.md`. Never mark a feature complete only because a builder reports success. Distinguish source inspection, automated tests, synthetic UI checks and live production verification.

## Branches
Main is the sole standing branch. Create another branch only if Satish requests it; respect GitHub protection if it blocks direct updates. Before deleting an old branch, compare against main and preserve unique work durably with an explicit recovery record. Do not merge experimental changes as part of cleanup.

## Document authority
Latest explicit founder decisions take precedence over old repository process notes. `PROJECT_PLAN.md` owns agreed direction; `CURRENT_STATE.md` owns the inspected baseline; `PROGRESS.md` owns active work; domain files own details; `15_DECISION_LOG.md` owns dated rationale. `DOCUMENTATION_INDEX.md` labels historical records. A source contradiction is a documentation defect to investigate, not permission to alter working logic without scope.
