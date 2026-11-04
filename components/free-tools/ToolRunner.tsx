'use client'
import {useEffect,useRef,useState} from 'react'
import {Copy,RotateCcw,Printer} from 'lucide-react'
import {getSpec} from '@/lib/free-tools/specs'
import type {Result,Values} from '@/lib/free-tools/types'
import {SpecialTool} from './SpecialTool'
import {toolEvent} from './events'
import legacy from './Tools.module.css'
import premiumStyles from './PremiumTools.module.css'
import {ToolResult} from './ToolResult'
const safeLink=(url:string)=>{try{return new URL(url).protocol==='https:'}catch{return false}}
export function ToolRunner({id,slug,name,premium=false}:{id:number;slug:string;name:string;premium?:boolean}) {
  const s=premium?premiumStyles:legacy
  const spec=getSpec(id)
  const defaults=()=>Object.fromEntries((spec?.fields??[]).map(f=>[f.key,f.default??'']))
  const [values,setValues]=useState<Values>(defaults),[result,setResult]=useState<Result|null>(null),[error,setError]=useState(''),[invalidField,setInvalidField]=useState(''),[status,setStatus]=useState('')
  const errorRef=useRef<HTMLDivElement>(null),resultRef=useRef<HTMLElement>(null)
  useEffect(()=>{toolEvent(slug,'tool_view')},[slug])
  const fail=(message:string)=>{const field=spec?.fields.find(f=>message.includes(f.key));setInvalidField(field?.key??'');setError(field?message.split(field.key).join(field.label):message);setResult(null);toolEvent(slug,'tool_error');requestAnimationFrame(()=>errorRef.current?.focus())}
  const finish=(next:Result)=>{setError('');setInvalidField('');setStatus('');setResult(next);toolEvent(slug,'tool_success')}
  if(!spec)return <div className={s.notice}>This tool is not available yet. No estimate or result is shown until its logic and checks are ready.</div>
  const run=(event:React.FormEvent)=>{event.preventDefault();toolEvent(slug,'tool_use');try{finish(spec.calculate(values))}catch(e){fail(e instanceof Error?e.message:'Check your inputs and try again.')}}
  const copy=async()=>{if(!result)return;const txt=[name,result.headline,...(result.rows??[]).map(([k,v])=>`${k}: ${v}`),result.text??'',...(result.notes??[])].filter(Boolean).join('\n');try{await navigator.clipboard.writeText(txt);setStatus('Result copied.')}catch{setStatus('Copy is unavailable. Select and copy the result text below.');resultRef.current?.focus()}}
  return <div className={s.workspace} data-free-tool={id}>
    {error&&<div role="alert" ref={errorRef} tabIndex={-1} className={s.error} id="tool-error"><strong>Check your inputs</strong><p>{error}</p></div>}
    {spec.kind?<SpecialTool onClear={()=>{setResult(null);setError('');setStatus('')}} spec={spec} id={id} values={values} onResult={finish} onError={fail}/>:<form onSubmit={run} className={s.form} noValidate>
      {premium&&<h2 className="type-card">Your details</h2>}<div className={s.fields}>{spec.fields.map(field=>{const fieldId=`tool-${field.key}`,helpId=`${fieldId}-help`;const common={id:fieldId,name:field.key,value:values[field.key]??'',required:!field.optional,'aria-invalid':invalidField===field.key||undefined,'aria-describedby':[field.help?helpId:'',error?'tool-error':''].filter(Boolean).join(' ')||undefined,onChange:(e:React.ChangeEvent<HTMLInputElement|HTMLTextAreaElement|HTMLSelectElement>)=>{setValues(v=>({...v,[field.key]:e.target.value}));setResult(null);setStatus('')}};return <label key={field.key} htmlFor={fieldId} className={s.field}><span>{field.label}{field.optional?' (optional)':''}</span>{field.type==='textarea'?<textarea {...common} maxLength={50000}/>:field.type==='select'?<select {...common}>{!field.default&&<option value="">Choose…</option>}{field.options?.map(option=><option key={option}>{option}</option>)}</select>:<input {...common} type={field.type??'text'} min={field.min} max={field.max} step={field.type==='number'?field.step??'any':undefined} maxLength={field.type==='number'||field.type==='date'?undefined:50000} inputMode={field.type==='number'?'decimal':undefined}/ >}{invalidField===field.key&&<small className={s.error}>{error}</small>}{field.help&&<small id={helpId}>{field.help}</small>}</label>})}</div>
      <div className={s.actions}><button className={s.button} type="submit">{id>=38&&id<=40?'Generate draft':premium?'Calculate working days':'Calculate / Check'}</button><button type="button" className={s.secondary} onClick={()=>{setValues(defaults());setResult(null);setError('');setInvalidField('');setStatus('Inputs reset.')}}><RotateCcw size={16} aria-hidden="true"/>Reset</button></div>
    </form>}
    {premium?<ToolResult name={name} result={result} resultRef={resultRef} onCopy={copy}/>:result&&<section className={s.result} ref={resultRef} tabIndex={-1} aria-label="Your result" aria-live="polite"><h2>{name} result</h2><p className={s.headline}>{result.headline}</p>{result.rows&&<dl className={s.breakdown}>{result.rows.map(([label,value],i)=><div key={i}><dt>{label}</dt><dd>{value}</dd></div>)}</dl>}{result.text&&<pre className={s.output}>{result.text}</pre>}{result.notes?.map((note,i)=><p key={i} className={s.small}>{note}</p>)}{result.links&&<div className={s.inlineLinks}>{result.links.filter(link=>safeLink(link.url)).map(link=><a key={link.url} href={link.url} target="_blank" rel="noopener noreferrer">{link.label} ↗</a>)}</div>}<div className={s.actions}><button className={s.secondary} type="button" onClick={copy}><Copy size={16} aria-hidden="true"/>Copy result</button><button className={s.secondary} type="button" onClick={()=>window.print()}><Printer size={16} aria-hidden="true"/>Print / Save PDF</button></div></section>}
    <p className={s.status} role="status">{status}</p>
  </div>
}
