# PIPELINE.md — How this project actually gets built

**Written for the founder, who is not a coder.** No jargon. If something here
is unclear, that is a fault in this document — ask and it gets rewritten.

---

## 1. Who does what

There are three of us, and we each do one job.

| | Who | Job | Analogy |
|---|---|---|---|
| **You** | Founder | Decide what the product is and what the business does. Apply database migrations. Hold the money decisions | The client and the site owner |
| **Claude (CTO)** | Reviewer | Write the specifications, decide technical questions, review every piece of work before it counts as done | The architect who signs off the drawings |
| **Hermes** | Builder | Write the actual code, one small task at a time, exactly to spec | The contractor on site |

**The important part: Hermes never decides anything.** Every decision is already
written down in `docs/`. If Hermes hits something the documents do not cover, it
is instructed to stop and ask rather than guess.

This matters because Hermes runs on a fast, cheap AI model. Cheap models are
good at following precise instructions and bad at judgement. So the whole
process is built to give it precise instructions and remove the need for
judgement.

---

## 2. The loop, step by step

```
   ┌─────────────────────────────────────────────────────┐
   │  1. You give Hermes a prompt naming ONE task        │
   │                        ↓                            │
   │  2. Hermes reads docs/, writes the code, commits    │
   │                        ↓                            │
   │  3. Hermes writes a report in a fixed format        │
   │                        ↓                            │
   │  4. You paste that report to Claude (me)            │
   │                        ↓                            │
   │  5. I review the actual code — not just the report  │
   │                        ↓                            │
   │  6a. APPROVED → I give you the next task prompt     │
   │  6b. REJECTED → I tell you exactly what to send     │
   │                back to Hermes to fix                │
   └─────────────────────────────────────────────────────┘
```

**One task at a time. Always.** Hermes is explicitly told to stop after each one
and wait. It is not allowed to run ahead.

Yes, this is slower than letting it build ten things at once. That slowness is
the point. The last build reached 12,000 lines of code that did not match the
plan, because nobody was checking at each step. This process is what prevents a
repeat.

---

## 3. Why I review the code and not just the report

**Cheap AI models report optimistically.** They will say "done" when something is
70% finished. Not dishonestly — they genuinely believe it.

So the report format in `docs/HERMES.md` §6 forces Hermes to include things it
cannot fake: the literal output of the build command, and a description of what
it actually clicked and saw.

**Two warning signs to watch for yourself**, before you even send it to me:

1. The report says `done` but has no real build output
2. "Manual check performed" describes what it *expects* would happen rather than
   what it *saw*

Either of those, send it to me anyway and say you are suspicious. I will read
the real code and tell you the truth.

---

## 4. What is on your plate, and only yours

Three things nobody else can do:

| Task | Why only you | Blocks |
|---|---|---|
| **Install GitHub CLI** (`gh`) | Needs your login | Pushing any code to GitHub |
| **Get an Anthropic API key** | Needs your account and card | Every AI feature — TASK-015 onward |
| **Start Razorpay KYC** | Needs your business documents | Taking payment — TASK-042 |

**The Razorpay one is the one I keep raising.** It takes days to weeks and no
amount of coding speed shortens it. Everything else can be built while it is
pending, but nothing can be *sold* until it clears.

**Also yours:** applying database migrations. When a task produces a `.sql` file,
you paste it into the Supabase SQL Editor and run it. I will tell you exactly
when and give you the file. Nobody else touches your live database.

---

## 5. Roughly what happens in what order

| Stage | Tasks | Needs from you | What you will see |
|---|---|---|---|
| **Look and feel** | 001–006 | Nothing | A clickable, real-looking product with no logic behind it. **You can walk the whole flow.** |
| **Database** | 007–014 | Run migrations | Nothing visible. The foundation |
| **The AI** | 015–021 | Anthropic API key | Resume upload actually extracts real data |
| **Screens with real data** | 022–029 | Nothing | The product genuinely works, end to end |
| **The resume itself** | 030–033 | Nothing | Real PDF and Word downloads. **The before/after view** |
| **Library** | 034–037 | Nothing | Saved packages, application tracking |
| **Operations** | 038–041 | Nothing | Rate limits, admin panel |
| **Payment** | 042–045 | Razorpay KYC done | You can take money |

Stage 1 is deliberately first. **You should be able to see and click your
product before a single piece of logic exists.** If the shape is wrong, that is
much cheaper to discover then than later.

---

## 6. The three rules I will not let anyone break

However inconvenient, however much faster it would be:

1. **The AI never invents a fact.** Only what the user typed into their profile
   can appear on their resume. This is your product's promise, your legal
   protection, and the reason a user does not get caught lying in an interview.
   `docs/RULES.md` §2
2. **We never store a passport number.** Validity date and ECR/Non-ECR type only.
   Storing the number adds real legal liability and gains you nothing.
   `docs/RULES.md` §3
3. **Nothing outside Phase 1 gets built.** Not the ATS score, not the cover
   letter, not the mock interview — however quick they look. Scope creep is what
   stalled the last build. `docs/RULES.md` §4

If you ever ask me to break one of these, I will tell you plainly why I think it
is a mistake — and if you insist after that, it is your company and your call,
and I will say so on the record and do it.

---

## 7. Questions worth asking me at any time

- "What is Hermes actually doing right now?"
- "Is this report honest?"
- "Why did you choose X over Y?"
- "What is this task for, in plain English?"
- "Are we still on scope?"
- "What is blocking us today?"

**None of these are stupid questions.** Not understanding your own product is a
much bigger risk than asking.
