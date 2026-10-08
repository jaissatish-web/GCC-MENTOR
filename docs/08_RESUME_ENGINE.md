# RESUME ENGINE — templates, styling, and the frozen delivered document

---

## 1. One derivation, many renderers

`lib/resumeDocument.ts` turns a Career Profile plus a package into a **rendered
document**: exactly the lines that appear on the CV, with field visibility already
applied and the AI-written text merged in.

**Every template renders that document. No template derives its own data.**

This is the single most valuable structural decision in this part of the codebase.
It is why 50 templates cost roughly what one costs, why a rendering bug is fixed
once rather than fifty times, and why an exhaustive correctness baseline is even
possible.

**Never copy a template's original data-shaping logic along with its visuals.** That
is precisely the mistake this structure exists to prevent.

---

## 2. The template registry

`lib/templates.ts` holds every template with an id, a **version**, a name, a
description, a category and a `styleable` flag. Templates are resolved **through the
registry everywhere** — never by a hard-coded component reference.

**50 templates** — the fifteen below, plus the 35 Gulf designs added on 2026-10-04
(next subsection):

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

13 of these 15, and all 35 added since, run on a **shared rendering engine**
(`components/templates/engine.tsx`) — 48 of the 50.
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

### The 2026-10-04 set — 35 Gulf designs, one engine

Founder brief: research the leading resume builders and Canva-style galleries, find the
designs that suit the Gulf market — engineering, technicians, supervisors, finance,
marketing, construction, nursing and the other big hiring fields — mostly WITH a photo,
premium-looking, and make them work exactly like the existing fifteen.

**What the research said a Gulf CV needs** (UAE, Saudi and GCC CV guides, ATS guides,
2026 design round-ups): a photo is still expected; nationality, visa status, notice
period and location belong at the top; one or two pages; a clean reading order for the
ATS most large employers use; and, from the design galleries, the patterns that read as
premium without hurting parsing — a coloured masthead, a filled side column, a career
timeline, skill pills, centred serif headers. **Every design here is original**: no
third-party markup, artwork, icons or fonts, web-safe fonts only.

**Each one is a theme — data, not code** (`components/templates/themes.ts`) — so it gets
everything the fifteen have, by construction: the same rendered document and visibility
switches, the same font / size / accent / photo-size / show-photo controls, the same
saved choice (`template_id`, validated by `isTemplateId`, no migration), the same PDF
route and "Check my PDF". 33 show a photo; Audit Clarity and Data Clarity are
text-first and show the candidate's initials instead.

| | Template | Best for | Photo |
|---|---|---|---|
| 16 | Desert Steel | Engineers, Oil & Gas, heavy industry | Yes |
| 17 | Pipeline Pro | Piping & mechanical, EPC, Oil & Gas | Yes |
| 18 | Blueprint Engineer | Civil & structural, design engineers, consultants | Yes |
| 19 | Power Grid | Electrical engineers, I&C, utilities | Yes |
| 20 | Offshore Navy | Offshore & marine, drilling, Oil & Gas | Yes |
| 21 | Commissioning Lead | Commissioning, start-up, operations leads | Yes |
| 22 | Field Technician | Electricians, instrument technicians, HVAC | Yes |
| 23 | Workshop Pro | Mechanics, welders, fabricators | Yes |
| 24 | Maintenance Master | Maintenance, planners, plant technicians | Yes |
| 25 | Skilled Trades | Carpenters & masons, plumbers, operators & drivers | Yes |
| 26 | Site Supervisor | Site supervisors, foremen, safety supervisors | Yes |
| 27 | Hard Hat Pro | Construction, site crews, safety officers | Yes |
| 28 | QS Precision | Quantity surveyors, cost engineers, planners | Yes |
| 29 | HSE Shield | HSE officers, safety managers, fire & safety | Yes |
| 30 | Project Director | Project, construction and engineering managers | Yes |
| 31 | Ledger Classic | Accountants, auditors, finance officers | Yes |
| 32 | Riyadh Banker | Banking, investment, relationship managers | Yes |
| 33 | Audit Clarity | Audit, financial analysts, multinationals | Initials |
| 34 | CFO Signature | Finance managers, CFOs, controllers | Yes |
| 35 | Marina Creative | Marketing, communications, PR | Yes |
| 36 | Spotlight Sales | Sales executives, business development | Yes |
| 37 | Brand Story | Digital marketing, social media, content | Yes |
| 38 | Clinical Care | Registered nurses, nurse specialists, midwives | Yes |
| 39 | Medical Pearl | Doctors, pharmacists, allied health | Yes |
| 40 | Care Compass | Nursing assistants, caregivers, patient care | Yes |
| 41 | Lab Precision | Lab technicians, radiographers, pharmacy technicians | Yes |
| 42 | Oasis Hospitality | Hotels, F&B, front office | Yes |
| 43 | Retail Star | Retail, customer service, cashiers | Yes |
| 44 | Tech Horizon | Software, networks, IT support | Yes |
| 45 | Data Clarity | Data & ERP analysts, systems | Initials |
| 46 | Office Elegance | Admin & secretaries, reception, PRO | Yes |
| 47 | People Partner | HR, recruitment, training | Yes |
| 48 | Logistics Route | Supply chain, warehouse, drivers | Yes |
| 49 | Scholar Classic | Teachers, lecturers, trainers | Yes |
| 50 | Falcon Executive | C-suite, general managers, country heads | Yes |

**New theme vocabulary, all optional — absent means the old output**, which is why the
original fifteen are byte-identical (§6): `headerVariant` (`centered` | `card`),
`bandGradient` and `bandStripe` (masthead shading and accent stripe), `pageEdge` (an 8px
accent edge, left or top), `experienceStyle: 'timeline'`, `dateStyle: 'chip'`,
`nameStyle: 'two-tone'` (surname in a second colour), `photoRing`, `photoShape:
'rounded'`, `summaryStyle: 'boxed'`, `contactBar`, `contactColumns: 2`, `nameFill`,
`railStyle: 'soft'` and `railWidth`, `monogram` (initials when no photo — after the
name in the markup), `paper` (a near-white page tint), `fillPage` (below),
`sectionOrder` (`skills-first` | `credentials-first`), heading styles `pill` / `bar` /
`marker` and skill styles `outline` / `list`.

**A left rail is placed with CSS grid, not a reversed flex row.** Chrome writes a
reversed row into the PDF in *visual* order, so an ATS reading the downloaded file met
the rail's nationality, location and visa before the name, although the markup had the
name first. Grid keeps the markup's order; measured pixel-identical to the old row (0
differing pixels on one- and two-page PDFs and on screen). Technical Sidebar and
Creative GCC keep the old row (`railFirstInPdf`) until the switch is approved —
[`14_OPEN_ITEMS.md`](14_OPEN_ITEMS.md) §T2.

**The initials badge is placed the same way, for the same reason.** It stands where a
photo would, but it is text: placed first with flex `order`, the PDF read "RS" before the
name for a candidate without a photo. It now follows the name in the markup and is put
on the left or on top by grid — pixel-identical, name first.

**`fillPage`: a one-page CV's colour reaches the foot of the page.** In print the PDF
route releases the page's on-screen height (a full A4 box inside the 10mm margins
spilled a blank second page), so a filled rail, a left page edge or a paper tint stopped
where the text did — about three-quarters down. A design with `fillPage` carries
`data-fill-page`, and `lib/pdf/renderPackage.ts` holds it to 276mm in print: 1mm under
the printable 277mm, so no rounding can spill a page. Longer CVs grow past it as before.
Set on the 13 new designs where it shows; the three original rail designs stop early as
they always have, until approved ([`14_OPEN_ITEMS.md`](14_OPEN_ITEMS.md) §T5).

**Fields and the picker filter.** Each registry entry carries `fields` — the job
families it suits (`TEMPLATE_FIELDS`: Engineering, Oil & Gas, Technician, Construction,
Supervisor, HSE & Safety, Nursing & Healthcare, Finance & Banking, Sales & Marketing,
Hospitality & Retail, IT & Data, Admin & HR, Logistics & Drivers, Education, Executive,
Fresh graduate). The picker filters by them: a swipeable chip row on a phone, wrapping
chips in the gallery, a dropdown in the workspace's narrow desktop rail, each with its
count. A recommendation, never a restriction — "All" is the default. Previews draw only
as they near the screen (an IntersectionObserver, 600px ahead), so fifty full-page
previews do not render at once on a phone.

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

**Text colour, highlight, borders and header (2026-10-04, founder: "the text is not
dark… the header is very light… let the user control the highlighter").** Four more
named choices, stored in the same column, validated the same way (keys looked up in
fixed tables — `INK_OPTIONS`, `HIGHLIGHT_OPTIONS`, `HEADER_OPTIONS` — never a colour
string), and absent means the template's own look:

| Choice | Options | What it changes |
|---|---|---|
| Text colour | Dark · Black | Body text, employer lines, dates and contact details go darker for print; headings keep the accent (Black is also an accent choice) |
| Highlight | None · Grey · Blue · Green · Yellow · Rose | The light shading behind the summary box, a header card, skill and date tags, a contact strip, a light side column — and solid heading bars, which become a light bar in that colour (or, with None, an underlined heading) |
| Lines & borders | off | Box edges, tag outlines and heading lines; with no highlight too, tags print as a dotted list, since nothing marks where one ends |
| Header | Light · Bold | Bold sets the name on a band of the accent colour, Light on the white page; a side-column design has no header to change |

The 48 engine designs honour all four; Gulf Premium has no shaded boxes or coloured
header, so it honours Text colour only; ATS Classic stays fixed. Verified: every
template under every choice in `scripts/verify-template-quality.ts`, the rules in
`scripts/verify-resume-style.ts`, and all 50 PDFs built with black text, no highlight,
no borders and a bold header pass the ATS check.

**The panel opens and closes.** On `/package/[id]` the Text style block is closed by
default and says in one line what is set ("Black text · No highlight · Bold header");
"Edit" opens it. The photo controls moved out of it into their own Photo block, always
in reach.
Upload/Replace photo is available there even before a photo exists, reusing the
Career Profile uploader. Show photo remains available for photo-capable templates
with an empty slot; size appears only when a photo exists. Photo-less templates
explain their limitation while still allowing the profile upload. Uploads save
immediately; visibility and size retain the existing style Save flow.

Verified 2026-10-08: typecheck/lint, 43 automated checks (including all 50-template
suites and disposable-DB ownership policies), and production build passed. Actual
PackageScreen in Chrome with isolated API fixtures passed empty-photo upload,
hide/show before upload, saved hide/reload, replacement preserving frozen wording,
hidden fields, photo-less ATS, upload error and 320/390/768/1440px layouts. Three
PDFs generated by the actual renderPackage pipeline and Chrome passed new-photo,
replacement and hidden-photo checks; old photo paths were not signed and snapshots
were unchanged. These fixtures do not replace a real user's photo in production;
the existing local ATS heading-recognition verification gap remains separate.

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

**Photo presentation exception (2026-10-08):** preview and PDF prefer the latest
saved Career Profile photo when one is available. Replacing a photo deletes the
old storage object, so retaining its frozen path would produce a broken image.
`applyLivePhotoToDocument` changes only a returned header, never stored snapshots
or job-specific wording, and respects saved field visibility. An absent live
photo retains the snapshot fallback. Resume Show photo remains independent.

1. **Both renderers prefer the snapshot** when one exists — the on-screen resume and
   the PDF. They must never disagree about what a package contains.
2. **Editing text re-applies only the summary and bullets onto the frozen
   document.** It deliberately does **not** rebuild, because rebuilding would read
   the live profile and reintroduce the exact bug the snapshot exists to prevent.
3. **A Career Profile Resume (`tier = 'free'`) never uses a snapshot.** The shared
   `buildCareerProfileResume()` adapter rebuilds it from the saved profile, including
   responsibilities and highlights without AI rewriting or punctuation changes.
   Preview and PDF use that same document and live visibility. Content Edit opens
   the validated Career Profile editor. PATCH rejects independent raw content edits;
   optimization refuses to generate into this row. Name/template/style still save
   through the existing metadata path. Optimized resume editing remains per-resume.
   Optional profile-only service generation shares this live adapter, never the
   raw package's target metadata or optimized snapshot. It saves service artifacts
   normally without rewriting the CV. `careerProfileServiceContext()` supplies a
   profile-derived field and null company/country/industry/JD; the three prompt
   builders branch only for this source. Existing optimized prompts retain parity.


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

**How a CV meets a page break (2026-10-04, founder report: half of page 1 blank, Work
Experience starting on page 2).** Every job used to be `page-break-inside: avoid`, so a
long current role — thirteen points under a header, summary and licences — was pushed
whole to the next page. Now a job flows on: its title, employer and first point stay
together (`KEEP_WITH_NEXT`), no single point is split (`NO_SPLIT`), and a heading is
never left at the foot of a page — which needs the heading to be a block, so the pill
heading now draws its pill on a span inside one. Shared by the engine, Gulf Premium and
ATS Classic (`components/templates/tokens.ts`). On screen nothing changes: 100 of 100
renders pixel-identical before and after.

**Long CVs are checked.** `scripts/verify-template-pdfs.ts` builds a sixteen-role CV
(`makeLongTemplateFixture`) in every design — four to eight pages — and requires, on
every page but the last, at most 110pt blank under the main column and no section
heading or job title stranded at the foot. All 50 pass; the largest gap is about 2.6cm
(a heading with a job's first lines that did not fit). Before the fix the same CV left
377pt blank in Clinical Care and 616pt in Pipeline Pro.

**"Check my PDF" on long CVs.** Its job-order test took each employer's first mention,
so a CV that returned to an employer — or named one in its summary — was told its
design "mixes columns". Each job is now looked for after the one before it
(`lib/atsFileCheck.ts`, with both cases in `scripts/verify-ats-file-check.ts`).

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

**The PDF's text order is Chrome's paint order, not the markup's.** A layout trick that
is invisible on screen can still reorder what an ATS reads from the file — a reversed
flex row did (§2, the 2026-10-04 set). `scripts/verify-template-pdfs.ts` builds every
template's PDF with the download code itself (`lib/pdf/renderPackage.ts`, a database
stand-in, the photo over HTTP) and reads it back with the user-facing ATS check — every
template twice, with a photo and for a candidate without one: all 100 files pass 8/8,
one page, the photo exactly where the design shows one, the name the first text (two
known exceptions above). It needs a local Chrome, so it is run by hand when a
template is added or the engine changes, not from `npm test`.

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

**Correction, 2026-10-04 — that baseline never hid a field.** `scripts/verify-resume.ts`
sets only the switches that are ON; a missing key means SHOWN (`visible()` in
`lib/resumeDocument.ts`), so every one of the 32,768 "permutations" renders the same full
CV — `scripts/resume.golden.txt` holds one distinct hash 32,768 times. It still proves
the full CV unchanged; it does not prove the hidden-field paths. Fixing it is
[`14_OPEN_ITEMS.md`](14_OPEN_ITEMS.md) §T1.

**Every template is now baselined, Gulf Premium included, with every switch set
explicitly on or off** — `scripts/verify-engine-templates.ts` and
`scripts/engine-templates.golden.json`. One realistic Gulf CV
(`scripts/fixtures/templateFixture.ts`) under every visibility combination (`--full`,
32,768 per template) or a fixed 512-combination sample (default, in `npm test`), plus 12
style-override variants, folded into one digest per template. A template missing from
the golden file fails, so a new design is captured on purpose (`--golden`), never by
accident. Before the 2026-10-04 engine work the baseline was captured from the
unchanged code; afterwards **all 15 original templates passed `--full` — identical
across all 32,768 combinations and 12 style variants each** — and only then were the
35 new designs added to it.

**And every template is checked for being right, not only unchanged** —
`scripts/verify-template-quality.ts` (in `npm test`): no "undefined"/"NaN" printed or
hidden in a style attribute, the name the first text whenever it is shown, the photo
exactly when the design, the resume, the switch and the user's toggle all allow it, and
every section present — under 20 visibility combinations with the photo shown and
hidden, and under each of the 16 font, size, accent and photo-size choices.
