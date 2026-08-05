# ADMIN.md — Admin Panel, Rate Limiting, Support

Source: Founding Brief §5b, §5c, §5d.

---

## 1. Admin panel — scope

**Founder-only access. One screen. Deliberately minimal.**

This is operational tooling, not a second product to build. Every hour spent here is an hour not spent on the thing users pay for.

**Route:** `/admin` — protected by a server-side role check on **every** request, not a hidden URL.

### Access control requirements

- Add an `is_admin` boolean to `profiles`, defaulting to `false`. Set the founder's flag manually via SQL.
- Check `is_admin` server-side in the route handler **and** in middleware. Never rely on a client-side check.
- Never expose an admin route or admin data to a non-admin session, even in an error message.
- Admin authentication uses the same session as normal login. **Do not build a separate admin password.**

---

## 2. The five admin features

### 2.1 Users list
Searchable by phone or email. Shows: profile completeness, signup date, and a link into their Library packages for support troubleshooting.

**Search must not leak.** Query server-side; never ship the full user list to the client and filter there.

### 2.2 Payments view
Transaction list and status. **Read-only.**

Actual refunds are issued through Razorpay's own dashboard — **not rebuilt here.** Do not add a refund button.

### 2.3 Manual credit grant
A button to grant a user one free optimization. This is the fix for "I paid but something broke" support cases.

Implementation: insert a credit row the optimize flow checks before requiring payment. Every grant is logged with admin ID, target user, timestamp and reason.

**This is a payment-adjacent feature → "Needs Review".**

### 2.4 Rate-limit override
Reset or raise a user's daily extraction limit if they are legitimately blocked rather than abusing it. Logged.

### 2.5 PII access log viewer
Shows when and by whom a user's sensitive profile data was viewed. See §4.

---

## 3. Explicitly not in MVP

- Analytics dashboards
- Bulk actions
- Role / permission management — **single founder-admin only**
- Refund processing
- User impersonation / "log in as user"
- Editing user profile data from admin

Expand only once volume or support load actually demands it.

---

## 4. PII access log — mandatory

**Table: `pii_access_log`**

| Field | Type |
|---|---|
| `id` | uuid PK |
| `admin_user_id` | uuid — who viewed |
| `target_user_id` | uuid — whose data |
| `resource` | text — e.g. `career_profile`, `package` |
| `resource_id` | uuid |
| `accessed_at` | timestamptz |

### Rules

- **Write the log row before returning the data**, not after. A read that fails to log must fail closed.
- Log **what** was accessed, never the values. No field contents in this table, ever.
- The log is append-only. No update or delete path, including for admins.
- Retained indefinitely.

This satisfies `docs/RULES.md` §1: *"Any time this data is viewed via the Admin Panel, it must be recorded in the PII access log — who viewed it and when."*

---

## 5. Rate limiting

Every AI extraction and optimization costs real API money. **Unlimited free usage is a real cost risk, not just an abuse edge case.**

### What is limited

**Free actions only** — profile extraction attempts (upload, paste). Paid actions are self-limiting.

### Mechanism

**Table: `rate_limits`**

| Field | Type |
|---|---|
| `user_id` | uuid |
| `action` | text — e.g. `profile_extraction` |
| `window_start` | date |
| `count` | integer |
| `limit_override` | integer, nullable — set by admin |

- Primary key on `user_id` + `action` + `window_start`.
- Enforced **server-side in the API route**, before the model call. Never client-side.
- Default limit: configurable via env var, starting at **5 extraction attempts per day**. Tunable after launch — **the mechanism must exist at launch.**
- Secondary keying on phone/email to survive account cycling.
- On limit hit: clear message telling the user when it resets and how to contact support. Never a silent failure.

### Cost tracking

**Table: `ai_usage_log`** — `user_id`, `route`, `model`, `input_tokens`, `output_tokens`, `estimated_cost_inr`, `created_at`.

Written on every model call. This is how unit economics stay visible: full run cost must stay well under ₹30 against ₹499.

---

## 6. Support

**Support channel for MVP: email**, monitored directly by the founder.

**No in-app ticketing system or chat widget in Phase 1.** A real, checked inbox is sufficient at this scale and avoids building support infrastructure before there is support volume to justify it.

### Surface in the product

- Payment screen: "Something went wrong with your order? Email the founder directly — replies within a day."
- Dashboard sidebar: "Need help? Email the founder — replies within a day."
- Footer: "Support: email the founder"

**The one-day commitment is a trust signal and appears in user-facing copy. Do not publish it unless it will be met** — an unanswered promise in this market is worse than no promise.

### The support loop this is designed around

1. User emails about a broken paid optimization.
2. Founder finds them in the admin users list by email or phone.
3. Founder opens their Library package to see what happened *(logged to `pii_access_log`)*.
4. Founder grants a manual credit.
5. User re-runs at no cost.

**This loop is the reason the admin panel exists.** If a feature does not serve it, it is out of MVP scope.
