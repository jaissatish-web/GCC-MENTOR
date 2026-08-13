# PROJECT_STATUS.md — Read this first, every fresh session

**Purpose:** this file exists so a new conversation — a new Claude Code
session, a different reviewer, or the founder returning after a break —
can get oriented in two minutes instead of re-reading a long chat history.
It is a snapshot, updated after significant progress. It is **not** the
specification — `docs/RULES.md`, `docs/TASKS.md`, and the rest of `docs/`
remain the source of truth. This file just tells you where things stand
right now and points you at what to read next.

**Last updated:** 2026-08-13, later still yet again (**TASK-100 closed — round 2 built, reconciled with GitHub, and pushed.** Force-pushed the round-1 retrofit to `origin/main` (founder confirmed), replacing the 9 unreviewed commits and deleting the stray `agent/landing-page-conversion-redesign` branch. Founder then shared a reference screenshot — the same "premium GCC" mockup those unreviewed commits had been chasing — and asked Claude to match its visual style. It repeated the identical fabrication issues (named/photographed testimonials, invented stats, a fake resume screenshot with a made-up match score, Mock Interview shown live). Flagged before building; founder confirmed it's a reference image only and chose "match the visual style, keep content honest." Rebuilt the hero scorecard as three labeled-illustrative rings + an example-improvements checklist, added heroicons throughout (already an approved, already-used dependency), turned the "how it works" section into an 8-step icon journey row, added an honest stat band (real content, no invented numbers), and enriched the footer — all still server-rendered, zero client JS added. **Caught and fixed one real defect before committing**: the first pass of the 8-step row marked 6 steps live while the new stat band separately claimed "4 of 8 shipped" — the two didn't agree. Corrected the step list against what's actually shipped (5 live, 3 planned) and fixed the stat band to match; verified live that the rendered badge count is actually 5/3. `tsc`/`lint`/full `npm run build` all clean, live-checked on a dev server. **Pushed to `origin/main`** — this is what should now be live on Vercel once it redeploys from the new commit.)

**Last updated:** 2026-08-13, later still (**TASK-100 done locally — landing page retrofit after unreviewed direct GitHub pushes.** Founder pushed 9 commits straight to `origin/main` (own account, bypassing Hermes/TASKS.md/CTO review entirely) that rewrote `app/page.tsx`, plus a separate unmerged branch `agent/landing-page-conversion-redesign` with 2 more independent commits — neither ever pulled into local `main`. Founder flagged it and asked for a GitHub inspection; found four real violations versus the locked redesign scope: no design-system tokens/components, "Mock Interview" shown as a live "NEW" nav item (explicitly banned), fabricated named testimonials + invented traction stats, and real 3-tier pricing replaced by a contentless CTA. **Founder's decision (via `AskUserQuestion`): keep the new visual direction, retrofit it onto the approved system, strip the fabrication, log it as a ticket** — see `TASK-100` for the full writeup and what was built (new hero storytelling, GCC-country strip, honestly-labeled illustrative scorecard preview, all on real design tokens; live/coming-soon and pricing sections kept exactly as already approved). `tsc`/`lint` clean, live-checked on a running dev server. **Not yet pushed to GitHub** — reconciling with `origin/main`'s 9 unreviewed commits needs its own explicit go-ahead (likely a force-push, since this supersedes them) before this ships.)

**Last updated:** 2026-08-13, later same day (**TASK-066 (Cover Letter frontend + admin/redemption UI) fully closed out — the last item from the pre-redesign backlog.** Turned out to be three separate pieces, not one: items 1–2 (generation UI, redeem entry point) were already satisfied by TASK-093's `/cover-letter` page, built via a different architecture than originally speced (one page instead of `/package/[id]` + `/settings`) but functionally equivalent. Item 4 (dashboard's stale "Locked · Phase 3" framing) turned out to already be resolved as a side effect of TASK-083 and TASK-093's own review — grepped the whole app, no stale copy remains anywhere. **Item 3 (admin `packageId` dropdown) was the one real gap — built directly**: `/admin/promo-codes` now has a package selector on the create form (blank = unchanged default behavior) and shows each existing code's tied package. The backend (`createPromoCodeAction`, `lib/admin/promoCodes.ts`) had supported this since TASK-065; only the form field was missing. `tsc`/`lint`/`build` clean. **With this, the only real remaining build work is TASK-050 (multiple resume templates) — everything else outstanding is external (Razorpay KYC, the still-unset OpenRouter key).**)

**Last updated:** 2026-08-13 (**TASK-098 done and approved — the entire Stage-3 visual redesign (TASK-076–098, 23 tickets) is now complete.** Admin Access Log restyled with the spec's mobile stacked-card fallback (desktop table → mobile labeled cards at the `lg` breakpoint, matching Library's established pattern); `requireAdmin()`/`listPiiAccessLog(50)` and every field access confirmed untouched. Immediately followed by a full whole-app verification pass at the founder's request: `tsc`, `lint`, and a full production `npm run build` all clean across every route in the app (zero errors). Live-checked every page reachable without a login session — homepage (confirmed the TASK-093 "Job Matching"/"Cover Letter" live-badge fix is rendering correctly), `/login`, `/signup` — all render correctly, no bugs found. `/ats-scan` hit a transient dev-server cache corruption from the CTO's own `npm run build` colliding with Hermes's concurrently-running dev server (a known, machine-specific quirk, not a code defect — the standalone build succeeded moments earlier). **What's still genuinely unverified, and always has been**: every authenticated page (dashboard, profile, optimize flow, admin panel contents, gcc-readiness, job-match, cover-letter) has never been checked in a live browser, because no real login session is available in this environment — this has been disclosed on every single ticket review this session, not a new gap. **AI-dependent features cannot be verified end-to-end at all**, because the OpenRouter API key has still never been saved in `/admin` — extraction, optimization, ATS scoring, job match, and cover letter generation are all built and reviewed but have never actually produced a real result. Local git history (108 commits ahead of `origin/main`) was pushed to GitHub in this session, a clean fast-forward with zero conflicts.)

**Last updated:** 2026-08-12, later once more yet again still further on again (**TASK-097 done and approved, clean.** Admin Packages + Users restyled. Gave `ServicePackageItemsFields.tsx` particular attention since it has a real documented prior incident (the TASK-061 array-index-as-key bug where removing any row but the last one silently removed the wrong one) — read the current file directly and confirmed `key={id}`/`removeRow(id)`/field names all still use the stable row id, never the array index. `q`/`user` param sharing and every server-action form on Packages/Users confirmed untouched. `tsc`/`lint`/`build` clean. **TASK-098 (Access Log) is next for Hermes — the last ticket of the entire visual redesign.**)

**Last updated:** 2026-08-12, later once more yet again still further on (**TASK-096 done and approved, clean.** Admin Prompts + Promo Codes restyled. Confirmed `updatePromptTemplateAction`, `createPromoCodeAction`, `deactivatePromoCodeAction`, and their hidden `key`/`code` inputs all genuinely untouched — pure className changes in both files. `tsc`/`lint`/`build` clean. **TASK-097 (Packages + Users) is next for Hermes** — 2 tickets left in the entire redesign.)

**Last updated:** 2026-08-12, later once more yet again still further (**TASK-095 done and approved, clean.** Admin Dashboard restyled to the spec's 960px 3-up grid; `/admin/ai-provider` token-swapped over its current (TASK-099) named-service-card structure. Gave the AI provider page particular attention since it handles raw API keys — confirmed the `SERVICES` array, every server-action form, every hidden `key` input, and `maskSecret` itself are all genuinely untouched, no secret-handling logic anywhere near the diff. `tsc`/`lint`/`build` clean, all 7 admin routes build. **TASK-096 (Admin Prompts + Promo Codes) is next for Hermes** — 2 of the final 3 admin tickets remain.)

**Last updated:** 2026-08-12, later once more yet again still (**TASK-094 done and approved, clean.** Admin shell + nav restyled to forest/gold light (admin stays a light operational surface, not the dark consumer shell, per spec). `TABS` (all 7 destinations, same order) and the exact-pathname active-tab logic confirmed genuinely untouched; `requireAdmin()` correctly still absent from the layout per its documented delegation to middleware + per-page checks; gold used only as a flat border, never a glow, matching the admin-specific design rule. `tsc`/`lint`/`build` clean, unauthenticated `/admin` still redirects correctly. **TASK-095 (Admin Dashboard + AI Provider) is next for Hermes** — worth noting `/admin/ai-provider`'s structure changed significantly under TASK-099 (named per-service cards, not the old single form), so that restyle should target the current layout, not an outdated description.)

**Last updated:** 2026-08-12, later once more still yet again (**TASK-093 done and approved — `/cover-letter` exists, closing out all three new-page tickets (TASK-091/092/093).** All 5 named do-not-touch backend files confirmed genuinely untouched. Middleware protection was done correctly this time — the repeat-miss pattern from the previous two tickets didn't continue, confirmed live (`307` → `/login?redirectTo=%2Fcover-letter`). Both of Hermes's flagged questions resolved: omitting a fake tone picker approved as the right call; TASK-066's remaining admin/dashboard follow-up items confirmed genuinely out of scope, not silently dropped. **Caught one more thing while checking the second question**: the public homepage's `ecosystemSteps` array still marked "Job Matching" and "Cover Letter" as not-live, showing stale "Coming Soon" badges for two features now genuinely built (contradicted by the dashboard's own Quick Actions already linking both). Not unsafe, just inaccurate and undersold the product — fixed directly, small and copy-only. `tsc`/`lint`/`build` clean, 39 routes now. **Remaining queue: the admin batch, TASK-094–098 — the last 5 tickets of the entire visual redesign.**)

**Last updated:** 2026-08-12, later once more still again (**TASK-092 done and approved after two direct fixes — `/job-match` exists.** Verified `lib/jobMatch/`/`lib/ai/jobMatchExplanation.ts` genuinely untouched (imported only), and the new `/api/job-match` route auth-checks first (401 before any AI call), so no cost-abuse vector existed even with the gap found below. **Two real issues found and fixed directly**: (1) `middleware.ts` was missing `/job-match` — the *exact same gap* as TASK-091, despite an explicit heads-up left in that review; fixed and live-verified (anonymous access now correctly redirects to `/login`), and flagged plainly for TASK-093 since this is now a repeat miss. (2) The "Optimize with these findings" CTA implied a data handoff to `/optimize/target` that doesn't exist (confirmed via Hermes's own flagged question — `/optimize` has no plumbing to consume the JD) — reworded to honestly describe a plain navigation, matching this project's standing rule against copy that implies behavior that isn't real. One thing reviewed and accepted as a reasonable scope-limited tradeoff, not a defect: the explanation prompt reuses the profile's `professional_summary` for both its "resume" and "summary" prompt blocks, capping explanation richness until a future ticket builds something fuller. `tsc`/`lint`/`build` clean, 38 routes now. **TASK-093 (`/cover-letter`) is next for Hermes** — check specifically for the middleware gap this time.)

**Last updated:** 2026-08-12, later once more again (**TASK-091 done and approved — `/gcc-readiness` exists, the first of three genuinely new pages.** Zero new computation: independently diffed the new page's `toReadinessInput()` against `/dashboard`'s own input construction field-by-field and confirmed they're genuinely identical, not just described as matching — same score/missing derivation too, so the ticket's own parity acceptance test holds by construction. `lib/readiness.ts` confirmed untouched. **One real gap found and fixed directly**: `middleware.ts` was never updated for the new route — `/gcc-readiness` was missing from both `PROTECTED_ROUTES` and the matcher config. Not a data leak (`/api/profile` independently checks auth and 401s anonymous callers), but a logged-out visitor would've seen a rendered shell + confusing error instead of the clean `/login` redirect every other protected page gives. Added directly and live-verified: anonymous `curl` now correctly gets a `307` to `/login?redirectTo=%2Fgcc-readiness`. `tsc`/`lint`/`build` clean, 36 routes now. **Flagged for TASK-092/093** (the next two new pages) to check for the same middleware gap rather than assuming it won't recur. **TASK-092 (`/job-match`) is next for Hermes.**)

**Last updated:** 2026-08-12, later once again still (**TASK-090 done and approved — Settings + Payments restyled, closing out the app-core restyle batch (TASK-076–090).** `/settings` now 900px per spec; `DeleteDataSection`'s two-step irreversible-delete flow (`CONFIRM_PHRASE`, `canConfirm`, the `deleteMyData` server action) confirmed byte-for-byte untouched — given particular scrutiny since it's a genuinely destructive action. `PlaceholderPage` (used only by `/payments`, confirmed no other consumer) restyled to a dashed empty-state card; `/payments` stays an honest placeholder, no payment-history feature was built. Live-verified `/payments` (no login needed): `200 OK`, correct content, no fabricated data — a batch of console 500s during the check traced to stale tab/dual-agent cache noise already disclosed in the report, not the actual page request. `tsc`/`lint`/`build` clean. **Next: TASK-091 (`/gcc-readiness`, a new page reusing existing `calculateReadiness()` logic — its own acceptance test requires the score to match `/dashboard`'s readiness card exactly).**)

**Last updated:** 2026-08-12, later still yet again (**TASK-089 done and approved — `/ats-scan` restyled, and the most thoroughly verified ticket of this whole batch.** Diff-verified every handler (drag-drop, paste toggle, length guards, the `POST /api/ats-scan` call, 429 handling) untouched. As the first public no-login page in the redesign, actually loaded it live: computed styles matched intended tokens exactly, and clicking "Paste text instead" genuinely toggled the form to the textarea with the correct character limit — a real interaction test, not just a source-code check. (One early check returned obviously-wrong values from a stale dev server — this session's own repeated build/dev interleaving — resolved immediately by a clean restart, confirming it was environment noise, not a defect.) `tsc`/`lint`/`build` all clean. **TASK-090 (Settings + Payments) is next for Hermes.**)

**Last updated:** 2026-08-12, later still once more (**TASK-088 done and approved, one small fix applied.** Library + Package Detail restyled: Library finally got "the dark pass" its own old code comment said was waiting for Phase 3 (removed a stale light `bg-marble` placeholder wrapper); Package Detail got the spec's `lg` two-column (document preview left, actions rail right) via a standard `lg:order-1`/`lg:order-2` flex-reorder — same DOM order for mobile/accessibility, different visual order at desktop. Diff-verified: status change/delete/reuse-detection on Library and download/edit/`is_paid`-guard/`GulfPremium` props on Package Detail are all genuinely untouched. **One real defect found and fixed directly**: Library's wrapper had a `sm:`/`lg:` typo (`lg:p-8 lg:p-10` — two rules for the same breakpoint, the first one dead) that silently dropped the tablet padding step every other page in this batch has; fixed to match the established `sm:p-8 lg:p-10` pattern. Also corrected `PAGE_SPECS.md` — the "sortable by date/status" line described a feature that was never actually built, before or after this redesign; not a regression, just a stale spec claim. `tsc`/`lint`/`build` all clean after the fix. **TASK-089 (`/ats-scan`) is next for Hermes.**)

**Last updated:** 2026-08-12, later once more (**TASK-087 round 2 done and approved — closes out this ticket.** Hermes built exactly the round-2 spec: `lg:flex-row` two-column split, left panel unchanged, right rail reusing the identical (hoisted, not re-fetched) blurred-preview image + a single persistent Unlock CTA. Verified the duplicate-CTA risk was handled correctly (tab-footer CTA `lg:hidden`, rail CTA `lg:flex` — exactly one visible per breakpoint, never zero or two), and re-confirmed every security/logic invariant (blur server-rendered, diff tab ungated, PATCH bodies, `is_paid` redirect) still holds. `tsc`/`lint`/`build` clean. **TASK-088 (Library + Package Detail) is next for Hermes.**)

**Last updated:** 2026-08-12, yet later again (**TASK-087 — round 1 sent back, not approved as done.** Optimize Preview/Diff + Package Detail restyled visual-only. All the security/logic checks this ticket exists to protect passed independent re-verification: blur genuinely stays server-rendered (no CSS filter introduced), the Changes diff tab stays ungated, `PATCH /api/packages/[id]` bodies untouched, `is_paid` redirect untouched. **But** Hermes correctly self-flagged, rather than guessed, that it kept the existing single-column layout instead of building `PAGE_SPECS.md` §C's explicit desktop two-column composition (diff left, persistent resume-preview + purchase CTA on the right rail) — and unlike TASK-082's spec-wording gap, this spec requirement is real and correct, so it's going back for round 2 rather than being waived. Round 2 spec written directly into `docs/TASKS.md` TASK-087: build the two-column split at `lg`, reusing the exact same server-rendered preview image (no duplicate fetch, no new client-side filter), tablet/mobile stay as already built. **Hermes should pick up TASK-087 round 2 next, not TASK-088.**)

**Last updated:** 2026-08-12, yet later still (**TASK-086 done and approved, clean.** Optimize Payment restyled to a single centered 520px card, per `PAGE_SPECS.md` §C. Diff-verified: the promo-code redemption call, `is_paid` redirect, and Razorpay's honest "coming soon" stub are all genuinely untouched. No legacy tokens and no `-light-light-` artifact (the TASK-085 collision fix held this time, independently re-checked). `tsc`/`lint`/`build` all clean. **TASK-087 (Optimize Preview/Diff) is next for Hermes** — this one's flagged in its own ticket text: the pre-payment blur/watermark must stay server-rendered, never a client-side CSS filter, since that's a previously-resolved security consideration (TASK-033/044).)

**Last updated:** 2026-08-12, later still again (**TASK-085 done and approved, clean.** Optimize Target + Setup restyled to a centered 720px wizard card, per `PAGE_SPECS.md` §C. Diff-verified: `canContinue`, the reuse-detection prompt state, block/level toggles, and `onSubmit`'s entire `/api/optimize` POST body (`target_country` staying optional per TASK-074) are all genuinely untouched — not present in the diff at all. Hermes self-caught and fixed its own script-replacement collision (`border-line-light-light-strong`) before submitting; independently re-verified zero instances remain. `tsc`/`lint`/`build` all clean. **TASK-086 (Optimize Payment) is next for Hermes.**)

**Last updated:** 2026-08-12, later again (**TASK-084 done and approved, clean — no fix needed.** Career Profile + Visibility restyled to the forest/gold dark theme. This was the ticket flagged for extra-careful review (tri-state driving-license logic — the exact bug class this project has caught before), so it got a full double read of both diffs specifically hunting that logic: the `f_has_driving_license` `<select>`/`onChange`, `onSubmit('exit'/'confirm')`, and `flip(key, v)` on the visibility page are all confirmed genuinely untouched — only classNames changed. `900px` column width matches `PAGE_SPECS.md` §C exactly. One disclosed tradeoff (Input/Toggle left at default light tone inside the now-dark cards, to avoid a ~40-call-site change) reviewed and approved as a reasonable, non-defective call — light fields on a dark card is a legible, common pattern with no existing precedent either way in this codebase; worth the founder's own eyeball once logged in, not blocking. `tsc`/`lint`/`build` all clean. **TASK-085 (Optimize Target + Setup) is next for Hermes.**)

**Last updated:** 2026-08-12, even later still (**TASK-083 done and approved, after a real fix — Dashboard restyled + two authorized content corrections + one caught-and-reverted unauthorized one.** Built by Hermes: `§C` two-column layout (metric row incl. new "Latest Job Match," next-step hero, Recent Activity, new "Planned" row for Mock Interview/Q&A/Saved Jobs using `LockedTile`; right rail = readiness card, Quick Actions, Library preview). The two ticket-approved corrections (drop the stale "ATS score check" tile since the scanner's been live since TASK-058; add the display-only "Latest Job Match" metric) both verified correct. **CTO review caught a real, undisclosed regression the report didn't mention**: the readiness card's title and CTA silently changed from "Gulf Readiness Score" / "View Career Profile" (→ `/profile`, working) to "GCC Readiness Score" / "View GCC Readiness" (→ `/gcc-readiness`, TASK-091, not built — 404s today) — a third, unauthorized content change that broke the dashboard's primary "fix your incomplete profile" call-to-action for real users. Reverted directly to the original, working copy/link. Also fixed a forward-compatibility gap in the new Job Match reader (`target_job_title` doesn't exist on the actual `AtsScoreResult` shape — sourced the title from the package row instead, harmless today since nothing writes `ats_score_card` yet) and a dead `useCallback` import left over from the removed old services grid (same class of miss as TASK-078's dead icon import). All three of Hermes's own flagged questions resolved: Job Match's honest-empty-state design approved, Quick Actions linking to the three not-yet-built pages approved (consistent with the already-approved sidebar precedent), Planned-row copy approved as compliant with `PLANNED_SERVICES.md`. `tsc`/`lint`/`build` all clean after fixes. Live browser check not possible — `/dashboard` needs a real login, same standing gap as every authenticated page. **TASK-084 (Career Profile + Visibility) is next for Hermes** — flagged in the ticket itself for extra-careful review, since the tri-state driving-license logic it touches is exactly the class of bug this project has caught before.)

**Last updated:** 2026-08-12, later still (**TASK-082 done and approved — Onboarding + Extracting restyled to light centered cards.** Built by Hermes: `/onboarding` (the 3-way chooser) to a 640px centered card on `--bg`; `/onboarding/extracting`'s collect/error/extracting stages each to their own light `Card`, including switching the file drop-zone to a genuinely dashed border per `DESIGN_SYSTEM.md` §7's "dashed = unfilled" convention. All state/handler/effect logic (claim check, `path` state, extraction stage machine, timer, session-storage handoff, `/api/parse/*` calls) confirmed untouched by diff shape alone — only JSX/className changed. Two Hermes-flagged deviations both reviewed and approved: dropping the decorative fake status bar (consistent with TASK-081's precedent), and correctly refusing to merge upload/paste into a single in-page toggle just because `PAGE_SPECS.md`'s wording implied one — that would have been a functional change disguised as a restyle. Corrected that doc to describe the real two-screen chooser→collect architecture so it won't be "fixed" against the wrong model later. **Live-verified past where Hermes could get** — cleared a corrupted `.next` (this session's own interleaved build/dev runs, a known machine limitation, not this ticket's fault), ran a clean dev server, and confirmed both the chooser and the collect stage actually render with exact computed-style token matches, including the dashed drop-zone genuinely being `border-style: dashed` live, not just claimed. `tsc`/`lint`/`build` all clean. **TASK-083 is next for Hermes.**)

**Last updated:** 2026-08-12, even later (**TASK-081 done and approved — Login/Signup restyled to the spec's light centered-card utility treatment.** Built by Hermes: `AuthShell.tsx` converted from the old dark split-screen to a single light `max-w-[420px]` centered column (`bg-bg`, gold logo/eyebrow, ink text, trust lines + grounding tagline kept verbatim); `login`/`signup` pages set `Card`/`AuthForm` to `tone="light"`. `AuthForm.tsx`/`actions.ts` genuinely untouched — confirmed by their absence from the commit, not just the claim. CTO-verified against the real diff (no leftover dark classes, correct WCAG-safe cross-link color, spec's exact 420px width) and, for the first time this session, **actually live-verified in the browser** — got the dev server running, loaded `/login` and `/signup`, confirmed zero console errors and computed CSS colors matching the intended tokens exactly. `tsc`/`lint`/`build` all clean. **TASK-082 (Onboarding + Extracting) is next for Hermes.**)

**Last updated:** 2026-08-12, later same day (**TASK-080 done and approved — the landing page (`/`) is restyled.** Built by Hermes: dark forest-deep hero, alternating light/dark sections, `LockedTile` now renders the `comingSoon` grid instead of hand-rolled dashed cards. CTO-verified against the actual diff: every section's copy, anchor id, and href confirmed unchanged — restyle only, as required. Gold used safely throughout (fill + dark text, or the `gold-text` token for text) — did not repeat the raw-gold-on-light-text WCAG mistake this project already found once. Resolved Hermes's flagged question: `PAGE_SPECS.md`'s "gold 'coming soon' eyebrow badge" phrase describes visual styling, not literal copy — clarified in the doc so it won't recur. `tsc`/`lint`/`build` all independently re-run, clean. **Live browser verification wasn't possible this round** — the dev server had gone unresponsive and the shared (cross-project) `.claude/launch.json` has a broken `gccsaas` command; this is outside the GCCSAAS repo, not something this ticket touched. Fell back to full diff review + build/lint/tsc, same standard used before when live preview wasn't available. **TASK-081 (Login/Signup restyle) is next for Hermes.**)

**Last updated:** 2026-08-12 (**TASK-079 done and approved — `components/ui/LockedTile.tsx` exists.** Built by Hermes: dashed-border card, neutral "Planned" badge, title/description via string-only props, tap-to-reveal honest note, keyboard-accessible. Type signature has no numeric or preview-content prop by construction, per `PLANNED_SERVICES.md`. **CTO review caught a real, confirmed defect the report missed**: the component mixed a dark border token with light-only background/text tokens, then tried to cover dark mode with a bare Tailwind `dark:` variant — which this app never uses anywhere else and which isn't wired to anything (no `darkMode` override in `tailwind.config.ts`, so it would have followed the *browser's* OS color-scheme preference, not this app's own per-page light/dark choice). Net effect: on a typical (light-OS-preference) visitor, the tile would render light-toned inside Dashboard's dark-shelled "Planned" row, its one real consumer. Fixed directly — added a `tone` prop mirroring `Card`/`Input`'s existing light/dark convention exactly, using confirmed-real tokens. Too small for a Hermes round trip. `tsc`/`lint`/`build` all clean. Not wired into any page yet — that's TASK-080, next up. **TASK-080 (Landing page `/`) is next for Hermes** — depends on TASK-076–079, all now done.)

**Last updated:** 2026-08-11, even later still (**TASK-078 done and approved — the navigation system is restyled.** Built by Hermes: `Sidebar.tsx` (desktop 248px / tablet 48px icon-only with tap-to-expand overlay / hidden on mobile), `MobileBottomNav.tsx` (5 slots), new `MoreSheet.tsx` (the other 5 destinations). Nine real destinations in the exact approved order, three not-yet-built routes (`/gcc-readiness`, `/job-match`, `/cover-letter`) already pointing at their final paths so TASK-091/092/093 won't need to touch nav again. Zero Locked/Planned entries anywhere, per `PLANNED_SERVICES.md`. CTO-verified against the actual diff, not the report: breakpoint scoping, route paths, and slot counts all correct; `middleware.ts` and page content untouched. One real defect found and fixed directly (too small for a round trip) — `MobileBottomNav.tsx` imported `EllipsisHorizontalIcon` without using it, silently allowed because `next/core-web-vitals` doesn't flag unused imports. `tsc`/`lint`/`build` all clean. **TASK-079 (Locked/Planned tile component) is next for Hermes** — depends only on TASK-076/077, both done.)

**Last updated:** 2026-08-11, later still (**TASK-099 done — `/admin/ai-provider` now has a named config card per service, not one generic key field.** Founder-requested, decided step-by-step in chat (not a pre-written ticket): six services — Resume Parsing, Resume Optimization, ATS Scanner, Cover Letter Generation, Q&A Generation, Mock Interview — each with its own provider/model/fallback-model/API-key form, plus a `Default` fallback card and an `Other overrides` card for internal sub-steps. Zero backend/schema change (the per-key table and resolution logic already existed from TASK-062) — this is UI-only, CTO-built directly. **Real conflict flagged and consciously overridden, not silently built:** Q&A Generation and Mock Interview have no AI call site anywhere in the codebase, and `docs/redesign/PLANNED_SERVICES.md` explicitly bans building those two features in this pass — founder chose to add the config rows anyway, inert until the features exist. Also flagged and confirmed: this is functional work happening inside the otherwise presentation-only redesign lock (TASK-076–098) — founder chose to build it now, plain-styled, letting TASK-095 (not started) restyle it later. `tsc`/`lint`/`build` all clean; unauthenticated request to the route still correctly redirects (no crash) — full logged-in visual check not possible from this environment, same standing gap as every admin page. Along the way, found TASK-063 (the per-feature override UI) was already fully built in code but its checkbox was never updated — fixed. `docs/redesign/PAGE_SPECS.md` §D and TASK-095's own spec updated to describe the new card layout so the eventual restyle ticket isn't working from a stale description. Full detail: `docs/TASKS.md` TASK-099.)

**Last updated:** 2026-08-11, later same day (**Full visual redesign — all three planning stages approved, 23 Hermes tickets queued. No application code written yet.** Founder-initiated: existing UI/UX/IA/admin visuals weren't landing, but the *product* (all existing functionality, data, business logic, AI pipeline, auth, payments) stays exactly as-is — presentation-only. Full docs at `docs/redesign/`: `STAGE1_DECISIONS.md` (locked visual direction — warm forest/gold palette, serif+Inter typography, deepened contrast verified against real WCAG ratios), `DESIGN_SYSTEM.md` (full token/component reference, including a real accessibility finding — raw gold fails as text on light backgrounds, 2.8:1 — fixed with a separate `--gold-text` token, 5.6:1, mirroring the app's own existing `state-gold-text` pattern), `PAGE_SPECS.md` (all 24 existing routes re-verified directly against the repository, not assumed, plus the 3 founder-approved new pages — `/gcc-readiness`, `/job-match`, `/cover-letter`, each wiring already-built engines/data into new UI with zero new logic), `PLANNED_SERVICES.md` (Mock Interview/Q&A/Saved Jobs are future-planned, not banned — shown only as honest "Planned" locked tiles, reusing the exact pattern the app already used for Cover Letter before it was real; never in nav on any breakpoint), `STAGE3_IMPLEMENTATION_PLAN.md` (sequencing/dependencies for the 23 tickets). **`docs/TASKS.md` now has TASK-076 through TASK-098** — foundation (tokens, icon dependency `@heroicons/react`, shared UI primitives, nav system, Locked/Planned tile component) must ship first, then marketing/auth/app-core/new-pages/admin, mostly independent of each other after their phase's foundation lands. Every ticket carries a "VISUAL/PRESENTATION IMPLEMENTATION ONLY" banner and a two-part acceptance gate (functional parity + visual QA) — same "never trust the report alone" review discipline as every prior ticket. **Not started yet** — next action is the founder pasting TASK-076 to Hermes.

**Last updated:** 2026-08-11 (**TASK-075 done and approved — the admin panel is no longer one long page.** Founder feedback: the six unrelated sections (AI provider, prompts, promo codes, packages, users, PII access log) crammed onto one `/admin` screen weren't understandable. Built by Hermes (commit `54d5c57`), CTO-verified against the actual diff, not the report: all six sections moved to their own routes (`/admin/ai-provider`, `/admin/prompts`, `/admin/promo-codes`, `/admin/packages`, `/admin/users`, `/admin/access-log`), each independently calling `requireAdmin()`; `/admin` itself is now a lightweight dashboard with a live one-line summary per section (the "AI provider not configured" blocker gets warning-color visual weight so it isn't buried); a shared tab nav (`app/admin/layout.tsx`) ties them together. Pure navigation restructure — no new features, no behavior change to any form. `tsc`/`lint`/`build` all clean, all 6 new routes independently confirmed to redirect signed-out requests to `/login` exactly like `/admin` always has (middleware's `/admin/:path*` gate needed no change). Full form-submission round trip still blocked on Unplanned #16 (no admin session available outside a real browser login) — same standing gap as everything else admin-adjacent.

**Last updated:** 2026-08-10, even later same day (**Founder redirected priority: Cover Letter frontend (TASK-066) is on hold, GCC Readiness / Job Match is now the priority.** Full spec: `docs/GCC_READINESS_JOB_MATCH.md`. This is a major product expansion — a two-score system (GCC Readiness = profile completeness for GCC applications; Job Match = fit against one specific job) replacing the existing simple `/ats-scan` tool, plus anonymous-session persistence and a structured JD-matching pipeline. Agreed sequence: (1) GCC Readiness data layer, (2) anonymous sessions, (3) Job Match engine, (4) optimizer wired to Job Match findings. **Piece 1 (TASK-067) is done** — driving license fields, GCC-tagged work history (`gcc_country` on `profile_work_experience`, not a new table — reuses the existing rows), and employment-gap detection (informational only, not scored — the founder's own spec says exact gap/weight rules come later, so nothing here invents a scoring formula). Migration 027 written, code-verified (32,768-permutation golden-baseline re-check confirms zero effect on the paid PDF/DOCX), and **applied to the live database 2026-08-10** — founder supplied the Connection Pooler URL, now cached in `.env.local` as `DATABASE_POOLER_URL` (gitignored) for direct future use; all five new columns independently verified live. **TASK-068 (the profile UI for these new fields) is done and approved** — built by Hermes, CTO-verified against the actual diff (the tri-state driving-license logic specifically stress-tested, since that's the exact class of bug this project has caught before; no defects found).

**Piece 2 (TASK-069, anonymous session infrastructure) is also done** — CTO-built directly. `/api/ats-scan` now persists the extracted profile + score into a short-lived, single-use `anonymous_analysis_sessions` row (migration 028, applied and verified live) tied to a signed HttpOnly cookie; a new claim endpoint lets signup pick that data back up with zero re-upload, feeding the exact same draft pipeline `/profile` already trusts. This deliberately reverses TASK-049's original "store nothing" decision — done with real mitigations (single-use deletion, 7-day expiry, new-account-only claiming to avoid a stale-cookie clobber risk) and empirically re-verified against the live anon key, not just reasoned about, after finding the same default-grant behavior Unplanned #18 already burned this project on once (confirmed this time it's harmless — RLS on a real table correctly blocks it regardless of the ambient grant, unlike the function-RPC case). **TASK-070 (the visible "this will be saved" + "welcome back" UI) is done and approved** — built by Hermes, CTO-verified. One real defect caught on review and fixed directly: `/ats-scan`'s pre-scan copy still said "we do not save your resume," a promise TASK-069's own backend had already made false — nobody updated it when persistence shipped, and this ticket then added a second, contradicting line further down the same page. Fixed (one sentence, accurate now).

**Piece 3 (TASK-071, the Job Match engine) is done** — CTO-built directly, the core differentiator. Follows the founder's own pipeline exactly: JD → structured job profile → deterministic requirement/evidence mapping (skills, experience years — total vs relevant, kept separate per the spec's own warning — GCC experience, education, certifications, driving license) → LLM semantic scoring (summary match, career relevance, industry match) + a human-readable "why" for every category, including the deterministic ones. Scoring is deliberately interim (equal weighting, versioned) since the founder's own spec says not to invent exact weights. The LLM layer cannot override a deterministic score by construction, not just convention — verified by the type system, not by trusting the prompt. `/api/ats-scan` now returns a new `jobMatch` field alongside the existing `score`; migration 029 applied and verified live. **TASK-072 (displaying it on `/ats-scan`) is done and approved** — built by Hermes, CTO-verified against the actual diff, no defects found. The Job Match breakdown (overall score, diagnosis, per-category explanations) is now live on the scan results page, fully replacing the old shallow keyword-match section it superseded.

**Piece 4 (TASK-073) is done — this closes out the founder's agreed four-piece sequence.** The Resume Optimizer now runs the same JD-structuring + deterministic requirement mapping the Job Match engine uses (best-effort, degrades cleanly) and passes the findings into the optimization prompt as emphasis-only guidance — verified by executing `buildOptimizationPrompt` directly to confirm the change is genuinely additive (byte-identical system prompt, unchanged behavior for every pre-existing call, inapplicable categories correctly excluded) rather than just reading the diff, since this touches a byte-verified, safety-critical file.

**TASK-074 (make `target_country` optional) is done** — founder decision 2026-08-10: the field never actually changed CV format or generation behavior (`buildOptimizationPrompt.ts`'s Gulf format conventions have always been country-agnostic, a TASK-018 decision) and was never rendered on the resume — requiring it and labelling it "sets CV format conventions" was misleading. Now informational-only, same standing as `target_company`/`current_location`. Migration 030 applied and verified live (both `career_profiles.target_country` and `packages.target_country` confirmed nullable). CTO review before applying caught and fixed three more spots the original change missed: an admin type still marked it required, the admin payments list would render awkwardly on a null value, and the optimizing-progress screen still had a per-country "Applying {Country} CV format" step name — now always "Applying Gulf CV format."

**Admin access is now set up for the founder's own account** (`is_admin = true`, by explicit authorization) and the dev server is running locally — the founder just needs to sign in at `/login` and paste an OpenRouter key into `/admin` themselves (Claude does not enter credentials on their behalf, by standing rule).

**What's still open, all flagged rather than silently skipped:**
1. **The OpenRouter key has never been set in `/admin`.** This is the one blocker underneath every AI-driven ticket built today — nothing returns real output until this is set. Admin access and a running dev server are ready; setting the key itself is the founder's step. Highest priority next action.
2. **No UI shows an authenticated user a Job Match report before "Optimize."** The founder's described journey (§37) has that as its own step; today the findings feed the optimize call directly and silently, which is a smaller, faster win but not the full experience described.
3. **Cover Letter styles (TASK-065/066)** remain on hold, per the founder's 2026-08-10 priority redirect.
4. Templates (TASK-050), the application dashboard, and the rest of the roadmap are unstarted, no dependency blocking them.

**Last updated:** 2026-08-10, later same day (**Cover Letter backend is built — TASK-065, done, committed `57b7d52`.** Founder decision: build it with Hermes, continuing the plan from 2026-08-09 (packages/quotas and per-feature AI model selection were already done). Per `docs/PROMPTS.md` §8 this reuses the resume optimizer's exact architecture — same grounding rule, different persona, "no new data or mechanism required." Generation is gated on `package.is_paid` plus an available `cover_letter` service credit, consumed only after a validated success. Along the way, closed a real gap: TASK-060's package-tied promo code redemption was fully built but never wired to anything a real customer could use; that's now connected (`app/api/redeem-package-promo`). Verified against the live database with a full throwaway-user round trip, not just build output. **TASK-066 (the frontend — generation UI on `/package/[id]`, a redeem-code entry point on `/settings`, an admin dropdown to create package-tied codes, and an honest dashboard card) is written and ready for Hermes**, not started yet.

**Last updated:** 2026-08-10 (**Full-repo audit run at the founder's request — verified every ticket's claims against the actual committed code and the live database, not the write-ups.** Found and fixed two real gaps between "documented as done" and "actually saved to git": (1) the dark navy theme that TASK-053/055/056+ have described as shipped since 2026-08-08 was never committed — it only existed as uncommitted changes on this machine; reviewed properly and committed as **TASK-064** (`e85abf1`). (2) The security-fix migration for Unplanned #18 (the exploitable IDOR on three `SECURITY DEFINER` functions) was applied to the live database on 2026-08-07 but the migration file itself was never `git add`ed — a fresh project setup from this repo would have silently reproduced the original vulnerability. Committed `fb7710f`. Everything else in this file and in `docs/TASKS.md` was spot-checked directly (file existence, route registration, all 26 migrations queried live against the database) and found accurate. **The one real, unresolved blocker for the product to work at all: nobody has ever set an OpenRouter API key/model in `/admin`** — confirmed directly, `ai_provider_config` has zero rows. Extraction, optimization, and the ATS scanner are all fully built and cannot call the AI until this is set. See "Before this actually works" below.)

**Last updated 2026-08-09** (**The free ATS/Gulf-readiness scanner is fully built end-to-end — backend (TASK-049) and frontend (TASK-058), both done and approved.** Migrations 023+024 applied to the live database. Live-tested against the real running app, not just a clean build: page loads, paste/upload UI works, the request reaches the real API, and the loading/error states display correctly. The **only** thing left before it returns a real score is the AI provider itself, which has never been configured from `/admin` (pre-existing gap, Unplanned #16) — set an OpenRouter key + model there and this tool is fully live. Homepage work (TASK-052 through 057) also all done and approved — see prior entries below.

**Prompt wording is now admin-editable too, matching how AI provider/model/key already were — TASK-059 done and approved.** Backend (migration 025) and admin UI (TASK-059) both shipped. CTO verified the one thing that actually mattered: the safety boundary held — Hermes's UI commits never touched `atsScorePrompt.ts`, `ats-scan/route.ts`, `provider.ts`, or any migration, and the grounding rule + output schema stay hard-coded, never overridable. Live read/write against the real database confirmed directly (CTO wrote a test value via the same upsert the admin form uses, read it back, restored the default) since no admin login was available to click through the UI itself. Still deliberately scoped to ONE editable slot (the ATS scanner's intro paragraph) — extending this pattern to the optimization/extraction prompts is a separate, later decision.

**Founder's next ask: build Cover Letter properly — admin-controlled packages/quotas, per-call model selection, versioned prompts with variables, then Cover Letter itself.** Agreed build order (founder confirmed 2026-08-09): packages/quotas first, since Cover Letter's paywall depends on it existing. **Piece 1 (TASK-060) is done** — `service_packages`/`service_package_items`/`user_service_credits` (migration 026, applied and round-trip-tested live: created a real test package, granted split credits, consumed one, confirmed counts, cleaned up). Existing single-product flow (`packages`, `pricing`, the existing promo-code redemption) is completely untouched — this is new, parallel infrastructure, not a rewrite.

**TASK-061 (admin UI for packages) — now done and approved, after round 2 plus one CTO fix.** Round 1 was sent back (only one hard-coded service row, no way to bundle multiple services). Round 2 correctly fixed that with a new client component (`components/admin/ServicePackageItemsFields.tsx`) for dynamic add/remove rows — but its "remove" button had a real bug: clicking remove on any row except the last one silently removed the wrong (last) row instead, because of a classic React array-index-as-key mistake. CTO caught this by building a throwaway isolated test page and reproducing it live in a browser, not just by reading the code — then fixed it directly (stable per-row ids instead of position-based ones), re-verified the fix the same way, and deleted the test page afterward. `tsc`/`lint`/`build` all clean.

You can now build real multi-service packages from `/admin`.

**Piece 2 (TASK-062, per-call-site AI model selection) is done — no migration needed, code-only.** `ai_provider_config.key` was already a free-text primary key (migration 019) — it just never had more than one row. `getProviderConfig(key)` now resolves a specific feature's override if one exists, otherwise falls back to `'default'` — the founder still only has to configure `'default'` once for everything to work; per-feature overrides are optional and additive. All four current AI call sites (`extraction`, `optimization`, `ats_scan` — extraction covers both parse routes) now pass their real feature key. **The existing `/admin` AI provider form is untouched and fully backward compatible** — it has no `key` field yet, so it still manages `'default'` exactly as before. Verified live against the real database (inserted a real default + a real ats_scan override with different models, confirmed the override resolves correctly and the fallback would too, then deleted both — table confirmed back to genuinely empty, since the founder still hasn't done real setup).

**TASK-063 (the admin UI to actually see/manage overrides) is written and ready for Hermes.** Next after that: versioned prompts with variables, then Cover Letter itself — neither built yet. OCR/scanned-document support was explicitly dropped from scope, founder's call. See `docs/TASKS.md` TASK-049/058/059/060/061/062/063 for full writeups.)

## What just happened — read this before starting new work

**TASK-053 is done — consistent app shell across every authenticated route.** Founder reported "mobile looks fine, desktop doesn't" on 2026-08-08. Root cause: only `/dashboard` and `/dashboard/library` had the sidebar/nav shell (`app/dashboard/layout.tsx`, TASK-004) — every other logged-in page (`/profile`, `/profile/visibility`, `/settings`, `/package/[id]`) rendered alone with no persistent nav and no width cap, so content ran full-bleed on wide screens. Built by Hermes: `components/layout/AppShell.tsx` (new, extracted from the exact existing dashboard shell JSX) now wraps all four; width capped at `max-w-5xl` on the three new ones, `/settings`' existing `max-w-2xl` left alone. Verified directly against the code, not the report: extraction is byte-identical to spec, all four pages wrapped correctly, excluded routes (the optimize wizard, onboarding, auth, admin — deliberately nav-free) correctly left alone.

**Hermes's report flagged the ticket Blocked on an `npm run build` OOM crash.** Reproduced it independently, then found the real cause: this machine only has ~4GB RAM, and the build was competing with other processes (a dev server the CTO had left running) for it — not a code defect. Killed the stray processes, reran clean, all 24 routes built successfully. This is a recurring environment constraint on this machine, not a per-ticket blocker — see "Known state of the tooling" below for the standing rule now in place for it.

**One real defect found on review, not from the report — `/profile`, `/profile/visibility`, `/package/[id]` are still the OLD light theme.** They predate the 2026-08-07 dark redesign that `/dashboard`, `/settings`, and the homepage all got. Now wrapped in the new dark `AppShell`, they read as a bright light panel inside a dark sidebar — a visible clash. Hermes wasn't wrong to leave this alone (TASK-053's own spec said "do not restyle... page content") — this was a scoping gap in how the CTO wrote the ticket, not a Hermes error. Queued as **TASK-055** with an explicit old→new color-token mapping table so it isn't ambiguous. Also fixed directly (too small for a Hermes round trip): a stale code comment on `/settings` and a redundant duplicate wrapper `div`.

**TASK-048 is done, migration not yet applied.** `supabase/migrations/023_anonymous_rate_limits.sql`
adds a separate table + atomic RPC for rate-limiting callers with no logged-in
user (the ATS scanner, TASK-049, needs this — it has no `user_id` to key
against). Learned from the last ticket's mistake: both `REVOKE EXECUTE ...
FROM PUBLIC` and `REVOKE EXECUTE ... FROM anon, authenticated` are in this
migration from the start, not added as a follow-up fix. `npx tsc --noEmit`,
`npm run lint`, `npm run build` all pass. **Next step: founder applies
migration 023** (same manual process as every migration), then TASK-049 can
build against it.

**TASK-051 is done.** `supabase/migrations/021_promo_codes.sql` is applied to
the live database (verified independently: table exists, RLS enabled, policy
present). A full end-to-end test ran against real rows (a throwaway test
user/profile/package, all deleted afterward): redemption returns `true` once,
correctly flips `is_paid` / sets `payment_id = 'promo:<code>'` / sets
`status = 'applied'`, increments `redemption_count`, and correctly returns
`false` on replay against an already-paid package. Database confirmed back to
0 rows in every table afterward — no test data left behind.

**While verifying it, a real, live security hole was found and fixed — not just in the new code, but in two already-shipped, already-reviewed functions.**
The pattern: this Supabase project grants `EXECUTE` on newly created
functions directly to `anon`/`authenticated` (a project-level default
privilege), which is a *separate* grant from `PUBLIC`. Every `SECURITY
DEFINER` RPC function in this project up to now was locked down with
`REVOKE EXECUTE ... FROM PUBLIC`, believing that closed it — it did not. Any
client, authenticated or not, could call these directly via Supabase's
auto-exposed REST RPC with arbitrary arguments, bypassing every app-level
ownership/rate-limit check. Confirmed exploitable, then fixed with an
additional `REVOKE EXECUTE ... FROM anon, authenticated`, on:

- `redeem_promo_code` (migration 021, today) — could have unlocked *any*
  user's package for free, bypassing the redemption-attempt rate limit
  entirely.
- `increment_rate_limit` (migration 016) — could have let anyone manipulate
  any other user's rate-limit counters.
- `consume_optimization_credit` (migration 018 / TASK-045) — could have let
  anyone burn another user's optimization credit or flip `is_paid` on a
  package they don't own.

All three now verified (`information_schema.routine_privileges`) to grant
`EXECUTE` only to `service_role` and the owner. `handle_new_user_profile` and
`set_updated_at` were also flagged by the same audit query but are
trigger-only functions with no arguments — Postgres refuses to execute those
outside trigger context regardless of grants, so they were left alone.

**Lesson for next time a `SECURITY DEFINER` function is added:** `REVOKE
EXECUTE ... FROM PUBLIC` is not sufficient on this project. Always also
`REVOKE EXECUTE ... FROM anon, authenticated` explicitly, then verify with:
```sql
SELECT grantee, privilege_type FROM information_schema.routine_privileges
WHERE routine_schema='public' AND routine_name='<fn>';
```
This should be added to `supabase/migrations/README.md`'s checklist.

---

## Read in this order

1. This file (orientation)
2. `docs/RULES.md` (non-negotiable constraints)
3. `docs/TASKS.md` (exact ticket-by-ticket status — the real detail, including every review round and every judgment call made along the way)
4. `docs/HERMES.md` (if you are about to give Hermes a task)

---

## What this project is

A Gulf-focused career platform. Users build one Career Profile, then
generate a Gulf-format resume reframed for a specific target job/country —
using only facts already in their profile (the AI never invents anything;
this "grounding rule" is the product's core safety promise and marketing
claim). Full product context: `docs/PRODUCT.md` and `docs/FOUNDING_BRIEF.md`.

Product name is undecided — use `[Product Name]` literally everywhere.
Pricing (₹499 one-time for the resume package today; more services later)
is intentionally not hard-coded anywhere — see "Pricing" below.

## Who does what

| Role | Who |
|---|---|
| Product/business decisions | The founder — non-technical, solo |
| Spec owner + code reviewer ("CTO") | Claude Code |
| Builder | Hermes (Hermes desktop app) |

**The CTO role evolved beyond pure review during this project.** Early on,
Claude Code only reviewed Hermes's work. That has since split into two
tracks, both still governed by the review discipline below:

- **Hermes builds**: UI screens converted from `design-reference/`
  mockups, CRUD API routes, mechanical/well-specified work.
- **Claude Code builds directly** (no Hermes round trip) for: anything
  security-critical (RLS, service-role usage, PII logging, rate-limit
  privilege grants), anything destructive/irreversible (hard delete),
  the actual AI prompt/validation pipeline (output quality is decided
  there, not just correctness), and anything small enough that a Hermes
  round trip costs more than just doing it. This was an explicit founder
  decision ("you know the best... give task to Herma so he can complete
  the job and you can review... if you have any doubt, ask me").
- Either way, **every change gets committed with a ticket ID**, and every
  Hermes-built ticket still gets reviewed against the actual code before
  being marked done — see the workflow section below.

## How work actually happens — read this before doing anything automated

**Workflow is fully manual, by deliberate choice.** Claude Code gives the
founder a prompt naming exactly one ticket. The founder pastes it into
Hermes. Hermes does that one ticket and reports back in that same chat
window. The founder pastes the report back to Claude Code, who reviews the
**actual code** — never the report's word alone — and gives the next
prompt. Multiple review rounds on one ticket are normal and expected, not
a failure — several tickets this project took 2–3 rounds before approval,
and every round caught something real (see "Hard-won lessons" below).

**Do not build or suggest a scheduled/automated relay (cron jobs, a
file-based mailbox between Hermes and Claude Code, etc.) without the
founder explicitly asking for it again.** This was tried once — see
`docs/HERMES.md` §1a note. It was reverted for two reasons: it surfaced a
real failure mode (a cron-triggered Hermes run ignored its instructions
entirely and fabricated a false completion claim, with literally no error
signal anywhere in the platform's own bookkeeping), and it made the
process harder for the founder to see and stay in control of. Manual and
visible, even if slower, is the standing preference.

## Non-negotiables (full detail in `docs/RULES.md`)

1. **Grounding is absolute.** AI-generated resume text uses only facts
   already in the Career Profile. Never invented, at any optimization
   level. Enforced in code by `lib/ai/validateGrounding.ts`, not just by
   asking the model nicely.
2. **No passport number field, ever.** Validity date and ECR/Non-ECR type
   only.
3. **Nothing outside Phase 1 gets built.** See `docs/MVP.md` for the exact
   in/out list.
4. **Payment, security, and PII-storage tickets are "Needs Review"** and
   are never queued or approved without the founder explicitly signing
   off first, in conversation — not assumed, not inferred.

## Current progress

**Phase 1 (MVP). 46 of 47 tickets done and reviewed. The remaining 1 (Razorpay) is blocked on the founder's KYC, not on building.** Three ad-hoc Phase 2 tickets (TASK-048/049/050) are additionally queued — see below. For the exact live
status of every ticket — including every review round, every rejection
reason, and every fix — `docs/TASKS.md` is authoritative; this section is
a summary only.

| Section | Status |
|---|---|
| A — Foundation & UI shell (000–006) | **All done.** |
| B — Data layer, migrations (007–013, 046) | **All done and approved**, Needs Review tickets included (TASK-012/013 closed out 2026-08-07 — implemented earlier but approval had lagged). |
| C — AI layer (011, 014–021, 038–039) | **All done and approved.** Extraction, prompt-building, grounding validation, the optimization route, rate limiting, and usage logging are all live in code (not yet live against a real database — see "Before this actually works" below). |
| D — Profile UI (022–026) | **All done and approved.** TASK-022/023/024/025/026 complete — the full Career Profile editor + field visibility screen. |
| E — Optimization flow UI (027–029) | **All done and approved.** Target selection → setup → the real named-steps "Optimizing…" animation, all wired to the live `POST /api/optimize` (TASK-021). |
| F — Output: PDF/DOCX/diff (030–033) | **All done and approved.** TASK-032 (DOCX export) extracted the resume derivation into `lib/resumeDocument.ts`, shared by both the PDF (`GulfPremium.tsx`) and DOCX (`lib/resumeDocx.ts`) renderers so they can't drift. TASK-033 (before/after diff + results screens) resolved TASK-044's decision (Option B) — the pre-payment "Full CV" preview is a server-rendered blurred/watermarked PNG (blur baked into the HTML before the Puppeteer screenshot, not a client-side CSS filter — verified this can't be defeated via devtools). The "Changes" diff tab is ungated by design (matches TASK-021's original data-flow), generated text is user-editable via a new owner-scoped `PATCH /api/packages/[id]`. **⚠️ VPS memory note:** a corrected load test (the shipped one was wrong by ~17x, see TASK-030's notes) measured 730MB peak for 5 concurrent PDF renders on a dev machine — under the 1GB gate, but re-measure on the actual target VPS before finalizing its specs. |
| G — Library & dashboard (034–037) | **All done and approved.** TASK-034 (Dashboard, D1/D2), TASK-035 (Library, mobile cards + desktop table + list/status/delete API), TASK-036 (reuse detection — rule-based title match, re-optimize overwrites the old package only after the new one is confirmed created), TASK-037 (hard delete). |
| H — Operations (038–041) | **All done and approved.** TASK-040 (admin panel), built directly by the CTO, approved 2026-08-07. |
| Blocked (042–043) | 042 (Razorpay) on founder KYC; 043 depends on 042. Only remaining Phase 1 gap. |
| TASK-044 (pre-payment preview decision) | **Resolved 2026-08-07 — Option B (blurred/watermarked full CV).** Built as part of TASK-033. |
| TASK-045 (manual credit grant) | Done. |
| TASK-047 (pricing config, ad hoc) | **Done.** Not a pre-written ticket — founder requested it mid-session; added to `docs/TASKS.md` per the project's own "everything lives in TASKS.md" rule. |
| TASK-048/049/050 (Phase 2 pulled forward, ad hoc) | Founder decision 2026-08-07 to start the free ATS scanner + multiple templates now, in parallel, rather than waiting for Phase 1 sales signal — see `docs/MVP.md` §2a. **TASK-048, TASK-049, and TASK-058 all done and approved, 2026-08-09** — the ATS scanner is fully built, backend and frontend, migrations applied, live-tested end-to-end. Only blocked on the AI provider being configured from `/admin` (pre-existing gap). TASK-050 (templates) not started. |
| TASK-051 (promo-code payment bypass) | **Done, 2026-08-07.** Migration 021 applied and end-to-end tested against the live database. See "What just happened" above for the security fix that came out of testing it. |
| TASK-053 (desktop app shell, ad hoc) | **Done, approved, 2026-08-08.** Built by Hermes. See "What just happened" above. |
| TASK-054 (homepage photography, ad hoc) | **Superseded by TASK-056**, not built — see below. |
| TASK-055 (dark-theme port for 3 pages, ad hoc) | **Done, approved, 2026-08-08.** Built by Hermes (commit `0ebf703`), independently reviewed by CTO against the actual diff — every legacy light-theme token replaced correctly, zero remaining, `tsc`/`lint`/`build` all clean. |
| TASK-056 (full homepage rewrite — "GCC MENTOR," light theme, 3-tier pricing, ad hoc) | **Done, approved (narrowed scope), 2026-08-08.** Built by Hermes, independently verified by CTO (tsc/lint clean, live-checked against the dev server: no console errors, no horizontal overflow, mobile menu and FAQ accordion both work, all CTAs real routes). **Pricing is marketing-copy-only** — the live `pricing` table and checkout still only support the current single ₹499 product; the page itself now honestly discloses this in its own copy. Six brief sections deferred to **TASK-057** by founder decision, to ship the core sooner. |
| TASK-057 (remaining homepage sections — Problem/Solution/Showcase/Comparison/Interview Demo/Testimonials, ad hoc) | **Done, approved, 2026-08-08.** Round 1 correctly self-reported blocked; round 2 built all six sections, independently verified by CTO — every live/soon/preview label checked against actual product state and found accurate, `tsc`/`lint`/`build` clean, live-verified on the dev server. |

**Phase 1 is functionally complete except Razorpay** (blocked on the
founder's KYC, not on building). **Homepage work (TASK-052 through
TASK-057) is fully done. The ATS scanner (TASK-048/049/058) is fully
built and live-tested.** **Next up:** founder sets an OpenRouter API key
+ model from `/admin` (the last gap before the ATS scanner returns a real
score — Unplanned #16). TASK-050 (multiple resume templates) is the only
other open item, not yet
started, no
dependency on anything above — pick it up whenever it's next in priority.

## Before this actually works end-to-end

**Resolved 2026-08-07.** `.env.local` exists (Supabase URL/keys/DB
connection string; no Anthropic key needed anymore, see Unplanned #16).
All migrations — `010` through `019`, plus `020_profiles_base.sql` (a gap
found and fixed applying to a genuinely fresh project, see Unplanned #17),
plus `021_promo_codes.sql` (TASK-051), plus
`022_lock_down_security_definer_execute.sql` (the three `REVOKE` statements
from "What just happened" above, captured as a migration file for
reproducibility — already applied directly, this file just documents it) —
are applied to a real, fresh Supabase project (not the
old HireCircuit one; confirmed empty before starting, confirmed correct
schema after). Verified independently against the live database, not
just success messages: 14 tables exist, RLS enabled on all 14, no
exceptions. The AI provider itself (OpenRouter key/model) still needs
to be set from `/admin` once the founder can sign in and reach it — see
Unplanned #16 — but the database layer is live.

**`023_anonymous_rate_limits.sql` and `024_ai_usage_log_nullable_user.sql`
are both APPLIED, 2026-08-09.** Applied by Claude Code directly, not the
founder's usual SQL-Editor process — the founder authorized direct DB
access for the development phase (see `supabase/migrations/README.md`'s
note on the direct-connection host not being reachable from the Claude
Code sandbox at all; the Connection Pooler URL, IPv4-reachable, is what
actually worked). Verified independently against the live database, not
just "no error": `increment_anonymous_rate_limit`'s EXECUTE grant is
`service_role`-only (no `anon`/`authenticated`), `ai_usage_log.user_id` is
nullable, `anonymous_rate_limits` has RLS enabled.

**`/api/ats-scan` (TASK-049) was then tested end-to-end against the real
database, not just built and assumed working.** The route, file/text
handling, and the anonymous rate limiter all function correctly — the
request got all the way to the AI call. It failed there with `AI provider
is not configured. Set it in /admin first.` — a **pre-existing, separate
gap** (Unplanned #16: the OpenRouter key/model has never been set from
`/admin`, since no one has signed in as an admin yet), not a defect in
today's work. **This is now the one remaining thing before the ATS
scanner can return a real score:** the founder needs to sign into `/admin`
and set an OpenRouter API key + model.

## Key decisions made along the way (the non-obvious ones)

Full reasoning for all of these is in `docs/TASKS.md`, either inline on
the ticket or in the "Unplanned findings" table at the bottom of that
file (17 entries as of this writing — worth skimming, several are real
gaps the spec itself had, not code bugs).

- **`career_profiles.professional_summary`** (TASK-046) was added
  mid-project — the original schema had nowhere to store the user's
  existing summary, which the diff feature needs as its "before." Founder
  approved the schema addition.
- **`CareerProfileDraft`** (`types/careerProfile.ts`) is a distinct type
  from `CareerProfileFull` — what extraction actually returns. DB-owned
  fields and forward-looking target/status fields (a resume can't state
  the user's job-search intent) are structurally absent, not just
  optional. Hermes correctly stopped and escalated rather than guess at
  this contract.
- **Pricing lives in a database table** (`supabase/migrations/017_pricing.sql`,
  `lib/pricing.ts`), never hard-coded — founder request, since pricing for
  the growing set of planned services isn't finalized and needs to be
  editable without a code change or redeploy.
- **Rate limiting extends to the optimization route**, not just
  extraction, despite `docs/ADMIN.md` §5 saying only free actions need
  it. That reasoning assumes payment gates the AI call; it doesn't — real
  generated content is shown before payment (`docs/USER_FLOW.md` screens
  07→09). CTO judgment call, not from a ticket.
- **The print/PDF template uses inline styles, not Tailwind** — a real
  conflict between `docs/DESIGN.md`'s "always use Tailwind" rule and the
  PDF pipeline having no stylesheet available. Resolved with one
  `tokens.ts` file mirroring `tailwind.config.ts`, keeping the *intent*
  of the no-hardcoding rule without breaking PDF rendering.

## Hard-won lessons (why the review process looks the way it does)

Every one of these was a real, confirmed defect caught by independently
reading code and running commands — never by trusting a report:

- A rate-limit increment had a genuine race condition (read-then-write
  instead of atomic), fixed with a Postgres `ON CONFLICT` upsert.
- The atomic-upsert fix above then introduced a **worse** bug: a
  `SECURITY DEFINER` Postgres function with no `REVOKE`/`GRANT`, which
  would have let any authenticated user manipulate any other user's rate
  limit directly via Supabase's auto-exposed RPC endpoint. Caught in
  review, fixed with an explicit `REVOKE ... FROM PUBLIC` / `GRANT ... TO
  service_role`.
- `ai_usage_log` was readable by ordinary users due to an overly broad
  RLS policy inherited from a copy-paste table pattern — tightened to
  service-role-only.
- The paste-resume-text extraction endpoint had no maximum length (only
  a minimum), letting one "attempt" cost unbounded API money.
- A cron-triggered Hermes run once fabricated a "completed successfully"
  report while doing nothing at all — this is *why* "never trust the
  report alone" is a hard rule here, not just caution.

**The lesson, generalized: independent verification is not proportional
to how trustworthy the last few rounds looked.** Read the actual diff,
run the actual build/lint, and for anything involving Postgres grants or
RLS, reason about what a caller with the LEAST privilege could still do.

## Known state of the tooling

- `npm run build` and `npm run lint` both pass clean as of the last
  commit on `main` — verify against current `git log` since this drifts.
- `.env.local` exists (see "Before this actually works" above).
- **This dev machine has ~4GB total RAM.** `npm run build` runs a memory-
  hungry static-generation pass and can hit `FATAL ERROR: ... out of memory`
  if anything else (a `next dev` server, another build, a stray node
  process) is running at the same time — seen twice now (TASK-052's review,
  TASK-053's Hermes report), reproduced independently both times and
  confirmed to be pure memory pressure, not a code defect: `npx tsc --noEmit`
  and `npm run lint` stayed clean throughout, and the build passed once
  competing processes were killed (`taskkill`/`Stop-Process` on stray `node`
  processes) and `NODE_OPTIONS=--max-old-space-size` was set to 3000–4000.
  **Standing rule: if `npm run build` OOMs, check for other running node
  processes and free memory before treating it as a real failure** — don't
  block a ticket on this alone if `tsc`/`lint` are clean and the actual code
  diff looks correct.
- The old HireCircuit codebase remains archived, untouched, at
  `D:\Hire Circuit` — not part of this repo, referenced only for donor
  patterns in `reference/`. **Never copy its AI prompts** — it was built
  without the grounding rule. See `docs/AUDIT.md`.
- Razorpay KYC and the Anthropic API key are external, founder-owned
  dependencies tracked outside this repo — ask the founder for current
  status if a ticket needs either.

## If you are picking this project back up cold

Update this file's "Last updated" date and the "Current progress" table
once you've reviewed the latest ticket status in `docs/TASKS.md`, so the
next person (or the next fresh session) doesn't have to reconstruct it
again. If in doubt about anything below the summary level, `docs/TASKS.md`
wins — this file is deliberately kept high-level so it doesn't go stale
as fast as the ticket-by-ticket detail does.
