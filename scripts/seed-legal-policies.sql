-- LEGAL-001: approved 29 October 2026. Run against the target database before deployment.
-- Content only. Preserve all nonempty founder copy (including unpublished drafts).
-- Existing /admin/content remains the editor and publishing authority.
BEGIN;

INSERT INTO public.site_content (slug,title,body,published,updated_at)
VALUES ('privacy', 'Privacy Policy', $policy$Who we are and how to contact us:

GCC MENTOR is a career-preparation platform led by Satish Jaiswal. For privacy questions, access requests or account closure, email jaissatish@gmail.com. This policy covers visitors and registered users worldwide.

Information you provide:

We process resume files and pasted resume text to extract career information. Saved information can include your name, email, phone or WhatsApp number, location, nationality, optional date of birth, passport type and expiry, visa/residency status, availability, employment and project history, education, certifications, skills, languages, professional links and profile photo. Do not submit passport numbers, identity-document copies, certificates or other sensitive documents; this platform is not a document-verification service. Avoid unnecessary sensitive details in free text.

We also store reviewed profile drafts, job descriptions, application notes and dates, generated resumes and their saved snapshots, cover letters, interview questions, typed answers, transcripts, feedback and scores. LinkedIn and NaukriGulf preparation can store imported profile text, generated drafts and checklist progress. We do not need your credentials for those external services.

If you use recorded mock interviews, we process microphone audio, transcripts, speaking measurements and coaching reports. Recording requires your microphone permission. Unsent recording drafts can remain in your device's IndexedDB; other intake and interview drafts use browser session storage. Clear site data on a shared device after use.

Anonymous scans and technical records:

Using a scan without an account does not mean that nothing is stored. Anonymous analysis sessions can hold extracted resume text, structured career data, job descriptions and results on our servers, linked by a random cookie token whose hash is stored server-side. The current intake also uses tab-scoped browser storage for draft handoff. Anonymous abuse controls use salted IP hashes and request counts.

Authentication records include your email and sign-in metadata; Supabase manages credentials. AI usage logs record account identifiers, service/model, token usage and estimated cost, rather than prompt or answer text. Operational records include quotas, errors and service events. Admin access to career records is logged in a PII access log recording who accessed which record and when. Hosting providers may process request metadata such as IP addresses for delivery and security.

Why we use data and our grounding promise:

We use submitted information to maintain your account and Career Profile, prepare the outputs you request, save your practice history, support you, prevent abuse and operate the service. Our product rule is “the AI never invents anything”: career generations must be grounded in facts you supplied, not invented employers, qualifications, figures or achievements. Relevant facts are provided to generation services for that purpose. Extraction and AI can still make errors; review every output and correct unsupported content before using it. We do not use scores to make employment decisions for employers.

Where applicable, processing necessary to deliver your requested service relies on contract or steps you request before a contract; proportionate security and operational processing relies on legitimate interests where permitted, and legal obligations where required. Where consent is required, including relevant optional processing, you may withdraw it without affecting prior lawful processing. We do not treat acceptance of this policy as blanket consent. You can choose manual entry and avoid recording; avoiding AI services limits the outputs we can provide.

Service providers and international processing:

Supabase supplies authentication, database and private storage; Vercel hosts the application. Relevant resume text, career facts, job descriptions and interview answers are sent to configured AI providers. The code supports OpenRouter and its upstream model hosts; voice processing can also involve configured transcription and evaluation providers. The provider used depends on service configuration. Email delivery and support also involve service providers. We do not sell your career information or provide it to recruiters as a placement service. We may disclose information when lawfully required or necessary to protect rights and security.

These services may process information outside your country, including outside the EU or GCC. We cannot promise a particular hosting country, zero provider retention, or that a provider never uses submissions for model improvement without confirming the applicable configuration and terms. Contact us before submitting data if you need the current provider, location, retention or transfer-safeguard details. Applicable international-transfer requirements remain binding; this notice does not itself establish compliance or waive those protections.

Retention and deletion:

Saved career profiles, pending drafts, generated documents, transcripts, reports and professional-profile drafts generally remain until resolved or deleted. Settings → Delete my data hard-deletes the Career Profile, associated packages and pending resume drafts and attempts photo removal. It does not close your Supabase login account. Some separate artifacts, including LinkedIn drafts and operational/access logs, may remain outside that profile deletion path. Email us for complete deletion or account closure; do not assume the Settings action removes every record.

On actual account closure, account-linked records with deletion cascades are removed; storage objects and any remaining artifacts require cleanup. Logs needed for security, legal obligations or disputes may need separate handling. We will explain any lawful exception to a deletion request. We have not assigned a fixed automatic expiry to every operational log. Deleted information may persist in provider backups until those backups expire; provider backup and runtime-log periods depend on their settings.

Anonymous analysis sessions have a seven-day default expiry, configurable on the server. Expired sessions are no longer claimable; physical deletion is performed by the configured retention job, rather than guaranteed at the exact expiry instant. Anonymous rate-limit records are scheduled for cleanup after 30 days by default. Job-analysis caches are designed for 30-day cleanup. Recorded interview audio is scheduled for removal after three days by the storage cleanup worker; transcripts and reports remain for practice history until deleted. Worker failures can delay removal. We do not promise immediate erasure from every provider or backup.

Cookies and analytics:

We use necessary Supabase session and PKCE sign-in cookies and, on anonymous analysis flows, gcc_anon_session. Browser storage also supports drafts and recovery. No advertising or third-party analytics cookies are implemented in the application at present. Necessary security, hosting and usage records still exist. See the Cookie Policy for durations and controls.

Your rights:

Email jaissatish@gmail.com to request access, correction, a readable copy or export, deletion or account closure. You can edit your Career Profile directly. Depending on applicable law, including GDPR, Saudi PDPL and UAE PDPL, you may also request restriction, object to certain processing, withdraw consent and complain to the competent data-protection authority. These rights have legal conditions and exceptions. There is no automated full-account export or closure button promised here.

We may ask for proportionate identity verification, preferably through your registered email, without requesting identity-document uploads through the platform. We respond within applicable legal deadlines; for GDPR requests this is generally one month, with legally permitted extensions and notice. Contact us if a self-service deletion fails or if you need help identifying a guest scan.

Children and changes:

This platform is intended for adults aged 18 or over. Do not submit children's data. If you believe a child has provided personal information, contact us so we can investigate and arrange appropriate removal. We update this notice as processing changes and identify the revision date above; material changes will be communicated through an appropriate service notice.$policy$, true, '2026-10-29T00:00:00Z')
ON CONFLICT (slug) DO UPDATE SET
 title=EXCLUDED.title, body=EXCLUDED.body, published=EXCLUDED.published, updated_at=EXCLUDED.updated_at
WHERE btrim(public.site_content.body) = '';

INSERT INTO public.site_content (slug,title,body,published,updated_at)
VALUES ('terms', 'Terms of Service', $policy$About these terms:

These terms govern GCC MENTOR, a career-preparation service led by Satish Jaiswal. Contact jaissatish@gmail.com. By using the service you agree to these terms to the extent permitted by applicable law. If you do not agree, stop using it. The Privacy, Cookie, Refund and Career Advice Disclaimer pages explain related practices and limitations.

Accounts and acceptable use:

You must be at least 18 and legally able to use the service. Keep credentials confidential, provide accurate account information and notify us of unauthorized use. You are responsible for submissions you authorize, not for activity for which applicable law makes us responsible.

Submit only information you are entitled to use. Do not fabricate credentials, work history, employers, achievements, dates or documents; impersonate another person; upload others' confidential or sensitive information without authorization; infringe rights; distribute malware; bypass quotas or security; or use the platform for scams, unlawful discrimination or other illegal activity. We may limit or suspend abusive accounts, explain the reason where lawful and offer contact for review. Security or legal needs may require immediate action.

Grounded career preparation:

Our rule is “the AI never invents anything.” Generation must use the career facts you supplied. Optimization changes presentation and alignment, not your qualifications. A suggested skill or keyword is advice: include it only when it accurately reflects your experience. AI and extraction can make mistakes. Review and correct all generated content before submitting an application; flag unsupported content to us.

Free access and service limits:

Signup is free. Public scans may provide a limited preview; signing in enables the Career Profile workspace. Profile editing and the base Career Profile resume support your own facts. Features, availability and reasonable rate limits are described on the current service screens. Free access does not mean unlimited AI requests or permanently free access to every feature. We will explain material access changes prospectively; creating an account does not authorize a charge.

Payments and future paid services:

Card checkout is not live yet — a purchase is arranged directly with us. Browsing, signing up or using free tools does not create a payment obligation or automatic subscription. A manual purchase requires a separately agreed service, price, currency, included usage and delivery terms before payment. Promo codes and admin credits are not proof of a card payment.

When online payments launch, applicable paid-service terms will be shown before purchase, including taxes, limits, expiry, renewal or cancellation if relevant, and refund rights. No future price or subscription applies retroactively to free use. We do not currently collect card details through an online checkout. The Refund Policy explains the proposed baseline for future digital purchases and preserves mandatory consumer rights.

Your content and platform intellectual property:

You retain ownership of your submissions and, as between you and us and to the extent legally available, your generated career documents. You grant us a non-exclusive license to host, process, transmit to service providers and display that content only as needed to provide, secure and support the service and comply with law. This is not permission to sell your resume or publicly advertise your identity. The license ends when the content is deleted, subject to necessary backup, legal and dispute handling described in the Privacy Policy.

You may use, edit and share your generated documents for your career purposes. We cannot guarantee that AI output is unique or independently copyrightable. Platform code, branding and template designs remain protected by their respective owners; using a template in your own resume does not transfer the underlying platform rights.

Limits of the service:

GCC MENTOR is not a recruiter, employer, immigration agent or legal adviser. We do not promise interviews, offers, visa approvals, attestation acceptance, employment or a particular salary. ATS/job-match and readiness scores are preparation indicators, not hiring probabilities, official eligibility decisions or employer endorsements. Employer systems and legal requirements differ. Check important advice against official sources and qualified professionals.

We aim to provide a usable service but cannot promise uninterrupted access or error-free AI, third-party services or outputs. Nothing here excludes mandatory quality standards, consumer remedies or other rights that cannot lawfully be excluded.

Liability:

To the extent permitted by applicable law, we are not responsible for indirect or consequential losses, including lost employment opportunities, arising from reliance on preparation advice. For a paid-service claim, our aggregate contractual liability is limited to the amount paid for the affected service, only where lawful and fair. This does not exclude or limit liability for fraud, deliberate misconduct, gross negligence, death or personal injury where protected by law, data-protection duties or other liability that cannot legally be limited. Mandatory remedies also apply to free services where the law provides them.

Ending use and disputes:

You may stop using the service at any time. Settings data deletion does not close the login account; email us to request account closure or remaining-data handling. Suspension or closure does not extinguish valid refund rights or other mandatory rights.

Please first send a dispute to jaissatish@gmail.com with the relevant service and requested resolution so we can try to resolve it. Applicable governing law and competent courts are determined by relevant conflict-of-laws and mandatory local rules; these terms do not select an unverified business domicile or impose exclusive Gulf arbitration. Users in Saudi Arabia, the UAE, the EU and elsewhere retain applicable consumer, privacy and court-access protections. A future paid order may specify a lawful governing-law arrangement before acceptance, subject to those protections.

Changes:

We may update these terms as the service develops, with a revised date and appropriate notice of material changes. Changes apply prospectively and do not remove accrued rights or alter an agreed purchase retroactively without a lawful basis. Contact us if a change affects an existing service.$policy$, true, '2026-10-29T00:00:00Z')
ON CONFLICT (slug) DO UPDATE SET
 title=EXCLUDED.title, body=EXCLUDED.body, published=EXCLUDED.published, updated_at=EXCLUDED.updated_at
WHERE btrim(public.site_content.body) = '';

INSERT INTO public.site_content (slug,title,body,published,updated_at)
VALUES ('cookies', 'Cookie Policy', $policy$Necessary cookies:

GCC MENTOR uses cookies and browser storage to operate sign-in, protect authentication and carry requested scan results or drafts. Cookies are small browser records sent with relevant requests. We do not implement advertising, behavioral tracking or third-party analytics cookies at present. Server security and AI usage records are separate from advertising analytics.

Supabase authentication session:

Supabase auth uses project-specific cookies, generally named sb-<project-ref>-auth-token, sometimes split into numbered chunks. They hold session material needed to recognize your account and refresh authentication. The installed Supabase SSR library uses a default cookie lifetime of approximately 400 days; tokens inside expire and refresh independently, and sign-out clears the local session cookies. Cookie settings and browser restrictions can shorten persistence. Cookie lifetime is not a guarantee of continued access.

PKCE verifier:

A project-specific sb-<project-ref>-auth-token-code-verifier cookie supports the proof-key exchange used by confirmation, recovery and OAuth-style sign-in flows. It helps bind a callback to the browser that began the flow. The SSR library's default cookie options can allow persistence for approximately 400 days if a flow is abandoned; a completed exchange clears the verifier. The authorization code has a separate, shorter validity. We do not describe this as a browser-session-only cookie.

Anonymous scan cookie:

gcc_anon_session links a supported anonymous scan to its server-side result without an account. It uses a random token, is HttpOnly, uses SameSite=Lax and is Secure in production. Its browser lifetime is seven days. Server records have a separately enforced expiry, default seven days and configurable; clearing the cookie prevents recovery in that browser but does not itself delete the stored resume text. See the Privacy Policy for server cleanup.

Other browser storage:

Tab-scoped session storage supports resume-intake handoff and unsent interview drafts. It normally clears when the tab session ends, although browser session restoration can preserve it. Recorded interview drafts can use IndexedDB and remain until removed by the application or you clear site data. These stores are not cookies and are not used for advertising.

Your controls:

You can block or delete cookies in browser settings and clear this site's storage. Blocking necessary cookies can prevent sign-in, recovery and anonymous-result handoff. Sign out and clear site data on shared devices. Removing browser records does not delete your server-side account or career records; use Settings or email jaissatish@gmail.com for assistance.

Future changes:

If optional analytics or tracking is introduced, we will update this page to name its purposes and durations and provide consent or other controls where legally required before using it. This page describes the current implementation, not consent to future tracking.$policy$, true, '2026-10-29T00:00:00Z')
ON CONFLICT (slug) DO UPDATE SET
 title=EXCLUDED.title, body=EXCLUDED.body, published=EXCLUDED.published, updated_at=EXCLUDED.updated_at
WHERE btrim(public.site_content.body) = '';

INSERT INTO public.site_content (slug,title,body,published,updated_at)
VALUES ('refund', 'Refund & Return Policy', $policy$Current payment status:

Card checkout is not live yet — a purchase is arranged directly with us. Browsing, free signup and free-service use create no charge or payment obligation. There is nothing to refund for a service for which you paid nothing. Do not send payment without an agreed order. Any direct purchase must set out the service, price, delivery and refund conditions before you pay; mandatory consumer rights always apply.

Future digital purchases:

The following is our baseline policy intended to apply when online purchases launch, subject to the terms disclosed before that purchase and applicable law. It does not announce a live checkout, subscription or payment processor. Digital career services have no physical products to return.

You may request cancellation and a refund within seven calendar days of purchase for unused service credits or a service whose generation or delivery has not begun. For a bundle partly used, we will assess the unused portion against the item prices disclosed at purchase, rather than promise a full refund after use. Once a requested digital output has been generated and delivered, a change of mind alone normally does not qualify under this baseline, except where law provides otherwise.

Faults, duplicate charges and statutory rights:

Contact us if a paid service is not delivered, a technical fault prevents use, or a duplicate or unauthorized charge appears. We will investigate and offer correction, re-delivery or an appropriate refund according to the purchase terms and applicable law. A confirmed duplicate charge is refundable even if a separate valid purchase was used. AI-generated content remains reviewable; a low preparation score or an unsuccessful job application is not itself a service-delivery failure.

Nothing here excludes statutory cooling-off periods, remedies for defective digital services or other mandatory consumer rights. Where a jurisdiction requires express consent and acknowledgement before immediate digital supply can affect withdrawal rights, that must be obtained at purchase; it is not obtained merely by reading this page. No shorter contractual window overrides a longer mandatory one.

How to request help:

Email jaissatish@gmail.com with your registered email, purchase date, order or payment reference, amount and a short description. Never email card numbers, passwords or identity documents. We aim to acknowledge requests within three business days and provide an assessment within ten business days after receiving the information needed. If investigation takes longer, we will explain the delay; applicable legal deadlines prevail.

Approved refunds normally go to the original payment method where supported. We aim to initiate them within ten business days of approval. Bank or provider settlement can take additional time; we cannot guarantee a bank posting date. If the original method cannot receive a refund, we will agree a secure lawful alternative with you. There is no automatic refund process claimed today.$policy$, true, '2026-10-29T00:00:00Z')
ON CONFLICT (slug) DO UPDATE SET
 title=EXCLUDED.title, body=EXCLUDED.body, published=EXCLUDED.published, updated_at=EXCLUDED.updated_at
WHERE btrim(public.site_content.body) = '';

INSERT INTO public.site_content (slug,title,body,published,updated_at)
VALUES ('disclaimer', 'Career Advice Disclaimer', $policy$Preparation, not placement:

GCC MENTOR helps you organize your real experience, prepare job-specific resumes and cover letters, assess gaps and practise interviews. It is not a recruitment agency, employer, visa processor, government authority or licensed legal adviser. Founder experience does not create official accreditation or an employer endorsement.

No guaranteed result:

Readiness, ATS and job-match scores, keyword suggestions and interview feedback are preparation guidance. They do not guarantee that an employer's ATS will accept your document, that a recruiter will shortlist you, or that you will receive an interview, offer, visa, work permit, salary or employment. Employers use different criteria; a strong score is not proof of eligibility or a hiring probability. A low score is not a judgment of your professional worth.

Facts and AI limitations:

Our grounding rule is “the AI never invents anything”: career content must be based on facts you supplied. It is not permission to claim skills you have not demonstrated. Extraction, transcription and generation can still make mistakes or miss context. Check names, dates, numbers, qualifications, technical statements and every claim before sharing an output. Correct or remove unsupported text. Interview practice does not certify technical competence, language fluency or readiness for safety-critical work.

Verify changing requirements:

Visa, immigration, labor, professional-registration, licensing and attestation requirements can change and vary by nationality, profession, employer and destination. Preparation checklists are not official eligibility assessments and do not verify your documents. Confirm current requirements directly with the competent authority, embassy or qualified adviser before applying, paying a fee or traveling.

Examples of official sources are the UAE Ministry of Human Resources and Emiratisation (MOHRE, https://www.mohre.gov.ae), Saudi Ministry of Human Resources and Social Development (MHRSD, https://www.hrsd.gov.sa), Qatar Ministry of Labour (https://www.mol.gov.qa) and the relevant immigration and professional-registration authority. These organizations do not sponsor or endorse GCC MENTOR.

Not professional legal advice:

Content is general career information, not legal, immigration, tax or financial advice. Use a qualified professional for decisions requiring such advice. You decide what to submit and which opportunities to pursue. Nothing in this disclaimer excludes liability or consumer rights that applicable law does not allow us to exclude.

Questions or corrections:

Report inaccurate guidance or unsupported AI content to Satish Jaiswal at jaissatish@gmail.com, including the relevant service and a description. Avoid sending unnecessary sensitive documents.$policy$, true, '2026-10-29T00:00:00Z')
ON CONFLICT (slug) DO UPDATE SET
 title=EXCLUDED.title, body=EXCLUDED.body, published=EXCLUDED.published, updated_at=EXCLUDED.updated_at
WHERE btrim(public.site_content.body) = '';

COMMIT;
