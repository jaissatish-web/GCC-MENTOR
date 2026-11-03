# Free Tools — first release and remaining work

Updated 3 November 2026. Founder requests a staged release before continuing.

|Scope|Count|Current status|
|---|---:|---|
|Resume utilities21–30|10|Implemented; local logic and mobile/member-fixture tests passed; release verification pending|
|General utilities41–50|10|Implemented; local logic and mobile/member-fixture tests passed; release verification pending|
|Finance11–20|10|Planned for next phase after review|
|Career31–40|10|Planned after finance|
|Employment1–10|10|Planned; rule verification gates apply|

## Release checklist
- [x] Master plan merged in PR67
- [x] Implement and individually test first 20 tools
- [x] Public routes and optional member CTAs
- [x] Canonicals, SSR content, sitemap publication list
- [x] Final build and browser checks on release source
- [ ] Required CI green and PR68 merged
- [ ] Vercel production ready and live smoke tests
- [ ] Founder reviews live tools

## Remaining 30 tools
- [ ] 1. GCC Gratuity Calculator — Planned
- [ ] 2. Final Settlement Calculator — Planned
- [ ] 3. Leave Encashment Calculator — Planned
- [ ] 4. Overtime Pay Calculator — Planned
- [ ] 5. Notice Period Calculator — Planned
- [ ] 6. Employment Service Duration Calculator — Planned
- [ ] 7. Unpaid Leave Calculator — Planned
- [ ] 8. Daily Wage Calculator — Planned
- [ ] 9. Hourly Wage Calculator — Planned
- [ ] 10. Employment Termination Timeline Calculator — Planned
- [ ] 11. Salary Breakup Calculator — Planned
- [ ] 12. Annual Salary Calculator — Planned
- [ ] 13. Salary Increment Calculator — Planned
- [ ] 14. Salary Percentage Change Calculator — Planned
- [ ] 15. Salary Comparison Calculator — Planned
- [ ] 16. Savings Goal Calculator — Planned
- [ ] 17. Monthly Budget Planner — Planned
- [ ] 18. Remittance Calculator — Planned
- [ ] 19. Cost of Living Comparison Calculator — Planned
- [ ] 20. Job Offer Comparison Calculator — Planned
- [ ] 31. Professional Experience Calculator — Planned
- [ ] 32. Employment Gap Calculator — Planned
- [ ] 33. Interview Countdown Calculator — Planned
- [ ] 34. Interview Preparation Checklist — Planned
- [ ] 35. Job Application Tracker — Planned
- [ ] 36. Job Search URL Builder — Planned
- [ ] 37. LinkedIn Headline Length Checker — Planned
- [ ] 38. Resignation Letter Generator — Planned
- [ ] 39. Experience Letter Generator — Planned
- [ ] 40. Salary Negotiation Email Template Generator — Planned

## Verification boundaries
Guest and simulated member states have been tested; a real signed-in production account remains a separate check. Legal coverage is not yet activated. Browser-only telemetry events have no persisted analytics collector; no signup/service attribution is claimed. No Google ranking/indexing guarantee.

Tracking issue: https://github.com/jaissatish-web/GCC-MENTOR/issues/66
Implementation PR: https://github.com/jaissatish-web/GCC-MENTOR/pull/68

Final local release source: typecheck/lint/build and92/92 repository checks pass. Actual production-build QA verifies50 reserved pages,20 active pages at360/1440 with40 calculation/copy/print/reset checks, zero missing fixtures or console/hydration/unexpected network errors, plus representative200% text. Required CI and live deployment remain release gates; current deployment status is maintained in issue66.
