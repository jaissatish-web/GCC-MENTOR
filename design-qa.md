# GCC Mentor full brand rollout — 18 October 2026

final result: passed

## Visual target and scope

The approved emerald-led brand board is the reference, not a specification for changing service behaviour. Source: `generated_images/exec-cea834fa-d540-49e7-9712-63d0a0babad7.png` in the task workspace (1536×1024). The comparison image below includes that source and the rendered mobile implementation in one view.

The existing Next.js application retains its routes, authentication, data models, AI prompts, readiness calculations, exports, resume fonts, rotating template collection and globe. Shared tokens and components propagate the brand across service pages. Home, authentication, profile/import guidance, optimizer and public landing surfaces receive targeted changes. This is visual and navigation QA; it is not a new live AI-service or authentication integration test.

## Evidence

- `design-qa/brand-rollout/brand-comparison-final.jpg`: approved board beside the final mobile Home. Source board scaled to 1152×768; actual 385×834 content crop scaled to 355×768. The board is illustrative; dynamic job status, saved counts and existing navigation icons are intentional product adaptations.
- `design-qa/brand-rollout/home-final.jpg`: 390px mobile iframe and 850px tablet iframe in the same browser capture, 1× pixels. The native scrollbar takes 17px, giving a measured 373px mobile content viewport and no horizontal overflow.
- `design-qa/brand-rollout/landing.jpg`: full desktop landing hero and GCC destination band.
- `design-qa/brand-rollout/tools-320.jpg`: seven service cards, premium/free categories and one More menu at a 320px iframe width (303px content, no horizontal overflow).
- Additional local captures cover the resume target form, Interview Q&A, LinkedIn introduction, AuthShell and full-size orbit preview. Synthetic account data is used throughout the isolated preview. The auth capture checks the shared shell and controls, not a real sign-in submission.

## Iteration and fixes

The first comparison was blocked by a continuation card whose supporting copy and status rows pushed the service grid too far down the phone viewport (P1). The initial saved-card wrapper also consumed useful horizontal space (P2). The final implementation leads with the job and primary action; supporting instructions and status remain accessible in a native disclosure. Saved cards now use the full content width. The returning user's profile follows the task and saved work; a new user's profile creation remains first. Final recapture shows all four saved-work cards within the mobile viewport, with ordinary page scrolling and compact navigation.

A preview-only adapter for Next dynamic imports initially failed to load the document orbit. The adapter was corrected; no production orbit implementation was changed. The actual orbit subsequently rendered ten designs and opened the full-size document dialog. This infrastructure fix is separate from the visual iteration.

## Required fidelity surfaces

| Surface | Result |
| --- | --- |
| Typography | Inter verified in the browser; 26/32px application titles, 20/24px sections, 16px body and inputs, 14px controls/helpers. Document typography remains isolated. |
| Spacing | 16px mobile gutters, 24px page rhythm, 12–16px card corners. Main action height measured at 48px. Small navigation targets remain at least 44px. |
| Colours | Emerald actions, navy reading text, pale neutral canvas, white surfaces; coral letters, indigo Q&A, violet mock, blue LinkedIn, orange NaukriGulf and amber templates. Icons and labels carry meaning alongside colour. |
| Assets | Existing hero photograph, rotating real resume documents and globe retained. No placeholder or replacement artwork introduced. |
| Content | Existing service instructions and states retained. The optimizer has exactly two visible text inputs: job title and description. Home uses real state-derived destinations in production. |

## Interaction checks

- Home preparation details open and close; saved status becomes visible when expanded.
- Mobile More opens the service drawer and closes with its close button; only one More trigger appears on mobile Tools.
- Target form accepts title and description and enables Next when a title is present. No generation request was submitted in this preview check.
- Q&A renders the saved resume selector and service setup with its indigo identity.
- LinkedIn renders its blue identity, readable outputs and responsive action.
- How It Works opens and switches to Simulation; separate CV/service/session selectors remain available, including multiple Q&A sets and mock sessions.
- Landing template orbit renders and opens the full-size document preview.
- Inputs retain visible labels; focus, error/loading states and document isolation remain in shared components. No new app console errors after repairing the preview-only import adapter; browser-extension metadata messages are excluded.

## Code validation

- 69/69 existing deterministic and disposable-database checks passed.
- Dashboard checks passed again after the final Home layout refinement.
- TypeScript and repository lint passed.
- Production Next.js build passed; the final cached build is also checked before publishing.
- `git diff --check` passed.

No remaining P0/P1/P2 findings in the reviewed visual scope. Detailed live service execution is outside this styling release and is not claimed as re-tested.
