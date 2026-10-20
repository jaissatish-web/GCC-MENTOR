# GCC Mentor mobile presentation refresh

Approved direction: option two, presented in `GCC_Mentor_Mobile_Design_Approval.html` (20 October 2026). The owner subsequently authorized implementation and integration into main.

## Design source of truth

`app/mobile-design.css` centralizes the approved mobile overrides below 768px. Existing desktop tokens and layout remain in place. Document preview and resume-render boundaries are excluded from UI typography and surface overrides.

| Role | Approved value |
| --- | --- |
| Primary action | #126357 |
| Primary text | #182A36 |
| Secondary text | #62717D |
| Canvas / surface | #F7F8FA / #FFFFFF |
| Selected surface | #EDF5F2 |
| Separator / input outline | #E1E7E7 / #7C8991 |
| Gold marker / gold text | #B88931 / #7A541A |
| Error / error surface | #A33A37 / #FFF0EF |
| UI face | Existing bundled Inter |
| Title / section / row | 24 / 18 / 16px, weight 600 |
| Body / input / label / helper | 15 / 16 / 14 / 13px |
| Main score | 32px, tabular numerals |
| Gutter | 20px; 16px at 360px and below |
| Control height / radius | 48px / 12px |

## Presentation changes

- Mobile brand header and four-item bottom navigation; current destination is announced with `aria-current`.
- Dashboard greeting, actual readiness scores, recommended action, continuation and grouped saved-work links. Missing data stays unavailable; no example scores are used in the product. Original-profile interview continuation uses the existing overview count and links to the saved-interview picker; the job-summary API excludes those originals, so no answer count or exact attempt is guessed.
- Original Career Profile and optimized resume library cards have distinct visual markers; existing names, actions and menus remain.
- Interview setup uses existing supported methods and hosts; voice availability checks remain authoritative. The interviewer grid uses existing portraits.
- Individual report scores, feedback sections, answer review, practice plan and navigation retain the saved report fields. Mobile report sections use grouped rows and restrained surfaces.
- Completed-session comparisons and charts retain the existing matching rules. On mobile, progress precedes the history list.
- Profile import comparison initially collapses on phones, with its pending/reviewed status still visible. Desktop retains its existing first-visit expansion. Save/confirm and wording decisions are unchanged.
- LinkedIn and NaukriGulf show the existing workspace action near the top. Stale saved content is flagged before the copy-ready headline.
- Mobile public/auth presentation uses the same palette and controls; existing landing demos, globe, document orbit and all links remain.

## Preserved functions and boundaries

No changes to API routes, middleware, authentication actions, Supabase configuration, schema/migrations, AI models/prompts, scoring, credit accounting, pricing, or stored user data. No template renderer, document/export component, template style or template catalog source is edited.

All existing routes remain. Profile upload/paste/manual entry, correction review, saving, resume selection/preview/edit/download, ATS matching, optimization levels and confirmations, cover letter, Q&A, recorded/text interview modes, host availability, question counts, saved history, reports, comparisons, readiness recommendations, professional profile editing/copying, templates, tracking and settings remain connected to the existing handlers.

## Verification boundaries

Browser fixtures load real React components or built pages with fictional local API replies. Fixture values and screenshot data are test inputs, never production user data or product defaults. No real AI review, paid service, microphone recording or production account mutation is requested by those tests.

A successful local check does not establish live authentication, provider, storage, payment or recording availability. See `design-qa.md` for outcomes and remaining limitations. No claim of a measured 95% pixel match is made.
