/** CV-only checks. A denied or unconfirmed fact is not affirmative evidence. */
export function positiveStatements(text: string): string {
  return text.split(/(?<=[.!?])\s+|\n+/).filter(s => !/^\s*(?:no|not|never|without|lacks?|unconfirmed)\s+/i.test(s) && !/\b(?:did|does|have|has|is|was)\s+not\b/i.test(s)).join('\n')
}

export function cvMeaningIssues(source: string, generated: string): string[] {
  const evidence = positiveStatements(source)
  const claims = positiveStatements(generated)
  const issues: string[] = []
  const leadership = /\b(?:led|lead|leading|managed|managing|supervised|oversaw|directed|headed|spearheaded)\b/i
  if (leadership.test(claims) && !leadership.test(evidence)) issues.push('promoted_involvement')
  const savings = /\b(?:savings|saved|cost reduction|reduced costs|reduced rework)\b/i
  if (savings.test(claims) && !savings.test(evidence)) issues.push('unsupported_savings')
  return issues
}
