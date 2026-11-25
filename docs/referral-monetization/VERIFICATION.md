# Verification report

## Audit evidence

- Source baseline: main `b5128243370b119aca2f14f83045f1d53511b9b8`; Vercel live alias reports the same commit and Ready state.
- Supabase production and GCC-MENTOR-TEST read-only catalogues confirm the existing schema inventory. Security Advisor found an informational no-policy finding and a leaked-password protection warning on each.
- Vercel environment metadata shows no branch-specific isolation for the new feature branch; shared Preview configuration requires isolation before hosted deployment.
- No production mutation or provider payment action was performed.

## Implementation and tests

Pending implementation. Record command, commit, environment and outcome here as each milestone is verified.

## Release decision

The isolated Preview is available for review. Live email delivery, live AI tests, production backup or recovery verification and explicit founder rollout approval remain open.

## Referral foundation

- Migration 075 applied to GCC-MENTOR-TEST with program defaults disabled.
- Local disposable Postgres passed permanent-code, first-click, wrong-browser/recipient, forged and reused intent, email verification, suspension and browser-role denial checks.
- GCC-MENTOR-TEST catalogue confirms authenticated cannot invoke the referral mutation RPCs. Service role can call the three server entry points. Auth triggers cannot be invoked directly.
- Full signed-in browser qualification and hosted race tests remain pending.

## Wallet, complimentary access and hosted database

- Migrations 075–080 applied in order to GCC-MENTOR-TEST. Launch switches were off before and after testing.
- Hosted synthetic database tests submitted three overlapping permanent-link requests and received one code. Three overlapping qualification requests against one confirmed candidate issued exactly three reward credits. Two overlapping requests to spend that balance produced one hold and one insufficient-credit response. Synthetic rows were removed and settings restored after verifying the result.
- Disposable Postgres exercised one-time grants, reviewed referral eligibility, account recreation, expiry ordering, rollback of failed generation holds, source detail, idempotent refunds, optional promotions, and atomic result writes for all four premium services, including a voice-session start. These use synthetic artifacts.
- Admin complimentary grants are per selected premium service. Tests covered unauthorized grants, a repeat of the same admin request, recovery after a released hold, a successful zero-wallet service run, consumption exactly once, isolation from other services and an audit row.
- Post-migration Security Advisor for GCC-MENTOR-TEST returned no errors, the existing informational no-policy finding, and an existing leaked-password-protection warning. Access to the new records is server-scoped and RLS is enabled. No plan upgrade was requested.
- A local Next.js and Chromium smoke test using a synthetic HTTP database fixture passed anonymous redirect and claim cookie, authenticated generation, persistent code after reload, share URL and responsive layout at 360, 768 and 1440 px. It does not exercise real email or model calls.
- Local navigation harness passed at seven widths plus keyboard navigation and enlarged text. It verifies the canonical `/optimize/target` route remains in both desktop and mobile navigation.

## Local release checks

- TypeScript, lint and all 107 verification scripts passed. The database security suite reported 144 assertions passed. The production build completed.
- The Referral & Credits browser fixture passed at 360, 768 and 1440 pixels. Existing workspace navigation passed at seven widths, plus keyboard focus and enlarged text.
- The landing browser regression originally failed in GitHub Actions because it asserted the previous Settings destination. The updated check verifies Referral & Credits and the unchanged service destinations. The landing and orbit browser steps passed locally. See [PR checks](https://github.com/jaissatish-web/GCC-MENTOR/pull/149/checks) for the current hosted CI conclusion.

## Hosted application preview

- Vercel Preview is Ready at [the isolated deployment](https://gcc-mentor-iuhf8g875-satishs-projects-c02c354b.vercel.app) for application commit `3c58f3d81a4d0be273c8cfe061c2fddc78c3b377`. The successful deployment's complete Git tree matches the tested local tree. The first attempt failed because two large files were truncated during GitHub transfer. Both blobs were corrected and verified by Git hash before redeploying.
- Vercel has separate sensitive entries for Production and Preview. The existing shared Preview entry authenticated a read against GCC-MENTOR-TEST in the build guard. The launch-readiness branch-specific entry remains scoped to its original branch. No secret was retrieved or logged. Referral Preview settings isolate the test URL and public key and neutralize inherited database connection and payment variables.
- Hosted HTTP checks passed for the homepage, signup, Free Tools and the signed-out referral redirect. With a synthetic test account, two simultaneous calls returned one permanent link. An anonymous visit set an HttpOnly claim cookie. Career Profile Resume creation remained free and a zero-wallet Cover Letter returned an insufficient-credit response for one credit.
- Hosted server routes accepted a synthetic Supabase confirmation token from a new session without referral cookies. The incomplete profile received no reward. Confirming the eligible profile issued one three-credit lot. Repeating confirmation left the same reward. The confirmation test used seeded synthetic Auth state and exercised the application callback and Auth verification. SMTP delivery was outside this check.
- The hosted admin form granted one complimentary Cover Letter use. The recipient saw the grant and a regular user was redirected from administration. A generation request reached the AI service, which failed because the test project has no model configuration. Its allowance remained unused, with zero outstanding holds and an admin audit record.
- A test transaction confirmed that disabling referrals and wallet enforcement stopped new claims and preserved existing allowances. The transaction was rolled back. Temporary QA accounts and protected access grants were removed after testing.
- Browser layout and navigation were verified using local fixtures. The direct hosted Chromium runner rejected the proxy certificate, so hosted integration was verified over HTTP. Live email delivery, successful live AI generation and the remaining hosted legacy regressions still require test infrastructure.
- Test referral and enforcement flags are enabled for isolated review. Production still serves `b5128243370b119aca2f14f83045f1d53511b9b8`. Production backup or recovery verification, rollout approval and authorized post-deployment tests remain open.
