import {Copy,Printer,Calculator} from 'lucide-react'
import type {RefObject} from 'react'
import type {Result} from '@/lib/free-tools/types'
import s from './PremiumTools.module.css'
const safeLink=(url:string)=>{try{return new URL(url).protocol==='https:'}catch{return false}}
export function ToolResult({name,result,resultRef,onCopy}:{name:string;result:Result|null;resultRef:RefObject<HTMLElement|null>;onCopy:()=>void}){
  if(!result)return <section className={s.resultEmpty} aria-label="Result preview"><Calculator size={28} strokeWidth={1.5} aria-hidden="true"/><h2 className="type-card">Your result</h2><p>Enter your details and calculate to see the result and a clear breakdown here.</p><p className="type-helper">Free to use. No account required.</p></section>
  return <section className={s.result} ref={resultRef} tabIndex={-1} aria-label="Your result" aria-live="polite"><h2 className="type-card">{name} result</h2><p className={`${s.headline} type-stat`}>{result.headline}</p>{result.rows&&<dl className={s.breakdown}>{result.rows.map(([label,value],i)=><div key={i}><dt>{label}</dt><dd>{value}</dd></div>)}</dl>}{result.text&&<pre className={s.output}>{result.text}</pre>}{result.notes?.map((note,i)=><p key={i} className={`${s.small} type-helper`}>{note}</p>)}{result.links&&<div className={s.inlineLinks}>{result.links.filter(link=>safeLink(link.url)).map(link=><a key={link.url} href={link.url} target="_blank" rel="noopener noreferrer">{link.label} ↗</a>)}</div>}<div className={s.actions}><button className={s.secondary} type="button" onClick={onCopy}><Copy size={16} aria-hidden="true"/>Copy result</button><button className={s.secondary} type="button" onClick={()=>window.print()}><Printer size={16} aria-hidden="true"/>Print / Save PDF</button></div></section>
}
