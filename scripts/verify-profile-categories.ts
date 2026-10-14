import './resolve-paths'
import assert from 'node:assert/strict'
import * as React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { organizeCategoryEntries, groupCategoryEntries, resumeCategoryGroups, validateCategoryEntries, CATEGORY_POSITIONS, categoryFact, categoryItemDisplay } from '../lib/profileCategories'
import { makeTemplateFixture } from './fixtures/templateFixture'
import { availableTemplates } from '../lib/templates'
import { buildCareerProfileResume } from '../lib/careerProfileResume'
import { buildResumeDocx } from '../lib/resumeDocx'
import { sanitizeEditedDocument } from '../lib/resumeEdits'
import { normalizeDraft } from '../lib/ai/extractionPrompt'
import { mergeDraftIntoProfile } from '../lib/profileMerge'
import { buildCoverLetterPrompt } from '../lib/ai/buildCoverLetterPrompt'
import { buildMockInterviewStartPrompt } from '../lib/ai/buildMockInterviewPrompt'
import { Packer } from 'docx'
import JSZip from 'jszip'

;(globalThis as unknown as { React: unknown }).React = React
async function main() {
  const { profile, optimizedContent } = makeTemplateFixture()
  assert.equal(categoryItemDisplay('Key Achievement: Reduced downtime by 20%.', 'Key Achievements'), 'Reduced downtime by 20%.')
  assert.equal(categoryItemDisplay('Key Achivement: Improved handover.', 'Key Achievements'), 'Improved handover.')
  assert.equal(categoryItemDisplay('Key Achievement: Key Achievement: Delivered safely.', 'Key Achievements'), 'Delivered safely.')
  assert.equal(categoryItemDisplay('Achievement: Delivered safely.', 'Awards & Achievements'), 'Delivered safely.')
  assert.equal(categoryItemDisplay('Languages: English, Hindi', 'Languages'), 'English, Hindi')
  assert.equal(categoryItemDisplay('Project Delta: Commissioned utilities.', 'Projects'), 'Project Delta: Commissioned utilities.')
  assert.equal(categoryItemDisplay('NEBOSH: Completed training.', 'Certifications'), 'NEBOSH: Completed training.')
  assert.equal(categoryItemDisplay('Key Achievement: Reduced downtime.', null), 'Key Achievement: Reduced downtime.')
  assert.equal(categoryItemDisplay('Key Achievement:', 'Key Achievements'), 'Key Achievement:')
  const achievementDoc=buildCareerProfileResume({...profile,additional_information:[{id:'achievement',profile_id:profile.id,created_at:'',sort_order:0,label:'Key Achievement',value:'Reduced downtime by 20%.',category_id:'10000000-0000-4000-8000-000000000099',category_name:'Key Achievements',category_position:'end',show_on_resume:true}]})
  const frozenAchievement=JSON.stringify(achievementDoc)
  for (const t of availableTemplates()) {
    const html=renderToStaticMarkup(React.createElement(t.component!,{profile,optimizedContent,document:achievementDoc}))
    assert.ok(html.includes('Key Achievements'),t.id+' keeps category heading')
    assert.ok(!html.includes('Key Achievement:'),t.id+' removes repeated item heading')
    assert.ok(html.includes('Reduced downtime by 20%.'),t.id+' keeps achievement sentence')
  }
  const achievementZip=await JSZip.loadAsync(await Packer.toBuffer(buildResumeDocx(achievementDoc)))
  const achievementXml=await achievementZip.file('word/document.xml')!.async('string')
  assert.ok(achievementXml.includes('Key Achievements') && !achievementXml.includes('Key Achievement:'))
  assert.equal(JSON.stringify(achievementDoc),frozenAchievement,'presentation must not mutate saved document')
  let seq = 0
  const uuid = () => `10000000-0000-4000-8000-${String(++seq).padStart(12,'0')}`
  const legacy = [{label:'Languages',value:'English (fluent)',id:'legacy',sort_order:0},{label:'Projects',value:'Site commissioning',id:'project',sort_order:1}]
  const organized = organizeCategoryEntries(legacy, uuid)
  assert.equal(groupCategoryEntries(organized).length,2)
  assert.equal(organizeCategoryEntries(legacy.map(r=>({...r,category_order:0})),uuid)[1].category_order,1)
  assert.equal(organized[0].id,'legacy')
  assert.equal(organized[0].value,legacy[0].value)
  assert.equal(organizeCategoryEntries(organized,uuid)[0].category_id,organized[0].category_id)
  const reupload=organizeCategoryEntries([{...organized[0],category_position:'after_summary' as const,show_on_resume:false},{label:'Spanish',value:'Basic',category_name:organized[0].category_name}],uuid)
  assert.equal(reupload[1].category_position,'after_summary')
  assert.equal(reupload[1].show_on_resume,false)
  assert.equal(validateCategoryEntries(reupload),null)
  assert.equal(validateCategoryEntries(organized),null)
  assert.ok(validateCategoryEntries([{...organized[0],category_id:'not-a-uuid'}]))
  assert.ok(validateCategoryEntries([{...organized[0],level:[]}]))
  assert.ok(validateCategoryEntries([{...organized[0],category_position:'before_password'}]))
  assert.ok(validateCategoryEntries([organized[0],{...organized[0],category_name:'different'}]))
  const categories = organized.map((r,i)=>({...r,profile_id:profile.id,created_at:'', category_name:`CUSTOM CATEGORY ${i+1}`,level:i===0?'Fluent':'', category_position:'end' as const}))
  const empty = {...categories[0],id:'empty',category_id:uuid(),category_name:'EMPTY CATEGORY',label:'',value:'',level:''}
  const hidden = {...categories[1],id:'hidden',category_id:uuid(),category_name:'HIDDEN CATEGORY',show_on_resume:false,value:'SECRET HIDDEN CONTENT'}
  profile.additional_information=[...categories,empty,hidden]
  const doc=buildCareerProfileResume(profile)
  assert.equal(doc.additional.length,2)
  assert.ok(doc.additional[0].display.includes('Fluent'))
  assert.equal(resumeCategoryGroups(doc.additional).length,2)
  assert.equal(categoryFact(categories[0]),'CUSTOM CATEGORY 1: Languages: Fluent: English (fluent)')
  const edited=sanitizeEditedDocument({...doc,additional:doc.additional.map(a=>({...a,display:a.display+' reviewed'}))},doc)
  assert.equal(edited.additional[0].entry.category_name,'CUSTOM CATEGORY 1')
  assert.equal(edited.additional[0].entry.level,'Fluent')
  const restored=sanitizeEditedDocument({...doc,additional:doc.additional.map(a=>({entry:{id:a.entry.id},display:'x'.repeat(1500)}))},doc)
  assert.equal(restored.additional[0].entry.category_name,'CUSTOM CATEGORY 1')
  assert.equal(restored.additional[0].display.length,1500)
  assert.throws(()=>sanitizeEditedDocument({...doc,additional:[{...doc.additional[0],entry:{...doc.additional[0].entry,level:[]}}]},doc))
  const target={target_job_title:'Engineer',target_country:null,target_company:null,target_industry:null}
  assert.ok(buildCoverLetterPrompt(profile,target,null,undefined,doc).user.includes('CUSTOM CATEGORY 1'))
  assert.ok(buildMockInterviewStartPrompt(profile,doc,target,null,{mode:'mixed',difficulty:'standard',questionCount:5}).input.includes('CUSTOM CATEGORY 1'))
  const parsed=normalizeDraft({additional_information:[{label:'PLC',value:'Commissioning',category_name:'Control Systems',level:'Advanced',sort_order:1}]})
  assert.ok(parsed)
  assert.equal(parsed.additional_information[0].category_name,'Control Systems')
  assert.equal(parsed.additional_information[0].level,'Advanced')
  const merged=mergeDraftIntoProfile(profile,{...parsed,additional_information:[{label:categories[0].label,value:categories[0].value,sort_order:0}],work_experience:[],skills:[],education:[],certifications:[]})
  assert.equal(merged.profile.additional_information[0].category_id,categories[0].category_id)
  let rendered=0
  for(const position of CATEGORY_POSITIONS) {
    profile.additional_information=categories.map(row=>({...row,category_position:position}))
    const document=buildCareerProfileResume(profile)
    for(const template of availableTemplates()) {
      const html=renderToStaticMarkup(React.createElement(template.component!,{profile,optimizedContent,document}))
      for(const row of categories) {
        assert.equal(html.split(row.category_name).length-1,1,`${template.id} ${position} category once`)
        assert.ok(html.includes(row.value),`${template.id} ${position} original value`)
      }
      assert.ok(!html.includes('SECRET HIDDEN CONTENT'))
      rendered++
    }
  }
  profile.field_visibility.additional_information=false
  assert.equal(buildCareerProfileResume(profile).additional.length,0)
  profile.field_visibility.additional_information=true
  const zip=await JSZip.loadAsync(await Packer.toBuffer(buildResumeDocx(buildCareerProfileResume(profile))))
  const xml=await zip.file('word/document.xml')!.async('string')
  assert.ok(xml.includes('CUSTOM CATEGORY 1') && xml.includes('Fluent'))
  console.log(`Profile category validation, extraction, merge, snapshot, DOCX and ${rendered} template/position cases passed`)
}
main().catch(error=>{console.error(error);process.exitCode=1})
