import inventory from './inventory.json'
import content from './content.json'
import type {Tool,ToolContent} from './types'
export const TOOLS:Tool[]=inventory
/** Only IDs with calculation fixtures AND browser acceptance may be enabled at release. */
export const ACTIVE_IDS:number[]=[21,22,23,24,25,26,27,28,29,30]
export const isActive=(id:number)=>ACTIVE_IDS.includes(id)
export const getTool=(slug:string)=>TOOLS.find(t=>t.slug===slug)
export const getContent=(id:number):ToolContent|undefined=>content.find(t=>t.id===id)
export const UPDATED='2026-11-03'
