# Current direction — soft indigo, 25 October 2026

Satish selected the SkillDrift sign-in theme, superseding the prior emerald/no-blue direction. Current implementation is being updated through SOFT-INDIGO-001; see [SOFT_INDIGO_2026-10-25.md](SOFT_INDIGO_2026-10-25.md). Central app tokens: indigo#5B60F1, plum#2B2640, secondary#58527A, near-white#FCFCFD, lavender#EEF2FF, border#E2E0EB. Controls12px, grouped cards24px, restrained shadow. Status red/amber/green and authored resume colours remain independent. Historical specifications below do not override this new approval.

## Internal Clear Path configuration — 24 October 2026
The `.app-type.internal-ui` configuration in `app/ui-system.css` is the current internal application palette/layout source. Existing public values below remain the landing baseline. Brand #134F3C, ivory canvas #FAFAF7, white surfaces, blue informational cues, semantic success/warning/error states. No name/logo rebrand. Mobile gutters20px (16px below360), tablet32px, large desktop40px; body and form widths remain task appropriate. Typography is owned only by typography.css. Internal opt-in also scopes service drawer/library/guide portals; public SideSheet defaults do not opt in. See CLEAR_PATH_ROLLOUT.md for evidence and limitations.

# GCC Mentor — emerald-led service palette

This visual direction keeps emerald as the primary action colour while using stable service accents for recognition. Applied through the shared application shell, headings, forms, cards, service pages, authentication, Home and landing surfaces. Product routes, account access, scoring, AI prompts and document generation remain unchanged.

| Role | Colour | Use |
| --- | --- | --- |
| Emerald | #0F594B | Primary actions, brand and optimized CV |
| Navy | #14243D | Titles and main reading text |
| Pale neutral | #F7F9FC | Workspace background |
| White | #FFFFFF | Working surfaces |
| Warm gold | #88611D with #FBEFD4 | Career foundation and milestones |
| Amber | #92400E with #FEF3C7 | Resume templates |
| Coral | #BE123C with #FFE4E6 | Cover letters |
| Indigo | #4338CA with #E0E7FF | Interview Q&A |
| Violet | #7E22CE with #F3E8FF | Mock interviews |
| Blue | #0A66C2 with #DBEAFE | LinkedIn |
| Orange | #C2410C with #FFEDD5 | NaukriGulf |
| Chart blue / gold | #3069AB / #9E701E | Answer structure / technical coverage |

Typography uses Inter throughout the product. Mobile/desktop title sizes are 26/32px at weight 700, sections 20/24px at 600, card headings 16/18px at 600, body and inputs 16px, labels/buttons/helpers 14px and compact captions 12px. Marketing display headings use their own responsive scale. Resume/document typography remains owned by the document renderer.

Spacing follows the 4/8px scale. Mobile gutters are 16px, page sections 24px apart, working cards have 12–16px corners and primary controls are at least 48px tall. Navigation and secondary actions have 44px minimum touch targets. Colour is paired with icons and text; fields retain visible labels and keyboard focus rings. Main content scrolls normally, with compact navigation rather than large fixed banners.

Service colours belong on icons, tabs, thin borders, small highlights and progress-series keys. Main reading surfaces stay white. Actions keep the same emerald identity across tools.

## Guide interaction

- Desktop has a connected journey with a compact career-profile/job junction and three numbered job branches.
- Mobile uses a full-height dialog. Only the 56px utility bar remains fixed; the title, view switch and full content share one scroll area.
- Service cards open their own explanation. The improvement cycle appears only with Mock Interview.
- Simulation uses isolated fictional data. Job, service, version, set and session controls do not make API calls or spend credits.
- Reduced-motion preferences disable animated connection dots; the pause control remains available.

## Asset

The Gulf skyline was generated with the built-in image-generation tool for the selected reference direction and saved as a 58KB WebP under `public/images/journey/gulf-skyline.webp`. Prompt: a restrained pale sage/champagne Gulf architectural skyline on white, without text, logos or people. It decorates the end of the guide rather than replacing working UI.
