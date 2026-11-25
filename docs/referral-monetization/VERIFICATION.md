# Preproduction verification

## Release decision

The [protected Preview](https://gcc-mentor-c02macw8w-satishs-projects-c02c354b.vercel.app) passed the build-time GCC-MENTOR-TEST identity check on evidence commit `a2c35a98a5e8beb7d5a83f22e5de4c091f39551c`. The original hosted checks ran on the same application code at `3c58f3d81a4d0be273c8cfe061c2fddc78c3b377`. Review [tracker #148](https://github.com/jaissatish-web/GCC-MENTOR/issues/148) and [draft PR #149](https://github.com/jaissatish-web/GCC-MENTOR/pull/149). Production remained at `b5128243370b119aca2f14f83045f1d53511b9b8`. Launch remains on hold pending actual Auth email delivery, the remaining release checks below, and founder approval.

The implementation adds one persistent direct-referral link per account, profile qualification and review, a source-aware integer wallet, and service-specific complimentary admin grants. Migrations 075–080 add the referral, wallet, and audit structures and integrate atomic wallet settlement with artifact persistence. Referral links and balances are independent of existing subscription quotas. Initial Preview configuration uses 3 credits per referral, service costs 3/1/2/3, and disabled payments.

## Verified results

| Area | Evidence |
| --- | --- |
| Repository and database | `npm run check` passed 108/108 locally including the added recovery rehearsal. Earlier build, lint, typecheck, and database security suite with 144 assertions passed. Review the final branch [Actions checks](https://github.com/jaissatish-web/GCC-MENTOR/pull/149/checks) for the CI result of the evidence revision. |
| Preview isolation | The existing sensitive Preview service-role entry passed the Supabase build identity guard for GCC-MENTOR-TEST. The other feature branch's specific entry retains its original scope. The project has separate Production and Preview entries. No Vercel secret value was displayed or changed. |
| Referral journey | One permanent link served two independent browser IDs on a shared network. Both synthetic account confirmation callbacks worked without the original attribution cookie. Incomplete profiles earned zero. Completing both and repeating confirmation issued two rewards totaling six credits. Hosted races returned one link from overlapping requests and one grant from overlapping qualification requests. |
| Fraud and access | Disposable Postgres covered wrong-browser and recipient binding, forged and reused intents, account recreation, link suspension, session-role permissions and duplicate reward prevention. Hosted ordinary user administration was denied. A valid shared network did not block either referral. |
| Wallet and configuration | Hosted overlapping spends produced one reservation and one insufficient-credit response. A hosted rollback-only test persisted synthetic artifacts for all four services, denied cross-user settlement, verified repeated requests and confirmed a refund returned 1 on first call and 0 on repeat. Preview wallet showed 6 referral and 16 promotion credits with paginated history. Admin configuration checks validated ownership, rules and audit. Simulated purchase grants passed idempotency. No real payment was processed. |
| Complimentary access | Hosted Admin → Users form issued one Cover Letter use with a recorded reason. An earlier provider configuration failure left it unused with zero holds. An unrelated premium action was blocked with HTTP 402 on a zero-credit account. Two affected test accounts retained both complimentary uses after failed live Cover Letter runs, with zero holds. Database checks covered service scope, exact-once successful consumption and failed work releasing the allowance. A successful live complimentary request remains unverified. |
| Browser and sharing | Hosted Chromium passed at 360, 390, 768 and 1440 px. Referral link persisted, the keyboard path worked, and six direct share destinations carried the permanent URL. The manual copy fallback was available. Physical-device native share and installed-app handoff remain untested. |
| Compatibility | Hosted GCC Readiness and Basic ATS Job Match both produced real results from synthetic input. Chromium loaded 11 signed-in legacy routes including the canonical Resume Optimizer redirect to `/optimize/target`. Browser downloads returned valid PDF for both Career Profile Resume and optimized resume, and valid DOCX for the optimized resume. The legacy Career Profile Resume DOCX fallback deliberately returns 409 and directs users to PDF. |
| Security Advisor | GCC-MENTOR-TEST reported no errors after migrations, one informational finding for an intentional server-only RLS table and the existing leaked-password protection warning. No permission was widened to dismiss an advisory, and no plan upgrade was made. |
| Recovery | The [recovery plan](RECOVERY.md) identifies the known-good Vercel deployment. A disposable PostgreSQL test restored a synthetic archive, rolled back 075–080, reapplied them with launch flags off, and verified legacy rows and cross-user isolation. Supabase reported a Free plan for production, with no managed automatic backups. An existing logical export was not confirmed. |

## Live AI and credit accounting

The production configuration was inspected read-only. Its approved default was OpenRouter `deepseek/deepseek-v4-flash` with fallback disabled. The credential was encrypted before retrieval and submitted directly through the protected Preview Admin form. It was never displayed. This isolated test used synthetic data, the existing AI budget and no additional service. Preview received the credential temporarily for QA.

| Hosted request | Result |
| --- | --- |
| Resume Optimizer | HTTP 200 for draft and real generation. Optimized content persisted. |
| Cover Letter | HTTP 200. Generated letter persisted. |
| Interview Q&A | HTTP 200. Generated question set persisted. |
| AI Mock Interview | HTTP 200. Five text-mode questions persisted. Live answer feedback and final report passed. Repeating finish returned the saved report. |
| Credit settlement | The four starts used 9 credits in total. Balance moved from 12 to 3 with zero outstanding holds. The additional recorded start used the remaining 3. Saved result downloads left the wallet unchanged. |
| Recorded Mock Interview | The feature branch alone enabled voice. The new Preview started one five-question recording, accepted five signed uploads and queued review. No transcript or report appeared. Direct diagnostics for two synthetic audio formats returned OpenRouter HTTP 402 because their maximum cost exceeded the available provider credits. The test session and audio objects were removed. |

## Open release checks

- **Real email delivery**. Test-only signup and recovery requests using synthetic addresses were rejected before sending. Two signup requests for the connected project-owner inbox returned `429 over_email_send_rate_limit` with no identity or `Retry-After`. Synthetic signup and recovery callback tests passed without SMTP. In GCC-MENTOR-TEST, verify the inbox under the organization Team settings, then inspect Authentication → Emails → SMTP Settings and Authentication → Rate Limits. Use an existing approved SMTP sender if the built-in sender remains blocked. Under URL Configuration allow the protected Preview auth callback. Run signup and recovery with a temporary test account for the approved inbox.
- **Remaining hosted workflows**. Verify recorded Mock Interview transcription and review when the approved OpenRouter balance permits it. Confirm successful hosted complimentary use, native sharing on a physical device, and any existing tools for which route checks or automated regression tests are the only present evidence.
- **Production recovery**. Confirm an actual restore point or obtain explicit approval for a documented alternative. The synthetic recovery rehearsal does not establish that production data can be restored.
- **Release**. Obtain founder approval, apply the approved migrations and deploy, then confirm production smoke tests and synchronize main with the production alias. The tracker stays open.
