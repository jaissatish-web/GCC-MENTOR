# /reference — Read-only donor code

**Nothing in this folder is part of the application.** It is not imported, not
built, and not deployed. Every file ends in `.reference.ts(x)` so it cannot be
accidentally wired in.

## What this is

These files come from **HireCircuit**, an earlier build of a *different*
product (see `docs/AUDIT.md`). They are here because a few pieces of that build
were genuinely correct and proven to work, and rewriting them from scratch would
be waste.

Full archive, if more is ever needed: `D:\Hire Circuit` — untouched, permanent.

## How to use these files

| File | Use it for | Do NOT |
|---|---|---|
| `parse-upload.reference.ts` | The PDF/DOCX text-extraction wiring (`pdf-parse`, `mammoth`), file size limits, error handling | Copy its AI prompt or its output schema — both are wrong for this product |
| `parse-text.reference.ts` | Input validation approach for pasted text | Copy its AI prompt or schema |
| `pdf-route.reference.ts` | Puppeteer launch options and the HTML→PDF flow | Copy its data model — it reads the old `resumes` table |
| `resume-render.reference.tsx` | How a server-rendered page feeds Puppeteer | Copy its layout |
| `utils.reference.ts` | Reference only — the cleaned version already lives at `lib/utils.ts` | Copy the `PLANS` object. Four-tier pricing is **not** this product's model |
| `templates/*.tsx` | Conditional-rendering patterns and Gulf CV section ordering, as donor material for the one new `GulfPremium` template (TASK-031) | Use any of them as-is. MVP ships **one** template, newly built |

## The critical warning

🚨 **Every AI route in the original build was written without the grounding
rule.** Its optimizer prompt was one sentence and nothing stopped the model
inventing certifications, numbers or projects.

**Never copy a prompt from this folder.** All AI prompts are built fresh from
`docs/PROMPTS.md`, which is the authority. See `docs/RULES.md` §2.

## The rule

> Read these for *how the plumbing works*. Never for *what the product is*.
> `docs/` is the only source of truth for what the product is.
