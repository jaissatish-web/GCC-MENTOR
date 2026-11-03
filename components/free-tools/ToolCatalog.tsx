'use client'
import Link from 'next/link'
import {useState} from 'react'
import {Calculator,Wallet,FileCheck,Briefcase,CalendarDays,ArrowUpRight} from 'lucide-react'
import {TOOLS,isActive,getContent} from '@/lib/free-tools/registry'
import s from './Tools.module.css'
const categories=['All categories','Employment','Finance','Resume','Career','General']
const countries=['All countries','Saudi Arabia','United Arab Emirates','Qatar','Kuwait','Oman','Bahrain']
const icons={Employment:Calculator,Finance:Wallet,Resume:FileCheck,Career:Briefcase,General:CalendarDays}
export function ToolCatalog(){
  const [query,setQuery]=useState(''),[category,setCategory]=useState(categories[0]),[country,setCountry]=useState(countries[0])
  const matches=TOOLS.filter(t=>(category===categories[0]||t.category===category)&&(!query.trim()||`${t.name} ${t.category} ${getContent(t.id)?.description??t.logic}`.toLowerCase().includes(query.trim().toLowerCase()))&&(country===countries[0]||t.category==='Employment'))
  return <><div className={s.filters}><label className={s.field} htmlFor="tool-search">Find a tool<input id="tool-search" type="search" value={query} onChange={e=>setQuery(e.target.value)} placeholder="Try salary, resume or working days" maxLength={150}/></label><label className={s.field} htmlFor="tool-category">Category<select id="tool-category" value={category} onChange={e=>setCategory(e.target.value)}>{categories.map(c=><option key={c}>{c}</option>)}</select></label><label className={s.field} htmlFor="tool-country">Employment country<select id="tool-country" value={country} onChange={e=>setCountry(e.target.value)}>{countries.map(c=><option key={c}>{c}</option>)}</select></label></div>
  {country!==countries[0]&&<p className={s.small}>Showing employment tools. Country availability is explained inside each tool; selecting a country does not establish legal eligibility.</p>}
  <p role="status" aria-live="polite" className={s.small}>{matches.length} {matches.length===1?'tool':'tools'} shown</p>
  <div className={s.catalog}>{matches.map(tool=>{const Icon=icons[tool.category as keyof typeof icons],active=isActive(tool.id);return <Link key={tool.id} href={`/tools/${tool.slug}`} className={s.toolCard}><span className={s.cardTop}><span className={`${s.icon} ${s[`category${tool.category}`]??''}`}><Icon size={20} aria-hidden="true"/></span><span className={`${s.badge} ${active?'':s.pending}`}>{active?'Free':'Not available yet'}</span></span><div><h2>{tool.name}</h2><p>{getContent(tool.id)?.description??'Country-specific employment calculations, with verified coverage required before results are available.'}</p></div><span className={s.cardEnd}><span>{active?'Open tool':'View availability'}</span><ArrowUpRight size={17} aria-hidden="true"/></span></Link>})}</div>
  {!matches.length&&<div className={s.empty}><h2>No tools match this search</h2><p>Try a shorter search or choose all categories and countries.</p><button type="button" className={s.secondary} onClick={()=>{setQuery('');setCategory(categories[0]);setCountry(countries[0])}}>Clear filters</button></div>}</>
}
