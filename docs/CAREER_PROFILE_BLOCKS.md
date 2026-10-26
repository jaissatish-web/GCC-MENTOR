# Career Profile: approved 14-block structure

Decision: 22 October 2026, Satish. Status: implemented in this change; automated local verification passed, GitHub release checks pending.

## Scope
Organise the existing Career Profile into 14 logical blocks with repeatable optional records and custom sections. Reuse existing parent fields, child tables and category metadata; no destructive schema changes. A logical block need not be a new database table. Preserve existing category names, IDs, values, order and visibility. The detailed category editor may retain original headings within each logical block.

## Block contract
| ID | Block | Information |
|---|---|---|
| contact | Personal & Contact Details | Name, headline, location, email, phone, WhatsApp same/different/not used; optional personal facts |
| summary | Professional Summary / Career Objective | Candidate-provided summary or objective |
| experience | Work Experience | Employer, role, dates, location, duties, results; explicit employment type, client/project context retained in description |
| education | Education & Qualifications | Qualification, institution, subject, years; explicitly stated study status/expected dates retained without invention |
| skills | Skills & Tools | Technical, trade, business, software, systems, equipment |
| training | Certifications & Training | Certificate/course, issuer, dates; non-certificated training can use categories |
| licences | Professional Licences & Approvals | Professional registrations, driving licences, authority, country, status/expiry when supplied |
| projects | Projects & Portfolio Work | Project name, role, client, contribution, tools, dates and links when supplied |
| languages | Languages | Language and explicitly stated level |
| achievements | Achievements & Awards | Standalone awards/results; job achievements remain with their job |
| activities | Professional & Community Activities | Memberships, volunteering, leadership, associations |
| research | Research, Publications & Intellectual Property | Papers, publications, presentations, patents |
| links | Professional Links | LinkedIn, GitHub, website, portfolio and other supplied professional links |
| gulf | Gulf Preferences & Availability | Existing target, situation, notice/availability and preparation fields; private preparation stays private |

## Storage and interaction
Use existing fields for core blocks and existing editable categories for specialist blocks. Category items support name, optional explicit level and detailed text; retain project context and study/employment status in existing descriptive fields rather than inventing new persisted scalar columns. This release does not promise individually queryable project/client/status columns. Keep custom sections and unknown original headings accessible. Optional empty specialist blocks are offered through an add-block action; populated blocks are editable immediately. Existing required save fields remain required; no awards/publications/licence requirement is introduced. WhatsApp same/different/not used choice uses the existing number field; no number is represented by null and does not claim a separately persisted declaration.

## Extraction invariants
Copy facts without inventing details. Employment, internship and apprenticeship may be work entries; academic projects/training/volunteering are not employment. Never substitute a client for the actual employer. Never attach unassigned global duties to a guessed job; retain as an additional original category for review. Capture research, professional links, memberships, projects, training and licences in supported categories. Unknown useful headings and text must remain in additional information. Do not capture passport/identity numbers. Preserve existing explicit visibility and private preparation handling. Dates must not be fabricated. Missing/uncertain is not confirmed none.

## Acceptance and verification
- All 14 logical blocks discoverable; specialist/custom information editable and saveable through existing validated atomic save.
- Existing profiles/categories preserve records and visibility across editing; hidden preparation metadata is not accidentally exposed or renamed.
- Resume drafts capture diverse profession facts and retain untied duties without false job attribution.
- No changes to scoring formulas, job optimization, templates, payment, auth or service quotas. Single Gulf Profile Readiness is agreed future direction; numerical rubric and questionnaire redesign remain pending and are not implemented here.
- Run typecheck, lint, build and relevant regression checks, including category mappings, preservation and different career scenarios. Report production/database/browser verification separately.

Affected areas: profile editor/components, category/block definitions, resume extraction/normalisation, targeted checks and canonical documentation.

## Implementation evidence
Shared definitions: lib/careerProfileBlocks.ts. The editor exposes all 14 logical blocks through navigation to existing core sections and an optional named-category workspace. Existing headings, IDs, category order, visibility, item moves and custom sections are retained. Supplementary education/training/tool/licence/preference categories remain reachable from their core section. WhatsApp same/different/not-used controls reuse the number field; a previously matching number follows phone edits. An empty number remains unknown/not recorded after reload, rather than a persisted not-used declaration.

Extraction instructions now explicitly cover specialist facts, employment type and client/project distinction. Unassigned responsibility fallback retains source text in a separate category and warns for review. This is not a complete automated audit proving every resume fact is captured; live provider quality still requires representative resume testing. Work type, project client and study status remain descriptive information, not new independently queryable fields.

Local evidence: typecheck, lint, production build; deterministic block/category/employer preservation and existing disposable-database save/RLS/rollback tests. Synthetic Chromium component interactions at 390px and 1440px confirmed add/review, focus, duplicate prevention and preservation of hidden legacy/custom categories. These component checks do not certify the full authenticated production page or its layout. No live account/database/provider call was used. GitHub CI and merge state are tracked in PROGRESS.md.


## SINGLE-EDITOR-001 — one place to edit (25 October 2026)
Status: implemented and locally verified; protected-main release pending. Satish approved the single-editor proposal in this conversation.

Career Profile is the sole place to change candidate facts: read-only summary → Edit Career Profile → one full editor → Cancel / Save changes. All 14 logical blocks stay discoverable on one page; section and readiness links open/scroll within that editor rather than hide other sections or create another editing screen. Dashboard and account settings link to it. Resume extraction presents review findings above the same editor, with explicit reviewed confirmation before saving, preserving pending-draft, merge/replace/keep, missing-information deferral and concurrency protections. Update from resume belongs inside the editor. Photo selection/removal is staged locally until Save changes; Cancel discards it. Resume visibility controls live in the same editor. All profile mutation controls in optimizer and resume preview become links to the relevant editor section. Job-specific document edits remain separate and clearly labelled as applying to that resume.

Acceptance: summary/dashboard contain no editable facts; one Edit Career Profile CTA; all legacy profile edit links reach the canonical full editor; imported details use those same fields, no separate review editor; one bottom Cancel / Save changes bar; no auto-save on navigation; missing optional data can still be deferred; photo upload/removal happens only during explicit Save, failures retain retryable photo selection and accurately report any already saved details. Full-object profile PUT and existing photo API remain unchanged; photo is a separate existing request, not an atomic database operation. Prevent edits while saving and prevent stale saved-version reuse after photo writes.

Affected: app/profile/page.tsx, profile photo/review UI, optimizer setup, package photo controls, dashboard/settings links, scoped editor CSS and regression scripts. Protected: schema, auth, scoring, prompts, quotas, billing, resume templates and job-specific document behavior. Verify typecheck/lint, full repository checks/build, mobile/desktop browser scenarios for canonical navigation, imports, save/cancel, visibility/photo and optimistic save failures. Report fixture versus live authenticated persistence separately.

Implementation evidence: one read-only summary and canonical details editor; legacy overview/settings edit links map to details; section fixes scroll/open accordions without removing other section headings. Imported findings, original text and optional wording suggestions appear above these same fields. Explicit acknowledgement and red update/skip warning are retained; supplied malformed values cannot be deferred. Unknown imported employment end stays unconfirmed. The 14-block finder is collapsed by default. Photo and visibility changes use the same Save/Cancel action, with staged image previews released on selection change/unmount. Removed unused separate ResumeReviewPage and immediate PhotoUpload components. Optimizer skill/certificate additions and preview photo changes link to Career Profile. Existing API routes/schema/auth/scoring/templates are unchanged.

Local verification: typecheck and lint clean; production build passed; 80/80 deterministic and disposable-database checks; 24 canonical-editor browser checks at390/1440; Career Studio29 checks at320/390/768/1440; full preview save/failure/concurrency/responsive checks; mobile/enlarged typography and scoped controls/document isolation. Fictional local APIs only; no live account data was changed, and live authenticated persistence is not certified. Browser evidence: artifacts/single-profile-editor/results.json and screenshots, artifacts/studio, artifacts/preview-settings (generated locally; CI uploads canonical editor screenshots). Final required CI, protected merge and production deployment remain pending.
