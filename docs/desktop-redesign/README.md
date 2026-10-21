# Desktop and services drawer release review

This update adapts the approved mobile direction to wider screens and restores the complete services drawer on every viewport. Screenshots use isolated fictional test data rendered by actual application components; they are not production account screenshots.

## Visual system

The workspace uses the approved teal #126357, text #182A36, muted #62717D, canvas #F7F8FA, white surfaces, separators #E1E7E7 and gold #B88931. Inter roles remain centralized: 24px page title, 18px section, 16px card title, 16px desktop body / 15px phone body, 16px inputs, 14px labels and 13px supporting text. Buttons are 48px; controls and cards use 12px radii. Desktop gutters are 32px. Mobile gutters remain 20px, or 16px at 360px.

Desktop keeps the existing sidebar, adds the same three-dot services button as mobile, and places the next action beside preparation and Career Profile. Tablet stacks these panels. Scores, totals, next actions and progression continue to use existing functions and data.

The right drawer contains all shared service destinations, Career Profile, Settings, a link to the existing Delete my data settings tab, and the original Sign out form. Delete navigation does not delete anything. Escape, close button and navigation restore focus; keyboard focus stays inside the open drawer. The long menu scrolls independently, including at 200% text and a 568px screen height.

## Evidence and verification

- `responsive-comparison.webp`: mobile at 390px beside the desktop adaptation at 1440px. This is a responsive comparison, not a pixel-match comparison between equal viewports.
- Dashboard and services screenshots at 360, 390, 430, 768, 1024, 1366 and 1440px.
- Empty-profile and failed-load dashboards at 360 and 1440px; enlarged-text drawer and normal mobile account controls.
- Profile, library, job details, tools, mock setup, interview result cards, feedback and interactive progress chart at desktop width.
- Production Next.js build, TypeScript, lint and 71/71 existing regression checks passed.
- Shared/public UI checks passed, including enlarged text and resume document font isolation.
- `page-check-results.json`: 114 page/width combinations passed, with no horizontal overflow or client exceptions.
- Actual interview components: 12 attempts, eight result categories, saved answers, answer tabs, score selection, comparison controls, next-practice setup, six interviewer portraits and six widths passed. No AI writes.
- Preparation, LinkedIn and NaukriGulf isolated workflow suites passed.
- `npm run test:workspace-navigation`: seven widths, all destinations, account links, focus trap, focus return, new/error states, enlarged text and zero writes passed. The new check is also in GitHub CI.

## Preserved and untested

No API routes, authentication actions, Supabase files, libraries/calculations, types, AI prompts, pricing, credits, templates, resume renderers or export logic changed. The Settings delete workflow and Sign out server action are preserved. Tests verify their navigation and presence without deleting data or ending the real session.

The isolated navigation harness omits the server-rendered footer; built-page screenshots include the actual rendered footer. Existing production desktop was inspected in the signed-in cloud browser before changes. Live account mutation, AI generation, payment, email and microphone services were not exercised in this visual-only update. No new end-to-end backend certification or numerical 95% fidelity claim is made.

The Vercel preview environment currently lacks the Supabase configuration used by production; authenticated preview routes may show the configuration notice. This change does not edit environment variables. Review the checked screenshots for authenticated screen appearance. Production/main remain unchanged pending the owner's release approval.
