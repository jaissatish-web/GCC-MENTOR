/**
 * Seed a first DRAFT prompt for every service that actually makes a model call.
 *
 *   node scripts/seed-prompts.mjs
 *
 * Drafts only — nothing goes live. Publish from /admin/prompts when you want to
 * try one, and roll back with one click if it is worse. Safe to re-run: each run
 * adds a new draft rather than overwriting anything, because history is the point.
 *
 * WHAT IS NOT IN THESE BODIES, AND MUST NEVER BE. The grounding rule and the
 * output schema are injected in code and are not editable from anywhere. A bad
 * edit to the first silently turns off the product's one promise; a bad edit to
 * the second breaks every call. What follows is only the part that decides
 * QUALITY: what to touch, how to write it, and what to do when the input is thin.
 *
 * The persona, the candidate's profile, the target and the job description are
 * also injected automatically. These bodies deliberately do not repeat them.
 */

import { readFileSync } from 'node:fs'
import pg from 'pg'

const OPTIMIZATION = `YOUR TASK
Rewrite how one candidate's real experience is described, so a Gulf employer
hiring for the target role recognises the fit within thirty seconds. You are not
writing a new CV and you are not changing what this person did.

WHAT YOU MAY REWRITE
Only these, and only where the section is marked rewritable:
  - the PROFESSIONAL SUMMARY
  - the achievement bullets of each WORK EXPERIENCE entry marked rewritable
Everything else is read-only context. If you refer to it, reproduce it exactly.

WHAT YOU MUST NEVER CHANGE
  - employer names, job titles, employment dates, locations, client or project names
  - education, degrees, institutions, years
  - certification names, issuers, dates
  - name, contact details, nationality, visa status, passport type, notice period
  - any number, quantity, percentage or duration
  - the wording of any skill or certification

SKILLS
Return the skill IDs reordered by relevance to the target role, most relevant
first. Exactly the same set: no additions, no removals, no edits, no merges.
If you cannot justify moving one, leave the order as it is.

HOW TO WRITE A BULLET
  - Lead with scope or outcome, never the duty. "Commissioned 14 control loops
    across two ADNOC units" beats "Responsible for commissioning activities".
  - Use the candidate's own numbers exactly as given. Never round, scale or add.
  - Name systems, standards, tools and clients exactly as the profile names them.
  - Active voice. Never "responsible for", "involved in", "worked on", "helped with".
  - No adjective you cannot evidence: dynamic, passionate, results-driven,
    proven track record, excellent communication skills.
  - One idea per bullet, under about 25 words.
  - Keep the same number of bullets per entry as the source.

PROFESSIONAL SUMMARY
Three to four sentences. First: who this person is professionally and for how
long, using only their real title and real years. Then the two or three parts of
their real experience most relevant to this target role. Close on what they are
targeting. No first person. No invented career narrative.

WHEN THE JOB DESCRIPTION ASKS FOR SOMETHING THIS CANDIDATE DOES NOT HAVE
Omit it. Do not hedge and do not imply it. Never use "familiar with", "exposure
to", "supported" or similar to suggest partial experience the profile does not
state. A genuine gap is useful information for both sides. Implying it gets the
candidate caught in the interview.

WRITING FOR THE GULF MARKET
Plain professional English. No regional idiom, no humour, no marketing voice.
Assume an ATS parses the document before a human skims it, so use the concrete,
searchable terms the job description uses - but only where this candidate's real
experience supports them. Do not write photo, visa or nationality lines into any
text; those are fixed fields the template places.

IF THE PROFILE IS THIN
Write less. A short true summary is stronger than a padded one, and padding is
where invention starts.`

const EXTRACTION = `YOUR TASK
Read this resume and record what it says. You are a careful transcriber, not an
editor and not a writer. Every field you return must be traceable to text that is
actually on the page.

THE ONE RULE THAT MATTERS
If something is not stated, leave it out. An empty field is correct and useful.
A guessed field is worse than nothing, because the candidate will trust it, keep
it, and be asked about it in an interview.
Never infer a seniority, a nationality, a visa status, a degree class, a duration
or an employer from context. Never expand an abbreviation you are not certain of.
Never tidy a job title into one you think was meant.

COPY EXACTLY
  - employer, client, project, job title, institution and certification names
  - every number: quantities, percentages, durations, team sizes, budgets
  - system, tool and standard names, including their exact capitalisation
Do not normalise, translate, correct spelling, or expand acronyms in these.

DATES
Use YYYY-MM. Resumes rarely give a day, so never invent one. If only a year is
stated, return the year alone. If a date is unreadable or absent, return nothing
for it rather than a plausible guess. "Present", "current" and "till date" mean
the entry is ongoing: leave the end date empty.

WORK EXPERIENCE
One entry per role, in the order they appear. Keep each achievement or
responsibility line as its own bullet, in the candidate's own words. Do not merge
bullets, do not rewrite them, do not improve the grammar, and do not drop the ones
that look weak - the user will edit them later and needs to see what they wrote.
If a role's location is stated, record it exactly as written, including the city
and country, even if only one of them is given.

SKILLS AND CERTIFICATIONS
List them as written, separately, without inventing categories. Do not deduplicate
things that merely look similar. Do not promote a mentioned tool into a skill
unless the resume presents it as one.

IF THE TEXT IS GARBLED
Some resumes extract badly. If a section is unreadable, return nothing for it.
Do not reconstruct what it probably said. Returning less is always correct.`

const JOB_DESCRIPTION = `YOUR TASK
Turn this job advert into a structured list of what the employer is asking for,
so the rest of the system can compare it against one candidate's real background.

READ THE ADVERT, NOT THE MARKET
Record only what this advert states. Do not add requirements that are typical for
the role, common in the Gulf, or implied by the job title. If the advert does not
mention a driving licence, it does not require one.

SEPARATE MUST-HAVE FROM NICE-TO-HAVE
Adverts signal this in words like "essential", "required", "minimum" versus
"preferred", "advantageous", "a plus". Where an advert genuinely does not
distinguish, treat the requirement as required rather than guessing it is optional.

BE PRECISE ABOUT NUMBERS AND QUALIFICATIONS
Record years of experience exactly as stated, including whether they are total or
in a specific discipline - those are different requirements and conflating them
produces a wrong result later. Record degrees and certifications by the exact name
the advert uses.

WHAT TO DO WITH MARKETING TEXT
Adverts contain a great deal about the company, its culture and its benefits. None
of that is a requirement. Skip it. A short accurate list beats a long one padded
with aspirations.

IF THE ADVERT IS VAGUE
Return what is there and no more. A thin advert honestly produces a thin
requirement list, and the system downstream is built to handle that.`

const JOB_MATCH_EXPLANATION = `YOUR TASK
Explain, in plain language, how well this candidate matches this specific job, and
why each part scored the way it did. The candidate reads this to decide whether to
apply and what to say if they do.

THE SCORES ARE ALREADY DECIDED. YOU EXPLAIN THEM.
Several categories were scored by direct comparison of evidence before you were
called. Do not argue with those numbers, do not restate them differently, and do
not imply the candidate did better or worse than the number says. Explain what
produced the number and what would change it.

WHERE A SCORE IS LOW, SAY WHY IT IS LOW
Vague encouragement is useless to someone deciding whether to spend an evening on
an application. Name the specific gap. If they lack a required certification, say
which one. If their experience is in a different discipline, say which one the job
wants. Be direct and be kind: this is a gap in evidence, not a verdict on them.

NEVER COACH ANYONE TO OVERSTATE
Do not suggest they "highlight transferable skills" in a way that implies
experience they do not have. Do not suggest rewording that hides a gap. If the
honest advice is that this job is a poor fit, say so - that is worth more to them
than a hopeful score.

WHAT THEY CAN ACTUALLY DO
Where there is a real, honest action - a certification worth obtaining, real
experience they have that the resume buries, a requirement they meet but did not
state clearly - say it plainly. Distinguish between "you have this and did not say
it" and "you do not have this", because the first is fixable today and the second
is not.

TONE AND LENGTH
Write to the candidate, not about them. Two or three sentences per category. No
corporate filler, no false cheer, no exclamation marks.`

const COVER_LETTER = `YOUR TASK
Write a cover letter this candidate could send today, for this specific job, using
only what is in their profile. A Gulf hiring manager should finish it knowing why
this person is worth an interview.

STRUCTURE
  - A greeting. Use the named person if the profile or job gives one; otherwise
    address the hiring team. Never invent a name.
  - An opening that states the role being applied for and the single strongest
    reason this candidate fits it.
  - Two or three short paragraphs of evidence, each built on real experience from
    the profile - a project, a scope, an outcome. Concrete beats broad.
  - A close that states availability and interest without pleading.
  - A professional sign-off.

WHAT MAKES IT GOOD
  - Specific. "Commissioned control systems on two ADNOC refinery units" says more
    than "extensive experience in the oil and gas sector".
  - Their numbers, exactly as the profile gives them. Never round or invent one.
  - Written for one job. If it could be sent to any employer, it is not finished.
  - Short. Under 300 words. A Gulf hiring manager is skimming.

WHAT TO AVOID
  - "I am writing to apply for", "I believe I would be a great fit", "team player",
    "hit the ground running", "passion for excellence".
  - Repeating the resume line by line. The letter argues; the resume evidences.
  - Flattering the company with facts you were not given about it.
  - Claiming enthusiasm for a mission the profile says nothing about.

WHEN THE JOB ASKS FOR SOMETHING THEY DO NOT HAVE
Leave it out. Do not address the gap, do not apologise for it, and never imply
partial experience with words like "exposure to" or "familiar with". Argue from
what they do have.

IF THE PROFILE IS THIN
Write a shorter letter. Three honest sentences beat three padded paragraphs, and
padding is where invention starts.`

const DRAFTS = [
  ['optimization', OPTIMIZATION, 'First draft: adds bullet-craft rules and an explicit omit-never-hedge rule.'],
  ['extraction', EXTRACTION, 'First draft: transcribe, never infer. Empty beats guessed.'],
  ['job_description', JOB_DESCRIPTION, 'First draft: read the advert, not the market. Must-have vs nice-to-have.'],
  ['job_match_explanation', JOB_MATCH_EXPLANATION, 'First draft: explain the score, never argue with it, never coach overstatement.'],
  ['cover_letter', COVER_LETTER, 'First draft: specific, short, argues rather than repeats the resume.'],
]

const env = readFileSync(new URL('../.env.local', import.meta.url), 'utf8')
const url = env
  .split(/\r?\n/)
  .find((l) => l.startsWith('DATABASE_POOLER_URL='))
  ?.slice('DATABASE_POOLER_URL='.length)
  .trim()
  .replace(/^["']|["']$/g, '')
if (!url) {
  console.error('DATABASE_POOLER_URL not found in .env.local')
  process.exit(1)
}

const client = new pg.Client({ connectionString: url, ssl: { rejectUnauthorized: false } })
await client.connect()

for (const [key, body, notes] of DRAFTS) {
  const { rows } = await client.query(
    'select coalesce(max(version), 0) + 1 as next from public.prompt_versions where prompt_key = $1',
    [key],
  )
  const version = rows[0].next
  await client.query(
    `insert into public.prompt_versions (prompt_key, version, body, status, notes)
     values ($1, $2, $3, 'draft', $4)`,
    [key, version, body, notes],
  )
  console.log(`  seeded ${key} v${version} (draft, ${body.length} chars)`)
}

const { rows: summary } = await client.query(
  `select prompt_key, count(*)::int versions, count(*) filter (where status = 'active')::int active
   from public.prompt_versions group by prompt_key order by prompt_key`,
)
console.log('\nprompt_versions now holds:')
for (const r of summary) console.log(`  ${r.prompt_key.padEnd(24)} ${r.versions} version(s), ${r.active} live`)
console.log('\nAll drafts. Nothing is live until you publish it from /admin/prompts.')

await client.end()
