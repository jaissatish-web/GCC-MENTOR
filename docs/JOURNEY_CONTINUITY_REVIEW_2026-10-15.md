# Journey continuity review — 15 October 2026

Review branch: `journey-continuity-review`. Main remains unchanged. This is a branch-testing candidate, not a production release approval.

## Product outcome

Users can choose an application, a general CV, interview practice, or recruiter-profile preparation. One tab-scoped application selection follows the user through the sidebar and service pages. Home and the sidebar derive their next recommendation from the same selected application and goal.

The CV setup has its own three clearly named steps. Moderate is recommended, comparisons and advanced options are optional disclosures, and target-job drafts save while typing. Service headers retain the existing compact layout. Old default CV names display as My General CV without overwriting custom names or saved documents. Changed professional-profile drafts ask users to refresh rather than describing stale content as ready.

## Engineering review

- Shared application state replaces duplicate navigation/picker requests. Only IDs and the chosen goal are stored in sessionStorage; loaded summaries are authenticated and user-scoped.
- Explicit package links take precedence on entry. Missing IDs produce recovery guidance. Changing application clears the previous mock run query. CV selection is disabled during letter, Q&A and mock generation.
- Existing API ownership checks, idempotent general-CV creation, saved outputs and generation logic remain in place. No schema migration, billing change, model/prompt change or production configuration change.
- Deferred points 3 (downstream grounding redesign) and 9 (interview content/feedback redesign) are excluded.

## Verification evidence and limits

TypeScript, lint and the production build passed. The build used synthetic configuration, so it proves compilation rather than provider connectivity. The full regression suite includes 65 checks; added cases cover A/B/general/unavailable application selection, encoded links, goal routing, pending-profile precedence, selected-application next actions and historical/custom CV names.

Live preview walkthrough: homepage Start preparing and optional readiness entry; successful email/password sign-in; goal chooser; interview goal routing; general-CV continuity through Mock Interview → Q&A → Cover Letter; Home/sidebar next-action agreement; target-job text saved before Next, retained after Home and return; simplified rewrite-style screen. Temporary demo job text was cleared. Remaining old labels found during the walkthrough were corrected afterward.

The authenticated account had one general CV and no optimized applications. A/B selection is covered by automated logic checks but still needs an account with two saved applications for browser acceptance. Fresh-account onboarding, mobile-device interaction, stale saved professional drafts, accessibility with a screen reader, and complete live AI generation are not certified by this walkthrough.

Preview generation is blocked until the preview has its required server-side configuration, including SUPABASE_SERVICE_ROLE_KEY. Do not interpret an unavailable preview mock generation as proof of a main-branch failure. Production secrets were not broadened to all previews.

## CTO acceptance before merge

1. Configure a controlled preview environment with generation access.
2. With two demo applications, select A, navigate all preparation services, select B, and confirm both header and service picker change together; repeat using general CV and browser Back.
3. Complete typed and voice mock interviews, including microphone-denied recovery, save/reopen reports and resume an interrupted attempt. Check that credits and artifacts belong to the selected application.
4. Complete upload → profile review → target job → rewrite → CV, then letter/Q&A; verify downloads, persistence and profile-refresh behavior.
5. Repeat on a small real mobile viewport and with a fresh test account. Confirm readable labels, keyboard access, errors, loading and no horizontal overflow.
6. Merge only after branch acceptance, then run a production smoke test.

## CEO assessment

The changes address confusion about where to start, which CV a tool uses, what to do next and whether unfinished work was saved. The next commercial evidence should be first successful preparation, completion time, service failure rate, interview completion, repeat use and a short post-task ease rating from real GCC users across professions. This release does not establish user satisfaction or a number-one market ranking; those require measured user outcomes and market evidence.

## Visual refinement — same review branch

The career guide now uses a plain light header, a short title and compact service labels. On phones, guide cards stack vertically and the overview uses two columns. The guide remains scrollable, keyboard dismissible and supports reduced motion; its links still open the existing services.

Service colours reuse the navigation tokens: violet for the profile, blue for saved CVs, green for tailoring, rose for letters, indigo for Q&A, plum for mock practice, blue for LinkedIn and orange for NaukriGulf. They appear in labelled icons and restrained card edges. Primary action buttons retain the brand green. Do not use these service colours to indicate success, errors or completion. Keep document/template styling isolated.

Dashboard preparation cards have shorter supporting copy and distinct icons. Goal cards show their service icon and selected state. Shared service headings identify the tool without adding a large promotional card. Select fields have a light tint; focus outlines and 44px primary tap targets remain visible. Mobile spacing is scoped to the application rather than the landing page or CV exports.

The nine service text/background token pairs were checked mathematically: contrast ranges from 4.52:1 to 6.41:1. This is a palette check, not full accessibility certification. Type checking, lint and all 65 regression checks passed after the visual changes. Browser verification uses synthetic component data where appropriate; it does not certify AI generation or user satisfaction.

Narrow-screen browser review used the real guide, shared header, card, select and dashboard activity components inside 390px and 320px frames. The guide had matching client/scroll widths (372/372 and 302/302), with vertical scrolling and no horizontal overflow. The service directory opened successfully. At 320px, the two view labels wrapped; they were shortened to Steps and Services afterward. Synthetic activity fixtures avoid private user data. This checks responsive components rather than a physical phone, full mobile navigation or every service result state.

## Whole-app reading scale

The follow-up typography pass changes the shared system rather than isolated guide cards. Mobile page titles are 22px/600 (formerly 26px/700); section headings 18px/500; card headings 16px/500; body copy 15px/400; helper copy 14px/400; buttons 14px/500. Desktop page titles are 24px/600, sections 20px/500. Form inputs remain 16px to preserve typing usability. Score-ring numerals now follow the shared scale instead of a separate 34px override. Existing document/template exclusions and export typography remain in place.

The public homepage had a separate blue theme and 750-weight headings. It now uses shared teal/gold tokens, a 28px/600 mobile hero, 22px/500 mobile section headings, and restrained desktop headings. Photography, product demonstrations and interactions remain. The guide header restores the reference's dark teal gradient, gold details and light copy, with the compact layout. Card edges are quiet 1px rules rather than prominent coloured stripes. Continue to use labels, spacing and hierarchy to distinguish tasks; avoid bold text as the default for paragraphs.
