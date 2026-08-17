# DECISION LOG — what was decided, when, and why

**Newest first. Append here the moment a decision is made, before the code is
written.**

This file records *decisions*, not work. It answers "why is it like this?" — including
for decisions that were later reversed, because a reversal is only understandable
alongside what it reversed.

A decision belongs here if changing it back would need a conversation. Format: date,
what was decided, and the reasoning that made it the right call.

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
