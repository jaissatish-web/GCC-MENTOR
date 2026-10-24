# Career Studio — approved redesign and recovery status

24 October 2026 (Riyadh). Authorized by Satish: option 3, followed by approval of the revised connected journey and “Ok go ahead”. Baseline main: `4f65bc4c8608c3a6661896542bc1256187545d86` (confirmed remotely again in this check).

## Approved scope
Recompose Home, Profile, resume workspace and text interview/report pages. Light 224px desktop rail; four phone destinations (Home, Resumes, Practice, Profile); existing service drawer retained. Home prioritizes one next action and saved work with contextual readiness. Profile defaults to a summary with one section edited at a time. Resume workspace groups preparation services and keeps all existing tabs/actions. Interview is a focused question/answer surface; report prioritizes score and three grounded feedback items.

Central typography: existing bundled Inter, 16px body/inputs, 24px phone and 28px desktop page headings, 16px phone gutters, 32px desktop gutters, 48px controls, restrained ocean teal/charcoal/nearwhite. Keep all 14 Profile blocks, existing mounted unsaved edits, import review, explicit saving and version checks. Mockup labels, timestamps, scores and candidate examples are not factual product requirements. Preserve real two-score meanings and report-comparison eligibility; do not introduce auto-save.

## Protected behavior
No API, schema, authentication, prompt, credit, scoring, resume-template formatting or export changes. No replacement of real data with example fallbacks. Existing published legal/footer content remains.

## Current status — release blocked
A temporary source worktree at `/tmp/gcc-career-studio` was lost when the execution environment restarted. It had not been committed. The git worktree metadata survives, but `git fsck --no-reflogs --unreachable` found no recoverable source objects. A new baseline checkout now exists inside the persistent workspace at `gcc-career-studio`. It contains **no recovered application implementation yet**.

The built, fictional-data review survived at `../studio-review`: production-built static pages/assets, a webpack component bundle for the dynamic resume workspace, fictional fixture and review server. Its source paths in bundle comments point to the lost checkout. These are useful recovery/visual evidence, not a source-complete or deployable production change. The review server was restarted and Home successfully re-opened in the cloud browser. It uses test APIs and must never be deployed as the actual application.

Approved visual: `../design-reference/career-studio/approved-direction.png`. A SHA-256 manifest of surviving review files is stored beside it. Keep those files until the implementation is reconstructed and reviewed.

## Historical checks — apply only to the lost checkout
Prior tool outputs recorded 77/77 repository checks, a production build, 28 responsive/state checks at 320/390/768/1440, mobile typography/public-document isolation, WhatsApp CTA interactions, intake and navigation checks. Profile section/back/save and interview answer submission were exercised using fictional APIs. These checks **do not certify the new baseline checkout**, and their temporary raw logs were lost. An existing preview regression script failed on a stale catalogue expectation (53 versus 63); no template code was changed to fit that assertion. The last report CTA improvement had not received a passing final build before the interruption.

## Next required work
1. Recover/reconstruct readable typed source from the current main baseline, surviving review and approved target. Checkpoint each coherent change in git within the persistent workspace.
2. Retain all protected behavior; inspect the actual diff, rerun typecheck/lint/build and required checks.
3. Compare source and actual rendered pages at matched phone/desktop sizes. Fix report CTA placement; validate narrow navigation labels, long text, empty/error/pending states and document isolation.
4. Complete `design-qa.md`, open a reviewable PR, pass required CI, and perform the authorized release only after those gates. Do not claim this redesign is on main or live now.

## Resumed implementation and publication authorization
Satish instructed “So do it” after being told the source must be reconstructed, tested and merged to main for Vercel publication. Rebuild within the approved scope above. Source checkpoints must be committed inside the persistent workspace. Required checks and actual visual QA remain release gates; no bypass. Root owns Home/resume workspace/harness/release. Bounded Profile, interview/report and shell/CSS tasks may be coordinated under AGENTS.md; inspect all integrated diffs.
