# Business rules

Production Baseline V1.0 · source `ed06ab8c6c73b63f7be2376e4a90b1e7ab3da342`.

| Rule | Implemented owner |
| --- | --- |
| Public assessment and tools | `app/tools/`, `app/api/gulf-readiness/`, `app/api/ats-scan/`, guest admission in `lib/anonymousRateLimit.ts` |
| Prices and plan matrix | `lib/pricing.ts`, `lib/entitlements.ts`, `app/admin/plan/` and database-backed configuration |
| Service packages and per-service credits | `lib/admin/servicePackages.ts`, `app/admin/packages/`, `app/api/redeem-package-promo/` |
| Wallet actions, prices in credits and admission | `lib/credits/services.ts`, `lib/credits/premiumAction.ts`, migrations 076 and 078–080 |
| Limits and complimentary access | `lib/ai/serviceGuard.ts`, `lib/rateLimit.ts`, `lib/personalUsage.ts`, `app/admin/services/` |
| Referral eligibility and awards | Migrations 075, 077, 079 and 080, `lib/referrals/`, `app/admin/referrals/` |

Use the live authorized admin configuration to confirm current price amounts, quotas, per-service costs and complimentary overrides. This source baseline does not establish their live values. Historical commercial proposals are excluded. `app/payments/page.tsx` and the optimizer pay/promo paths show the available payment and redemption flow. The Payments route redirects to Settings → Billing & Payments, which lists unlocked resumes and marks online payments disabled. When `pricing_visible` is enabled, it shows the configured resume optimization price as indicative. The legacy optimizer pay route forwards an owned package to generation or its package page. Promo redemption has dedicated APIs. The baseline has no checkout or recurring billing handler. The plan editor persists `plan_entitlements`; its admin page identifies it as configuration for future enforcement. Runtime admission uses the active usage and wallet controls. The wallet credit service registry lists Resume Optimizer, Cover Letter, Interview Q&A and AI Mock Interview start.

The wallet uses lots, reservations and an append-only ledger. Premium actions check rollout and service settings, reserve available credits where applicable and use a stable request ID across retries. Settlement records a successful result; failure releases a hold or leaves it for reconciliation when the response is interrupted. Replays recover the settled artifact without a second charge. Admin grants, legacy service credits, promotions, wallet lots and complimentary access are separate authorization mechanisms. Check the route and RPC for precedence. Usage accounting is independent of whether a user later deletes an artifact. Read the active policy and period before promising a reset schedule.

A signed-in user opens the referral wallet from Settings or the account surface. Attribution and qualification are checked server-side, including account and referral eligibility. The configured default reward is three credits under the applicable qualification and rollout rules. Release history records wallet and referral activation; reconfirm flags in authorized admin before treating live state as current. Admin controls cover service pauses, limits, credits, promo codes and referral settings. Preserve settlement and grant history during an incident.
