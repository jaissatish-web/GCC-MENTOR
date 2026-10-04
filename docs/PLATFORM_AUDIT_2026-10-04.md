# PLATFORM AUDIT — 2026-10-04 (signed-in app, mobile first)

**Founder brief:** analyse the whole platform — code, user experience, every service,
security — for Gulf job seekers, most of whom are on phones. Make a prioritised list.
Minor post-login fixes allowed; the landing page and AI-call control are separate
conversations.

**How it was checked:** code read route by route; the repo's 34 checks; the production
build; and a real Chromium walk of 12 signed-in pages at 390×844 (iPhone width) with a
local stand-in for login and mocked profile/job data, measuring every visible text size,
form field, tap target and horizontal overflow, plus screenshots.

**What could NOT be checked here:** no live AI key, database or storage in this
environment, so no fresh AI generation, PDF render, upload or payment was run end to end.
AI quality is judged from prompts, validators and the existing grounding checks (all
pass), not from new outputs. `/package/[id]` (server-rendered) and the admin screens were
read in code only. Production state (migrations, env vars) cannot be seen from here.

---

## 1. The Gulf job seeker's pain points — and how GCC MENTOR answers them

| # | Pain point | Platform today | Verdict |
|---|---|---|---|
| 1 | CV not in Gulf format (photo, DOB, nationality, visa, notice period, passport) | 15 templates; per-field "what appears on your CV" (Profile settings) | **Solved** |
| 2 | Rejected by ATS / keyword filters, one generic CV for every job | Optimizer per target job with before/after match score | **Solved** |
| 3 | Fear of being caught with invented claims | Grounding rule + validators on every AI output; "kept only if you confirm" | **Solved — the main differentiator** |
| 4 | Paperwork confusion (degree attestation, DHA/DOH/SCFHS/SCE licences, Saudi QVP/SVP, passport validity) | Gulf Readiness paperwork steps with the real process | **Solved, rare in the market** |
| 5 | Interview fear (phone/WhatsApp HR rounds, technical panels) | Interview Q&A + voice mock interview with report | **Solved** |
| 6 | Scam agents, low trust | No fake reviews, honest "not live yet" labels | **Partly** — trust signals belong on the landing page (later) |
| 7 | *Where are the jobs? What should I apply to?* | Not in scope — user brings the job | **Gap** (biggest unmet need; also the strongest daily-return reason) |
| 8 | *What salary / package to ask for* (basic + housing + transport, by country) | Not covered | **Gap** |
| 9 | Language confidence (many users read English as a second language) | Plain-word copy on new screens; English only | **Partly** — no Hindi/Malayalam/Arabic help text |
| 10 | Phone-only users, patchy data | Mobile layout, no horizontal scroll; first load ~170 kB | **Good**, text size now fixed (see §3) |

---

## 2. Security — verified and found

**Verified OK (code + checks):**
- Every API route authenticates first (401 otherwise); every route that uses the
  service-role key also filters by the signed-in user; voice routes check ownership
  through the user's own session.
- Cron routes use a constant-time secret check.
- CV uploads are size-limited (PDF 4 MB, DOCX 2 MB); photos are in a private bucket.
- No personal-data values in logs (searched).
- Every AI route except one goes through `reserveAiAction`: founder pause switch,
  per-user daily allowance, concurrency cap, optional global cap, fails closed, a failed
  call costs the user nothing. Every model call is written to `ai_usage_log` with tokens
  and estimated cost.
- `verify-db-security.mjs` passes (local harness, not production).

**Found (recorded in `14_OPEN_ITEMS.md` §S, not fixed — the working agreement says
security is reported, then fixed by decision):**

| ID | Finding | Risk | Fix size |
|---|---|---|---|
| **S1** | **No HTTP security headers anywhere** — no `X-Frame-Options`/`frame-ancestors` (the signed-in pages, including Settings → delete data, can be framed: clickjacking), no `X-Content-Type-Options: nosniff`, no `Referrer-Policy`, no `Permissions-Policy` (should allow microphone for the mock interview only) | Medium | Small — one `headers()` block in `next.config.mjs` |
| **S2** | **PDF routes start headless Chromium on every request with no per-user limit** (`/api/resume/pdf`, `/api/packages/[id]/pdf`) — a signed-in user can loop it and run up Vercel compute | Medium-low | Small — a daily/minute limit like the AI routes |
| **S3** | **Typical duties calls the AI outside the guard** (`/api/profile/typical-duties`): no admin pause, no concurrency cap, and a check-then-count race (parallel requests can exceed 30/day) | Low-medium | Small — switch to `reserveAiAction` |

Still open from earlier audits and not verifiable from here: R-1 (migrations 049+ on
production), R-2 (`CRON_SECRET` set in Vercel), R-3 (a signed-in walk on a preview
deployment), A0 (paid locks are off — everyone can use every AI service free).

---

## 3. Mobile — measured, and what was fixed tonight

Measured at 390px on 12 signed-in pages (dashboard, library, profile overview / readiness /
full profile, add target job, optimizer setup, cover letter, interview Q&A, mock interview,
templates, settings).

| Measure | Before | After (commit `fc45aaf`) |
|---|---|---|
| Text under 12px | 6 labels (mock interview, 10px) + 10–11px in the mock report | **0** |
| Share of text at 12px | 26–73% per page (profile 42%, add target job 73%) | **0%** — 13px minimum on phones |
| Form fields under 16px (iPhone zooms the page on tap) | 1 — Library "Application stage" (13px) | **0** |
| Tap targets under 40px | 2 standalone links (20px tall) | **0** |
| Horizontal scroll | none | none |
| Page errors | none | none |

**What changed:** on phones only (< 640px) inside the app shell, small text steps up one
size (10/11 → 12, 12 → 13, 12.5 → 13.5). Desktop, the public site and the CV templates
are unchanged. The stage picker is 16px on phones. Two links got 44px tap areas. Pushed
to `claude/sweet-cannon-hum04t`, **not yet on `main`**.

---

## 4. The list — what to optimise next, in order

### P1 — do first (high value, small effort)
1. **Put tonight's mobile text fix live** (merge `fc45aaf` to `main`).
2. **Security headers (S1)** — one config block. Allow the microphone only where the mock
   interview needs it.
3. **Limit the PDF routes (S2)** and **move typical duties under the AI guard (S3)** — so
   *every* AI call obeys the admin pause and the counts.
4. **Set global daily caps in `/admin/services`.** Allowances count *uses*, not model
   calls, and with the paid locks off the per-user ceiling is large. At today's defaults
   one user could trigger roughly **~500 model calls a day** (e.g. one Interview Q&A use =
   5 calls; one 10-question mock interview ≈ 1 start + 10 transcriptions + 10 reviews +
   1 report ≈ 22 calls; one optimization ≈ 2–3). This is the AI-control conversation.
5. **Soften the red "Card checkout is not live yet" line in the in-app footer.** It shows
   in alert red at the foot of every signed-in screen on a phone; in a scam-wary market,
   red text that mentions payment on every page reads as a warning. Keep it honest, make
   it neutral, or show it only where prices appear.

### P2 — simplify (make it easier to understand)
6. **Show the profile explainer card once.** It takes about one phone screen on every
   visit; after the first, fold it to one line ("Your profile is the base for everything
   we make — how it works").
7. **Shorten the Gulf Readiness screen on phones** (≈5 screens). Open with the verdict and
   the next 3 actions; fold "score by area" and "working in your favour" behind a tap.
8. **Gulf Readiness score card on the overview:** the verdict ("Almost ready — 2
   paperwork steps to check") and the line under it ("2 paperwork steps · 8 profile
   fixes") repeat each other; keep one.
9. **Two numbers, one meaning per screen.** Profile complete (%) and Gulf Readiness
   (/100) are both labelled, but the dashboard, profile header and overview show both
   several times. Consider the dashboard showing only the one that has a next action.
10. **Desktop sidebar truncates "Resume Optimizer"** ("Resume Opti…") next to the "Next"
    tag.

### P3 — new value (bigger, decide first)
11. **Job leads** — the top unmet need (§1 #7): even a curated weekly list per trade and
    country, or "paste a job link" from WhatsApp groups, gives users a reason to return.
12. **Salary guide by role and country** (§1 #8) — allowances explained (housing,
    transport, flights), for negotiation.
13. **Help text in the user's language** (Hindi / Malayalam / Arabic) for the profile and
    paperwork steps — the CV stays English.
14. **Re-apply the paid locks (A0)** with the pricing decision (R-4), which also caps cost.

### Verify on the live site (cannot be done from here)
15. A real signed-in walk on a phone: upload CV → profile → optimize → PDF download →
    cover letter → Q&A → voice mock → report. This is R-3, still open.
16. Confirm R-1 / R-2 on production.
