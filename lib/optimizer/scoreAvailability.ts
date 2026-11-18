/** Pending assessments have no arithmetic identity; never coerce null to zero. */
export function assessedMaximum(...values: Array<number | null>): number | null {
  return values.some(value => value === null) ? null : Math.max(...values as number[])
}
export function assessedGain(after: number | null, before: number | null): number | null {
  return after === null || before === null ? null : Math.max(0, after - before)
}
