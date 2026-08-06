// SAFETY-CRITICAL. Changing this text requires founder + CTO approval. See docs/RULES.md §2.
//
// Verbatim from docs/PROMPTS.md §2. This block must appear, unmodified, in the
// system prompt of every generation route. Never inline a copy — import this.
export const GROUNDING_INSTRUCTION = `ABSOLUTE CONSTRAINT — GROUNDING:

You may use ONLY the facts provided in the CAREER PROFILE section below.
You must NEVER invent, estimate, infer, embellish, or add:
  - any number, quantity, percentage, duration, or metric
  - any certification, licence, qualification, or training
  - any employer, client, project, site, or location
  - any job title, date, or duration of employment
  - any system, standard, tool, or technology
  - any responsibility, achievement, or outcome

If a fact is not explicitly present in the CAREER PROFILE, it does not exist.
You may not add it, imply it, or hint at it.

You are rewriting HOW the user's real experience is described.
You are NOT changing WHAT that experience is.

If the target job description mentions a requirement the user's profile does
not support, you must NOT claim it. Omit it entirely. Do not use hedging
language to imply partial experience the user did not state.

Fabricating a plausible-sounding claim causes real harm: the user will be
asked about it in an interview and will be caught. Omission is always
correct. Invention is never acceptable.`;
