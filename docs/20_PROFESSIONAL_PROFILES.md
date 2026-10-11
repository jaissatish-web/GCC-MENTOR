# Professional profile preparation

LinkedIn and NaukriGulf are direct navigation destinations. The retired
`/professional-profile` hub is no longer displayed; existing bookmarks redirect
to LinkedIn. Each introduction leads with copy-ready deliverables, their paste
destinations, why the platform is useful for Gulf applications, GCC Mentor's
benefits, three action steps and visual practical-tip cards. Optimization CTAs
appear immediately and at the end. The daily-edit ranking tip is explicitly
unverified, without invented customer observations. Official guidance is linked.
Workspace links return to the platform guide or open the other platform, with
existing unsaved/busy guards. Results emphasize copy buttons, factual employment
dates and the actual last-saved timestamp (not an external profile update date).

## NaukriGulf

`/naukrigulf-optimization` → `/naukrigulf-optimization/workspace`. New layouts
authenticate server-side and use the existing AppShell; protected middleware
is unchanged. The new routes are noindex and disallowed in robots.

The editor reuses LinkedIn’s established source selection, optional upload/paste,
import ownership/conflict review, target direction, selected roles, language,
tone, instructions and exclusions. Career Profile is the only authority for
career claims. Imports never write it. No NaukriGulf credentials, scraping,
external account writes or automatic publishing.

A dedicated grounded prompt and independent factual review prepare three CV
headlines, a profile summary, descriptions for selected saved experience IDs,
up to 15 exact saved skills and three tailored recommendations. Current
employers/titles/dates, degrees and certifications remain fixed profile facts.
The NaukriGulf checklist additionally covers preferences/availability and CV
upload, with an existing My CVs link. Users apply changes themselves.
Preview is illustrative and displays their own saved profile/photo/content.
The percentage measures the user's update checklist, not hiring prospects.

GCC Mentor writing budgets: headline 200 characters, summary 2,000 and each
experience description 1,800; these are conservative product budgets, not a
claim about every current portal field limit. The user checks the destination
field when pasting. LinkedIn’s existing budgets remain unchanged.

`naukrigulf_optimization` and `naukrigulf_review` are distinct admin provider/
prompt keys. Existing atomic usage reservations run before generation; successful
usage counts only after independent review and persistence. Default daily
ceiling 5, concurrency 1. Commercial locks remain in the existing demo phase.

## Generation latency

Writing and independent review run sequentially because review needs the written
output. Both now use the existing OpenRouter `reasoningOff` option to reduce
extended reasoning overhead; other providers ignore this transport hint.
Grounding validation, shape checks, independent review, repair and fallback
behavior remain mandatory. No model/configuration or output budget was changed.
The processing screen shows actual seconds elapsed and the pipeline sequence;
it does not invent stage completion or a countdown.

Read-only aggregate usage diagnostics on 2026-10-11 found two LinkedIn writing
calls averaging 5,082 output tokens and two reviews averaging 2,223; one
NaukriGulf writing call used 10,093 and its review 2,419, all on configured
DeepSeek V4 Flash. This tiny sample is not a latency benchmark. Existing usage
rows have no duration field, so actual speed improvement remains unmeasured.
A signed-in real-model smoke test is still needed after deployment.

## Storage and deletion

Migration 070 adds one `naukrigulf_drafts` row per owner, with the same bounded
setup/import/output/checklist and optimistic revision design as LinkedIn. RLS
enforces owner-only authenticated reads; anonymous access and direct user writes
are revoked. Authenticated validated APIs use the service role for scoped writes.
Separate storage prevents one platform from replacing the other's draft.
Fingerprints include career facts and current location/notice/visa so changes
to those finishing fields also mark an older draft stale.

Foreign keys cascade on both auth-user deletion and Career Profile owner
deletion, so Settings cleanup reaches NaukriGulf drafts. No uploaded file is
retained, no credentials or private profile values are logged. Live columns,
constraints, indexes, policies, grants and service control were verified after
applying migration 070. Security advisors report no finding for the new table;
pre-existing project findings are unchanged.

## Verification and limits

54/54 automated checks, typecheck, lint and production build passed. Dedicated
API tests cover authentication/ownership, quota refusal, two-stage checks,
failed/raced writes, editing/checklist and import confirmation. Real local SQL
tests cover RLS/grants, uniqueness, revisions and both deletion cascades.
Server-rendering checks cover introductions, navigation, platform previews,
privacy and character budgets. Browser fixtures are available via
`test:linkedin` and `test:naukrigulf`; they have not been run for this change.
The managed environment has no supported browser-control capability. Physical
mobile layout and authenticated live generation remain unverified.

## Artwork

`public/professional/profile-hero-v1.webp` is generated illustrative artwork,
not a customer image. The built-in image-generation tool produced a premium
editorial photograph of two South Asian professionals preparing a career
profile at a laptop in a daylight Gulf office, with a subtle Dubai skyline,
navy/teal accents and no readable screen, text, logos or watermark. It is
labeled illustrative on the pages. Gentle card motion respects reduced motion.
