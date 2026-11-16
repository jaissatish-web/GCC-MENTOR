// Actual compiled page contracts. Interactive checks are in the browser suite.
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
const html=readFileSync('.next/server/app/index.html','utf8')
const text=html.replace(/<[^>]*>/g,' ').replace(/\s+/g,' ').trim()
for(const copy of ['Prepare for the Gulf job you want.', 'Your real experience is the starting point.', 'Not confirmed', 'A gap is not added as experience.', 'Your Career Profile remains unchanged.', 'Illustrative demonstration', 'ILLUSTRATIVE DATA', 'Answer-structure score']) assert.ok(text.includes(copy), `Missing approved story: ${copy}`)
for(const value of [46,61,74]) assert.ok(html.includes(`>${value}</`),`Missing illustrative attempt ${value}`)
assert.ok(html.includes('Pause demo'), 'Needs persistent motion control')
console.log('PASS V3 approved grounded story and explicitly illustrative chart')

assert.ok(text.includes('Applying for Gulf jobs but not getting shortlisted?'), 'Candidate pain headline must be visible after employers')
const sections=['id="employers"','id="challenges"','id="solutions"','id="how-it-works"','id="services"','id="templates"','id="interview"'].map(id=>html.indexOf(id))
assert.ok(sections.every((position,i)=>position>=0 && (i===0 || position>sections[i-1])), 'Employer → pain → solution → journey → demonstration order')
assert.ok(!html.includes('Not getting shortlisted?</summary>'), 'Remove old collapsed FAQ duplicate')
for(const copy of ["I've applied to so many jobs. Why am I not getting interview calls?", "I have the skills, but my resume doesn't show them properly.", 'I get interviews, but I struggle to explain my experience.', "I keep changing my resume, but I don't know what actually improves.", 'Your experience deserves better preparation.']) assert.ok(text.replaceAll('&#x27;', "'").includes(copy), `Missing founder copy: ${copy}`)
console.log('PASS candidate pain, solution bridge and required section order')

for(const copy of ["You have the experience. You apply for relevant jobs. But you rarely hear back — and you're not sure what needs to change.", 'Your resume may not make the connection between your experience and the role clear enough.', 'Important skills can get buried when responsibilities are listed without clear examples of your work.', 'Knowing the work and explaining it clearly are different skills. Focused practice helps you structure your answers.', 'Without a target role and specific feedback, edits can become guesswork instead of purposeful preparation.']) assert.ok(text.replaceAll('&#x27;', "'").includes(copy), `Missing supporting explanation: ${copy}`)
