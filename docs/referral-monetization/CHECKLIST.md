# Implementation checklist

Start by reading the GitHub master issue, inspecting the branch and picking the first unfinished dependency. After each milestone, record the commit, tests and remaining gaps in the verification report and update the issue. Mark complete only after the acceptance test passes.

| Phase | Work and milestone acceptance |
| --- | --- |
| 01 Audit and planning | Verify main and live alias; inspect credit, AI, auth, profile, database and environment; document decisions and production gates; create the GitHub issue and isolated feature branch. |
| 02 Database foundation | Add referral ownership, attribution, review, settings, ledger, allocation and immutable audit structures; verify keys, privileges, concurrency and additive hosted test migration. |
| 03 Referral engine | Permanent code generation, anonymous visits, signup lock, cross-device verification, profile confirmation, qualification, exactly-once rewards and reporting. |
| 04 Wallet | Atomic source-aware grants, reservations, settlement, release, expiry, refunds, reversals, history and stale reconciliation. Race-proof with multiple database sessions. |
| 05 User UX | Settings, permanent link, supported sharing, wallet, referral activity, pagination and unlock components. Verify mobile and keyboard interactions. |
| 06 Service integration | All optimizer branches, Cover Letter, Q&A and Mock Start. Verify child mock authorization, regeneration, retries, persistence and free saved outputs. |
| 07 Admin | Analytics, user history, settings, manual review, suspensions and reasoned credits/corrections and per-user complimentary service grants. Verify a zero-wallet user can use only the granted service, failed work restores the allowance, and pauses and AI limits still apply. Test admin and non-admin accounts. |
| 08 Fraud and privacy | Review signals, rate controls, duplicate protection, non-sensitive explanations and retention tests, including legitimate shared networks. |
| 09 Future compatibility | Legacy quotas, mixed-source credits, simulated purchase/subscription lifecycle, refund effects and disabled checkout. |
| 10 Launch messaging | Targeted landing and pricing changes. Verify signup, dashboard access, Settings, no broken navigation and no payment actions. |
| 11 QA | Repository, DB, browser, security advisors, full regressions and test recovery rehearsal. Attach evidence and close release-blocking defects. |
| 12 Preview and production | Configure test-only Preview, deploy, test hosted workflows, open one PR and verify CI. After founder approval and backup/recovery verification, apply production migration, merge, deploy and verify. |
