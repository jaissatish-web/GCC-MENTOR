# DECISION LOG — what was decided, when, and why

**Newest first. Append here the moment a decision is made, before the code is
written.**

This file records *decisions*, not work. It answers "why is it like this?" — including
for decisions that were later reversed, because a reversal is only understandable
alongside what it reversed.

A decision belongs here if changing it back would need a conversation. Format: date,
what was decided, and the reasoning that made it the right call.

---

## 2026-08-18 — pricing: one-time bundles now, recurring later

**Founder decision, revising the earlier "monthly recurring" assumption.** The paid
model is **one-time purchases**, not subscriptions — recurring billing is explicitly
deferred ("later we can think about monthly recurring").

**Free** — one resume download per calendar month (resets monthly), edit and save the
profile anytime, full visibility of the dashboard and the whole platform. The monthly
reset applies only to the free download cap.

**Paid — four one-time bundles:**
1. **Single resume** — one-time purchase
2. **Small package**
3. **Big package**
4. **Quarterly package** — for someone actively applying; one payment, ~3 months of access

**Why this keeps options open:** every bundle is a single payment, including the
quarterly one (time-bound access, not a recurring charge). So **no recurring-billing
provider is required**, which widens the payment-provider shortlist in §A1 of open items
rather than narrowing it. The quarterly bundle does need a time-bound access window
(purchase date + ~3 months), which is a small addition to the entitlement model.

**Supersedes** the "assumed monthly recurring" note in the earlier free/paid entry below.
The `service_packages` table already models named bundles with per-service quotas, so the
four bundles are rows in it; the quarterly access window is the one new concept.

---

## 2026-08-18 — the free/paid model, spelled out (spec; enforced when locks return)

**Founder decision.** The full freemium shape. Recorded now as the entitlement spec;
**not enforced yet** — the product is in the locks-off build phase and there is no
checkout, so hard gates would block everyone. It maps onto the existing
`plan_entitlements` table and is wired to real gates in the same pass that re-applies the
paid locks.

**Free user gets:**
- **One** GCC Readiness scan, ever — not repeatable (today the scan is IP-rate-limited;
  the per-account "once" limit is part of this spec).
- The auto-filled Career Profile (one free LLM extraction at signup) — editable by hand.
- **One template download per month** — choose a template, download the free resume,
  capped at once per calendar month.
- Everything else — AI optimization, ATS / Job Readiness, cover letter — **shown but
  frozen**: visible as locked tiles to motivate upgrading, never hidden, never a
  dead-looking control.

**Paid user gets:**
- **All options open.** Payment unlocks the full set of services.
- A **dashboard showing their package / bundle** — what they bought and what it includes.
- **Guided navigation** through the services.

**Assumed monthly and recurring** (consistent with the earlier monthly-plans decision):
paid opens everything while subscribed, and the free "one download per month" resets each
month. To be reconfirmed if the founder meant one-time-unlocks-forever.

**How it maps to what exists:** `plan_entitlements` already carries `free_allowed`,
`free_limit` and `free_value` per feature — one scan, one download/month, and which
features are frozen are exactly those columns. `lib/entitlements.ts` already reads them
and fails closed on paid features. The remaining work is the per-feature *gates* that
call it, plus the monthly-reset counter, plus the dashboard bundle view and the guided
nav — all in the re-apply-the-locks pass.

**The standing rule still holds:** the signup extraction and the GCC Readiness scan stay
free when the locks return; the gates go on optimization / ATS / cover letter and on the
download cap, not on reading the user's own resume or scoring it.

---

## 2026-08-18 — one free extraction at signup (Option B), paywall moves

**Founder decision, and it revises the tier split below.** The earlier plan was
free = type / paid = upload-and-extract. On reflection that was friction for no good
reason: after a free user has already given us their resume for the readiness scan, we
*have* their resume text — making them retype it by hand is a wall to lose them at.

**So: everyone gets one free LLM extraction at signup.** The first Career Profile build
auto-fills from the resume the visitor already scanned — the "wow" moment right after the
account is made. This is the same LLM extraction that was going to be paid.

**The paywall moves off extraction and onto the things that are genuinely the paid
product:** the AI resume optimization, the ATS / Job Readiness score, and the cover
letter. That is a cleaner line anyway — the paid product is the AI *rewrite* and the
job-specific analysis, not reading a document the user handed us.

**Why this is the right trade:** one extraction call is cheap next to losing a signed-up
user to manual typing, and an auto-filled profile is the strongest possible first
impression. It also corrects a misconception worth stating plainly: **arithmetic cannot
build the Career Profile.** The arithmetic engine only *scores*; turning a messy resume
into structured fields is the LLM's job and only the LLM's — which is exactly why the
old non-LLM extractor was thrown away for fabricating data.

**What stays free vs paid now:**

| Free | Paid |
|---|---|
| GCC Readiness scan (arithmetic) | AI resume optimization |
| One profile extraction at signup (LLM) | ATS / Job Readiness score |
| Typing / editing the profile | Cover letter |
| The free resume (own facts in a template), PDF download | |

**Open, not decided now:** whether a *later* re-upload / re-extraction (a second resume,
months on) is also free or is gated. Left for when it matters; the signup extraction is
the one that is settled as free.

**Built the same day:** the Scorecard handoff now routes straight into the existing
extraction screen (`/onboarding/extracting?path=claimed`), so a user who came through the
scan is auto-extracted and lands on a filled profile. Reused proven plumbing; the handoff
is cleared once consumed. **When the paid locks return, this signup extraction must stay
free** — the gate goes on optimization / ATS / cover letter, not here.

---

## 2026-08-18 — post-signup: build the Career Profile first, tier-based input

**Founder decision, all points confirmed.** After signup the first screen is **Build
your Career Profile**, and how the profile gets filled depends on the tier:

- **Free → type.** Manual entry, no LLM.
- **Paid → upload.** LLM extraction reads the resume and auto-fills the profile.

**This formally puts LLM extraction in the paid tier**, and it is an honest paywall:
extraction is a model call that costs money, so a free user does the typing themselves
and a paid user pays for us to do it for them. Not an arbitrary gate — one that reflects
a real cost.

**Three points settled with it:**

1. **Neither tier re-uploads.** The Gulf Readiness Scorecard already captured the resume
   *text* into the browser handoff. A free (type) user sees that text beside the form to
   copy from — never a blank page. A paid user's extraction runs on that same text. The
   handoff is what makes this work; the resume is given once.

2. **GCC Readiness updates live as the profile is built, and the score is allowed to
   rise.** It is arithmetic, so it recomputes instantly as fields fill. The framing is
   **"your score improves as you complete your profile"** — not "fixed after signup." The
   reproducibility promise still holds for *identical* inputs; more profile data
   legitimately means a higher number, and that is honest because the user can see why.

3. **One scoring engine, not two.** The live profile-based readiness runs the **same
   arithmetic engine** as the anonymous scorecard, fed from the structured profile once it
   exists rather than from raw text. Two different engines would make the number jump for
   a reason the user cannot see; the same engine keeps the pre- and post-signup scores
   consistent.

**Still to come:** the founder has a further piece to discuss after this. Not yet
designed. Build happens next session.

---

## 2026-08-18 — two scores, two tiers: readiness is free, ATS is paid

**Founder decision.** The product has two different scores and they sit in different
tiers:

| | **GCC Readiness** | **ATS Score / Job Readiness** |
|---|---|---|
| Question | Ready for the Gulf market in general? | Ready for *this specific job*? |
| Method | Arithmetic, no LLM | **LLM** — costs real tokens |
| Input | Resume + funnel answers | Resume + a job description, or **job title + industry** when no JD |
| Tier | **Free, anonymous** | **Paid plan** — not free, not anonymous |

The logic is honest: the free score is free *because* it costs nothing to run; the
score that spends tokens is the one that is charged for.

**The contradiction this closes.** Today the anonymous `/ats-scan` fires LLM calls —
extraction, JD structuring, job-match explanation — for a logged-out visitor whenever a
job description is pasted. That is exactly the free-LLM giveaway this decision forbids.
The free anonymous path is now **only** the arithmetic GCC Readiness Scorecard; the
LLM job-readiness score moves behind the paid plan and requires an account.

**"Paid" is inert until there is a checkout.** Razorpay KYC is still blocked, so a
paid-only gate means the *only* way to run ATS — including for the founder's own
testing — is an admin credit or a promo code, exactly like resume optimization. This is
consistent with the whole product once the locks return; it just means ATS is not
self-serve until the payment-provider decision (§A1 of open items) is made. The founder
chose "paid plan" over "signed-in, open during the build" with that understood.

**A build note carried by this decision:** the current Job Match engine *requires* a job
description (it structures the JD first). ATS must also run on **job title + industry
alone** when no JD is given — a new, smaller input path to add.

**Not built in this decision — recorded for the next step:** gating ATS behind the paid
plan (with admin/promo unlock), adding the title+industry fallback, and retiring or
repurposing the old anonymous `/ats-scan` free path.

---

## 2026-08-17 — the Gulf Readiness Scorecard is fully arithmetic

**Founder decision, final: the entire readiness engine — score, scenario, strengths,
gaps, recommendations, ranking — is arithmetic. No LLM call anywhere in it.**

This is better than the LLM version, not a compromise:
- **Reproducible.** The same resume always scores the same. An LLM scorer once returned
  78 then 45 for one CV, which is why the score is deterministic in the first place.
- **Free and instant.** No token cost, sub-second, safe as the top of the funnel.
- **Cannot fabricate.** A scorer that never writes prose cannot break the grounding rule.
  It awards points only for evidence it actually finds.
- **The anonymous score and the signed-in detailed score are identical**, because the
  same pure function runs on the same inputs. The number never changes after signup —
  exactly when it must not.

**One engine, two views.** `lib/gulfReadiness/` takes funnel answers + resume text and
returns the complete result. Anonymous shows a subset (score, scenario, band, top three
strengths and gaps, one or two recommendations); after signup the *same object* is shown
in full. The signed-in report is the anonymous result unblurred — nothing is recomputed.

**The scoring model.** Six dimensions per scenario, each with a max, summing to 100. The
situation is a **visible dimension** — "Gulf Market Position" — auto-filled from the
funnel answer rather than a modifier bolted on and clamped:

| Situation | Gulf Market Position (its max, auto-filled) |
|---|---|
| Currently in Gulf | 15 |
| Returner | 8 |
| Domestic experienced | 5 |
| Fresher | 0 (dimension not shown) |

Its max varies by scenario and it fills to its max, so **every scenario can still reach
100** — a fresher's 100 comes entirely from education, projects and skills, so they are
never structurally capped or punished for a situation they cannot change. A stronger
situation simply means fewer points must come from the resume, which is honest: being
in-market *is* an advantage. This resolves the founder's "+3/+3 makes a difference" as a
real, explainable line item, with no clamping.

**Evidence is heuristic, and honest about it.** The resume dimensions are scored by
rule-based detection on the text — quantified achievements (numbers in bullets),
certifications, education, skills, contact completeness, availability signals. Each
dimension returns `{ score, max, evidence[], gaps[], confidence }`. Where detection is
weak the **confidence drops and the report says so** — never a false zero presented as
fact.

**Band messages, and every band routes honestly to optimization** (founder design). The
point is that each band has a *real* reason to optimise, so the nudge is never invented:

| Score | Direction |
|---|---|
| Under 50 | Not Gulf-ready yet — start by optimising the resume |
| 50–74 | Good foundation, close — an optimised resume gets you application-ready |
| 75+ | Ready to apply — now tailor an optimised resume to each specific job to get shortlisted |

**Messages are scenario-aware, not only score-aware** — 3 bands × 4 scenarios = 12 short
messages in config, tunable (and admin-editable later, like prompts). A fresher at 45 and
a returner at 45 hear different things.

⚠ **Honesty guardrail: readiness to *apply*, never a hiring probability.** No band ever
says or implies "you will get the job." This is the one place it would be tempting to
cross the line the whole product holds.

**Carry into signup: browser-held, no server record while anonymous** (founder delegated
the choice). The result object plus funnel answers plus resume text sit in `sessionStorage`
through the signup redirect; on account creation they are persisted to the new user and
the temp state is cleared. Abandon signup and nothing is stored server-side, ever. This
gives the strongest honest trust line — "we don't save your resume unless you sign up" —
and a reliable same-tab handoff. **Tradeoff:** close the tab or switch device before
signup and it is lost; the user re-runs. The existing `anonymous_analysis_sessions` table
is left in place (not deleted without instruction) and simply not used by this flow; it
can be retired deliberately later.

**The LLM extraction still exists, separately.** Building the editable Career Profile
after signup uses the existing extraction call — a different job (populating real fields
for later optimization). Readiness itself never calls it.

**Deliberately not in this build:** SEO pages, the score-improvement simulator, and any
country matching — per the founder's own sequencing. `gcc_country` and other country
columns are **not** removed; only the funnel omits the question.

---

## 2026-08-17 — Stage 1 funnel: ask the user, do not infer

**Founder design, approved and agreed.** The anonymous entry point becomes: a
"Check your GCC Readiness" call to action on the landing page → a window opens →
upload or paste a resume → then two or three short questions → the score.

```
Gulf experience?  →  YES  →  In the Gulf right now?  →  YES → currently_in_gulf
                                                     →  NO  → returner
                  →  NO   →  Years of domestic exp?  →  0   → fresher
                                                     →  1+  → experienced
```

**Why this matters more than it looks: it fixes the product's worst live defect at
the source.** Job Match scores GCC experience as **zero on every anonymous scan**,
because the only field it counts is set by a dropdown an anonymous visitor has never
seen. Asking the user directly replaces a fragile inference from resume text with a
fact the user states — so the grounding rule is intact, and there is no parsing to
get wrong.

**The four categories already exist and already score differently.**
`lib/readiness.ts` derives fresher / experienced / returner / currently_in_gulf and
carries separate weight tables for each, every one asserted to sum to 100. None of
it was reachable anonymously because nothing asked. The funnel is the missing input,
not new scoring logic.

**"In the Gulf right now" is worth the extra tap** — the founder's two questions give
two buckets, this third gives all four. A returner and someone already in-country are
genuinely different to a Gulf employer: one needs relocation and a new visa, the
other has a transferable visa and can start next month. The existing weights already
reflect that.

**No country question. Founder decision, final.** Not which Gulf country, not
country of experience. It follows that `gcc_country` on work experience becomes
redundant as a scoring input — it exists only for this purpose and is the field
behind the zero defect. Whether the country columns are removed from the product
entirely is a separate, unanswered question; **no column is dropped without an
explicit instruction.**

**Self-declared answers are scoring input, never resume content.** If someone states
ten years of Gulf experience and their CV shows none, we **trust them for scoring** —
it is their claim about their own life, and a badly written CV is exactly why we ask.
But that number must **never** become a bullet or a summary line unless the resume
supports it. Scoring input and generated content are different things, and blurring
them is how the grounding rule gets broken by accident rather than on purpose. To be
enforced in code, not by convention.

**Order:** upload first, questions second. The file is the commitment; someone who
has already uploaded will answer two more taps. Answers are stored on the anonymous
scan session alongside the resume text, so they carry into signup and pre-fill the
profile — the user never answers twice.

---

## 2026-08-17 — the build plan, agreed

**Core product first, commerce afterwards.** Founder's decision, stated twice and
locked here: get **every service working individually** — on the Career Profile as the
only fact source, and on our own prompts — and only then decide payment, bundles,
pricing and free/paid control. "First our target to build our core product, clean and
workable; later we will do these extra work."

**The eight services.** Six exist and now run unlocked: GCC Readiness, the ATS/GCC scan,
Job Match, resume optimization, cover letter, downloads. **Two are genuine builds from
zero: Interview Q&A and Mock Interview** — they have config rows and nothing else. They
move from "planned, accommodated" to "to be built" as a result of this decision.

**Plans will be monthly subscriptions.** Recorded now, deliberately **not built** now.
It changes nothing about the core build, but it constrains exactly one later decision:
**the payment provider must support recurring billing**, which narrows the shortlist.
Note it before choosing a provider, not after. What exists today (bundles of one-time
credits that never expire) is not a subscription and would need expiry, renewal and
reset to become one.

**Bundles and metering are deferred, and mostly already exist.** The admin screen for
building a package, per-service quotas, atomic granting and atomic consumption are all
built. Almost nothing consumes them. When metering is switched on it goes through **one
wrapper — spend a credit for service X, only after a validated success, never on
failure** — not per-route, because eight routes is eight chances to forget, and this
project has been burned that way twice. **Free readiness scanning stays unmetered**: it
is arithmetic, costs nothing to run, and is the top of the funnel.

### Prompt control — draft then publish

Founder wants to change and optimise prompts himself, with versions and testing, from
the admin panel. Approved, with a floor.

**What was found on checking:** prompt control is roughly 5% built, and what exists is
inert — `LIVE_PROMPT_TEMPLATE_KEYS` is an empty array, so **no AI call reads any prompt
template today**. Storage is one row per key, edited in place: no version, no history,
no rollback.

**The floor, which is not negotiable.** A prompt has three parts and they are not
equally editable:
- **Editable:** persona, tone, task instructions, emphasis, examples — where quality lives.
- **Never editable:** the grounding block. A bad edit silently turns off the product's
  one promise and nothing downstream would catch it. It is injected by the control layer
  from one constant, which already makes this true by construction.
- **Never editable:** the output schema. The parser and the validator depend on it.

**Versioning:** never edit in place. A new version each time; exactly one active per
prompt; publishing is a flip and rollback is a flip back; nothing is deleted.
**Every generation records which prompt version produced it** — that is the whole point:
without it, when quality moves you cannot tell whether it was the prompt, the model or
the input.

**Versioning comes before tuning the services**, not after. Tuning first would mean
tuning with no record of what changed.

**Testing:** draft against active, same input, same model, side by side — and **run
against saved fixture profiles, never real users' data**, because admin access to real
profiles is audited for a reason. **The grounding validator runs on test output too**,
so a draft can be seen failing grounding before it is published. That is what makes
handing over the controls safe.

### Two guards to hold while services are built

1. **User data is data, never instructions.** Profile facts are mapped into every
   prompt — but a user can type "ignore previous instructions" into their professional
   summary. Facts go in a delimited block the model is told is data, never merged into
   the instruction text. Cheap now, ugly to retrofit across eight services.
2. **Deterministic logic stays in code, not in prompts.** As prompts become editable
   there will be a pull to move scoring rules into prompt text where they are easier to
   tweak. That is how the readiness score once returned 78 and then 45 for the same
   resume.

### LLM configuration — checked against the code

Founder's belief that per-service provider/model/key with fallback is already built is
**correct, and it is genuinely wired** — all ten call sites pass their own service key,
so a model changed in the admin panel really does change that service. Saving replaces
the previous values.

**One part of the described behaviour does not exist.** The `default` row is a
*configuration* fallback — used when a service has no row of its own — **not a runtime
one**. If a service's primary and its fallback both fail mid-call, the request throws;
the default provider is never tried. **A third runtime tier will be added**, with the
guard that it skips the default when it is the same provider and model already tried,
so a broken call does not pay twice for the identical failure.

**Two smaller fixes with it:** fallback only activates when provider, model *and* key
are all set — setting only a fallback model silently does nothing, and the screen must
say so. And two live, money-spending calls (`job_description`, `job_match_explanation`)
appear only under "other overrides" rather than as named cards; they become first-class.

**The service list is collapsed to one place.** It currently lives in three — the admin
screen, the provider config and the control-layer registry. One list means adding a
service is one edit, and it removes the silent-typo class of bug that the bundle screen
warns about on its own face.

### The order

1. Prompt registry, versioning, draft/publish/rollback, version stamped on every generation
2. The LLM-config fixes above, same run — same control panel, all small
3. Services onto the control layer, one at a time, tuning prompts with history
4. The prompt test bench, once there are two or three services to compare
5. Q&A and Mock Interview, built from zero
6. Then commerce: provider, bundles, monthly, free/paid

**Before step 3, each service needs a definition of "working"** — a handful of real
fixture profiles and what a good result looks like. Otherwise "make all services work"
has no finish line. It is the same fixture set the test bench uses, so it is not extra
work, only earlier work.

---

## 2026-08-17 — later the same day

**Every paid lock is removed. All services are open.** Founder decision, taken after
hearing the alternative and the costs.

**The plan:** build the whole pipeline first — readiness, ATS/GCC scoring, job checking,
resume optimization, cover letter, downloads, and the two that do not exist yet (Q&A and
mock interview) — one service at a time, getting the prompting and LLM control right,
**then** apply the paid locks over a finished machine.

**What was removed:** the payment check before generation, the `is_paid` gate on the PDF,
Word and cover-letter routes, the cover-letter credit requirement, and the page-level
redirects that sent an unpaid resume to the payment screen. `lib/packageAccess.ts` is
deleted; the labelling half survives as `lib/resumeKind.ts`, which explicitly grants
nothing.

**What was deliberately kept:** the `is_paid` and `tier` **columns** (dropping them is a
destructive schema change, and the locks are coming back), the admin promo-code and credit
tools (they unlock things — they never blocked anyone), the daily rate limit on generation,
and the payment screen itself, now a pass-through that forwards rather than a dead end.

**No credit is consumed anywhere while the locks are off.** Spending an admin-granted
credit on work that is free anyway would silently burn something the founder issued, and
the ledger would record it as having paid for the run.

**The alternative was offered and declined.** A single unlock switch would have kept the
gate code intact and made re-locking a one-line change. The founder chose outright deletion.
Three consequences, accepted knowingly:

1. **Re-applying the locks is a rebuild**, including the 18 assertions that proved the gate
   failed closed on every malformed input.
2. **The invariant is being broken on purpose.** The gate rested on "AI content cannot
   exist without payment". Rows will now exist with content and `is_paid = false`, which is
   exactly the shape the old gate refused. **Whoever re-applies the lock must handle those
   rows** rather than assume they cannot exist — purge them, or mark them.
3. **Payment was one of two limits on model spend.** The other, a daily per-user rate limit
   on generation, is still in force — so this is not an open tap, but the remaining limit is
   now the only one and its value is worth reviewing.

**Nothing was marked paid to make things work.** `is_paid` stays false on new rows. Writing
`true` would have been simpler and would have kept several UI filters working untouched, but
it would put a false fact in the database and every row from this phase would later read as a
completed purchase. The UI filters were changed instead.

**First build target: the LLM control layer**, chosen by the founder ahead of any individual
service — one module owning model choice, prompt assembly, token budget, retries, structured
output, mandatory grounding validation, cost logging and failure diagnostics. Doing it first
means the seven services plug into it rather than being retrofitted afterwards.

---

## 2026-08-17

**Documentation consolidated into current-state part-files; ticket history frozen.**
Founder's call. The 24-file `docs/` folder had drifted badly — the rules file actively
forbade four features that were already shipped and live, and the scope file claimed one
resume template and no free tier when the product had 15 and a free tier. Anyone
reading `docs/` got a picture roughly a month out of date.

Replaced with numbered part-files, one per area of the product, each describing what is
actually built and verified. **No active document refers to a ticket number.** The
ticket-by-ticket log and the old rolling status file moved to `docs/archive/`, frozen and
unreferenced — kept because they record *why* certain privileges turned out to be
unsafe, which invariant the payment gate rests on, and why the delivered document is
frozen. Durable knowledge of that kind was lifted into the new files.

**Free tier: one free resume, edited through the Career Profile.** Chosen by the founder
from two options. A free user keeps one resume built from their own typed profile, may
use a permitted template, may edit it, and may download the PDF. What is paid for is the
AI rewrite.

**The access gate moved from the container to the content.** Both the PDF route and the
resume screen used to refuse any unpaid package. But a package that never went through
the optimizer holds no AI text — every word is the user's own typing. Refusing to show it
protected nothing and was the only reason a free tier appeared to need a second
rendering path. The gate is now "does this row hold AI-written text", which is strictly
safer: the thing protected and the thing checked are now the same thing, where before they
were only correlated.

**Control panel before screens.** The founder chose to build the free/paid split as an
editable table with an admin screen first, and to pick the free template list himself —
so packaging changes never need a developer.

**`TRUNCATE`, `TRIGGER` and `REFERENCES` revoked from the client roles on every table.**
Found only because a new migration's own grants were read back rather than assumed. It
was granted on 12 of 12 tables, and truncate ignores row-level security entirely, so one
successful call as an anonymous client would have erased every profile. Not reachable by
any route found — latent, not open.

**The delivered document is frozen.** Fixed fields used to be read live from the profile
at render time, so editing a profile silently rewrote resumes already paid for.

**The blurred pre-payment preview was deleted outright**, renderer included, with
explicit founder approval. Once the preview screen became paid-only, the only people who
could reach it were paying customers — shown their own CV blurred under "Unlock to
download".

**The free CV download link was removed from the profile page** at the founder's request
during a layout change. Consequence not intended: it was the only link, so the free
download is now unreachable. Unresolved — see
[`14_OPEN_ITEMS.md`](14_OPEN_ITEMS.md) §B4.

---

## 2026-08-16

**Pay before generate.** Optimization used to run before payment, so every visitor who
never bought still spent real model tokens, and the product then sold a blurred preview
of work it had already paid to produce. A schema change was needed because payment
applies to an existing package row, so the row must exist before money can be taken.

**The GCC Readiness score is deterministic, with no model call.** A model scorer returned
78 and then 45 for the same resume, took 97 seconds and cost money each time. Now 0.6
seconds, zero cost, repeatable. A number shown to a user as a finding must be
reproducible.

**The palette moved from green to navy** — by changing token *values* and keeping the
green *names*, which is the source of the naming hazard in
[`12_DESIGN_SYSTEM.md`](12_DESIGN_SYSTEM.md) §1. This restored the original stated
direction: navy = action, gold = purchase and readiness. The green was the divergence.

**The hand-rolled PDF extractor was replaced with PDF.js.** It had no support for
custom font encodings: a subsetted-font PDF extracted as a plausible-looking cipher with
every digit silently deleted, 19,000 characters of it passed the length check, reached
the model, and the model invented achievement figures contradicting the real resume.
Licences checked — MIT/Apache only; an AGPL alternative was deliberately rejected.

**Re-uploading a CV merges rather than replaces.** It used to overwrite a profile
wholesale, destroying hand-typed data and silently rewriting already-paid resumes.

---

## 2026-08-15

**Planned services appear in the navigation, dimmed and non-interactive.** A deliberate
reversal of "no nav entry on any breakpoint": the founder wanted the roadmap visible, and
chose the dimmed treatment specifically so nobody taps into a dead end — which is what
the original rule was protecting against. They carry no link target by construction.

---

## 2026-08-13

**The AI pipeline went live.** An OpenRouter key was set in the admin panel. Every
statement before this date about AI features being unverifiable was true at the time and
is now stale.

---

## 2026-08-11

**The redesign is presentation-only.** Founder's words: "We are keeping the product. We
are changing the experience and visual presentation" — explicitly contrasted with
"existing product + new product idea = different product". Every feature, service,
business rule, API behaviour, database structure, AI logic, auth, payment logic,
calculation, validation, permission and workflow stays exactly as it is. Inventing new
functionality was banned outright, including anything resembling a job
discovery/matching *service*.

**Three new pages were approved as in scope** — readiness, job match and cover letter —
because each wires an already-built engine into new UI with zero new logic.

**Mock Interview, Q&A and Saved Jobs are planned future services, not banned.** The
design system must accommodate them architecturally without building any functionality or
fictional data. A job board, resources, notifications and a premium subscription tier
remain fully excluded pending separate approval.

**A separate `gold-text` token was introduced.** Measuring real contrast ratios showed
raw gold fails as text on light backgrounds at 2.8:1. The new token passes at 5.6:1. Gold
is a fill colour; `gold-text` is a text colour.

**Heroicons approved as a dependency**, documented explicitly because dependencies are
never introduced silently.

**Config rows added for two features that do not exist** (interview Q&A, mock interview).
The conflict with the no-unbuilt-features rule was raised and the founder chose to add
them anyway, inert, so they can be switched on without a migration.

---

## 2026-08-10

**GCC Readiness and Job Match became the priority**, ahead of the cover letter frontend.
The agreed sequence: readiness data layer, anonymous sessions, the Job Match engine, then
the optimizer wired to Job Match findings.

**Anonymous scan results are now stored** — a deliberate reversal of the earlier "store
nothing" decision, with real mitigations rather than a relaxed principle: single-use,
7-day expiry, claimable only by a new account. The user-facing copy was corrected in the
same change, because the page still promised nothing was saved.

**`target_country` became optional and informational.** It never changed CV format or
generation behaviour — Gulf format conventions have always been country-agnostic — and it
was never rendered on a resume. Requiring it and labelling it as setting CV format was
misleading.

**Job Match scoring weights are equal and explicitly interim.** Real weights are a
product decision that has not been made, and inventing a weighting that looked
authoritative would be worse than an honest equal split.

**The semantic layer cannot override a deterministic score** — enforced by the type
system, not by asking the prompt nicely.

---

## 2026-08-08

**The product is named GCC MENTOR.** "HireCircuit" — an earlier, differently-specified
build — is never used in new copy.

---

## 2026-08-07

**AI calls go to OpenRouter over plain HTTP, with no vendor SDK.** Founder's
requirement: provider, model and key must be changeable from the admin panel without a
redeploy. There is no seeded default, so an unconfigured state is a clear error rather
than a guessed model.

**Two Phase 2 items were pulled forward:** the free readiness scan with **no login**, and
multiple selectable templates. The no-login requirement introduced the need for an
IP-keyed rate limit, since there is no user id to key on.

**Admin status is a database flag with no UI that grants it.** A user who could write
their own row could make themselves an admin, so the profiles table gets select-only
policy for its owner and nothing else.

---

## Standing decisions with no single date

**The grounding rule** — the AI may use only facts already in the user's profile. The
product's core safety promise, its central marketing claim and its legal shield.
Changing the wording of the constant requires founder and CTO approval. See
[`02_PHILOSOPHY.md`](02_PHILOSOPHY.md) §1.

**One Career Profile is the source of truth for everything.** No output is ever
re-derived from a fresh upload. This is what made the cover letter cheap — a different
persona, no new data layer.

**One derivation, many renderers.** A resume is derived once; every template renders that
derived document. This is why 15 templates cost roughly what one costs.

**Presentation is stored separately from content**, so restyling can never rewrite what a
resume says.

**A commercial table gets no write policy at all** rather than an owner-only one. Tighter,
not looser: a user who could write promo codes or credits could mint themselves the paid
product.

**Passport type and validity may be stored. The number never may.** No document copies of
any kind, and no religion field.
