# SCORING — two different scores, deliberately

The product shows two numbers. **They answer different questions and must never be
presented as the same thing.**

| | **GCC Readiness** | **Job Match** |
|---|---|---|
| Asks | Is my profile ready for the Gulf market? | How well do I fit *this one job*? |
| Needs | A resume or a profile | A resume **and** a job description |
| Method | Deterministic arithmetic | Deterministic mapping + a semantic layer |
| Cost | Zero | One or more model calls |
| Free? | Yes, no login | Yes, no login |

Conflating them was a real problem once, and separating their names was a deliberate
correction.

---

## 1. GCC Readiness — arithmetic, not opinion

**Completeness and market-readiness of the user's own profile.** It never judges
their career; it tells them what is missing or weak for a Gulf application.

### The category — derived when signed in, asked when anonymous

**fresher · experienced · returner · currently in Gulf**

For a signed-in user it is derived from the profile, in a fixed order of precedence,
because a fresher and a returning Gulf professional are not missing the same things.
Weighting differs per category, and **every category's weights are asserted at module
load to sum to exactly 100** — a weighting table that silently drifts from 100 produces
a score that looks fine and means nothing.

**For an anonymous scan the category is asked directly** (agreed 2026-08-17): Gulf
experience yes/no → years → in the Gulf right now? Those answers pick the category.
Asking beats inferring — the user's own statement is a fact they gave us, so nothing
has to be parsed out of resume text and guessed at. **No country is asked.**

This scoring already existed and was simply unreachable anonymously, because nothing
asked the visitor which category they were in.

⚠ **A self-declared answer is scoring input only.** It is trusted for the score,
because it is the user's own statement about their own life. It must **never** reach a
generated resume as content unless the resume itself supports it — to be enforced in
code, not by convention.

### Weights are per field group, distributed across fields

Weights are specified at the group level, so each group's weight is split equally
across its own fields and the remainder goes to the first. A single-field group takes
its whole group weight. Multi-field groups — contact and target, visa readiness — split
theirs.

**The UI derives point values from the same table rather than hard-coding them.** A
static "+30 points" label would be wrong for most categories, because the same field
is worth different amounts depending on the derived category.

### It never gates anything

The score is guidance. It never blocks a feature, never withholds a download, never
changes what a user may buy.

### Why it stopped using a model

It used to call one. **The same resume scored 78, then 45.** It took 97 seconds and
cost money each time.

Deterministic now: **0.6 seconds, zero cost, repeatable.** A number shown to a user as
a finding has to be reproducible — a model that answers differently each time cannot
be the basis of one. This is also what makes the score safe as the top of the funnel:
free traffic costs nothing to serve.

---

## 2. Job Match — fit against one specific advert

Pipeline, in order:

```
job description text
   → structured job profile        (model call)
   → deterministic requirement mapping against the user's evidence
   → semantic layer                (model call: qualitative judgement + explanation)
   → one overall score + a per-category "why"
```

### Six deterministic categories

`required_skills` · `experience_level` · `gcc_experience` · `education` ·
`certifications` · `driving_license`

Each returns a score, an applicability flag and a human-readable explanation. **A
category marked not applicable contributes nothing — neither positively nor
negatively.** A job that does not ask for a driving licence must not penalise a
candidate who has none, and must not reward one who does.

### Three semantic categories

Summary match, career relevance and industry match — plus a plain-language
explanation for **every** category, including the deterministic ones. A number without
a reason is not a finding a user can act on.

### The semantic layer cannot override a deterministic score

**Enforced by the type system, not by asking the prompt nicely.** The model's job is
to explain and to judge what is genuinely qualitative. It is not permitted to move a
number that was computed from evidence.

### Combination

Equal weighting across applicable categories, and **explicitly interim**. Real
weights are a product decision that has not been made, and inventing a weighting that
looks authoritative would be worse than an honest equal split.

---

## 3. Where each score appears

| Route | Shows |
|---|---|
| `/ats-scan` | The free scan entry point — upload or paste, optional job description |
| `/gulf-readiness` | The free scan **results** |
| `/gcc-readiness` | A signed-in user's readiness against their **saved profile** |
| `/job-match` | A signed-in user's Job Match report |

**`/gulf-readiness` and `/gcc-readiness` are one letter apart and are different
things.** That naming is a live problem, not a quirk — recorded in
[`14_OPEN_ITEMS.md`](14_OPEN_ITEMS.md).

The signed-in readiness page derives its input **identically** to the dashboard's
readiness card — verified field by field, not assumed — so the two can never disagree.

---

## 4. Free scan persistence

An anonymous scan is stored against a **signed, HttpOnly cookie**: single-use,
7-day expiry, claimable **only by a new account**. That last constraint avoids a
stale cookie clobbering an existing user's profile.

This deliberately reversed an earlier "store nothing" decision, and was done with
real mitigations rather than by relaxing the principle. The user-facing copy was
corrected at the same time — the page had promised "we do not save your resume" after
persistence shipped, which was no longer true.

It also failed once in a way worth remembering: persistence was gated on the
*extracted draft* after extraction became conditional on a job description, so **for
every scan without a job description — the default path — nothing was stored at
all.** The results page then said the scan was unavailable and its own "kept for 7
days" promise was false. Persistence is now gated on the resume text.

---

## 5. The known scoring defect — read this before touching Job Match

**`gcc_experience` scores 0 on every anonymous scan, no matter what the CV says.**

The category counts only work entries carrying a `gcc_country` value. That column is
written by exactly one thing: a dropdown in the profile editor. **Extraction never
derives it.** So on the free funnel — the product's main traffic — the category is
structurally always zero.

Measured, not theorised: a CV with 12 years of oil-and-gas experience in Abu Dhabi
and Jubail, against a matching Senior Piping Engineer job description, scored
**48/100**, with `gcc_experience: 0`, `experience_level: 0` and `education: 0`. The
semantic layer scored the same candidate 85, 95 and 100, and its own diagnosis noted
that the screening had "given zeros". **The deterministic half dragged an honest 90
down to 48.**

`education` scored 0 because `B.Tech` does not substring-match a job description
asking for `B.Eng`.

**Why this is the highest-value open defect in the product:** it is not a crash,
which in one sense is worse. It is confidently wrong, on the feature the product is
named after, and the number is shown to real users as a judgement of them. That
violates [`02_PHILOSOPHY.md`](02_PHILOSOPHY.md) §2.

**The fix is more available than it first appears.** Extraction already returns a
free-text `location` per work entry — "Abu Dhabi, UAE" is already reaching us and
simply is not being read. Mapping that to a GCC country is deterministic and does not
touch the grounding rule: it reads a fact the resume states rather than inventing one.
Degree equivalence is the second half of the same job.

**It is a product decision, not a typo.** What "GCC experience" means for an
untagged resume, and how degree equivalence should work, need answers before the code
changes.
