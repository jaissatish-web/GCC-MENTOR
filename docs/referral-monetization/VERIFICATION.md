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

## Hosted application preview

Vercel has the GCC-MENTOR-TEST URL and public client key scoped to Preview for `feature/referral-credit-monetization`. No matching branch-scoped server key was available in this session. The provider integration returned 403 and the dashboard requires authentication. Shared Preview values also need an isolation check. Automatic deployment for this feature branch is disabled until verified, and no hosted app Preview has run. Hosted email confirmation, live AI and full browser regression remain pending. Production still requires the founder's explicit release approval.
