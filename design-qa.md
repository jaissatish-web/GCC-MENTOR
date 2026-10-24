# Career Studio design QA

24 October2026. Implementation: rebuilt Next.js source in PR33. No actionable P0/P1/P2 findings remain in the reviewed presentation scope.

## Source and captured states
Source visual truth: `design-reference/career-studio/approved-direction.png` (1254×1254 generated direction board). This is an approved concept board, not a pixel-exact device specification: its five phone panels have different aspect ratios. Comparison crops remove the board surround; all phone source crops are rescaled proportionally to390px wide, alongside actual390×844 CSSpx screenshots at deviceScaleFactor1. No stretching or device chrome is added. Home source crop252×601 becomes390×930; lower phone crops273×530 become390×757. Height differences remain visible rather than being hidden. The desktop source crop909×597 is scaled proportionally to1440px wide; actual desktop is1440×1024 at1× density. The board's stated16px body and48px controls govern actual CSS sizes; enlarged board text is not treated as reliable font metadata.

Fictional saved state: Maya Thomas, Project Engineer/UAE, one saved resume, active interview with3/10 saved answers, completed practice76 and eligible previous72. Sample mock scores/counts/dates are illustrative; real engines compute the fixture's Profile completeness and Gulf preparation100. Empty/error/pending-import/base-resume/enlarged text states are captured separately.

Full-view combined comparison inputs, opened and inspected:
- `design-reference/career-studio/compare-home.webp`
- `design-reference/career-studio/compare-profile.webp`
- `design-reference/career-studio/compare-resume.webp`
- `design-reference/career-studio/compare-interview.webp`
- `design-reference/career-studio/compare-report.webp`
- `design-reference/career-studio/compare-desktop.webp`

Focused combined control comparison: `design-reference/career-studio/compare-controls.webp`. It checks nav text/icon alignment and primary CTA proportions. Individual full-resolution actual captures are `home-390.webp`, `profile-390.webp`, `resume-390.webp`, `interview-390.webp`, `report-390.webp`, `contact-390.webp` and their1440px counterparts in the same directory. Responsive test results: `results.json`.

## Comparison history and resolved findings
1. [P2] Phone Profile was too tall and descriptive text inherited button-semibold weight. Evidence:`compare-profile-before.webp`; Gulf preferences/additional sections fell below the first viewport. Fix: phone summary row padding12px, tighter identity/header rhythm, two-line descriptions with full content in the editor, central regular-weight supporting copy. Re-captured at390×844 and compared in `compare-profile.webp`; all five section headings and the additional-sections action are visible before the nav.
2. [P2] Report supporting copy inherited-semibold weight and the next-practice action previously followed the entire explorer. Evidence:`compare-report-before.webp` (copy) and earlier source inspection (action position). Fix: regular supporting weight, compact mobile score/feedback spacing, primary Practise again inside the overview action group, paired with Review answers. Re-captured same saved state at390×844 and compared in `compare-report.webp`; both actions fit above the fold, all report sections remain available. Share label stays on one line.
3. Integration corrections before the final comparison: removed inherited50px bottom-nav label width (Resumes now one line at320/390); set shared phone gutter16px; explicitly sized CTA SVGs18px; made unavailable progress indeterminate rather than a real zero. Current control comparison and320/390/768/1440 checks validate these.

## Fidelity surfaces
- Fonts/typography: existing bundled Inter,16px internal body/input,24px phone and28px desktop H1. Central roles supply14px labels/helpers and restrained500/600 emphasis; supporting Profile/report copy uses400. Generated source has no font metadata, so exact typeface identity is not asserted. Source/actual heading hierarchy and control wrapping were reviewed in combined images. Document font/style boundaries pass independently.
- Spacing/layout: light224px desktop rail,80px tablet rail,56px phone header,16/32px page gutters,48px primary controls,8px radii. Home reorders readiness/context/action/saved rows on phones and uses two columns on desktop. Profile summary/focused editing, flat service rows, local tabs and focused interview remove repeated card/header layers. No horizontal page overflow at320/390/768/1440 or doubled Home text.
- Colors/tokens: warm nearwhite, charcoal, ocean teal, amber attention and blue information, configured centrally and scoped to internal UI. Source gradients/shadows are deliberately simplified to flat controls and light dividers for clarity. Public colors and document styling retain their separate contracts.
- Images/icons: existing candidate photos render when saved; the no-photo fixture exposes the actual upload control instead of shipping the mock portrait. Resume workspace thumbnail uses the real document/template renderer. Home has a library document icon because the existing summary API has no document snapshot; it does not fabricate a resume image. Standard existing Heroicons/Lucide replace no custom product imagery. No generated assets or example people are runtime fallbacks.
- Copy/content: labels describe actual existing services. Distinct Profile completeness/Gulf preparation scores are preserved. No invented timestamps, per-question evidence links, mock achievements or auto-save promise. Introductory explanations remain disclosed where possible.

## Intentional differences from the concept
- Four existing resume tabs (Overview/Improve/Design/Tracker) remain rather than inventing the mock's three-tab model; all existing controls and base-resume paths survive.
- Source home timestamps, item counts, readiness labels/numbers and feedback examples are replaced by real available data. Generic improvement links are used when the account has no grounded summary feedback.
- Report feedback links open the correct existing sections, not invented question3/5/7 associations. Comparison only appears when the unchanged eligibility model supplies a previous score.
- Question4 means three saved answers; source's question3 label alongside three saved answers is not copied. Submit remains explicit; the mock's automatic-save caption is removed.
- Report actions share one phone row instead of two full-width rows, keeping score/priorities/next action in the viewport. Header preserves the service menu rather than substituting a nonfunctional sample avatar.

## Browser verification
Current compiled production pages and the real dynamic workspace component were served via a local fictional-data harness, opened in the cloud browser. These are real hydrated components, not screenshots used as UI. Cloud captures: `cloud-home.jpg`, `cloud-profile.jpg`, `cloud-report.jpg` at1363×936 surrounding a390×844 iframe; `cloud-desktop.jpg` at1363×936 directly. The desktop capture follows a successful answer submission, so saved progress is4/10 there. The wrapper and classic-scrollbar normalization are test-only. The dynamic workspace harness substitutes Next navigation/server footer/auth adapters; it does not certify published legal content or production auth.

Primary interactions: Home Continue practice opens the saved run; typing and Submit advances Question4→5; report Review answers opens question cards; Profile edit→back preserves the changed name and explicit Save succeeds through the versioned existing payload. Native checks also cover service links, all four viewport widths, actual WhatsApp choices, drawer keyboard/focus/account navigation without writes, empty/error/pending-import/base-resume and doubled text. Application console errors:none in native checks and the observed cloud app load. Cloud extension metadata errors were excluded by extension URL.

## Checks and limits
Local production build (including lint/type validity) passes. Repository suite77/77 passes. Career Studio29 responsive/state checks pass with zero external calls/runtime errors. Shared UI/public-document isolation passes; mobile typography, CTA interactions, navigation and intake checks pass. Test harness accepts the existing beforeunload prompt only when leaving fictional cases; it never changes the production guard. Required CI and exact Vercel release status are separate gates recorded in PR33/release notes. Signed-in production saves, AI generation quality and microphone behavior were not certified by these fictional tests.

Implementation checklist: source checkpointed; protected-directory diff empty; comparisons opened; P2 fixes re-captured; app interactions/console checked; final required CI must pass before merge. P3 follow-up: summaries may show additional entry counts beside section titles; not needed to use any flow.

final result: passed
