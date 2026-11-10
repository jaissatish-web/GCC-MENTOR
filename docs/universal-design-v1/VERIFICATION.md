# Universal Design V1 — repeatable verification

Status: browser harness added; syntax validation passed. Browser execution was attempted and blocked at Chromium launch (Target closed); screenshot review and before/after PDF equivalence remain unverified. No generated screenshot or PDF baseline is claimed.

## Local built landing and setting changes

After installing the repository dependencies and completing `npm run build`, use a supported machine with local Chromium:

```sh
CHROME_PATH=/absolute/path/to/chromium node scripts/verify-universal-design-browser.mjs
```

The script uses the actual built landing HTML, JavaScript, CSS and local assets behind a synthetic read-only HTTP server. External requests are blocked; API requests receive fictional empty data. It never signs in, generates AI output or writes customer data.

It captures full landing screenshots at360,390,430,768,1024,1440px and checks overflow, default hero type, card padding/radius, section spacing and button height. An iframe loaded with the same preview protocol as the admin panel then exercises primary color, mobile hero size, card radius, card padding, desktop section spacing and button height at390/1440px. It also changes the website font to stress the document boundary.

Mounted real orbit documents are compared before/after those setting changes by computed typography, color, layout properties and fixed-location clone screenshot hashes. Normalizing the screenshot location removes unrelated orbit/whole-page movement; the actual mounted document computed properties are checked separately. Results and PNGs go to `artifacts/universal-design-v1/`. A failed assertion is a blocking issue, not a successful certification. The script reports blocked external origins so missing external assets remain visible to reviewers.

This gate does not certify the authenticated admin route, local-draft interactions, real sessions, persistent publishing, or preview/PDF equivalence against the original main build. Manually review the screenshots and keyboard/focus/menu interactions after it passes.

## Mandatory original-build document gate

Before changing global styling, retain the unmodified main build’s `.next/static/` and `.next/server/app/index.html` together, and original representative photo/no-photo PDF outputs using the existing PDF fixture runner. Do not overwrite the originals with the changed build.

After the changed build, use the existing compiled CSS comparison:

```sh
TYPE_BASELINE=/absolute/path/to/original-build TYPE_BASE_REF=f72e2faccf4e287f9ac7d213d988f8045a10a961 CHROME_PATH=/absolute/path/to/chromium node scripts/verify-typography-documents.mjs
```

The baseline directory must contain `static/` and `index.html` in the layout described by that script. Run representative templates through `scripts/verify-template-pdfs.ts` before and after (supported arguments, `OUT` retention and photo/no-photo fixtures are documented at its top). Render matching PDF pages and compare layout, typography, page count/dimensions, section spacing, colors and photo placement. Existing source checks alone are insufficient. Do not change resume rendering to resolve failures; fix the website scope.

Required release checks remain typecheck, lint, repository tests, production build, responsive screenshot review, authenticated admin access review and zero unintended resume differences. Production merge/deployment still requires founder approval.
