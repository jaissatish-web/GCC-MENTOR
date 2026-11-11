# Premium Landing V2 visual acceptance

Source truth: founder-approved19828.png full mobile,19829.png desktop,19830–19833.png detailed mobile. Original source pixels:512×1536,513×1536,512×1536,513×1536,672×1536,512×1536. These are compressed composition illustrations, not literal browser viewport captures. CSS targets390×900 and1440×900, deviceScaleFactor1; comparisons normalize column width, not entire-page height. Interactive/content states differ as explicitly documented below.

Implementation: artifacts/premium-landing-v2/landing-{360,390,430,768,1024,1440}.png, plus section crops. Combined full-view and focused comparisons are included in the delivery report.

## Findings
- P1 release blocker, inherited: exact mounted document orbit geometry stability gate fails before theme-equivalence can be established. Protected fitting/rendering source and strict comparison thresholds remain unchanged. Standalone authored document comparison passes64cases; that is not a substitute for mounted stability.
- Expected protected-component deviation: real interactive dot globe retained instead of substituting a static photoreal globe from artwork.
- Expected truthful-content deviation: real founder portrait; full existingFAQ and service destinations; verified access categories without invented prices/statistics/endorsements.
- Expected functional-content deviation: actual interactive interview demo retains selectors, feedback and progress, so its section is taller than the static illustration. It is labelled Sample demonstration; no recording/evaluation backend added.
- Remaining visual acceptance: founder must review actual implementation. Desktop separates four service highlights from orbit copy and places industry tiles after interview; artwork integrates tool copy beside orbit and places industries first. This is still a composition difference, not an exact clone.

## Comparison history
1. Initial rendered capture: small existing interviewer thumbnail did not reproduce the reference emphasis. Enlarged portrait and two-column desktop presentation while retaining all behavior. Mobile selectors truncated; changed mobile grid to one full interviewer row plus two controls. Portrait top clipped; adjusted object-position.
2. Actual orbit preserved; added decorative transparent gold/teal halo outside document internals. No changes to transforms, animation timing or document fitting.
3. Desktop hero engineer helmet clipped in initial capture; corrected image crop to top alignment.

## Required surfaces
Typography uses existing UDS responsive roles,36/44/52px hero and existing font choices; heading weight700, balanced wrapping. Navy/teal/light surfaces and restrained gold map to existing semantic tokens. Spacing remains configurable per breakpoint; no added stylesheet or token system. Images are WebP brand illustrations; authentic founder portrait and exact country SVGs. No fake figures or endorsement logos.

## Verification
Browser controls: mobile menu open/Escape/focus return/anchor close;13preserved service destinations inventoried; FAQ/service disclosure; three interview states/interviewer selection; globe country selection. 200%text390px no horizontal overflow. Page errors checked. These are anonymous presentation checks, not authenticated SaaS end-to-end testing.

final result: blocked

Release is blocked by inherited mounted-orbit stability and pending founder acceptance. Do not merge PR78/79/V2 or publish production.
