# WORK QUEUE — only what is not yet done

**This file holds work, not history.** When something ships it leaves this file and the
part-document it affects is updated instead. It never becomes a log.

How work is handed over, reviewed and closed: [`16_WORKING_AGREEMENT.md`](16_WORKING_AGREEMENT.md) §2.

**Current phase, set by the founder 2026-08-17: build the core product — every service
working individually on the Career Profile and our own prompts — with the paid locks
off. Payment, bundles, pricing and free/paid control come afterwards.** Full reasoning
in [`15_DECISION_LOG.md`](15_DECISION_LOG.md).

---

## Done

### ✅ The LLM control layer
One module owning model resolution, prompt assembly with grounding injected, token
budget, parse, shape check, one repair attempt, and refusal to return unvalidated
output. Additive — services adopt it one at a time.

---

## Done

### ✅ Prompt versioning, draft-then-publish · ✅ the three provider fixes · ✅ one service registry
Migration 041, `lib/ai/prompts.ts`, a rebuilt `/admin/prompts`, version stamping on every
generation, the third runtime fallback tier, and the service list collapsed from three
places to one. **Nothing is published yet** — each service adopts a stored prompt as it
moves onto the control layer.

---

## In progress

### ~~P1 · Prompt registry and versioning~~ — **done 2026-08-17**
Draft-then-publish, founder-approved. A versions table; exactly one active version per
prompt; publish and rollback are a flip; nothing edited in place, nothing deleted.
**Every generation stamped with the prompt version that produced it** — without that,
quality changes cannot be attributed to the prompt, the model or the input.

**Before tuning any service**, so tuning is measured rather than remembered.

**The floor:** persona, tone, instructions and examples are editable. The grounding
block and the output schema are not — a bad edit to either silently breaks the
product's one promise or every call.

### P1b · LLM configuration fixes — same run, same control panel
- **A third runtime tier**: if a service's primary and fallback both fail, fall back to
  the default row's provider. Today that only happens when a service has no row at all.
  Must skip the default when it is the same provider and model already tried.
- **Named cards for `job_description` and `job_match_explanation`** — two live,
  money-spending calls currently visible only under "other overrides".
- **Say that fallback needs provider, model AND key.** Setting only a fallback model
  silently does nothing.
- **Collapse the service list to one place.** It lives in three today.

---

## Next

### P2 · Each existing service onto the control layer, one at a time
GCC Readiness · ATS/GCC scan · Job Match · Resume optimization · Cover letter ·
Downloads. Tuning prompts as each lands, with version history.

**Each service needs a definition of "working" first** — fixture profiles and what a
good result looks like. Otherwise there is no finish line. Same fixtures the test bench
will use.

### P3 · The prompt test bench
Draft against active, same input, same model, side by side. **Fixture profiles only,
never real user data.** The grounding validator runs on test output, so a bad draft is
visible before it is published.

### P4 · Interview Q&A and Mock Interview — builds from zero
Config rows exist; nothing else does. Not unlocks.

### P5 · Then commerce
Payment provider (**must support recurring — plans are monthly**), then metering, then
bundles and pricing, then re-applying the paid locks.

**Most of the bundle machinery already exists**: the admin screen, per-service quotas,
atomic granting and consumption. Almost nothing consumes it. Metering goes through **one
wrapper** — spend a credit only after a validated success, never on failure — not
per-route. **Readiness scanning stays unmetered**: it costs nothing to run and it is the
top of the funnel.

Re-applying the locks traces to open items §A0, and
[`10_PLANS_AND_PAYMENT.md`](10_PLANS_AND_PAYMENT.md) reads as the restore guide.
Includes purging or marking the rows generated during this phase.

---

## Ready to start, whenever priority allows

### ~~W1 · Fix the two untrue claims on the landing page~~ — **done 2026-08-19**
DOCX removed from every tier (the product is PDF-only), and the "instant self-serve
checkout" sentence replaced with the truth: there is no live card checkout at all yet, so
a purchase is arranged directly. The pricing CTAs changed with it — "Get Started" pointed
at a checkout that does not exist and now reads "Start free" → `/signup`.

### W2 · Make the free tier reachable
The foundation is built and verified; nothing creates a free resume. Needs: a route that
creates a `tier='free'` package (note that two columns are NOT NULL and must be supplied),
an entry point on the create-resume screen, Library listing plus labelling, the template
picker reading the entitlements table, and **removal of the "not live yet" notice on the
admin screen in the same change.**

**Also decide, in the same change:** what `/package/[id]`'s "Edit" button does for a
`tier: 'free'` resume specifically. 2026-08-19 changed that button, for the DIFFERENT
"no content generated yet" case `resumeKind()` also calls "free", to run generation
instead of routing to the profile. That was correct for an ordinary in-flight package,
but is very likely wrong for a resume meant to stay free forever — spending a real model
call, and reopening the exact refusal-loop the profile-routing was originally built to
avoid once the payment lock returns. Whoever builds this route needs to branch on the
row's actual `tier` column, not just `resumeKind()`, to keep the two cases apart.
Traces to: open items §A2 · Owner: Hermes, with the gate wiring reviewed closely · Medium.

### W3 · Decide and fix the free CV download
A deliberate founder decision is currently switched off by a layout change. Either link it
from the Library or the dashboard, or retire the free download on purpose.
Traces to: open items §B4 · **Needs a founder answer before building.**

---

## Needs a product answer before any code

### ~~W4 · Job Match scores zero on GCC experience~~ — **answered and built 2026-09-04**
Both questions were answered by the founder: derive the country from the resume's own
words including city names, and match degrees on level plus field. Built, verified and
shipped the same day — see open items §B1 and the decision log.

### W5 · Choose a payment provider
Not a build item until answered. Razorpay is impossible from Saudi Arabia. **This is what
stands between the product and revenue.**
Traces to: open items §A1.

---

## Later, deliberately

### W6 · Port the default template onto the shared engine
**The user-facing complaint this traced to is resolved (2026-08-19)** — Gulf Premium is
now styleable through its own dedicated logic, not this port. What remains here is purely
architectural: one rendering implementation instead of two. Must be byte-identical if
ever done, because already-delivered resumes were rendered with the current one — the
32,768-combination baseline is what proves that.
Traces to: open items §B3 · CTO or a carefully-specified Hermes job · Large.

### W7 · Migrate the colour tokens to their correct names
`forest` is navy. Correct aliases exist; the app still uses the old names. Mechanical but
wide-reaching, and it has already caused two shipped defects. Best done in one pass, then
delete the aliases.
Traces to: open items §B7 · Hermes · Medium.

### W8 · Resolve the anonymous readiness route names
**Half-resolved 2026-09-11:** `/gcc-readiness` is now only a redirect into `/profile`, so
there is no longer a signed-in page one letter away from `/gulf-readiness`. What remains is
the anonymous side — `/gulf-readiness` (old scan results) beside `/gulf-readiness-score`
(the current Scorecard). Renaming a route is a route change — it needs an explicit
decision, not a tidy-up.
Traces to: open items §B6 · **Needs a founder answer.**

### W9 · Close the profile editor's silent data loss
Unsaved edits are lost when navigating to the visibility screen. Three reasonable fixes
exist; one needs choosing.
Traces to: open items §B5 · Small once chosen.
