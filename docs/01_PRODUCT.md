# PRODUCT — what GCC MENTOR is, and what it can actually sell today

---

## 1. In one paragraph

A Gulf-focused career platform. A user builds **one structured Career Profile**,
then generates a Gulf-format resume rewritten for a specific target job, country
and employer — **using only facts already in their profile**. The AI never
invents anything. Alongside that, two free scores tell the user where they stand:
how ready their profile is for the Gulf market, and how well they match one
specific job advert.

The product name is **GCC MENTOR**. Never use "HireCircuit" in user-facing copy —
that was an earlier, differently-specified build, now archived outside this
repository.

---

## 2. Who it serves

**Every Gulf-focused job seeker. No segment is turned away.** That includes
people with no Gulf experience yet, people with Indian or other domestic
experience trying to break in, people already in the Gulf who want their next
assignment, and people already in the Gulf who want a step up.

There is no qualifying screen and no "this tool is for X" gate. The product
personalises through the Career Profile — which persona the AI adopts, which
readiness weighting applies — but it never restricts access based on what the
profile contains.

---

## 3. Why trust is the product

This market is **trust-starved more than feature-starved**. There is documented,
active scam behaviour targeting exactly this audience: agents who take money for
Gulf placement and disappear.

Two consequences that shape every build decision:

1. **Credibility comes before polish.** Transparent pricing, a real founder
   story, visible payment security and the "nothing invented" promise are
   primary product surface — not footer content.
2. **The grounding rule is a trust feature, not only a safety feature.** "The AI
   never invents a fact you didn't give us" is the strongest differentiator
   available in a market where the competition fabricates. See
   [`02_PHILOSOPHY.md`](02_PHILOSOPHY.md).

---

## 4. What is live today

Everything in this section is built, deployed and working.

**Free, no login required**
- Upload or paste a resume and get a **GCC Readiness** score with strengths and
  improvements — fully deterministic arithmetic, no model call, sub-second.
- Paste a job description with it and get a **Job Match** report against that
  specific advert.
- The scan is kept for 7 days against a signed cookie, so signing up afterwards
  carries the extracted data across with no second upload.

**Free, signed in**
- **Career Profile**: extract from a PDF, DOCX or pasted text, then review and
  correct. Re-uploading a CV later merges rather than overwriting hand-typed
  data.
- Per-field visibility control over what appears on a CV.
- Profile photo upload, stored privately.
- **15 resume templates**, adjustable font, size and accent colour on 13 of them.
- Hard-delete of all personal data from Settings.

**Paid**
- **Resume optimization**: the AI rewrite — a Gulf-format resume reframed for one
  target job, at Easy / Moderate / High framing intensity, grounded strictly in
  profile facts, with a before/after diff and user text editing.
- **PDF download** of the delivered document.
- **Cover letter** generation for a paid package, consuming a service credit.

**Admin**
- Users, packages and payments views; AI provider and per-feature model config;
  prompt template viewer; promo codes; service packages; manual credit grants;
  the free-plan control panel; and a PII access log recording every admin view of
  a user's profile.

---

## 5. What is NOT live, stated plainly

**There is no working checkout. This is the single biggest business blocker.**

Razorpay integration is blocked and not by a technical problem: the founder is
based in Saudi Arabia and Razorpay's KYC is India-only. The payment screen shows
Razorpay as an honestly-disabled "coming soon" section rather than a dead button.

**The only two ways a customer can pay today:**
1. A **promo code** the founder issues by hand, redeemed on the payment screen.
2. An **admin credit grant**, applied from the admin panel.

Both are real, atomic, server-side and logged. Neither is self-serve. Until a
payment provider that works from Saudi Arabia is chosen and integrated, the
product cannot take money from a stranger without the founder being involved in
the transaction.

**Also not live:**
- **The free resume tier is built but unreachable.** The access gate, the
  one-per-user quota and the admin control panel all exist and are verified.
  There is no route that creates a free resume, no entry point in the UI, and the
  Library neither lists nor labels them. The admin screen says "not live yet" on
  its face for exactly this reason.
- **The Word (DOCX) download is withdrawn.** The route still exists; nothing
  links to it. It was withdrawn because its output did not match what the screen
  showed.
- The two **bundle price tiers** are real prices with no checkout behind them.

---

## 6. Pricing, as it really is

Prices live in a `pricing` table the founder edits directly in Supabase — no
redeploy, no admin screen. Code carries a fallback matching the seeded row so the
landing page cannot break; the database always wins.

| Tier | Price | Self-serve checkout? |
|---|---|---|
| Free — GCC Readiness scan, Job Match | ₹0 | n/a |
| **Resume Optimization** (single resume) | **₹499** | No — promo code or admin grant only |
| Resume + Cover Letter (bundle) | ₹999 | No |
| Complete Package | ₹2,499 | No |

The single ₹499 tier is the only one the product has any purchase path for at
all, and even that path is manual. The two bundles are marked "coming soon" on
the landing page rather than shown as working buttons.

**Long-term pricing model is deliberately undecided** — one-time versus usage
versus subscription. The data model stays neutral so tiers can be added without a
migration.

---

## 7. Planned, and deliberately accommodated

These are **future services, not banned ideas**. The design system must be able to
absorb them without a rebuild, and they may appear as honest "Planned" tiles —
never as nav items, never with invented data behind them.

- Mock Interview (speech-based, with AI review)
- Interview Q&A / interview preparation
- Saved Jobs

Config rows already exist for the two AI-backed ones so they can be switched on
without a migration, and nothing calls them.

---

## 8. Explicitly excluded

Not built, not accommodated, not to be added without an explicit decision:

- A job board, job listings or external job integrations
- A resources / content library
- Notifications
- A premium subscription tier
- One-click apply
- Multi-language support, native mobile app

The **Job Match** feature is not a job board. It scores a resume against one job
description the user pastes in. It never sources, stores or lists jobs.

---

## 9. What "finished" would mean

The product is not finished until all six are true. Three are.

| | Condition | State |
|---|---|---|
| 1 | A user can go from landing page to a downloaded, optimized PDF without founder intervention | **No** — payment requires the founder |
| 2 | A real payment has been processed by a live provider | **No** — blocked on the provider decision |
| 3 | The grounding validator runs on every generation path and blocks unvalidated output | **Yes** |
| 4 | Templates render correctly across every show/hide combination, including at 390px | **Yes** — proven by an exhaustive 32,768-combination baseline |
| 5 | The admin panel can resolve an "I paid but something broke" case | **Yes** |
| 6 | A user can delete all their data | **Yes** |

Conditions 1 and 2 are the same blocker: **choosing a payment provider that works
from Saudi Arabia.** That is a founder decision, and it is currently the item
standing between this product and revenue.
