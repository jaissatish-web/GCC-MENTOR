# Founding Brief — Gulf Career Platform (v1, finalized for MVP)

**Status:** LIVE — Last updated: 2026-08-05 — v13

*This document is the single source of truth for product decisions. No GitHub repo exists yet for this project — Claude Code should create a new one. Claude Code: use this to generate the repo's /docs/*.md files (PRODUCT.md, MVP.md, CAREER_PROFILE.md, PROMPTS.md, DASHBOARD_LIBRARY.md, ADMIN.md, INFRASTRUCTURE.md, USER_FLOW.md, DESIGN.md, ROADMAP.md, TASKS.md, RULES.md) as described in the instructions at the bottom.*

---

## 1. Vision (long-term, not what ships first)

A guided platform that helps any Gulf-focused job seeker — regardless of where they are in their journey — get shortlisted, by fixing the real reason applications fail: generic resumes/cover letters not tailored to the target role, and no visibility into whether they're even competitive. Full long-term scope includes: guided resume building, one-click Gulf-format optimization, real ATS scoring against a specific job description, AI-generated interview questions from the optimized resume, a speech-based mock interview with review, and an information layer (blog + free tools: ATS score, CV score, salary calculator, end-of-service-benefits calculator).

## 2. Who the platform serves

**Open to every Gulf-focused job seeker — not restricted to one persona or segment.** This includes people with no Gulf experience yet, people with Indian/domestic experience trying to break in for the first time, people currently in the Gulf who want their next assignment, and people currently in the Gulf who want a step up. The product does not gate access by "type of user."

**How the product personalizes without segmenting who it serves:** onboarding builds a structured **Career Profile** (Section 4) that captures status and target along with the rest of the user's background. This is guidance personalization, not a user restriction — anyone can use the platform regardless of what their profile contains.

## 3. MVP decision: what we build first, and why

The MVP is the Career Profile data layer (Section 4) plus the core resume optimization flow built on top of it (Section 5), open to all users from day one. No user type is excluded or prioritized in the product itself. Marketing and initial outreach may still emphasize whichever channel/message converts fastest (to be decided/tested during distribution), but that's a go-to-market choice, not a product restriction.

## 4. Career Profile — the core data layer (built first, powers everything downstream)

**Why this exists:** every output the platform will ever generate (optimized resume now; cover letter, interview questions, mock interview later) should be *generated from the same structured profile*, not re-derived from a fresh upload each time. Building this correctly now avoids costly rework when Phase 3-4 features arrive.

**MVP profile schema (minimum needed to power the resume optimizer — expand in later phases, not now):**
- **Status:** currently working in the Gulf (yes/no), current employer/project if applicable
- **Target:** target job title, target country (Saudi Arabia / UAE / Qatar / Oman / Kuwait / Bahrain / Generic Gulf — drives which Gulf-CV format conventions apply), target company (optional, free-text/searchable — any employer, not limited to a fixed list)
- **Identity & contact (Gulf-CV standard fields, each with a show/hide toggle — see Section 4a):** full name, photo, nationality, date of birth, passport number, passport validity date, visa status, visa/iqama transferability, notice period, current location, phone number, WhatsApp number (if different), email, LinkedIn URL
- **Work experience:** structured list of entries (company, role, dates, location, work description/achievements) — auto-extracted from the uploaded resume by AI, not manually typed from scratch
- **Skills/certifications/platforms:** structured list, auto-extracted where possible
- **Education:** structured list, auto-extracted where possible

**How it's built (MVP flow):** user uploads their existing resume → AI extracts the above fields into the structured profile → user sees a simple review/edit screen to confirm or correct extracted data (not a long manual form) → profile is saved → all downstream generation (the optimized resume output) reads from this saved profile plus the target fields, not from the raw upload directly.

**Data handling note:** because the profile is now persisted (not just processed and discarded), the PII rule in Section 9 applies with extra weight here — this is the most sensitive data store in the whole product.

## 4a. What gets AI-optimized vs. what stays fixed (critical distinction)

**AI-optimized (rewritten to match the target job/description):**
- Professional Summary — rewritten each time to match the target job title/description
- Work Description bullets under each company — rewritten to emphasize the achievements/language most relevant to the target job description, using only facts already present in that work experience entry (grounding rule from Section 4 applies — never invent facts)

**Reordered, not rewritten:**
- Skills/certifications list — the items themselves are never changed or invented, but their display order is prioritized by relevance to the target job/description (most relevant skills surface first). This is a cheap, low-risk quality improvement that stays fully inside the grounding rule since nothing is added or reworded, only resequenced.

**Fixed — never AI-rewritten, only changed by the user manually in the Career Profile:**
- Name, photo, contact details (phone, WhatsApp, email, LinkedIn), nationality, date of birth, passport number/validity, visa status, notice period
- Company names, job titles held, employment dates/duration, location
- Education entries, certifications

**Why this split matters:** it's what makes the output feel like a human expert wrote it rather than an AI regenerating a whole document — a real resume writer doesn't invent your dates or certifications, they sharpen how your real experience is framed against a specific target. Any edit to a fixed field happens once in the Career Profile and automatically reflects across the resume (and later, cover letter) — the user never edits the resume document directly.

**Target selection and JD interaction:** the target country (Section 4) is always selected — it drives both persona selection (Section 4c) and which Gulf-CV format conventions apply, and provides a fallback target when no JD is given. Target company is optional free-text and, when provided, sharpens persona/framing further (e.g. a known major employer vs. a smaller firm). When a JD *is* pasted, it becomes the primary source of literal target language the optimizer matches against; country, company, and JD all work together, they aren't redundant.

**User control over what gets optimized:** before generation, the user chooses which blocks to optimize (individual work-experience entries, the summary) or one-click "Optimize All" (every eligible block). Not every entry needs rewriting for every target — a senior expert doesn't touch what's already strong.

**Optimization level (controls framing intensity and JD-keyword alignment — NEVER controls truthfulness):**
- **Easy** — light rewording, ~75-80% keyword/language match to the target job description
- **Moderate** — fuller reframing, ~80-90% match
- **High** — maximum reframing and JD-language alignment, ~90-100% match

The level applies once, globally, to the whole optimization run (not configurable per individual block) — keeps the control simple for MVP. At every level, the grounding rule in Section 4c (never invent a fact) is absolute and unaffected by the chosen level. What "High" changes is how aggressively the AI restructures emphasis and adopts the JD's exact terminology for the user's *real* experience — not whether new experience appears. **The UI must show a risk indicator at Moderate/High levels**, telling the user that a closer match raises the bar for what they need to be able to explain confidently in an interview — the resume gets sharper, but the user should walk in ready to defend every claim at the level they chose.

**User editing after generation:** once the AI generates the optimized summary/bullets, the user can directly edit that generated text before downloading (a real resume writer's draft still gets a client review pass) — this is separate from the Fixed fields above, which are edited only in the Career Profile, never in the generated resume text.

**Re-optimizing an existing package:** changing the optimization level or block selection on a package the user already has re-runs generation and overwrites that package's current AI-generated content in MVP. **Decision: full version history (keeping every past optimization, Git-like) is deferred to Phase 2, not built in MVP** — reasoning: version history only becomes valuable once a user has accumulated multiple optimization runs on the same package over time, which by definition means they're already a retained user; there's no value in building it before Phase 1 proves anyone stays retained long enough to need it. A genuinely new job target still creates a new package instead of overwriting an existing one.

## 4b. Field visibility (show/hide toggles) and template behavior

Every identity/contact field in Section 4 has a per-field toggle in the Career Profile (e.g. hide photo, hide passport number, hide date of birth) — the user controls what appears on the generated resume without deleting the underlying data (useful since some fields matter for one target client/country and not another).

**Template requirement:** the resume template must render correctly for every combination of shown/hidden fields — no empty gaps, no broken alignment, layout adjusts cleanly whether a field is shown or hidden. **MVP ships with ONE polished, premium Gulf-format template** built with solid conditional rendering; multiple selectable template formats are a Phase 2+ feature once the single template's conversion is validated, not part of MVP scope.

## 4c. AI generation approach — how outputs feel like a human expert wrote them

Applies to every AI-generated output in the product (resume optimization now; cover letter, interview questions, and mock interview review in later phases). Three rules, always used together:

1. **Persona:** every generation prompt assigns the AI a specific expert identity relevant to the user's target industry/role (e.g. "a senior I&C/Commissioning hiring manager with 15+ years reviewing candidates for Aramco/ADNOC-standard megaprojects" for an instrumentation candidate; a different persona for other industries) — pulled from the Career Profile's target field. This is what makes the output sound like a real practitioner, not a template engine. **Industry scope for MVP: curated, well-crafted personas for the highest-volume segments (Engineering/Technical — seeded from the founder's own domain expertise, Construction/Site roles, IT/Tech) plus a solid "Generic Gulf Professional" fallback persona for any other industry.** This keeps the platform open to everyone (nobody is turned away) while keeping output quality high where it matters most; additional dedicated industry personas (nursing, hospitality, etc.) get added later based on what Library data shows is actually being requested.
2. **Grounding:** every prompt explicitly instructs the AI to use only facts already present in the Career Profile — never invent, estimate, or embellish a number, certification, or project the user didn't provide. This is non-negotiable: an AI that fabricates plausible-sounding claims creates real legal/reputational risk and gets users caught lying in interviews. The Career Profile is the only source of truth injected into any generation prompt. **This rule applies identically at every optimization level (Easy/Moderate/High, Section 4a) — the level changes framing intensity and JD-keyword alignment only, never what facts may appear.**
3. **Claim-extraction (Phase 4, question generation/mock interview):** rather than pulling from a generic question bank, the system reads the specific claims already present in the user's *optimized resume* (numbers, named systems/standards, scope of responsibility) and generates a deep-dive question tied to each one — testing whether the user can actually explain what they claimed, the way a real senior interviewer pressure-tests a resume — plus a few general questions pulled from the target job description's required skills for coverage. This is deferred to Phase 4 per the roadmap but the schema/design should account for it (claims should be identifiable/extractable from the optimized resume output, not just free text).

## 4d. Cover letter (Phase 3) — same mechanism, different persona

When built, the cover letter generator reuses the identical Career Profile grounding rule, with a "senior recruiter writing a persuasive letter on the candidate's behalf" persona instead of the hiring-manager persona used for resume optimization. No new data or mechanism required — confirms the value of building the Career Profile layer correctly now.

## 4e. Onboarding — three input paths, one destination

Users can start building their Career Profile three ways: (1) upload a resume file (PDF/DOCX) or a LinkedIn profile export PDF, (2) copy-paste resume text directly, or (3) fill the Career Profile form manually from scratch. Paths 1 and 2 both feed the same AI-extraction pipeline (path 2 just skips file-parsing); path 3 skips extraction entirely. **All three paths converge on the same Career Profile review/edit screen** — build one profile editor UI, not three separate flows.

**Unmapped content ("Additional Information" section):** resumes often contain content that doesn't fit the fixed schema (awards, publications, languages, volunteer work). Extracted content that doesn't match a known field goes into a single "Additional Information" section as label+value pairs; the AI suggests a label, the user can rename it. MVP scope: one section with one show/hide toggle for the whole block — not individually toggleable per custom field (that level of dynamic schema + template rendering is a Phase 2 upgrade if usage shows it's needed).

## 4f. Readiness Score

The Career Profile shows a completeness score based on which fields are filled, weighted by an auto-derived user category (see table below — derived from existing data, no extra onboarding question required):

| Category | Auto-detection logic | Fields weighted heaviest for readiness |
|---|---|---|
| Fresher | 0 work experience entries, or under ~1 year total experience | Education, certifications, skills, contact/target |
| Experienced (not yet in Gulf) | Has work experience; status = not currently in Gulf; no Gulf employer in history | Work experience detail, certifications, target + client standard, visa-readiness fields |
| Returner | 12+ month gap between most recent job's end date and today | Work experience, certification validity, skills, contact — no mandatory gap-explanation field (optional at most; this is sensitive territory) |
| Currently in Gulf | Status = currently in Gulf: yes | Visa/iqama transferability, notice period, current employer/client standard, passport validity |

Clicking an incomplete item in the readiness score jumps directly to that field in the profile editor. **The readiness score never blocks or gates any paid feature (resume optimization, cover letter, etc.) — it is a nudge/guide only.** A user can optimize a resume from a partially complete profile at any time.

## 5. MVP scope — what ships in Phase 1 (this is the ONLY thing Hermes builds first)

**Core paid flow:** User builds their Career Profile (Section 4) → system generates a Gulf-formatted, optimized resume reframed for the target job/country/client standard in the profile → user pays → downloads → package auto-saves to the Library (Section 5a) for future access.

**Explicitly OUT of MVP scope (deferred, do not build yet):**
- Free ATS Score tool → Phase 2
- Cover letter generator → Phase 3 (built on the same Career Profile once it exists)
- Mock interview (speech input + AI review) → Phase 4 (highest complexity item in the whole roadmap — do not start until Phase 1-3 are live and paying)
- Blog/content engine, salary calculator, EOSB calculator → Phase 3+
- Multi-language support, native mobile app → not planned for v1
- Full manual profile-editing UI (rich drag-and-drop editor, granular field-by-field builder) → MVP uses auto-extract + simple review/edit only; a fuller profile editor can come later if users ask for it

## 5a. Dashboard & Library — the retention engine

**Why this exists:** Gulf hiring/shortlisting is often slow and unpredictable — a candidate applies to many roles with different job descriptions, and by the time a recruiter calls back weeks later, they've lost track of what they sent or how to defend it in an interview. The Library solves this: every optimization run becomes a saved "package" the user can return to when that call finally comes.

**Package contents (schema, not all populated in MVP):**
- Optimized resume — stored as structured data (not a flat file), re-rendered into the resume template whenever the user opens it, so it stays editable/downloadable anytime
- Job title + job description it was optimized against (if provided)
- Status — Applied / Shortlisted / Interview / Visa Processing / Offer (simple user-editable dropdown; MVP)
- ATS score card, cover letter, mock interview Q&A + review — schema slots exist from day one so nothing needs rework later, but these stay empty/null until their respective phases (2, 3, 4) actually generate them

**Dashboard:** once the Career Profile is complete (or partially complete — never gated, per 4f), the user lands on a dashboard from which they can start any available service (resume optimization now; ATS check, cover letter, mock interview as those phases ship) and access their Library of saved packages. User can delete a package at any time.

**Multiple generations per package (once Phase 3/4 features exist):** cover letter, Q&A, and mock interview generation are each repeatable on-demand within the same resume package — a user can generate several cover letters or run several mock interviews off one optimized resume, since they're applying to related-but-different postings. Each generation is a trackable/billable action tied to the package, not a one-time inclusion — the data model should log generation count per package from day one (cheap to add now, expensive to retrofit), even though the features themselves (cover letter, Q&A, mock interview) aren't built until their respective phases.

**Reuse detection when starting a new optimization (MVP-lite version):** before creating a new package, check whether the user's Library already has a package with a similar target job title. If so, prompt a simple choice — "Create a new package, or use your existing [Job Title] package?" — rather than always showing a full browse list. If no similar target exists, proceed straight to creating a new package. This is a manual/rule-based title comparison for MVP, not automated matching. **Automated %-match ranking against a new job description is a Phase 2 feature**, built once the ATS Score engine exists (same underlying similarity-scoring logic, no need to build it twice) — do not attempt automated matching in MVP.

**MVP scope for this section:** package auto-save + template re-render + simple status field, built alongside the core optimizer (Section 5), plus the manual reuse-pick list above. The ATS score card visual, cover letter, and mock interview data — and automated match-ranking — remain scoped to their existing phases (2/3/4).

## 5b. Admin Panel (MVP scope)

Founder-only access, one screen, deliberately minimal — this is operational tooling, not a second product to build. Includes:
- **Users list** — searchable by phone/email, shows profile completeness, signup date, link into their Library packages (for support troubleshooting)
- **Payments view** — transaction list and status, read-only; actual refunds are issued through Razorpay's own dashboard, not rebuilt here
- **Manual credit grant** — button to grant a user a free optimization (the fix for "I paid but something broke" support cases)
- **Rate-limit override** — reset or raise a user's daily extraction limit (Section 5c) if they're legitimately blocked rather than abusing it
- **PII access log viewer** — shows when/who viewed a user's sensitive profile data (see Section 9)

No analytics dashboards, bulk actions, or role/permission management in MVP — single founder-admin only. Expand only once volume or support load actually demands it.

## 5c. Abuse and cost protection

Every AI extraction/optimization costs real API money, so unlimited free usage is a real cost risk, not just an abuse edge case. **A simple daily rate limit per user (phone/email) applies to free actions (profile extraction attempts) from day one** — cheap to build now, expensive to retrofit after abuse has already cost money. Limit value itself (e.g. X attempts/day) can be tuned after launch; the mechanism must exist at launch.

## 5d. Support

**Support channel for MVP: email**, monitored directly by the founder. No in-app ticketing system or chat widget for Phase 1 — a real, checked inbox is sufficient at this scale and avoids building support infrastructure before there's support volume to justify it.

## 5e. Technical infrastructure (resolved)

- **Supabase** handles the Database, Authentication, and File Storage (uploaded resumes, photos, generated documents) — chosen over self-hosting these on the VPS because the Career Profile contains the platform's highest-sensitivity data (passport, visa, phone numbers, per Section 9), and a managed service with security best practices built in is the responsible choice for a non-technical solo founder, not just the easier one.
- **Hostinger VPS** hosts the running application only — it does not handle the database, auth, or file storage.
- **Resume PDF generation:** the resume renders as HTML using the same template/CSS as the on-screen preview, then converts to PDF via a headless-browser renderer — this guarantees the downloaded file matches what the user actually saw, including correct behavior for the field-visibility toggles (Section 4b), rather than risking a second, inconsistent rendering path.
- **DOCX generation:** a separate library maps the same structured resume data into a Word document — same underlying data, different output format, not a second content pipeline.

## 6. User flow (MVP only)

1. Landing page → "Optimize My Resume for the Gulf Job Market" CTA (open messaging, not persona-specific)
2. User chooses how to start: upload resume/LinkedIn PDF, paste resume text, or fill manually (Section 4e) → AI extracts data into the Career Profile structure where applicable (Section 4)
3. Career Profile review/edit screen: user confirms or corrects fields, sees their readiness score (Section 4f) and can jump to any incomplete field, adds status (currently in Gulf: yes/no) and target (job title, target country/client standard)
4. Profile saved → user selects target job title + industry, target country (required), and optionally enters a target company and/or pastes/uploads the target job description (JD improves match quality but is not required — falls back to title + industry + country-level optimization if omitted) → user chooses which blocks to optimize (or one-click "Optimize All") and an optimization level (Easy/Moderate/High, Section 4a) → system processes → shows a preview/summary of what will change in the optimized resume (exact free-preview content: TBD, see Open Decisions)
5. Payment via Razorpay (one-time, ₹499 starting price — validate and adjust after first 10 sales)
6. Full optimized resume unlocked → download as PDF/DOCX → package auto-saved to the Library with status "Applied" (user can update status anytime)
7. Post-purchase: dashboard shows the Library; user can start another optimization for a different job (new package) or revisit an existing one — since the profile is already saved, re-optimizing for a new target should be fast/no re-upload needed (sets up future subscription model, not built yet — just the prompt)

## 7. Pricing (MVP)

- One-time: ₹499 per optimized resume (Razorpay, INR — primary audience is India-based)
- No subscription tier yet — introduce only after Phase 1 proves conversion
- No free tier yet — the free ATS score (Phase 2) becomes the free entry point later; MVP sells directly

## 8. Design direction

Reuse the established visual language from the founder's other GCC-focused work: premium, minimal aesthetic inspired by Apple/Stripe/Linear/Notion/Framer; GCC-inspired palette (desert sand, Arabian gold, deep emerald, midnight navy, white marble), avoiding flag imagery; clean typography (Google Fonts). Should feel credible and premium, not like a generic job-board template — this is a trust signal given how much scam activity exists in this exact market.

## 8a. UX principles — what makes this feel different and "wow"

Given this market is trust-starved more than feature-starved (real scam activity documented against this exact audience), the priority order is: **credibility and transparency first, polish second.** Concretely:

- **Trust signals up front:** transparent pricing (no hidden fees), a real founder story, clear payment security — before anything flashy
- **Two co-equal "wow" moments, both built with real care (not one at the expense of the other):** (1) a live before/after view of the resume transformation, changes visually highlighted, not just a text dump; (2) the Readiness Score as a satisfying visual (progress ring, not a bare percentage) that gives the user a small sense of accomplishment while completing their profile
- **Speed as a feature:** target under 60 seconds from "optimize" click to preview — perceived speed is itself part of the premium feel at this price point
- **Mobile-first, not mobile-adapted:** most of this audience will use the platform primarily on a phone — layouts, forms, and the resume download must work cleanly on mobile browsers as the default assumption, not an afterthought. A "share to WhatsApp" option on results is worth strong consideration given how this audience already communicates.
- **Light personalization touches:** addressing the user by name, referencing their actual target company by name in UI copy (e.g. "Optimizing for QatarEnergy...") — small to build, disproportionately impactful on how "made for me" the product feels

## 9. Non-negotiable rules (apply to every phase)

- **Payment and security-sensitive work is always flagged "Needs Review" and is never self-assigned by Hermes.** Claude Code or the founder must review before it goes live.
- **No feature outside the current phase's scope gets built early**, even if it looks quick — scope creep is the single biggest risk to hitting revenue in 90 days.
- **Every task lives in docs/TASKS.md.** If it's not written there, it doesn't happen.
- **Career Profile data (contains PII — passport/visa status, phone numbers, addresses, full work history) must never be logged in plaintext, exposed in client-side code, or stored without a clear retention/deletion policy.** This is the highest-sensitivity data store in the product — flag it explicitly to Claude Code when the storage layer is built, and treat any profile-storage task as "Needs Review" by default alongside payment tasks. Any time this data is viewed via the Admin Panel (Section 5b), it must be recorded in the PII access log — who viewed it and when.

## 9a. Open Decisions (not yet finalized — do not build around a guess)

- **Free vs. paid preview content:** exactly what's shown before payment (a change-summary list vs. a watermarked/blurred full preview) is undecided. Claude Code should build the payment gate itself but leave the pre-payment preview content as a simple placeholder until this is resolved.
- **Package/batch rules:** whether one payment always equals one job-target package, or whether a batch option (optimizing for several target roles at once) gets introduced, is still undecided (re-optimizing an *existing* package now has a defined behavior — see Section 4a — this item is specifically about multi-target batching). The Library data model (Section 5a) should not assume either answer is final.
- **Pricing model evolution:** now that multiple generations per package (Section 5a) and reuse-detection are part of the plan, one-time-per-optimization pricing (Section 7) may not fit well once Phase 3/4 features ship — a usage-based or subscription model may make more sense once cover letter/Q&A/mock interview generation are repeatable actions. Not a Phase 1 decision, but worth revisiting once those phases approach.
- **Product name:** not yet decided. Claude Code should use a placeholder ("[Product Name]") in generated docs/UI copy, not invent or lock in a name.
- **Login method:** not yet decided. Founder is weighing Mobile+OTP (best fit for the audience, but has a real per-SMS cost) against Google login and Email+OTP (both cheaper, no SMS gateway needed). Claude Code should build the auth layer in a way that isn't hard-locked to one provider until this is resolved — do not default to Mobile+OTP just because it was the earlier recommendation.
- **Business/operational setup (raised separately, not yet locked in):** user authentication method (mobile OTP vs email vs Google — still weighing SMS cost), Razorpay KYC/business setup timeline, Privacy/Terms/Refund policy content are all still open — flagged here so they aren't silently decided by default during implementation. **Resolved:** Supabase handles Database + Auth + File Storage; Hostinger VPS only hosts the running app (Section 5e). Resume/DOCX PDF generation uses HTML-to-PDF rendering from the same template/CSS as the on-screen preview (Section 5e).

## 10. Roadmap after MVP (sequenced, not simultaneous)

- **Phase 2 (Week 2-3):** Free ATS Score tool (lightweight keyword-match version, can read from an existing Career Profile if one exists) as the top-of-funnel hook feeding the Phase 1 paid optimizer; resume version history within a package (Git-like, keeping past optimization runs instead of overwriting — deferred from MVP per Section 4a reasoning)
- **Phase 3 (Month 2):** Cover letter generator (paid add-on, generated from the same Career Profile), blog content + SEO pages, salary/EOSB calculators
- **Phase 4 (Month 2-3+, funded by revenue from Phase 1-3):** AI-generated interview questions from the Career Profile + optimized resume, speech-based mock interview with AI review — the most complex and most differentiated feature; do not start until earlier phases are live and generating revenue

---

## Instructions for Claude Code

**Step 0 — Audit before building.** Before creating any new files, review the existing codebase (the resume builder/optimizer/cover letter generator already built locally) against this brief. Produce a plain-language gap report covering: (a) what already matches the brief and needs no change, (b) what exists but needs to change to match a decision in this brief (e.g. field structure, optimization scope, target-selection fields), and (c) what's specified in this brief but doesn't exist yet in the codebase. Do not modify any code in this step — report only.

**Step 1 — Generate the doc set.** After the audit is reviewed, read this brief in full and create the following files in `/docs/` in the (new) repo, committing and pushing each:

- `PRODUCT.md` — sections 1-3 above, expanded with any relevant technical context from the existing codebase
- `CAREER_PROFILE.md` — section 4 (including 4a-4f), as a concrete data schema (field names, types, required vs optional, visibility-toggle flags, the "Additional Information" catch-all, and the readiness-score category/weighting logic) suitable for implementation
- `PROMPTS.md` — section 4c and 4d, as concrete prompt-engineering specs (persona templates by industry, the grounding instruction verbatim, notes on the Phase 4 claim-extraction design)
- `DASHBOARD_LIBRARY.md` — section 5a, as a concrete package/data schema (including the empty slots for ATS score/cover letter/mock interview fields) and dashboard structure
- `ADMIN.md` — sections 5b, 5c, and 5d, as a concrete spec for the admin screen, the rate-limit mechanism, and the support workflow
- `INFRASTRUCTURE.md` — section 5e, as a concrete technical setup spec (Supabase project structure, VPS deployment target, PDF/DOCX generation approach)
- `MVP.md` — section 5 (including 5a-5e), broken into a clear technical scope with explicit "in" and "out" lists
- `USER_FLOW.md` — section 6, as a step-by-step technical flow (screens/states/API calls as applicable)
- `DESIGN.md` — sections 8 and 8a, plus any concrete design tokens (colors, fonts) already established in the existing codebase
- `RULES.md` — section 9, verbatim, as the non-negotiable constraints for any contributor (human or AI)
- `ROADMAP.md` — section 10, as a phased backlog (not yet broken into individual tickets)
- `TASKS.md` — break Phase 1 (MVP: Career Profile + resume optimizer) only into individual, executable tickets in this format:
  ```
  ## Backlog
  - [ ] TASK-001: <short title>
        Spec: <precise instructions Hermes can execute without further clarification>
        Status: not started

  ## Blocked / Needs Review
  (payment/security/profile-storage tasks go here by default)

  ## Done
  ```
  Do not create tickets for Phase 2+ yet — only Phase 1.

After creating and pushing these files, report back a summary of what was created so it can be reviewed before Hermes begins execution. **Do not resolve any item listed in Section 9a (Open Decisions) on your own — build the surrounding structure (e.g. the payment gate, the Library data model) in a way that doesn't lock in an unmade decision, and flag it back in your summary if you hit a point where you need one of those answers to proceed.**
