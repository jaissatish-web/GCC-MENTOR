# AI PIPELINE — providers, prompts, and the validator that can refuse to ship

**The grounding rule in [`02_PHILOSOPHY.md`](02_PHILOSOPHY.md) §1 governs
everything in this document.** Nothing here overrides it.

---

## 0. The control layer — `lib/ai/runTask.ts`

**One place that owns every model call.** Built first, ahead of the individual
services, so services plug into it rather than being retrofitted later.

**The problem it solves.** The provider layer below is a good *transport*, but
everything above transport was re-implemented by each route: building the system
prompt, remembering the grounding block, pulling JSON out of a chat response,
deciding whether the output was acceptable, and retrying. Seven services, seven
chances to forget one. The rule says a generation route without the grounding
instruction is a critical bug — but nothing structurally stopped one being
written.

**What it owns:** model resolution per service · prompt assembly with grounding
injected from the constant · the token budget · parse, shape check, and one repair
attempt · refusing to return output that failed validation · diagnostics.

**What it deliberately does not own:** authentication, ownership and rate
limiting — those belong to the route, in front of the call. A module that quietly
enforced them would hide where the real gate is. And it never authors prompt
*text*; that stays in the per-service prompt modules. **Since 2026-09-15 every
model-calling route runs the same gate in front of it — `lib/ai/serviceGuard.ts`
(pause, allowance, one-at-a-time, reservation; see §7) — still called by the route,
still visible there.**

### One deadline for the whole task (2026-09-15, audit H09)

A task may carry `deadlineAt`: the provider receives it as its give-up point for
every attempt and every provider tier, and a repair is started only when at least
`minRepairMs` remain. Each AI route sets its deadline 20–30s inside its own
`maxDuration`, leaving time to save and answer. Before this, the cover-letter route
capped itself at 60s while the provider could wait 280s, so a slow upstream outlived
the route and the platform's timeout page reached the user mid-spend.
`scripts/verify-deadlines.ts` asserts it with a faked provider — including a stalled
one — and checks every route's deadline against its ceiling.

### Grounding is declared, never defaulted

Every task must say which it is, as a discriminated union — so "I forgot" is a
**type error**, not a silent hole. Same technique that stops the Job Match
semantic layer overriding a deterministic score.

- **`enforced`** — the task writes prose from the user's profile. The grounding
  block is injected verbatim and the output is validated before it is returned.
- **`not_applicable`** — the task does not write from the profile (structuring an
  employer's job advert, say). **A written reason is required**, because an
  unexplained exemption is indistinguishable from a mistake.

### The repair attempt, and its personal-data contract

Invalid output gets **one** repair attempt: the model is told what was wrong and
asked to return the same format. Provider *failures* are never retried here — the
transport already tried the configured fallback, and retrying an outage in a loop
turns one failure into several billable calls.

The repair prompt may include the offending text, because the model needs to know
what to remove. **That value is never logged.** Only the personal-data-free
description reaches a log line.

### Token budgets are per service, with a floor

**A cut-off answer is not a short answer (2026-09-11).** `generate()` now returns
`truncated` — finish_reason=length, or Anthropic's stop_reason=max_tokens — so a caller
can tell an answer that stopped because the budget ran out from one that finished. It is
reported, not thrown, and logged either way (a truncated call was still paid for). Resume
extraction acts on it: its budget is 16,384 (`EXTRACTION_MAX_TOKENS`) after production read
the same CV at 2,246 output tokens once and 7,847 the next, against the old 8,192, and cut
the JSON off; a truncated extraction is refused with a clear "try again" rather than parsed.
Every other service receives the flag and keeps its existing behaviour.

**A stalled answer is not waited on (2026-09-12).** Every provider attempt has a stall
timeout (150s; `AI_STALL_TIMEOUT_MS` overrides) and a give-up point it never runs past
(280s from the call by default; a route with several calls passes its own). A stalled
attempt is retried once when at least 90s remain — OpenRouter routes each request afresh,
so a retry usually reaches a different, healthy upstream. Each call logs the upstream that
served it (`via <provider>`) with its duration. Found when a CV build hung for the
platform's full 300s on one model call that never answered.

**Reasoning models spend the budget before writing anything** — an
under-budgeted call returns thinking tokens and null content, which reads like a
refusal and is not one. Budgets are set per service and a minimum applies: a
budget too small to hold an answer wastes the whole call rather than truncating it
usefully.

### Verified

`scripts/verify-runtask.ts` asserts the part that needs no model call: the
grounding block is present when enforced, absent when exempt, ordered before the
task instructions, and the repair prompt carries what the model needs. **12
assertions, all passing.** The transport, the repair loop and the refusal to
return ungrounded output need a live model and are exercised by the first service
migrated onto the layer.

**Adoption is one service at a time.** The layer is additive — the existing
`generate()` transport is unchanged and every service still works — so nothing has
to move at once.

### Interview Q&A and the mock interview — grounding made real (2026-09-15)

Both services shipped declaring `grounding: 'enforced'`, but the check they passed
validated only the JSON shape — the 25 first-person answers were never compared with
the profile (review finding X01). They are now:

- **Numbers in answers are checked** (`lib/ai/answerGrounding.ts`): every number in a
  Q&A answer or a mock "ideal answer point" must appear in the Career Profile, the saved
  CV, the job advert or the target, or be a duration derivable from the user's own job
  dates. More than five unsourced Q&A answers sends the set back for repair; any that
  survive are **dropped**, never shown, never patched by guessing. Same trust boundary as
  the cover letter — entities in free prose are left to the injected instruction.
- **The saved CV is the primary source** for Q&A, the mock interview and — since the same
  day — the cover letter (audit M04). A failed profile read is an error, not an empty
  profile (`lib/packages/profileLoader.ts`).
- **The mock "better answer" rewrites only what the user typed.** It sees no profile, so
  it may use only the user's answer and the question's expected points; a missing detail
  becomes a `[placeholder]`, and an invented number fails the shape check.

`scripts/verify-answer-grounding.ts` asserts the number rules on a synthetic profile.

---

## 1. The provider layer

Calls go to **OpenRouter** over its OpenAI-compatible chat completions endpoint,
using plain `fetch`. **No vendor SDK is installed, deliberately** — the provider,
model, key and fallback are all database rows editable from the admin panel, so
switching provider or model never requires a redeploy.

There is no seeded default. An unconfigured state raises a clear provider error
rather than silently guessing a model.

**Fallback:** a second independent provider, model and key, tried **only** when the
primary genuinely fails.

⚠ **Fallback activates only when provider, model *and* key are all set.** Setting just a
fallback model — a natural reading of "same provider, cheaper model" — silently does
nothing, with no error.

**Three runtime tiers**, since 2026-08-17: the service's own provider, its own fallback,
then the **`default` row as a last resort**. Before that the default was only a
*configuration* fallback — used when a service had no row of its own, decided before any
call — so a service whose own primary and fallback both failed simply failed, even with a
healthy default configured.

**Each tier is skipped when it names the same provider and model as one already tried.**
Without that guard, a service with no row of its own resolves *to* the default row, and
the last resort would re-run the identical failing call: paying twice for one failure and
making the user wait through two timeouts for the same message. The thrown error names
every tier that failed and why.

**Every call is logged** to `ai_usage_log` with the model string that was actually
used — never a hard-coded constant.

### Provider errors are diagnosable, and that took work

The first live run failed with a message that named nothing: the real cause was
attached where nothing read it. Two fixes worth preserving:

- The underlying provider message is carried into the thrown error.
- An empty-content response reports `finish_reason` **and** whether the model
  returned reasoning only. That is the real failure mode for reasoning models,
  whose thinking tokens are billed against the same output budget before any
  visible content is produced.

Also observed: an identical retry succeeded after a failure, so **there is real
intermittency here.** Worth remembering before assuming a code defect.

**Acted on 2026-08-18.** This is exactly what was failing "optimize with a job
description" — a longer, JD-heavy prompt makes the configured model
(`deepseek/deepseek-v4-flash`, the only row currently in `ai_provider_config`, no
fallback set) reason for longer, so it is disproportionately likely to exhaust the
budget before writing any output. `callOpenAICompatible` now retries automatically,
ONCE, at roughly double the token budget (capped at 16,384) the moment it detects a
reasoning-only, empty-content response — the same behaviour the manual retry above
showed worked, now built in rather than depended on a human happening to try again.

---

## 2. Per-feature model configuration

Each AI feature has its own provider, model, fallback model and key, so a cheap
model can do extraction while a stronger one writes resumes.

| Feature key | What it does | State |
|---|---|---|
| `extraction` | Reads an uploaded or pasted resume into structured data | Live |
| `optimization` | Rewrites a resume for one target job | Live |
| `ats_scan` | The Job Match breakdown's semantic layer | Live |
| `cover_letter` | Generates a cover letter for a paid package | Live |
| `job_description` | Structures a pasted job advert | Live |
| `job_match_explanation` | The semantic half of Job Match | Live |
| `ats_scan` | — | **No caller.** The readiness score is deterministic arithmetic and makes no model call. Its prompt module survives only because the *result type* is still used to shape a stored scan |
| `qa_generation` | Interview Q&A | Live — `/api/packages/[id]/interview-qa` |
| `mock_interview` | Text mock interview review | Live — `/api/packages/[id]/mock-interview/*` |

**Six services make model calls:** extraction, optimization, job_description,
job_match_explanation, cover_letter, qa_generation and mock_interview. Each has a **draft v1 prompt seeded** and nothing
published — see §2b.

Plus a `default` row used when a service has no configuration of its own.

**Per-service configuration is genuinely wired**, not decorative — every one of the ten
call sites passes its own service key, verified by reading each. A model changed in the
admin panel really does change that service and nothing else.

⚠ **`job_description` and `job_match_explanation` are live, money-spending calls that
appear on the admin screen only under "other overrides"**, not as named cards. They
should be first-class; recorded in [`14_OPEN_ITEMS.md`](14_OPEN_ITEMS.md).

The two unbuilt rows exist so those services can be switched on without a migration.
They are **inert**, and the admin screen labels them as such rather than implying they
work.

---

## 2b. Prompt control — versioned, draft then publish

**Founder-owned by design.** The founder changes and optimises prompts from the admin
panel without a developer, because prompt quality *is* product quality here.

**Built 2026-08-17.** `prompt_versions` (migration 041), `lib/ai/prompts.ts`, and a
rebuilt `/admin/prompts` with draft, publish and rollback. The old `prompt_templates`
table is superseded and left in place; it should gain no new keys.

**Draft v1 is seeded for all five services that make model calls** (`scripts/seed-prompts.mjs`,
re-runnable — each run adds a new draft rather than overwriting, because history is the
point). **Nothing is published**, which is the correct state: a prompt with no published
version runs on the prompt written in its own module, so this is adopted one service at a
time, and `ai_usage_log.prompt_version_id` stays null for those calls — meaning "ran on
the in-code prompt", not "unknown".

**How to test one:** publish it from `/admin/prompts`, run the flow that uses it, compare
against what the built-in prompt produced, and roll back in one click if it is worse.

| Service | Run this to exercise it |
|---|---|
| `extraction` | Upload or paste a resume at `/ats-scan` or `/onboarding` |
| `job_description` | Paste a job description into the same scan, or into `/optimize/target` |
| `job_match_explanation` | **No live caller since 2026-09-04.** Its only remaining reference is `/api/ats-scan`'s POST, which nothing reaches — see `14_OPEN_ITEMS.md`. Resume optimization uses the deterministic categories, not this explanation call |
| `optimization` | `/optimize/target` → setup → generate |
| `cover_letter` | `/cover-letter`, pick a resume, pick a tone, generate |

**What the seeded drafts contain, and deliberately do not.** Only the quality-deciding
part: what may be touched, how to write it, and what to do when the input is thin. The
grounding rule, the output schema, the persona, the profile, the target and the job
description are all injected around them.

### The floor — three parts, not equally editable

| Part | Editable |
|---|---|
| Persona, tone, task instructions, emphasis, examples | **Yes.** This is where quality lives |
| The grounding block | **Never.** Injected by the control layer from one constant |
| The output schema | **Never.** The parser and the validator depend on it |

A bad edit to the grounding block silently turns off the product's one promise, and
nothing downstream would catch it — the model simply starts inventing. A bad edit to the
schema breaks every call for every user. Everything else is free to change.

### Versioning

Never edit in place. A new version each time; **exactly one active per prompt**;
publishing is a flip and rollback is a flip back; nothing is deleted.

**One active version per prompt is enforced by the database**, not only by the code that
writes it — a partial unique index, the same technique as the one-free-resume quota.
Publishing is archive-then-activate in that order, so if those two steps ever race the
second fails loudly instead of leaving two active versions and a silent coin-flip over
which prompt a user gets. Proven to bite: a second active version is rejected, and an
invalid status is rejected.

The version number is derived from the current maximum and cannot be supplied by a
caller, so history cannot be overwritten by passing a number that already exists.

**Every generation records the prompt version that produced it.** That is the point of
versioning here — without it, when output quality moves you cannot tell whether it was
the prompt, the model or the input, and you will guess wrong at least once.

**Versioning lands before the services are tuned.** Tuning first means tuning with no
record of what changed.

### Testing

Draft against active — same input, same model, side by side.

- **Fixture profiles only, never real users' data.** Admin access to real profiles is
  audited for a reason, and prompt iteration would generate a great deal of it.
- **The grounding validator runs on test output**, so a draft can be seen failing
  grounding *before* it is published. That is what makes handing over the controls safe
  rather than risky.

### Two guards that hold while prompts are editable

1. **User data is data, never instructions.** Profile facts are mapped into every
   prompt — and a user can type "ignore previous instructions" into their professional
   summary. Facts belong in a delimited block the model is told is data, never merged
   into the instruction text.
2. **Deterministic logic stays in code.** There is a pull to move scoring rules into
   editable prompt text because it is easier to tweak there. That is how the readiness
   score once returned 78 and then 45 for the same resume.

---

## 3. How a prompt is built

> **Resume optimization (2026-09-17)** now runs through the optimizer engine:
> analysis → evidence map → tailoring plan (prompt BLOCK 4B) → section generation →
> validator + quality gate → fact-check review → targeted repair → score guard. This
> section still describes the prompt structure it uses. The engine, its extra config
> keys (`optimization_analysis`, `optimization_review`) and its checks are in
> [`17_OPTIMIZER_ENGINE.md`](17_OPTIMIZER_ENGINE.md).

Every generation prompt is assembled from four parts, in this order:

1. **The persona** — who the model is being asked to be
2. **The grounding instruction** — verbatim, imported from one constant
3. **The Career Profile facts** — the only permitted source of truth
4. **The task** — what to produce, and at what framing intensity

### The optimizer builds five trust blocks, not four parts (2026-09-16)

The resume optimizer assembles its user message as five labelled blocks, each
stating its own trust level in its own header:

| Block | Trust |
|---|---|
| 1 — CANDIDATE FACTS | the only source of truth |
| 2 — TARGET CONTEXT | application metadata, **not** evidence |
| 3 — EMPLOYER REQUIREMENTS | relevance guidance only; carries the MODE |
| 4 — ANALYSIS FINDINGS | derived guidance only; omitted when absent |
| 5 — OUTPUT INSTRUCTIONS | the schema |

**Why labelling, rather than more rules.** The four sections used to be peer
`##` headings in one message, so "the advert asks for PMP" and "the candidate
holds PMP" arrived with identical authority. No amount of additional prose in
the system prompt fixes an input layout that presents a wish list as evidence.

### Two modes, derived and never stored

`resolveOptimizationMode(job_description)` returns `job_description` when an
advert was supplied and `target_title_only` otherwise. It is derived on every
request and deliberately **not** a column: `packages.job_description` already
answers the question exactly, and a second copy could only drift from it.

**Target-title mode is not a degraded JD mode.** It tells the model, in the
block where an advert would otherwise sit, to use the title only to rank and
emphasise facts that are already present — and forbids inventing requirements
typical of the role, implying a vacancy match, or stating any match percentage.

### Grounding is constant across levels

Easy, Moderate and High change how much rewriting happens. Each now carries a
sentence saying so explicitly, because "apply maximum reframing" read alone was
the strongest licence in the prompt.

### Personas — one, and profession-neutral (2026-09-16)

The four personas that named Aramco, ADNOC, "Indian technology professionals"
and Instrumentation & Control were replaced by a single neutral perspective.
GCC Mentor serves every profession the product supports; a system prompt that
opens by declaring itself an oil-and-gas commissioning manager steers a nurse's
CV toward a domain their profile has nothing to do with — and naming real
operators hands the model employer names no profile supplied. The old
`target_industry` keys still resolve, so existing packages are unaffected.

### Personas — four, and no more speculatively

`engineering_technical`, `construction_site`, `it_tech`, and
`generic_gulf_professional` as the fallback. Each is a senior Gulf hiring manager
with sector-specific knowledge, because "which phrasing signals real site
experience" is exactly the judgement being borrowed.

**Any industry without a dedicated persona falls back to the generic one.** The
lookup never throws and never returns empty. **Do not add personas speculatively** —
new ones are added from real usage data.

### Optimization levels

Easy / Moderate / High change **framing intensity and job-description keyword
alignment only.** They never change which facts may appear. Moderate and High show
a risk indicator in the UI.

### Gulf format conventions are country-agnostic, on purpose

An earlier specification called for per-country CV conventions derived from the
target country. **No document anywhere defined what those conventions were.**
Rather than fabricate seven national rulesets from nothing, the prompt uses one
well-grounded, country-agnostic Gulf convention. The genuinely country-specific
concerns — photo, visa status, nationality — are field-inclusion decisions handled
by the template and field visibility, not by generated text.

### Job Match findings feed optimization

When a job description is present, optimization runs the same structuring and
requirement mapping the Job Match engine uses, and passes the findings in as
**emphasis-only guidance**. Verified to be strictly additive: for a call with no
job description the system prompt is byte-identical to what it was before this
existed.

---

## 4. The grounding validator — the thing that can refuse to ship

`lib/ai/validateGrounding.ts`. **Every generation response passes through it
before it reaches a user.** A route that skips it is a critical bug.

Two severities:
- **hard** — the output is not fit to show. It is rejected.
- **flag** — grounding is intact but the output warrants review.

What it catches: malformed JSON, schema violations, unknown or duplicated
experience blocks, mutation of source bullets, rewriting of blocks the user did not
select, **any fixed field appearing in the output at all**, unsourced numerics,
and a skills list that is not a true permutation of the user's own skills.

**Three holes closed on 2026-09-16, all proven reachable by executable code:**

1. **The summary was never validated.** The only check on it was
   `typeof summary.generated === 'string'`. It is where "15+ years" becomes
   "nearly 20 years", and it had no number check at all. Summary numbers are now
   validated against profile-wide factual prose, and a stated years-of-experience
   figure must survive exactly.
2. **Unsourced numbers only flagged.** Severity was `flag`, and `valid` counts
   hard failures only, so a bullet containing an invented figure shipped. They
   are hard now, with `GROUNDING_STRICT_NUMERICS=false` as an escape hatch.
3. **Employment dates counted as source numbers.** `start_date` and `end_date`
   fed the allowed set, so a role dated 2016 legitimised "2016" as a quantity.
   Dates are employment facts, not achievement figures, and are excluded.

**Entity checks are conservative by construction.** Nothing is hard-coded and
nothing is a dictionary: every allowed set is derived from the candidate's own
profile at request time (`lib/ai/profileEntities.ts`). A term found in the
advert but nowhere in the profile is a **hard** failure — that combination is
precisely an imported requirement. A term found in neither is a **flag**,
because paraphrase produces those legitimately. General vocabulary is not
modelled at all; a token-level diff would reject "commissioned" for
"commissioning" and every plural, which would make the validator useless.

**Cross-entry leakage has five conditions**, and two of them are what stop it
firing on real writing: the term must appear in exactly ONE entry's source, and
must not be a profile-wide skill, certification or qualification. A tool used at
three employers, or anything on the candidate's skills list, is theirs to
mention anywhere and is never reported.

**Every failure names its owner** — `structural`, `summary`, or a specific
experience id. That is what makes block-level fallback possible.

### Block-level fallback — a failed block, not a failed resume (2026-09-16)

A surviving hard failure used to throw the whole resume away: the user paid,
waited through the slowest call in the product, and got an error because one
bullet carried one unsupported number.

The split that makes recovery safe is **structural vs content**:

- **Structural** — unparseable JSON, a missing array, an invented employment id,
  a skills list that is not a permutation, a fixed field the model tried to own.
  Nothing trustworthy remains, so the route still returns an error.
- **Content** — belongs to exactly one block. That block falls back to its own
  original text: the summary to `professional_summary`, an experience block to
  that entry's own `highlights`.

**Content cannot cross entries.** The fallback is read from `sourceEntry`, looked
up by the block's own `profile_experience_id`, and a block with an unknown id was
already rejected as structural before that code runs.

Every delivered block is therefore either validated optimized content or verbatim
profile content. `optimized_content.fallback_used` records which — internal only,
never rendered, so a rising rate shows up in the data rather than in complaints.

**Why fixed fields are rejected outright rather than compared:** name, contact
details, employer, role and dates are read live from the profile at render time. If
the model emits them at all, it is trying to own a field it does not own — a
mutation risk regardless of whether the value happens to match today.

**The validator has its own personal-data contract, and it matters.** Its `detail`
field is always safe to log and never contains a field value. Anything derived from
user content goes in a separate field that callers **must not** log — it exists
only so a retry prompt can tell the model what to remove.

A cover-letter-specific validator applies the same discipline to that path.

**Cover letter tone (2026-08-18):** `/cover-letter` offers four styles — Professional,
Short, Technical, Explanatory (`lib/ai/buildCoverLetterPrompt.ts`'s
`TONE_INSTRUCTIONS`). Each is an ADDITIONAL system instruction layered on top of the
same base persona, grounding rule and format conventions — never a different validator
or a looser grounding standard. A short letter can still only say what the profile
supports; it just says less of it.

---

## 5. Resume text extraction

Extraction feeds the profile, so a fault here becomes a fabrication downstream.
That is not hypothetical — it happened.

**PDF.js (`unpdf`) for PDF, `mammoth` for DOCX.** A hand-rolled extractor was
replaced with it, deleting roughly 900 lines. Licences were checked: MIT/Apache
only, and an AGPL alternative was deliberately rejected.

**Why it was replaced — the most instructive bug in this codebase.** The old
extractor had no support for custom font encodings. A subsetted-font PDF extracted
as a consistent-looking cipher **with every digit silently deleted.** 19,000
characters of noise passed the length check, reached the model, and the model
invented specifics: it reported achievement figures that flatly contradicted the
real resume it was given. A direct breach of the product's one promise, on a real
CV.

**The lesson is broader than PDFs: garbage that looks like text is more dangerous
than an error.** Extraction now uses a real parser, and unreadable input produces
an honest message telling the user to re-export or paste text instead.

Line breaks are preserved — they carry structure the model needs.

**Re-uploading a CV merges rather than replaces.** It used to overwrite the profile
wholesale, destroying hand-typed data and, worse, silently rewriting already-paid
resumes through the live-field path. The user is now asked before anything is
overwritten.

---

## 6. Where AI is deliberately not used

**The GCC Readiness score is pure arithmetic, and that was a change.** A model
scorer returned 78 and then 45 for the same resume, took 97 seconds, and cost money
each time. It is now deterministic: **0.6 seconds, zero cost, repeatable.**

**A score a user is shown must be reproducible.** A model that answers differently
each time cannot be the basis of a number presented as a finding. The semantic
layer of Job Match still uses a model — for explanation and for judgements that are
genuinely qualitative — but it **cannot override a deterministic score, and that is
enforced by the type system rather than by asking the prompt nicely.**

---

## 7. Cost control

- **Every model-calling route passes `lib/ai/serviceGuard.ts` first** (2026-09-15,
  audit H01/H03/M14): the founder's pause switch, a daily allowance per user (admin
  override → `/admin/services` setting → code default), a one-at-a-time cap, an
  optional all-users daily cap, then an atomic reservation (migration 049). A saved
  result consumes the slot; a failure releases it; a killed function's reservation
  expires. Fails closed. **Payment is not the abuse control** — the paid locks are off,
  and before this the cover letter, Q&A and mock interview had no limit at all.
- **Input bounds**: pasted CV 20,000 characters, extracted CV 30,000, uploads checked
  before buffering, mock answers 3,000 characters.
- **One deadline per task** (§0), so a slow provider cannot outlive the route.
- **Authentication precedes every model call**, so anonymous traffic cannot spend
  tokens on an authenticated route; the legacy anonymous scan has its own IP-keyed
  limit and honours the pause.
- **The readiness score costs nothing**, which is what makes it safe as the top of
  the funnel.
- Every call is logged with its model for cost attribution, and every allowed, saved,
  failed and refused call is counted per action per day (`ai_service_daily_stats`),
  shown on `/admin/services`.

Known and accepted: a failed model call does not consume the user's slot, even though
the call cost money. Charging a user's daily attempt for a random model hiccup is
worse than the narrow gap — and the counters now show how often it happens.


## Deferred recorded interview review (unreleased)

Voice capture/upload calls do not call AI. Explicit review queues sequential, leased transcription and grounded feedback units. STT and feedback are separately persisted and quota guarded; final reports use existing atomic package writes. Whisper is used only for saved audio transcription. See [setup and limitations](RECORDED_VOICE_INTERVIEW.md).
