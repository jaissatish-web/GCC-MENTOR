# Repeatable CSS cascade evidence

`scripts/audit-css-cascade.mjs` audits the completed production landing HTML and its original compiled assets without injecting CSS, editing the DOM, changing a theme or changing resume rendering. It uses the existing Puppeteer/CDP and PostCSS dependencies.

```sh
node scripts/audit-css-cascade.mjs --self-test
CHROME_PATH=/path/to/chrome QA_PHASE=before QA_BUILD=.next-before node scripts/audit-css-cascade.mjs
CHROME_PATH=/path/to/chrome QA_PHASE=after QA_BUILD=.next node scripts/audit-css-cascade.mjs
```

`QA_ROOT` defaults to the current checkout. `QA_BUILD` resolves relative to that root. An older compiled artifact can be inspected without rebuilding it. `QA_URL` optionally selects an already-running local page instead. Do not use customer accounts or production mutation endpoints. The local fixture only supplies read-only anonymous API responses; it is a presentation audit, not authenticated service verification.

Output: `artifacts/cascade-audit/<phase>/report.json`, `cascade-390.json`, `cascade-1440.json` and corresponding landing screenshots. The report records build identity, source hashes/inventory, loaded CSS URLs/source-map URLs, CDP matched rules with generated source ranges, computed styles, author candidates, importance/specificity/source order, repeated declarations, protected-document trees and ancestors' computed typography/geometry.

The specificity comparator covers `:where()` zeroing and the maximum branch of `:is()`, `:not()`, `:has()` and `nth-child(... of ...)`. The browser determines which branches actually match. Active media/supports and stylesheet media/disabled state are respected. CSSOM order supplies document stylesheet/rule/declaration ordering; inline author declarations are ranked separately.

`winningDeclaredRule` is emitted only for the bounded direct-author cascade that can be resolved. Shorthand contributions, layers/scopes/container conditions, inaccessible/imported rules, non-author important declarations, active transitions/animations and explicit inheritance/revert are labelled `unresolved`. Browser computed styles and raw CDP ancestor/matched records remain the primary evidence. Inherited values must not be attributed to an arbitrary direct rule. If production CSS has no source maps, the report retains generated ranges and original-source inventory but does not invent original-source mappings. The inventory is the current QA_ROOT source; it is not proof of the source of an older QA_BUILD artifact.

Local validation on 11 November: JavaScript syntax and specificity/cascade self-tests pass. A real browser smoke attempt with `/usr/bin/chromium` failed during launch with `TargetCloseError (Target.setDiscoverTargets)` before page inspection. No browser-computed winners, screenshots or protected-document comparison are claimed from that attempt. CI browser execution remains required.
