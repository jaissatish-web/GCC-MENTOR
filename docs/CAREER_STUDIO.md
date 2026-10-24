# Career Studio — internal presentation rebuild

24 October 2026 (Riyadh). Approved selected direction: `design-reference/career-studio/approved-direction.png`. Baseline main:4f65bc4. Satish authorized reconstruction and publication after being told this requires tested source, main merge and Vercel release. Review:PR33. Status: implemented and locally built; final verification and required CI precede release.

## Resulting experience
- Light224px desktop navigation,80px tablet rail and four mobile destinations:Home,Resumes,Practice,Profile. Existing complete services/settings/signout/data drawer and published footer remain.
- Home prioritizes selected resume context, one real next/continue action and saved-work rows. Existing Profile completeness and Gulf preparation remain distinct. Desktop puts readiness/context alongside work; phones show it first. Pending imports retain priority; no-data/error/loading and saved-progress recovery remain.
- Profile opens a summary, then edits one section. Existing editor state survives returning to the overview. Full14-block/custom editing, visibility, import review, explicit saving, optimistic version checks and invalid-field focus remain. Phone summary descriptions show two lines; editing exposes all content.
- Resume workspace uses persistent local tabs, a real document thumbnail, preparation service rows and an action disclosure. All four existing tabs, base-resume distinctions, save/edit/export/tracker and prerequisite paths remain.
- Text interview opens a focused room using existing drafts/answer/finish handlers. Completed reports show actual score, eligible prior comparison and three grounded feedback priorities before the full explorer. Practise again opens existing setup; it never generates on navigation. Voice and sharing behavior remain.

## Shared rules and protected behavior
Inter from existing bundled assets;16px body/inputs,24px phone and28px desktop H1,16px phone/32px desktop gutters,48px controls,8px radii. Nearwhite/charcoal/ocean teal with amber attention/blue information. Application typography stays in `app/typography.css`; layout/color/spacing configuration remains in `app/ui-system.css`. Studio geometry is scoped in `app/career-studio.css`.

No API/lib/schema/auth/scoring/prompt/credit changes, no sample-data fallbacks, no auto-save introduction, no document-template/export formatting changes. Actual counts/scores/service semantics supersede illustrative mock data. Generated portrait/document art is not shipped as candidate content: actual saved photos and real resume renderer are used; Home uses a standard document icon where summaries contain no document snapshot.

## Implementation record
Reconstructed readable typed source against current main after an earlier uncommitted temporary checkout was lost. Checkpoints75952b5,a22c295,c2ea620,9ed5412,d877473,070509f,3aac94f,5fa06fa preserve requirements and code. Root reviewed integrated diffs; protected directories (`app/api`, `lib`, `types`, template components) have no changes. Remote application checkpoint f550a5a06de7de0c06d0f132fc181da262d39610 has the identical tree to local5fa06fa. The compiled fictional review is verification only and is never deployed as production.

## Verification and release
See project-root `design-qa.md` for source/render comparisons, responsive evidence, fixes and explicit deviations. Required CI and Vercel status must be recorded against the final PR head/merge, separately from synthetic checks. Source/build tests do not certify signed-in production persistence, AI provider output quality or microphone behavior. Live authenticated checks require a session; do not infer them from fictional APIs.
