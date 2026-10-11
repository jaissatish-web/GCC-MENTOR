# GCC Mentor landing page — implementation and CTO review

## Brief and implemented direction

A fresh marketing composition built around “Your experience. More Gulf opportunities.”

The narrative moves from the visitor's ambition to four practical questions, then shows one reviewed Career Profile feeding multiple job-specific applications. Interactive Engineering, Finance and IT examples make the branching workflow tangible. Each target role shows a CV, cover letter and interview preparation. Examples are explicitly illustrative; role suitability depends on the candidate and job requirements.

The visual system uses warm ivory, forest green, muted botanical surfaces and Dubai skyline photography. Desktop uses an editorial split hero; phones use a stacked hero, full-width primary action and sequential workflow. Service cards become single-column below 400px. Existing navigation, mobile section menu, pricing access information, FAQ and mobile sticky signup remain available.

The rotating collection continues to render real resume templates with existing pause/play, previous/next and full-size preview controls. Template implementation and sample CV contents were not edited. Landing typography rules explicitly exclude descendants of the template preview containers.

## Marketing review

- The hero identifies the product purpose and the primary action.
- Pain points lead to specific outputs: readiness, CV relevance, cover letters and interview practice.
- “One profile, multiple roles” is demonstrated rather than only stated.
- Three steps explain upload/review, job targeting and preparation.
- The readiness CTA supplies a lower-commitment starting point.
- No invented customer counts, reviews, recruiter endorsements, hiring guarantees, score predictions or new checkout claims.
- Existing pricing and checkout status are retained.
- Gulf positioning includes the six GCC markets and destination imagery.
- Application examples do not promise eligibility for unrelated roles.

## Technical review and validation

- Server-rendered marketing content; client state is limited to the career-example tabs and retained interactive components.
- Tabs have keyboard arrow/Home/End navigation, selected state and an associated panel.
- Main actions and new tab buttons have touch-sized controls and visible keyboard focus.
- The existing orbit honors reduced motion and pauses offscreen.
- Heavy resume previews retain dynamic loading below the fold.
- No API, authentication, database, payment, profile storage or resume export changes.
- TypeScript check: passed.
- Repository checks: 49/49 passed.
- Production build: passed.
- Lint: passed without warnings or errors.

## Review limitation

The managed environment does not expose the required control-browser capability. Mobile and desktop browser QA, screenshots, hydration interaction checks and visual sign-off were therefore not performed. Responsive rules were reviewed in source, but the landing page is not yet fully visually signed off. Recheck at 360/390/430px phone widths and 1280/1366/1440px desktop widths after deployment, including the career tabs, resume controls, full-size dialog and sticky mobile CTA.
