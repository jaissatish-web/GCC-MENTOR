# Opportunity Desk design QA

**Findings**

No actionable P0/P1/P2 issues remain in the final comparison. This is the selected third direction adapted to the existing product, rather than a pixel-exact copy of the illustrative board.

**Source and evidence**

- Source visual truth: `../generated_images/exec-0a78111a-9e98-4ad1-8695-3c0a4753e1ab.png` (1487 × 1058 pixels, three-screen concept board).
- Browser-rendered implementation: `artifacts/opportunity-desk/landing-390.png`, `dashboard-390.png`, `workspace-390.png` (each 390 × 844 pixels, CSS viewport 390 × 844, deviceScaleFactor 1).
- Full-view comparison: `artifacts/opportunity-desk/comparison-latest.png`; source and all three actual screens were inspected together in the same image. Source board was scaled proportionally to 1170 pixels wide; frames and board padding are present only in the source. This is a composition comparison, not a pixel-difference score.
- Additional captures: the same three routes at widths 320, 768 and 1440. All use an 844px viewport height. The full comparison is legible at this resolution, so a separate focused crop was unnecessary; the hero, status rows, tabs and bottom navigation were also inspected in the individual 390px captures.
- State: public landing page; signed-in dashboard with a saved profile; job workspace with a saved CV and the cover letter next. Dashboard and workspace use fictional data and the actual production components/CSS in a local read-only browser harness. They do not represent a live user's account.

**Comparison history**

1. Initial result: blocked. P2: landing headline wrapped to three lines and supplementary trust copy preceded the product preview. P2: workspace header, actions and secondary navigation displaced the next action. P2: fixture lacked UTF-8 metadata, causing broken middle-dot characters.
2. Fixes: mobile headline 26px with unrestricted width and the intended two-line composition; trust/founder information moved below the preview; actual existing resume template used for the miniature CV; redundant job header removed; secondary actions moved below the overview; resume actions grouped in an accessible disclosure; fixture encoding corrected. Existing next-step logic was preserved; fixture completion flags were aligned with the intended cover-letter-next state.
3. Revised captures at the same viewport/state: `comparison-latest.png` and the three 390px screenshots above. Headline, tabs, next action, service rows and navigation are now clear without clipping or overlap.

**Required fidelity surfaces**

- Fonts/typography: existing Inter family, semibold headings and consistent UI weights. Phone hero 26px, app title 24px, section headings 18px, body 15px. No serif display headings. Main hero wraps as intended; controls and service labels remain readable at 320px.
- Spacing/layout: white canvas, quiet green surfaces, consistent thin dividers and compact radii. Primary action precedes detail controls. Responsive grids become two columns on desktop. No horizontal overflow at tested widths. Additional truthful founder copy and real document rendering make the landing page taller than the concept; preserving those existing product elements is intentional.
- Colors/tokens: scoped forest green #10574b, dark ink #102c29, muted text #61716e, border #e0e8e5, white canvas. Red remains local to the existing problem treatment. No full red section background. Existing focus rings and reduced-motion behavior are retained.
- Image quality/assets: miniature CV is rendered by the existing AtsClassic/ResumeDocumentView engine with sample data, not a fake document drawing. Existing logo, flags, resume showcase and product assets are retained. Standard Heroicons are used consistently; no replacement decorative artwork was invented.
- Copy/content: selected hero and preparation-oriented hierarchy are retained. Existing next-step CTA/body and actual saved-output flags supply workspace states. No new hiring score or fabricated progress. Services remain available through the existing routes.

**Interactions and functional checks**

- Landing: both guide disclosures start closed and expand/collapse; readiness CTA retains its route; journey and service anchors remain present.
- Dashboard: job rows open existing workspaces; Add job and saved-document routes retained; profile and readiness controls reachable.
- Workspace: Overview, Documents and Practice switch correctly; CV view and download controls remain available; practice links carry the existing package identifier; application tracker date input remains accessible.
- Navigation: Home / Library / Tools / Profile preserve distinct existing destinations. The source board's separate Jobs and Library items would duplicate the current product routes, so the existing useful destinations are retained. Full services remain in the header menu.
- Browser results: 12 route/viewport checks passed; zero runtime errors and zero API writes in the read-only fixture. Evidence: `artifacts/opportunity-desk/results.json`.
- Production typecheck, lint and build passed. Repository regression checks are recorded in the pull request after completion.
- Scope: no API, database schema, auth implementation, AI pipeline, service entitlement, pricing, resume-template or document-generation code changed. Presentation, navigation and frontend display only.

**Open questions / test limits**

Live signed-in account operations and paid generation were not exercised. The fixture blocks writes. Public deployment verification is recorded in the pull request separately; no main merge or production promotion is authorized.

**Implementation checklist**

- [x] Implement selected third direction using existing components and service routes.
- [x] Preserve backend and next-action logic.
- [x] Capture and compare revised screenshots with source together.
- [x] Check mobile/tablet/desktop layout and primary interactions.
- [x] Keep all changes on `preview/opportunity-desk` for review.

**Follow-up polish**

P3: once reviewed with a real account, tune unusually long company names or user content if needed. These do not block the current responsive preview.

final result: passed
