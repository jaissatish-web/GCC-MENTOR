# LinkedIn Optimization

The existing `/linkedin-optimization` navigation destination now prepares
personalized content for users to apply on LinkedIn themselves. It does not
sign in to LinkedIn, create accounts, scrape profiles or update the live profile.

## Journey

1. Save Career Profile at `/profile` first. The service accepts any discipline,
   seniority and career stage, including graduates without work history.
2. Choose Career Profile only, upload an existing LinkedIn PDF/DOCX, or paste
   existing profile text. Upload/paste are optional comparison sources. An
   ordinary resume or a first LinkedIn profile uses Career Profile-only.
3. For imports, review extracted name, summary, roles and warnings. Confirm
   ownership and each identity/employer/title/date difference. Keep the saved
   Career Profile fact or correct it through the existing Profile editor, then
   refresh. Nothing in the import route writes Career Profile or pending drafts.
4. Confirm purpose, target roles, optional industry/countries, language/tone,
   selected experience (up to 12 roles), optional JDs, wording instructions and
   exact terms to omit. Target roles are directions, never already-held roles.
5. Optimize LinkedIn. The common task runner generates content and a separate
   review checks the facts. The previous draft survives failures or stale writes.
6. Review three editable headlines, About and experience descriptions; copy saved
   skills and fixed education/certification fields into LinkedIn. Actual employers,
   titles, dates and qualifications come from Career Profile. Use the top
   **Preview your optimized profile** button for an illustrative LinkedIn-style
   view using the user's own content/photo, with no fake followers or results.
7. Mark each applicable section updated only after changing LinkedIn. Copy alone
   does not complete it. Save edits/checklist; edited content clears that section's
   completed flag. Skipped tasks leave the denominator. The percentage is user
   checklist completion, never a hiring score. Preparing a new version replaces
   content/checklist only after successful generation and persistence.

## AI and privacy

`buildLinkedInPrompt.ts` selects expertise from the user's actual discipline,
career stage and target audience, not engineering defaults. It explicitly handles
freshers, career changes and regulated qualifications. The persona applies
seasoned editorial standards without claiming credentials or client successes.
The JSON schema contains prose and saved experience IDs only; the model cannot
supply employer/title/date fields. Skills must match saved names verbatim.

`linkedin_optimization` and `linkedin_review` are separate provider/prompt keys,
using the existing platform's default provider when no override is configured.
`runAiTask` injects grounding, validates structure and repairs once. Numeric,
leadership and other hard grounding failures refuse content; paraphrase/entity
flags receive independent semantic review. A false review verdict does not save
or count successful usage. Admin service controls and atomic reservations run
before model calls. There is no payment/optimization-credit deduction added.
Imports reuse the existing extraction pipeline/guard, but not its profile-save
routes or profile-recreation counters. No raw uploaded files are retained.

The AI input is a projection of career facts, not the full database profile.
Contact/identity/visa/birth-date fields and photo storage URLs are excluded.
Exact privacy terms and saved phone/email values are masked in narrative source
material; generated content containing exclusions is refused. Users still review
and control their public profile. Existing signed profile photos are displayed
only in the private preview.

## Storage and authorization

Migration `067_linkedin_drafts.sql` adds `linkedin_drafts`, keyed by `user_id`
with an auth-user deletion cascade. It contains setup, a small structured import
comparison, output, selected headline, completed/skipped tasks, a career-fact
fingerprint and an opaque revision. This is a saved generated artifact, not
another Career Profile or resume package. One record per user prevents duplicates.

Anonymous access is revoked. Authenticated users have owner-only SELECT via RLS;
INSERT/UPDATE/DELETE are revoked. API writes use the service role only after
session authentication, ownership lookup and validation. Updates require the
previous revision and user ID, so another tab cannot silently overwrite edits.
Generation also checks Career Profile fingerprints before and after AI calls.
Profile changes show a stale-content notice rather than rewriting saved output.
No existing RLS policies, protected auth files, resume snapshots or credit tables
are changed.

Rollback, if necessary: disable the service/page first; remove only the new
service-control row and new table after deciding how to retain users' drafts.
Dropping the table loses only LinkedIn draft data; no rollback was executed.

## Verification

`npm run check` includes `verify-linkedin.ts`, `verify-linkedin-api.mjs` and
`verify-linkedin-db.mjs`. They test personalized input, schema/grounding, privacy,
foreign experience IDs, conflicts, session/owner checks, quota refusals, two-step
review, failed/raced saves, checklist edits, import confirmation, RLS/grants,
one-per-user constraints, revisions and account-delete cascade. The SQL tests
run actual migrations in disposable PGlite, not a production/staging account.

`CHROME_PATH=/path/to/chromium npm run test:linkedin` exercises actual client
components with isolated API responses at 320/390/768/1440 widths, preview,
edit/save/failure/retry, persisted checklist, import confirmation/conflicts and
no-profile guidance. This does not prove live AI/provider quality or signed-in
production behavior. Those require a user session and real generation.

Hero guidance links official LinkedIn Recruiter search documentation and the
profile PDF export instructions. No fabricated hiring-improvement statistics or
third-party testimonials are displayed. The PDF export option is unavailable in
LinkedIn's mobile app and may not be available to every member; mobile users can
paste profile text or use Career Profile.


## Mobile presentation (2026-10-09)

LinkedIn setup/results use a quieter phone scale (22px page title, 16px section
headings, 15px reading text; editable fields stay 16px). The illustrative preview
has an independent profile scale: 20px name, 18px section titles and 14px regular
body/headline text. On phones, preview cards reach the screen edges, with an
overlapping avatar, compact banner and section rows for skills. Blue introduction
controls are decorative examples, not LinkedIn actions or account integration.
No connection counts, endorsements or other unsupported facts are invented.
