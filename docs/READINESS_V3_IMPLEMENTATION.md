# Readiness v3 implementation — review branch

## Implemented

- Four-question free flow: Gulf experience, scenario follow-up, optional target country and role. “Not sure yet” is supported.
- The same saved result remains visible before and after signup. Signed-in details reveal detected evidence, gaps and the ranked plan. Top three actions are visible initially.
- Initial scores are explicitly provisional. They describe detected application information, not salary, hiring probability or verified job matching.
- Photos, Arabic and driving licences no longer affect the universal essentials score. Notice duration and visa category are not ranked. Email/phone can satisfy contact information; WhatsApp is optional. Nationality disclosure is no longer scored in essentials.
- Joining checks no longer override the application headline. Regulator/test keywords no longer prove a professional licence. Explicit target role takes precedence over old roles when classifying a profession.
- Dashboard cards include progress bars; detailed dashboard includes evidence and provisional assessment context.
- Explicit guest targets prefill first-time profile review only; existing profiles and historical titles are not overwritten.
- Existing manual entry, review/confirmation, merge/replace/keep, and quota mechanisms are retained.

## Remaining before describing this as the complete universal assessment

This release is an initial implementation, not the entire long-term scoring specification.

- Validate a versioned country/profession requirements catalogue with authoritative sources. Existing joining rules remain suggestions for review, not verified eligibility decisions.
- Replace the existing weighted-fill Profile Readiness rubric with agreed applicability and confirmation rules. Its calculation is unchanged here.
- Calibrate role-specific GCC scoring across professions, career changes and country routes. Existing resume detectors and scenario weights are retained, so all v3 results remain provisional.
- Add latest-title prefill and education-based role suggestions to the guest flow once the pre-result extraction sequence is designed; the present role question accepts explicit input or skipping.
- Complete live signup, profile-save and mobile visual verification in a configured preview environment.

No paid-plan changes, database migrations or production deployment are part of this branch.
