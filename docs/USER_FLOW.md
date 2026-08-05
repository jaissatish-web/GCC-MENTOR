# USER_FLOW.md — MVP Flow, Screen by Screen

Source: Founding Brief §6, mapped to the approved design mockups.

Screen numbers match the mockup set. **Mobile-first at 390px** — every screen is designed at phone width first, then widened.

---

## Step 1 — Landing *(screens 01, 01b)*

**Route:** `/`

CTA: **"Optimize My Resume for the Gulf Job Market"** — open messaging, not persona-specific.

Above the fold on a 390px viewport, all of: hero, price (₹499), and three trust signals — Razorpay secured payment · passport & visa data encrypted · nothing invented, ever.

Price appears in the hero, **not behind a funnel**. The founder story and the grounding promise are primary trust copy, not footer content.

---

## Step 2 — Choose how to start *(screen 02)*

**Route:** `/onboarding` · progress 1/5

Three options, all with 44px+ hit targets:

| Option | Badge | Next |
|---|---|---|
| Upload a file (resume PDF/DOCX or LinkedIn export) | "Fastest" | `POST /api/profile/extract/upload` |
| Paste your resume text | — | `POST /api/profile/extract/text` |
| Start from scratch | — | straight to Step 4 |

Privacy note on screen: the file is used only to build the profile; passport, visa and contact fields are encrypted and never shown publicly.

**Rate limit applies here** — extraction attempts are the free action being protected.

---

## Step 3 — Extracting *(screen 03, transient)*

Progress is **itemised, not a spinner**, so the wait reads as work being done:

```
✓ Contact & identity fields
✓ 4 work experience entries
◍ Skills & certifications
○ Education
```

Copy: "Usually takes about 20 seconds." Footer: "You'll get to review and correct everything on the next screen — **nothing is saved until you confirm**."

Skipped entirely for the manual path.

---

## Step 4 — Career Profile review *(screens 04, 04b)* — **Wow moment #2**

**Route:** `/profile` · progress 2/5

The readiness ring is the **header, not a widget**. Gold below 100, emerald at 100.

Sections, in order:

1. **Readiness header** — ring, greeting by name, category-aware nudge ("Profiles like yours — currently in the Gulf — get shortlisted more often when visa details are complete")
2. **"Finish these to reach 100"** — incomplete items, each tapping straight to its field
3. **"Extracted — please confirm"** — photo prompt (badged "Expected in Gulf CVs"), work experience entries, education, skills, Additional Information with AI-suggested labels the user can rename

**Screen 04b — field visibility:** every identity/contact field with a toggle, and each toggle carries **country context** — the reason to show or hide, not just the switch. "Expected in KSA & Qatar", "Standard on Gulf CVs", "Hidden — most roles don't need it."

Footer on 04b: passport and visa fields are encrypted, every internal access is logged, profile and packages deletable at any time from Settings.

Actions: **Save & exit** / **Confirm profile**.

**API:** `GET/PUT /api/profile`, `PUT /api/profile/visibility`, `POST /api/profile/photo`

---

## Step 5 — Target selection *(screen 05)*

**Route:** `/optimize/target` · progress 3/5

| Field | Required | UI |
|---|---|---|
| Target job title | **yes** | text input |
| Target industry | **yes** | select — drives persona |
| Target country | **yes** | chips: Qatar / Saudi Arabia / UAE / Oman / Kuwait / Bahrain / Generic Gulf. Labelled "sets CV format conventions" |
| Target company | no | free-text, any employer. "optional, sharpens framing" |
| Job description | no | paste or upload PDF. Badged "Best results" |

**JD is framed as an upgrade, never a blocker:** "With a JD we match the employer's exact wording. Without one, we optimize to your title, industry and country."

Footer reassurance: "Still free — you'll see what changes before you pay."

**Reuse detection fires here.** If a package with a similar title exists, prompt: *"You already have a 'Commissioning Engineer' package — re-optimize it (overwrites its current text), or start fresh?"* with a note that keeping past versions arrives in Phase 2.

---

## Step 6 — Optimization setup *(screen 06)*

**Route:** `/optimize/setup` · progress 4/5

Header reassurance: "Your dates, employers, titles and certifications are never touched. Only framing changes."

**Blocks** — checkboxes, plus "Optimize all":
- Professional summary — "Rewritten for this target"
- Each work experience entry — "5 bullets"; entries may be left unticked, labelled "Already strong — leave as is"
- Skills & certifications — "Reordered by relevance — never reworded" · **Automatic**, not a checkbox

**Optimization level** — three cards showing the match range: Easy 75–80% / Moderate 80–90% / High 90–100%.

**Risk indicator appears only at Moderate and High:**
> "A closer match raises the bar in the interview. Everything stays factual — but be ready to talk confidently about every line at this level."

CTA names the target company: **"Optimize for QatarEnergy"**.

---

## Step 7 — Optimizing *(screen 07, transient)*

Target: **under 60 seconds** from click to preview. Perceived speed is part of the premium feel at this price point.

Named steps, not a spinner:
```
✓ Matched JD language for I&C commissioning
✓ Reframed your summary
◍ Rewriting L&T Energy bullets
○ Reordering skills by relevance
○ Applying Qatar CV format
```

Header: "Optimizing for **QatarEnergy**" · "Reviewed as a senior I&C hiring manager would."
Footer: "Only facts already in your profile are used. Nothing is invented."

**API:** `POST /api/optimize` → runs grounding validator → creates `packages` row with `is_paid = false`.

---

## Step 8 — Before / after preview *(screen 08)* — **Wow moment #1**

**Route:** `/optimize/preview/[packageId]`

Tabs: **Changes (7)** / Full CV.

Per block, visual diff — **not a text dump**:
- Professional summary: Before block (terracotta rule) / After block (emerald rule), added JD language highlighted inline
- Each work bullet: strike-through on removed phrasing → new text with highlights, plus "+3 JD terms"
- Skills reordered: chips showing movement — "Loop checking ↑1", "SAT/FAT ↑2", "AutoCAD ↓4"

Generated text is **user-editable** here ("Edit this text · any generated line"). Fixed fields are not.

> **OPEN DECISION — build the gate, not the content.**
> Exactly how much shows before payment (change-summary list vs. watermarked/blurred full CV) is undecided. Render preview content from a single swappable component with a clearly-marked placeholder. Do not lock in either answer.

CTA: **"Unlock full CV — ₹499"**

---

## Step 9 — Payment *(screen 09)* — **NEEDS REVIEW**

**Route:** `/optimize/pay/[packageId]`

Order summary: item, target line, what's included, total, "No subscription. No auto-renewal. Taxes included."

Razorpay: UPI · Card · Netbanking · Wallet. "We never see or store your card details."

Support line: "Something went wrong with your order? Email the founder directly — replies within a day."

**Every ticket touching this screen is flagged "Needs Review" and is never self-assigned.** Server-side verification of the Razorpay signature is mandatory. Webhook handling must be idempotent. `is_paid` is set **only** by verified server-side confirmation — never by a client-side callback.

---

## Step 10 — Results & download *(screen 10)*

**Route:** `/package/[id]`

Badge: "✓ Unlocked & saved to Library". Heading: "Your Gulf CV is ready, Rahul".

Rendered resume preview — the single premium template, conditionally rendered.

Actions: **Download PDF** · **Word (.docx)** · **Share to WhatsApp** · **Edit text**

Package auto-saves to the Library with status **"Applied"** (user can update anytime).

Repeat-purchase prompt closes the loop: *"Applying somewhere else? Your profile is saved — next one takes a minute."*

---

## Step 11 — Dashboard & Library *(screens 11, D1, D2)*

**Route:** `/dashboard`

Service grid first, Library second. Only "Optimize resume for a job" is live; ATS score, cover letter, Q&A study and mock interview are visible but locked with phase badges.

Since the profile is already saved, re-optimizing for a new target is fast — no re-upload needed. This sets up a future subscription model without building one.

Full spec: `docs/DASHBOARD_LIBRARY.md`.

---

## Cross-cutting requirements

| Requirement | Applies to |
|---|---|
| **Mobile-first, not mobile-adapted** | Every screen. Most of this audience uses a phone as their primary device — layouts, forms and the resume download must work cleanly on mobile browsers as the default assumption |
| 44px minimum hit targets | Every interactive element |
| Loading state on every async action | Every API call |
| Error state on every failure | Every API call |
| Address the user by name | Every authenticated screen |
| Name the target company in copy | Steps 6, 7, 8 |
| Never expose PII in URLs or query strings | Every route |
