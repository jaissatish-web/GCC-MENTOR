'use client'
import type {Spec,Result,Values} from '@/lib/free-tools/types'
import s from './Tools.module.css'
/** Specialized file, tracker and editable checklist controls are added with their tool fixtures. */
export function SpecialTool({spec}:{spec:Spec;id:number;onResult:(result:Result)=>void;onError:(message:string)=>void;values:Values}) {
  return <p className={s.notice}>This {spec.kind} utility is being verified. It is not available for use yet.</p>
}
