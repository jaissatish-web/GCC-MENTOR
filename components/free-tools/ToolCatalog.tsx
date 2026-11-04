'use client'

import Link from 'next/link'
import {useState} from 'react'
import {Calculator,Wallet,FileCheck,Briefcase,CalendarDays,ArrowUpRight,Search} from 'lucide-react'
import {TOOLS,isActive,getContent} from '@/lib/free-tools/registry'
import s from './Catalog.module.css'

const categories=['All categories','Employment','Finance','Resume','Career','General']
const countries=['All countries','Saudi Arabia','United Arab Emirates','Qatar','Kuwait','Oman','Bahrain']
const icons={Employment:Calculator,Finance:Wallet,Resume:FileCheck,Career:Briefcase,General:CalendarDays}

// Directory summaries are deliberately short. Detailed methods and limitations
// stay on each tool's existing page; publication still follows the registry.
const summaries:Record<number,string>={
  1:'Check country coverage for end-of-service estimates.',
  2:'Check availability for an itemized final-pay estimate.',
  3:'Review availability for unused-leave calculations.',
  4:'Check country coverage for overtime-pay estimates.',
  5:'Review availability for notice-period calculations.',
  6:'Review availability for employment-duration calculations.',
  7:'Check coverage for unpaid-leave deductions.',
  8:'Review availability for daily-wage calculations.',
  9:'Review availability for hourly-wage calculations.',
  10:'Check coverage for employment-ending timelines.',
  11:'Separate basic pay, allowances and deductions.',
  12:'Convert periodic pay into an annual total.',
  13:'Work out a proposed raise and revised salary.',
  14:'Compare old and new pay as a percentage.',
  15:'Compare annual pay after your own expenses.',
  16:'Plan how long it takes to reach a savings target.',
  17:'Organize income, expenses and remaining balance.',
  18:'Estimate transfers with your own rate and fees.',
  19:'Compare living costs using your own figures.',
  20:'Compare offers using the priorities you choose.',
  21:'Find matched and missing job-description keywords.',
  22:'Find repeated terms in a job description.',
  23:'Count words, characters and lines in your resume.',
  24:'Spot resume bullets above your chosen length.',
  25:'Review the opening verbs in your resume bullets.',
  26:'Check email, phone and LinkedIn address formats.',
  27:'Find common section headings in your resume.',
  28:'Review reversed or overlapping employment dates.',
  29:'Work through practical resume-format checks.',
  30:'Check file size without uploading your resume.',
  31:'Add employment periods without double counting.',
  32:'Find uncovered periods between employment dates.',
  33:'Check the time remaining before an interview.',
  34:'Organize your interview preparation tasks.',
  35:'Keep application statuses and follow-up notes.',
  36:'Create job-search links from role and location.',
  37:'Count headline characters against your own limit.',
  38:'Draft a letter with your own employment details.',
  39:'Prepare an employment-letter draft for review.',
  40:'Draft a salary request using your own reasons.',
  41:'Count workdays with your weekends and holidays.',
  42:'Find the calendar days between two dates.',
  43:'Calculate completed age on a reference date.',
  44:'Work out a percentage of an amount.',
  45:'Compare time-zone offsets at a chosen instant.',
  46:'Count the days until a contract date you supply.',
  47:'Add a probation duration to your start date.',
  48:'Plan leave days against your available balance.',
  49:'Create, complete and print your own checklist.',
  50:'Turn career notes into a printable document.',
}

export function ToolCatalog(){
  const [query,setQuery]=useState('')
  const [category,setCategory]=useState(categories[0])
  const [country,setCountry]=useState(countries[0])
  const matches=TOOLS.filter(tool=>(category===categories[0]||tool.category===category)&&(!query.trim()||`${tool.name} ${tool.category} ${getContent(tool.id)?.description??tool.logic}`.toLowerCase().includes(query.trim().toLowerCase()))&&(country===countries[0]||tool.category==='Employment'))
  const ready=matches.filter(tool=>isActive(tool.id))
  const planned=matches.filter(tool=>!isActive(tool.id))

  function directory(tools:typeof TOOLS){
    return <div className={s.catalog}>{tools.map(tool=>{
      const Icon=icons[tool.category as keyof typeof icons]
      const active=isActive(tool.id)
      return <Link prefetch={false} key={tool.id} href={`/tools/${tool.slug}`} className={s.toolCard}>
        <span className={s.icon}><Icon size={20} strokeWidth={1.7} aria-hidden="true"/></span>
        <div className={s.cardContent}>
          <h3 className="type-card">{tool.name}</h3>
          <p className="type-helper">{summaries[tool.id]}</p>
          {!active&&<span className={s.availability}>Not available yet · View availability</span>}
        </div>
        <ArrowUpRight className={s.arrow} size={17} aria-hidden="true"/>
      </Link>
    })}</div>
  }

  return <>
    <div className={s.filters}>
      <label className={`${s.field} ${s.searchField}`} htmlFor="tool-search">Find a tool
        <span className={s.searchControl}><Search size={18} aria-hidden="true"/><input id="tool-search" type="search" value={query} onChange={event=>setQuery(event.target.value)} placeholder="Search resume, salary, dates…" maxLength={150}/></span>
      </label>
      <label className={s.field} htmlFor="tool-category">Category<select id="tool-category" value={category} onChange={event=>setCategory(event.target.value)}>{categories.map(value=><option key={value}>{value}</option>)}</select></label>
      <label className={s.field} htmlFor="tool-country">Employment country<select id="tool-country" value={country} onChange={event=>setCountry(event.target.value)}>{countries.map(value=><option key={value}>{value}</option>)}</select></label>
    </div>
    {country!==countries[0]&&<p className={`${s.context} type-helper`}>Showing employment tools. Check each tool’s country coverage; choosing a country does not establish legal eligibility.</p>}
    <p role="status" aria-live="polite" className={`${s.count} type-helper`}>{matches.length} {matches.length===1?'tool':'tools'} shown</p>
    {ready.length>0&&<section className={s.group} aria-labelledby="ready-tools-title"><div className={s.groupHeading}><h2 id="ready-tools-title" className="type-card">Ready to use</h2><span className="type-helper">{ready.length} {ready.length===1?'tool':'tools'} · No signup</span></div>{directory(ready)}</section>}
    {planned.length>0&&<section className={`${s.group} ${s.planned}`} aria-labelledby="planned-tools-title"><div className={s.groupHeading}><h2 id="planned-tools-title" className="type-card">Planned tools</h2><span className="type-helper">{planned.length} availability pages</span></div><p className={`${s.context} type-helper`}>These tools are being prepared. Open a page to see its current availability and limitations.</p>{directory(planned)}</section>}
    {!matches.length&&<div className={s.empty}><h2 className="type-card">No tools match this search</h2><p className="type-helper">Try a shorter search or choose all categories and countries.</p><button type="button" className={s.secondary} onClick={()=>{setQuery('');setCategory(categories[0]);setCountry(countries[0])}}>Clear filters</button></div>}
  </>
}
