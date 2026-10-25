# Soft indigo design QA — 25 October 2026

final result: passed

## Target, scope and evidence
Satish selected the typography, colour, theme and button design of SkillDrift sign-in. This is a presentation adaptation, not a clone of its content, illustration or passwordless authentication. Source: design-reference/soft-indigo/reference-signin.jpg; implementation: auth-desktop.jpg in the same folder. Both browser screenshots1363x936 pixels/CSS viewport, density1. Source has OTP/social sign-in; implementation intentionally preserves GCC Mentor password fields, routes, content and logo. No new raster asset was required for the requested theme/type/button scope; existing real product imagery and line icons remain.

Full-view comparison: design-reference/soft-indigo/auth-comparison.jpg,2726x976 pixel board (two1363px captures plus labels), viewed together. Focused form comparison: auth-controls-comparison.jpg, two480x465 crops at native scale, viewed together. Accepted mobile auth/dashboard/report captures: auth-mobile.jpg, dashboard-mobile.jpg, report-mobile.jpg,391x844 crops from the same390x844 iframe plus fractional browser edge, no resizing. Browser review also inspected loaded desktop landing with10 actual template faces and desktop dashboard; accepted visual state, no horizontal overflow. Not a pixel-identical recreation claim.

## Required fidelity surfaces
- Typography: bundled Inter; auth title26px/800, desktop story40px/800, body16px/400, helper14px,16px inputs and action labels. Internal compact24/28px H1 remains, now800; lower headings600. Heading tracking and line height configured centrally. Body and longer feedback remain regular. Source family/weight/size checked against rendered styles.
- Spacing/layout: selected1.1fr/1fr auth composition and460px form measure,32px desktop card inset,24px outer corners,12px controls. Mobile form comes first with16–20px gutters; action targets remain44–48px. Shared workspaces use restrained group cards and flat nested rows.
- Colours: measured primary91/96/241, plum43/38/64 and lavender238/242/255 confirmed in the browser. Near-white surfaces252/252/253, secondary88/82/122, border226/224/235. Deeper indigo is used for small text on lavender; primary white-on-indigo contrast4.79:1. Red/amber/green statuses remain independent.
- Assets: existing GCC identity and actual resume/interviewer visuals retained. No competitor branding or illustration copied. Document previews intentionally keep their authored palettes and fonts.
- Copy/content: existing service facts, authentication instructions, destinations and action labels retained. No new product promises or fabricated statistics.

## Findings and iteration history
1. P1 first auth capture still showed navy due to a late globals.css palette plus responsive root redeclarations. Removed obsolete palette/type ownership from globals/mobile/desktop styles. Final auth-desktop.jpg and both comparison boards confirm exact indigo/plum/lavender values and intended typography.
2. P2 framed mobile report pushed Practise again below844px. Kept the framed card but removed duplicate header inset, tightened icon gaps and reduced score-area padding. Report-mobile.jpg shows both primary controls fully visible; final Career Studio29 responsive/state checks passed, preserving its above-fold assertion.
3. P2 removing duplicated typography revealed a legacy journey-guide alias. Restored that alias in the central typography file; source token-resolution regression passed. Existing code-owned roles now resolve in one system.
No actionable P0/P1/P2 remains in inspected representative states. P3: an original GCC illustration could be explored separately; outside this requested theme/type/button scope.

## Interaction and verification
Cloud browser: desktop/mobile auth presentation and show/hide-password control, loaded landing, desktop/mobile workspace, mobile services drawer open/close. No credentials entered or authentication submitted. Console review saw extension-origin metadata errors, no app-origin errors in inspected state. Local review uses actual built UI plus fictional APIs; sign-in adapter disables submission.

Completed: typecheck/lint, all80/80 repository checks, final production build, independent scoped palette/layout/control/document-isolation checks320/390/768/1440; production-CSS mobile/enlarged typography/reflow; Career Studio29 responsive/state checks including optimistic profile save/interview answer submission/report; actual profile CTA/WhatsApp selection alignment320/390/768/1440; universal typography propagation/document isolation. Assertions updated only for explicitly approved palette/type roles; overflow, document isolation and interaction assertions retained.

Protected directories app/api,lib,types,supabase,components/templates,components/resume have no changes. No dependency/auth/scoring/prompt/data/export changes. No performance benchmark or live customer persistence/auth/provider certification claimed. Required GitHub CI, main merge and exact Vercel production/browser checks remain separate release gates; see PR release record.
