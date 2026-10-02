# Optimizer v3 — test lab results (2026-10-02)

**Status: tested, NOT wired into `/api/optimize`.** The founder asked to test the
approved prompts on many kinds of CVs before deciding the next step.

## What v3 is

Founder-approved design (2026-10-02 conversation):

- **Only work data goes to the AI**: summary, jobs (title, employer, dates, location,
  bullets), skills, certifications, education. Never name, contact, nationality, date
  of birth, passport, visa or target country. One prompt for all Gulf countries.
- **Specialist persona from the user's own target title** ("senior recruiter and CV
  specialist for {title} roles in the Gulf job market").
- **Analysis call** (`lib/optimizer/v3/prompts.ts` ANALYSIS_SYSTEM): short ATS keywords,
  field match (same / related / different), every requirement in group
  **A** (shown) · **B** (same field, a related duty is shown — equipment, duties, soft
  skills) · **C** (not shown; always certificates, licences, education, years, named
  software and standards, other fields). Code re-checks every group
  (`lib/optimizer/v3/engine.ts` analyzeV3): literal matches, relevant quotes, years from
  dates, languages never assumed, soft skills -> summary.
- **Writing call**: Easy rewords only; **Moderate (default)** adds a new point per
  must-have B; High rewrites everything in the job's vocabulary and adds every B.
  Certificates, education, companies, titles, dates and personal details are never in
  the output. Every group-A keyword must appear in the job's exact spelling.
- **Checks**: the production truth checker on every rewritten bullet (a failing job keeps
  its own bullets); new points must carry a B requirement, no numbers, no C terms, no
  certificate wording, max 3 per job; C terms are removed from the summary.
- **Speed**: same model (deepseek-v4-flash), thinking off, fastest hosts first.

## How it was tested

`scripts/opt-lab/` — 15 fake profiles (3–5 roles, real-user size) and 20 realistic Gulf
adverts (`data/`, generated once and committed), 26 scenarios: 14 same field, 4 related,
4 different field, 4 title-only. Each CV scored three ways:

- **Our score**: the production match score (`lib/optimizer/score.ts`), qualifications included.
- **Independent ATS**: a Jobscan-style keyword match rate; its own prompt reads the
  advert and never sees our analysis.
- **Invented-claim audit**: any C requirement in the final CV that the profile never had.
- Plus a separate recruiter judge on whether each added point is realistic.

Run: `node --env-file=.env.local node_modules/sucrase/bin/sucrase-node scripts/opt-lab/run.ts v3`
(and `baseline`, `report`; `compare.ts` for today vs v3).

## Results (final run)

| Group | Our score: before -> Easy / Moderate / High | Independent ATS: before -> Easy / Moderate / High |
|---|---|---|
| Same field (14) | 44 -> 51 / 56 / 56 | 26 -> 32 / 41 / 42 |
| Related field (4) | 40 -> 44 / 49 / 50 | 17 -> 22 / 28 / 29 |
| Different field (4) | 27 -> 27 / 27 / 27 | 3 -> 4 / 4 / 5 |
| Title only (4) | 85 -> 92 / 93 / 94 | n/a |

- Field verdict right 25/26 · invented-claim audit **0** · recruiter judge **100%**
  realistic (66/66) · median **14 s** (analysis + Moderate), slowest 25 s.

**Today's optimizer vs v3, same 10 scenarios (Moderate):** time 112 s -> 17 s; our score
50 -> 51 (today) vs **59** (v3); independent ATS 25 -> 26 vs **39**; invented claims 0 / 0.
Today's optimizer failed outright on the developer CV (analysis gave up after 240 s).

Benchmark: Jobscan recommends a 75%+ match rate, notes many users succeed at 65%, and that
above 75% is often not possible without keyword stuffing.

## What the lab found and fixed in shared code (also live)

- `lib/optimizer/text.ts`: British "-ise" verbs were normalised by word length, so
  "liaised" and "liaise" did not match and a tense change threw away a whole job.
- `lib/ai/profileEntities.ts`: present-tense verbs and summary openers ("Coordinate…",
  "Proven…") at the start of a sentence were read as names copied from the advert.
- Tests: `scripts/verify-match-terms.ts`.

## Open

- 75–85% at Moderate is reached only when the candidate genuinely has most of what the
  advert asks (MEP 63–72, ICU 65–77); the average same-field CV stops near 56 because the
  remaining requirements are honest gaps (group C).
- Writing polish: some strong bullets barely change at Moderate; one new point read
  keyword-stuffed.
- First-time explainer, one-time agreement, field warning UI and wiring into
  `/api/optimize` — next phase, after founder review.
