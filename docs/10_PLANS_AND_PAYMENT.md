# PLANS AND PAYMENT — what is free, what is paid, and how that is enforced

---

## 1. The commercial model in one line

**What the user pays for is the AI rewrite.** Everything else — their own typed
facts, a template, a PDF, a readiness score — either is free or could be.

That sentence is not marketing. It is the reason the enforcement code looks the way
it does.

---

## 2. The access gate — the most important gate in the product

`lib/packageAccess.ts`. **One helper, every call site.** Two copies of a payment
check eventually disagree, and the copy that is wrong is always the permissive one.

### The old gate was on the wrong thing

Both the PDF route and the resume screen refused any package that was not marked
paid. **That gates the container.** But a package that never went through the
optimizer holds no AI text at all — every word in it is the user's own typing from
their own profile. Refusing to show it to them protected nothing, and it was the
only reason a free tier looked like it needed a second rendering path, a second PDF
route and duplicated template logic.

### The gate now

```
optimized_content IS NULL   → nothing was generated → serve it, whatever is_paid says
optimized_content present   → this is the paid deliverable → is_paid required
```

**This is strictly safer than the old rule**, not merely more convenient: the thing
being protected and the thing being checked are now the same thing. Under the old
rule they were only correlated, and the correlation held by luck.

### The invariant it rests on, written down

**Content cannot exist without payment.**

- Generation refuses with a payment-required error unless the row it loads is
  genuinely paid.
- Nothing else writes generated content except the text-edit path, which only edits
  text that already exists.
- There is no refund path that flips a paid row back to unpaid.

**If a refund flow is ever added, that is the invariant it must preserve.**

### Verified to fail closed

18 assertions cover the malformed shapes: AI content present with the paid flag
undefined, null, the *string* `"true"` or the *number* `1` — all blocked. Empty
object, empty string, `0` and `false` in the content column — all counted as content
and blocked. Tier proven irrelevant to access.

**`tier` is not the access gate, and must never become one.** It drives the quota
and the labelling only.

---

## 3. Entitlements — what the free plan includes

`lib/entitlements.ts`, reading the `plan_entitlements` table, one row per feature,
editable from `/admin/plan`.

**Why a table and not constants in code:** the rules would otherwise spread across a
dozen gates, and every packaging change would need a developer. That is the
difference between a business the founder runs and one he has to ask about.

| Column | Answers |
|---|---|
| `free_allowed` | Most gates — yes or no |
| `free_limit` | A count, where allowed is not enough |
| `free_value` | A list, where the answer is neither — which templates free may use |
| `requires_ai` | **Not a gate.** It tells the admin screen which rows cost real money, so opening one up is an informed decision rather than a surprise on the bill |

### Failure behaviour is deliberately asymmetric

If the table cannot be read, the **costless** features stay available and everything
that **spends money** stays refused. A readiness score is arithmetic — refusing it on
a database hiccup would break the top of the funnel for no benefit. An AI call is
money, so silence means no.

**An unknown feature also fails shut.** Adding a gate before adding its row must not
silently open a paid feature to everyone.

### Kept separate from the access gate, on purpose

Entitlements decide what a free user may **start**. The access gate decides whether
an **already-sold** resume may be served. The entitlements table is editable from an
admin screen; **the access gate must never be** — a mis-click would hand out paid
work.

---

## 4. The free tier — built, verified, and not reachable

**Founder decision:** a free user keeps **one** resume built from their own typed
profile, can use any permitted template, can edit it, and can download the PDF. They
edit it by editing their Career Profile, and the CV follows.

**What exists and is verified:**
- The access gate above, with 18 failing-closed assertions
- A `tier` column and a **database-level** partial unique index allowing exactly one
  free resume per user — a quota enforced only in application code is a quota a
  second code path forgets
- The entitlements table, its reader, and the admin control panel
- A free resume's Edit correctly routes to the profile

**What does not exist:**
- No route creates a free resume
- No entry point in the UI
- The Library neither lists nor labels free resumes
- **No user-facing gate calls the entitlement readers yet**

`/admin/plan` therefore carries a plain "not live yet" notice explaining exactly what
does and does not happen. **That notice is removed in the same change that wires the
first real gate** — a control panel that silently does nothing is the mistake this is
deliberately avoiding.

**A loop found and fixed while wiring the copy**, worth recording because it shows how
these paths interact: a free resume clicking "Edit text" reached the preview screen,
whose guard sent a row with no content to the generate screen, which requested
generation, which refused because the row was unpaid, which returned it to the payment
screen. **A loop, from a button labelled Edit.**

---

## 5. Payment — there is no checkout

**This is the biggest blocker in the product and it is not technical.** Razorpay's
KYC is India-only and the founder is based in Saudi Arabia.

The payment screen shows Razorpay as an **honestly disabled** "coming soon" section —
never a dead button that pretends to work.

**The two real unlock paths:**

1. **A promo code**, issued by the founder from the admin panel and redeemed on the
   payment screen. Atomic, rate-limited, server-side. Optionally tied to a specific
   bundle.
2. **An admin credit grant.** One row is one free optimization. A required reason is
   enforced in both the data layer and the server action, so neither the form nor a
   crafted request can produce an unexplained grant. Rows are **stamped on
   consumption, never deleted**, so a spent credit stays a permanent audit record.

Both are real, both are logged, **neither is self-serve.** Until a provider that works
from Saudi Arabia is chosen, the product cannot take money from a stranger without the
founder in the transaction.

**The decision needed is a founder decision:** which provider. Everything downstream
of it is a normal build.

---

## 6. Pay before generate

Optimization used to run **before** payment. Two consequences: every visitor who never
bought still spent real model tokens, and the product then sold a **blurred preview of
work it had already paid to produce.**

Inverted now:

```
create the package, unpaid and empty
   → pay
   → generate into it
```

A schema change was needed because payment in this product applies to an *existing*
package row, so the row has to exist before money can be taken. Everything generation
needs therefore lives on the row.

**"Paid but not yet generated" is a normal state**, not a broken one. The payment
screen sends such a package to the generate step rather than dropping the user on an
empty resume.

**The blurred preview is gone entirely** — with the founder's explicit approval,
including deleting the renderer that produced it. It had become a paywall pointed at
people who had already paid: once the preview screen was made paid-only, the only
people who could reach it were paying customers, shown their own CV blurred under
"Unlock to download", above a button that bounced them back to where they started.

Known and accepted: two concurrent generate requests for the same paid, ungenerated
package both pass the "nothing generated yet" check, because that check is a read and
not a lock. The client guards a double-click; the real exposure is a deliberate retry
or two tabs, costing one extra model call — **never a double charge.** A conditional
update would close it properly.

---

## 7. Prices

Prices live in the `pricing` table, which the founder edits **directly in Supabase** —
no admin screen, no redeploy, live on the next page load. Code carries a fallback
matching the seeded row so the landing page cannot break. **The database always wins.**

| Tier | Price | Checkout |
|---|---|---|
| Free — readiness scan, Job Match | ₹0 | n/a |
| **Resume Optimization** | **₹499** | Promo code or admin grant only |
| Resume + Cover Letter | ₹999 | None |
| Complete Package | ₹2,499 | None |

The two bundles are **real prices with no purchase path**, shown as "coming soon"
rather than as working buttons. They are unlocked by an admin-issued code.

**The long-term pricing model is deliberately undecided** — one-time versus usage
versus subscription. The data model stays neutral so tiers can be added without a
migration.

---

## 8. Service credits and bundles

A bundle grants **service credits** — one per included item — consumed atomically when
the feature runs. The cover letter is the first real consumer: generation requires the
package to be paid **and** an available cover-letter credit, and the credit is spent
only after a validated success.

Never on a failure. A user must not lose a credit to a model hiccup.
