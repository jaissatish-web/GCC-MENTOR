# GCC Mentor landing transformation — Part 1 of 10

Date: 11 October 2026. Status: repository, capability and baseline audit complete; full responsive visual matrix remains open.

## Verified project

- Repository: https://github.com/jaissatish-web/GCC-MENTOR
- Production: https://gcc-mentor.vercel.app/
- Vercel project: `prj_Mt6ZTyAvir1YtVzMUHXH1qRb7vGo`, team `team_Oy36LlKKq635Wf7QOJG1P0XT`.
- Production deployment: `dpl_4UamzS3zcaELLvizgkQtM7mttqLq`, READY, production alias confirmed by Vercel connector.
- Baseline main SHA: `7236d4455ea924df7c207ca0f05770a5fd0804ce`.
- Clean checkout before work. Working branch: `redesign/landing-transformation-20261011`.
- Actual stack: Next.js 15.5, React 19, TypeScript, Tailwind 3.4. Older project recollections about Next.js 14/React 18 do not describe this checkout.

## Current architecture and reusable foundations

| Concern | Existing source | Decision |
| --- | --- | --- |
| Home route and search metadata | `app/page.tsx` | Preserve route and metadata structure |
| Active landing composition | `components/landing-v3/LandingPage.tsx` | Extend this implementation |
| Public nav, FAQ and demo pricing | `components/landing-v3/Sections.tsx` | Refine nav; replace demo pricing claims with verified availability |
| Global typography and semantic colors | `app/ui-system.css`, `app/globals.css`, `tailwind.config.ts` | Keep shared tokens; avoid changing authenticated pages unintentionally |
| Landing layouts and demonstrations | `components/landing-v3/launch.module.css` | Consolidate overlapping rules within landing scope |
| Real rotating resume previews | `components/landing-v3/DocumentOrbit.tsx` | Preserve renderers, center-inside-ring composition, full preview and controls |
| Globe | `components/landing-v3/GccGlobe.tsx`, `globeDots.ts`, `lazy.tsx` | Reuse canvas projection rather than add a heavy 3D dependency |
| Application branching demo | `components/landing-v3/ApplicationStudio.tsx` | Expand existing fictional candidate demo |
| Interview walkthrough | `components/landing-v3/InterviewPreparation.tsx` | Upgrade with verified voice/report capabilities |
| Founder, barriers and privacy | `components/landing-v3/MarketingStory.tsx` | Refine and remove duplicate storytelling |
| Public footer | `components/layout/AppFooter.tsx` | Preserve service routes; audit landing-specific styling |

## Findings and implementation decisions

1. The hero primary CTA currently goes to `/signup`, not free readiness. Make `/gulf-readiness-score` the primary entry, retain sign-in and direct signup options.
2. The orbit is present below interview, barriers, services and application studio. It is absent from the hero. Introduce a measured hero composition that shows real templates without mounting two simultaneous copies of ten full renderers.
3. `GccGlobe` is implemented and lazy-exported but not mounted by the live `LandingPage`. Restore a destination section with six selectable countries and maintainable preparation guidance.
4. The hero is dominated by a five-line headline at the observed desktop width. Refine the headline to the approved preparation message, improve scanning and give the CTA room. The actual live screenshot shows the navigation's Start free label visually unreadable against its button; inspect computed styles and correct within landing scope.
5. Readiness appears late and has a generic icon rather than a useful preview. Bring it into the early story, show the actual dimensions, and preserve the existing funnel.
6. ApplicationStudio already illustrates three roles with one profile, CV, cover letter and preparation. Preserve its fictional-data notice and add clearer saved application/progress outputs and connectors.
7. No dedicated truthful before/after CV comparison, cover-letter section or Q&A study library is currently mounted. Build those as interactive marketing demonstrations without invoking live AI or reading candidate records.
8. LinkedIn and NaukriGulf services exist but are absent from the principal landing story. Show editable output/guidance; do not imply automated external-profile editing or official partnerships.
9. The interview walkthrough is useful but lacks the rich voice-session and feedback presentation requested. Use existing interviewer assets and actual report dimensions.
10. Founder credibility is below the fold and the founder block shows initials and an industrial image. No clearly identified authentic founder portrait was found in the inspected assets. Use an explicitly labeled photograph placeholder; request a genuine photograph when the founder section is built. Do not substitute a generated portrait.
11. Pricing is explicitly demo-only in `PricingPreview`: ₹999/₹1,799/₹2,999. These are not verified purchasable catalog prices. `lib/pricing.ts` reads database values and has a ₹499 resume-optimization fallback, which also is not proof of the current live price. Settings says card payment is not switched on; access is granted directly or via codes. Do not advertise these demos as live checkout offers. Reuse a verified public catalog if available, otherwise describe service access without invented prices.
12. There is no obvious current About/blog/knowledge route in the inspected App Router page inventory. Use real sections/routes only; do not add links to invented resources.
13. No verified customer testimonials were found. Preserve honest demonstrations and founder credibility instead of fictional reviews.
14. Current landing CSS uses the shared system but contains successive layout overrides and older prototype primitives. Refine these in landing scope; do not replace the brand with generic navy/dark styling or restyle resume documents.

## Verified capabilities and permitted claims

| Capability | Evidence | Landing claim |
| --- | --- | --- |
| Templates | Executed `availableTemplates()`: 50 available, zero missing renderers | 50 professional resume templates |
| Real categories | Registry: professional, ATS, engineering, executive, senior, minimal, entry | Use only these categories, or verified field filters |
| Orbit sample | Ten actual registered templates with fictional sample CVs | A representative selection; not all 50 simultaneously |
| Interview Q&A | Prompt targets 25; validator permits 15–25, UI says up to 25 | Up to 25 questions per set; additional saved sets |
| Mock sessions | UI options 5 Quick / 10 Standard / 15 Deep | 5, 10 or 15 questions; standard defaults to 10 |
| Interview modes | HR, technical, Gulf readiness, manager, mixed | Role-focused practice with selectable modes |
| Report dimensions | `MockInterviewFinalReport` | Overall, technical, role fit, Gulf readiness, answer structure |
| Voice feedback | `VoiceFeedback` | Transcript, score, feedback, suggested answer, follow-up and grammar corrections |
| Delivery metrics | `lib/voice/audio.ts` | Words per minute when duration is available; pause metrics only with timing, transcript filler count |
| Unsupported inference | Explicit restrictions in `lib/voice/review.ts` | No acoustic confidence, emotion, accent or pronunciation claims |
| Gulf countries | Existing UI and globe configuration | Saudi Arabia, UAE, Qatar, Oman, Kuwait, Bahrain |
| Founder | User-provided professional background | Approximately 15 years, engineering/commissioning and Gulf project exposure; no employer endorsement |

## Readiness and signup behavior to preserve

The public upload/paste screen successfully opened via the existing readiness CTA. It says two questions, no signup required to see the score, PDF/Word upload up to 4 MB, and that the anonymous check is not saved to servers.

`app/api/gulf-readiness/route.ts` extracts resume text and calls `lib/gulfReadiness/engine.ts`. It does not call a model or store an anonymous resume; only a rate-limit counter is touched. The result, answers and text are retained in tab-scoped sessionStorage by `lib/gulfReadiness/handoff.ts`. Onboarding transfers these into its existing report/profile preparation flow. This is distinct from the older anonymous ATS-session claim route; do not conflate the two.

The dashboard and Career Profile use `scoreProfileReadiness` from `lib/gulfReadiness/fromProfile.ts`, which calls the same `calculateGulfReadiness` engine. Shared rules are confirmed. Identical scores cannot be promised when extracted profile facts differ from original resume-text evidence; the redesign introduces no scoring changes.

Actual dimensions: Gulf Market Position, Work Experience, Skills, Education, Certifications, Gulf CV Essentials, Resume Quality & Targeting. Scenarios: In the Gulf Market, Gulf Returner, Experienced Professional, Early Career. Demonstrations must match these and label example scores illustrative.

## Brand foundation

Keep Inter and existing semantic tokens. Current brand is deep green `#0F4C43`, canvas `#F8FAF9`, white surface, ink `#14181C`, muted `#616B76`, gold `#C9962E`. Navy may support selected immersive visuals, rather than replace the primary brand. Gold provides restrained emphasis, teal/green progress, red errors and gaps.

Use the existing 44 px minimum control height. The current mobile hero token is 32 px, below the requested 34–42 px range; adjust a landing-specific role in the centralized system without enlarging authenticated page headings. Reserve visual dimensions and keep document typography excluded from UI rules.

## Verification evidence and limits

- `npm ci --ignore-scripts`: completed; lockfile unchanged.
- `npm run typecheck`: PASS.
- `npm run lint`: PASS, no ESLint warnings/errors; Next lint emits its existing deprecation notice.
- `npm test`: PASS, 60/60 checks. Includes readiness, profile/import, optimizer grounding, templates, voice/history and disposable database security checks. These do not prove authenticated production services end-to-end.
- Live desktop rendered viewport inspected: 1363 × 936. Reported document scroll width 1348: no horizontal overflow at that viewport. Hero typography measured at about 64 px, section titles 32 px. See `baseline-desktop.jpg`.
- Readiness CTA navigation verified to the actual upload/paste screen.
- Browser log inspection found a Chrome extension metadata error, not an application-source error. No application error appeared in the inspected log window; this is not a full-page error guarantee.
- Lazy images not yet loaded at the hero were not classified as broken assets.
- Mobile CSS and breakpoint logic inspected. The current cloud browser interface does not expose viewport resizing; a DevTools keyboard attempt did not provide responsive controls. Rendered tests at 360, 375, 390, 430, 768, 1024, 1440 and 1920 px remain OPEN. Do not claim mobile screenshots or full responsive validation from source review.
- Build, Lighthouse/Core Web Vitals, full keyboard walkthrough, touch/swipe, authenticated regression, preview and production-release verification remain open for later stages. No measured performance score is available.

## Ten reviewable stages

| Part | Scope | Reviewable result |
| --- | --- | --- |
| 1 | Repository, architecture, live baseline and capability audit | This report, baseline screenshot and safe branch |
| 2 | Landing token refinement, nav, hero and compact founder statement | First screen and working readiness CTA |
| 3 | Preserve/upgrade orbit, real template counts, touch and preview | Interactive resume universe |
| 4 | Problem narrative and real-dimension readiness preview | Early conversion story |
| 5 | Application branching and truthful CV before/after | One profile, separate preparation packages |
| 6 | Cover letter, Q&A study library, LinkedIn/NaukriGulf | Clear service demonstrations |
| 7 | Mock interview interface, feedback and comparable progress | Flagship practice section |
| 8 | Globe, existing guidance links, founder, privacy, pricing, FAQ/final CTA | Complete landing story |
| 9 | Responsive matrix, a11y, build, performance, regression checks | Evidence and corrected defects |
| 10 | Actual preview review, controlled production release | Confirmed commit/deployment and final evidence |

User requested checking the result after each completion. Present one stage at a time; keep intermediate changes on the redesign branch. Production merge follows successful full validation. Part 1 changes documentation only, with no production release.

## Explicit preservation boundary

Do not change schema/migrations, Supabase clients, middleware, authentication, payment/credit logic, stored user data, AI processing, resume generation algorithms, or template content. Existing profile/readiness handoff, library, cover letters, interview services and external-profile guidance stay intact. The historical phase limitations in archived RULES predate the user's explicit current landing assignment; no backend or security-sensitive work is introduced by this audit.
