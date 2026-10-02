/**
 * A "JOB RESPONSIBILITIES" block written once for the whole CV is never lost
 * (launch audit 2026-10-02).
 *
 *   node_modules/.bin/sucrase-node scripts/verify-loose-duties.ts
 */

import './resolve-paths'
import { attachLooseDuties, looseDutyLines } from '../lib/resumeParse/looseDuties'
import type { CareerProfileDraft } from '../types/careerProfile'

let failures = 0
function check(name: string, cond: boolean) {
  if (cond) console.log(`  PASS  ${name}`)
  else {
    failures++
    console.log(`  FAIL  ${name}`)
  }
}

const biodata = `CURRICULUM VITAE
JOSEPH THOMAS VARGHESE
EMPLOYMENT HISTORY
S.No | Company Name | Designation | Duration
1 | Voltas Limited | Accountant | Feb'2025 — Now
2 | Arabtec Construction LLC | Senior Accountant | Dec'2019 to Oct'2022
JOB RESPONSIBILITIES
Reduced month-end closing time from 10 to 6 days.
Managed accounts payable for 400+ vendors.
EDUCATIONAL QUALIFICATION
M.Com (Commerce) | Osmania University | 2004`

const perJob = `WORK EXPERIENCE
Site Engineer | Al Futtaim | 2019 – Present
Responsibilities:
• Supervised MEP installation on a 20-storey tower.
• Coordinated shop drawing approvals with consultants.
Junior Engineer | Arabtec | 2016 – 2019
Responsibilities:
• Prepared daily site progress reports for the client.
SKILLS
AutoCAD`

const draft = (jobs: Array<{ company: string; start: string; end: string | null; duties?: string[] }>) =>
  ({ work_experience: jobs.map((j, i) => ({ company: j.company, role: 'x', start_date: j.start, end_date: j.end, highlights: j.duties, sort_order: i + 1 })) }) as unknown as CareerProfileDraft

console.log('finding the block')
const b = looseDutyLines(biodata)
check('the two lines under JOB RESPONSIBILITIES are found', b?.lines.length === 2 && /10 to 6 days/.test(b.lines[0]))
check('the block stops at the next section (education is not a duty)', !b?.lines.some((l) => /Osmania/.test(l)))
check('a per-job block stops at the next job header', !(looseDutyLines(perJob)?.lines ?? []).some((l) => /Junior Engineer/.test(l)))

console.log('attaching what the reader left out')
const d1 = draft([{ company: 'Arabtec Construction LLC', start: '2019-12-01', end: '2022-10-01' }, { company: 'Voltas Limited', start: '2025-02-01', end: null }])
const note = attachLooseDuties(d1, biodata)
check('lines go under the most recent job (Voltas), not the first listed', (d1.work_experience[1].highlights ?? []).length === 2 && !(d1.work_experience[0].highlights ?? []).length)
check('the user gets a note naming the job', !!note && /Voltas Limited/.test(note.message) && note.field === 'work_experience.1.highlights')
const d2 = draft([{ company: 'Voltas Limited', start: '2025-02-01', end: null, duties: ['Reduced month-end closing time from 10 to 6 days', 'Managed accounts payable for 400+ vendors.'] }])
check('nothing is duplicated when the reader already placed them', attachLooseDuties(d2, biodata) === null && d2.work_experience[0].highlights?.length === 2)
const d3 = draft([{ company: 'Al Futtaim', start: '2019-01-01', end: null, duties: ['Supervised MEP installation on a 20-storey tower.', 'Coordinated shop drawing approvals with consultants.'] }, { company: 'Arabtec', start: '2016-01-01', end: '2019-01-01', duties: ['Prepared daily site progress reports for the client.'] }])
check('a CV with duties under each job is left alone', attachLooseDuties(d3, perJob) === null)

if (failures) {
  console.log(`\n${failures} failed`)
  process.exit(1)
}
console.log('\nall passed')
