# Career Profile: approved 14-block structure

Decision: 22 October 2026, Satish. Status: approved for implementation; not yet verified.

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
