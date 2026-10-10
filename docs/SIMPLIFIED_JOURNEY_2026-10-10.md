# Simplified CV journey

This refresh exposes the existing two CV paths without changing their implementation:

- Create my CV: import or enter details, review and save Career Profile, open its existing CV preview, choose a template, save or download.
- Tailor for a job: use the existing target-job flow and its review, template and export screens. Existing cover letter, Q&A and mock interview routes remain available for that application.

Home shows both choices for a saved profile, alongside its unchanged computed next action. Career Profile brings the existing preview and save-before-tailoring controls above the scores. The original profile preview still uses `/api/packages/career-profile`; it reads saved data and never implicitly saves editor drafts. Its helper reminds users to save changes first.

Navigation labels are My CVs and Tailor for a job. Service groups are displayed in the phone drawer and desktop sidebar. Routine menu descriptions and profile introduction paragraphs are removed. Processing, save status, error messages and review safeguards remain.

How it works opens a shared accessible visual dialog on public Home and the signed-in dashboard. It shows import, profile review, two CV branches, templates, export and optional job preparation. It makes no requests and does not create or modify user data.

No changes to APIs, database, auth, AI prompts, scoring, eligibility, next-action rules, credit deductions, generation, save handlers or document exports. No new dependencies.

Validation: production build includes TypeScript and lint; all 49 existing checks; built-UI fixtures at 320, 390, 768, 1366 and 1440px, including profile actions, all service routes, visual-guide content, mobile overflow, keyboard focus and Escape; shared typography checks with enlarged text and document isolation. Authenticated production AI generation is not exercised by local fixtures.
