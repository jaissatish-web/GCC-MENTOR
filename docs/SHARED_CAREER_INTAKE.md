# Shared career intake

## User flow

1. Upload PDF (4MB), Word (2MB), or paste resume text (20,000 characters).
2. Extract one structured draft through the existing resume pipeline.
3. Confirm present situation and Gulf preparation in two short panels. A third panel appears only for missing contact, education or preparation details. Uncertain answers can wait.
4. Show two distinct results from that same draft: Gulf preparation awareness and preliminary career-data completeness. Consequential preparation gaps remain visible; full career detail is unlocked after signup.
5. Signup carries the draft into an authenticated pending review without another AI extraction for a first profile. The user reviews missing or uncertain fields and explicitly confirms before the Career Profile is saved.
6. Dashboard and profile use the same readiness functions. Job descriptions are requested only inside Resume Optimizer.

## Meaning of scores

Gulf preparation checks profession, present location, Gulf work history, country preference (including all six countries or undecided), qualification, passport and expiry, relevant visa status, availability, applicable registration awareness, resume information, later resume improvement, and date of birth. Context such as age, location, history and service usage does not earn points. The number is prepared scored items divided by applicable scored items. Unknown items are labelled unrecorded, and any unknown produces a provisional result. This is awareness, not verified immigration or professional eligibility. Registration awareness is a basic role/country heuristic, not a complete legal catalogue.

Profile Readiness measures captured career data. With employment history or a declared experienced stage: contact 25, education 20, skills 20, employment detail 35. Without employment history: contact 25, education 35, skills 30, professional background 10. A declared absence of formal education closes a data question without inventing a qualification. Optional certificates, visa status, target company and purchases do not penalise the score. A complete captured draft still requires user review.

## Reuse and persistence

Known contacts are reused. WhatsApp offers the phone number already held or a separate number. Employment without an end date is not assumed to be current unless source wording or user confirmation supports it. Review confirmations use value-bound hashes in the existing browser record; changed facts require a new confirmation. This does not synchronise confirmations across devices.

Guest career facts and answers stay in tab-scoped session storage before signup; the configured AI provider necessarily processes the submitted resume. Anonymous rate-limit accounting remains server-side. Attempted model readings count against the daily allowance, including provider failures. Invalid submissions are rejected first. The signed-in claim verifies ownership and only accepts a first profile; returning profiles use the existing quota-controlled merge/replace/keep import. Private preparation metadata is hidden from resume output and category prose. No database migration is required.

## Verification

Domain and API checks cover facts reuse, independent scores, unknown versus unmet, age neutrality, optional certificates, regulated-role awareness, no duplicate AI extraction on first-profile claim, authentication and returning-user protection. The browser regression uses actual React components and PDF/Word parsers with a synthetic AI response. A local synthetic preview also exercises the clarification and review screens. Production signup, provider extraction quality, delivery emails and cross-device authenticated persistence still require a configured live/staging account check.

## 2026-10-27 — READINESS-CONTRAST-004
Approved: fix unreadable box titles/field labels after resume processing in the public readiness journey. Labels and legends must consume live semantic ink tokens, including outside the signed-in app wrapper; headings retain the shared scale. Scope: shared field label/hint CSS and explicit intake heading color. Preserve questions, navigation, extraction, scoring, storage, authentication and resume documents. Acceptance: labels and headings readable on current surfaces at mobile/desktop widths. Verify compiled CSS contrast and repository typecheck/lint/build. Status: approved, implementation pending.

READINESS-CONTRAST-004 implemented: `.field-label` and `.field-hint` now resolve semantic CSS variables instead of Tailwind's baked legacy ink. Intake page heading explicitly uses theme ink. Production build, typecheck and lint passed. Browser PDF/DOCX/paste flow passed at 320/390/768/1440px, including rendered label/legend color assertions, invalid files and retry (synthetic AI response; actual parsers). No live provider/account verification claimed. Full regression suite result recorded below.
