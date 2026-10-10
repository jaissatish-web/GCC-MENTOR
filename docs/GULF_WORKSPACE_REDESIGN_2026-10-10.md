# Gulf workspace redesign — 10 October 2026

## Scope

Presentation and navigation only. Preserve Career Profile extraction, validation,
scoring, generation, credits, service prerequisites, package persistence, explicit
save behaviour, photo persistence, document snapshots and PDF/DOCX exports.
No resume template renderer, display name, document text or business-library file
was edited. The rotating template showcase remains intact.

## Design

- Shared Inter text roles, 16px reading text, a 24/28px app title scale, consistent
  heading weights, spacing, fields and touch targets. Resume documents remain
  excluded from application typography rules.
- Warm light surfaces, teal app actions, restrained gold accents and one icon
  palette. Gulf context in shared service/flow headers, profile screens and footer;
  a restrained arch motif on the next-action panel and six GCC markets in the rail.
- Home leads with one next action. Application progress is expandable; the profile
  CV path is compact; recent existing CVs have direct links. Scores are smaller.
- Profile leads with identity, Save and one completion indicator. A section list
  opens existing editors directly. Detailed scores, CV visibility and career
  facts remain accessible under Profile insights.
- Desktop CV preview uses a document canvas and settings rail. Mobile uses one
  mounted settings tree inside a native dialog, with Templates/Text/Photo categories,
  focus containment, Escape, focus restoration and a return to the preview.
  Save/download controls remain visible while scrolling and obey the same gates.
- Interview/report controls use the shared text roles; the score summary wraps
  safely with enlarged text. Reports and report-sharing data stay unchanged.
- The public homepage keeps the hero, services, journey, actual template orbit,
  before/after, interview example, founder, markets, pricing and FAQ. Supporting
  explanations are expandable. Fragment links open the relevant example directly.

## Verification

- Production Next.js build: compilation, TypeScript and lint.
- Existing deterministic/database suite: 49/49 checks.
- Shared UI and landing: 320–1440px coverage, enlarged text, document/font isolation
  and minimum 44px controls.
- Built Home/Profile/landing: new, saved and failed-load states; mobile More retains
  all services; keyboard focus/Escape; reports, profile insights and examples.
- Actual raw/tailored preview with isolated APIs: template/style/name changes,
  explicit save, failed save/retry, in-flight save, concurrent edits, reset, undo,
  gallery/reload, all 50 designs, mobile settings, focus return, persistent photo
  uploads, and visible save/download controls after scrolling.
- Interview UI fixtures: saved report text, result and answer navigation, practice
  setup, charts, six widths, enlarged text, reduced motion and no AI writes.

Authenticated UI tests use synthetic isolated API replies. They do not claim a
full signed-in production run against real user data or paid AI services.
