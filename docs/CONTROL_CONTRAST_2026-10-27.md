# CONTROL-CONTRAST-001 — approved 27 October 2026

Satish reported unreadable white-on-white cover-letter tone choices and optimized-resume edit controls, and authorized checking the whole SaaS against the current navy theme. Prior source review missed interaction-state and native-option surfaces.

Acceptance: all four tone choices readable selected/unselected/focused; editor fields and section options readable at rest and focus; shared controls use current semantic surface/ink/line tokens; retain document paper and exports. Mobile and desktop inspection with fictional data, production build, required CI and release verification. No service, data, authentication, scoring or template changes.

Confirmed before fix: expanded cover-letter choices render cream with light text. Source: bg-field legacy token. Shared .field:focus directly applies bg-white; native select options lack explicit themed foreground/background. Affected sources: app/globals.css, app/ui-system.css, app/cover-letter/page.tsx. Inspect additional literal color escapes before applying scope corrections.

Status: implemented. Unselected tone choices use bg-canvas and semantic border; shared bg-field legacy consumers are paired with surface/ink/border roles. Field focus uses semantic surface/ink at source. Native inputs/selects/textareas use dark color-scheme and option/optgroup colors are explicitly paired, outside document boundaries.

Source inventory: searched active app/components CSS/TSX for literal white/pale backgrounds, bg-field consumers and focus:bg-white states. Existing bg-white bridge handles ordinary shared UI cards. Remaining white paper in resume/template previews, LinkedIn mock profile and preparation illustrations is intentional. Dormant historical landing CSS and surface-token fallback literals are not active white escapes.

Browser evidence: reproduced the cream/light tone choices before fix. Real dynamic editor component rendered with fictional package/profile data and production CSS: focused Name field and eight section options resolve navy rgb(13,21,38), light ink rgb(241,246,253); document preview remains black on white. No real account records were changed. Native dropdown rendering differs by OS; checked computed option colors as well as editor screenshot. Mobile tone/field and broader representative screen checks are recorded in release PR. Settings/admin require server sessions and receive source coverage rather than claimed full live-account visual inspection.

Verified locally: production build (includes lint/types) and universal-theme regression checks passed. At 390px all four tone choices are readable; selecting Short moves the pressed state and colored selection correctly. Editor desktop screenshot confirms theme controls with white paper preview. Required full CI and production release status are recorded in the delivery PR.
