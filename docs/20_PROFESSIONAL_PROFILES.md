# Professional profile preparation

`/professional-profile` is the signed-in hub for LinkedIn and NaukriGulf.
Both tools first show a photo-led introduction, platform purpose, useful
activity habits, profile fields, GCC Mentor’s approach and an optimization CTA.
Official platform guidance is linked. The suggested daily routine is a product
recommendation, not a claim about ranking algorithms; meaningful updates and
accurate information are emphasized. No recruiter-response or hiring promise.

## NaukriGulf

`/naukrigulf-optimization` → `/naukrigulf-optimization/workspace`. New layouts
authenticate server-side and use the existing AppShell; protected middleware
is unchanged. The hub/new routes are noindex and disallowed in robots.

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
