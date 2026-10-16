# Combined Home dashboard — design QA

Source visual truth: selected option 2, `exec-d8a690ad-5dde-4417-aa1b-388c19b20ff4.png`.
Implementation: real compiled Next.js dashboard in a 390 × 844 browser iframe with synthetic API data; production editor and service routes retained.

## Comparison history

Initial full-view comparison: `/workspace/scratch/gcc-home-comparison-initial.jpg`, reference and implementation together in one browser capture. Source normalised to 390 × 844 CSS pixels; iframe 390 × 844 with desktop scrollbars (375px content). Source identity and scores are illustrative; implementation values come from a synthetic profile.

- P2: The application selector/error surface preceded the dashboard and displaced the two readiness scores. Fix: keep the same provider and selector, place the selector in a collapsed Current application section beneath the saved work.
- P2: Score labels wrapped heavily beside the rings. Fix: 52px existing rings and 12px labels/actions, retaining meaningful accessible score text.
- P2: The profile card consumed too much vertical space. Fix: make entire fact pairs 52px links, reduce internal gaps, move secondary update/import actions into the editor.
- P3: Correct singular/plural role wording and use the existing photo through Next Image.

## Required fidelity surfaces

Typography: shared Inter scale retained, page title22, section18, card16, body15, helper14. Normal weights500/600; compact labels12.
Spacing/layout: two-score band, one profile card, one next action, saved list, four-item mobile navigation. Existing app shell retained.
Colours/tokens: shared teal, canvas, ink and gold tokens; no independent palette.
Assets: supplied brand, existing Heroicons, existing ScoreRing; optional existing profile photo. No raster screenshots used as UI.
Copy: short actionable labels; actual facts and counts, no mock values hardcoded.

At the initial capture, primary interactions and final comparison were still pending.

Initial status: blocked

## Final comparison and verification

Source image853 ×1844 pixels; comparison capture1363 ×936 pixels. Source is uniformly scaled to the390px reference column without cropping or stretching.

Full-view evidence: `docs/visual-review/home-combined/comparison-final.jpg`. Initial comparison is retained alongside it. Reference and implementation are shown together in the same browser capture. The reference is normalised to 390 × 844; the compiled app runs at 390 × 844 CSS frame size (375px usable width with this browser's desktop scrollbar). The source is a mobile concept, not a pixel-exact production specification; the existing product brand mark and readable 14/15px daily-use copy are retained. Profile name, experience and scores intentionally reflect real/synthetic state rather than being copied from the design.

Iteration 2 removed the top context bar, reduced the score rings, made profile facts whole-row links and removed secondary options from the profile card. Iteration 3 reduced the Home-only shell height, card/row spacing and next-step panel padding. Final capture shows the two scores, single profile card and next step in the intended order, with the saved list immediately below. Earlier P2 findings are resolved. The separately listed Q&A sets and mock interviews are an intentional product constraint: they are different saved items and should not be represented by one ambiguous count.

At this scale the full-view screenshot clearly shows labels, values, icon alignment and wrapping; additional crops were not needed. Existing supplied icons and ScoreRing geometry are reused. No source imagery was replaced by hand-drawn assets. Headings use the shared22/18/16px scale; profile facts14px, helpers14px, compact score labels12px. Focus outlines and 44px+ primary touch targets remain. 320px frame (305px content) and 390px frame (375px content) both reported scrollWidth equal to clientWidth. Four bottom navigation targets measured72px wide and47–49px high at320px.

### Browser interactions

- Profile completeness score opens the existing completeness view; Home returns to dashboard.
- Gulf readiness score opens the existing readiness view.
- The readiness photo improvement opens the full editor at its photo control.
- Profile settings opens the existing visibility editor.
- Tools opens the preparation-only menu; More opens all services and account settings. Neither adds a second Profile overview.
- New-user state offers Upload CV, Paste CV and Enter details, with unknown scores shown as dashes.
- Failed profile/activity requests show Unavailable, retry actions and dashes rather than stale or false zero totals.
- Live signed-in preview loaded the saved profile,53% completeness and85/100 Gulf readiness. Preview CV opened the existing general CV's design screen. No profile fields, templates or visibility settings were edited in the live account.

Console review was attempted in the cloud browser but retained-log access was restricted after secure sign-in. Do not claim a clean console. No rendered runtime error occurred in the tested final paths. Synthetic fixture data is used for mobile/error-state tests; this does not certify live AI generation, export results, every fresh-account path or physical-device behavior.

### Validation and follow-up

65/65 deterministic regression checks passed after functional changes, including new combined-Home fact/deep-link/error-state assertions. Type checking, lint and production build passed; the last spacing-only revision also built successfully. No schema, auth, AI prompt, scoring rule, payment or generation-service logic changed.

P3 follow-up: validate on physical Android/iOS devices. The retained app shell and readable font sizes make the saved list a little lower than the smaller-copy concept; it remains normally scrollable. Pending edits use the existing save-and-validate exit path for Save & Home.

final result: passed
