# Stage 1 — Approved Visual Direction (locked 2026-08-11)

Founder approval, verbatim intent preserved. This is the reference every
later redesign document builds on — if a later document ever conflicts
with this one, this one wins unless the founder explicitly changes it.

## Locked decisions

1. **Warm forest-tinted neutral palette** — approved. Replaces the
   reference images' stock Tailwind-slate neutral values.
2. **Serif headlines + Inter UI/body typography** — approved. Matches the
   existing app's own convention (`font-serif` for headings today).
3. **Deeper green/gold for contrast** — approved, conditional on
   accessibility remaining strong. Verified in `DESIGN_SYSTEM.md` §9 —
   one real finding: raw `--gold` fails WCAG AA as text on a light
   background (2.8:1); a separate `--gold-text` token (5.6:1) is used
   for that case instead, mirroring the existing app's own
   `state-gold-text` pattern.
4. **Mock Interview, Q&A/Interview Prep, and Saved Jobs are FUTURE
   planned services** — not banned ideas, not built now.
5. Their current representation is **Planned/locked tiles only** — see
   `PLANNED_SERVICES.md`.
6. **No functionality, backend, database, API, or fictional data** for
   those three services in this redesign.
7. They **must not appear as disabled sidebar navigation items** — or
   in the tablet overlay, mobile bottom bar, or mobile "More" sheet.
8. The architecture must remain **easy to add them as real destinations
   later** — the nav components are plain ordered lists; adding a real
   10th/11th/12th destination is a one-line change, not a redesign.
9. **Saved Jobs stays dashboard-only** for now — explicitly **not** added
   as a public landing-page marketing claim (unlike Mock Interview, which
   already has existing homepage "coming soon" copy).
10. **Opportunities/job-board, Resources, Notifications, and
    Premium/subscription remain fully excluded** — no tile, no nav entry,
    no placeholder, until separately approved.

## Additional requirement — mobile navigation completeness

The mobile "More" destination must provide access to every destination
not in the bottom navigation, explicitly including: **GCC Readiness, Job
Match, Cover Letter, Payments, Settings.** No existing functionality or
destination may become inaccessible on mobile. Fully specified in
`DESIGN_SYSTEM.md` §8.3.

## What this approval covers

The visual language, component system, desktop composition, and
responsive direction from the Stage 1 document (color, typography,
spacing, buttons, forms, cards, tables, navigation, badges, AI-result
components, dashboard/admin/landing compositions) are approved as
direction. Stage 2 (`DESIGN_SYSTEM.md`, `PAGE_SPECS.md`,
`PLANNED_SERVICES.md`) is the full written specification built from this
approval. Stage 3 (Hermes implementation prompts) does not begin until
Stage 2 itself is separately approved.
