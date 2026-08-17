# USER JOURNEYS — every route, in the order a real user meets them

45 routes build. This document covers the ones a user sees; the admin screens are in
[`13_ADMIN.md`](13_ADMIN.md).

---

## 1. The free funnel — no login required

**Agreed design, 2026-08-17.** The entry point is a "Check your GCC Readiness" call to
action on the landing page, opening a short flow:

```
/                landing page — "Check your GCC Readiness"
   ↓
   upload or paste a resume            ← the file first: it is the commitment
   ↓
   Gulf experience?  yes → years · in the Gulf now?
                     no  → years of domestic experience
   ↓
/gulf-readiness  the results: GCC Readiness scored for THIS user's category,
                 strengths, improvements, and a Job Match report if a job
                 description was given
   ↓
/signup          the scan's data and the answers come with them
```

**The answers pick which scoring logic runs.** Four categories — fresher, experienced,
returner, currently in the Gulf — each with its own weighting, because a fresher and a
returning Gulf professional are not missing the same things. This logic already existed
and was unreachable anonymously; nothing asked the user which one they were.

**No country is asked** — not which Gulf country, not country of experience.

**Self-declared experience is scoring input only.** It is trusted for the score, because
it is the user's own statement about their life. It must never become a line in a
generated resume unless the resume itself supports it.

**The scan costs nothing to serve** — the readiness score is arithmetic, not a model
call. That is what makes it safe as the top of the funnel.

**The result is kept for 7 days** against a signed, HttpOnly, single-use cookie, and is
claimable **only by a new account** so a stale cookie can never overwrite an existing
user's profile. The page's promise about retention is true, which it once was not.

A job description is optional. Without one there is no Job Match report — only the
readiness score.

---

## 2. Getting started, signed in

```
/login  /signup                  magic link
   ↓
/onboarding                      three ways in: upload · paste · type
   ↓
/onboarding/extracting           collect → extract → review
   ↓
/profile                         confirm and correct — never a blank form
   ↓
/dashboard
```

Someone arriving from a free scan skips the upload entirely: their data is already
there to claim.

**Magic-link sign-in needed a client-side handler.** Supabase returns implicit-flow
tokens in the URL *fragment*, which a server route cannot read at all, so the callback
never saw a code and always reported failure — while Supabase had authenticated the
user correctly. It is completed on the login page and the fragment is cleared.

---

## 3. The signed-in surface

| Route | What it is |
|---|---|
| `/dashboard` | Metrics, next step, recent activity, readiness card, quick actions, Library preview |
| `/create-resume` | The creation entry point: upload, paste or type |
| `/profile` | The Career Profile editor |
| `/profile/visibility` | What appears on a CV |
| `/dashboard/library` | Every resume — desktop table, mobile cards |
| `/templates` | The template gallery, previewed on an example CV |
| `/gcc-readiness` | Readiness against the saved profile |
| `/job-match` | A Job Match report |
| `/cover-letter` | Cover letter generation for a paid package |
| `/settings` | Account · email · current package · payments · delete data |
| `/payments` | An honest placeholder. No payment-history feature exists |
| `/package/[id]` | A finished resume: view, style, edit, download |

**`/gcc-readiness` is not in the navigation.** It exists and works, and is reachable
from the dashboard's readiness card. Noted in
[`14_OPEN_ITEMS.md`](14_OPEN_ITEMS.md) as something to resolve deliberately.

**The dashboard's readiness card is the primary "your profile is incomplete" call to
action.** It once silently changed to point at a route that did not exist yet, which
broke exactly that. Treat it as load-bearing.

---

## 4. The optimize flow

```
/optimize/target             target job title, country, company, industry,
                             and the job description
   ↓
/optimize/setup              which blocks to optimize · framing intensity
                             (Easy / Moderate / High)
   ↓                         creates the package: empty
/optimize/generate/[id]      the model runs here
   ↓
/optimize/preview/[id]       before/after diff, per block, word-level
   ↓
/package/[id]                the finished resume
```

**The payment step is gone from this flow** — every paid lock was removed on
2026-08-17 while the pipeline is built. `/optimize/pay/[id]` still exists and now
**forwards** any package onward instead of asking for money: the flow no longer
routes through it, but old links and the back button do, and landing on a payment
form for an open service would be a dead end.

**Generation still has its own screen**, which matters independently of payment: a long
model call deserves a progress surface, and the screen is idempotent, so a refresh
mid-generation cannot produce a second resume. That guard now carries the whole weight
of preventing a duplicate model call.

**Setup creates the row; generate fills it.** Phase B reads the target fields off the
row rather than the request, so the job title cannot be swapped between the two steps.

**The before/after diff is the product's first "wow" moment** — per block, word-level
highlighting. The diff view is **not** paywalled; the deliverable is.

**The blurred preview is gone entirely**, including the renderer that produced it. It
had become a paywall aimed at people who had already paid.

---

## 5. What a user does with a finished resume

On `/package/[id]`:

- **Read it** as a real document at full size, not a clipped widget
- **Rename it** — otherwise several attempts at one role are indistinguishable
- **Switch template**, from 15
- **Adjust font, size, accent colour** and photo size, on 13 of them
- **Edit the text** — the AI summary and bullets
- **Download the PDF**
- **Set a status**: applied · shortlisted · interview · visa processing · offer
- **Generate a cover letter**, if a credit is held

**Editing text re-applies onto the frozen delivered document** rather than rebuilding
it. Rebuilding would read the live profile and reintroduce the bug the freeze exists to
prevent — see [`08_RESUME_ENGINE.md`](08_RESUME_ENGINE.md) §4.

**PDF only.** The Word download was withdrawn because its output did not match the
screen.

---

## 6. The free resume journey — designed, not reachable

The intended flow:

```
/create-resume  →  "type it myself"  →  /profile  →  a free resume appears
                                                     in the Library, labelled free
   ↓
/package/[id]   →  choose a permitted template, adjust style, download the PDF
   ↓
"Edit"          →  /profile  (the CV follows the profile)
```

**Nothing creates that resume yet.** The gate, the one-per-user quota and the admin
control panel all exist and are verified; the route, the entry point and the Library
labelling do not. See [`10_PLANS_AND_PAYMENT.md`](10_PLANS_AND_PAYMENT.md) §4.

**A free resume edits through the profile** — the founder's explicit choice between two
options. It works because a free resume has no frozen snapshot and already renders from
the live profile.

---

## 7. Rules that apply to every screen

- **A new protected page must be added to `middleware.ts` in two places** — the route
  list *and* the matcher. This was missed on three consecutive pages. Not done until an
  anonymous request has been seen redirecting to login.
- **Every destination stays reachable on a phone.** The "More" drawer holds everything
  not in the bottom bar; nothing may become unreachable at any breakpoint.
- **A page never claims behaviour it does not have.** If it says data is kept for 7
  days, it is.
- **An unbuilt feature is honestly disabled or shown as planned — never a live-looking
  control.**
- **One card, one button set, one field anatomy.** See
  [`12_DESIGN_SYSTEM.md`](12_DESIGN_SYSTEM.md) §8.
