# DESIGN.md — Visual Language & UX Principles

Source: Founding Brief §8, §8a, plus tokens extracted from the approved mockups.

---

## 1. Direction

Premium and minimal, in the spirit of Apple / Stripe / Linear / Notion / Framer. A GCC-inspired palette — desert sand, Arabian gold, deep emerald, midnight navy, white marble — **avoiding flag imagery**. Clean typography via Google Fonts.

**It must feel credible and premium, not like a generic job-board template.** This is a trust signal, and trust is the product — there is documented scam activity targeting exactly this audience.

---

## 2. Colour tokens

| Token | Hex | Meaning |
|---|---|---|
| `midnight` | `#0A1A2F` | **Primary action.** Backgrounds, primary buttons |
| `deep-navy` | `#12283F` | Secondary dark surface |
| `emerald` | `#0E5C4A` | **Verified progress.** Confirm actions, "after" state, grounding confirmations |
| `gold` | `#C79A3C` | **Purchase & readiness.** Payment CTAs, readiness ring below 100 |
| `gold-light` | `#E3C77E` | Gold text on dark backgrounds |
| `sand` | `#EDE3D2` | Dividers, inactive ring track |
| `marble` | `#FBF9F5` | **Primary page background** |
| `terracotta` | `#A0562F` | **Caution.** Risk indicator, destructive actions, "before" state |

Supporting greys: `#5B6675` body text · `#6B7A8D` muted · `#93805F` warm muted · `#E4DED2` borders · `#F4F1EA` subtle fill.

Status pills: Applied `#F4F1EA`/`#DDD5C6` · Shortlisted `#F7EFDC`/`#E3C77E` · Interview `#EAF3EF`/`#C9E0D6` · Visa processing `#E9EEF4`/`#C6D3E0` · Offer solid `#0E5C4A`.

Diff highlighting: added JD language `#D3E8DE` background · removed phrasing strike-through in `#A89A8A`.

**Colour carries meaning consistently. Navy = action. Gold = purchase and readiness. Emerald = verified progress. Terracotta = caution. Only two background tones: marble and navy.**

> **These tokens are already implemented** in `tailwind.config.ts` and the three fonts are loaded in `app/layout.tsx`. Use the Tailwind class names (`bg-midnight`, `text-emerald`, `border-line`, `font-serif`, `font-mono`, …) — **never a hard-coded hex value in a component.**
>
> The full token list including semantic tints (`state-*`) and diff colours (`diff-*`) is in `tailwind.config.ts`. Read that file before styling anything.
>
> The approved mockups in `design-reference/` are hand-written HTML using these exact values as inline styles. When building a screen, read the corresponding mockup section for precise padding, radius and colour choices rather than guessing.

---

## 3. Typography

| Family | Use |
|---|---|
| **Instrument Serif** | Headlines only. Weight 400 |
| **Plus Jakarta Sans** | All UI and body. Weights 400/500/600/700 |
| **IBM Plex Mono** | Scores, percentages, counts, dates, timers. Weights 400/500 |

Numbers that represent a measurement are always mono. This is what makes scores read as instrument readings rather than decoration.

---

## 4. Component conventions

| Component | Spec |
|---|---|
| Buttons | Radius 12–13px. Primary navy, purchase gold, progress emerald, secondary white with `#DDD5C6` border, disabled `#F1EEE8` |
| Cards | Radius 14–18px, white on marble, 1px `#E4DED2` border |
| Toggles | 46×27px pill. On = emerald, off = `#DDD5C6` |
| Readiness ring | SVG circle, `r=42`, stroke-width 8–10, rotated −90°, round linecap. Gold below 100 → emerald at 100 |
| Status pills | Fully rounded, tinted background + matching border |
| Inputs | Radius 12px. Focused 1.5px `#0A1A2F` · placeholder `#A8A093` · error 1.5px `#A0562F` |
| Phone frames | 390px wide, radius 34px |

---

## 5. UX principles

Given this market is trust-starved more than feature-starved, the priority order is **credibility and transparency first, polish second.**

### Trust signals up front
Transparent pricing (no hidden fees), a real founder story, clear payment security — **before anything flashy**. Price appears in the hero, not behind a funnel.

### Two co-equal "wow" moments — both built with real care, neither at the expense of the other

1. **Live before/after view of the resume transformation** — changes visually highlighted, per block, word-level. **Not a text dump.**
2. **The Readiness Score as a satisfying visual** — a progress ring, not a bare percentage, giving the user a small sense of accomplishment while completing their profile.

### Speed as a feature
Target **under 60 seconds** from "optimize" click to preview. Perceived speed is itself part of the premium feel at this price point. Where waiting is unavoidable, show **named, itemised steps** — never a bare spinner. Named steps make 60 seconds feel like craft rather than latency.

### Mobile-first, not mobile-adapted
Most of this audience will use the platform primarily on a phone. Layouts, forms and the resume download must work cleanly on mobile browsers **as the default assumption, not an afterthought**. Design at 390px, then widen.

**A "share to WhatsApp" option on results is worth strong consideration** given how this audience already communicates — included in MVP scope.

### Light personalization touches
Addressing the user by name; referencing their actual target company by name in UI copy ("Optimizing for QatarEnergy…"). Small to build, disproportionately impactful on how "made for me" the product feels.

---

## 6. Copy principles

- State the grounding promise plainly and often: "Only facts already in your profile are used. Nothing is invented."
- Never imply a guarantee of being hired or shortlisted.
- Show the price wherever a paid action is offered.
- Every visibility toggle explains **why** — country context, not just a switch.
- Locked Phase 2–4 services are labelled with their phase honestly. Never "coming soon" with no date, never a dead link.
- Use `[Product Name]` as a literal placeholder until the name is decided.

---

## 7. Accessibility floor

- 44px minimum touch targets.
- Body text 4.5:1 contrast minimum. Gold on marble fails this — never use `#C79A3C` for body text on light backgrounds; it is a fill and accent colour only.
- Never rely on colour alone: the diff uses strike-through plus colour; status pills carry text labels.
- Every input has a real `<label>`. Every image has alt text.
