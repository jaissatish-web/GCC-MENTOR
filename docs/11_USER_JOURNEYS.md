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
   ↓                             (from a free scan: skips straight through)
/onboarding/report               the full Gulf Readiness report, unlocked
   ↓                             — scan arrivals only; shown before extraction
/onboarding/extracting           collect → extract → review
   ↓
/profile                         confirm and correct — never a blank form
   ↓
/dashboard
```

Someone arriving from a free scan skips the upload entirely: their data is already
there to claim.

**The full report is the first thing they see after signing up.** The anonymous
scorecard shows a subset behind an honest gate that promises "unlock the full
breakdown". `/onboarding/report` keeps that promise: it re-renders the **same computed
result** the visitor already saw, now with `locked={false}` — every dimension and the
full ranked plan, no gate. It is shown *before* extraction on purpose: the score is
arithmetic and already computed, so the reward is instant with no AI call, and the ~20s
profile extraction follows on the CTA as the second payoff rather than a barrier in
front of the first. The result rides across in the browser only
(`claimed_readiness_result`, tab-scoped); a user who reaches `/onboarding/report` with no
handoff (a closed tab, a direct visit) is signed in already and is sent to their
dashboard, never stranded.

**Magic-link sign-in needed a client-side handler.** Supabase returns implicit-flow
tokens in the URL *fragment*, which a server route cannot read at all, so the callback
never saw a code and always reported failure — while Supabase had authenticated the
user correctly. It is completed on the login page and the fragment is cleared.

---

## 3. The signed-in surface

| Route | What it is |
|---|---|
| `/dashboard` | Metrics, next step, recent activity, **two readiness cards — Profile Strength (completeness) and Gulf Readiness (market score)** — quick actions, Library preview |
| `/create-resume` | **Retired 2026-08-18 to a redirect → `/profile`.** Resume creation now happens inline on the profile; this route is kept only so old links, the dashboard CTA and the onboarding fallback still land right. |
| `/profile` | The Career Profile editor. Opens with an inline **"start or update from a resume"** panel (upload · paste · fill manually) above the user's data — the import runs the parse endpoints *on this screen* and feeds the add-or-replace choice, so building/re-importing and hand-editing are one place with no navigation. `?import=upload`/`?import=paste` opens the matching panel on arrival. |
| `/profile/visibility` | What appears on a CV |
| `/dashboard/library` | Every resume — desktop table, mobile cards |
| `/templates` | The template gallery, previewed on an example CV |
| `/gcc-readiness` | Readiness against the saved profile |
| `/job-match` | A Job Match report |
| `/cover-letter` | Cover letter generation for a paid package — pick a tone (2026-08-18: Professional, Short, Technical, Explanatory) |
| `/settings` | Account · email · current package · payments · delete data |
| `/payments` | An honest placeholder. No payment-history feature exists |
| `/package/[id]` | A finished resume: view, style, edit, download |
| `/package/[id]/edit` | **That resume's own editor** (2026-08-19): summary and bullets, section by section, with a live preview of the real template. Batched save, then back to the resume |

**`/gcc-readiness` is not in the navigation.** It exists and works, and is reachable
from the dashboard's readiness card. Noted in
[`14_OPEN_ITEMS.md`](14_OPEN_ITEMS.md) as something to resolve deliberately.

**The dashboard's readiness card is the primary "your profile is incomplete" call to
action.** It once silently changed to point at a route that did not exist yet, which
broke exactly that. Treat it as load-bearing.

---

## 4. The optimize flow

```
/optimize/target             target job title (required) — industry and a job
                             description are both optional, one-question-first
                             (2026-08-18: country and company removed — see below)
   ↓
/optimize/setup              which blocks to optimize · framing intensity
                             (Easy / Moderate / High)
   ↓                         creates the package: empty
/optimize/generate/[id]      the model runs here
   ↓
/optimize/preview/[id]       before/after diff, per block, word-level
   ↓
/package/[id]                the finished resume
   ↓                         "Edit text"
/package/[id]/edit           edit this resume's own wording, then back
```

**Two different editing screens, deliberately** (2026-08-19, founder-directed).
`/optimize/preview/[id]` is a **diff viewer** — "here is what the optimizer changed",
with before/after panels, strike-through and JD-term counts — and editing was bolted
onto it one field at a time. `/package/[id]/edit` is the **editor**: every section of
this resume laid out at once, a live preview of the real template beside it, one
explicit batched Save, and a CTA back to the resume. The founder asked for the second;
the first keeps its own job and its own route. **"Edit text" on `/package/[id]` now
opens the editor, not the diff.**

**What that editor can change, and what it deliberately cannot.** Only this package's
own words: the professional summary and each experience entry's bullets. Name, contact,
employers, roles, dates, education, certifications and skills are fixed fields, frozen
into `document_snapshot` at generation ([`08_RESUME_ENGINE.md`](08_RESUME_ENGINE.md) §4)
and shared by every resume — so they are edited once on the Career Profile, and the
editor says so with a link rather than showing inputs that refuse to work. Saving goes
through the same `PATCH /api/packages/[id]` the diff screen used, which already
re-applies edits onto the frozen snapshot so the screen and the PDF cannot disagree.

**"Edit text" opens the editor for ANY resume, generated or not** (2026-08-19, second
pass — corrects the first version of this change, which sent a never-optimized resume to
`/optimize/generate` first). Not needed: `lib/resumeDocument.ts` already resolves text as
`user_edited ?? generated ?? the profile's own`, so a hand edit saved as `user_edited`
is honoured whether or not the model ever ran, and the editor derives its starting text
the same way the resume itself renders. `PATCH /api/packages/[id]` now creates the
experience-block row on first edit if generation never did — still scoped to entries
that are genuinely this profile's own, same grounding discipline as everywhere else.

**The payment step is gone from this flow** — every paid lock was removed on
2026-08-17 while the pipeline is built. `/optimize/pay/[id]` still exists and now
**forwards** any package onward instead of asking for money: the flow no longer
routes through it, but old links and the back button do, and landing on a payment
form for an open service would be a dead end.

**`/optimize/target` simplified 2026-08-18 (founder decision) to one required
field.** Target country and target company are removed from this screen
entirely — neither ever changed generation, only display (target country never
varied the Gulf CV format; target company only ever changed a CTA label).
Target industry stays, now optional — it drives the writing persona
(`lib/ai/personas.ts`), a real effect, but the pipeline already falls back to a
generic Gulf-recruiter persona when it is unset. The job description keeps its
"Best results" framing as the one field with a clear, direct payoff; its dead
"upload the PDF" stub (never wired to any extraction route) is gone — paste is
the one real path.

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

The intended flow, as designed (still not reachable — see below):

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
labelling do not. `types/package.ts`'s `Package` type does not even carry a `tier`
field yet. See [`10_PLANS_AND_PAYMENT.md`](10_PLANS_AND_PAYMENT.md) §4.

**"Edit → /profile" ONLY ever fired for a different case: any ordinary package that
simply had not been generated yet** — created via the normal `/optimize/target` →
`/optimize/setup` flow, whose Phase A always writes the row with `optimized_content:
null`, then abandoned or interrupted before Phase B ran. `resumeKind()`
(`lib/resumeKind.ts`) labels ANY such row "free" — the same word as the product-tier
concept above, but a different thing: "nothing generated yet," not "designed to always
be free." Since no route creates an actual `tier: 'free'` row, every real user who ever
saw this "Edit" button was in that second case, never the first.

**Changed twice on 2026-08-19, settled on the second pass.** First change: for that
reachable case, "Edit" ran generation (`/optimize/generate/[id]`) before handing off to
an editor, rather than sending the user to the profile. The founder's follow-up
correction: clicking Edit must open the editor directly, never spend a model call first.
It does not need to — `/package/[id]/edit` (§4 above) derives its starting text the same
way the resume itself renders (`user_edited ?? generated ?? the profile's own`,
`lib/resumeDocument.ts`), so a hand edit on a never-generated resume is honoured exactly
like an edit on a generated one. `PATCH /api/packages/[id]` was extended to create the
experience-block row on first edit when generation never did, so nothing is silently
dropped. **"Edit" now always opens `/package/[id]/edit`, with no branch on whether the
resume has been optimized.**

**A side effect worth naming:** this makes `resumeKind()` a stricter check than it used
to be. It once meant "does `optimized_content` exist at all"; a hand edit alone can now
make that true without the model ever running, which would have mislabelled the user's
own writing as AI output. `hasGeneratedContent()` (`lib/resumeKind.ts`) now checks for
actual `generated` / `generated_bullets` text specifically, so "free" still means what it
says regardless of how many hand edits a resume has.

**Why this is safe from the historical loop, recorded so it is not rediscovered:** a
free/ungenerated resume's "Edit text" once reached the preview screen, whose guard sent
the contentless row to the generate screen, which requested generation, which refused
because the row was unpaid, which returned it to the payment screen — a loop, from a
button labelled Edit. See [`10_PLANS_AND_PAYMENT.md`](10_PLANS_AND_PAYMENT.md) §4 for the
full account. That loop needed generation to run as a step in the Edit path; this design
never calls generation from Edit at all, so there is no step left for the payment refusal
to interrupt.

**Still not resolved: what "Edit" should do for the genuine, once-and-only-ever-free
product tier**, if/when W2 makes it reachable. Arguably this change is now the right
plumbing for it — hand-editing a resume with no AI involved is exactly what a free tier
should allow — but no route creates a `tier: 'free'` row yet, so this is unproven for
that specific case. Flagged in `WORK_QUEUE.md` W2, not decided here.

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
