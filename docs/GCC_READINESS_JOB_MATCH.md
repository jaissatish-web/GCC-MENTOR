# GCC_READINESS_JOB_MATCH.md — Product Logic Specification

**Founder-authored spec, delivered in conversation 2026-08-10.** Recorded here
verbatim (formatting only) per `docs/RULES.md` §1 ("if it is not written here,
it does not happen"). This is the founder's own product-architecture document
for GCC Mentor's core loop — it supersedes/extends parts of `docs/MVP.md`,
`docs/ROADMAP.md`, `docs/PROMPTS.md`, and `docs/CAREER_PROFILE.md` in ways not
yet reconciled with those files. **Do not treat this file as fully
reconciled** — see the CTO analysis logged in `docs/PROJECT_STATUS.md`
2026-08-10 for what's already built, what's new, and what conflicts with
already-shipped work (most notably: Cover Letter's persona count, and the
existing `/ats-scan` tool's relationship to the "Job Match" engine described
here).

Per §38 of this document, exact scoring weights, checklists, and several
implementation specifics are explicitly deferred to the product owner and
must not be assumed — build the described architecture, not final scoring
rules, until those are supplied.

---

## 1. Product Vision

GCC Mentor is a GCC-focused career platform designed primarily for professionals applying for jobs in Saudi Arabia, UAE, Qatar, Oman, Bahrain and Kuwait.

The product should NOT behave like a generic ATS resume checker.

The core differentiation is:

A candidate can have a high generic ATS score and still fail to get shortlisted for GCC jobs because GCC employers may evaluate requirements, profile information, experience relevance, career history and job-specific fit differently.

GCC Mentor therefore separates two fundamentally different evaluations:

### A. GCC Readiness

Answers: *"Is my professional profile prepared for GCC job applications?"*

This is candidate-level and relatively stable.

### B. GCC Job Match / ATS

Answers: *"How well does my profile and resume match THIS specific GCC job?"*

This is job-specific and must be recalculated for every job description.

**These two scores must never be merged into one generic score.**

---

## 2. Core Product Principle

The product has four major engines/workflows:

```text
1. GCC READINESS
   ↓
   Hard-coded GCC-specific rules

2. GCC JOB MATCH / ATS
   ↓
   Candidate + Resume + Specific Job Description

3. RESUME OPTIMIZATION
   ↓
   Improves ATS/job-specific content and professional summary

4. COVER LETTER GENERATION
   ↓
   Candidate + Optimized Resume + Job Description
```

The separation between these systems is mandatory.

---

## 3. GCC Readiness Engine

### 3.1 Purpose

GCC Readiness determines whether the user's profile contains the information and professional attributes that GCC Mentor has defined as important for GCC applications.

The GCC Readiness rules will be hard-coded and controlled by GCC Mentor.

The LLM must NOT independently invent GCC Readiness requirements.

The final GCC Readiness checklist and scoring weights will be supplied separately by the product owner.

Claude/Codex should NOT assume missing requirements. If an implementation decision is required, ask the product owner.

---

## 4. GCC Readiness Is NOT Resume Optimization

This is a critical architectural rule.

GCC Readiness problems are fixed by the USER through their Career Profile.

Example:

```text
Passport validity missing
        ↓
Complete GCC Profile
        ↓
User enters passport validity
        ↓
GCC Readiness score increases
```

The AI resume optimizer must NOT attempt to fix or fabricate these fields.

For example:

- Passport information
- Passport validity
- ECR/ECNR
- Relocation readiness
- Driving license
- GCC experience
- Education
- Certifications
- Other GCC profile requirements

must remain structured profile information.

---

## 5. GCC Readiness Information

The current concept includes, but is not limited to:

**Personal / Contact**
- Full name
- Phone
- Email
- Current location
- Professional photo where applicable

**Passport / Relocation**
- Passport availability
- Passport validity
- ECR / ECNR where applicable
- Relocation readiness
- Other GCC-relevant travel/profile information

**Education**
- Degree
- Institution
- Graduation information
- Relevant qualification

**Certifications**
- Certification
- Issuing organization
- Validity
- License information where applicable

**Career**
- Current role
- Complete career history
- Company
- Job title
- Start date
- End date
- Responsibilities
- Relevant experience
- Employment gaps

**GCC Experience**

GCC/Gulf experience must be captured separately. Possible information:
- GCC experience: Yes/No
- Country
- Company
- Role
- Duration
- Industry
- Responsibilities
- Project experience where relevant

**Driving License**

Capture:
- Whether the user has a driving license
- Country issued
- Category/type
- Validity
- Other relevant information

Important: A driving license should NOT automatically reduce every candidate's GCC Readiness simply because they don't have one. Its importance may depend on the user's profile and/or specific job. If a job specifically requires a driving license, it becomes a job-specific Job Match requirement.

---

## 6. GCC Readiness Scoring

GCC Readiness should be calculated using deterministic/hard-coded rules.

Example: `GCC Readiness = 78/100`

The exact categories, weights, mandatory requirements and scoring rules will be defined by the product owner. Do NOT let the LLM randomly generate the final score. The LLM may help extract or interpret information, but the scoring engine should remain controlled and reproducible. Same candidate data should produce the same GCC Readiness score.

---

## 7. No Job Description Scenario

A user can upload only their resume. The system should still provide immediate value.

Flow:

```text
Upload Resume
      ↓
Extract information
      ↓
Create temporary Candidate Profile
      ↓
GCC Readiness analysis
      ↓
Show GCC Readiness result
```

Without a JD, we can also analyze some general resume/profile issues, such as:
- Career history completeness
- Employment gaps
- Date consistency
- Grammar
- English quality
- Sentence quality
- Resume structure
- Basic experience information

But we must NOT pretend to calculate a full job-specific ATS/Job Match without a job description.

The UI should explain: *"Your GCC Readiness can be checked without a job description. Add a specific job description to see how well your profile matches that opportunity."*

---

## 8. Job Description Scenario

If the user uploads `Resume + Job Description`, the system should process both in parallel.

```text
                   Resume
                     ↓
            Candidate Profile
                ↙          ↘
               ↓            ↓
       GCC Readiness     Job Match
                             ↑
                             │
                     Job Description
```

The user receives GCC Readiness (e.g. 91/100) and GCC Job Match (e.g. 73/100) — separate scores.

---

## 9. Why Two Scores?

The UI must explain this clearly.

Suggested concept:

> **GCC Readiness is about YOU.** It checks whether your profile is prepared for GCC applications.
>
> **Job Match is about YOU + THIS JOB.** It checks whether your experience, career history, summary, skills and profile match the specific job description.

A candidate can therefore have `GCC Readiness: 94, Job Match: 62` or `GCC Readiness: 62, Job Match: 91`. Both are valid situations.

---

## 10. Job Match / ATS Engine

The Job Match engine is specific to each job description. It should analyze the candidate against the actual requirements in the JD.

The analysis should include, where applicable:

- **Professional Summary** — does the candidate's summary clearly position them for this role?
- **Career History** — does their actual career history demonstrate relevant experience?
- **Relevant Experience** — distinguish total experience, relevant experience, direct experience, related experience. Do NOT assume 10 years total experience = 10 years relevant experience.
- **Required Skills** — identify required / preferred / optional, and map candidate evidence against each.
- **Responsibilities** — does the candidate demonstrate experience performing the responsibilities requested by the employer?
- **Industry** — does the candidate have relevant industry experience?
- **GCC Experience** — if the job requires or prefers GCC experience, evaluate it appropriately.
- **Country Experience** — Saudi/UAE/Qatar/etc. experience, where relevant.
- **Company / Project / Environment Relevance** — where the JD makes this relevant. Do NOT make "same company experience" a universal requirement.
- **Education** — compare education requirements against candidate education.
- **Certifications / Licenses** — check required or preferred certifications/licenses.
- **Driving License** — if a specific JD says e.g. "Valid UAE driving license required," this becomes a high-impact Job Match requirement. If the JD does not mention it, it should not automatically become a major negative.

---

## 11. Job Match Scoring Philosophy

Do NOT simply ask an LLM "Give this resume an ATS score." Instead use a structured pipeline:

```text
Resume
  ↓
Text extraction
  ↓
Candidate Profile
  ↓
Job Description extraction
  ↓
Structured Job Profile
  ↓
Requirement/Evidence Mapping
  ↓
Deterministic scoring rules
  ↓
LLM semantic analysis
  ↓
Final Job Match Score
  ↓
Human-readable explanation
```

The LLM should provide semantic reasoning and interpretation, while the scoring framework remains controlled. The exact scoring weights should be defined and versioned.

---

## 12. Explainability Is Mandatory

Never show only `Job Match: 73%`. The user must understand WHY.

Example:

```text
Job Match — 73/100

Summary Match — 61% 🔴
Your summary does not clearly communicate the backend/microservices
experience requested by the JD.

Career Relevance — 82% 🟢
Your recent experience contains strong evidence of relevant responsibilities.

Required Skills — 74% 🟡
Most requirements are supported, but two important requirements are not
clearly demonstrated.

Industry Match — 58% 🟡
The role prefers direct industry experience that is not strongly represented.

Experience Level — 94% 🟢
Your relevant experience meets the stated requirement.
```

---

## 13. The "Ohhh" Moment

The free report should not simply show metrics. It should identify the user's most important problem.

Example: *"Your biggest problem isn't your generic ATS score. Your experience is relevant, but your resume is not clearly communicating that relevance for this specific job."*

Or: *"You are a strong match for this job, but your GCC profile is incomplete."*

Or: *"Your 8 years of total experience are not the same as 8 years of relevant experience for this role."*

This diagnosis is a major product differentiator.

---

## 14. Free vs Paid Information

The free experience should provide meaningful value. Do NOT hide everything behind payment.

The free report should show: GCC Readiness score, Job Match score if JD is provided, major strengths, some weaknesses, some optimization opportunities, high-level reason for the score.

However, not every detailed optimization finding needs to be shown before signup/payment. Example: *"We found 14 optimization opportunities. 4 are high impact. 6 are moderate. 4 are minor."* Show selected examples, while the detailed optimization workflow is part of the product.

The objective is: **Free = understand the problem. Paid = solve the problem.**

---

## 15. Anonymous User Flow

Users should be able to use the initial checker without creating an account.

```text
Landing Page → Upload Resume → Optional Job Description → Processing → Result
```

The user should see the result before being forced to register.

---

## 16. Temporary Anonymous Session

Anonymous analysis data must be temporarily stored. Do NOT rely only on browser memory.

Create an anonymous analysis/session record containing things such as: Session ID, uploaded resume, extracted candidate profile, GCC Readiness result, job description if supplied, Job Match result, report data, analysis/version information.

The session should have a defined expiration period and privacy/deletion policy.

---

## 17. Signup / Login Conversion

```text
Anonymous Session → User Signup/Login → Claim Session → Permanent User Records
```

The user must NOT have to re-upload the resume, re-paste the JD, or re-run the analysis. The exact result they saw before signup should be preserved and immediately visible in the dashboard after signup.

---

## 18. Career Profile

After signup, the user can access **My Career Profile** — the structured source of truth for their professional/GCC information: personal information, passport, ECR/ECNR, relocation, driving license, GCC experience, education, certifications, career history, other defined GCC requirements.

GCC Readiness improvements happen through the Career Profile, NOT the resume optimizer.

---

## 19. Resume Optimization

Once the user has a Job Match report, the primary CTA is **Optimize My Resume**. The optimization is job-specific, using: Candidate Profile + Original Resume + Job Description + Job Match findings.

---

## 20. Optimization Scope

For the MVP, optimization should primarily focus on ATS-relevant content and Professional Summary. The optimizer should improve relevant content positioning, job-specific terminology, semantic alignment, professional summary, relevant experience presentation, grammar/sentence quality where appropriate.

It should NOT modify GCC Readiness profile requirements.

---

## 21. No Fabrication Rule

The optimizer must NEVER invent: skills, certifications, job responsibilities, companies, projects, years of experience, GCC experience, driving licenses, education, technologies, achievements.

If the JD requires something not supported by the candidate's evidence: mark it as missing/unsupported. Do not manufacture it.

---

## 22. Optimization Levels

- **Light** — essential improvements: important ATS content, professional summary, critical wording.
- **Moderate — Recommended** — stronger job alignment: ATS content optimization, professional summary, relevant experience positioning, semantic/JD alignment, important grammar/sentence improvements.
- **Full** — maximum supported optimization: ATS content, professional summary, relevant experience positioning, achievement wording, semantic alignment, grammar/sentence improvement, content ordering where appropriate.

All levels must obey the no-fabrication rule.

---

## 23. Optimization Report

After optimization, show exactly what changed and why.

Example:

> **Professional Summary**
> Before: *"Software Engineer with 7 years of experience in software development."*
> After: *"Backend Software Engineer with 7 years of experience developing Java and Spring Boot applications..."*
> Why? *"Your career history supports Java, Spring Boot and backend development. The target JD emphasizes these areas, so the summary was repositioned to make the existing relevance clearer."*

This "Why?" explanation is mandatory for important changes.

---

## 24. Before / After Score

```text
Before Optimization: Job Match: 68/100
After Optimization:  Job Match: 87/100
Improvement: +19
```

The system should clearly state that this is a model-based match score, NOT a guarantee of getting shortlisted/interviewed.

---

## 25. Resume Editor

After optimization, the user should be able to: view optimized resume, edit any resume section, edit text, add/remove sections, change ordering where supported, choose a template, preview resume, save resume. The user remains in control of the final content.

---

## 26. Resume Templates

Template selection should be independent of candidate data:

```text
Candidate Profile → Optimized Resume Content → Selected Template → Rendered Resume
```

Changing a template should NOT destroy or alter the underlying candidate information. Users should be able to create different resume versions for different jobs.

---

## 27. Resume Versions

A user may have multiple resumes (e.g. "Senior Backend Engineer — Riyadh", "Software Engineer — Dubai", "Cloud Engineer — Doha"), each with different JD, optimization, optimized content, template, and user edits. The original resume must remain available.

---

## 28. Cover Letter Generation

Input: Candidate Profile + Optimized Resume + Job Description. No need for the user to re-enter information.

---

## 29. Cover Letter Styles

Initial choices can include:
- **Professional** — formal and clear.
- **Smart** — modern, concise and confident.
- **Dedicated** — personalized and enthusiastic.
- **Simple** — short and direct.

These are writing styles, not different factual profiles.

---

## 30. Cover Letter UI

A generated letter is shown in an editable box with `[Edit] [Save] [Copy]` actions. The user can edit, save, and copy with one click, then paste it into email/application portals.

---

## 31. Cover Letter No-Fabrication Rule

The cover letter must use verified candidate information. Never claim experience the candidate doesn't have, skills not supported by the profile, certifications not present, GCC experience that doesn't exist, false company/project information. Generated from the same structured source of truth used by the resume optimizer.

---

## 32. Final Application Dashboard

Eventually the user's dashboard should show, per application: GCC Readiness score, Job Match score, Resume status (Optimized), Cover Letter status (Ready), and actions (View Report / Edit Resume / View Resume / Copy Cover Letter).

---

## 33. Application Status Concept

- GCC Ready + Strong Job Match → strong application foundation
- GCC Ready + Weak Job Match → "you're GCC-ready, but this job may not be a strong match"
- Weak GCC Readiness + Strong Job Match → "you appear to match the job, but complete your GCC profile first"
- Weak GCC Readiness + Weak Job Match → "improve your profile and target a better-matching opportunity"

Do not describe any score as a guaranteed probability of getting an interview.

---

## 34. Recommended Data Architecture

```text
USER
 ├── Career Profile
 ├── GCC Profile
 ├── Original Resumes
 ├── Job Descriptions
 ├── Job Match Analyses
 ├── Optimization Runs
 ├── Resume Versions
 ├── Cover Letters
 └── Analysis History
```

Per job: Job Description, Structured Job Profile, Job Match Analysis, Optimization, Resume Version, Cover Letter.

Avoid duplicating the complete candidate profile inside every analysis. Use IDs/references between records.

---

## 35. Analysis Versioning

Scores and reports should be versioned, e.g.:

```text
Analysis #001 — GCC Readiness: 78, Job Match: 71, Model/Rule Version: v1
Optimization #001 — Job Match Before: 71, After: 84, Level: Moderate
```

If the scoring logic or model changes later, do not silently overwrite historical results. Important for user trust and debugging.

---

## 36. Core UX Philosophy

Extremely simple, mobile-first, easy to understand, minimal technical jargon, one primary action per screen, strong visual hierarchy, clear explanation of WHY, before/after comparisons, progressive disclosure. The user should never feel they need to understand ATS technology — instead: *"Tell me what's wrong and what I should do next."*

---

## 37. The Core User Journey

```text
LANDING PAGE
  → Upload Resume
  → Optional JD
  → Processing
  → FREE RESULT (GCC Readiness + Job Match if JD exists)
  → "Ohhh — now I understand my problem"
  → SIGN UP (existing analysis preserved)
  → Detailed Report
  → Optimize My Resume (Light / Moderate / Full)
  → Before / After Report
  → Resume Editor → Choose Template → Edit → Save
  → Generate Cover Letter → Choose Style → Edit → Save / Copy
```

---

## 38. What Must Still Be Confirmed With Product Owner

Before implementing scoring logic, Claude/Codex should NOT make assumptions about the following. Ask the product owner for confirmation where necessary:

**GCC Readiness:** exact checklist; mandatory vs optional fields; scoring weights; country-specific differences; when a missing field should reduce score; when something should be "Not Applicable"; exact treatment of GCC experience; exact treatment of driving license; exact treatment of passport/ECR/ECNR; exact employment-gap rules.

**Job Match / ATS:** exact scoring categories; exact weights; required vs preferred weighting; how direct vs related experience is scored; industry matching rules; GCC experience weighting; summary weighting; career-history weighting; skill matching methodology; how to handle ambiguous JD requirements.

**Optimization:** exact scope of Light/Moderate/Full; which resume sections can be modified; which sections must never be changed automatically; template list; whether grammar improvements are included in every level.

**Cover Letter:** exact styles; maximum length; tone; whether company name should be used when available; whether hiring manager name should be used when available.

If something affects scoring or user-visible behavior and the specification doesn't define it, ask the product owner rather than inventing a rule.

---

## 39. Product North Star

The product should ultimately make the user feel: *"I finally understand why my CV wasn't working for this GCC job."* Then: *"I can see exactly what GCC Mentor changed and why."* And finally: *"Now I have a GCC-ready profile, a job-specific resume and a cover letter ready to apply."*
