import type {Values} from './types'
export function number(v:Values,key:string,min=0,max=1e12):number { const raw=v[key]?.trim();if(!raw||!/^[-+]?(?:\d+(?:\.\d*)?|\.\d+)$/.test(raw))throw Error(`Enter a valid number for ${key}.`);const n=Number(raw);if(!Number.isFinite(n)||n<min||n>max)throw Error(`${key} must be between ${min} and ${max}.`);return n }
export function integer(v:Values,key:string,min=0,max=10000):number {const n=number(v,key,min,max);if(!Number.isInteger(n))throw Error(`${key} must be a whole number.`);return n}
export function text(v:Values,key:string,max=50000,optional=false):string {const t=v[key]??'';if((!optional&&!t.trim())||Array.from(t).length>max)throw Error(`Enter ${key}${optional?'':' (required)'} using at most ${max} characters.`);return t}
export function dateValue(raw:string):number {if(!/^\d{4}-\d{2}-\d{2}$/.test(raw))throw Error('Use dates in YYYY-MM-DD format.');const t=Date.parse(raw+'T00:00:00Z');if(!Number.isFinite(t)||new Date(t).toISOString().slice(0,10)!==raw||raw<'1900-01-01'||raw>'2200-12-31')throw Error('Enter a real date between 1900 and 2200.');return t}
export function date(v:Values,key:string):number {return dateValue(v[key]??'')}
export const DAY=86400000
export function range(v:Values):[number,number] {const a=date(v,'start'),b=date(v,'end');if(b<a)throw Error('End date must be on or after start date.');return[a,b]}
export const decimal=(n:number)=>n.toLocaleString('en-US',{maximumFractionDigits:2,minimumFractionDigits:2})
export const iso=(t:number)=>new Date(t).toISOString().slice(0,10)
export function choice(v:Values,key:string,options:readonly string[]):string {const s=v[key];if(!options.includes(s))throw Error(`Choose a valid ${key}.`);return s}
