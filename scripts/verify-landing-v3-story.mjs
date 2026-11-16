// Actual compiled page contracts. Interactive checks are in the browser suite.
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {createHash} from 'node:crypto'
const html=readFileSync('.next/server/app/index.html','utf8')
assert.equal(createHash('sha256').update(readFileSync('public/landing/v2/founder-satish.webp')).digest('hex'),'c9956711c5e7a778a12e91eec2dc4b2592eea03dfc851fe29a3233ac05ae7120','Authentic source portrait must remain unchanged')
const text=html.replace(/<[^>]*>/g,' ').replace(/\s+/g,' ').trim()
for(const copy of ['Prepare for the Gulf job you want.', 'One Career Profile. Multiple Gulf Opportunities.', 'A gap is not added as experience.', 'Your Career Profile stays unchanged.', 'Illustrative demonstration', 'ILLUSTRATIVE DATA', 'Answer-structure score']) assert.ok(text.includes(copy), `Missing approved story: ${copy}`)
for(const value of [46,61,74]) assert.ok(html.includes(`>${value}</`),`Missing illustrative attempt ${value}`)
assert.ok(html.includes('Pause demo'), 'Needs persistent motion control')
console.log('PASS V3 approved grounded story and explicitly illustrative chart')

const marketing=html.slice(html.indexOf('id="services"'),html.indexOf('id="interview"'))
assert.ok(!/Instrumentation Commissioning Engineer|loop.check|offshore commissioning|Example candidate/i.test(marketing),'Public marketing must not invent a discipline-specific candidate')
for(const copy of ['Work experience','Skills','Education','Achievements','Career goals','Reviewed and confirmed by you','Relevant experience','Required skills','Qualifications','Evidence found','Areas to review','MARKETING ILLUSTRATION'])assert.ok(marketing.includes(copy),`Missing neutral preparation concept: ${copy}`)
for(const copy of ['Built with real Gulf industry experience.','Satish Kumar Jaiswal','15+ years of Instrumentation','NEOM and ADNOC environments.','No platform affiliation or endorsement.','Your responsibility','Your actions','Your result'])assert.ok(text.includes(copy),`Missing approved marketing/founder content: ${copy}`)
assert.ok(!text.includes('I checked the records and spoke with the team.'),'Do not invent a candidate answer')

const visible=text.replaceAll('&#x27;', "'").replaceAll('&amp;', '&')
for(const copy of ["You have the experience. So why aren't Gulf recruiters calling?", 'Which feels familiar?', 'Your experience deserves better preparation.', 'Understand your fit before you tailor.', 'Illustrative example — not a real assessment', 'Confirmed experience', 'Missing evidence', 'Qualification gap', 'A gap stays a gap. Your facts stay yours.']) assert.ok(visible.includes(copy), `Missing approved Option2 story: ${copy}`)
const ids=['id="employers"','id="challenges"','id="solutions"','id="how-it-works"','id="services"','id="templates"','id="interview"'].map(id=>html.indexOf(id))
assert.ok(ids.every((position,i)=>position>=0&&(i===0||position>ids[i-1])), 'Employer → concerns → solution → journey → demonstrations')
assert.ok(!html.includes('Not getting shortlisted?</summary>'),'No old whole-section accordion')
assert.equal((html.match(/data-concern-choice=/g)||[]).length,4,'All four main concerns are present')
for(const copy of ['Job-specific package + Cover Letter','Career Profile + Optimized Resume','ATS Job Match + gap analysis','Interview Q&A + mock interview feedback'])assert.ok(visible.includes(copy),`Missing direct mapping: ${copy}`)
console.log('PASS approved Option2 headline, four concerns/mappings, example honesty and section sequence')

for(const id of ['applications','experience','fit','interview'])assert.ok(html.includes(`aria-describedby="concern-service-${id}"`),'Each concern exposes its service mapping to assistive technology')
