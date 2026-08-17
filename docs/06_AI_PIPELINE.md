# AI PIPELINE — providers, prompts, and the validator that can refuse to ship

**The grounding rule in [`02_PHILOSOPHY.md`](02_PHILOSOPHY.md) §1 governs
everything in this document.** Nothing here overrides it.

---

## 1. The provider layer

Calls go to **OpenRouter** over its OpenAI-compatible chat completions endpoint,
using plain `fetch`. **No vendor SDK is installed, deliberately** — the provider,
model, key and fallback are all database rows editable from the admin panel, so
switching provider or model never requires a redeploy.

There is no seeded default. An unconfigured state raises a clear provider error
rather than silently guessing a model.

**Fallback:** a second independent provider, model and key, tried **only** when the
primary genuinely fails. Separately, the configured fallback *model* uses
OpenRouter's own routing.

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
| `qa_generation` | Interview Q&A | **Planned — no route calls it** |
| `mock_interview` | Mock interview review | **Planned — no route calls it** |

Plus a `default` row used when a feature has no specific configuration, and an
overrides mechanism for internal sub-steps such as job-description structuring.

The two planned rows exist so the features can be switched on without a migration.
They are **inert**, and the admin screen labels them as such rather than implying
they work.

---

## 3. How a prompt is built

Every generation prompt is assembled from four parts, in this order:

1. **The persona** — who the model is being asked to be
2. **The grounding instruction** — verbatim, imported from one constant
3. **The Career Profile facts** — the only permitted source of truth
4. **The task** — what to produce, and at what framing intensity

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

**Why fixed fields are rejected outright rather than compared:** name, contact
details, employer, role and dates are read live from the profile at render time. If
the model emits them at all, it is trying to own a field it does not own — a
mutation risk regardless of whether the value happens to match today.

**The validator has its own personal-data contract, and it matters.** Its `detail`
field is always safe to log and never contains a field value. Anything derived from
user content goes in a separate field that callers **must not** log — it exists
only so a retry prompt can tell the model what to remove.

A cover-letter-specific validator applies the same discipline to that path.

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

- **Payment precedes generation.** The single biggest saving: optimization used to
  run before payment, so every non-buying visitor spent real tokens.
- **Authentication precedes every model call**, so anonymous traffic cannot spend
  tokens on an authenticated route.
- **Rate limits**: a daily per-user limit on free actions, and a separate IP-keyed
  limit for anonymous scans.
- **The readiness score costs nothing**, which is what makes it safe as the top of
  the funnel.
- Every call is logged with its model for cost attribution.

Known and accepted: a malformed model response does not consume a rate-limit slot,
even though the call cost money. Charging a user's daily attempt for a random model
hiccup is worse than the narrow gap.
