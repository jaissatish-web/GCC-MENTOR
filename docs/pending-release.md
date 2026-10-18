# Combined release — 18 October 2026

Satish authorized publishing all three changes together on 18 October 2026.

1. Gulf Templates: move “View selected design full size” beside “Preview my resume” inside the existing sticky action bar. Keep full-size preview available while resumes load and for users without resumes. Remove the duplicate scrolling gallery action. Preserve full-size preview in other TemplatePicker consumers.
   - Implemented locally on `pending-template-updates`.
   - Validation: TypeScript check passed; ESLint passed for both changed TSX files.
   - Included in the authorized combined release. Base commit: `9837c7e`.

2. Mobile Tools: replace the duplicate right-side drawer with a dedicated `/dashboard/tools` page. Display seven existing services as responsive cards under Premium Services; reserve Free Services for later. Keep More as the navigation drawer and preserve all existing service routes and access rules.
   - Included in the authorized combined release.
   - Validation: TypeScript and targeted ESLint checks passed. Cards use one column on phones, two on tablets and three on wide screens. No payment or service logic changes.

3. Dashboard “How it works” CTA: upgrade its existing guide with a branching journey diagram and interactive sample-user simulation, keeping the Services directory available.
   - Flow: upload/paste/type → review → Career Profile → LinkedIn/NaukriGulf branches and Job Title + Job Description → numbered jobs 3.1/3.2/3.3 → optimized CV and multiple cover letters/Q&A sets/mock sessions.
   - Only Mock Interview contains the practise/review/improve/repeat/progress loop. Q&A explains Gulf-standard, profile/job-specific preparation topics without promising exact interviewer questions.
   - Clearly fictional sample data; job/service/version/set/session selectors and a sample progress chart. Switching jobs resets dependent selections. No account writes, generation or credit usage.
   - Validation: TypeScript, targeted ESLint, existing journey-guide checks and isolated selection-transition regression checks. Browser verification follows production deployment.
   - Included in the authorized combined release.
