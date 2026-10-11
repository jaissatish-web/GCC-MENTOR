# Part 2 of 10 — Premium landing foundation and hero

Date: 11 October 2026. Status: implemented on the redesign branch, preview built and desktop inspected; awaiting user review before Part 3.

Code commit: `e953157a41aa788039f9f387f7ea6133cb21b700`.

Verified preview: https://gcc-mentor-l5pc544nn-satishs-projects-c02c354b.vercel.app/

Vercel preview deployment: `dpl_4AiHHM4ScsorAvRWRPZbhXAP8LYk`, READY. This is a branch preview, not a production release.

## What changed

The hero now explains the full preparation platform: job-specific CVs and cover letters, LinkedIn/NaukriGulf profiles, personalized interview practice, feedback and improvement. It has a compact headline, strong Gulf engineering photography, a restrained gold route motif, a visible coaching entry, and a three-step preparation rail. It contains no fabricated scores, recruitment claims or customer endorsements.

The exact primary CTA, **Check My Free GCC Readiness**, links to the existing `/gulf-readiness-score`. The requested approximately-15-years founder statement sits beside the CTA area. The secondary action opens the actual application journey.

Navigation is simpler and has an explicitly styled gold-tinted readiness button, correcting the formerly unreadable header CTA. Sign-in, existing anchors, account creation and privacy/FAQ access remain available. The mobile disclosure uses native details/summary, closes on a selected link, and supports Escape returning focus to the summary. A skip-to-content link was added. The fixed bottom mobile CTA was removed from this landing composition to reduce visual obstruction.

No new photography was generated. The existing illustrative engineer asset is retained with accurate alt text; it is not represented as a real founder or customer photograph. Cropping, muted saturation, contrast, green gradient and gold destination detailing are part of the landing treatment.

## Final landing design standards

All new tokens live in `components/landing-v3/premium.module.css`, inside `.system`, which is mounted only by `LandingPage`. Global root/body tokens and shared authenticated components were not changed.

| Area | Implemented standard |
| --- | --- |
| Brand | Deep green #0F4C43; supporting deep green #0A3932; gold #C9962E; pale gold #F7EFDD; light canvas #F8FAF9; white surface |
| Text | Dark green/ink #172E29; muted #52635F; Inter through the existing locally served font variable |
| Hero type | Fluid 38–56 px, 1.1 line height, balanced wrapping, approximately 650 weight; 34 px below 360 px |
| Section headings | Fluid 28–38 px; final conversion display 32–44 px, replacing the prior giant final heading |
| Body | Hero copy 15 px on phones, 16 px above 600 px; restrained bold positioning line; supporting information uses separate smaller roles |
| Spacing | 8/16/24/32 px base steps; section rhythm 48–76 px; fluid horizontal gutters 16–48 px; 1280 px maximum container |
| Layout | Single-column phone composition, three-column preparation rail above 600 px, split hero above 960 px, full navigation above 1280 px |
| Buttons | Minimum 44 px controls; 52 px hero action; 10 px control radius; explicit readable foreground/background colors; visible gold keyboard outline |
| Photography | Reserved aspect ratio, full responsive image sizes, priority hero loading, intentional project crop, green lower gradient, restrained gold arcs |
| Iconography | Existing Lucide line icons; modest 14–22 px sizing; meaning expressed in adjacent text; decorative icons hidden from assistive technology |
| Surface rhythm | Light hero and regular sections; warm gold photography backdrop; selected deep-green coaching section; minimal hero containers rather than a grid of product cards |
| Motion | 180 ms interaction response; 520 ms one-shot entrance; shared cubic-bezier easing; no new continuous animation; reduced-motion disables entrance and new transitions |

Existing landing containers now use the same gutter tokens at tablet widths instead of a hard-coded 64 px deduction. Section gaps and two-column gaps are fluid. Invalid `var(--ui-body-line)5` declarations were corrected within landing CSS. Landing-only footer headings were reduced to navigation-label scale. All actual document fonts/layouts remain excluded from these changes.

## Three signature experiences: one coordinated system

| Experience | Shared visual treatment and scheduling | Boundary for later implementation |
| --- | --- | --- |
| Real resume orbit | Green orbit/depth accents, gold selected-state emphasis, real white documents, stable reserved stage | Part 3 upgrades the existing single mount and integrates it into the hero companion composition; renderer and sample documents remain intact |
| Career Profile to applications | Same green connectors, gold focus accents, white documents and shared motion timing | Part 5 expands the existing fictional demo; no live data or AI calls in marketing interactions |
| Middle East globe | Matching gold/green arcs and six destination markers, stable reserved stage | Part 8 mounts the existing canvas globe; no heavy replacement 3D library |

Keep no more than one or two prominent continuous animations active. Schedule continuous scenes by section visibility/tab visibility; allow pause and selection; retain static reduced-motion states. Do not add a second expensive resume orbit to the hero. The current orbit has one mount and is still in its existing template section; its movement/interaction upgrade is Part 3, not claimed complete here.

Mock interview coaching remains a flagship entry on the first screen. Part 7 will add the rich question-level and repeated-session demonstration using the verified transcript, grammar, technical, role-fit, Gulf-readiness and answer-structure capabilities from Part 1. No unsupported acoustic-confidence claim was added.

## Exact application files changed

| File | Change |
| --- | --- |
| `components/landing-v3/PremiumHero.tsx` | New server-rendered hero, photographer treatment, readiness CTA, founder statement, coaching entry and preparation rail |
| `components/landing-v3/PremiumNav.tsx` | New server-rendered public navigation and skip link |
| `components/landing-v3/premium.module.css` | Landing-scoped design tokens and responsive hero/navigation styles |
| `components/landing-v3/LandingPage.tsx` | Mounts new hero/system, removes fixed CTA, adds template-library invitation and main skip target |
| `components/landing-v3/LandingSectionMenu.tsx` | Uses the new scoped styles while preserving native disclosure and keyboard close behavior |
| `components/landing-v3/Sections.tsx` | Concise real section anchors and delegation to new navigation |
| `components/landing-v3/launch.module.css` | Consistent landing gutters/section gaps, restrained final heading, valid line-height declarations, removal of obsolete header color overrides |

Evidence/documentation files: this report, `docs/TASKS.md`, and `docs/landing-transformation/part2-desktop-1363.jpg`.

## Checks and actual rendered evidence

- `npm run typecheck`: passed.
- `npm run lint`: passed. After a subsequently added internal template link triggered Next's Link rule in the build, it was corrected to `Link`; the final build's lint/type checks passed.
- `npm test`: 60/60 checks passed. Includes grounding, readiness, profile/import, interview history, template fingerprints and disposable database checks. No production account or real AI usage was needed.
- `npm run build`: passed; 75 static pages generated. The build emits existing webpack cache-size warnings and notes that site-content reads are skipped in the local environment without Supabase configuration. No configuration/secrets were added to the checkout.
- Build-reported landing First Load JS: 217 kB. This is bundle evidence, not a measured Lighthouse score or Core Web Vitals result.
- Vercel branch preview: READY, correct code commit and project confirmed.
- Browser screenshot: actual 1363 × 936 viewport, saved as `part2-desktop-1363.jpg`. Desktop hero inspected for headline wrapping, photo crop, alignment, CTA contrast and section transition.
- Browser DOM measured document scroll width 1348 px at window width 1363 px: no horizontal overflow at this viewport.
- Hero font measured about 51.1 px at this viewport.
- Browser DOM confirmed exactly one resume-template collection.
- Primary CTA clicked and the existing readiness upload/paste screen visibly opened with two questions, no-signup message and PDF/Word controls.
- Secondary journey action clicked; URL reached `#journey` and target settled below the sticky header.
- Inspected error log contained Chrome-extension metadata errors, with no application-source errors in that inspected window. This is not a blanket console-error guarantee for all pages.

### Responsive verification limitation

The cloud browser exposes no viewport-resize or mobile-emulation capability. Keyboard zoom did not change its measured viewport. A genuine 390 px phone screenshot and 1440 px desktop screenshot could not be produced in this session. The supplied image is the actual 1363 px rendered desktop view; it is not resized or presented as a mobile render. Mobile layout is implemented in CSS but has not been visually validated at 390 px. Full eight-width, touch and mobile-menu checks remain open for Part 9 or an environment exposing responsive browser control.

## Preservation and open issues

Diff inspection confirms all seven application files are inside `components/landing-v3`. No authenticated service page, global UI stylesheet, database/schema/migration, authentication client, middleware, pricing/credit logic, readiness engine/handoff, AI processing, PDF/DOCX logic or resume template content/renderer was changed. The existing orbit, application studio, interview demo, founder/privacy content and SaaS service routes remain available.

Still open: real founder photograph, current purchasable pricing verification, full responsive rendering, touch interactions, Lighthouse/Core Web Vitals, rich interview demo and globe integration. These belong to the later agreed stages; no unsupported claims were published to fill those gaps.

Next stage after user review: **Part 3 — real resume orbit integration and interaction polish**, retaining the actual rendering system and one expensive mount.
