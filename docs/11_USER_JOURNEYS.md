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
                 strengths and improvements (a job description now belongs to
                 Resume Optimizer, not a separate report — 2026-09-04)
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

A job description is optional. Since 2026-09-04 it is read by Resume Optimizer rather
than producing a separate report; without one there is no job-specific tailoring — only the
readiness score.

---

## 2. Getting started, signed in

```
/login  /signup                  email + password (magic links still complete)
   ↓                             /forgot-password → email → /auth/update-password
   ↓                             a deep link (?redirectTo=…) returns to that page
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
arithmetic and already computed, so the reward is instant with no AI call, and the
profile extraction follows on the CTA as the second payoff rather than a barrier in
front of the first. The result rides across in the browser only
(`claimed_readiness_result`, tab-scoped); a user who reaches `/onboarding/report` with no
handoff (a closed tab, a direct visit) is signed in already and is sent to their
dashboard, never stranded.

**Magic-link sign-in needed a client-side handler.** Supabase returns implicit-flow
tokens in the URL *fragment*, which a server route cannot read at all, so the callback
never saw a code and always reported failure — while Supabase had authenticated the
user correctly. It is completed on the login page and the fragment is cleared.

**Signing out** is in the three-bar menu on every signed-in page, under Account, below
Settings. It lands on the home page.

**Signing in returns you to what you opened (2026-09-15, audit M09).** Middleware
records the page *and* its query string — `/interview-qa?package=<id>` — and login,
signup and the emailed links all go back there through one validated rule
(`lib/safeRedirect.ts`); a crafted destination falls back to the dashboard.

**Password recovery (2026-09-15, audit M03):** "Forgot password?" on the login page →
an email that says the same thing whether or not the address has an account → the link
signs the user in on `/auth/update-password` → new password → dashboard. An expired or
reused link says so and offers a new one.

---

## 3. The signed-in surface

| Route | What it is |
|---|---|
| `/dashboard` | Overall account overview (2026-10-08): Profile complete and Gulf Readiness at the top, linked resume/cover-letter/Q&A-set/mock totals, Resume Library CTA, preparation coverage, practice report summary and application-stage totals. The three-step map and a state-aware next CTA remain, without individual job/resume cards or names. |
| `/create-resume` | **Retired 2026-08-18 to a redirect → `/profile`.** Resume creation now happens inline on the profile; this route is kept only so old links, the dashboard CTA and the onboarding fallback still land right. |
| `/profile` | The Career Profile (redesigned 2026-10-04). An **overview** of cards: the header (photo, Profile complete ring, Save), a teal "your profile is the base for everything we make" card, two score cards — **Profile complete** and **Gulf Readiness**, each a ring with its number — then **Profile settings** (what appears on the CV, as four group tiles), **Your career at a glance** (current role, years, Gulf years, location, target, visa · notice; each tile opens its field), the "Build a CV for a job" hand-off and the collapsed "Recreate my profile" import. Each card opens a screen of the same page via `?view=`: `details` (the nine-section editor), `completeness` (ring, a bar of the nine parts, "do this next", every part as a block, what is missing), `readiness` (verdict, score by area as bars, paperwork → profile fixes → apply), `settings` (CV visibility toggles in four groups). One mounted page, so nothing typed is lost between screens and one Save writes everything. `?import=upload`/`?import=paste` opens the import panel; `?improve=gulf`, `?improve=strength` and `?open=<section>` still land on the matching screen. |
| `/profile/visibility` | **A redirect to `/profile?view=settings`** since 2026-10-04, when "what appears on your CV" became the Profile settings screen of the profile page. |
| `/dashboard/library` | Every resume — desktop table, mobile cards |
| `/templates` | The template gallery, previewed on an example CV |
| `/gcc-readiness` | **A redirect to `/profile`** since 2026-09-11, when Career Profile and Profile Strength became one page. `?tab=gulf` lands on `/profile?view=readiness`. |
| `/cover-letter` | Cover letter generation for a paid package — pick a tone (2026-08-18: Professional, Short, Technical, Explanatory). `?package=<id>` preselects the job — the finished CV and the dashboard's next step both use it (2026-09-12). Edits in the letter boxes are not stored, and the page says so |
| `/settings` | Account · email · current package · payments · delete data |
| `/payments` | An honest placeholder. No payment-history feature exists |
| `/package/[id]` | A finished resume: view, style, edit, download |
| `/package/[id]/edit` | **That resume's own editor** (2026-08-19): summary and bullets, section by section, with a live preview of the real template. Batched save, then back to the resume |

**Both scores live on `/profile`** since 2026-09-11 — since 2026-10-04 as two cards on the
overview, each opening its own screen (`?view=completeness`, `?view=readiness`) — and the
dashboard's Profile Strength tile and Gulf Readiness card both link there. `/gcc-readiness` survives only as a redirect, so old links still land.

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
/optimize/setup              match report first (score now, honest max, gaps) ·
                             which blocks to optimize · level with projected score
                             (Easy / Moderate / High)
   ↓                         creates the package: empty
/optimize/generate/[id]      the model runs here, naming the steps chosen on setup
   ↓
/package/[id]                the finished resume — "See what changed" opens the
                             before/after diff at /optimize/preview/[id]
                             (generation lands here; the diff was unlinked
                             until 2026-09-12)
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
- **Set the application stage**: saved · not applied (where every new job starts) ·
  applied · shortlisted · interview · visa processing · offer · not selected · withdrawn.
  Preparing a CV is not applying; the stage is the user's to move (audit M07)
- **Generate a cover letter** — written from this saved CV first (no credit needed while
  the paid locks are off)
- **Prepare interview Q&A and practise a text mock interview** from the same saved CV

**Editing text re-applies onto the frozen delivered document** rather than rebuilding
it. Rebuilding would read the live profile and reintroduce the bug the freeze exists to
prevent — see [`08_RESUME_ENGINE.md`](08_RESUME_ENGINE.md) §4.

**PDF only.** The Word download was withdrawn because its output did not match the
screen.

---

## 6. Career Profile Resume — existing Library (2026-10-08)

1. Save a Career Profile after PDF/DOCX import, pasted text or manual entry.
2. Open `/dashboard/library`. The shared resume card creates/returns one `tier = 'free'`
   package, even when the user has never optimized a CV. With no saved profile,
   it links to Profile instead of inserting an empty package.
3. Open the resume workspace, or choose **See your resume** on Career Profile. The existing package Design screen supports
   all 50 templates, preview, supported styling and PDF. Rename stays in the same
   screen. **Raw Career Profile Data** remains visible in the app after renaming,
   and is never passed to the exported template.
4. **Edit Career Profile** opens the existing profile editor. Save there, return
   to the resume: latest content and field visibility appear. No content snapshot,
   AI call or optimization credit is created by this resume workflow.
5. Existing optimized resumes keep their saved document snapshots and editor.
   The raw record uses the same Library card and CV/Letter/Q&A/Mock links, with
   the Career Profile icon and permanent badge. It is included in the three
   service pickers even for users who have never optimized a CV. It is excluded
   from target-job application-stage counts.
6. Optional cover letter, Q&A and mock interview generation uses the latest saved
   profile and its raw document, with no JD, employer, ATS gaps or saved optimized
   content. The professional field comes from the profile target title or most
   recent recorded role, never from the custom resume name. Existing AI limits,
   grounding checks and service saves apply. The resume itself remains raw.
7. Saved generated letters, Q&A and interviews remain dated artifacts. Regenerate
   to use later profile changes; this never rewrites the raw resume or an optimized
   CV. Recorded interviews retain their normal per-session evidence snapshot.

DOCX remains unavailable because preview/layout parity has not been established.

---

## 7. Rules that apply to every screen

- **A new protected page must be added to `middleware.ts` in two places** — the route
  list *and* the matcher. This was missed on three consecutive pages. Not done until an
  anonymous request has been seen redirecting to login.
- **Every destination stays reachable on a phone.** The "More" drawer holds everything
  not in the bottom bar; nothing may become unreachable at any breakpoint.
- **The sidebar and mobile nav are shown on every screen — one deliberate exception.**
  `AppShell`'s `hideNav` prop (2026-08-19) drops both, used only by
  `/package/[id]/edit`: a focused, easy-to-lose-work screen where a nav rail is an
  invitation to tap away mid-edit. "Back to resume" is the one way out and warns first
  on unsaved changes. Not a pattern to reach for casually — it removes the one-tap route
  to everything else in the app, which is exactly why it needed a specific reason here.
- **A page never claims behaviour it does not have.** If it says data is kept for 7
  days, it is.
- **An unbuilt feature is honestly disabled or shown as planned — never a live-looking
  control.**
- **One card, one button set, one field anatomy.** See
  [`12_DESIGN_SYSTEM.md`](12_DESIGN_SYSTEM.md) §8.


## Recorded interview journey (test branch)

Saved resume → existing setup → animated interviewer and visible question → record/pause/listen → submit → next question → explicit review → report and comparable practice history. See [complete journey](RECORDED_VOICE_INTERVIEW.md).
