import './resolve-paths'
import assert from 'node:assert/strict'
import { totalExperienceYears, gccExperience } from '../lib/experienceYears'
import { detectEmploymentGaps } from '../lib/employmentGaps'
// First assertion fails on baseline because a bare year becomes January arithmetic.
const yearRole = { start_date: '2021', end_date: '2022', company: 'Synthetic employer' }
assert.equal(totalExperienceYears({work_experience:[yearRole as never]}),null,'year-only boundaries must not establish one exact year')
const { inferDatePrecision, readPrecisionDate, encodePrecisionDate, dateBounds } = require('../lib/profileDatePrecision') as typeof import('../lib/profileDatePrecision')
const { workDurationAssessment } = require('../lib/experienceYears') as typeof import('../lib/experienceYears')
const { assessEmploymentGaps } = require('../lib/employmentGaps') as typeof import('../lib/employmentGaps')
assert.equal(inferDatePrecision('2021'),'year')
assert.equal(inferDatePrecision('2021-01'),'month')
assert.equal(inferDatePrecision('2021-01-17'),'day')
for (const value of ['2021-02-29','2021-13','2021-00','2021-01-00','not-a-date','0000']) {
  assert.equal(inferDatePrecision(value),null,value)
  assert.throws(()=>encodePrecisionDate(value),/date/i,value)
}
for (const [value,precision,anchor] of [['2021','year','2021-01-01'],['2021-01','month','2021-01-01'],['2021-01-17','day','2021-01-17']] as const) {
  assert.deepEqual(encodePrecisionDate(value),{value:anchor,precision})
  assert.equal(readPrecisionDate(anchor,precision),value)
  assert.deepEqual(encodePrecisionDate(readPrecisionDate(anchor,precision),precision),{value:anchor,precision})
}
assert.equal(readPrecisionDate('2021-11-17',null),'2021','legacy month/day is not known')
assert.deepEqual(encodePrecisionDate('2021-11-17',null),{value:'2021-11-17',precision:null},'legacy storage retained unchanged')
assert.throws(()=>encodePrecisionDate('2021',null),/legacy/i,'legacy partial projection must not invent a replacement storage anchor')
assert.equal(readPrecisionDate('2021',null),'2021')
assert.deepEqual(dateBounds('2021',null),{min:'2021-01-01',max:'2021-12-31',precision:null})
assert.throws(()=>encodePrecisionDate('2021-06-01','year'),/precision/i)
assert.throws(()=>encodePrecisionDate('2021-06-02','month'),/precision/i)
assert.throws(()=>encodePrecisionDate('2021','day'),/precision/i)
assert.deepEqual(encodePrecisionDate(null),{value:null,precision:null})
assert.deepEqual(dateBounds('2021-11-17',null),{min:'2021-01-01',max:'2021-12-31',precision:null})
assert.deepEqual(dateBounds('2020-02'),{min:'2020-02-01',max:'2020-02-29',precision:'month'})
assert.deepEqual(dateBounds('2021-01-17'),{min:'2021-01-17',max:'2021-01-17',precision:'day'})
const now = new Date('2026-11-17T12:00:00Z')
const assess = (work: object[])=>workDurationAssessment(work,now)
assert.deepEqual(assess([yearRole]),{status:'bounded',minimumYears:0,maximumYears:2,years:null})
assert.equal(assess([{...yearRole,start_date:'2021-11',end_date:'2022-02'}]).years,0)
assert.equal(assess([{...yearRole,start_date:'2011-08',end_date:null}]).years,15)
assert.equal(assess([{...yearRole,start_date:'2011-08',end_date:null,end_date_unconfirmed:true}]).years,null)
assert.equal(assess([{...yearRole,start_date:'2021-11-01',end_date:'2022-02-01',start_date_precision:null,end_date_precision:null}]).status,'bounded')
assert.equal(totalExperienceYears({work_experience:[{...yearRole,start_date:'2021-11-01',end_date:'2022-02-01',start_date_precision:null,end_date_precision:null} as never]},now),null)
const overlap = assess([{start_date:'2010-01',end_date:'2015-12'},{start_date:'2012-01',end_date:'2015-12'}])
assert.equal(overlap.years,6,'overlap counted once')
const uncertainOverlap=assess([{start_date:'2021',end_date:'2022'},{start_date:'2021-06',end_date:'2022-06'}])
assert.equal(uncertainOverlap.minimumYears,1)
assert.equal(uncertainOverlap.maximumYears,2)
assert.equal(assess([{start_date:null,end_date:'2022-06'}]).status,'unknown')
assert.equal(assess([{start_date:'2022-06',end_date:'2021-06'}]).status,'unknown')
assert.equal(assess([{start_date:'2022-06',end_date:null,end_date_precision:'day'}]).status,'unknown','orphan end precision cannot imply current employment')
assert.deepEqual(assess([{start_date:'2021',end_date:'2021'}]),{status:'bounded',minimumYears:0,maximumYears:1,years:null})
assert.equal(assess([{start_date:'2021-11-17',end_date:'2021-11-16'}]).status,'unknown')
// Every represented, fully specified timeline must fit the uncertain union bounds.
const envelope=assess([{start_date:'2020',end_date:'2021'},{start_date:'2021',end_date:'2022'}])
for (const firstStart of ['2020-01','2020-06','2020-12']) for (const firstEnd of ['2021-01','2021-06','2021-12']) {
  for (const secondStart of ['2021-01','2021-06','2021-12']) for (const secondEnd of ['2022-01','2022-06','2022-12']) {
    const specified=assess([{start_date:firstStart,end_date:firstEnd},{start_date:secondStart,end_date:secondEnd}])
    assert.equal(specified.status,'known')
    assert.ok(specified.years! >= envelope.minimumYears! && specified.years! <= envelope.maximumYears!, 'overlap alternatives stay inside conservative bounds')
  }
}

const gcc=gccExperience([{...yearRole,location:'Synthetic GCC place',gcc_country:'saudi_arabia'}],()=>null,now)
assert.equal(gcc.years,null)
assert.equal(gcc.durationUnconfirmed,true)
assert.equal(gccExperience([],()=>null,now).years,0)
const gapRoles=[{company:'A',start_date:'2019-01',end_date:'2020-01'},{company:'B',start_date:'2023-01',end_date:'2024-01'}]
assert.deepEqual(detectEmploymentGaps(gapRoles),[],'month dates do not establish exact day gap boundaries')
assert.equal(assessEmploymentGaps(gapRoles).status,'insufficient_precision')
const fullGapRoles=gapRoles.map(r=>({...r,start_date:r.start_date+'-01',end_date:r.end_date+'-01'}))
assert.equal(assessEmploymentGaps(fullGapRoles).status,'known')
assert.equal(detectEmploymentGaps(fullGapRoles).length,1)
assert.equal(assessEmploymentGaps(fullGapRoles.map(r=>({...r,start_date_precision:null,end_date_precision:null}))).status,'insufficient_precision')
console.log('PASS date precision: strict roundtrip, legacy uncertainty, conservative merged bounds, duration and gap status')
