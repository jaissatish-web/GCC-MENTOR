# Branch cleanup inventory — 22 October 2026

Baseline main: `81fdcf1303a5c9c39d8fe04a621e70cc6a9fbfeb`. Founder requests only main.

36 non-main branches: 27 are ancestors of main; nine have commits outside main history (which may include equivalent changes merged another way). No automatic merging is authorized. Keep unique work durably recoverable before deleting its ref; an SHA list alone is not a durable backup of unreachable commits.

Status: all 36 original non-main branches removed after purpose review. Nine separate heads are preserved in archive/branches-2026-10-22.bundle.base64; independent restore verification passed. Draft PRs #4/#12 closed without merging. PROGRESS.md records removal of required temporary documentation branches and final acceptance.

| Branch | Head SHA | Behind main | Ahead main | Disposition |
|---|---|---:|---:|---|
| `ai-provider-fallback` | `fb0259635720d174f4f70a576a5df20f8a5a3455` | 484 | 0 | Merged ancestor; safe cleanup candidate |
| `astra/full-saas-audit` | `019eac3638d1f4fc888d0868ec7942609e3de67d` | 287 | 1 | Preserve unique work before deletion |
| `claude/saas-production-hardening` | `4ab913f47a0b7cc4d69b0dd2140f2c6344e00728` | 271 | 0 | Merged ancestor; safe cleanup candidate |
| `claude/sweet-cannon-hum04t` | `2b095dfbf4ad8665c09c6079477a0be631473284` | 179 | 0 | Merged ancestor; safe cleanup candidate |
| `codex/compact-typography-20261006` | `515f8f8bea76d9222283d7ca7853aad4823594b7` | 178 | 1 | Preserve unique work before deletion |
| `codex/recorded-voice-interview` | `b03a5508f9e5dec8d98a8fc797d6d2bbe4ade5ca` | 229 | 0 | Merged ancestor; safe cleanup candidate |
| `codex/resume-orbit-20261006` | `ac53bbed279ceb2f4fe0b39ff25068516784bd56` | 175 | 0 | Merged ancestor; safe cleanup candidate |
| `codex/saas-service-journey` | `fa843831e738fc1e4305e02cdd9bbf0732599190` | 287 | 0 | Merged ancestor; safe cleanup candidate |
| `codex/system-typography-20261006` | `afab8074150ad338ebced84db70b673500c6f435` | 176 | 0 | Merged ancestor; safe cleanup candidate |
| `codex/typography-audit-20261006` | `82d92886a763124585f390feab01c1c8b1ec5304` | 179 | 3 | Preserve unique work before deletion |
| `design/interview-visual-refresh` | `93005d29be61cf9a8497d2d26ca641ab1fc22b25` | 18 | 0 | Merged ancestor; safe cleanup candidate |
| `feat/readiness-evidence-flow` | `e83d096928c4056304f308f9f56360e57803219a` | 4 | 0 | Merged ancestor; safe cleanup candidate |
| `feat/resume-import-review-bars` | `91385904e21dd055d989bfd5397f4bb1d70eee2e` | 11 | 0 | Merged ancestor; safe cleanup candidate |
| `feat/review-before-profile` | `f24b87769b641a12c9daff1f47208f087e0e3768` | 9 | 0 | Merged ancestor; safe cleanup candidate |
| `feat/shared-career-intake` | `db338a41bbd155c811eaf2348e16fc2edec003d0` | 1 | 0 | Merged ancestor; safe cleanup candidate |
| `feat/universal-optimizer` | `39211763cbd91b5f37307e2ff21fd6ed2987a136` | 260 | 0 | Merged ancestor; safe cleanup candidate |
| `feature/app-redesign` | `8273653c828ac5a9b74b5dce1f455ef968b22fbd` | 235 | 0 | Merged ancestor; safe cleanup candidate |
| `feature/landing-v2` | `84b814cb20f606373ef9ed5ef154f3a1a1f79b3b` | 238 | 0 | Merged ancestor; safe cleanup candidate |
| `feature/three-steps` | `bca81bcea65bb50b6d5109c27d2dccfbf9455199` | 234 | 0 | Merged ancestor; safe cleanup candidate |
| `fix/audit-design-and-trust-20261010` | `12866d82b98dfba56363d98092d09980fff51570` | 154 | 1 | Preserve unique work before deletion |
| `fix/photo-rehydration-and-latency` | `5b276c36f333d513356610a0c17fe3ffc125d779` | 266 | 0 | Merged ancestor; safe cleanup candidate |
| `fix/profile-mobile-header-menu` | `0a071104fe87775147adab47d2a3c3417b81f9b7` | 6 | 0 | Merged ancestor; safe cleanup candidate |
| `fix/responsive-typography-20261010` | `1cda8132aea5fc2185fd881e2c853939e6080e56` | 154 | 4 | Preserve unique work before deletion |
| `fix/template-showcase-photos` | `961ffc10194618247b4496de25d16768e45471df` | 21 | 0 | Merged ancestor; safe cleanup candidate |
| `journey-continuity-review` | `bf58d61161bc66b146cd96d71e619a29d96310e7` | 72 | 7 | Preserve unique work before deletion |
| `landing-conversion-preview` | `1ad6839c98bb0441618196c1d1cf615b0307e60c` | 90 | 0 | Merged ancestor; safe cleanup candidate |
| `landing-premium-audit-review` | `24e895f5d4e7f7bf9c3a4de759be0bb2224570d5` | 77 | 0 | Merged ancestor; safe cleanup candidate |
| `preview/opportunity-desk` | `884af822133ceb0205b22c8366d8f521f151953d` | 23 | 0 | Merged ancestor; safe cleanup candidate |
| `preview/premium-gulf-landing-20261013` | `747bbbd56868c248b203322229ad32a88d40e92a` | 105 | 0 | Merged ancestor; safe cleanup candidate |
| `quality-service-fixes` | `08dc8f6c0f414454c01eb37567f17c4c6075c00a` | 73 | 0 | Merged ancestor; safe cleanup candidate |
| `redesign/landing-transformation-20261011` | `26c3cc010860ae89b750b20ade9499447920e0b1` | 123 | 1 | Preserve unique work before deletion |
| `redesign/product-first-20261012` | `03f647a476adf07d22f050d0b93f236a7645f44f` | 116 | 1 | Preserve unique work before deletion |
| `resume-quality-and-design` | `afba543f2772baf3479807d1c8ebd389342c28c6` | 98 | 0 | Merged ancestor; safe cleanup candidate |
| `ui/desktop-services-refresh` | `5b4f4d967615878cbfcdb2646d8e5fb7a243c754` | 13 | 0 | Merged ancestor; safe cleanup candidate |
| `ui/mobile-option-two` | `6d9f277f431d385d3d544b2b1f50de1fe372ab51` | 15 | 0 | Merged ancestor; safe cleanup candidate |
| `update/landing-shared-journey` | `b96c46baceac515db1602685449200c3df517146` | 34 | 1 | Preserve unique work before deletion |
