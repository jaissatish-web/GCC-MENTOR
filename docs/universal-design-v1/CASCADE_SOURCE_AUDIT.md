# Universal Design cascade — source audit before consolidation

Date: 11 November 2026. Source baseline: PR79 review head `c82ad4f` (application changes through `09dfe46`). This audit inspects source declarations and selector matching. It does **not** report captured browser-computed values, loaded stylesheet order, screenshots or a new resume/PDF equivalence result. The lead's separate browser evidence must establish actual winners and rendered results.

The current request authorizes targeted cascade consolidation: Universal Design owns the design values for migrated website UI; component styles own functional layout. Do not add another override stylesheet or expand the pilot into a full SaaS migration. All resume templates, typography, styling, preview/rendering/scaling and PDF paths remain protected.

## Existing owners and load structure

| Source owner | Inspected role | Source evidence |
|---|---|---|
| `app/globals.css` | Imports UI-system, profile, typography, responsive, studio/auth/review styles, then Tailwind directives; base body typography and fields; protected document baseline and orbit geometry | imports1–7, directives9–11, body47–61, fields125–145, orbit rules192–286, document baseline288–297 |
| `app/ui-system.css` | Original `--ui-*` RGB palette, semantic aliases, geometry, legacy Tailwind compatibility bridges, shared primitives and later application-specific fixes | tokens4–96; shared geometry122–155; legacy bridges from290; operational fixes1028 onward |
| `app/typography.css` | Original root type tokens, broad enforced UI rules, utility mappings, semantic heading rules and numerous scoped exceptions | tokens4–59; enforcement64–144; internal aliases173–185; marketing aliases282–292; mono exception302–303 |
| `app/responsive.css` | Existing application-only responsive layouts and field/button restyling | broad media union4–20; mobile24 onward; narrow root gutter58–59 |
| `components/landing-v3/premium.module.css` | Actual landing component layout and an older complete design declaration set | root aliases3–28; component declarations31 onward; layout media191–226 |
| `components/landing-v3/universal-pilot.module.css` | A second presentation layer over those same landing components; duplicates specificity, important declarations and document-free compatibility aliases | repeated `.pilot.pilot` throughout; typography4–20; geometry21–52; alias bridge59–76; extra patches79–91 |
| `components/design-system/UniversalTheme.module.css`, `lib/design-system/theme.ts` | New typed settings, three responsive variable sets and explicit shared foundation classes | responsive aliases3–212; component classes214 onward; typed allowlist/serialization in theme helper |

`postcss.config.mjs` loads Tailwind and Autoprefixer. Tailwind v3 `@layer` directives are build-time grouping; their source position alone does not establish the emitted browser stylesheet ordering. Confirm ordering in the built assets. Some declaration precedence is nevertheless certain from importance/specificity where the selectors match.

## Actual source conflicts and their causes

| Concern | Competing source declarations | Source-level conclusion and required consolidation |
|---|---|---|
| Hero and section typography | Landing `.heroTitle`70 and `.sectionTitle`117 request Instrument Serif/fluid sizes/regular weight; typography65 sets Inter on every eligible node with `!important`; heading rules134–136 set role sizes/weight with `!important`; pilot4–17 restores a third UDS declaration set with `!important` | The landing file no longer truthfully describes its rendered design. Remove obsolete design declarations at the actual owner and migrate those declarations directly to UDS roles. Disable legacy enforcement only for the migrated UI elements, preserving document ancestry. |
| Body/helper text | Landing `.heroSub`74, `.freeNote`87, `.featureCard p`132, `.footerCopy`185 each define text roles; typography116 applies body size to all p/li/dd; typography121 styles small; pilot8–9 gives p and small the same body role; pilot18 selectively reasserts helper size | Semantic helper intent can be flattened and then partially repaired. Assign intentional body/helper roles once in the component owner. Keep helpers distinct rather than relying on element name plus patches. |
| Scores/emphasis | Landing `.statItem b`102 and `.heroNavy .statItem b`104 conflict with typography120's bold role; pilot20 installs another important score size/weight | Use the shared score role at the score declaration; remove unused serif/weight fallback declarations rather than override them later. |
| Navigation and actions | `ui-system.css`147 sets header/nav text; typography119 and141 enforce button/nav type; landing39–57 and76–86 define buttons/nav; pilot32–49,55,79,87–88 restyle them again | Existing `.system .navCta` and hero-specific secondary styles can compete with later primary/secondary rules, especially hover states. Migrate the actual classes to UDS design values; preserve display/menu geometry. Keep one action typography/height/radius/color definition with intentional state rules. |
| Cards and containers | Landing `.heroVisual`91, `.featureCard`128 and country109 define surfaces/radii; pilot26–28 and39–40 replace them | Component layout can remain, but old surface/radius/shadow declarations should be replaced at their source. Card padding should consume one setting rather than win through a second selector. |
| Widths/vertical rhythm | Landing root10–18 defines fixed1200px, fluid16–48px gutter and64–112px sections; landing31/114 consume those; pilot21–24 supplies unrelated responsive UDS values | Two independent systems own the same dimensions. Bind the actual width/section declarations to UDS values and remove unused local variable definitions. Preserve document dimensions, orbit track dimensions and breakpoint-based grid layout. |
| Mixed theme namespaces | Landing root4–9 sets `--lp-*` from original `--ui-*`; UDS serializes a new `--uds-*` set; pilot59–76 maps selected UI aliases only inside header/footer/document-free widgets; other nodes use direct UDS overrides | Source can appear connected while an unconverted node still uses original blue UI tokens. Consume UDS in migrated design declarations. Keep any necessary compatibility bridge small, explicit and restricted to existing document-free components; do not introduce aliases on the landing/document-bearing root. |
| Responsive settings | Original geometry changes at640px (`ui-system.css`89–96), original type at768px (`typography.css`48–59), landing layout600/960/1180px and narrow599px (`premium.module.css`191–225), UDS values768/1024px | Multiple layout breakpoints are not inherently defects. UDS device settings should own the design values; component breakpoints should own when layouts/navigation change. Remove only duplicate value declarations, not functional breakpoints or animations. |
| Forms/demo text | Original globals125–145 and typography118 enforce field metrics; interview module9/17 fix44px targets and helper text; pilot52 adds a third field rule; interview42–43 use important helper rules | Preserve16px mobile input floor and existing form behavior. Connect design values at component field declarations or shared classes. Retain purpose-specific demo feedback/helper roles. Avoid reintroducing broad input or paragraph overrides. |

## Why adding another override cannot solve this

At this baseline, literal `!important` occurrences are207 in typography,16 in UI-system,6 in responsive,25 in the pilot and24 in the foundation stylesheet. Landing `premium.module.css` has none. These are source string counts, not loaded-rule counts or proof of application coverage.

The pilot duplicates its class (`.pilot.pilot`) to increase specificity. Its family/tracking selector at4 also contains `:not(:has(... #resume-render ...))`. The `:where(...)` document exclusion contributes zero specificity, but the separate `:not(:has(...))` contributes the most specific argument, including the ID. That family rule therefore acquires ID-level specificity despite targeting ordinary UI. This is a maintenance hazard, not a reason to increase specificity again.

For matching important heading rules, `body :is(h1,h1[class])` has class-level specificity from `h1[class]`; `.pilot.pilot [data-uds="hero-title"]` is still stronger. Thus pilot type can win while the original module's design declarations are permanently overridden. A CSS declaration being present in a file does not mean it controls the appearance.

Conversely, importance alone does not prove a property is connected to the intended setting. Colors, widths and state declarations often remain normal declarations with different contextual selector strength. The browser evidence must record selector, stylesheet and computed value for default and modified settings, including hover/focus and mobile states.

## Safe architecture for this targeted refactor

1. **One value authority for migrated UI:** retain the typed UDS schema/defaults and responsive aliases. Do not change original root `--ui-*` values. Keep the original website/app theme working for unmigrated routes.
2. **Edit existing component owners:** replace obsolete landing design declarations in `premium.module.css` with UDS consumption; retain grid/flex, positioning, sizes needed for orbit containment, overflow, disclosure/menu behavior, breakpoints and motion. Do the same at actual document-free demo owners when required.
3. **Remove the pilot override layer:** remove its duplicated design declarations/import once the actual owners consume the values. An empty compatibility file or a renamed override file is not consolidation.
4. **Narrow legacy enforcement rather than outcompete it:** edit existing generic typography/compatibility selectors so explicitly migrated website UI is outside their coverage. Use a low-specificity guard and clear migration boundary; do not add fresh important rules to undo legacy important rules.
5. **Preserve document ancestors:** a blanket exclusion of every `[data-universal-theme]` descendant is unsafe. Original `body *` enforcement also supplies family/style/tracking to orbit buttons and wrappers containing the document. Removing that legacy behavior can alter inherited document values even when the actual template subtree is excluded. Retain prior behavior on protected roots/descendants and their existing ancestors, or opt out only explicitly marked document-free UI nodes/subtrees. Do not set new font/color/weight on the universal wrapper or document-bearing landing root.
6. **Keep document identity exact:** preserve `[data-document-preview]`, `#resume-render`, `.actual-template-orbit-face`, `[data-typography="document"]`, their descendants and existing inherited metrics. Global class/ID references inside CSS Modules require `:global(...)`; attribute markers do not. Do not reset document styles or modify rendering code to make tests pass.
7. **Keep foundation classes intentional:** scoped explicit classes may consume UDS for specimen/shared UI. When legacy enforcement no longer matches them, remove redundant important usage there too. Do not migrate remaining SaaS surfaces implicitly.

## Required browser evidence and release gate

Record before/after actual computed font family, size, weight, line height, tracking, foreground/background, padding/gap/radius/border/min-height and relevant widths for hero, marketing headings, body/helper text, scores, primary/secondary buttons, cards, navigation and orbit chrome at the requested six widths. Identify the winning matched selector and stylesheet, not just the final value. Exercise the six requested setting changes and hover/focus/menu/reduced-motion behavior.

Also compare protected mounted resume nodes **and their inherited ancestor metrics** before/after, representative preview images/scaling and real PDF outputs under identical fictional fixtures and stable browser/font conditions. Existing document source equality alone is insufficient. Any unintended resume difference blocks merge. Source-level architecture findings in this document must not be presented as computed browser findings or visual approval.

## Observed browser cascade before refactoring

Read-only inspection of deployed PR build `1813fc5` at 1363 × 936 is saved in
`evidence/cascade/browser-before-1363.json`. The generated CSS rules and their
priorities are included; the CI instrument adds source ranges and desktop/mobile
comparisons. These values are observations, not estimates from source CSS.

| Target | Computed before | Actual competing sources / root cause |
| --- | --- | --- |
| Hero | Inter, 52px/62.4px, 600 | Legacy `body *` family enforcement, `h1[class]` enforcement, serif/fluid component declarations and doubled pilot class rules all match. Pilot important size/weight/line wins. Its font guard also accidentally imports ID specificity through `:has(#resume-render)`. |
| Marketing heading | 34px/40.8px, 600 | Old semantic heading enforcement and component sizes lose to pilot important declarations. |
| Hero paragraph | 16px/24px, 400 | Pilot important body line wins over old 1.55 reading line. |
| Primary/secondary CTA | 14px/21.7px, 600; minimum 46px | Pilot owns size/height/radius/color, but old 1.55 line-height survives. Mixed ownership makes settings incomplete. |
| Service card | 24px padding; 12px radius; inherited 24.8px line | Pilot overrides component geometry while old text inheritance remains. |
| Navigation | 14px/21px, 600 | Old important navigation rules and pilot styling split control. |
| Orbit UI container | 16px/24.8px; original navy inheritance | Contains document ancestors. Applying new body font/color to this container could leak into documents despite exclusions on template nodes. |

`responsive.css` was inspected: its main rules target `.app-type`, dashboard and
mobile application navigation; these do not match the current landing wrapper.
It remains unchanged. Shared root tokens, Tailwind base rules and document
styles also remain unchanged. Removing every old rule globally would migrate
unapproved screens and risk document inheritance.

## Targeted consolidation implemented

- Removed `universal-pilot.module.css` and its import, including doubled-class
  specificity and its important declarations.
- Edited existing `premium.module.css` design declarations to consume UDS values.
  Component grids, positioning, responsive layout and orbit geometry stay owned
  by that component. Removed dead serif/fluid size tokens and duplicated rules.
- Added a zero-specificity migration opt-out to the existing guarded legacy
  policies in `ui-system.css` and `typography.css`. Unmigrated routes and the
  original document-bearing ancestors retain their existing enforcement.
- Existing `typography.css` supplies low-specificity UDS defaults inside the
  opt-in website boundary. Document roots, descendants and their ancestors are
  excluded. No new stylesheet or important override policy was introduced.
- Kept a one-way UDS-to-legacy alias adapter only on marked document-free widgets
  (globe/demo). Original root `--ui-*` formats/values and document-facing landing
  aliases remain fixed. UDS is the value authority; these aliases are readers.
- Removed redundant important declarations and the legacy line-height dependency
  from the shared foundation and its preview specimen.

Full runtime verification remains a release gate. Static compilation or a source
exclusion alone does not prove mounted resume/PDF equivalence. See CI evidence
and RESUME.md for current results; do not merge or deploy while any gate fails.

Source review caught two remaining conflicts before final verification: the separate legacy Plex Mono/kicker policy had no migration opt-out, and InterviewDemo select base/mobile styles restored a 13px font after removing the pilot. The existing mono policy is now scoped out of migrated document-free UI while preserving original document behavior. The actual select owner now uses the centralized input height and a 16px minimum text size; its duplicate mobile font declaration is removed. Browser tests explicitly verify switched fonts across hero/kicker/body/buttons/cards/navigation and input text size.

The first broad CI run also caught hero clipping at 200% text size on 360px. The old generic long-word wrapping rule had been correctly opted out but its behavior was missing from migrated defaults. Restored `overflow-wrap:anywhere` in the existing zero-specificity document-free website policy; the enlarged-text regression assertion is preserved.

Independent setting checks confirmed font, responsive type, radius, padding, spacing and height but caught primary-color timing under reduced motion: the old pilot disabled CTA transitions while the component owner still animated background for160ms. Restored that reduced-motion behavior in the existing component media rule, retaining normal animations and immediate reduced-motion preview updates.

## Verification checkpoint

Application/test head06c7c05; final visual run42954072144 is the authoritative
rerun for wrapping and reduced-motion corrections. Prior run42952841447 retained
all six widths and before/after matched-rule/computed reports. At390/1440, sampled
hero/headings/body/CTA/card/nav/kicker/select design declarations no longer match
important enforcement. Original orbit UI typography and document-facing root
metrics are retained. All64documentfixtures (128states) and12PDFs match original
main in that prior run. Exact mounted runtime geometry remains a blocking gate;
see RESUME.md and current-orbit/original-orbit diagnostic JSON. No rendering code
or exact-comparison threshold was changed to achieve a pass.

Final widget coverage review found `GccGlobe` JSX utilities still read hardcoded Tailwind canvas/teal/ink/line values after opting out of legacy utility remapping. Replaced those UI classes in the actual component owner with direct UDS color/type/card/control values (legacy fallbacks preserve isolated reuse). Added selected-country/card computed checks. Globe hooks, painter, timing, masks and interactions remain unchanged; reduced-motion country transitions now resolve immediately.

Run42954402682 passed broad CI, all independent setting checks and six default widths,64authored documents and12PDFs. Its strict live gate failed at390 baseline stability and1440 clinical_care pixel comparison. Diagnostics show only native-zoom/layout cycle states; no font/size/weight/line/color change. Original main also cycled at both widths in that run. This supports a protected auto-fit feedback issue but does not replace or pass the same-width pixel gate. The final widget-only follow-up still requires a fresh run.
