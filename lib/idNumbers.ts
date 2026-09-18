/**
 * Identity document numbers do not belong on a CV (2026-09-18).
 *
 * The schema holds passport TYPE and VALIDITY, never the number. A CV that
 * printed "Passport: Y5072782 (Valid)" was read into free-text additional
 * information and then printed on every downloaded CV, where the field
 * visibility controls cannot reach it. A CV goes to strangers; an ID number on
 * it is an identity-theft risk and no Gulf recruiter needs it to shortlist.
 *
 * Applied when a CV is read (the draft) and again when a CV is rendered, so
 * profiles saved before this change are covered too. Only numbers near an ID
 * word are removed; ordinary numbers are untouched.
 */

const ID_WORD = /\b(passport|pp\s?no|passport\s?no|national id|emirates id|iqama\s?(no|number|#)|civil id|aadhaar|pan card)\b/i
const ID_NUMBER = /\b(?=[A-Z0-9]*\d)[A-Z]{0,3}\d{6,12}[A-Z]?\b/g

/** Remove ID-document numbers from text that names an ID document. */
export function stripIdNumbers(label: string | null | undefined, value: string): string {
  if (!ID_WORD.test(`${label ?? ''} ${value}`)) return value
  return value
    .replace(ID_NUMBER, '')
    // "Passport no. , Iqama number" -> "Passport, Iqama"
    .replace(/\s*\b(no\.?|number|#)(?=\s*(?:[,;·|]|$))/gi, '')
    .replace(/\s+([,;])/g, '$1')
    .replace(/\(\s*\)/g, '')
    .replace(/^[\s:·,;|-]+|[\s:·,;|-]+$/g, '')
    .replace(/\s{2,}/g, ' ')
    .replace(/\(\s*(valid[^)]*)\)/i, '$1')
    .trim()
}
