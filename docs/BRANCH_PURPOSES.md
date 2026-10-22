# Why the old branches existed

Reviewed 22 October 2026 from actual commit subjects and ancestry against main `d545547`. Names are historical work areas, not separate products and not instructions to resume old plans. None of the separate branch code is being applied to the website.

Original inventory: 36 non-main branches. 27 heads are already ancestors of main. Nine contain 20 total commits outside main history (some may represent equivalent changes integrated differently). Those nine are preserved in the recovery archive before deletion. A temporary documentation branch from PR #24 was also removed after merging.

| Branch | Purpose shown by commit history | Relationship to main |
|---|---|---|
| `ai-provider-fallback` | Early AI provider/admin and landing retrofit work. | All commits reachable from main |
| `astra/full-saas-audit` | September production-readiness audit report; separate commit is documentation. | 1 separate commit(s); recovery archive |
| `claude/saas-production-hardening` | September security, configuration and production-hardening implementation. | All commits reachable from main |
| `claude/sweet-cannon-hum04t` | Resume-template expansion and print pagination work. | All commits reachable from main |
| `codex/compact-typography-20261006` | Compact typography preview; separate design experiment. | 1 separate commit(s); recovery archive |
| `codex/recorded-voice-interview` | Recorded voice interview and transcription implementation. | All commits reachable from main |
| `codex/resume-orbit-20261006` | Fitted full-page resume orbit and earlier typography. | All commits reachable from main |
| `codex/saas-service-journey` | Application tracker, preparation journey and recovery states. | All commits reachable from main |
| `codex/system-typography-20261006` | Earlier shared typography system. | All commits reachable from main |
| `codex/typography-audit-20261006` | Responsive type/readability preview and narrow-screen wrapping; separate experiment. | 3 separate commit(s); recovery archive |
| `design/interview-visual-refresh` | Interview setup, reports and progress visual refresh. | All commits reachable from main |
| `feat/readiness-evidence-flow` | Evidence-based public readiness and provisional assessment. | All commits reachable from main |
| `feat/resume-import-review-bars` | Visual import checks and field verification. | All commits reachable from main |
| `feat/review-before-profile` | Editable user review before Career Profile creation. | All commits reachable from main |
| `feat/shared-career-intake` | One extraction reused for Profile Readiness, Gulf preparation and first-profile handoff. | All commits reachable from main |
| `feat/universal-optimizer` | Optimizer implementation, skills layout, headline and verification. | All commits reachable from main |
| `feature/app-redesign` | Earlier signed-in shell, profile overview and workspace redesign. | All commits reachable from main |
| `feature/landing-v2` | Earlier photo-led landing, founder and journey presentation. | All commits reachable from main |
| `feature/three-steps` | Earlier three-stage navigation and service gates. | All commits reachable from main |
| `fix/audit-design-and-trust-20261010` | Separate audit-fix batch: mobile continuity, claim confirmation and readiness changes; draft PR #4, not current main specification. | 1 separate commit(s); recovery archive |
| `fix/photo-rehydration-and-latency` | Photo restoration, anonymous limit and rendering/cache performance. | All commits reachable from main |
| `fix/profile-mobile-header-menu` | Career Profile mobile header and standard hamburger menu. | All commits reachable from main |
| `fix/responsive-typography-20261010` | Responsive typography, verification/CI and dependency corrections; contains separate commits despite merged PR #5. | 4 separate commit(s); recovery archive |
| `fix/template-showcase-photos` | Consistent full-page sample CVs and uncropped sample portraits. | All commits reachable from main |
| `journey-continuity-review` | Separate compact Home/profile/navigation experiment and continuity review; draft PR #12, not the approved current implementation. | 7 separate commit(s); recovery archive |
| `landing-conversion-preview` | Landing conversion paths, profession demos and HD resume presentation. | All commits reachable from main |
| `landing-premium-audit-review` | Landing selectors, spacing and mobile typography refinement. | All commits reachable from main |
| `preview/opportunity-desk` | Template sample density and profile navigation; retained original design. | All commits reachable from main |
| `preview/premium-gulf-landing-20261013` | Approved premium Gulf landing release, orbit/globe preservation. | All commits reachable from main |
| `quality-service-fixes` | Claim confirmation, service/profile workflow and compact headings. | All commits reachable from main |
| `redesign/landing-transformation-20261011` | Landing transformation; only separate remaining commit records release verification. | 1 separate commit(s); recovery archive |
| `redesign/product-first-20261012` | All-professions landing and demo work; only separate remaining commit records release verification. | 1 separate commit(s); recovery archive |
| `resume-quality-and-design` | Resume preview/gallery quality, orbit rendering and zoom fixes. | All commits reachable from main |
| `ui/desktop-services-refresh` | Desktop adaptation of mobile design and service drawer. | All commits reachable from main |
| `ui/mobile-option-two` | Approved mobile workspace design and workflow verification. | All commits reachable from main |
| `update/landing-shared-journey` | Shared journey illustration on landing; separate commit after equivalent/related PR history, retained only as history. | 1 separate commit(s); recovery archive |

## Recovery record
`archive/branches-2026-10-22.bundle.base64` is a base64-encoded incremental Git bundle containing all nine unique heads and their objects outside main. It is inert history, not runnable platform code or an active plan.

Decoded size: 576303 bytes. SHA-256: `4a882a275a6d619d8bd6d78c4017458f13010e507b2c30c432a2f0038b009d8e`.

Verification: initialized a separate bare repository, fetched only main, verified bundle prerequisites, then fetched the bundle and confirmed all nine recovered refs. Required prerequisite objects are part of main's existing history. Do not rewrite that history.

For a future technical recovery, from a normal clone of main:

```bash
base64 --decode docs/archive/branches-2026-10-22.bundle.base64 > /tmp/gcc-old-branches.bundle
git bundle verify /tmp/gcc-old-branches.bundle
git fetch /tmp/gcc-old-branches.bundle 'refs/remotes/origin/*:refs/remotes/recovered/*'
```

Restoring a branch for development still needs a new explicit founder task. These recovery refs must not silently become the active product specification.
