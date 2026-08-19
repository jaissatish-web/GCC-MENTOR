# RESUME ENGINE — templates, styling, and the frozen delivered document

---

## 1. One derivation, many renderers

`lib/resumeDocument.ts` turns a Career Profile plus a package into a **rendered
document**: exactly the lines that appear on the CV, with field visibility already
applied and the AI-written text merged in.

**Every template renders that document. No template derives its own data.**

This is the single most valuable structural decision in this part of the codebase.
It is why 15 templates cost roughly what one costs, why a rendering bug is fixed
once rather than fifteen times, and why an exhaustive correctness baseline is even
possible.

**Never copy a template's original data-shaping logic along with its visuals.** That
is precisely the mistake this structure exists to prevent.

---

## 2. The template registry

`lib/templates.ts` holds every template with an id, a **version**, a name, a
description, a category and a `styleable` flag. Templates are resolved **through the
registry everywhere** — never by a hard-coded component reference.

**15 templates:**

| | Template | User-adjustable style | Photo |
|---|---|---|---|
| 1 | **Gulf Premium** — the default | Yes (own logic, 2026-08-19) | Yes |
| 2 | **ATS Classic** | **No, on purpose** | **No, on purpose** |
| 3 | GCC Engineering | Yes | Yes (2026-08-19) |
| 4 | Executive GCC | Yes | Yes (2026-08-19) |
| 5 | Modern Professional | Yes | Yes |
| 6 | Senior Compact | Yes | Yes (2026-08-19) |
| 7 | Gulf Minimal | Yes | Yes (2026-08-19) |
| 8 | Corporate Band | Yes | Yes |
| 9 | Technical Sidebar | Yes | Yes |
| 10 | Graduate Entry | Yes | Yes |
| 11 | Portrait Right | Yes | Yes |
| 12 | Consultant Right | Yes | Yes |
| 13 | Heritage Left | Yes | Yes |
| 14 | Project Two-Column | Yes | Yes |
| 15 | Creative GCC | Yes | Yes |

13 of the 15 run on a **shared rendering engine** (`components/templates/engine.tsx`).
Gulf Premium and ATS Classic are hand-written with an explicit face, size and colour
on every element, so a shared style override has nothing to cascade into.

**Gulf Premium is styleable anyway, since 2026-08-19 — through its own small,
dedicated derivation, not the shared engine.** `GulfPremium.tsx` reads the same
`ResumeStyleOverrides` (font, size, accent, photo size, photo on/off) and maps them
onto its own literal constants, falling back to the EXACT original constant whenever an
override is unset. **Verified byte-identical against the full 32,768-permutation golden
baseline with no overrides applied** — the default output, and therefore every
already-delivered resume, is provably unchanged. Porting it onto the shared engine
proper remains a separate, larger, deliberately deferred item (open items §B3/W6) —
this is a narrower fix, not that one.

**ATS Classic stays fixed on purpose, and that is now the honest exception rather than
one of two.** Its whole reason to exist is "maximum ATS compatibility" — a styling
control, and especially a photo, works against that. The styling panel names this
directly rather than showing dead controls.

**Every template now shows the work-experience date range.** Until 2026-08-19 only
Gulf Premium rendered it — `lib/resumeDocument.ts` had always computed it
(`ResumeExperienceItem.range`), the shared engine and AtsClassic simply never read
it. One addition to `engine.tsx`'s experience block covers all 13 engine-driven
templates; AtsClassic got its own, in the same plain " | "-joined convention it
already uses for its contact line, deliberately not the engine's right-aligned flex
column — a parser reading it linearly should get role and dates in order, not a
layout trick to reconstruct.

**Photo coverage widened the same day.** GCC Engineering, Executive GCC, Senior
Compact and Gulf Minimal now allow a photo (`allowPhoto: true` in
`components/templates/themes.ts`) — they were the four "text-first" engine themes with
no photo slot at all, which is not what a Gulf CV convention expects. ATS Classic is the
deliberate, sole exception, for the ATS reason above. **A per-resume "show photo"
toggle** (`ResumeStyleOverrides.showPhoto`) sits alongside the existing photo-size
slider in the style panel on every photo-capable template, including Gulf Premium — it
can only ever hide a photo a template and a resume would otherwise show, never
conjure one from nothing.

### Why version, and not only id

`template_id` alone is not enough. When a template is revised, **every resume ever
generated with the previous version would silently change shape on next open.**
Storing the version means an old resume keeps rendering the way it was delivered.

A null template on an older row means "generated before templates were selectable"
and renders with the default — which is exactly what it was rendered with
originally. **Deliberately not backfilled:** a written value would claim the user
chose it.

---

## 3. User-adjustable styling

Font, size and accent colour, plus photo size where a template shows a photo. Saved
per resume in `style_overrides`.

**Why a separate column, not part of the delivered document:** styling is
presentation, and **changing how a resume looks must never be able to touch what it
says.** Keeping them in different columns makes that true by construction rather
than by being careful, and means the styling control cannot become another way to
edit a paid document.

**Why JSONB rather than three columns:** the set of adjustable properties will grow.
The tradeoff is that the database cannot constrain the values, so **validation lives
in `lib/resumeStyle.ts` and is enforced server-side before any write.** The column
only ever stores values that have already been checked against a fixed set.

**Every accent colour is dark enough to carry white text**, because the banded and
railed templates reverse the candidate's name out of the accent. A pale accent would
render an invisible name.

---

## 4. The frozen delivered document

**`document_snapshot` is the most important safety property in this part of the
system.**

A package originally froze only the AI-written text. Every fixed field — name,
contact details, education, certifications, photo — was read **live** from the
profile at render time. **So editing your Career Profile silently rewrote resumes
you had already paid for.** Re-downloading last week's CV could produce a different
document.

The snapshot stores the rendered document as delivered. Three rules follow:

1. **Both renderers prefer the snapshot** when one exists — the on-screen resume and
   the PDF. They must never disagree about what a package contains.
2. **Editing text re-applies only the summary and bullets onto the frozen
   document.** It deliberately does **not** rebuild, because rebuilding would read
   the live profile and reintroduce the exact bug the snapshot exists to prevent.
3. **A free resume has no snapshot on purpose** and therefore renders from the live
   profile. That is why a free user edits their CV by editing their profile, and it
   is consistent: nothing has been sold, so nothing needs freezing.

**This is where the worst defect in the project's history lived.** The snapshot had
exactly one writer — generation — and generation refuses to run twice, while the
text-edit path only ever updated the AI text column. Both renderers prefer the
snapshot. So a user edited a bullet, saw it save, and both the screen and the
downloaded PDF still showed the old text. **Every text edit to a paid resume was
silently discarded.**

Two individually-correct changes, each individually verified, and neither
verification exercised the path the other had changed. **That is the origin of the
rule in [`02_PHILOSOPHY.md`](02_PHILOSOPHY.md) §4 about checking downstream
writers.**

---

## 5. Rendering and download

**On screen:** the resume renders as a document — a real page at full size, with its
own scroll behaviour, not a clipped widget.

**PDF:** the same template rendered to HTML and printed by headless Chromium, so the
download matches the screen. Uniform top and bottom margins on every page.

**PDF only.** The Word download was withdrawn because its output did not match what
the screen showed. The route still exists but nothing links to it — recorded in
[`14_OPEN_ITEMS.md`](14_OPEN_ITEMS.md).

**Print templates cannot use Tailwind classes.** The PDF pipeline renders to static
markup with a small inline style block and no stylesheet, so a Tailwind-classed
template would produce a completely unstyled PDF — the actual paid deliverable.
Templates use inline styles sourced from a single tokens file that mirrors the
Tailwind config. **Those two files must be kept in step by hand.**

Shipping Chromium to the serverless function is a real deployment constraint with two
traps — see [`03_ARCHITECTURE.md`](03_ARCHITECTURE.md) §7.

---

## 6. The exhaustive baseline

**A 32,768-permutation golden baseline** (`scripts/resume.golden.txt`) covers every
combination of shown and hidden fields, and is re-run on any change that could touch
rendering.

**It is exhaustive rather than sampled for a reason:** the requirement is that the
template renders correctly for *every* combination — no empty gaps, no broken
alignment, including at 390px. A sample cannot prove that. Every migration and
refactor touching this area has been checked against it.

It also makes the default-template port a **checkable** job rather than a risky one:
byte-identical output across all 32,768 combinations is exactly the proof needed
that already-delivered resumes still render the way they were delivered.

**Re-run and passed 2026-08-19** against GulfPremium.tsx's new style-override logic,
with no overrides supplied (the baseline's own fixture never passes any) —
`VERIFY PASS — all 32768 permutations produce byte-identical HTML`. That is the actual
evidence behind "already-delivered resumes are unaffected", not just the intent.
