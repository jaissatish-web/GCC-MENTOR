# Production design system

Production Baseline V1.0 · source `ed06ab8c6c73b63f7be2376e4a90b1e7ab3da342`.

| Scope | Source and behaviour |
| --- | --- |
| Base tokens and type | `tailwind.config.ts`, `app/globals.css` and `app/typography.css`. Compact Inter for application typography, with shared semantic text and spacing utilities. Inter is the initial font preload. The serif and mono faces load where used. Inspect the computed style and breakpoint before changing sizes. |
| Shared interaction | `app/ui-system.css`, `app/responsive.css`, `lib/design-system/` and shared UI components provide the reusable controls, surface, spacing and responsive rules. Use meaningful labels and preserve keyboard focus, validation, empty, loading and error states. |
| Workspace | `app/workspace-theme.css` sets a white canvas, navy outer text `#18283D`, card `#102B3D`, gradient `#123448` to `#091E2C`, border `#244557`, white card text and secondary card text `#CBD5E1`. Brand CTA is `#087F76`; the workspace defines action hover `#0D9488` and a separate light-surface link hover. |
| Light workspace surfaces | Forms, editable regions, tables, menus and document previews use their own scoped light rules. Shared and legacy card classes are both supported; local layouts still vary by service. Check card contrast, portalled elements, button alignment and wrapping at desktop and mobile widths. |
| Navigation | Workspace navigation uses responsive page and menu presentation. Current route labels and destinations are defined by the shared workspace components and in the pages. The services drawer requests its progress badges when opened. |
| Public | `app/page.tsx` and `components/landing-v3/` own the public story, service calls to action, logos, resume orbit, industry and founder imagery. `app/auth-presentation.css` and auth components own the sign-in/signup globe. Preserve reduced-motion support. Public concern controls and the Free Tools home link use visible text for their accessible names. Readiness captions use the shared secondary text token. |
| Document boundary | `components/templates/`, `lib/templates.ts`, `lib/resumeStyle.ts` and export-specific rules own document typography, page dimensions, style and photo compatibility. UI-wide token updates must preserve document content and rendering. |

Shared typography uses 15/16 px body, 28/32 px page title, 21/24 px section title and 14/15 px buttons across mobile/desktop. Token overrides begin at 768 px. Local layouts and legacy specificity can yield different computed styles.

## Published artwork provenance

Retrieved 2026-11-11. Logos remain trademarks of their owners. Official artwork used solely for nominative career-preparation reference; no affiliation, endorsement, partnership or hiring guarantee. Source availability is not a blanket trademark license. Original brand colors and geometry are preserved. Official white/reversed variants use a dark slate logo window rather than a recoloring filter. WebP exports only trim empty margins and resize original artwork.

| Local file | Source | Processing / provenance | SHA256 |
|---|---|---|---|
| adani.webp | https://www.adani.com/-/media/project/adaniv1/logo/adani-logo.svg | Original artwork exported to transparent WebP | b56cc675225bdc4c02d2b9597fdab5448162711a1e0c1d791d1c219bfd9d7e6c |
| aramco.webp | https://www.aramco.com/-/jssmedia/project/aramcocom/aramco-logo.webp | Original artwork; original colors, CSS contain | c5e83d4647df5486a330da97221c4d8a5cb030521cd82be6861f349598ebabc1 |
| atkinsrealis.svg | https://commons.wikimedia.org/wiki/File:AtkinsR%C3%A9alis_logo.svg | Original artwork; original colors, CSS contain; Commons file page supplies author and license details (text/geometry logos, trademark restrictions remain) | a180c2a6f6c17fce131573a984e945061690e89ea6cd6dc9cdcb2e48bf4f3299 |
| bechtel.svg | https://commons.wikimedia.org/wiki/File:Bechtel_logo_2023.svg | Original artwork; original colors, CSS contain; Commons file page supplies author and license details (text/geometry logos, trademark restrictions remain) | 86957bbf6e574f47c79dc5ac7184b34989536e50f75ca374c1c2af13d2373932 |
| ccc.svg | https://www.ccc.net/wp-content/themes/ccc/dist/images/ccc-logo-header.svg | Original artwork; original colors, CSS contain | ad4665aba8d6ba2b2ea762bffe49d9f1f5a4e07ce09d15617f48b7d306ae9db0 |
| enoc.svg | https://commons.wikimedia.org/wiki/File:ENOC_DL_logo.svg | Original artwork; original colors, CSS contain; Commons file page supplies author and license details (text/geometry logos, trademark restrictions remain) | 12a2899696b25867ff4bd5bce22187e9a99b35cdf5ecc19641f99a4df43df0ae |
| fluor.png | https://www.fluor.com/images/logo/logo-blue.png | Original artwork; original colors, CSS contain | 0c7a54b375176dc0c011dbf76fbe0d0c5359323cc9e89faac9b9f23632df1c5e |
| hyundai-ec.svg | https://en.hdec.kr/common/img/logo.svg | Original artwork; original colors, CSS contain | 470454a00024a8e0bb5db6fc644b8c406559278712abd61120b48130566cc818 |
| kbr.svg | https://www.kbr.com/modules/custom/kbr_language/images/kbr-logo-color.svg | Original artwork; original colors, CSS contain | ff20ebf02d2fd757a63696f9f151d8c81cb11fe056d921b7098911ab69326acb |
| larsen-toubro.svg | https://2025prodstorageaccount-eqdyc8g8hpccdfez.a02.azurefd.net/ltprod/media/d44ph50r/lt.svg | Original artwork; original colors, CSS contain | ce3d9dd23d99e512dd62645d1b5b1c17054737d29ca28f591e6fa8ccdfc5d0e0 |
| maaden.svg | https://axvpvthrjz64.compat.objectstorage.me-jeddah-1.oraclecloud.com/maaden-website-assets/globals/maaden_english_secondary_logo_rgb_white-gold.svg | Original artwork; original colors, CSS contain | 6c17570720d56816aa8798644bbebcb2e94282734a83ffa7be721e8e5a7382a9 |
| mcdermott.svg | https://www.mcdermott.com/themes/custom/mcdermott_corp_theme/mcDermott-white-logo.svg | Original artwork; original colors, CSS contain | f08e47822cbb876d7aac81d3107595db18f6b145b634c492ac38d42db1c66096 |
| nmdc-energy.webp | https://www.nmdc-energy.com/assets/files/Digital%20Media%20Toolkit/Logos/NMDC%20Energy.png | Original artwork exported to transparent WebP | 15659439015650fb989ad31e75a62add8268b47c163f06af0692eced7d85973e |
| qatarenergy-lng.png | https://www.qatarenergylng.qa/Portals/0/logo.png | Original artwork; original colors, CSS contain | 181853db9478b638b1171ca4061a7af5f5154e173c213eebd160beb423428ced |
| qatarenergy.svg | https://commons.wikimedia.org/wiki/File:QatarEnergy_logo.svg | Original artwork; original colors, CSS contain; Commons file page supplies author and license details (text/geometry logos, trademark restrictions remain) | 88b9daed5baa0b4383f39464a62c11c2fd5867609fff9bfadb2a4155522a6dfb |
| sabic.svg | https://commons.wikimedia.org/wiki/File:Logo_of_Sabic.svg | Original artwork; original colors, CSS contain; Commons file page supplies author and license details (text/geometry logos, trademark restrictions remain) | dfe1403a61b620d9ef42c634b3f6d09bb33bff854afb81a2998e697c004c3d32 |
| saipem.svg | https://commons.wikimedia.org/wiki/File:Saipem_logo.svg | Original artwork; original colors, CSS contain; Commons file page supplies author and license details (text/geometry logos, trademark restrictions remain) | 82fdae14436632339fa641f7ac7bc3c0d289ac3016e17e91e9aa445b7be8a740 |
| samsung-ea.svg | https://www.samsungena.com/resources/en/images/common/logo_ena.svg | Original artwork; original colors, CSS contain | 01ac89459a51fe3cf2aa34f019d3c42b7a909ebadb409ea8c89efbe1a6260bc5 |
| technip-energies.webp | https://www.ten.com/sites/energies/files/2026-11/t.en-logo_main_gradient_blue_wordmark_rgb_0.png | Original artwork exported to transparent WebP | b457db1b146fe6d993f1f36cf1e8bc6f78485868092eb58b8faf543de8385a3b |
| wood.svg | https://commons.wikimedia.org/wiki/File:John_Wood_Group_logo.svg | Original artwork; original colors, CSS contain; Commons file page supplies author and license details (text/geometry logos, trademark restrictions remain) | e6ad732a0aafa468b7ccf6d74cf8dc6a76b5ea7abd52ac26ec8854b2d9d63f2c |
| worley.svg | https://commons.wikimedia.org/wiki/File:Worley_logo.svg | Original artwork; original colors, CSS contain; Commons file page supplies author and license details (text/geometry logos, trademark restrictions remain) | 50c8a294e6dd5fbf2a5c1bf1766cc32882a0e0808eab60cc7a48132ef9da00db |

Current naming: QatarEnergy replaces QP/Qatar Petroleum (2021). QatarEnergy LNG replaces Qatargas (2023): https://www.qatarenergylng.qa/english/Media/News/Article/ArticleID/4/QATARGAS%20CHANGES%20NAME%20TO . Samsung E&A replaces Samsung Engineering (2024): https://www.samsungena.com/en/newsroom/news/view?idx=15571 . AtkinsRéalis replaces SNC-Lavalin branding. No legacy duplicates.

Hero, industry atlas, closing skyline and decorative resume halo: newly generated brand illustrations, grounded in founder-approved visual references. They are not documentary photographs of customers, employers, projects or the founder. No endorsement implied. Exported as WebP for delivery; imagery contains no functional UI. Resume showcase uses the actual existing animated document component, not an image.

Founder: authentic user-provided Satish Kumar Jaiswal portrait, source Natural founder portrait on light grey.png, retained source ID libfile_c4e0515e066c81918137e8305c648ef8. Export resized to400px; no facial editing.

Country flags: exact SVGs from https://flagcdn.com/{sa,ae,qa,om,kw,bh}.svg, retrieved11November2026. Saudi Arabic lettering retained from source.

Visual specifications: founder-approved19828–19833.png. No invented statistics, endorsements, testimonials or job listings.
