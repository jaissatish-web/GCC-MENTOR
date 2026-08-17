# WORK QUEUE — only what is not yet done

**This file holds work, not history.** When something ships it leaves this file and the
part-document it affects is updated instead. It never becomes a log.

How work is handed over, reviewed and closed: [`16_WORKING_AGREEMENT.md`](16_WORKING_AGREEMENT.md) §2.

**Status: nothing is assigned.** The queue below is the CTO's recommended order, awaiting
the founder's priority call. Every item traces to
[`14_OPEN_ITEMS.md`](14_OPEN_ITEMS.md).

---

## Ready to start

### W1 · Fix the two untrue claims on the landing page
**Why first: it is public-facing, it is small, and it is the kind of thing this product
refuses to do.** Remove the DOCX download from the ₹499 tier's feature list, and correct
the "instant self-serve checkout" sentence to describe how a purchase actually works
today. Copy-only. No logic, no routes.
Traces to: open items §B2 · Owner: either track · Small.

### W2 · Make the free tier reachable
The foundation is built and verified; nothing creates a free resume. Needs: a route that
creates a `tier='free'` package (note that two columns are NOT NULL and must be supplied),
an entry point on the create-resume screen, Library listing plus labelling, the template
picker reading the entitlements table, and **removal of the "not live yet" notice on the
admin screen in the same change.**
Traces to: open items §A2 · Owner: Hermes, with the gate wiring reviewed closely · Medium.

### W3 · Decide and fix the free CV download
A deliberate founder decision is currently switched off by a layout change. Either link it
from the Library or the dashboard, or retire the free download on purpose.
Traces to: open items §B4 · **Needs a founder answer before building.**

---

## Needs a product answer before any code

### W4 · Job Match scores zero on GCC experience
**The highest-value defect in the product.** The fix is available — extraction already
returns a free-text location per work entry that nothing reads — but two product questions
come first: what "GCC experience" means for an untagged resume, and how degree equivalence
works. See open items §B1 for the measured evidence.
Traces to: open items §B1 · CTO build once the answers exist · Medium.

### W5 · Choose a payment provider
Not a build item until answered. Razorpay is impossible from Saudi Arabia. **This is what
stands between the product and revenue.**
Traces to: open items §A1.

---

## Later, deliberately

### W6 · Port the default template onto the shared engine
The template most users hold is the one that cannot be restyled. Must be byte-identical,
because already-delivered resumes were rendered with it — the 32,768-combination baseline
is what proves that.
Traces to: open items §B3 · CTO or a carefully-specified Hermes job · Large.

### W7 · Migrate the colour tokens to their correct names
`forest` is navy. Correct aliases exist; the app still uses the old names. Mechanical but
wide-reaching, and it has already caused two shipped defects. Best done in one pass, then
delete the aliases.
Traces to: open items §B7 · Hermes · Medium.

### W8 · Resolve the two readiness route names
`/gulf-readiness` and `/gcc-readiness` are one letter apart and mean different things, and
one of them is not in the navigation at all. Renaming a route is a route change — it needs
an explicit decision, not a tidy-up.
Traces to: open items §B6 · **Needs a founder answer.**

### W9 · Close the profile editor's silent data loss
Unsaved edits are lost when navigating to the visibility screen. Three reasonable fixes
exist; one needs choosing.
Traces to: open items §B5 · Small once chosen.
