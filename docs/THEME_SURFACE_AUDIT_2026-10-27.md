# THEME-SURFACE-001 — current theme surface consistency

27 October 2026. Approved by Satish: inspect pages, services and supporting UI for white backgrounds that conflict with the current navy/blue/cyan theme and correct them. Source implementation completed; release evidence is recorded in the delivery PR.

## Scope and acceptance

Use existing surface, canvas, line, text, brand and status tokens. Correct UI cards, fields, tabs, menus, loading panels and service reports at their source. Keep 44px targets, typography, routes and behavior. Preserve actual resume/PDF/DOCX/template paper, document previews, profile preview mock papers and exported content. Do not use a blanket white-background or inline-style override.

Inventory routes under app/**/page.tsx and shared components. Verify shared bg-white bridges before assuming a literal utility is an active white surface. Record remaining exceptions and verification limits. Relevant checks: source diff, typecheck/lint/build by lead, regression suite and representative browser service/report checks. Source inspection alone is not visual certification.

## Source findings

The existing bg-white utility bridge already maps most cards, native controls and shell surfaces to navy. Escapes occur in authored CSS and inline styles: Q&A question cards/tags/actions; library count badges; template preview action; cover-letter email panel/editor; legacy dashboard/date cards; How-it-works social/pill mixes with white; ProcessingInline gradient; interview progress skill cards/timeline controls. Protected paper previews are intentional exceptions.

## Route inventory (source review)

- Authentication: login, signup, forgot-password, auth/update-password — shared auth/surface tokens.
- Dashboard: main, library, tools — new Home tokens; library badge and shared legacy dashboard/date surfaces corrected.
- Career Profile: profile, profile/visibility, onboarding, create-resume, professional-profile — shared UI tokens; editor backgrounds protected by shared surface styles.
- Optimizer: target, setup, generate/[packageId], pay/[packageId], preview/[packageId], package/[id], package/[id]/edit — shared cards/ProcessingInline; authored resume paper retained.
- Services: cover-letter, interview-qa, mock-interview, LinkedIn and NaukriGulf guide/workspaces — correct Q&A, email and practice report escapes; illustrative LinkedIn paper retained.
- Public intake/results: ats-scan, gcc-readiness, gulf-readiness, gulf-readiness-score, onboarding/report, onboarding/extracting — shared cards and loading styles.
- Other: preparation-pack, templates, resume-design-lab, settings, payments, legal pages, admin and admin content/services/users/packages/plan/prompts/promo-codes/ai-provider/access-log — shared utility bridge or current module tokens; actual documents and template lab paper retained.
- Public landing: active app/page.tsx uses landing-v3 tokens. Old landing-premium stylesheet has unused/light historical declarations; inspect imports and active consumers before changing these.

## Implemented source changes

- app/ui-system.css: Q&A show-all/question/tag surfaces, library service-count badges, template preview action, tool border blend, cover-letter email/editor use current surface/line tokens.
- components/dashboard/career-home.module.css: legacy cards, rows, reminders and desktop columns use navy surfaces; date notices use existing readable accent/error tokens.
- components/journey/how-it-works.module.css: social cards/topic pills/output-open borders mix with themed surface/line instead of white.
- components/ui/Processing.tsx: inline loading gradient uses surface/brand-soft.
- components/mock-interview/InterviewProgress.tsx: skill/timeline cards, chart grid/labels and points use existing surface/accent/line/muted tokens; comparison/scoring behavior unchanged. InterviewComparison itself already uses semantic classes and was left unchanged.
- components/package/ResultsOverview.tsx: summary review panel uses brand-soft instead of literal lavender.
- app/optimize/preview/[packageId]/page.tsx: keyword legend uses brand-soft instead of literal pale green.
- components/resume/ResumeDocumentView.tsx: fullscreen dialog canvas uses bg-canvas; nested data-document-preview paper remains unchanged.

## Retained exceptions

Auth and active landing CSS already consume shared dark tokens. bg-white utility selectors remap normal UI to surface, with explicit authored-document boundaries retained. The white/45 progress fill is a deliberate small neutral indicator on a dark track, not a page/card background. Tiny translucent white highlights (guide hero/processing-orbit shine), native portrait artwork and exported/preview document paper are intentional. The large legacy landing-premium/premium.module.css light design is not imported by the current app/page.tsx (active landing uses landing-v3); no dormant landing redesign was performed. Editor module white fallbacks sit behind defined surface tokens and do not resolve white in the current theme. Preparation-pack resumeFrame and LinkedIn profile mock-paper are document demonstrations, retained.

## Verification

Source-only route/style review completed. git diff --check passed. Focused dashboard rendering, interview-progress arithmetic and universal-theme boundary scripts passed. All new referenced tokens exist in app/ui-system.css. Lead owns final production build, full regression checks, representative browser inspection and release; this document does not claim visual inspection of every live route or a signed-in production account.

## Browser follow-up

Local LinkedIn workspace error state exposed an additional pale red alert (literal red-50) and source review found two amber-50 notices in the same shared LinkedIn/NaukriGulf component. Replace these with semantic alert-soft and gold-soft tokens, preserving message/handlers. The native NaukriGulf route is dynamic and needs a local component fixture for browser rendering; source coverage alone is not its runtime verification.

Browser utility review also found the scan-unavailable error heading inheriting a dark body foreground outside AppShell. Give that error main the existing text-ink role; successful report already has it. Settings/admin require a verified server session and are source-reviewed rather than represented by a guessed local account.
