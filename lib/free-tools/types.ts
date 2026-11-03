export type Values = Record<string, string>
export interface Field { key:string; label:string; type?:'number'|'text'|'textarea'|'date'|'select'; help?:string; default?:string; options?:readonly string[]; optional?:boolean; min?:number; max?:number; step?:string }
export interface Result { headline:string; rows?:[string,string][]; notes?:string[]; text?:string; links?:{label:string;url:string}[] }
export interface Spec { fields:Field[]; calculate:(v:Values)=>Result; kind?:'file'|'tracker'|'checklist'; tasks?:string[] }
export interface ToolContent { id:number; description:string; how:string; example:string; mistakes:string; limitations:string; faq:{q:string;a:string}[] }
export interface Tool { id:number; name:string; category:string; slug:string; logic:string }
