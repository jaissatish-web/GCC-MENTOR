/** Browser-local integration point only; no collector and never user inputs. */
export function toolEvent(slug:string,event:'tool_view'|'tool_use'|'tool_success'|'tool_error'|'cta_impression'|'cta_click') {
  if(typeof window!=='undefined')window.dispatchEvent(new CustomEvent('gcc-free-tool',{detail:{slug,event}}))
}
