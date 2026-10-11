# GCC Mentor landing page — people-led revision and CTO review

## Current implementation

The user requested helmeted candidates, stronger marketing and trust content, data control, guided preparation, customer voices and a photograph showing one profile supporting multiple applications.

Headline: “Your Gulf ambition. Prepare for the job. Practise for the interview.”

- Custom AI-generated photograph of three engineering candidates in safety helmets at a Gulf project, used in the hero and the application-path visual. Clearly labelled as illustration, not actual customers.
- Founder story: Satish Kumar Jaiswal, 15+ years of engineering and commissioning experience including Gulf projects. Industrial backdrop is not presented as a founder photograph.
- Why good experience can be overlooked: generic CVs, unclear contribution and preparation stopping at the CV. No unsupported claim that most candidates fail or any fabricated failure percentage.
- Service solutions: readiness, job-specific CVs, cover letters, Q&A and mock interviews.
- One profile → three example target applications, combining candidate photography and accessible HTML labels. An interactive JD-specific application studio replaces the repeated static scene.
- Existing rotating resume collection, preview controls, sample CVs and template implementation retained.
- Dedicated privacy/control section: signed-in workspace, reviewing changes, choosing where to submit and deleting Career Profile data/saved packages from Settings.
- AI processing disclosed: relevant information is sent to configured AI providers. No unsupported “zero sharing” promise. Login and operational records are not described as deleted by the profile deletion action.
- Customer-voice area contains clearly labelled common questions and a feedback invitation. No verified publishable testimonials were located in the repository, so customer quotes, names, ratings and results were not invented.
- Navigation includes Why GCC Mentor and Privacy section anchors.

## Image provenance

Asset: public/landing/gulf-candidates-v2.webp
Created using the built-in image-generation tool; optimized to a 146 KB WebP.
Prompt: Premium authentic editorial landscape photograph of three South Asian engineering professionals, two men and one woman, ages approximately 28–40, in white safety helmets and reflective vests reviewing a tablet at a modern Gulf industrial project, warm dawn light, subtle skyline, forest green and sand palette, natural faces/hands/PPE, no text, logos or testimonial claim. Illustrative personas, not actual customers.
Original generation retained separately; the website references the repository asset.

## CTO review

Marketing copy explains purpose, preparation gaps, solutions, workflow, provenance and control without invented outcomes. Testimonials remain pending real feedback and publication permission.

Data-control wording was checked against app/settings/actions.ts and components/settings/DeleteDataSection.tsx. AI-provider processing was checked against lib/ai/provider.ts. No backend, auth, payment, data-storage or generation logic was changed.

Marketing content remains server-rendered. Heavy template rendering remains dynamically loaded below the fold. The new scene uses actual HTML labels rather than text baked into an image. Landing CSS continues to exclude template preview descendants. Mobile stacks the photographs, application cards and trust sections, retaining usable touch targets.

Validation: TypeScript, lint, production build and repository checks are run for this revision. Final results are reported with the release.

## Verification limit

The required control-browser capability is unavailable in this managed environment. Browser screenshots, responsive rendering and hydrated interaction QA could not be performed. Source review and build checks do not constitute complete mobile/desktop visual sign-off.

## Interview-first revision

Interview preparation is now the hero promise and the first full section after the GCC markets strip. The page demonstrates a supportive preparation cycle, an AI-guided HR-style answer review and illustrative saved-score progress.

Claims were checked against app/mock-interview/page.tsx, components/mock-interview/InterviewProgress.tsx, InterviewAnswerCards.tsx and the report validator. Existing progress compares matching resume/settings and supports five score areas, improvement guidance and saved attempts. The landing preview labels scores as illustrative and acknowledges scores may decrease. Confidence is presented as a preparation goal, not a measured confidence score or guaranteed outcome. AI review is not represented as a human recruiter review.

This change does not alter interview service behavior or resume templates. Browser visual QA remains unavailable.

## Reference-inspired mobile rebuild

The supplied blue mobile concept informs colour, hierarchy and product previews.
The actual page remains one responsive scroll, not three narrow desktop columns.
Existing helmeted-candidate imagery, founder experience, privacy explanation and
resume orbit are retained. ApplicationStudio demonstrates one sample profile,
three target JDs, individual CV and letter previews and per-role interview prep.
InterviewDemo cycles through practice, HR-style AI review and next improvement.
Manual selection stops cycling; Play resumes it. Off-screen and focused/hovered
demos pause; reduced motion disables automatic cycling and decorative motion.
Example content and scores are labelled. No fake customer counts, company
endorsements, testimonials, salary benchmarks or hiring probabilities are added.

Pricing cards are demo-only ₹999/₹1,799/₹2,999 with no checkout actions. Grow
package quantities remain undecided rather than invented. Billing is unchanged.

Validation: TypeScript, lint and all 49 repository checks passed. Production
build passed. Resume orbit and renderer source remain unchanged. Browser QA is
unavailable because control-browser is absent in this managed environment;
responsive layout and interaction verification are pending actual browser review.
