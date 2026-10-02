/**
 * The ATS file check must catch what really breaks ATS reading (2026-10-02).
 *
 *   node_modules/.bin/sucrase-node scripts/verify-ats-file-check.ts
 *
 * Built from the 15-design audit: the default design printed its headings
 * letter-spaced, and an ATS read "P R O F E S S I O N A L  S U M M A R Y".
 * A clean file must pass; each known failure must be reported.
 */

import './resolve-paths'
import { checkAtsText, norm } from '../lib/atsFileCheck'
import type { ResumeDocument } from '../lib/resumeDocument'

let failures = 0
function check(name: string, cond: boolean) {
  if (cond) console.log(`  PASS  ${name}`)
  else {
    failures++
    console.log(`  FAIL  ${name}`)
  }
}

const doc = {
  header: { displayName: 'Arjun Menon', contactItems: [{ kind: 'phone', text: '+971 50 123 4567' }, { kind: 'email', text: 'arjun@example.com' }] },
  summary: 'MEP engineer with 11 years in HVAC and fire-fighting systems.',
  skills: [{ name: 'AutoCAD' }, { name: 'Revit MEP' }],
  experience: [
    { entry: { role: 'Senior Mechanical Engineer', company: 'AECOM' }, range: 'Mar 2020 — Present', bullets: ['Led MEP design for a 45-storey mixed-use tower with 6 engineers.', 'Reduced energy use by 15% through chilled water optimisation.'] },
    { entry: { role: 'MEP Engineer', company: 'Gulf Trading' }, range: 'Nov 2016 — Feb 2020', bullets: ['Supervised HVAC and plumbing works for a shopping mall with 12 subcontractors.', 'Prepared as-built drawings and handover files for the client.'] },
  ],
  education: [{ line: 'B.E. Mechanical — Pune University' }],
  certifications: [{ display: 'LEED Green Associate' }],
} as unknown as ResumeDocument

const clean = `Arjun Menon
+971 50 123 4567 · arjun@example.com
PROFESSIONAL SUMMARY
MEP engineer with 11 years in HVAC and fire-fighting systems.
WORK EXPERIENCE
Senior Mechanical Engineer Mar 2020 — Present
AECOM
• Led MEP design for a 45-storey mixed-use tower with 6 engineers.
• Reduced energy use by 15% through chilled water optimisation.
MEP Engineer Nov 2016 — Feb 2020
Gulf Trading
• Supervised HVAC and plumbing works for a shopping mall with 12
subcontractors.
• Prepared as-
built drawings and handover files for the client.
SKILLS
AutoCAD · Revit MEP
EDUCATION
B.E. Mechanical — Pune University
CERTIFICATIONS
LEED Green Associate
` + 'Additional filler text so the document has enough characters to count as real text for the check. '.repeat(3)
const kw = ['HVAC', 'Revit MEP', 'as-built drawings', 'chilled water']
const status = (text: string, id: string, keywords = kw) => checkAtsText(text, 2, doc, keywords).items.find((i) => i.id === id)!.status

console.log('a clean file')
const r = checkAtsText(clean, 2, doc, kw)
check('passes every check', r.status === 'pass')
check('a line wrapped at a real hyphen keeps it ("as-" + "built")', norm('as-\nbuilt') === 'as-built')

console.log('what breaks ATS reading is reported')
check('letter-spaced headings: not recognised', status(clean.replace('PROFESSIONAL SUMMARY', 'P R O F E S S I O N A L  S U M M A R Y').replace('WORK EXPERIENCE', 'E X P E R I E N C E'), 'headings') === 'fail')
check('"Technical Expertise" instead of Skills: a warning', status(clean.replace('SKILLS', 'TECHNICAL EXPERTISE'), 'headings') === 'warn')
check('email missing from the text: fail', status(clean.replace('arjun@example.com', ''), 'contact') === 'fail')
check('phone in another format still found', status(clean.replace('+971 50 123 4567', '050 123 4567'), 'contact') === 'pass')
check('a job date not readable: fail', status(clean.replace('Nov 2016 — Feb 2020', 'Nov — Feb'), 'jobs') === 'fail')
const mixed = clean
  .replace('• Led MEP design for a 45-storey mixed-use tower with 6 engineers.', '• Led MEP design for a 45-storey AutoCAD\nmixed-use tower Revit MEP\nwith 6 engineers.')
  .replace('• Reduced energy use by 15% through chilled water optimisation.', '• Reduced energy use EDUCATION\nby 15% through chilled B.E. Mechanical\nwater optimisation.')
  .replace('• Supervised HVAC and plumbing works for a shopping mall with 12\nsubcontractors.', '• Supervised HVAC and LEED\nplumbing works for a shopping Green\nmall with 12 subcontractors.')
check('columns mixed into the lines: fail', status(mixed, 'order') === 'fail')
check('jobs out of order: fail', status(clean.replace(/AECOM\n/, '').replace('Gulf Trading\n', 'Gulf Trading\nAECOM\n'), 'order') === 'fail')
check('a keyword split by the layout: reported', status(clean.replace('Revit MEP\nEDUCATION', 'Revit\nM E P\nEDUCATION'), 'keywords') !== 'pass')
check('ligature glyphs: a warning', status(clean + ' certiﬁed', 'characters') === 'warn')
check('an empty (image) PDF: fail', checkAtsText('Arjun', 1, doc, kw).items[0].status === 'fail')
check('6 pages: a length warning', checkAtsText(clean, 6, doc, kw).items.find((i) => i.id === 'length')!.status === 'warn')

if (failures) {
  console.log(`\n${failures} failed`)
  process.exit(1)
}
console.log('\nall passed')
