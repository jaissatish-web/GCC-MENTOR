# GCC Mentor — instructions for every working session

Read these files before planning or changing anything:
1. `docs/00_START_HERE.md`
2. `docs/PROJECT_PLAN.md`
3. `docs/CURRENT_STATE.md` and `docs/PLATFORM_MASTER.md`
4. `docs/16_WORKING_AGREEMENT.md`
5. `docs/PROGRESS.md` and the relevant domain specification.

The founder is Satish, a non-coder. Explain outcomes, impact and choices in plain language. Help research and refine his ideas. Do not assume every suggestion in old chats is an approved requirement.

## Documents first, implementation second
- Record the authorized requirement, intended behavior, acceptance criteria, affected files and protected scope in the relevant domain document and `docs/PROGRESS.md` BEFORE editing implementation. Date product decisions in `docs/15_DECISION_LOG.md`.
- Label proposed work, approved work, implemented code and verified behavior separately. An intended change is not an implemented feature.
- Then implement within that scope, inspect the actual diff, run appropriate checks, and update results, limitations and the next action before ending the session.
- When code and a document disagree, inspect current main and correct the document; do not change code merely to fit stale documentation. Explicitly record unresolved uncertainty.
- Read `docs/DOCUMENTATION_INDEX.md` before using older reports as instructions. Historical plans and test evidence do not establish current behavior or current production health.

## Scope and collaboration
- Main is the only standing development branch. A temporary branch is permitted solely when required by main protection to deliver authorized work through a pull request; remove it after merge. Other feature/preview branches need Satish’s instruction. Do not force push or bypass protection.
- Preserve existing service logic during visual-only work. Do not change resume template/document typography as part of application typography work.
- Mobile first, then desktop. Shared application typography is in `app/typography.css`; use the existing central design system.
- Preserve truthful candidate facts; never invent achievements, dates, employers or qualifications. Do not store passport numbers or commit credentials.
- No unrequested schema, auth, payment, security or personal-data changes. Schema changes require numbered migrations and verification appropriate to the authorized scope.
- Satish has authorized the lead assistant to coordinate subagents when useful. Give each a written bounded task, shared invariants and acceptance criteria; review their actual diffs and integration. Delegation is optional and does not replace lead review.
- Keep only main when finished. Before removing a branch, compare it with main, record its name/SHA and preserve any unique work durably. Never merge old experimental logic just to clear a branch list.

## Verification and handoff
For code changes run checks appropriate to the affected behavior, including required repository checks. For documentation-only changes check links, claims against source and the diff; do not claim runtime tests were run. Report commit, completed work, pending work and concrete limitations. Do not claim deployed/live verification from source inspection.

Current founder scope (22 October 2026): understand and document the platform as implemented on main, classify/remove old branches, and preserve unique historical work. Do not change application behavior, scoring, UI, prompts or database until a new implementation request is agreed and documented.
