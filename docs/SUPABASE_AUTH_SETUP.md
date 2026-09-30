# Supabase auth setup — make emailed links open the real site

**Why this exists (2026-09-30).** Password-reset (and sign-up confirmation) emails
opened `http://localhost:3000`, a dead page on every phone. Checked with
`scripts/check-auth-redirects.mjs` (generates, does not send, a link for the QA account):
the project's **Site URL was `http://localhost:3000`** and only localhost was on
the **Redirect URLs** allow-list, so Supabase replaced every production link
with localhost. The code asks for the right address; Supabase overrides it.

These are dashboard settings — they cannot be changed from the code.

## 1 · URL Configuration (required — this is the fix)

Supabase dashboard → **Authentication → URL Configuration**

- **Site URL:** `https://gcc-mentor.vercel.app` (or the custom domain, once live)
- **Redirect URLs** — add:
  - `https://gcc-mentor.vercel.app/**`
  - `https://*-satishs-projects-c02c354b.vercel.app/**` (Vercel previews)
  - `http://localhost:3000/**` (local development — keep)

## 2 · Email templates (recommended — branded, and work on any device)

Supabase dashboard → **Authentication → Email Templates**

| Template | Subject | Body |
|---|---|---|
| Confirm signup | Confirm your GCC MENTOR account | paste `docs/email-templates/confirm-signup.html` |
| Reset Password | Reset your GCC MENTOR password | paste `docs/email-templates/reset-password.html` |

These links point at `/auth/confirm?token_hash=…`, which verifies the link on its
own. The default template's link only works in the browser that asked for it —
request a reset on a laptop, open the email on a phone, and it says "expired".

## 3 · Email sender (required before real launch)

Supabase's built-in email service is for testing: it sends only a few emails per
hour and often lands in spam. Under **Project Settings → Authentication → SMTP
Settings**, connect a real sender (e.g. Resend, Postmark, Amazon SES, Zoho) with
sender name **GCC MENTOR** and an address on your own domain.

## 4 · Check it worked

```
node scripts/check-auth-redirects.mjs
```
Every line should show `redirect_to: https://gcc-mentor.vercel.app/...`, not localhost.
