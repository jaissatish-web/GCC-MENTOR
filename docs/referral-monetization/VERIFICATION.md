# Verification report

## Audit evidence

- Source baseline: main `b5128243370b119aca2f14f83045f1d53511b9b8`; Vercel live alias reports the same commit and Ready state.
- Supabase production and GCC-MENTOR-TEST read-only catalogues confirm the existing schema inventory. Security Advisor found an informational no-policy finding and a leaked-password protection warning on each.
- Vercel environment metadata shows no branch-specific isolation for the new feature branch; shared Preview configuration requires isolation before hosted deployment.
- No production mutation or provider payment action was performed.

## Implementation and tests

Pending implementation. Record command, commit, environment and outcome here as each milestone is verified.

## Release decision

Development only. Hosted test evidence, CI, recovery verification and founder production approval are pending.

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
- The branch's GitHub Actions conclusion could not be retrieved from the connector. Local results and the Vercel build are recorded independently.

## Hosted application preview

- Vercel Preview is Ready at [the isolated deployment](https://gcc-mentor-iuhf8g875-satishs-projects-c02c354b.vercel.app) for application commit `3c58f3d81a4d0be273c8cfe061c2fddc78c3b377`. The successful deployment's complete Git tree matches the tested local tree. The first attempt failed because two large files were truncated during GitHub transfer. Both blobs were corrected and verified by Git hash before redeploying.
- Vercel has separate sensitive entries for Production and Preview. The existing shared Preview entry authenticated a read against GCC-MENTOR-TEST in the build guard. The launch-readiness branch-specific entry remains scoped to its original branch. No secret was retrieved or logged. Referral Preview settings isolate the test URL and public key and neutralize inherited database connection and payment variables.
- The Vercel connector loaded the hosted homepage, signup and Free Tools and confirmed that signed-out Referral & Credits is redirected to sign-in. A synthetic login to GCC-MENTOR-TEST Auth succeeded. The direct signed-in browser runner could not pass Vercel authentication, so end-to-end hosted email confirmation, admin UI, live premium AI and the full hosted regression remain pending. Local browser and SQL evidence covers the work described above.
- Test referral and enforcement flags are enabled for isolated review. Production still serves `b5128243370b119aca2f14f83045f1d53511b9b8`. Production backup or recovery verification, rollout approval and authorized post-deployment tests remain open.
