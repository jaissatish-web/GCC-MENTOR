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
corrects before anything is stored. The screen is a *confirm-and-correct* screen,
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
what they typed. The delivered-document freeze in
[`08_RESUME_ENGINE.md`](08_RESUME_ENGINE.md) §4 closes the second half.

---

## 3. Field visibility — what appears on a CV

`field_visibility` on the profile controls which fields reach a rendered resume.
This is a **Gulf-specific requirement, not a preference**: photo, nationality, date
of birth and visa status are normal on a Gulf CV and unwelcome on a Western one, and
the user decides.

Two rules:
- **A resume records the visibility state it was generated with**, in
  `field_visibility_snapshot`. Changing your preferences later does not retroactively
  alter a delivered document.
- **Every template must render correctly for every combination.** No empty gaps, no
  broken alignment. This is proven exhaustively rather than sampled — see
  [`08_RESUME_ENGINE.md`](08_RESUME_ENGINE.md) §6.

---

## 4. The editor

One screen at a readable column width, with per-section guided helper text, an
optional-field marker, and a section jump-navigation. Save sits at the top right.

**Sections are deliberately not collapsible.** Collapsing hides fields the user
still has to fill and, worse, buries validation errors behind a closed panel.

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

1. **Unsaved edits are lost on navigation.** Leaving the editor for the visibility
   screen mid-typing unmounts the form's state without warning, and returning reloads
   the last *saved* state. Several reasonable fixes exist; none has been chosen.
2. **The profile API assumes a full-object save.** Readiness is computed from the
   submitted object, so a partial save would score omitted-but-actually-filled fields
   as empty and silently undercount readiness. Nothing at the API boundary enforces
   full-object submission — the editor simply always sends one.
