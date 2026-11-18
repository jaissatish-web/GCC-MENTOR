import './resolve-paths'
import assert from 'node:assert/strict'
import { computeDeterministicCategories, combineJobMatchScore } from '../lib/jobMatch/requirementMapping'
import { experienceRequirementMet } from '../lib/optimizer/experienceMet'
import type { StructuredJobProfile, JobMatchCategoryKey, JobMatchCategoryResult } from '../types/jobMatch'
import { makeTemplateFixture } from './fixtures/templateFixture'
const job: StructuredJobProfile = {job_title:'Coordinator',required_skills:[],preferred_skills:[],responsibilities:[],required_experience_years:1,industry:null,gcc_experience_required:false,gcc_experience_preferred:false,target_countries:[],education_requirements:[],certification_requirements:[],driving_license_required:false}
const input = (startDate:string,endDate:string,startDatePrecision?:'year'|'month'|'day'|null,endDatePrecision=startDatePrecision) => ({professionalSummary:null,workExperience:[{role:'Coordinator',startDate,endDate,startDatePrecision,endDatePrecision,description:'',highlights:[],gccCountry:null,gccCountrySource:null}],skillNames:[],certificationNames:[],educationEntries:[],hasDrivingLicense:null})
const score = (...args:Parameters<typeof input>) => computeDeterministicCategories(input(...args),job).experience_level!
assert.equal(score('2021-11-01','2022-02-01','month').score,30,'known month formula remains 30')
assert.equal(score('2021-11-01','2022-02-01',null).score,null,'legacy unknown must not certify 30 or projected 100')
assert.equal(score('2021','2022','year').score,null,'year bounds straddle requirement: no fabricated 100')
assert.equal(score('2010','2022','year').score,100,'both conservative endpoints establish existing capped score')
const pending=score('2021','2022','year')
assert.equal(pending.assessment_status,'insufficient_precision')
assert.equal(combineJobMatchScore({required_skills:{score:80,applicable:true,evidence:[],explanation:''},experience_level:pending} as unknown as Record<JobMatchCategoryKey,JobMatchCategoryResult>),null,'do not redistribute missing experience weight')
const base=makeTemplateFixture().profile.work_experience[0]
const assess=(start_date:string,end_date:string,start_date_precision:'year'|'month'|'day'|null,term='1 year')=>experienceRequirementMet({work_experience:[{...base,start_date,end_date,start_date_precision,end_date_precision:start_date_precision}]},term,new Date('2026-11-17T12:00:00Z'))
assert.equal(assess('2021','2022','year').status,'unknown')
assert.equal(assess('2021','2022','year').ok,null,'pending must not be false/failed')
assert.equal(assess('2010','2022','year').status,'met','bounds can establish met without inventing dates')
assert.equal(assess('2021-11','2022-02','month').status,'unmet')
assert.equal(assess('2021-11-01','2022-02-01',null).years,null,'legacy duration is not a single number')
console.log('PASS pending-date-scores: known 30 preserved; legacy/year never 100/zero fallback; conservative bounds establish reliable results; pending total retains weights')
import { derivedExperienceYears } from '../lib/ai/answerGrounding'
import { scoreResume } from '../lib/optimizer/score'
import type { JobTargetProfile } from '../lib/optimizer/types'
const yearRole={...base,start_date:'2021',end_date:'2022',start_date_precision:'year' as const,end_date_precision:'year' as const}
assert.deepEqual(derivedExperienceYears({...makeTemplateFixture().profile,work_experience:[yearRole]},new Date('2026-11-17T12:00:00Z')),[],'grounding cannot certify a duration from unresolved year bounds')
const target:JobTargetProfile={version:1,scoring_version:'match-v2',mode:'job_description',job_title:'Coordinator',title_variants:[],seniority:null,keywords:[],structured:job,screening_as_of:'2026-11-17T12:00:00Z',screening_requirements:[{term:'1 year',importance:'must',kind:'experience_years',status:'met'}]}
const document={headline:'Coordinator',summary:'Synthetic coordination summary.',experience:[{entryId:base.id,role:'Coordinator',bullets:['Coordinated truthful work.'],source:yearRole}],skills:['Coordination'],certifications:[],education:[],additional:[],hasEmail:true,hasPhone:true}
const pendingV2=scoreResume(document,target,null)
assert.equal(pendingV2.total,null);assert.equal(pendingV2.assessment_status,'needs_date_clarification');assert.equal(pendingV2.v2?.breakdown.screening.score,null);assert.equal(pendingV2.v2?.screening[0].status,'unknown');assert.equal(pendingV2.v2?.mandatoryGaps,0)
const clarified=scoreResume({...document,experience:[{...document.experience[0],source:{...yearRole,start_date:'2021-01',end_date:'2022-01',start_date_precision:'month',end_date_precision:'month'}}]},target,null)
assert.notEqual(clarified.total,null);assert.equal(clarified.v2?.screening[0].status,'met');assert.equal(clarified.v2?.screening[0].uncertainty_reason,undefined)
console.log('PASS pending optimizer/grounding: no definitive claims or gaps; clarification recomputes without invented fallback')
import { checkReport, regroupCertifications } from '../lib/optimizer/v3/service'
import type { AnalysisV3 } from '../lib/optimizer/v3/engine'
const analysis:AnalysisV3={jobField:'Operations',candidateField:'Operations',fieldMatch:'same',requirements:[{term:'1 year',importance:'must',kind:'experience_years',group:'A',location:'summary',quote:null},{term:'Coordination',importance:'must',kind:'skill',group:'A',location:'summary',quote:null}],ms:0,inputTokens:0,outputTokens:0}
const uncertainProfile={...makeTemplateFixture().profile,work_experience:[yearRole]}
const regrouped=regroupCertifications(analysis,uncertainProfile)
assert.equal(regrouped.requirements[0].group,'U','unknown is neither a confirmed A nor missing C requirement')
const check=checkReport(uncertainProfile,regrouped,'Coordinator','Synthetic one-year JD')
assert.equal(check.before,null);assert.equal(check.beforeScore.assessment_status,'needs_date_clarification');assert.deepEqual(check.expected,{easy:null,moderate:null,high:null});assert.equal(check.recommendedLevel,null);assert.equal(check.highIfConfirmed,null)
console.log('PASS pending v3 consumers: explicit U status, independent content allowed, no failed grouping/recommendation or numeric ceilings')
import { profileFingerprint } from '../lib/optimizer/analyze'
assert.notEqual(profileFingerprint({...uncertainProfile,work_experience:[{...yearRole,start_date:'2021-01-01',end_date:'2022-01-01',start_date_precision:'year',end_date_precision:'year'}]}),profileFingerprint({...uncertainProfile,work_experience:[{...yearRole,start_date:'2021-01-01',end_date:'2022-01-01',start_date_precision:'day',end_date_precision:'day'}]}),'precision clarification invalidates a cached assessment even when storage anchors are identical')
console.log('PASS assessment identity: date precision is part of cache fingerprint')
import { factSummary } from '../lib/optimizer/factSummary'
assert.ok(!/\d+\+? years of experience/.test(factSummary({...uncertainProfile,professional_summary:null})), 'fallback prose cannot independently invent a duration from year-only facts')
console.log('PASS fallback grounding: uncertain dates do not regain fabricated years through fallback summary')
const futureSource={...yearRole,start_date:'2030-01-01',end_date:'2040-01-01',start_date_precision:'day' as const,end_date_precision:'day' as const}
assert.notEqual(scoreResume({...document,experience:[{...document.experience[0],source:futureSource}]},target,null).v2?.screening[0].status,'met','future experience excluded by original assessment date filter must not count')
const unknownEndRole={...yearRole,start_date:'2021-01',start_date_precision:'month' as const,end_date:'2022-01-01',end_date_precision:null}
assert.ok(!derivedExperienceYears({...uncertainProfile,work_experience:[unknownEndRole]},new Date('2026-11-17T12:00:00Z')).includes('5'),'uncertain end cannot enable fabricated career-span grounding through today')
