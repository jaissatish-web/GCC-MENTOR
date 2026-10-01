/**
 * Resume parsing v2 — the deterministic parts (2026-10-01). No model call.
 *
 *   node_modules/.bin/sucrase-node scripts/verify-resume-parse.ts
 *
 * The model's half is measured by scripts/resume-lab (real calls, ~100 CVs).
 * This guards what code alone decides, so a refactor cannot quietly undo it:
 *   1. dates: every CV date style → what the profile stores
 *   2. layout text: Word tables keep rows, Word headers are kept, a row-drawn
 *      two-column PDF is read one column at a time, Europass and plain CVs are
 *      NOT split, a scan is recognised
 *   3. pre-pass: email / phone / DOB / labelled personal details
 *   4. checks: dates converted, contact verified, invented skills dropped,
 *      a missing job detected as critical
 */

import './resolve-paths'
import fs from 'node:fs'
import path from 'node:path'
import { Document, Header, Packer, Paragraph, Table, TableCell, TableRow, TextRun, WidthType } from 'docx'
import { parseCvDate, splitRange } from '../lib/resumeParse/dates'
import { docxLayoutText, pdfLayoutText } from '../lib/resumeParse/layoutText'
import { prepass } from '../lib/resumeParse/prepass'
import { checkDraft } from '../lib/resumeParse/check'
import type { CareerProfileDraft } from '../types/careerProfile'

let failures = 0
function check(name: string, cond: boolean, detail?: unknown) {
  if (cond) console.log(`  PASS  ${name}`)
  else {
    console.error(`  FAIL  ${name}${detail !== undefined ? ' — ' + JSON.stringify(detail) : ''}`)
    failures++
  }
}

const FIX = path.join(__dirname, 'fixtures', 'resume-parse')

;(async () => {
  console.log('1. dates')
  const cases: [string, string | 'present' | 'unknown'][] = [
    ['Mar 2019', '2019-03'], ['03/2019', '2019-03'], ["Mar'19", '2019-03'], ['March, 2019', '2019-03'],
    ['2019-03', '2019-03'], ["Jun'2013", '2013-06'], ['03.2019', '2019-03'], ['2019', '2019'],
    ['Sept. 2019', '2019-09'], ['Jun’2013', '2013-06'], ['14/06/1988', '1988-06-14'], ['05-May-1984', '1984-05-05'],
    ['19 July 1989', '1989-07-19'], ['June 14, 1988', '1988-06-14'], ['2019-03-14', '2019-03-14'],
    ['Till Date', 'present'], ['Present', 'present'], ['To Date', 'present'], ['Current', 'present'], ['Now', 'present'],
    ['13/2019', 'unknown'], ['soon', 'unknown'], ['', 'unknown'],
  ]
  for (const [raw, want] of cases) {
    const got = parseCvDate(raw)
    const v = got.kind === 'date' ? got.value : got.kind
    check(`"${raw}" → ${want}`, v === want, v)
  }
  check('range "Jan 2019 to Mar 2022" splits', JSON.stringify(splitRange('Jan 2019 to Mar 2022')) === '["Jan 2019","Mar 2022"]')
  check('ISO date is not a range', splitRange('2019-03') === null)

  console.log('2. layout text')
  // Word: a data table and a page header.
  const cell = (t: string) => new TableCell({ children: [new Paragraph(t)], width: { size: 25, type: WidthType.PERCENTAGE } })
  const doc = new Document({
    sections: [{
      headers: { default: new Header({ children: [new Paragraph({ children: [new TextRun('Fatima Zahra Siddiqui')] }), new Paragraph('Mobile: +971 50 123 4567 | Email: fatima.s@example.com')] }) },
      children: [
        new Paragraph('EMPLOYMENT HISTORY'),
        new Table({ rows: [
          new TableRow({ children: ['Company', 'Designation', 'Period', 'Location'].map(cell) }),
          new TableRow({ children: ['Al Futtaim Group', 'Site Engineer', 'Mar 2019 – Present', 'Dubai, UAE'].map(cell) }),
        ] }),
      ],
    }],
  })
  const docxText = (await docxLayoutText(await Packer.toBuffer(doc))).text
  check('docx: table row stays on one line', docxText.includes('Al Futtaim Group | Site Engineer | Mar 2019 – Present | Dubai, UAE'), docxText)
  check('docx: page-header contact details are kept', docxText.includes('fatima.s@example.com') && docxText.startsWith('Fatima Zahra Siddiqui'), docxText.slice(0, 120))

  const grid = await pdfLayoutText(fs.readFileSync(path.join(FIX, 'grid-two-column.pdf')))
  const g = grid.text
  check('pdf: row-drawn sidebar is read as two columns', grid.notes.some((n) => n.includes('two columns')), grid.notes)
  check('pdf: sidebar lines are not interleaved with the main column', !/CONTACT\s+WORK EXPERIENCE/.test(g) && g.indexOf('SKILLS') < g.indexOf('WORK EXPERIENCE'))
  const euro = await pdfLayoutText(fs.readFileSync(path.join(FIX, 'europass.pdf')))
  check('pdf: Europass is NOT split — a date stays beside its job', !euro.notes.length && /2024 — Present \| Business Development Manager/.test(euro.text), euro.text.slice(0, 300))
  const euroLong = await pdfLayoutText(fs.readFileSync(path.join(FIX, 'europass-long-dates.pdf')))
  check('pdf: Europass with long right-aligned dates is NOT split', !euroLong.notes.length && /July, 2022 - To Date | Retail Store Manager/.test(euroLong.text), euroLong.text.slice(0, 300))
  const projects = await pdfLayoutText(fs.readFileSync(path.join(FIX, 'long-project-table.pdf')))
  check('pdf: a page that is mostly a table is NOT split into columns', !projects.notes.length, projects.notes)
  const classic = await pdfLayoutText(fs.readFileSync(path.join(FIX, 'classic.pdf')))
  check('pdf: a one-column CV is NOT split', !classic.notes.length && classic.text.startsWith('Mohammed Arshad Khan'))
  const scan = await pdfLayoutText(fs.readFileSync(path.join(FIX, 'scanned.pdf')))
  check('pdf: an image-only scan is recognised', scan.scanned === true)

  console.log('3. pre-pass')
  const sample = 'RAVI KUMAR\nMobile: +971 55 123 4567 | ravi.k@example.com\nlinkedin.com/in/ravi-kumar-1\nEmployment 2019 - 2021\nPERSONAL DETAILS\nNationality | Indian\nDate of Birth | 14/06/1988\nPassport Type | Non-ECR\nVisa Status | Employment Visa\nNotice Period | 30 days'
  const p = prepass(sample)
  check('email found', p.emails[0] === 'ravi.k@example.com', p.emails)
  check('phone found, year range ignored', p.phones.length === 1 && p.phones[0].replace(/\D/g, '') === '971551234567', p.phones)
  check('LinkedIn found', p.linkedin === 'linkedin.com/in/ravi-kumar-1')
  check('date of birth (day first)', p.dateOfBirth === '1988-06-14', p.dateOfBirth)
  check('passport type', p.passportType === 'Non-ECR')
  check('labelled nationality / visa / notice', p.nationality === 'Indian' && p.visaStatus === 'Employment Visa' && p.noticePeriod === '30 days', p)
  check('europass run-on "| Nationality Sri Lankan"', prepass('Date of birth 22/02/1993 | Nationality Sri Lankan').nationality === 'Sri Lankan')
  check('"Golden Visa" prose is not a labelled visa', prepass('Holds a Golden Visa since 2020').visaStatus === null)

  console.log('4. checks')
  const text = `${sample}\nWORK EXPERIENCE\nAl Futtaim Group | Site Engineer | Mar'19 – Till Date | Dubai\nL&T | Junior Engineer | 06/2015 – 02/2019 | Mumbai\nSKILLS\nAutoCAD, Revit MEP`
  const model: CareerProfileDraft = {
    full_name: 'RAVI KUMAR',
    email: 'ravi.kumar@invented.com', // not in the CV
    date_of_birth: '14/06/1988',
    work_experience: [{ company: 'Al Futtaim Group', role: 'Site Engineer', start_date: "Mar'19", end_date: 'Till Date', sort_order: 1 }],
    skills: [{ name: 'AutoCAD', sort_order: 1 }, { name: 'Revit MEP', sort_order: 2 }, { name: 'Project Leadership', sort_order: 3 }],
    certifications: [], education: [], additional_information: [],
  }
  const r = checkDraft(model, text, prepass(text))
  check('start date converted', r.draft.work_experience[0].start_date === '2019-03', r.draft.work_experience[0])
  check('"Till Date" stored as an empty end date (current role)', r.draft.work_experience[0].end_date === undefined)
  check('invented email replaced by the one in the CV', r.draft.email === 'ravi.k@example.com', r.draft.email)
  check('missing phone filled from the CV', r.draft.phone?.replace(/\D/g, '') === '971551234567')
  check('date of birth converted', r.draft.date_of_birth === '1988-06-14')
  check('labelled visa / notice / nationality filled', r.draft.visa_status === 'Employment Visa' && r.draft.notice_period === '30 days' && r.draft.nationality === 'Indian')
  check('a skill not in the CV is dropped', r.draft.skills.map((s) => s.name).join(',') === 'AutoCAD,Revit MEP', r.draft.skills)
  check('the missing L&T job is flagged critical', r.critical.some((c) => c.includes('06/2015')), r.critical)

  const complete = checkDraft(
    { ...model, work_experience: [...model.work_experience, { company: 'L&T', role: 'Junior Engineer', start_date: '06/2015', end_date: '02/2019', sort_order: 2 }] },
    text, prepass(text),
  )
  const eduText = `${text}\nHSC, State Board, 2002\nMBA, IIM, 2023 - Present`
  const edu = checkDraft(
    { ...model, education: [{ degree: 'HSC', institution: 'State Board', start_year: 2002, sort_order: 1 }, { degree: 'MBA', institution: 'IIM', start_year: 2023, sort_order: 2 }] },
    eduText, prepass(eduText),
  ).draft.education
  check('a single qualification year becomes the year of passing', edu[0].end_year === 2002 && edu[0].start_year === undefined, edu[0])
  check('an ongoing course keeps its start year', edu[1].start_year === 2023 && edu[1].end_year === undefined, edu[1])
  check('with every job returned, nothing is critical', complete.critical.length === 0, complete.critical)

  console.log(failures === 0 ? '\nALL PASS' : `\n${failures} FAILED`)
  process.exit(failures === 0 ? 0 : 1)
})()
