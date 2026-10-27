Warning: truncated output (original token count: 50699)
Total output lines: 3277

# DECISION LOG — what was decided, when, and why

## 2026-10-22 — Persistent project memory and main-only workflow

Founder requests a durable plan/rules/progress system so new conversations can continue without reconstructing decisions. Root AGENTS.md mandates reading the canonical documents; finalized requirements and acceptance criteria must be documented BEFORE implementation. Afterwards record actual changes, verification and the next action. Replace the old named-tool handoff with founder/lead assistant/optional bounded subagents. Main is the only standing branch; preserve unique branch work before cleanup. Do not alter application logic during this documentation session. Existing source, not stale plans, establishes implementation; live production claims require separate evidence.

## 2026-10-11 — Universal clean UI configuration

Founder approves an application-wide consistency pass: app/ui-system.css owns fonts, responsive role sizes/weights/line spacing, semantic colors, page widths/gutters/rhythm and component radii/padding/shadows. Shared components and public landing consume these settings; existing utility colors bridge to variables outside document boundaries. Keep Inter, white/neutral surfaces and deep Gulf teal actions. Colored navigation accents remain centralized. Replace redundant instruction boxes with plain sections, reduce repeated header chrome and standardize layout. Preserve all data flows, messages, actions, templates and exports. Browser QA unavailable in managed environment; run build/type/lint and offline checks, report limit.

## 2026-10-11 — Compact colored service navigation

Founder moves Cover Letter into Build your CV, directly below Resume Templates. Shared sidebar/phone-menu groups and tablet order reflect this. Reduce row padding, icon size and category spacing while retaining 44px tap targets and readable labels. Each service gets a distinct colored icon tile. Cover Letter remains part of the application stage for progress badges; category placement does not change prerequisites or feature behavior.

## 2026-10-11 — Direct platform entry and output-first preparation

Founder requests removal of the Professional Profiles hub. Navigation goes directly to LinkedIn or NaukriGulf; the retired hub URL redirects to LinkedIn for existing bookmarks. Introductions prioritize deliverables, copy destinations, Gulf relevance, three steps and concise practical tips. No invented user observations or daily-edit ranking guarantees. Results show actual draft saved timestamp, fixed job dates and prominent copy controls. Both writing and independent review use existing OpenRouter reasoning-off request shaping; grounding, limits, independent review and quotas remain intact. Current usage logs have no duration field, so elapsed generation speed cannot be established from them.

## 2026-10-11 — Professional profile introductions and NaukriGulf preparation

Founder requested a full NaukriGulf flow alongside LinkedIn and visual first
pages explaining recruiter discovery, useful habits and platform-specific
profile fields. Reuse the proven editor, import comparison, grounded generation,
independent review and checklist interaction. Keep platform drafts separate.
Add a dedicated NaukriGulf prompt/service, private revision-protected storage
and profile/account-delete cascades. Entry pages precede setup and remain
reachable without discarding work. Introductions use illustrative professional
artwork and official guidance; no claim that daily trivial edits guarantee
higher rankings, calls or hiring. Users apply changes themselves.

## 2026-10-11 — Editable Career Profile categories

Founder authorized custom named categories, multiple entries, optional levels,
category/entry ordering, visibility and resume position. Extend existing owner-
scoped additional-information rows with metadata; retain their IDs, atomic save,
RLS and hard-delete behavior. Group existing entries conservatively for review
without bulk rewriting production records. Keep custom facts in existing grounded
profile contexts. Render named sections in all 50 templates and DOCX; preserve
legacy documents and frozen resume snapshots. Adding a category earns no points.


## 2026-10-11 — Reference-inspired mobile landing rebuild

Founder supplied a light blue mobile concept. Rebuild marketing presentation with
blue/cyan accents, readable mobile sections, existing helmeted candidates and the
unchanged rotating resume templates. Demonstrate one Career Profile branching
into JD-specific CVs, individual letters, Q&A and mock interviews. Add pausable,
visible-only interactive application and interview demos; clearly label examples.
Pricing is demo only, without checkout. Keep backend, templates and real scoring
unchanged. Do not import fabricated social proof or salary/hiring predictions.



## 2026-10-09 — Colourful interactive practice progress card

Founder requested a more engaging shared progress visual. Use a dark teal score
ring, colourful skill cards that control the chart, a gradient score area,
chronological milestone buttons and expandable next-action cards. Reuse it on
the dashboard, mock-interview hub and optimized resume overview. Keep saved
scores, strict comparison identity, coaching wording and universal typography.
Use brief entrance/hover transitions with reduced-motion support; no fabricated
rewards, score increases or completion percentages. No backend or schema changes.

## 2026-10-09 — Visual interview practice hub and drill-down cards

Founder requested a graphical practice journey, compact improved/next-focus
cards and clickable interview/result sections instead of a wall of paragraphs.
The per-resume hub shows numbered attempts and aggregate progress only; a run
opens its own results with back navigation. Use real saved score history, show
different settings as separate baselines, and retain honest decreases. Report
cards reveal existing feedback/answers without rewriting content or AI calls.
Dashboard reuses the same chart. Keep universal typography, small phone gutters,
recording/review logic, ownership, retention and resume snapshots unchanged.
No migration, dependency or credit/payment changes.


## 2026-10-09 — Persistent mock interview history and comparable progress

Founder requested natural seated interviewer framing, wider mobile reports, all
attempts per resume and progress in the interview workspace and dashboard. Keep
existing snapshots and scoring. Remove only the mock interview ten-run cap;
restore missing voice runs from existing owner-matched session/answer records.
No new tables or changes to cover letter/Q&A limits, payments or AI prompts.
Compare saved scores only with earlier completed attempts using the same frozen
resume, input mode, interview mode, difficulty, question count and rubric. Show
negative changes honestly and explain that practice scores are not hiring odds.
Existing audio expiry stays three days; transcripts/reports remain until deletion.
Use the universal UI typography and remove redundant report wrappers.


## 2026-10-09 — One code-owned universal UI configuration

Founder requested one place controlling text, fonts, sizes and standard component
styles throughout the platform. Centralize in app/ui-system.css with responsive
CSS tokens and semantic defaults for legacy markup. Remove per-page LinkedIn
application typography overrides. Preserve authored resume documents and the
illustrative profile's explicitly configured compact scale. No settings page,
user database preferences, logic or SEO ranking claims are introduced.


## 2026-10-09 — Compact LinkedIn workspace and familiar mobile profile preview

The founder found LinkedIn setup/results too large and bold and the preview
unlike a LinkedIn mobile profile. Scope the quieter mobile scale to this
workspace and give the illustrative preview independent typography and full-width
phone cards. Use a compact banner/avatar, introduction controls shown as visual
examples, and skill rows; retain the visible illustrative notice. No integration,
LLM prompt, generation, save or Career Profile behavior changes.

## 2026-10-09 — Mobile reading space and quieter typography

Founder approved the mobile audit recommendations: one 12px phone gutter,
lighter heading hierarchy, 12–16px padding on necessary cards, and full-width
subtitles below service titles. Inter, the brand palette, workflows and desktop
content widths stay. Fix the Career Profile photo/score/save row and narrow or
enlarged-text controls through wrapping, not clipped overflow. Public Gulf
Readiness gets its own metadata and canonical; private career documents remain
outside search indexing. No template document typography, exports, AI, credits,
authentication, database or payment logic changes.

**Newest first. Append here the moment a decision is made, before the code is
written.**

This file records *decisions*, not work. It answers "why is it like this?" — including
for decisions that were later reversed, because a reversal is only understandable
alongside what it reversed.

A decision belongs here if changing it back would need a conversation. Format: date,
what was decided, and the reasoning that made it the right call.


## 2026-10-08 — Upload a Career Profile photo from resume preview

Founder requested an upload action beside the template photo setting, including
when a new user has no photo. Reuse PhotoUpload and the authenticated private
Career Profile photo endpoint; save immediately to the profile and refresh the
preview. Show/hide remains a per-resume style preference. Photo-less templates
explain why the uploaded photo will not print; uploading remains available.

Photo replacement is presentation: preview and PDF prefer the latest saved photo
when available, including on optimized resumes. This supersedes the previous
additive-only photo rehydration rule, since replacement deletes the old storage
object anyway. Frozen optimized wording and saved field visibility are preserved.
No snapshot writes, new table, AI calls or credit changes. Preview offers upload
and replace, not global photo deletion. Highlight an optional Gulf CV photo tip
without promising hiring effectiveness or claiming every employer requires one.

---

## 2026-10-08 — Plain service menu and LinkedIn placeholder

Founder requested removing menu category names (profile, tailored CV, apply and
interview, files and account). Show the existing destinations as a continuous
list with their colored icons; remove the sidebar journey card as well so it
cannot repeat the removed category names. Journey guidance stays on Dashboard.
Add LinkedIn Optimization as a real navigation destination with an explicit
Coming soon page, without generation, data collection or credit usage.

---

## 2026-10-08 — Dashboard overview and colorful service navigation

Founder requested removing the unbuilt Saved Jobs menu item, consistent colorful
service icons across desktop/tablet/mobile, top-positioned Profile complete and
Gulf Readiness cards, and a dashboard showing overall status rather than individual
optimized resume/job details. Service count cards link to their existing pages;
the Resume Library owns all per-resume details. Keep the three-step map and
state-aware next action, with generic dashboard wording.

Count available resumes (one Career Profile Resume whenever a saved profile exists,
plus saved optimized CVs), retained cover letters, retained Q&A sets and mock runs.
Show preparation coverage, completed/in-progress practice, average saved mock report
score and overall application-stage counts. These are current saved totals, not
lifetime generation/credit usage. Use one owner-scoped SECURITY INVOKER aggregate
RPC with existing RLS and a counts-only authenticated endpoint: no full documents,
50-row truncation, new table, stored counter, generation or payment change. A small
additive migration creates only that read function; dropping it reverses the DB
change after reverting the dashboard/API.

---

## 2026-10-08 — Career Profile Resume in the existing Library

Founder authorized one persistent `tier = 'free'` package per user, using migration
038's existing unique index. Name, template and style are package preferences;
content and visibility always come from the latest saved Career Profile, without AI,
credits or a delivered snapshot. Raw content editing opens the existing Profile
editor and uses its validated atomic save: reversing formatted document lines would
lose structured dates, certification fields and hidden data. Optimized document
editing and snapshots remain unchanged. PDF uses the same 50-template renderer;
DOCX remains withdrawn pending layout parity. No schema or payment changes.

---

## 2026-10-04 (later still) — Pages that fill, long CVs, and a text style the user controls

**Founder report and brief:** a downloaded CV (Clinical Care) left half of page 1
blank and started Work Experience on page 2 — "unprofessional"; will these designs hold
a five-, six- or seven-page CV; and the highlighted boxes and light text and header look
faint in print, so let the user remove or change the highlight, take the border away,
darken the text — in a Text style panel that opens and closes because it is long.

**Decided:**
- **A job may break across a page; only its title, employer and first point stay
  together, and no point is split.** Keeping every job whole was the cause: a long
  current role was pushed to the next page whole. Same rule in the engine, Gulf Premium
  and ATS Classic. Screen rendering unchanged (100/100 pixel-identical).
- **Every design is tested with a sixteen-role CV** (four to eight pages): at most 110pt
  blank at any page foot but the last, no heading or job title stranded. That test
  found pill headings could be stranded (an inline-block cannot "keep with next"); the
  pill now sits on a span inside a block heading — the sections move up a few pixels to
  the same spacing as every other heading style.
- **"Check my PDF" looks for each job after the one before it.** Its first-mention
  search told CVs that returned to an employer that their design mixes columns.
- **Four more style choices, named keys only, absent = unchanged:** text colour (Dark,
  Black), highlight (None or five light tints — solid heading bars follow it), lines &
  borders off, and header (Light, Bold). Headings keep the accent colour — the accent
  already offers Black. Gulf Premium takes text colour only (it has no boxes); ATS
  Classic stays fixed.
- **Text style is closed by default** with a one-line summary of what is set; the
  photo controls moved out of it so the size bar is never hidden.

**Verified:** 150 real PDFs (50 designs × photo / no photo / long CV) pass with the
default style, and again with black text, no highlight, no borders and a bold header;
50 designs × 29 style choices in the markup checks; the panel in a browser at 390px and
1280px (53 checks: opens and closes, previews each choice, saves exactly the choices,
only offers what a design can do).

---

## 2026-10-04 (late night) — 35 Gulf resume templates on the one engine (15 → 50)

**Founder brief:** as a senior resume designer, research the leading builders' and
Canva-style templates and find the designs that suit the Gulf market — engineering,
technicians, supervisors, finance, marketing, construction, nursing and the other big
hiring fields; most with a photo, because the Middle East expects one; premium-looking,
attractively named; and working exactly like the fifteen we have — same download, same
format, same changes, same application.

**Decided:**
- **Every new design is a theme on the shared engine, never a new component.** That is
  the only way "works the same" is true by construction: one rendered document, one set
  of visibility switches, one style panel, one PDF route, one ATS check. The engine grew
  an optional vocabulary (masthead gradient and stripe, centred and card headers, page
  edge, timeline, date chips, two-tone name, photo ring and rounded crop, boxed summary,
  contact strip and two-column contacts, soft and sized rails, initials badge, paper
  tint, section order, three heading and two skill styles) where **absent means the old
  output** — so the fifteen are byte-identical, proven across all 32,768 visibility
  combinations and 12 style variants each against a baseline captured from the unchanged
  code.
- **33 of the 35 show a photo.** Audit Clarity and Data Clarity are text-first for
  multinational and analyst roles and show the candidate's initials instead; ATS Classic
  stays the photo-free option it was.
- **Names say who they are for** (Pipeline Pro, Clinical Care, Riyadh Banker, Hard Hat
  Pro …) and each entry carries the job **fields** it suits. The picker filters by field —
  a recommendation, never a restriction; "All" is the default.
- **A left rail is placed with CSS grid, not a reversed flex row.** Found by building the
  real PDFs: Chrome writes a reversed row in visual order, so an ATS met the rail's
  personal details before the name. Grid is pixel-identical and keeps the name first.
  Technical Sidebar and Creative GCC keep the old row until the founder approves the
  switch (open items §T2) — it would change already-delivered files, though not how they
  look. The initials badge, placed first with flex `order`, had the same fault for a
  candidate without a photo ("RS" before the name): it is now placed by grid as well.
- **A one-page CV's rail, edge or tint reaches the foot of the PDF page** (`fillPage`,
  13 new designs): the print CSS had released the page height, so colour stopped where
  the text did. Held to 276mm, 1mm under the printable height, so no blank page can
  appear. The three original rail designs wait for a yes (open items §T5).
- **Previews draw as they approach the screen.** Fifty full-page previews at once is too
  much for a phone.

**Verified:** every template's PDF built by the download code and read back with the
user-facing ATS check, with and without a photo — 100 of 100 pass 8/8, one page, photo
exactly where designed, name first (bar the two §T2 designs); grid rail and grid badge
pixel-identical to what they replaced;
markup checks (name first, no "undefined", photo rules, every section) on all 50 in
`npm test`; the gallery and workspace picker in a browser at 390px and 1280px (field
chips and counts, desktop dropdown, choosing a new design saves and re-renders the CV).

**Research basis:** Resume Genius (design, two-column and Canva template guides), Enhancv
2026, VisualCV (UAE, Saudi and GCC CV guides), LoopCV (Gulf CV format), ATS Verification
(UAE applicants), The Interview Guys, Weekday (2026 trends), Graphic Design Junction
(2026 templates), Metaintro. Patterns only — every design is original.

---

## 2026-10-04 (night) — The job workspace on a phone

**Founder brief:** on `/package/[id]` at phone width, "Review and edit changes" ran out of
its box; the Overview · Improve · Design · Tracker tabs read as text; and in CV design the
resume and the templates sat inside boxes that did not use the screen, with two templates
per row running into each other.

**Built (phones only unless stated; desktop layout unchanged):**
- Header actions: stage and Download PDF a full row each, Edit CV and Review changes
  side by side, labels allowed to wrap inside their buttons.
- Tabs: a segmented control at every width — four equal buttons with icons in one box,
  the open one filled teal; 52px tall on phones.
- CV design: the A4 preview leaves its frame and reaches 8px from each edge (~326px →
  374px wide); the controls leave their card; template cards are sized from the space
  actually available (they were a fixed 160px in ~152px columns, so they overlapped),
  with a 16px gap; a name and its badge wrap instead of squeezing. The sizing fix also
  applies to the `/templates` gallery on phones.

Verified in a browser at 390px and 1280px: no button text spills, tabs ≥44px, two
templates per row 16px apart and on screen, no horizontal scroll, no page errors.

**Follow-up, same night — the photo size control.** Its track was `bg-canvas`, the page's
own colour, so once the controls left their white card on phones only the thumb showed
("only one dot"). It is now a size bar like a volume control (`.range-bar` in
`app/globals.css`): − and + buttons at the ends (one 5% step each), a 12px bar filled
teal→gold up to the value, a 28px thumb, the value shown with "· default" at 50%.
Horizontal, not vertical — a vertical slider is awkward on a phone and in a 260px rail;
the − / + ends carry the "down is smaller, up is bigger" meaning. Same 0–100 value, same
Save style.

---

## 2026-10-04 (late) — Design audit of the queued design items

**Founder brief:** audit the design items as a senior web-design auditor; build what is
necessary and safe, hold what is doubtful, push the rest to `main`.

**Built:** D1 phone reading sizes (signed-in app, phones only: 10/11→12, 12→13,
12.5→13.5px; 16px stage picker; 44px standalone links), D5 the Gulf Readiness score card
shows the verdict alone ("Almost ready") because the line under it already counts the
steps — the full label stays on the readiness screen, D7 sidebar labels wrap rather than
truncate. All measured in a browser at 390px and 1280px.

**Held** (see `WORK_QUEUE.md` §D): D2 footer colour (conflicts with the `alert` = "not
built yet" convention), D3 and D4 (reverse layouts approved the same day), D6 (the
dashboard readiness cards are documented as load-bearing).

**Then confirmed by the founder ("finish these also") and built the same evening:**
- **D2** — the in-app footer's "Card checkout is not live yet" is neutral `ink-soft`
  (bold), not `alert` red. A deliberate exception to "red = not built yet", for the one
  line on every signed-in screen; the public footer keeps `NotLiveText`.
- **D3** — the profile explainer shows in full on the first visit, then folds to one
  tappable line ("How it works"), with "Hide" when reopened. Remembered per browser only.
- **D4** — Gulf Readiness: finished paperwork is one "Done:" line; the first 4 profile
  fixes show (was 6); "score by area" and strengths move to the end and, on phones, open
  on a tap (always shown at ≥640px). Phone height 4,197px → 3,037px.
- **D6** — the dashboard's two score cards (a Gulf Readiness widget and a Profile
  complete bar) are replaced by the profile overview's own `ScoreCards`: the same rings,
  each opening its screen, so the "complete your profile" call to action stays.
  `components/gulfReadiness/LiveReadiness.tsx` had no other user and was removed.

---

## 2026-10-04 — The Career Profile becomes an overview with its own screens

**Founder brief:** "the profile page looks very messy — segregate it." Keep the top (photo
and profile completeness); then one clear, colourful card saying in easy words what this
page is; then two cards — Profile complete and GCC (Gulf) Readiness — each with a graph and
a percentage; then the career facts (current role, experience, Gulf experience, location,
target role, visa · notice). Each card opens its own screen in block format. "What appears
on your CV" (passport etc.) moves onto the main profile page as Profile settings.

**Decided:**
- `/profile` is an overview of cards. Five screens on the same route via `?view=`:
  `overview` · `details` (the nine-section editor) · `completeness` · `readiness` ·
  `settings`. Switched with the native history API, so **the editor never unmounts** —
  an edit typed on one screen is still there on the next, and one Save writes it all.
  Separate routes were rejected for exactly that reason (it is the B5 data loss).
- Profile settings is a screen of `/profile` editing the same state; the full-object
  `PUT /api/profile` already carries `field_visibility`. `/profile/visibility` is now a
  redirect to `/profile?view=settings` (kept so old links land). `PUT
  /api/profile/visibility` is unchanged and no longer called by the UI.
- The old Improve panel (`ImprovePanel.tsx`) is replaced by the Gulf Readiness screen;
  same result object, laid out as verdict → score by area (bar chart) → paperwork →
  profile fixes → apply → strengths / what holds it back.
- "N of M key sections done" is ONE count everywhere (Complete out of not-Optional);
  it was a points count on the form and a status count in the overview.
- Old links keep working: `?improve=gulf` → readiness, `?improve=strength` →
  completeness, `?open=<section>` → details with it open. Internal links now use
  `?view=readiness`.
- Name kept as **Gulf Readiness** (the product's name for it everywhere), subtitled
  "How ready you are for GCC jobs".

**Not changed:** scoring, the save contract, the add-or-replace choice, auto-save after
extraction, any API or schema.

**Same day, follow-up (founder):** Profile settings moves above "Your career at a glance"
as a fuller card — four tiles (Photo & personal · Passport, visa & notice · Contact ·
Extra details), each with how many of its details are on the CV and what is hidden. Once
everything is saved, the save bar on every screen the overview opens says **"Back to my
profile"** (returns to the overview); only the overview's own says "Done — go to
dashboard". After fixing a score, people want their profile, not to leave it.

---

## 2026-09-23 (evening) — Career Profile, Resume Library, and fixes from a real end-to-end test

**Founder brief:** redesign Career Profile and Resume Library, then test every service with a
real CV, a real Gulf advert and the live AI configuration; backend fixes allowed where a real
defect is found. Test: the founder's own career history (name, contact and passport number
replaced) against the real KENT "Commissioning Leader – Instrument/Analyzer" advert (KSA), on
the synthetic QA account, through the real routes, three runs. Nothing pushed.

**Frontend:** Career Profile opens with an overview (what the page is, current role, years,
GCC years and countries, location, target, visa · notice), a section map with Complete /
Needs attention / Missing / Optional and one "Fill next", and a save bar that says whether
everything is saved (Save no longer jumps to the dashboard; errors show at the bar, not the
foot of the form). Library cards are job workspaces: title opens the job, a CV · Letter ·
Q&A · Mock strip, one "Next:" action, secondary controls under Details. The job page is
titled with the job ("Application workspace") and carries the same preparation strip.
`gold-tint` (not a token — eight panels had no background) → `gold-soft`.

**Backend and AI fixes, each found on the real run and each tested:**
- Extraction asked for a FIRST-PERSON summary, which rewrote the CV's own paragraph and then
  failed the optimizer's "no first person" check. It now copies the summary as written.
- Every role's `gcc_country` was empty (three Gulf roles). Read from the role's own written
  location at extraction and pre-filled in the editor; never from an employer name.
- The CV headline was stored as "Additional information"; now dropped.
- Job match false gaps: "analysers" vs "Analyzers", "loop checks" vs "Instrument Loop Tests",
  "oil & gas" vs "Oil & Gas industry". Fixed in `lib/optimizer/text.ts` (British -yser,
  edge fillers, one I&C trade equivalence). Same CV and advert: before-score 72 → 80.
- The build prompt forbade stating years while the quality gate asked for them; the plan now
  passes the computed total ("14+ years") when the profile's summary states none.
- A build where most blocks got NO ANSWER from the AI (provider stall) was saved as the
  "optimized" CV — 8 of 10 blocks unchanged on a real High build. More than half unanswered
  now returns a clear retry message; nothing is saved or counted (`buildOutcome.ts`). The
  result screen no longer explains a stalled block as "not provable".
- Library country and company were always empty: filled from the analysis (exactly one GCC
  country) and a literal "Company:" line, only where the job has none (`jobFacts.ts`).
- Interview Q&A failed outright when the model returned 22–24 questions (validator wanted
  exactly 25). Now per-item validation, 15–25 kept; budget 6,000 → 9,000.
- Cover letter: 2,048 and 4,096 tokens were consumed by reasoning (truncated / empty
  letters); now 8,192 (a ceiling, not a spend). Visa status and notice period now reach the
  letter — the KENT advert asks for them.
- Q&A answers invented "I have no family constraints"; sentences about family, marital
  status, dependants or relocation are removed unless the profile says so.
- Mock interview did not flag an answer claiming "Emerson DeltaV" and a TÜV certificate the
  CV lacks, and the report listed both as STRENGTHS. Unknown certificates and product names
  are now flagged and never become strengths.
- The shared sentence splitter broke "99.2%" at the decimal point.

**Not changed, founder decision needed:** the AI provider (OpenRouter → DeepSeek v4 Flash, no
fallback configured) stalled on roughly a third of calls during the test; a fallback model in
`/admin/ai-provider` is the single largest reliability lever.

---

## 2026-09-23 — one product, not a set of tools: frontend redesign (no backend change)

**Founder brief:** make GCC Mentor read as one career platform — profile → readiness →
job → CV → letter → interview — premium, light, mobile-first, credible. Frontend only:
no API, schema, prompt, scoring, payment or auth change.

**Decided and built:**
- **Meridian stays the identity.** It already met the brief (light, warm canvas, teal
  brand, one gold action). What was missing was a *product system* on top of it, now in
  `12_DESIGN_SYSTEM.md` §00, which also stops describing Blueprint as current.
- **One seven-step journey, one definition** (`components/journey/journeySteps.ts`),
  shown interactively on the landing page and with the user's progress on the dashboard.
- **The dashboard tracker follows one job** — the job the next-step panel names
  (`focusJob`, same sweep as `computeNextAction`, asserted in
  `scripts/verify-next-action.ts`). A first version counted steps done on *any* job and
  read "7 of 7 done" beside "write the cover letter for …".
- **Landing page rebuilt** around "one career profile, every Gulf application": product
  preview instead of an illustration, trust band, who it is for, eight problems each
  paired with its fix, the interactive journey, services grouped in three stages
  (each says what / why / you get), before→after in the review page's real colours,
  the grounding section, six GCC markets with a "not a recruitment agency" line, real
  template renders, interview prep, pricing, ten-question FAQ. The unused photo cards,
  the pain-point carousel and the orphaned `TemplateShowcase` were removed.
- **Pricing still prints no price.** It says what is free, what the application
  services are, and that checkout is not live — prices while services are open remain
  a founder decision (2026-09-15 entry).
- **Service pages share a header** (icon, journey step, outcome, "Built from") and end
  with a "What happens next" hand-off: letter → Q&A → mock → Library.
- **Optimizer:** one shared step header naming all three steps; each level is a card
  that lists what it changes before it is chosen.
- **Copy corrected to the confirm-to-add model:** "Nothing is invented — ever" and
  "get shortlisted more often" were removed; the promise is now "written from your
  Career Profile; anything new is highlighted and kept only if you confirm it".

**Defects found and fixed on the way:** the templates action bar stuck under the app
header (`top-0` → `top-16`); the Library stage strip overflowed phones by 8px each side
(`-mx-5` inside a 12px gutter); the public header's menu button was half off-screen at
320px; emoji icons in the usage strip; two leftover off-palette classes.

---

## 2026-09-17 (housekeeping) — no WhatsApp share, wider phone layout, per-CV service usage

- **The desktop sidebar scrolls again** (founder), reversing TASK-155's "no scroller of its
  own". That call assumed nine items always fit; with the planned group they do not on a short
  laptop screen or at a larger browser zoom, and the last entries could not be reached. The
  scrollbar appears only when the nav really is taller than the screen, is the thin variant,
  and `overscroll-contain` stops the page behind it from moving.
- **"Share to WhatsApp" removed** from the resume screen (founder). It was a `wa.me` link with
  no backend; nothing else used it.
- **Phone side gutter 20px → 12px** on page-level containers, landing page included. Cards,
  buttons and chips keep their own padding. See `12_DESIGN_SYSTEM.md`.
- **Totals across every CV** on the dashboard and at the top of the Resume Library
  ("Services you have used": CVs optimized · cover letters · Q&A sets · mock interviews),
  and one usage line per Library card. `GET /api/service-usage` counts the caller's own rows
  only and reads nothing but ids and event lists.
- **Each service card on a CV shows how often that service ran for THAT CV** — "Used 2
  times · last 16 Sep", and for the mock interview also how many reports were saved. Counted
  from the package's own service history (migration 048/050), which records one event per
  generation, so a regenerated Q&A set counts twice even though only the newest set is stored.

---

## 2026-09-17 (last) — levels reach their bands through a colourful review page

**Founder:** not happy with results for the Middle East market; each level (Easy, Moderate,
High) must reach its target by touching only the summary, skills and work history; after
optimizing, open one page where the user sees the optimized words in colour, edits them and
saves straight into the optimized result.

**Decided and built:**
- **Scope unchanged:** only summary, skills and work-history activities are touched.
- **More at each level.** Easy: rewording with proven job keywords only. Moderate: also up to
  10 suggested lines for must-have requirements. High: up to 16, for every requirement. Both
  also offer the job's missing **skills and tools** for the Skills section (no model call).
- **Review page** (`/optimize/preview/[id]`, where the build now lands): Professional
  summary, Skills and Work experience, each word coloured — green = reworded from the profile,
  blue = job description keyword, yellow = suggested, not in the profile. Everything is
  editable; the ATS score updates live against the level's target.
- **Yellow items start selected** so the target is visible at once. **Saving requires the
  user to tick "I confirm the yellow items I kept are true for me."** One save writes the
  edited CV and the kept/removed decisions into the optimized result. The Career Profile is
  not changed.

**Why this is not the fabrication that was declined earlier:** nothing reaches the saved CV
without the user seeing it highlighted as "not in your profile" and confirming it. The
responsibility is explicit. What stays refused: writing unconfirmed claims silently, and a
score that does not measure the document.

Visual check on the synthetic QA accountant (Moderate): 56 → 87 with all yellow items kept,
84 after unticking one; save blocked until confirmed.

**Live on the founder's latest I&C CV (9 roles, read-only), after three fixes found on the way:**
| Level | Before | After rewrite | All yellow kept | Target |
|---|---|---|---|---|
| Moderate | 49 | 52 | 76 | 75–85 |
| High | 49 | 52 | 87 | 85–95 |

Fixes: (1) suggestions ride on the smallest writing call (on the largest they pushed it past
its token budget: 4 roles lost their rewrite and every draft was lost); (2) drafted lines
whose role id the model shortened were all dropped — ids now resolve by unambiguous prefix,
and every drop is logged as a reason code; (3) a cached analysis with no evidence matches
re-runs the matching call when time allows. Moderate now fills with nice-to-haves after
must-haves (10), High up to 20.

**Still weak, stated plainly:** the rewrite alone moves this profile only +3; the gain comes
from lines the user confirms. The rewrite keeps failing the fact checks on several roles
(unsourced numbers, cross-role leaks), which is the next quality task.

---

## 2026-09-17 (late night) — every optimized CV shows its summary and ATS score; results as coloured cards

**Founder report:** after optimizing, the CV had no summary and no ATS score.

**Cause (diagnosed on the live package):** the job analysis (requirements + profile
evidence in one call) takes 90–125s on a nine-role profile with DeepSeek, because its
reasoning spends most of the token budget. Inside the build request it had 90s, so it failed
every time. No requirements meant no score, and the summary block could not be proven. The
profile had no summary of its own to fall back on, so the CV shipped with none.

**Decided and built:**
- **The analysis runs in its own request** (`POST /api/optimize {packageId, analyzeOnly}`),
  called by the build screen before the build, with a 280s budget. The build then finds it in
  the cache. Token budgets were raised (16k combined / 12k requirements-only).
- **A fallback analysis:** if the combined call is cut off or stalls, a requirements-only call
  (~50s) follows. Evidence then comes from code matching alone (stricter, never looser).
- **A summary can never be empty.** When the AI summary cannot be proven and the profile has
  none, code writes one from profile facts only: latest title and employer, years of
  experience, earlier employers, the job requirements the profile proves, and top skills.
- **Recovery for CVs saved without a score:** `POST /api/packages/[id]/ats-score` scores the
  saved CV before/after and fills an empty summary the same way. Nothing else changes.
- **Results as coloured cards** (`components/package/ResultsOverview.tsx`): Target job
  (teal), ATS score before → after (green, with "Calculate ATS score" when missing),
  Professional summary (purple), What changed (gold), and one tile each for cover letter,
  interview Q&A and mock interview. Score details and suggestions follow below.

**Live check on the founder's profile (read-only):** analysis 105s → 30 requirements; build
51 → 52 on High with 10 suggestions to confirm, and a 377-character fact summary.
**Still weak:** a +1 gain on High. The AI summary for this profile keeps failing the fact
check and its repair call stalled. That is a separate quality task.

---

## 2026-09-17 (night) — no score before optimizing; the target job travels with every document; one word per action

**Flow is now three plain steps.** (1) Target job: job title + job description only.
The target industry field left the screen (every industry already resolves to one
perspective). (2) Choose level: Easy / Moderate / High, with the parts to rewrite folded
under "Choose which parts to rewrite", all selected by default. (3) Optimize. The result
page leads with the target job, then the **ATS score before → after**, then suggestions,
then next steps.

**No ATS score before the build (founder decision).** The setup screen no longer calls
`/api/optimize/analyze`, shows no match report, no per-level projections and no
"do you have these?" tick boxes. The one analysis call moves into the build, so a finished
CV still costs 2 calls and a user who stops at step 2 costs 0. What was given up: confirming
missing skills *before* the build. Moderate/High suggestions on the result page ("Boost your
ATS score") and adding skills to the Career Profile then optimizing again cover it.
`components/optimizer/MatchPanel.tsx` was removed; `/api/optimize/analyze` and
`/api/optimize/confirm-skills` remain but no screen calls them.

**The target job is visible everywhere it is used.** The job title and job description were
already saved on each package and already fed to the cover letter, interview Q&A and mock
interview together with the saved (edited) CV. They are now also *shown*: a Target job card
(title, company, level, job description, ATS score before → after) on the result page, on
each Resume Library card ("View target job and ATS score", loaded on demand so the list stays
light), and on the cover letter, Q&A and mock interview screens with one line saying what
that service reads.

**One name per thing, one verb per action** (`lib/serviceLabels.ts`): Target job, Job
description, Optimized CV, ATS score, and the buttons Add target job · Optimize CV · View
optimized CV · Edit CV · Write cover letter · Prepare interview Q&A · Start mock interview.
These replace "Build the CV", "Build my Gulf CV", "Open workspace", "Edit text",
"Write the letter", "Generate Q&A", "Start mock" and "Job match score".

---

## 2026-09-17 (evening) — one optimizer for every individual, fewer calls, full editing

**Scope of AI rewriting:** only the career summary and the activities inside each role.
Employers, titles, dates, education, certifications and personal details are never
written by the AI.

**Levels aim for match bands:** Easy 60–75%, Moderate 75–85%, High 85–95%. The founder
first asked for the AI to invent content to reach the higher bands. That was declined
(it misleads the employer who reads the CV). Agreed instead: Moderate and High draft
**suggested lines** for missing requirements, and each one enters the resume only when
the user confirms it is true (or rewrites it in their own words).

**Fewer API calls.**
- Analysis (requirements + evidence) is one cached call.
- The build (summary + all roles + skill order + suggestions) is one call, two only above 7 roles.
- A repair is at most one call, only for blocks that cannot ship.
- The separate fact-check review is off by default (`OPTIMIZER_REVIEW=on` restores it).
- The match score was never a call.

A typical job is 2 calls, down from 6–12.

**Every field of a saved resume is editable, on that resume only.** This reverses the
2026-08-19 "summary and bullets only" rule. The Career Profile is never changed by a
resume edit, and all downstream services read the edited resume.

**Profession-neutral by construction.**
- Prompt examples now span professions.
- A requirement made only of broad business words ("Business Development") can be
  evidenced when every word is present, which was previously an MBA blind spot.
- The live evaluation adds MBA/marketing, electrical, HR, hospitality and fresher profiles.

## 2026-09-17 (later) — the I&C package that gained 1 point

**Founder asked for two things that are not built, and why.** (1) "Add the missing
keywords into the CV based on the level". Writing a requirement the candidate's profile
does not state is fabrication, which the grounding rule forbids (refuse-and-explain item
in [`16_WORKING_AGREEMENT.md`](16_WORKING_AGREEMENT.md) §3). (2) "Show at least +20 points
even if not". A score that does not measure the document is a false number shown to a
paying user. Both were declined, and the legitimate route to each was built instead.

**What was actually wrong with that package** (diagnosed from the live row):
- Most "missing" keywords were in the profile. Bracketed acronyms ("Distributed Control
  Systems (DCS)"), "&" abbreviations ("C&E", "F&G", "I&C") and "and"/"&" spelling never
  matched. Fixed in matching; stored analyses are corrected on read.
- Every role came back empty: the model answered under `"bullets"` without
  `"was_optimized"`, and the pipeline only accepted the exact key. Fixed by normalising key
  names (no text touched), ignoring blocks for roles a section did not ask for, resolving
  truncated ids, one retry after a provider stall (90s per section), and single-role
  recovery for roles still missing.
- A model bridge proved "year-end closing" from "6+ years … month-end close". Hyphenated
  compounds must now appear intact.

**The honest way to "add missing keywords": the user confirms them.** On the setup screen
every requirement not in the profile is a tick box ("do you have any of these?"). Ticked
ones are added to the Career Profile's skills (POST /api/optimize/confirm-skills, which
accepts only this job's own requirement terms), and the score is re-checked. From then on
they are the user's own stated facts and the CV may use them. **Easy** keeps them in the
skills section; **Moderate** and **High** also build the summary on them.

**The result card no longer leads with "Still missing".** Gaps sit in a collapsed "Want a
higher score?" panel that explains how to raise it.


**Resume optimization is rebuilt as an engine where code decides and the model
writes** (founder instruction: "perfect, high-quality, user-controlled output";
20–30% more model spend accepted). Full design: [`17_OPTIMIZER_ENGINE.md`](17_OPTIMIZER_ENGINE.md).

- **A match score is shown before anything is built, and again after.** It is
  computed in code on the rendered CV, never by a model, so it can move only when
  the document really changes. The profile-based Job Match could not do this:
  optimization changes none of its inputs.
- **The score shows an honest maximum** — what the user's real profile can reach.
  Gaps are listed and never written. Users are sent to their Career Profile to add
  anything genuinely missing, rather than having it implied.
- **Title-only builds get a score too, labelled "Role alignment · estimate".** The
  estimated requirements rank and score. They are never content, and they feed the
  validator's import check, so a "typical" term is a hard failure.
- **Equivalent wording is allowed only with proof.** A same-meaning bridge
  ("computerised maintenance management system" → "CMMS") must quote the candidate's
  own text verbatim, and it is allowed only in the role that contains the quote. This
  extends the validator with a per-location allow-list. It does not relax the
  grounding instruction, which is unchanged.
- **Generation runs in sections** (summary, and roles in threes, in parallel), with a
  quality gate, an independent fact-check review, and ONE targeted repair. A block
  that still cannot be proven keeps the candidate's own words, and the screens say so.
- **Levels are contracts** with measured coverage targets (easy ≥50%, moderate ≥80%,
  high 100% of supported employer terms). **High** may trim unrelated older roles to
  their 3 strongest bullets. The role itself is never removed.
- **The score never goes down.** If a build would lower it, the most harmful block
  reverts.
- **"Optimize nothing" is rejected** (open item B9), and edits are re-scored.
- **Analyses are cached per user and input for 30 days, service-role only**
  (`job_analyses`, migration 056), because they hold short quotes from the profile.
- **DeepSeek is a first-class provider** (`deepseek`), and the analysis and review steps
  have their own config keys, so each can run on a stronger model.

## 2026-09-16

**The optimizer is universal, and the prompt says so in its structure.** Five
labelled trust blocks replace four peer headings, so an employer's wish list can
no longer arrive with the same authority as the candidate's own history. The
four industry personas — which named Aramco, ADNOC and "Indian technology
professionals" — became one profession-neutral perspective whose authority is
stated as terminology and emphasis only. Old `target_industry` keys still
resolve, so existing packages are untouched.

**Two modes, derived from the job description, never stored.** A column would be
a second source of truth for something `packages.job_description` already answers
exactly. `target_title_only` is a real mode with its own instructions, not a
degraded JD mode: it may rank and emphasise existing facts, and may not invent
typical requirements or claim a vacancy match.

**Unsourced numbers are hard failures.** They were flagged, and flags ship.
Employment dates no longer count as source numbers — a role dated 2016 had been
legitimising "2016" as a quantity. The summary is validated for the first time;
it was previously checked only for being a string, and it is exactly where a
stated duration gets inflated.

**A failed block is no longer a failed resume.** Structural failures still
return an error because nothing trustworthy survives them. Content failures fall
back to that block's own original profile text, keeping every block that
validated. Unchanged source text beats both invention and a total failure.

**`claims` is no longer requested.** Free text, one entry per assertion, never
read or validated by anything, paid for in output tokens on the slowest call in
the product. Existing rows keep theirs (`claims?`). Real provenance is deferred:
a quotation proves a substring exists, not that the sentence built on it means
the same thing.

**The resume headline was blank on every delivered CV.** `buildResumeDocument`
read `profile.target_job_title`, a field the optimize flow never writes — the
per-application title lives on the package row. Confirmed on production, where
two packages held a real title, the profile held null, and both snapshots froze
`targetJobTitle: ''`. New builds take the package title as an explicit input;
existing snapshots get it at render time, the same trade the photo fix makes. No
database rewrite.

**Long skills were clipped in filled-sidebar templates.** A rail is 238px with
22px padding, so a chip has 194px, and `white-space: nowrap` meant a long skill
could not break and ran through the coloured edge. Measured after the fix in a
real layout engine: widest chip exactly 194px, zero elements breaching the edge,
across all three templates. The `nowrap` on date ranges is deliberate and kept.

## 2026-09-15 — Production hardening from the full SaaS audit

**Founder request:** implement the required fixes from the full SaaS audit
(`FULL_SAAS_AUDIT_2026-09-15.md`, by a separate reviewer) on a separate branch,
`claude/saas-production-hardening`, verify, and push — **no merge, no deploy, no
production migrations, no payments.** Item-by-item record with evidence:
[`SAAS_REMEDIATION_2026-09-15.md`](SAAS_REMEDIATION_2026-09-15.md).

Decisions made in that work, each changeable only by a conversation:

- **Next.js 15.5 (the patched security line), not 16.** Every critical and high advisory
  is fixed from 15.5.24; 16 would add a second major migration (middleware rename, lint
  removal) for no security gain. Next's own nested `postcss` is overridden to the patched
  8.5 line. `npm audit`: 0 vulnerabilities.
- **Quota state is server-owned.** A user may read their counters and never write them;
  every model call reserves a slot first (pending counts toward the limit), consumes it
  only when the result is saved and releases it on failure — the existing "a failure is
  not your fault" rule, now race-free. **Free services get limits too; payment is not the
  abuse control.** Defaults are abuse ceilings; the free plan is the founder's call.
- **Package rows: owner edits metadata only.** Generated content, the frozen document,
  letters, Q&A, interview runs, history and payment state are written by the server.
  Array columns change through single-row database functions, so concurrent tabs never
  erase each other's work. Service history stays user-facing; operational and security
  records live in their own tables.
- **A finished mock-interview report is final.** Practising again starts a new run. An
  answer, once saved, is not overwritten; early finish is allowed and says what was
  skipped.
- **Interview answers get a real number check** (review finding X01, not in the audit):
  a number must come from the profile, the saved CV, the advert or the user's own dates.
  Unsourced answers are dropped, never patched. The mock "better answer" may use only
  what the user typed and marks gaps as `[placeholders]`.
- **The saved CV is the primary source for the cover letter, Q&A and mock interview**;
  the Career Profile supplements it.
- **"Saved · not applied" is where a job starts** (product direction in the request). The
  application stage is separate from preparation progress; "rejected" (shown as "Not
  selected") and "withdrawn" added. Existing "applied" rows are not rewritten.
- **Lists load summaries; one job loads in full.** Search and stage filters run in the
  database so they reach jobs not yet on screen.
- **Profile save is one transaction with a stale-version check.** Callers that do not
  send a version keep last-write-wins, so the change can land without touching every
  caller.
- **Expired anonymous CVs are deleted nightly** by Vercel Cron, failing closed without
  `CRON_SECRET`; counts only in the run log. No production record was deleted.
- **Password recovery** on the existing email/password model; no OAuth added.
- **The landing page says only what is true:** the template count comes from the
  registry, the interview illustration shows the four text-report dimensions (no voice
  metrics), reports are called preparation feedback, not predictions. Prices were left
  as the founder set them — what to say about them while services are open is a founder
  decision.

**Not decided here, and listed for the founder:** legal text, retention periods and
account closure, password policy, allowances and budget, the legacy anonymous scan.

---

## 2026-09-12 — A guided-flow pass: every screen says what is true and points at the next step

**Founder request:** check every function step by step, as a SaaS designer would, so the
user feels guided and each service is easy to use — **presentation and flow only; backend
logic stays exactly as it is.** No route, API, schema, prompt, validation or permission
changed.

**Walked live on production with a throwaway account**, first visit to finished CV:
dashboard → paste a CV → Career Profile → target → setup → build → the finished resume.

- **The optimizer showed two waits, and the first described work that was not
  happening.** Setup's wait listed "Rewriting <employer> bullets" while its call only
  creates the job (and reads an advert, if pasted); the build screen then restarted at
  step one with four generic steps. Setup's wait now names what it does, and the user's
  own step list moves to the build screen — a display-only sessionStorage handoff keyed by
  package id (`OPTIMIZATION_BUILD_STEPS_KEY`).
- **The before/after diff was unreachable.** Generation lands on `/package/[id]` and
  nothing linked to `/optimize/preview/[id]`. The finished CV now carries **"See what
  changed"**, for model-written resumes only.
- **The Career Profile had no way forward.** Once saved — including the auto-save after a
  CV is read — its only exit was Save → dashboard. A **"Build a CV for a job"** card now
  calls the save-then-optimizer path that already existed (`onSubmit('confirm')`) and that
  nothing called.
- **Dead ends before a profile exists.** The dashboard's quick actions offered the
  optimizer and cover letter to a brand-new user, and the optimizer then failed on "Could
  not load your profile". Quick actions now offer only what works without a profile, and
  `/optimize/target` says the profile comes first, with a link to build it.
- **The cover letter lost its job.** "Write the cover letter for X" opened on the newest
  job, not X. `/cover-letter?package=<id>` now preselects, and the finished CV links there.
  **Copy put an empty string on the clipboard** for every letter loaded from the server
  (it read only this visit's edits) — fixed. The page now says edits in its boxes are not
  saved.
- **Resume Optimizer joined the mobile bottom bar**; the core action sat behind "More".
  Slots share the width, so five fit a 320px screen.
- **Step labels:** "Step 1 of 3" / "2 of 3" / "3 of 3" — target read "3/5" on a flow of three.
- **Copy that was no longer true, removed:** the build error's "Your payment is safe …
  without paying twice" (no payment step exists); landing Station 03 asking for country and
  employer (removed 2026-08-18); Station 04's "match report" (removed 2026-09-04); "next one
  takes a minute" (a timing claim); preview's "edits save as you make them" (each saves on
  its own Save); "package" and "Phase 2" in the reuse prompt, which now also says replacing
  removes the old CV's letters and stage.
- **Greetings no longer shout** "Good morning, RAJESH" when a CV header is in capitals.
  `displayFirstName` softens an all-caps first name for display only; stored data and the
  CV itself are untouched.

**Found and deliberately not changed** — each changes data or scoring, so each is in
[`14_OPEN_ITEMS.md`](14_OPEN_ITEMS.md) for a founder answer: auto-saved profiles print
"Visa not transferable" on the CV; Profile Strength scores two fields the optimizer
ignores; cover-letter edits are not stored; re-optimize deletes the old job outright.

**Profile recreation, tested live the same day** (founder follow-up), on a fresh account:
first build free and auto-saved (counter 2 of 2) → recreate with a CV holding a new job and
no phone → **Add** merged correctly (3 jobs, new skill and certification, phone kept,
reading cleared, counter 1 of 2) → recreate again → **Replace**. That last path, unverified
since 2026-09-11, is **safe**: nothing saved, the reading stays kept on the server, the
screen says "Phone number is required". Four presentation defects found and fixed:
- Replace never said the CV had no phone — the losses warning lists only fields a CV never
  states. It now says "This CV has no phone — you'll add it before the new profile is saved."
- The required-field scroll found nothing for the phone (`PhoneField` ids its input
  `f_phone_number`), so the error named a field the page never showed. It falls back now.
- After Add or Replace the URL kept `?import=paste`, so the panel reopened as an empty paste
  box asking for another CV. The deep link is cleared once a reading arrives.
- A transient 401 reached the screen as the bare word "Unauthorized". It now says what
  happened and that nothing counted. "We read your uploaded CV" also said "uploaded" of a
  pasted one.

**Not changed — needs a founder answer (open items W-5):** the recreation counted although
the Replace could not save, leaving the user 0 of 2.

---

## 2026-09-11 — The optimizer's 60-second cap was ours too

**Founder report:** building a CV with only a target position and industry — no job
description — processed for a while and then said it could not build; yet the Library
held the resume, marked not built, and opening it showed a CV.

**What happened, from production data.** The package was created (Phase A, 10:25 UTC) and
never received content, and no `/api/optimize` model call has been logged since
2026-08-20. The generation request was killed at `maxDuration = 60` before the model
finished, and Vercel's timeout page reached the screen, which could only show its generic
fallback. The Library was right — the CV was never built — and the "resume" on the job's
page is the profile rendered as a CV, which is what an unbuilt job shows.

**Why it bit now.** The reasoning model's think varies from run to run (extraction read the
same CV at 2,246 and 7,847 tokens), and a brief with no advert gives it more to decide.
45.5s of a 60s ceiling (2026-09-05) was always thin.

**Fix: the cap is removed**, as it was from the parse routes, where a 72.9-second read then
succeeded live — proof that on this project a route with no `maxDuration` is not held to
60 seconds. **The 2026-09-05 premise, "the Hobby plan, where 60s is a hard cap no setting
can raise", was wrong for this project**: the cap was this route's own setting. The Phase A
split it motivated stays; it is still faster. The provider's retry deadline is unchanged,
so a doubled-budget retry is st…20699 tokens truncated…none, and
none is guessed for it) and shows it as a small label once several styles exist in the
same list.

Surfaces updated: [`06_AI_PIPELINE.md`](06_AI_PIPELINE.md) (the per-service test-run
table), [`11_USER_JOURNEYS.md`](11_USER_JOURNEYS.md) §4 and the cover-letter row.

---

## 2026-08-18 — /optimize/target cut to one required field

**Founder decision: the resume optimization target screen should ask for as
little as possible before it lets a user start.** Migration 043 makes
`packages.target_industry` nullable (mirroring migration 030's
`target_country`, migration 042's `career_profiles.target_job_title` /
`target_industry`) — the last NOT NULL target field on the packages table.

**What changed on `/optimize/target`:**
- **Target country — removed from the screen entirely.** It never changed CV
  format or generation behaviour: `GULF_FORMAT_NOTE`
  (`lib/ai/buildOptimizationPrompt.ts`) has always been one country-agnostic
  Gulf writing convention (migration 030's own reasoning), and the field was
  never rendered on the resume itself. Asking for it bought nothing.
- **Target company — removed from the screen entirely.** It only ever changed
  the setup screen's CTA label ("Optimize for {company}"); never the writing.
  The CTA now names the target role instead.
- **Target industry — kept, made optional.** It genuinely drives which
  reviewer persona writes the resume (`lib/ai/personas.ts`), so it is not a
  no-op field like the two above — but `getPersona()` already had a graceful
  fallback (the generic Gulf-recruitment-specialist persona) for any unset or
  unrecognized value, so requiring the choice was never load-bearing. The
  select now opens on "No preference — general Gulf recruiter" rather than a
  disabled placeholder.
- **Job description — kept, still optional, still framed "Best results".**
  This is the one field with a clear, direct payoff (exact keyword and
  requirement matching), so it earns the emphasis without being required. Its
  disabled "upload the PDF" stub — never wired to any extraction route, since
  none exists or is speced for a JD PDF — is removed; paste was always the one
  real path.

**Only the target job title remains required.** `canContinue` on the screen,
and the DB constraint behind it, now agree on exactly one thing.

**Downstream, made null-safe in the same change:** `types/package.ts`
(`Package.target_industry: string | null`), both prompt builders
(`lib/ai/buildOptimizationPrompt.ts`, `lib/ai/buildCoverLetterPrompt.ts` —
`renderTarget()` omits the Industry line when unset, matching how Country and
Company were already handled), and `/api/optimize`'s validation (industry is
now optional/nullable, matching the existing country/company pattern). Cover
letters read `target_industry` straight off the package row, so this also
required their type to accept null — they already carry a fixed persona line
and never called `getPersona()`, so no behavioural change there beyond the
type.

Surfaces updated: [`11_USER_JOURNEYS.md`](11_USER_JOURNEYS.md) §4,
[`04_DATA_MODEL.md`](04_DATA_MODEL.md) §3.

---

## 2026-08-18 — resume import is inline on the profile; the Create Resume walk is retired

**The multi-screen "Create Resume" flow is gone.** Starting a resume used to walk
`/create-resume` (a chooser, inside the app shell) → `/onboarding/extracting` (a separate
screen, *outside* the shell, where the file was actually picked) → back to `/profile`.
Two problems the founder hit: it was two windows for one action, and the extraction
screen had two conflicting "back" affordances — its on-screen arrow went to the first-run
`/onboarding` flow while the browser back went to wherever you came from — so returning
"went to another page".

**Now it is one screen.** `components/profile/ResumeImport.tsx` does upload / paste / fill
inline on the Career Profile page, inside the shell. It calls the same parse endpoints
(`/api/parse/upload`, `/api/parse/text`) and hands the resulting draft to the page's
existing add-or-replace decision (`ingestDraft` → the same choice the sessionStorage
handoff already used), so re-importing over a real profile is still guarded — nothing is
overwritten silently. No navigation, so there is no inconsistent back button.

**What was rewired:** `/create-resume` is retired to a redirect to `/profile` (kept so old
links, the dashboard CTA and the onboarding fallback still land right). The dashboard
first-run CTA and the `ProfileKickstart` popup now deep-link to `/profile?import=upload`
(or `?import=paste`), which opens the matching panel on arrival. The onboarding fallback
sends returning users straight to `/profile`.

**Kept:** `/onboarding/extracting` still serves the **signup** auto-extraction
(`path=claimed`) — that path is automatic, in-flow, and not the confusing part. Its now
unreachable upload/paste collect stage is dormant, left in place to avoid touching the
critical signup path; a later trim is safe cleanup, not urgent.

Surfaces updated: [`11_USER_JOURNEYS.md`](11_USER_JOURNEYS.md) §3.

---

## 2026-08-18 — Gulf Readiness to the dashboard, Create Resume onto the profile

**Founder decision, two position swaps, no logic change.**

**1. Gulf Readiness moves from the profile editor to the dashboard.** The profile editor
showed two numbers — the completeness ring ("Profile Strength") and the arithmetic Gulf
Readiness market score. The Gulf Readiness card now renders on the dashboard instead,
next to Profile Strength. The founder chose to **show both** there (they measure different
things and are labelled as such), rather than replace one. The dashboard has no
sessionStorage handoff to carry the funnel scenario, so it is reconstructed from the saved
profile's readiness category via `answersFromReadinessCategory` — the four categories map
1:1 onto the four funnel scenarios, so the number is the same engine's output and works for
any signed-in user, not only those fresh from the scan.

**2. "Create Resume" leaves the nav; its three ways in move onto the Career Profile
page.** The sidebar/mobile "Create Resume" item is gone. The Career Profile page now opens
with a "start or update from a resume" row — upload · paste · fill manually — above the
user's data, so the profile is the single place a user both sees their information and
(re)builds it. This tightens the 2026-08-18 "one profile-build door" decision below rather
than reversing it: the `/create-resume` route still exists for the dashboard's first-run
CTA and the onboarding fallback, so those paths are unaffected — it is only removed from
the menu. Re-importing over an existing profile is safe: the editor's existing
add-or-replace step (it describes what a replace would lose) still governs, so nothing is
overwritten silently.

Surfaces updated: [`11_USER_JOURNEYS.md`](11_USER_JOURNEYS.md) §3,
[`12_DESIGN_SYSTEM.md`](12_DESIGN_SYSTEM.md) nav, and the "one engine, not two" open item.

---

## 2026-08-18 — signup reveals the full readiness report, before extraction

**The signup gate's promise is now kept.** The anonymous scorecard shows a subset behind
an honest gate whose CTA says "create a free account to unlock the full breakdown". Until
now nothing read that handoff after signup, so the full report was never actually shown —
only the profile was pre-filled. New route `/onboarding/report` re-renders the **same
computed result** the visitor already saw, now with `locked={false}`.

**Shown before extraction, deliberately.** The score is arithmetic and already computed,
so revealing it costs no AI call and no wait — the reward is instant. The ~20s profile
extraction follows on the CTA as the second payoff, not a barrier in front of the first.
This sequences with the 2026-08-18 "one free extraction at signup" decision below: report
first, then the auto-filled profile.

**The result rides across the browser only** (`claimed_readiness_result` in
sessionStorage, tab-scoped), consistent with the founder rule that an anonymous scan
writes nothing to the server. Unlike the other one-time handoff keys it is not cleared on
read — it is derived, non-sensitive, and leaving it lets a page refresh survive; it dies
with the tab. A user who reaches `/onboarding/report` with no handoff is already signed
in and is sent to the dashboard, never stranded.

Closes the "signup restore of the full report" open item. Detail in
[`11_USER_JOURNEYS.md`](11_USER_JOURNEYS.md) §2.

---

## 2026-08-18 — one route to the Career Profile, and a first-run nudge

**Founder decision: the Career Profile is the single, direct target for every user,
free or paid — one road to it, nothing else.** Everything (resume, readiness, cover
letter) is built from the profile, so the whole post-signup job is: get them to a
completed profile, then unlock the rest.

**What was built:**
- **A first-run pop-up** on the dashboard — dismissible, shown only when there is no
  profile yet. It leads with the three ways in — **Upload / Paste / Type** at the top,
  one click straight into the fill flow. Crossing it drops the user on the dashboard,
  where the same call to action persists. A nudge, never a wall.
- **One profile-build door.** `/create-resume` is the single route. `/onboarding`'s
  duplicate three-way chooser is retired — it now either auto-extracts a scanned resume
  (the handoff/claim path, kept) or redirects to `/create-resume`. `/ats-scan` (the old
  anonymous scanner) is retired and redirects to `/gulf-readiness-score`.
- **The free scan and the profile build are separate on purpose:** the scan
  (`/gulf-readiness-score`) is the anonymous lead-gen hook and only scores; the profile
  is built through the one door above. The confusion that prompted this was uploading on
  the scan and expecting a filled profile.

**Rate limit:** 5 profile extractions per day, per user — already in place
(`RATE_LIMIT_EXTRACTIONS_PER_DAY`, default 5), which is exactly the abuse cap the founder
asked for. It is cost control, not a paywall, so it applies to everyone now.

**The influence pattern, agreed:** pull users to the profile without forcing them —
(1) the dismissible first-run pop-up, (2) an honestly-empty dashboard with one bright CTA
if dismissed, (3) the other tools shown locked *on the profile* (not on payment) so they
read "complete your Career Profile first", and (4) a visible strength bar for momentum.

**Still to build:** layer (3) — locking Optimize / Cover Letter / Job Match behind the
profile's existence (honest gate, not a paywall, safe to enforce now). And the free
monthly limits (1 upload + 1 download/month) wire in with the paid locks.

---

## 2026-08-18 — pricing: one-time bundles now, recurring later

**Founder decision, revising the earlier "monthly recurring" assumption.** The paid
model is **one-time purchases**, not subscriptions — recurring billing is explicitly
deferred ("later we can think about monthly recurring").

**Free** — one resume download per calendar month (resets monthly), edit and save the
profile anytime, full visibility of the dashboard and the whole platform. The monthly
reset applies only to the free download cap.

**Paid — four one-time bundles:**
1. **Single resume** — one-time purchase
2. **Small package**
3. **Big package**
4. **Quarterly package** — for someone actively applying; one payment, ~3 months of access

**Why this keeps options open:** every bundle is a single payment, including the
quarterly one (time-bound access, not a recurring charge). So **no recurring-billing
provider is required**, which widens the payment-provider shortlist in §A1 of open items
rather than narrowing it. The quarterly bundle does need a time-bound access window
(purchase date + ~3 months), which is a small addition to the entitlement model.

**Supersedes** the "assumed monthly recurring" note in the earlier free/paid entry below.
The `service_packages` table already models named bundles with per-service quotas, so the
four bundles are rows in it; the quarterly access window is the one new concept.

---

## 2026-08-18 — the free/paid model, spelled out (spec; enforced when locks return)

**Founder decision.** The full freemium shape. Recorded now as the entitlement spec;
**not enforced yet** — the product is in the locks-off build phase and there is no
checkout, so hard gates would block everyone. It maps onto the existing
`plan_entitlements` table and is wired to real gates in the same pass that re-applies the
paid locks.

**Free user gets:**
- **One** GCC Readiness scan, ever — not repeatable (today the scan is IP-rate-limited;
  the per-account "once" limit is part of this spec).
- The auto-filled Career Profile (one free LLM extraction at signup) — editable by hand.
- **One template download per month** — choose a template, download the free resume,
  capped at once per calendar month.
- Everything else — AI optimization, ATS / Job Readiness, cover letter — **shown but
  frozen**: visible as locked tiles to motivate upgrading, never hidden, never a
  dead-looking control.

**Paid user gets:**
- **All options open.** Payment unlocks the full set of services.
- A **dashboard showing their package / bundle** — what they bought and what it includes.
- **Guided navigation** through the services.

**Assumed monthly and recurring** (consistent with the earlier monthly-plans decision):
paid opens everything while subscribed, and the free "one download per month" resets each
month. To be reconfirmed if the founder meant one-time-unlocks-forever.

**How it maps to what exists:** `plan_entitlements` already carries `free_allowed`,
`free_limit` and `free_value` per feature — one scan, one download/month, and which
features are frozen are exactly those columns. `lib/entitlements.ts` already reads them
and fails closed on paid features. The remaining work is the per-feature *gates* that
call it, plus the monthly-reset counter, plus the dashboard bundle view and the guided
nav — all in the re-apply-the-locks pass.

**The standing rule still holds:** the signup extraction and the GCC Readiness scan stay
free when the locks return; the gates go on optimization / ATS / cover letter and on the
download cap, not on reading the user's own resume or scoring it.

---

## 2026-08-18 — one free extraction at signup (Option B), paywall moves

**Founder decision, and it revises the tier split below.** The earlier plan was
free = type / paid = upload-and-extract. On reflection that was friction for no good
reason: after a free user has already given us their resume for the readiness scan, we
*have* their resume text — making them retype it by hand is a wall to lose them at.

**So: everyone gets one free LLM extraction at signup.** The first Career Profile build
auto-fills from the resume the visitor already scanned — the "wow" moment right after the
account is made. This is the same LLM extraction that was going to be paid.

**The paywall moves off extraction and onto the things that are genuinely the paid
product:** the AI resume optimization, the ATS / Job Readiness score, and the cover
letter. That is a cleaner line anyway — the paid product is the AI *rewrite* and the
job-specific analysis, not reading a document the user handed us.

**Why this is the right trade:** one extraction call is cheap next to losing a signed-up
user to manual typing, and an auto-filled profile is the strongest possible first
impression. It also corrects a misconception worth stating plainly: **arithmetic cannot
build the Career Profile.** The arithmetic engine only *scores*; turning a messy resume
into structured fields is the LLM's job and only the LLM's — which is exactly why the
old non-LLM extractor was thrown away for fabricating data.

**What stays free vs paid now:**

| Free | Paid |
|---|---|
| GCC Readiness scan (arithmetic) | AI resume optimization |
| One profile extraction at signup (LLM) | ATS / Job Readiness score |
| Typing / editing the profile | Cover letter |
| The free resume (own facts in a template), PDF download | |

**Open, not decided now:** whether a *later* re-upload / re-extraction (a second resume,
months on) is also free or is gated. Left for when it matters; the signup extraction is
the one that is settled as free.

**Built the same day:** the Scorecard handoff now routes straight into the existing
extraction screen (`/onboarding/extracting?path=claimed`), so a user who came through the
scan is auto-extracted and lands on a filled profile. Reused proven plumbing; the handoff
is cleared once consumed. **When the paid locks return, this signup extraction must stay
free** — the gate goes on optimization / ATS / cover letter, not here.

---

## 2026-08-18 — post-signup: build the Career Profile first, tier-based input

**Founder decision, all points confirmed.** After signup the first screen is **Build
your Career Profile**, and how the profile gets filled depends on the tier:

- **Free → type.** Manual entry, no LLM.
- **Paid → upload.** LLM extraction reads the resume and auto-fills the profile.

**This formally puts LLM extraction in the paid tier**, and it is an honest paywall:
extraction is a model call that costs money, so a free user does the typing themselves
and a paid user pays for us to do it for them. Not an arbitrary gate — one that reflects
a real cost.

**Three points settled with it:**

1. **Neither tier re-uploads.** The Gulf Readiness Scorecard already captured the resume
   *text* into the browser handoff. A free (type) user sees that text beside the form to
   copy from — never a blank page. A paid user's extraction runs on that same text. The
   handoff is what makes this work; the resume is given once.

2. **GCC Readiness updates live as the profile is built, and the score is allowed to
   rise.** It is arithmetic, so it recomputes instantly as fields fill. The framing is
   **"your score improves as you complete your profile"** — not "fixed after signup." The
   reproducibility promise still holds for *identical* inputs; more profile data
   legitimately means a higher number, and that is honest because the user can see why.

3. **One scoring engine, not two.** The live profile-based readiness runs the **same
   arithmetic engine** as the anonymous scorecard, fed from the structured profile once it
   exists rather than from raw text. Two different engines would make the number jump for
   a reason the user cannot see; the same engine keeps the pre- and post-signup scores
   consistent.

**Still to come:** the founder has a further piece to discuss after this. Not yet
designed. Build happens next session.

---

## 2026-08-18 — two scores, two tiers: readiness is free, ATS is paid

**Founder decision.** The product has two different scores and they sit in different
tiers:

| | **GCC Readiness** | **ATS Score / Job Readiness** |
|---|---|---|
| Question | Ready for the Gulf market in general? | Ready for *this specific job*? |
| Method | Arithmetic, no LLM | **LLM** — costs real tokens |
| Input | Resume + funnel answers | Resume + a job description, or **job title + industry** when no JD |
| Tier | **Free, anonymous** | **Paid plan** — not free, not anonymous |

The logic is honest: the free score is free *because* it costs nothing to run; the
score that spends tokens is the one that is charged for.

**The contradiction this closes.** Today the anonymous `/ats-scan` fires LLM calls —
extraction, JD structuring, job-match explanation — for a logged-out visitor whenever a
job description is pasted. That is exactly the free-LLM giveaway this decision forbids.
The free anonymous path is now **only** the arithmetic GCC Readiness Scorecard; the
LLM job-readiness score moves behind the paid plan and requires an account.

**"Paid" is inert until there is a checkout.** Razorpay KYC is still blocked, so a
paid-only gate means the *only* way to run ATS — including for the founder's own
testing — is an admin credit or a promo code, exactly like resume optimization. This is
consistent with the whole product once the locks return; it just means ATS is not
self-serve until the payment-provider decision (§A1 of open items) is made. The founder
chose "paid plan" over "signed-in, open during the build" with that understood.

**A build note carried by this decision:** the current Job Match engine *requires* a job
description (it structures the JD first). ATS must also run on **job title + industry
alone** when no JD is given — a new, smaller input path to add.

**Not built in this decision — recorded for the next step:** gating ATS behind the paid
plan (with admin/promo unlock), adding the title+industry fallback, and retiring or
repurposing the old anonymous `/ats-scan` free path.

---

## 2026-08-17 — the Gulf Readiness Scorecard is fully arithmetic

**Founder decision, final: the entire readiness engine — score, scenario, strengths,
gaps, recommendations, ranking — is arithmetic. No LLM call anywhere in it.**

This is better than the LLM version, not a compromise:
- **Reproducible.** The same resume always scores the same. An LLM scorer once returned
  78 then 45 for one CV, which is why the score is deterministic in the first place.
- **Free and instant.** No token cost, sub-second, safe as the top of the funnel.
- **Cannot fabricate.** A scorer that never writes prose cannot break the grounding rule.
  It awards points only for evidence it actually finds.
- **The anonymous score and the signed-in detailed score are identical**, because the
  same pure function runs on the same inputs. The number never changes after signup —
  exactly when it must not.

**One engine, two views.** `lib/gulfReadiness/` takes funnel answers + resume text and
returns the complete result. Anonymous shows a subset (score, scenario, band, top three
strengths and gaps, one or two recommendations); after signup the *same object* is shown
in full. The signed-in report is the anonymous result unblurred — nothing is recomputed.

**The scoring model.** Six dimensions per scenario, each with a max, summing to 100. The
situation is a **visible dimension** — "Gulf Market Position" — auto-filled from the
funnel answer rather than a modifier bolted on and clamped:

| Situation | Gulf Market Position (its max, auto-filled) |
|---|---|
| Currently in Gulf | 15 |
| Returner | 8 |
| Domestic experienced | 5 |
| Fresher | 0 (dimension not shown) |

Its max varies by scenario and it fills to its max, so **every scenario can still reach
100** — a fresher's 100 comes entirely from education, projects and skills, so they are
never structurally capped or punished for a situation they cannot change. A stronger
situation simply means fewer points must come from the resume, which is honest: being
in-market *is* an advantage. This resolves the founder's "+3/+3 makes a difference" as a
real, explainable line item, with no clamping.

**Evidence is heuristic, and honest about it.** The resume dimensions are scored by
rule-based detection on the text — quantified achievements (numbers in bullets),
certifications, education, skills, contact completeness, availability signals. Each
dimension returns `{ score, max, evidence[], gaps[], confidence }`. Where detection is
weak the **confidence drops and the report says so** — never a false zero presented as
fact.

**Band messages, and every band routes honestly to optimization** (founder design). The
point is that each band has a *real* reason to optimise, so the nudge is never invented:

| Score | Direction |
|---|---|
| Under 50 | Not Gulf-ready yet — start by optimising the resume |
| 50–74 | Good foundation, close — an optimised resume gets you application-ready |
| 75+ | Ready to apply — now tailor an optimised resume to each specific job to get shortlisted |

**Messages are scenario-aware, not only score-aware** — 3 bands × 4 scenarios = 12 short
messages in config, tunable (and admin-editable later, like prompts). A fresher at 45 and
a returner at 45 hear different things.

⚠ **Honesty guardrail: readiness to *apply*, never a hiring probability.** No band ever
says or implies "you will get the job." This is the one place it would be tempting to
cross the line the whole product holds.

**Carry into signup: browser-held, no server record while anonymous** (founder delegated
the choice). The result object plus funnel answers plus resume text sit in `sessionStorage`
through the signup redirect; on account creation they are persisted to the new user and
the temp state is cleared. Abandon signup and nothing is stored server-side, ever. This
gives the strongest honest trust line — "we don't save your resume unless you sign up" —
and a reliable same-tab handoff. **Tradeoff:** close the tab or switch device before
signup and it is lost; the user re-runs. The existing `anonymous_analysis_sessions` table
is left in place (not deleted without instruction) and simply not used by this flow; it
can be retired deliberately later.

**The LLM extraction still exists, separately.** Building the editable Career Profile
after signup uses the existing extraction call — a different job (populating real fields
for later optimization). Readiness itself never calls it.

**Deliberately not in this build:** SEO pages, the score-improvement simulator, and any
country matching — per the founder's own sequencing. `gcc_country` and other country
columns are **not** removed; only the funnel omits the question.

---

## 2026-08-17 — Stage 1 funnel: ask the user, do not infer

**Founder design, approved and agreed.** The anonymous entry point becomes: a
"Check your GCC Readiness" call to action on the landing page → a window opens →
upload or paste a resume → then two or three short questions → the score.

```
Gulf experience?  →  YES  →  In the Gulf right now?  →  YES → currently_in_gulf
                                                     →  NO  → returner
                  →  NO   →  Years of domestic exp?  →  0   → fresher
                                                     →  1+  → experienced
```

**Why this matters more than it looks: it fixes the product's worst live defect at
the source.** Job Match scores GCC experience as **zero on every anonymous scan**,
because the only field it counts is set by a dropdown an anonymous visitor has never
seen. Asking the user directly replaces a fragile inference from resume text with a
fact the user states — so the grounding rule is intact, and there is no parsing to
get wrong.

**The four categories already exist and already score differently.**
`lib/readiness.ts` derives fresher / experienced / returner / currently_in_gulf and
carries separate weight tables for each, every one asserted to sum to 100. None of
it was reachable anonymously because nothing asked. The funnel is the missing input,
not new scoring logic.

**"In the Gulf right now" is worth the extra tap** — the founder's two questions give
two buckets, this third gives all four. A returner and someone already in-country are
genuinely different to a Gulf employer: one needs relocation and a new visa, the
other has a transferable visa and can start next month. The existing weights already
reflect that.

**No country question. Founder decision, final.** Not which Gulf country, not
country of experience. It follows that `gcc_country` on work experience becomes
redundant as a scoring input — it exists only for this purpose and is the field
behind the zero defect. Whether the country columns are removed from the product
entirely is a separate, unanswered question; **no column is dropped without an
explicit instruction.**

**Self-declared answers are scoring input, never resume content.** If someone states
ten years of Gulf experience and their CV shows none, we **trust them for scoring** —
it is their claim about their own life, and a badly written CV is exactly why we ask.
But that number must **never** become a bullet or a summary line unless the resume
supports it. Scoring input and generated content are different things, and blurring
them is how the grounding rule gets broken by accident rather than on purpose. To be
enforced in code, not by convention.

**Order:** upload first, questions second. The file is the commitment; someone who
has already uploaded will answer two more taps. Answers are stored on the anonymous
scan session alongside the resume text, so they carry into signup and pre-fill the
profile — the user never answers twice.

---

## 2026-08-17 — the build plan, agreed

**Core product first, commerce afterwards.** Founder's decision, stated twice and
locked here: get **every service working individually** — on the Career Profile as the
only fact source, and on our own prompts — and only then decide payment, bundles,
pricing and free/paid control. "First our target to build our core product, clean and
workable; later we will do these extra work."

**The eight services.** Six exist and now run unlocked: GCC Readiness, the ATS/GCC scan,
Job Match, resume optimization, cover letter, downloads. **Two are genuine builds from
zero: Interview Q&A and Mock Interview** — they have config rows and nothing else. They
move from "planned, accommodated" to "to be built" as a result of this decision.

**Plans will be monthly subscriptions.** Recorded now, deliberately **not built** now.
It changes nothing about the core build, but it constrains exactly one later decision:
**the payment provider must support recurring billing**, which narrows the shortlist.
Note it before choosing a provider, not after. What exists today (bundles of one-time
credits that never expire) is not a subscription and would need expiry, renewal and
reset to become one.

**Bundles and metering are deferred, and mostly already exist.** The admin screen for
building a package, per-service quotas, atomic granting and atomic consumption are all
built. Almost nothing consumes them. When metering is switched on it goes through **one
wrapper — spend a credit for service X, only after a validated success, never on
failure** — not per-route, because eight routes is eight chances to forget, and this
project has been burned that way twice. **Free readiness scanning stays unmetered**: it
is arithmetic, costs nothing to run, and is the top of the funnel.

### Prompt control — draft then publish

Founder wants to change and optimise prompts himself, with versions and testing, from
the admin panel. Approved, with a floor.

**What was found on checking:** prompt control is roughly 5% built, and what exists is
inert — `LIVE_PROMPT_TEMPLATE_KEYS` is an empty array, so **no AI call reads any prompt
template today**. Storage is one row per key, edited in place: no version, no history,
no rollback.

**The floor, which is not negotiable.** A prompt has three parts and they are not
equally editable:
- **Editable:** persona, tone, task instructions, emphasis, examples — where quality lives.
- **Never editable:** the grounding block. A bad edit silently turns off the product's
  one promise and nothing downstream would catch it. It is injected by the control layer
  from one constant, which already makes this true by construction.
- **Never editable:** the output schema. The parser and the validator depend on it.

**Versioning:** never edit in place. A new version each time; exactly one active per
prompt; publishing is a flip and rollback is a flip back; nothing is deleted.
**Every generation records which prompt version produced it** — that is the whole point:
without it, when quality moves you cannot tell whether it was the prompt, the model or
the input.

**Versioning comes before tuning the services**, not after. Tuning first would mean
tuning with no record of what changed.

**Testing:** draft against active, same input, same model, side by side — and **run
against saved fixture profiles, never real users' data**, because admin access to real
profiles is audited for a reason. **The grounding validator runs on test output too**,
so a draft can be seen failing grounding before it is published. That is what makes
handing over the controls safe.

### Two guards to hold while services are built

1. **User data is data, never instructions.** Profile facts are mapped into every
   prompt — but a user can type "ignore previous instructions" into their professional
   summary. Facts go in a delimited block the model is told is data, never merged into
   the instruction text. Cheap now, ugly to retrofit across eight services.
2. **Deterministic logic stays in code, not in prompts.** As prompts become editable
   there will be a pull to move scoring rules into prompt text where they are easier to
   tweak. That is how the readiness score once returned 78 and then 45 for the same
   resume.

### LLM configuration — checked against the code

Founder's belief that per-service provider/model/key with fallback is already built is
**correct, and it is genuinely wired** — all ten call sites pass their own service key,
so a model changed in the admin panel really does change that service. Saving replaces
the previous values.

**One part of the described behaviour does not exist.** The `default` row is a
*configuration* fallback — used when a service has no row of its own — **not a runtime
one**. If a service's primary and its fallback both fail mid-call, the request throws;
the default provider is never tried. **A third runtime tier will be added**, with the
guard that it skips the default when it is the same provider and model already tried,
so a broken call does not pay twice for the identical failure.

**Two smaller fixes with it:** fallback only activates when provider, model *and* key
are all set — setting only a fallback model silently does nothing, and the screen must
say so. And two live, money-spending calls (`job_description`, `job_match_explanation`)
appear only under "other overrides" rather than as named cards; they become first-class.

**The service list is collapsed to one place.** It currently lives in three — the admin
screen, the provider config and the control-layer registry. One list means adding a
service is one edit, and it removes the silent-typo class of bug that the bundle screen
warns about on its own face.

### The order

1. Prompt registry, versioning, draft/publish/rollback, version stamped on every generation
2. The LLM-config fixes above, same run — same control panel, all small
3. Services onto the control layer, one at a time, tuning prompts with history
4. The prompt test bench, once there are two or three services to compare
5. Q&A and Mock Interview, built from zero
6. Then commerce: provider, bundles, monthly, free/paid

**Before step 3, each service needs a definition of "working"** — a handful of real
fixture profiles and what a good result looks like. Otherwise "make all services work"
has no finish line. It is the same fixture set the test bench uses, so it is not extra
work, only earlier work.

---

## 2026-08-17 — later the same day

**Every paid lock is removed. All services are open.** Founder decision, taken after
hearing the alternative and the costs.

**The plan:** build the whole pipeline first — readiness, ATS/GCC scoring, job checking,
resume optimization, cover letter, downloads, and the two that do not exist yet (Q&A and
mock interview) — one service at a time, getting the prompting and LLM control right,
**then** apply the paid locks over a finished machine.

**What was removed:** the payment check before generation, the `is_paid` gate on the PDF,
Word and cover-letter routes, the cover-letter credit requirement, and the page-level
redirects that sent an unpaid resume to the payment screen. `lib/packageAccess.ts` is
deleted; the labelling half survives as `lib/resumeKind.ts`, which explicitly grants
nothing.

**What was deliberately kept:** the `is_paid` and `tier` **columns** (dropping them is a
destructive schema change, and the locks are coming back), the admin promo-code and credit
tools (they unlock things — they never blocked anyone), the daily rate limit on generation,
and the payment screen itself, now a pass-through that forwards rather than a dead end.

**No credit is consumed anywhere while the locks are off.** Spending an admin-granted
credit on work that is free anyway would silently burn something the founder issued, and
the ledger would record it as having paid for the run.

**The alternative was offered and declined.** A single unlock switch would have kept the
gate code intact and made re-locking a one-line change. The founder chose outright deletion.
Three consequences, accepted knowingly:

1. **Re-applying the locks is a rebuild**, including the 18 assertions that proved the gate
   failed closed on every malformed input.
2. **The invariant is being broken on purpose.** The gate rested on "AI content cannot
   exist without payment". Rows will now exist with content and `is_paid = false`, which is
   exactly the shape the old gate refused. **Whoever re-applies the lock must handle those
   rows** rather than assume they cannot exist — purge them, or mark them.
3. **Payment was one of two limits on model spend.** The other, a daily per-user rate limit
   on generation, is still in force — so this is not an open tap, but the remaining limit is
   now the only one and its value is worth reviewing.

**Nothing was marked paid to make things work.** `is_paid` stays false on new rows. Writing
`true` would have been simpler and would have kept several UI filters working untouched, but
it would put a false fact in the database and every row from this phase would later read as a
completed purchase. The UI filters were changed instead.

**First build target: the LLM control layer**, chosen by the founder ahead of any individual
service — one module owning model choice, prompt assembly, token budget, retries, structured
output, mandatory grounding validation, cost logging and failure diagnostics. Doing it first
means the seven services plug into it rather than being retrofitted afterwards.

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


## 2026-09-26 — Recorded voice interview test branch

Founder authorized a separate GitHub implementation for later testing and integration. Voice answers replace typed input for new enabled sessions; illustrated TTS interviewer, deferred STT/coaching only on explicit review, private recordings and comparable resume history. No live avatar provider. Confidence/emotion are not inferred from voice. Existing text history remains. Production migration, credentials, scheduler and real-device/provider verification are pending. See [implementation and test guide](RECORDED_VOICE_INTERVIEW.md).


## 2026-09-26 — Silent interviewer and shared database authorization

Founder requested on-screen questions with gentle avatar movement, deferring question TTS. Candidates still record voice; deferred STT/coaching remains. Founder explicitly authorized the existing database. Applied the additive recorded-voice migration to the existing Supabase project and verified RLS/grants/private bucket. Main website code remains unchanged; Vercel preview environment settings and transcription key remain required.


## 2026-10-01 — Resume parsing v2: same model, thinking off, layout-aware, checked

Founder asked for CV reading that handles messy real-world CVs (tables, columns, scattered data) in seconds, staying on DeepSeek. Decisions: keep deepseek-v4-flash; switch its thinking off for extraction and prefer the fastest OpenRouter hosts (measured 6.7s vs 47s for the same call); read files layout-aware (Word table rows, PDF columns, Word headers/footers); let code handle dates, contact details and labelled personal fields; verify the model's answer against the CV text and re-read once only when a job is missing. No real CVs were scraped (privacy, site terms): a generated test set of 104 fake-person CVs in 14 layouts scores every field. Result 55% → 99% of CVs fully right, median model wait 26s → 4.8s. Correction-tracking ("learn from user edits") deliberately NOT shipped: a first profile auto-saves before the user edits, so the comparison would always read zero — needs its own design. Migration 059 (report column) applied. See [06_AI_PIPELINE.md](06_AI_PIPELINE.md) §5.


## 2026-10-01 — Gulf Readiness v2: one verdict, photo points, paperwork must-haves

Founder asked for Gulf Readiness to match the real market, with photo points, a clear ready/not-ready answer and a guided path. Checked current requirements (professional photo customary on Gulf CVs; Saudi QVP/SVP verification enforced for most work visas; UAE skilled permits need attested degrees; health licences per regulator; SCE for engineers in Saudi). Decided (founder chose all three recommendations): photo up to 6 points — 0 none, 2 hidden, 4 shown, 6 with the user's professional-photo checklist (code cannot judge a photo); ONE verdict (Ready / Almost / Not ready) with the score, profile completeness demoted to a progress line; optional paperwork answers (migration 060, applied) that drive must-haves. New 20-point Gulf CV Essentials dimension scores availability and visa by quality, not mention. Fairness rule kept and tested: which nationality/age/gender/marital status/religion is never scored. Also fixed: the profile page's readiness ignored nationality/visa/notice/location while the dashboard used them. Not done: the anonymous funnel does not ask paperwork questions — it shows them as "not checked yet" and points to the free profile. See [09_SCORING.md](09_SCORING.md) §1 "Gulf Readiness v2".


## 2026-10-08 — Profile-only career preparation in the shared Library

Founder requested the Career Profile Resume in the same card grid as optimized
resumes, with the Career Profile icon and CV/Letter/Q&A/Mock navigation. Optional
AI services are now authorized for this source. The CV itself remains unoptimized,
with no independent content editor or snapshot; only Career Profile saves its facts.
The professional field is the saved profile title or latest recorded role, never
the resume's custom label. No vacancy, company, JD or ATS gaps are inferred.
Existing optimized prompt output, snapshots, saves and usage rules are preserved.
Use the existing raw package and service-artifact fields; no database migration.
**See your resume** on Career Profile opens the existing package Design screen,
where the user's own resume is visible with all 50 templates and saved styling,
rather than the global gallery's sample CV. Unsaved profile drafts are not saved by
this navigation; the button explicitly says it uses the latest saved profile.


## 2026-10-08 — Premium Inter typography, approved by the founder

Founder approved the reviewed typography proposal for the existing website and
application: Inter UI text; 32/38/42px marketing headlines, 24/28/32px marketing
section titles, 26/28/30px app page titles, 18/20px card titles, 16px body text
and buttons, 14px labels/help, 12px metadata. Use 400/500/600/700 for body,
labels, cards/actions and principal headings respectively. This replaces the
2026-10-06 compact system-font direction. Keep wording, layouts, colors,
navigation, data and all service behavior unchanged. Browser zoom remains
supported through rem sizes. Fonts are served locally by Next's font loader.

Resume documents, exports and landing resume thumbnails keep their authored
font families, sizes and weights. Typography compatibility rules must explicitly
exclude those boundaries. No database, AI, credits or pricing changes.
See [12_DESIGN_SYSTEM.md](12_DESIGN_SYSTEM.md) for the current roles.


## 2026-10-08 — Save preview changes before PDF download

Founder requested one explicit save step for resume preview changes. Template,
style and resume-name changes stay local until **Save changes** succeeds through
the existing metadata PATCH. PDF download is disabled while changes are unsaved
or saving; failed saves keep it disabled. Undo restores saved preferences.
Gallery template previews follow the same rule. Profile photos still save
immediately to Career Profile; downloads wait for an active upload to finish.
Content editing stays in the existing editor (Career Profile for raw resumes),
with existing validated saves and optimized snapshots preserved. No API, schema,
AI, credit or export-renderer changes.

## 2026-10-09 — Personalized LinkedIn preparation

Founder approved a complete LinkedIn Optimization service in the existing page:
Career Profile-only, optional LinkedIn PDF/DOCX comparison, or pasted profile
text. Imported details require confirmation and explicit decisions for identity,
role and date differences. Saved Career Profile supplies career facts; imports
never overwrite it. Target roles/JDs and extra instructions supply direction,
not evidence of qualifications or achievements.

Generation uses the common AI task runner with a discipline/seniority-specific
advisor persona, deterministic grounding and a separate semantic fact-check.
There are no invented advisor credentials, client counts, hiring uplift claims,
or LinkedIn account connections. Three headline choices, About, selected role
descriptions, saved skills and tailored advice form one private editable draft.
Users copy the content themselves and confirm checklist completion. The preview
is an illustrative profile view, not a live LinkedIn account.

Migration 067 adds one owner-readable LinkedIn draft per user and an independent
admin-controlled abuse ceiling (5 successful generations/day by default). Writes
are validated, ownership-scoped service routes with optimistic revisions. Resume
packages, Career Profile saves, payment/credits and existing AI prompts remain
unchanged. See [19_LINKEDIN_OPTIMIZATION.md](19_LINKEDIN_OPTIMIZATION.md).

## 2026-10-22 — 14 Career Profile blocks
Approved by Satish: implement CAREER_PROFILE_BLOCKS.md before further scoring/questionnaire work. Reuse current storage and custom categories; optional sections must not become compulsory. Separate client/employer/project and preserve uncertain facts. Single Gulf Profile Readiness is future agreed direction, not a finalized numeric rubric.

## 23 October 2026 — VISUAL-010
Founder authorizes ten additional premium visual resume designs only, on a dedicated feature branch pending approval. Reuse existing engine, data, customization and export paths. Use supported descriptions/recommendedFor metadata to identify direct recruiter sharing/reference and recommend ATS-friendly layouts for online portals. No main merge or production deploy. Existing template IDs/designs and sample candidate facts are protected.

## 24 October 2026 — approved Clear Path rollout
Satish authorized autonomous internal UI implementation, testing, protected merge and live verification. Preserve landing, templates/exports and backend. No separate preview publication. Contract: CLEAR_PATH_ROLLOUT.md.


24 October 2026 — Satish explicitly requested fixing the dependency audit blocker. Compatible browser dependency updates and export regression verification are authorized; retain required checks and existing release scope.

24 October 2026 — CTA-ALIGN-001: founder authorizes shared CTA sizing/alignment and consistent WhatsApp choices, visual-only; existing app logic and document styling protected.

24 October 2026 — Career Studio reconstruction and release explicitly authorized by Satish (“So do it”). Approved selected visual remains unchanged. Reconstruct readable typed frontend source, preserve business/document behavior, pass visual and required checks before main merge/Vercel release.


24 October 2026 — REVIEW-DEFER-001: Satish requests red resume-import issues and a red warning after acknowledgement/Create Profile, with explicit skip/create and later completion. Missing essential facts become completeness warnings rather than forced invented answers. Malformed supplied values remain separately actionable. No design rollback requested in this task.


25 October 2026 — Satish authorized fixing the resume-confirmation category metadata save failure. Normalize category-level metadata consistently before save, preserve candidate facts/private visibility, and retain strict API validation; no schema or unrelated changes.


25 October2026 — WHITE-WORKSPACE-001 approved: white background/no-blue comprehensive presentation refresh, concise copy and aligned mobile/desktop controls. Expert design decisions and main release authorized; backend/auth/scoring/prompts/templates protected. Specification: WHITE_WORKSPACE_2026-10-25.md. Implementation and verification pending.


25 October 2026 — Satish approves SkillDrift-inspired Inter/soft-indigo/lavender/near-white UI and rounded controls across GCC Mentor, superseding the earlier emerald/no-blue presentation. Preserve service logic, authentication and resume/template output. See SOFT_INDIGO_2026-10-25.md.


25 October 2026 — SINGLE-EDITOR-001: Satish approves single Career Profile edit location. Consolidate manual/section/import editing, photo and resume visibility inside one editor; other surfaces link there. Preserve merge/replace review, optional data deferral, existing APIs and job-specific resume independence.


26 October 2026 — Satish approves CSS-CLEANUP-001: remove unused/obsolete competing CSS and retain the currently rendered design. This does not authorize a redesign or service/document changes.

## 26 October 2026 — Compact shared brand presentation
Satish requests smaller readable typography and CTAs, consistent colour and alignment throughout the landing and internal platform. COMPACT-BRAND-001 refines the current indigo system: one palette owner, white/slate reading surfaces, compact type and spacing, 44px touch targets. Input text remains16px; document typography and service logic remain protected. See COMPACT_BRAND_2026-10-26.md. Approved, not yet implemented.


26 October 2026 — SKILLPILOT-BRAND-001 approved: Satish requests SkillPilot-inspired typography, headers, cards, visuals, alignment and navy/blue/cyan colors across GCC Mentor. Preserve service behavior and resume outputs. Specification: SKILLPILOT_BRAND_2026-10-26.md. Implementation and verification pending.


26 October 2026 — SKILLPILOT-BRAND-001 presentation code implemented on temporary review branch `codex/skillpilot-brand-001` because main requires checks. Shared design tokens, typography accents and cross-page surfaces updated; preview and visual verification pending. No logic or resume-template changes are intended.
# 26 October 2026 — PERSONAL-HOME-002
Satish requests the attached dashboard layout matched to GCC Mentor's current theme. Personal header, compact readiness/activity, interview performance/quick actions, events, pipeline and documents; actual saved data only. Preserve navigation, next-action priority, scoring, services and authored resume output. Specification: PERSONAL_DASHBOARD_2026-10-26.md.

27 October2026 — Satish approves a first-resume dashboard popup for new users with Upload/Paste/Type choices, and correction of unintended white UI backgrounds throughout the current navy theme. Keep the canonical profile/import flows, pending resume review, authored paper previews and all backend/service logic. FIRST_RESUME_ONBOARDING_2026-10-27.md and THEME_SURFACE_AUDIT_2026-10-27.md own acceptance.

27 October 2026 — Satish authorized CONTROL-CONTRAST-001: current navy theme for app controls in every interaction state, preserving white document paper and all service logic.

27 October 2026 — Satish authorized RESUME-REVIEW-001 visual review/acceptance before profile creation. Existing AI and all business logic remain unchanged; unavailable scores/suggestions must be labelled honestly.
