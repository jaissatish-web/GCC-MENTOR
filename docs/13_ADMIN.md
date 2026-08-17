# ADMIN — the founder's control panel

**The admin panel is how the founder runs the business without asking a developer.**
Prices, AI models, the free plan, promo codes and credit grants are all changeable
from here or from Supabase directly — none of them need a deploy.

**Visually it is a light, denser operational surface**, deliberately different from
the consumer app. It is a tool, not a product experience.

---

## 1. Access control

Admin status is a single `is_admin` flag on the `profiles` table, set **only** by
direct SQL or the service-role client. There is no UI that grants it, on purpose — a
user who could write their own row could make themselves an admin.

Three independent layers, and all three are required:

1. **Middleware** gates every `/admin` path.
2. **Every page** calls `requireAdmin()` independently.
3. **Every server action** re-verifies admin status **itself** — a server action is
   its own POST endpoint and is not covered by the page's render-time check.

The acting admin's identity always comes from the session, never from a form field, so
an action can never be attributed to someone else.

---

## 2. The screens

| Screen | What it does | State |
|---|---|---|
| **Overview** (`/admin`) | One live summary line per section, so a blocker is visible without opening every page | Live |
| **AI Provider** (`/admin/ai-provider`) | Provider, model, fallback and API key **per service**, plus a default and internal overrides | Live and genuinely wired — see §3b |
| **Free Plan** (`/admin/plan`) | What the free tier includes, per feature, including which templates free users may pick | **Editor works; no user-facing gate reads it yet** |
| **Prompts** (`/admin/prompts`) | Edit prompt text | **Fully inert today** — see §4. Being rebuilt with versioning |
| **Promo Codes** (`/admin/promo-codes`) | Create and deactivate codes, optionally tied to a bundle | Live — **this is the real checkout today** |
| **Packages** (`/admin/packages`) | Bundle definitions and their included items | Live |
| **Users** (`/admin/users`) | User list, search, package history, payments, manual credit grants | Live |
| **Access Log** (`/admin/access-log`) | Every admin view of a user's profile — who, what, when | Live |

Each section is its own route with its own admin check. They were once a single long
page and it was not usable.

---

## 3. What the API key handling gets right

The AI Provider screen handles raw API keys, so it is worth being explicit:

- **The key is never round-tripped back into the form.** Submitting the form blank
  keeps the existing key.
- **The raw key is never rendered into HTML.** The page shows only a masked hint.
- Writes go through the service role, because `ai_provider_config` carries no client
  write policy at all.

**Claude never enters a credential on the founder's behalf, by standing rule.** Setting
the key is the founder's own step.

---

## 3b. How the per-service AI configuration actually behaves

**It works as intended, and that was verified by reading every call site** — all ten
pass their own service key, so changing a model here changes exactly that service.
Saving replaces the previous values; submitting the key field blank keeps the existing
key rather than wiping it.

**Three things that are not obvious from the screen**, all recorded in
[`14_OPEN_ITEMS.md`](14_OPEN_ITEMS.md):

1. **Fallback needs provider, model *and* key.** Setting only a fallback model does
   nothing at all, silently. The screen should say so.
2. **The default row is a *configuration* fallback, not a runtime one.** It applies when
   a service has no row of its own. It is **not** tried when a service's own primary and
   fallback both fail mid-call — that request simply fails. A third runtime tier is
   planned.
3. **Two live calls have no named card.** `job_description` and `job_match_explanation`
   spend real money and appear only under "other overrides".

---

## 4. Controls that do not do what they appear to

**This section exists because a control that silently does nothing is the same
category of dishonesty as fake data**, and this project has made that mistake.

- **Free Plan** — the editor saves real values and the readers exist, but no
  user-facing gate calls them yet. The screen carries a plain "not live yet" notice
  saying exactly what does and does not happen. **The notice is removed in the same
  change that wires the first gate.**
- **Prompts** — **no AI call reads a stored prompt template at all today.** The list of
  live keys is empty, so every field on this screen edits something nothing consumes.
  It is labelled rather than left looking functional. Being rebuilt with versioning and
  draft-then-publish; the grounding block and output schema stay permanently
  non-editable. See [`06_AI_PIPELINE.md`](06_AI_PIPELINE.md) §2b.
- **Interview Q&A and Mock Interview** appear in the AI Provider list as config rows
  for features that do not exist. The founder chose to add them deliberately, and they
  are marked **planned** — inert until the features are built.

---

## 5. The personal-data access log

**Every admin view of a user's profile writes a row before the data is returned** —
who looked, at what, when. Not after, and not conditionally.

This is a hard requirement, not a nice-to-have: the profile store holds visa status,
passport type, phone numbers and full work history, and an admin panel that can read
it without a trace is an unacceptable audit gap.

---

## 6. What the panel can and cannot resolve

**Can:** find a user, see their packages and payments, grant a free optimization with
a recorded reason, issue a promo code, change the AI model, change what free includes,
see who accessed what.

**Cannot:** take a payment, refund one, or delete a user's data on their behalf.
Deletion is the user's own action from Settings, by design.

**"I paid but something broke" is resolvable today** — that was a launch requirement
and it is met.
