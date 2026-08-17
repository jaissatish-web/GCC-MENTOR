# MVP.md — Phase 1 Technical Scope

Source: Founding Brief §5, §5a–§5e.

**This is the only thing being built right now.** Anything not on the IN list is out — see `docs/RULES.md` §4.

---

## 1. The core paid flow

> User builds their Career Profile → system generates a Gulf-formatted, optimized resume reframed for the target job / country / client standard in the profile → user pays → downloads → package auto-saves to the Library for future access.

---

## 2. IN — Phase 1 scope

### Career Profile layer
- `career_profiles` table + child tables (work experience, skills, certifications, education, additional information)
- Per-field visibility toggles with country context
- Three onboarding paths converging on one profile editor
- AI extraction from PDF / DOCX / LinkedIn export / pasted text
- Review-and-correct screen (not a long manual form)
- "Additional Information" catch-all — one section, one toggle
- Readiness score with auto-derived category weighting, never gating
- Hard-delete of profile and all packages from Settings

### AI layer
- Provider interface (`lib/ai/provider.ts`) — Claude, swappable
- Grounding constant, verbatim, imported everywhere
- Persona library: 3 curated + 1 fallback
- Optimization levels Easy / Moderate / High, applied globally per run
- Risk indicator in the UI at Moderate and High
- Block selection + one-click "Optimize All"
- Skills/certifications relevance reordering (automatic, never reworded)
- Post-generation grounding validator — mandatory on every path

### Output
- **ONE** polished, premium Gulf-format template with solid conditional rendering
- Template must render correctly for **every** combination of shown/hidden fields — no empty gaps, no broken alignment
- Before/after diff view, per block, word-level highlighting ("Wow #1")
- User editing of AI-generated text before download
- PDF via headless Chromium from the same template/CSS as the preview
- DOCX from the same structured data
- Share to WhatsApp

### Library & dashboard
- `packages` table with Phase 2–4 slots reserved and null
- Package auto-save on payment, template re-render on open
- Status dropdown: Applied / Shortlisted / Interview / Visa Processing / Offer
- Rule-based reuse detection on similar target titles
- Generation count logged per package
- Dashboard service grid with Phase 2–4 services shown locked
- Package delete

### Payment
- Razorpay one-time, ₹499, INR
- Payment gate implemented; **pre-payment preview content left as a placeholder** — open decision
- **Every payment ticket is "Needs Review". Never self-assigned.**

### Operations
- Admin panel: users list, payments view (read-only), manual credit grant, rate-limit override, PII access log viewer
- Daily rate limit per user on free actions (extraction attempts)
- `ai_usage_log` for cost tracking
- `pii_access_log` for admin reads
- Email support — a real inbox, monitored by the founder

---

## 2a. Phase 2 pulled forward — founder decision 2026-08-07

**Two Phase 2 items are now active, in parallel with finishing Phase 1** (not
waiting for Phase 1 to ship first, a deliberate change from this file's
original sequencing). Founder's own words: users should be able to run the
free ATS/Gulf-readiness scanner **without logging in** from the homepage;
optimizing still requires login as before. Everything else in Phase 1 stays
exactly as speced — this is additive, not a re-scope of the paid flow.

- **Free ATS Score tool, no login required.** Upload a resume, get an
  ATS/Gulf-readiness score. Archived code exists at
  `D:\Hire Circuit\app\api\ats-check\` — **must be rewritten against
  `docs/PROMPTS.md`'s grounding rule before reuse; it was built without one**
  (§4 below still applies). New wrinkle this introduces: **no-login means no
  `user_id` to rate-limit against** — `lib/rateLimit.ts` is keyed on
  authenticated users today. Needs an IP-based (or similar) limit for this
  one anonymous path; do not just skip rate-limiting because the mechanism
  doesn't fit yet.
- **Multiple selectable templates.** Today only `GulfPremium` exists
  (TASK-031, one-template-by-design). Archived templates exist at
  `D:\Hire Circuit\components\templates\` — port their layout/visuals, but
  every template must go through the SAME `lib/resumeDocument.ts` derivation
  TASK-032 already built (that's the whole point of that refactor: one
  derivation, N renderers, never N re-derivations). Do not copy a template's
  original data-shaping logic along with its visuals.

Not pulled forward: automated %-match ranking against a JD stays OUT (needs
the ATS engine's scoring logic to exist first, and is a separate, harder
feature than the basic score check above — see `docs/ROADMAP.md`).

---

## 3. OUT — do not build

| Feature | Phase |
|---|---|
| Resume version history within a package | 2 |
| Automated %-match ranking against a JD | 2 |
| Per-field toggles inside Additional Information | 2 |
| Cover letter generator | 3 |
| Blog / content engine, salary calculator, EOSB calculator | 3+ |
| Interview question generation | 4 |
| Speech mock interview + AI review | 4 |
| Multi-language support, native mobile app | Not planned for v1 |
| Full manual profile-editing UI (rich drag-and-drop, granular field-by-field builder) | Later, only if users ask |
| In-app ticketing or chat support widget | Later |
| Analytics dashboards, bulk admin actions, role/permission management | Later |
| Job board / external job integrations | Not planned |
| One-click apply | Not in the brief at any phase |

---

## 4. Archived code — the Phase 2–4 parts bin

Out-of-scope features from the earlier HireCircuit build are **not in this
repository at all.** They live in a permanent archive at `D:\Hire Circuit`,
untouched.

This is deliberate. A cheap coding agent working in a folder full of
differently-specified code will copy those patterns regardless of what the docs
say. Physical separation removes that risk entirely.

| Feature | Archive location | Harvest in |
|---|---|---|
| ATS checker | `app/api/ats-check/`, `app/dashboard/ats-checker/` | Phase 2 |
| 12 extra resume templates | `components/templates/` | Phase 2 |
| Cover letter | `app/api/cover-letter/`, `app/dashboard/cover-letter/` | Phase 3 |
| Market insights + seeded salary data | `app/dashboard/market-insights/`, `market_insights` + `job_disciplines` tables | Phase 3 |
| Interview prep | `app/api/interview-prep/` | Phase 4 |
| Mock interview | `app/api/mock-interview/` | Phase 4 |
| One-click apply | `app/api/apply-for-job/` | Never — not in the brief at any phase |

**Rules while working in Phase 1:**

- Do not copy anything from the archive into this repository without a ticket saying so.
- The only pre-approved carry-overs are already in `reference/` — see `reference/README.md`.

> 🚨 **Note for whoever builds Phase 2+:** every AI route in that archive was written **without the grounding rule**. Its optimizer prompt was a single sentence with nothing preventing fabricated certifications or numbers. **They must be rewritten against `docs/PROMPTS.md` before reuse.** Do not assume any of it is safe to switch on.

---

## 5. Abuse and cost protection

Every AI extraction and optimization costs real API money, so unlimited free usage is a genuine cost risk — not just an abuse edge case.

**A simple daily rate limit per user applies to free actions (profile extraction attempts) from day one.** Cheap to build now, expensive to retrofit after abuse has already cost money.

- Keyed on user ID; secondary key on phone/email to survive account cycling
- Limit value is configurable and tunable after launch. **The mechanism must exist at launch.**
- Admin can reset or raise a user's limit if they are legitimately blocked rather than abusing it
- Paid actions are not rate-limited — they are self-limiting

---

## 6. Support

**Support channel for MVP: email**, monitored directly by the founder.

No in-app ticketing system or chat widget in Phase 1. A real, checked inbox is sufficient at this scale and avoids building support infrastructure before there is support volume to justify it.

The founder's support commitment — "replies within a day" — appears in the UI as a trust signal.

---

## 7. Pricing

- One-time **₹499** per optimized resume (Razorpay, INR — primary audience is India-based)
- No subscription tier yet — introduce only after Phase 1 proves conversion
- No free tier yet — the free ATS score (Phase 2) becomes the free entry point later; **MVP sells directly**
- Validate and adjust after the first 10 sales

**Status: the founder has deferred a final decision on the long-term pricing model.** MVP ships one-time ₹499 as specified. The data model must stay neutral so tiers or usage-based pricing can be added later without migration. The existing `subscriptions` table is unused in MVP but is not dropped.

---

## 8. Definition of "MVP complete"

1. A user can go from landing page to downloaded, optimized PDF without founder intervention.
2. Razorpay is live and has processed at least one real payment.
3. The grounding validator runs on every generation path and blocks unvalidated output.
4. The single template renders correctly across every show/hide combination on a 390px viewport.
5. The admin panel can resolve a "I paid but something broke" case.
6. A user can delete all their data.
