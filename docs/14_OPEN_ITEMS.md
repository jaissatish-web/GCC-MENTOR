# OPEN ITEMS — every known defect and every undecided decision

**This is the only to-do surface.** Anything not here is either done or not agreed.

Nothing is removed from this file until it is genuinely resolved, and when it is
resolved it is deleted rather than marked — the part-document it affects carries the
outcome instead.

**Last reviewed:** 2026-08-18

---

## 0. Standing: the paid locks are off

**Every paid lock was removed on 2026-08-17 by founder decision**, so the full
pipeline can be built before the locks go back on. This is not a defect — it is a
deliberate, temporary state — but it has consequences that must not be forgotten.

**A0 · Re-apply the locks when the pipeline is done.** The specification to restore
is preserved in [`10_PLANS_AND_PAYMENT.md`](10_PLANS_AND_PAYMENT.md), which reads as
a restore guide. Three parts, none optional:

1. **The gate itself**, deleted along with `lib/packageAccess.ts` — plus the 18
   assertions proving it fails closed on every malformed input. A gate not shown to
   fail closed has not been shown to work.
2. **The rows created during this phase.** Generation now runs without payment, so
   rows exist with AI content and `is_paid = false` — the exact shape the old gate
   refused. **They must be purged or marked**, not assumed away.
3. **The credit consume on the cover letter**, restored *after* a validated success,
   never before, with a failed consume discarding the generation.
4. **`/package/[id]`'s "Edit" button** now opens `/package/[id]/edit` for every
   resume, generated or not (settled 2026-08-19 after a same-day correction — an
   intermediate version ran generation from Edit; the current one never does). Nothing
   here depends on the payment check that used to guard generation, so there is no
   loop condition to re-verify from this specific change. What DOES still need a
   decision before the lock returns: whether hand-editing an ungenerated resume for
   free should keep working once payment gates something, given it is now real, working
   plumbing for the free-tier question in W2. See
   [`10_PLANS_AND_PAYMENT.md`](10_PLANS_AND_PAYMENT.md) §4 and
   [`11_USER_JOURNEYS.md`](11_USER_JOURNEYS.md) §6.

**A0b · Review the generation rate limit.** Payment was one of two limits on model
spend; the daily per-user limit is now the only one. Its value was set when a paywall
sat in front of it. Not urgent — it is a real limit and returns 429 — but it should be
a deliberate number rather than an inherited one.

---

## Auto-save edge: work_experience.start_date still required (2026-08-18)

The auto-save after extraction works. Target fields (migration 042) and
`education.institution` are optional, so an extracted profile saves without them. But
`work_experience.start_date` is **still required** — a resume that lists a job with no
dates would block the auto-save. Left as-is: making `start_date` nullable ripples into
readiness scoring and date rendering, and the failure is graceful (the draft stays on
screen, the user fixes and saves). Do the deeper fix only if real resumes often omit job
dates.

---

## Post-signup Career Profile build — partly built 2026-08-18

**Built:** the profile→readiness adapter (`lib/gulfReadiness/fromProfile.ts`, same engine,
9 assertions), the live-readiness widget (`components/gulfReadiness/LiveReadiness.tsx`),
and the Scorecard-handoff restore in `/onboarding` so the resume text is carried forward —
neither tier re-uploads. GCC Readiness uses the same arithmetic engine as the anonymous
scan.

**Moved 2026-08-18 (founder decision):** the live Gulf Readiness widget now renders on the
**dashboard**, not the profile editor. The dashboard reconstructs the funnel scenario from
the saved profile's readiness category (`answersFromReadinessCategory`), so it needs no
sessionStorage handoff and works for any signed-in user.

**Verified by tsc, lint, a full production build and the test suites — NOT in a browser.**
There is no authenticated session in the CTO environment, so the profile and onboarding
screens have not been seen rendered. The founder should check them on the deployed site.

**Still to do:**
- **The tier-gated chooser** (free → type, paid → upload). The restore and all three
  input paths work, but the chooser is not yet gated by tier — inert anyway while the
  locks are off, so it lands with the paid locks.
- **One engine, not two.** Two readiness numbers still coexist — the older
  `lib/readiness.ts` completeness score (Profile Strength) and the arithmetic Gulf
  Readiness market score. They no longer sit on the same screen: completeness is on the
  profile editor, Gulf Readiness on the dashboard, and the founder chose **2026-08-18 to
  show both** (each clearly labelled as a different thing). So this is now a deliberate
  two-number design, not an accidental duplication — reconciling onto a single engine is
  deferred by that decision, not outstanding cleanup.

---

## The free/paid gates — build with the lock re-application (spec 2026-08-18)

The full freemium model is decided and recorded ([`15_DECISION_LOG.md`](15_DECISION_LOG.md),
2026-08-18) but **not enforced** — it lands when the paid locks return. To wire then:
- **One scan per account**, one template **download per month** (monthly-reset counter),
  the signup extraction free, everything else frozen for free users as visible locked
  tiles.
- Paid unlocks all services; **dashboard shows the user's bundle**; **guided navigation**.
- It maps onto `plan_entitlements` + `lib/entitlements.ts`, which already exist — the gap
  is the per-feature gates that call them, the monthly counter, and the dashboard/nav.
- **Confirm:** monthly recurring (assumed) vs one-time-unlocks-forever.

---

## ATS / Job Readiness — the next build (decided 2026-08-18)

A paid-plan, LLM-based score of readiness against a *specific* job — distinct from the
free arithmetic GCC Readiness. Three parts:

1. **Gate it behind the paid plan**, with admin credit / promo unlock so it is testable
   before a checkout exists. Requires an account — never anonymous.
2. **Add a title + industry input path**, so it runs when no job description is given.
   The current Job Match engine structures a JD first and cannot run without one.
3. **Close the free anonymous LLM leak on `/ats-scan`** — today it fires extraction, JD
   structuring and the explanation for a logged-out visitor when a JD is pasted, which
   the two-tier decision forbids. Retire or repurpose that path; the free anonymous entry
   point is now the arithmetic Scorecard only.

Design and reasoning: [`15_DECISION_LOG.md`](15_DECISION_LOG.md), 2026-08-18.

---

## Gulf Readiness Scorecard — what remains

The anonymous flow is built and verified live (funnel → arithmetic score → result →
browser handoff). The signup restore is now wired (2026-08-18): after account creation
`/onboarding/report` re-renders the same result with `locked={false}` and the carried
resume text feeds the profile extraction — see
[`11_USER_JOURNEYS.md`](11_USER_JOURNEYS.md) §2. One piece remains before the readiness
routes are fully tidy:

- **The old `/ats-scan` → `/gulf-readiness` flow still exists** alongside the new
  `/gulf-readiness-score`. They overlap. Decide whether the old one is retired or kept for
  the job-description/Job Match path. Three readiness route names now coexist
  (`/gulf-readiness`, `/gcc-readiness`, `/gulf-readiness-score`) — worth consolidating
  deliberately, not urgently.

The weights and the twelve band messages are first-draft numbers in
`lib/gulfReadiness/config.ts`, meant to be tuned once real scores come in.

---

## A. Decisions only the founder can make

These block work. Nothing else in this file matters as much as the first one.

### A1 · Which payment provider — **blocking all revenue**

Razorpay's KYC is India-only and the founder is based in Saudi Arabia. There is **no
self-serve checkout**. Today a customer pays only via a promo code issued by hand or an
admin credit grant.

Everything downstream of the decision is a normal build. The decision itself is not
technical: it is which provider to use from Saudi Arabia, taking payments from a
primarily India-based audience.

**Until this is answered the product cannot take money from a stranger.**

### A2 · Finish the free tier, or shelve it

The gate, the database quota and the admin control panel are built and verified. **No
route creates a free resume and no UI offers one.** The remaining work is a creation
route, an entry point, and Library listing plus labelling — plus wiring the first gate
to the entitlements table and removing the "not live yet" notice in the same change.

Related and unresolved: the free profile-only CV download still works but **nothing
links to it** (§B4).

### A3 · Long-term pricing model — **decided: monthly subscription, deferred**

Founder decision 2026-08-17: plans will be **monthly**. Nothing is built and nothing
should be built until the core product works. **It constrains A1: the payment provider
must support recurring billing.**

What exists today is one-time credits that never expire — not a subscription. Making it
one needs expiry, renewal and reset, which is a schema change, not a config change.

The two bundle tiers on the landing page remain real prices with no purchase path.

### A4 · Legal content

Privacy policy, terms and refund policy are clearly-marked placeholders.

### A5 · Login method

Email magic link is what ships. Mobile+OTP and Google were both once open options. The
auth layer is provider-agnostic, so this is still changeable — but it should be decided
rather than defaulted into.

### A6 · Package and batch rules

Whether one payment is always one resume, or whether a batch across multiple targets is
possible. No database constraint assumes either answer.

---

## B. Defects and gaps, by severity

### B1 · Job Match scores zero on GCC experience for every anonymous scan — **highest-value defect in the product**

The category counts only work entries carrying a GCC country value, and that field is
written by exactly one thing: a dropdown in the profile editor. **Extraction never
derives it.** So on the free funnel the category is structurally always zero, whatever
the CV says.

Measured: a CV with 12 years in Abu Dhabi and Jubail against a matching Senior Piping
Engineer job description scored **48/100**, with three categories at zero, while the
semantic layer scored the same candidate 85/95/100.

**Why it outranks everything else here:** it is confidently wrong, on the feature the
product is named after, and the number is shown to real users as a judgement of them.

**The fix is more available than it looks.** Extraction already returns free-text
location per work entry — "Abu Dhabi, UAE" is already reaching us and is simply not
being read. Mapping that to a GCC country is deterministic and does not touch the
grounding rule: it reads a fact the resume states. Degree equivalence (`B.Tech` not
matching a job asking for `B.Eng`) is the second half.

**It needs a product answer first:** what "GCC experience" means for an untagged
resume, and how degree equivalence should work.

### B2 · The landing page makes two claims that are not true — **public-facing**

Both found 2026-08-17 while verifying pricing for this documentation.

1. The ₹499 tier lists **"PDF + DOCX Download"**. The Word download was withdrawn and
   nothing links to it.
2. The pricing section says **"Instant self-serve checkout today covers Resume
   Optimization"**. There is no self-serve checkout for anything.

A paying customer could reasonably expect a Word file and an instant purchase, and
receive neither. This is the exact failure mode
[`02_PHILOSOPHY.md`](02_PHILOSOPHY.md) §2 exists to prevent, and it is copy drift rather
than a coding error: both sentences were true of an earlier version of the product.

### ~~B3 · The default resume template cannot be restyled~~ — narrower fix shipped 2026-08-19

**Gulf Premium is now styleable** — font, size, accent, photo size and photo on/off —
through its own small, dedicated derivation in `GulfPremium.tsx`, not a port onto the
shared engine. Every derived value falls back to the exact original constant when no
override is set, and this was verified rather than assumed: the full 32,768-permutation
golden baseline was re-run with no overrides and passed byte-identical
(`docs/08_RESUME_ENGINE.md` §6).

**ATS Classic remains the one true exception, and that is now deliberate rather than
incidental.** Its whole reason to exist is "maximum ATS compatibility" — a styling
control, especially a photo, works against that, so it stays fixed on purpose. The
styling panel says so directly.

**The full port onto the shared engine (W6, `WORK_QUEUE.md`) is still open and still
deferred.** This fix closes the user-facing gap without taking on that Large,
higher-risk rework — it is a narrower, safer answer to the same complaint, not a
substitute for the eventual port if one is still wanted for its own sake (one rendering
implementation instead of two, not a defect this leaves behind).

### B4 · The free CV download is unreachable

The route works. Its only link was removed from the profile page during a layout change,
and nothing else points at it.

This matters because the free profile-only download was a deliberate founder decision,
on the reasoning that the AI rewrite is the paid product and putting your own facts on a
page is not. **A deliberate decision is currently switched off as a side effect of a
layout change.** It needs an explicit choice: link it from the Library or the dashboard,
or retire the free download on purpose.

### B5 · Unsaved profile edits are lost on navigation

Leaving the editor for the visibility screen mid-typing unmounts the form's state with
no warning; returning reloads the last **saved** state. Silent data loss on the product's
main "confirm your profile" screen.

Several reasonable fixes exist — auto-save before navigating, an unsaved-changes
warning, or carrying draft state through session storage the way the extraction handoff
already does. **Deliberately not chosen unilaterally.**

### B6 · Two routes one letter apart mean different things

`/gulf-readiness` is the **anonymous scan's results**. `/gcc-readiness` is a **signed-in
user's readiness against their saved profile**. Both are legitimate; the names are a
trap for anyone maintaining either.

Related: **`/gcc-readiness` is not in the navigation** at all. It is reachable only from
the dashboard's readiness card. That may be correct, but it should be deliberate.

### B7 · Colour tokens are named for the wrong colours

`forest` is navy; `forest-dark` is a light blue. Correct aliases (`navy`, `navy-deep`,
`navy-tint`, `sky`) exist in the config and `forest*` is marked deprecated, **but the
app still uses the old names throughout.**

Choosing a colour by its name produces a wrong result, and it has already shipped two
real defects that reached the founder: near-black text on a navy button (1.69:1), and
white labels on a white card. **Remaining work:** migrate usages, then delete the
aliases.

### ~~B7b · Three gaps on the AI provider control panel~~ — **resolved 2026-08-17**

All three fixed: the third runtime tier exists (default as last resort, skipping any
provider-and-model already tried), the screen now states that a fallback needs provider,
model *and* key together, and the service cards are generated from the single registry —
so `job_description` and `job_match_explanation` are first-class rather than buried under
"other overrides", and a new service appears the moment it exists.

**The service list is now in one place**, which also removes the silent-typo class of bug
the bundle screen warns about on its own face.

### ~~B7c · The prompt admin screen edits nothing~~ — **resolved 2026-08-17**

Replaced by versioned prompts with draft-then-publish. See
[`06_AI_PIPELINE.md`](06_AI_PIPELINE.md) §2b. **Nothing is published yet**, which is the
correct state — each service adopts a stored prompt as it is migrated onto the control
layer, and until then runs on its in-code prompt.

### B8 · Two small things on the optimize route, seen and accepted

Recorded so the next person does not rediscover them as surprises.

1. Two concurrent generate requests for the same paid, ungenerated package both pass the
   "nothing generated yet" check, because that check is a read and not a lock. The client
   guards a double-click; the real exposure is a deliberate retry or two tabs, costing one
   extra model call — **never a double charge.** A conditional update would close it.
2. Creating a package spends no rate-limit slot, so package rows can be created without
   limit. Storage only — no cost, no user-visible effect.

### B9 · Accepted tradeoffs, not defects

- **A malformed model response does not consume a rate-limit slot**, though the call cost
  money. Charging a user's daily attempt for a random model hiccup is worse.
- **The profile API assumes a full-object save.** A partial save would undercount
  readiness by scoring omitted-but-filled fields as empty. Nothing at the boundary enforces
  it; the editor simply always sends a full object.
- **Rate-limit windows use server-local time**, so the reset time shown to a user may not
  be a locally meaningful hour. Phone and email secondary keys are matched by exact string,
  so two formats of the same number are not recognised as one identity.
- **Nothing rejects "optimize nothing"** — no blocks selected and no experience entries.
  Self-inflicted only; costs the user their own rate-limit slot for a no-op.
- **Revisiting onboarding with an existing profile** would give a draft-only editor whose
  save could overwrite existing customisations. No UI path reaches it today.
- **The print tokens file and the Tailwind config must be kept in step by hand.** Print
  templates cannot use Tailwind classes at all — see
  [`08_RESUME_ENGINE.md`](08_RESUME_ENGINE.md) §5.
- **`next.config.mjs` still ships Chromium to a deleted route.** The blurred-preview
  renderer is gone; its file-tracing entry remains. Harmless, and worth removing next time
  that file is touched.

---

## C. Standing environment limitations

Not defects. They constrain how confidently anything can be verified, and every
statement of "verified" in this documentation should be read against them.

1. **No authenticated page has ever been checked in a live browser** from the CTO's
   environment — there is no real login session available. Every signed-in screen is
   verified by diff, build and reasoning, not by being seen.
2. **This machine has ~4GB of RAM.** Running a dev server and a production build
   simultaneously reliably corrupts the build cache and produces module-not-found errors
   that look exactly like real defects. If that happens: stop all Node processes, delete
   `.next`, start once.
3. **The direct database host is unreachable** from this environment; migrations are
   applied through the pooler connection string.
