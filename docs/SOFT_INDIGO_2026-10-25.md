# Soft indigo interface — 25 October 2026

Status: implemented; visual QA and local checks passed, protected-main CI/release pending. Satish selected the typography, colour, theme and button design of https://app.skilldrift.ai/sign-in and asked to apply it to GCC Mentor. This supersedes the earlier emerald/no-blue requirement for application presentation. Existing authorisation to publish completed, verified work to main remains applicable.

## Reference and adaptation
Source screenshot: SkillDrift sign-in, desktop1363x936, captured in this conversation as skilldrift-signin-reference.jpg. Inter; promotional heading40px/800, form title26px/800, body16–17px/400, helper14px/400, field16px, labels15px/700. Indigo action#5B60F1, dark plum text#2B2640, secondary#58527A, near-white#FCFCFD surfaces, pale lavender#EEF2FF, border#E2E0EB. Controls12px corners, card24px, restrained shadow and460px form measure. Keep current user flows, labels, logo and genuine product imagery; do not copy SkillDrift branding, illustrations or passwordless login.

Apply this coherent system to landing, shared app/navigation, auth presentation, service controls, professional workspaces and representative reports. Preserve semantic red/amber/green status meanings. Keep mobile inputs at16px and controls at least44px. Align action groups and preserve narrow/enlarged-text reflow. The app remains a responsive working product, not a clone of the sign-in screen.

## Protected scope
No changes to app/api, lib, types, supabase, account actions, auth configuration, prompts, scores, storage, quotas, billing, candidate facts, exports, components/templates or components/resume. Preserve resume/template typography and colours at document boundaries. No dependency changes. This task does not claim to fix previously observed network or data-loading latency; avoid adding animation or runtime weight.

## Acceptance and verification
Central palette/type/control tokens drive shared components. Landing and internal pages show the selected indigo/lavender appearance; readable compact typography and consistent12px controls. Auth desktop uses a pale visual panel and460px form; phones prioritise the form. No fake product statistics or copied competitor assets. Check desktop/mobile/enlarged text, keyboard focus, contrast, primary interactions, field/card styles, CTA alignment and document isolation. Run typecheck/lint/full repository checks/build plus required CI. Capture and compare reference/implementation; report fixture testing separately from signed-in live persistence. Merge only after required checks, verify exact Vercel main deployment and live public UI.

## Ownership
Root: central tokens, typography, shared Button, integration, verification and release. Bounded collaborators: landing presentation; auth presentation; shared Career Studio/professional visual compatibility. Source changes and verification are pending.

Implementation evidence: root design-qa.md and design-reference/soft-indigo. Legacy competing root palette/typography declarations were removed; shared tokens now control the selected theme at all widths. Local80 checks/build and responsive/control/studio/document-isolation checks pass. Main release remains governed by required CI and production verification.
