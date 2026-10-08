# CAREER PROFILE — the one source of truth

**Everything the product generates comes from here.** One profile per user. A
resume, a cover letter, a score, and every future output type read this and nothing
else. Nothing is ever re-derived from a fresh upload at generation time.

That single decision is the reason new output types are cheap: the cover letter
needed no new data layer and no new mechanism — only a different persona.

The columns are in [`04_DATA_MODEL.md`](04_DATA_MODEL.md) §2.

---

## 1. How a profile gets created

Three entry points, all converging on **one editor**:

1. **Upload a resume** — PDF or DOCX. Extracted into a structured draft.
2. **Paste resume text** — same pipeline, no file.
3. **Type it manually** — start from an empty profile.

A fourth path arrives sideways: someone who ran a **free anonymous scan** and then
signed up has their extracted data waiting to be claimed, so they never upload
twice. See [`11_USER_JOURNEYS.md`](11_USER_JOURNEYS.md) §2.

**Extraction produces a draft, never a saved profile.** The user always reviews and
corrects before it becomes their profile. **The draft itself is kept, though**
(2026-09-11): the parse routes save it to `pending_profile_drafts` before answering, so
a paid reading survives a refresh or a closed browser. The Career Profile page reopens it
on every load — the keep-or-replace choice against a saved profile, or straight into the
editor for a first profile — and it is deleted once resolved: the choice saved, the
profile saved, or "Keep my profile as it is". The screen is a *confirm-and-correct* screen,
deliberately not a long blank form — the fastest way to a complete profile is to
fill it in for the user and let them fix what is wrong.

The draft type is a separate shape from a stored profile: database-owned fields,
derived fields, and forward-looking intent fields are **entirely absent** from it,
because a resume describes the past and cannot truthfully supply them.

---

## 2. Re-uploading — merge, never replace

Uploading a new CV over an existing profile used to **replace it wholesale.** That
destroyed hand-typed data and per-field visibility choices.

It was also worse than it looked: because fixed fields were once read live at render
time, a wholesale replacement silently rewrote every resume the user had **already
paid for**. Two separate defects met in one path.

Now the user is **asked before anything is overwritten**, and the merge preserves
what they typed. **The answer is saved straight away** (2026-09-11), and a third option,
"Keep my profile as it is", discards the reading. Until the user answers, the question
comes back on every visit, because the reading behind it is kept on the server — and the
dashboard's next step points at it. The delivered-document freeze in
[`08_RESUME_ENGINE.md`](08_RESUME_ENGINE.md) §4 closes the second half.

---

## 3. Field visibility — what appears on a CV

`field_visibility` on the profile controls which fields reach a rendered resume.
This is a **Gulf-specific requirement, not a preference**: photo, nationality, date
of birth and visa status are normal on a Gulf CV and unwelcome on a Western one, and
the user decides.

The Career Profile Resume reads this visibility live, including changes after
creation. Its content Edit opens `/profile?view=details`; visibility opens
`/profile?view=settings`. Both use the existing validated atomic profile save.
No formatted-document lines are reverse-parsed into profile fields.

For optimized resumes:
- **A resume records the visibility state it was generated with**, in
  `field_visibility_snapshot`. Changing your preferences later does not retroactively
  alter a delivered document.
- **It is set on the profile page itself** (2026-10-04): the Profile settings screen,
  `/profile?view=settings`, edits the same editor state and is written by the same Save.
  `/profile/visibility` redirects there.
- **Every template must render correctly for every combination.** No empty gaps, no
  broken alignment. This is proven exhaustively rather than sampled — see
  [`08_RESUME_ENGINE.md`](08_RESUME_ENGINE.md) §6.

---

## 4. The editor

**The page is an overview with screens (2026-10-04).** `/profile` opens on cards — header
(photo, Profile complete ring, Save), what this page is, Profile complete and Gulf
Readiness score cards, Profile settings, career at a glance — and each opens a screen of
the same page via `?view=`: `details` (the editor below), `completeness`, `readiness`,
`settings`. The editor state is shared by all of them and never unmounts, so moving
between screens loses nothing; once saved, each screen's save bar returns to the overview
("Back to my profile"). Components: `components/profile/ProfileOverview.tsx`
(overview cards, `ViewHeader`, `SaveBar`), `CompletenessView.tsx`,
`GulfReadinessView.tsx`, `CvVisibilitySettings.tsx`, `ScoreRing.tsx`.

The editor itself (`?view=details`) is one screen at a readable column width, nine
collapsible sections with guided helper text, a status chip and points per section, and
Save at the top right. Collapsed sections still show their status, so nothing left to do
is hidden; a failed save opens the sections holding the missing fields and focuses the
first one.

**Dates are month-precision.** Resumes give "March 2021" at best. Extraction
correctly returns a year-month rather than inventing a day, so the form uses month
inputs and a helper pads for storage without ever displaying the padded day. It
returns null rather than guessing on unparseable input.

That mismatch was a real user-facing failure once: a date input silently blanked a
value that was still held in memory, and saving failed with a server error and no
visible cause — on the main "confirm your extracted profile" screen.

**Skills and certifications keep the user's own order.** Relevance reordering for a
specific target job is stored on the package, never written back to the profile. The
AI never reorders or rewords the canonical list.

---

## 5. Photo

Uploaded to a **private** bucket and served through server-minted signed URLs. Never
public. Verified with an unauthenticated probe: writes denied, signed-URL minting
denied, public URL not served.

The resume templates that show a photo take a size the user can adjust.
Resume preview also offers the same Upload/Replace photo control, even when the
profile has no photo or the selected template is photo-less. It saves immediately
through `/api/profile/photo` to this single profile record. Preview offers a
per-resume Show photo toggle rather than deleting the shared photo. A highlighted
tip explains that professional photos are common on some Gulf CVs but optional;
employer instructions take priority. JPG/PNG/WebP, up to 5MB, remain the limits.

---

## 6. Readiness

The profile carries `readiness_category` and `readiness_score`. The category is
**derived, not asked** — fresher, experienced, returner, or currently in the Gulf —
and it determines how the score is weighted, because a fresher and a returning Gulf
professional are not missing the same things.

**The score never gates anything.** It is guidance. Full detail in
[`09_SCORING.md`](09_SCORING.md).

---

## 7. Deletion

Settings offers a real **hard delete** of the profile and all packages, behind a
two-step confirmation requiring a typed phrase. Not a soft flag, not a hidden
archive. Child tables cascade.

---

## 8. Known gaps in this area

Both are recorded in [`14_OPEN_ITEMS.md`](14_OPEN_ITEMS.md); repeated here because
anyone working on the profile will meet them.

1. **Unsaved edits are lost when leaving `/profile`.** Moving between the profile's own
   screens (including Profile settings) keeps everything since 2026-10-04; leaving for
   another route with unsaved edits still loses them without a warning.
2. **The profile API assumes a full-object save.** Readiness is computed from the
   submitted object, so a partial save would score omitted-but-actually-filled fields
   as empty and silently undercount readiness. Nothing at the API boundary enforces
   full-object submission — the editor simply always sends one.

## Resume parsing v2 (2026-10-01)

Uploading or pasting a CV now goes through `lib/resumeParse` — layout-aware text,
a pattern pre-pass, one fast model call, and checks against the CV text. Typical
read ~5 seconds (was 45–90). Everything after it is unchanged: the draft has the
same shape, the merge / replace choice and the save are the same code. New: when
the reader could not confirm something (a start date it could not read, a company
name not found as written) the editor shows "We read your CV. Please check these"
with a link to each field (`components/profile/ParseNotes.tsx`). Full design and
numbers: [`06_AI_PIPELINE.md`](06_AI_PIPELINE.md) §5 "Resume parsing v2".

## Overview, section status and save bar (2026-09-23, reorganised 2026-10-04)

`components/profile/ProfileOverview.tsx` (since 2026-10-04 split into cards and screens —
see §4): what the profile is for, the facts it already
holds (current role, years from dates, GCC years and countries via
`lib/experienceYears.ts` `gccExperience`, location, target, visa · notice), every section
as Complete / Needs attention / Missing / Optional with one "Fill next", and a save bar
(Save stays on the page; errors appear at the bar). Extraction now copies the CV's summary
as written, sets each role's `gcc_country` from its written location, and drops the CV
headline from Additional information (`lib/ai/extractionPrompt.ts`,
`scripts/verify-profile-data.ts`).
